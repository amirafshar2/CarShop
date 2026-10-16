using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Moraveji.Application.Auth;
using Moraveji.Domain.Reservations;
using Moraveji.Infrastructure.Persistence;

namespace Moraveji.IntegrationTests;

public sealed class FakeSms : ISmsSender
{
    public ConcurrentDictionary<string, string> LastCode { get; } = new();

    public Task SendOtpAsync(string phone, string code, CancellationToken ct)
    {
        LastCode[phone] = code;
        return Task.CompletedTask;
    }
}

/// <summary>
/// Runs the real API against a real relational database file (SQLite), so unique indexes and
/// concurrency tokens are actually enforced (EF InMemory would not catch double-selling).
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private readonly string _dbPath = Path.Combine(Path.GetTempPath(), $"moraveji-test-{Guid.NewGuid():N}.db");
    public FakeSms Sms { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("Database:Provider", "Sqlite");
        builder.UseSetting("ConnectionStrings:Default", $"Data Source={_dbPath};Default Timeout=30");
        builder.UseSetting("Sms:Provider", "Console");
        builder.UseSetting("Seed:DemoData", "true");
        builder.UseSetting("Seed:AdminPhone", "09120000001");
        builder.UseSetting("RateLimits:OtpPerTenMinutes", "1000");
        builder.UseSetting("RateLimits:AuthPerMinute", "1000");
        builder.UseSetting("RateLimits:FormsPerMinute", "1000");
        builder.UseSetting("Otp:ResendCooldownSeconds", "0");
        builder.UseSetting("Otp:MaxSendsPerWindow", "1000");
        builder.ConfigureServices(s =>
        {
            s.RemoveAll<ISmsSender>();
            s.AddSingleton<ISmsSender>(Sms);
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
        foreach (var f in new[] { _dbPath, _dbPath + "-wal", _dbPath + "-shm" })
            try { File.Delete(f); } catch { /* best effort */ }
    }
}

public sealed class ApiTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private async Task<HttpClient> LoginAsync(string phone)
    {
        var client = factory.CreateClient();
        (await client.PostAsJsonAsync("/api/v1/auth/otp", new { phone })).EnsureSuccessStatusCode();
        var code = factory.Sms.LastCode[phone];
        var verify = await client.PostAsJsonAsync("/api/v1/auth/verify", new { phone, code, fullName = "تست" });
        verify.EnsureSuccessStatusCode();
        var body = await verify.Content.ReadFromJsonAsync<JsonElement>(Json);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", body.GetProperty("accessToken").GetString());
        return client;
    }

    private async Task<(Guid Id, string Slug)> FirstAvailableCarAsync(HttpClient client, int skip = 0)
    {
        var page = await client.GetFromJsonAsync<JsonElement>("/api/v1/cars?pageSize=48", Json);
        var car = page.GetProperty("items").EnumerateArray()
            .Where(i => i.GetProperty("status").GetString() == "Available")
            .Skip(skip).First();
        return (car.GetProperty("id").GetGuid(), car.GetProperty("slug").GetString()!);
    }

    [Fact]
    public async Task Public_inventory_lists_seeded_cars_with_filters()
    {
        var client = factory.CreateClient();

        var all = await client.GetFromJsonAsync<JsonElement>("/api/v1/cars?pageSize=48", Json);
        var hawaleh = await client.GetFromJsonAsync<JsonElement>("/api/v1/cars?listingType=Hawaleh", Json);

        Assert.True(all.GetProperty("totalCount").GetInt32() >= 20);
        Assert.All(hawaleh.GetProperty("items").EnumerateArray(),
            i => Assert.Equal("Hawaleh", i.GetProperty("listingType").GetString()));
    }

    [Fact]
    public async Task Car_detail_by_slug_and_unknown_slug_is_404()
    {
        var client = factory.CreateClient();
        var (_, slug) = await FirstAvailableCarAsync(client);

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync($"/api/v1/cars/{slug}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/v1/cars/does-not-exist")).StatusCode);
    }

    [Fact]
    public async Task Wrong_otp_is_rejected_and_never_issues_tokens()
    {
        var client = factory.CreateClient();
        await client.PostAsJsonAsync("/api/v1/auth/otp", new { phone = "09170000099" });

        var wrong = factory.Sms.LastCode["09170000099"] == "000000" ? "111111" : "000000";
        var response = await client.PostAsJsonAsync("/api/v1/auth/verify", new { phone = "09170000099", code = wrong });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Otp_code_cannot_be_reused()
    {
        var client = factory.CreateClient();
        const string phone = "09170000098";
        await client.PostAsJsonAsync("/api/v1/auth/otp", new { phone });
        var code = factory.Sms.LastCode[phone];

        var first = await client.PostAsJsonAsync("/api/v1/auth/verify", new { phone, code });
        var second = await client.PostAsJsonAsync("/api/v1/auth/verify", new { phone, code });

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, second.StatusCode);
    }

    [Fact]
    public async Task Reservation_requires_login()
    {
        var client = factory.CreateClient();
        var (id, _) = await FirstAvailableCarAsync(client);

        var response = await client.PostAsync($"/api/v1/cars/{id}/reservations", null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    /// <summary>
    /// THE money test: many customers try to reserve the same car at the same moment.
    /// Exactly one must win; everyone else gets 409; the database holds exactly one active reservation.
    /// </summary>
    [Fact]
    public async Task Concurrent_reservations_of_same_car_only_one_succeeds()
    {
        var clients = await Task.WhenAll(Enumerable.Range(0, 6).Select(i => LoginAsync($"0917100{i:D4}")));
        var (carId, _) = await FirstAvailableCarAsync(clients[0], skip: 2);

        var responses = await Task.WhenAll(clients.Select(c => c.PostAsync($"/api/v1/cars/{carId}/reservations", null)));
        var codes = responses.Select(r => r.StatusCode).ToList();

        Assert.Equal(1, codes.Count(c => c == HttpStatusCode.Created));
        Assert.All(codes.Where(c => c != HttpStatusCode.Created), c => Assert.Equal(HttpStatusCode.Conflict, c));

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(1, await db.Reservations.CountAsync(r => r.CarId == carId && r.Status == ReservationStatus.Active));
    }

    [Fact]
    public async Task Database_rejects_second_active_reservation_even_if_code_is_bypassed()
    {
        var client = factory.CreateClient();
        var (carId, _) = await FirstAvailableCarAsync(client, skip: 4);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = DateTimeOffset.UtcNow;
        await db.Database.ExecuteSqlInterpolatedAsync(
            $"INSERT INTO Reservations (Id, CarId, CustomerId, ReservedAt, ExpiresAt, DepositRial, Status, CreatedAt, IsDeleted, Version) VALUES ({Guid.NewGuid()}, {carId}, {Guid.NewGuid()}, {0L}, {0L}, {0L}, {1}, {0L}, {false}, {Guid.NewGuid()})");

        await Assert.ThrowsAnyAsync<Exception>(() => db.Database.ExecuteSqlInterpolatedAsync(
            $"INSERT INTO Reservations (Id, CarId, CustomerId, ReservedAt, ExpiresAt, DepositRial, Status, CreatedAt, IsDeleted, Version) VALUES ({Guid.NewGuid()}, {carId}, {Guid.NewGuid()}, {0L}, {0L}, {0L}, {1}, {0L}, {false}, {Guid.NewGuid()})"));
    }

    [Fact]
    public async Task Customer_cannot_use_admin_endpoints()
    {
        var customer = await LoginAsync("09170000097");

        var response = await customer.GetAsync("/api/v1/leads");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Admin_can_create_car_and_invalid_payload_is_422()
    {
        var admin = await LoginAsync("09120000001");
        var valid = new
        {
            titleFa = "تویوتا هایلوکس", brandEn = "Toyota", modelEn = "Hilux", modelYear = 2025, yearCalendar = "Gregorian",
            condition = "New", listingType = "Regular", mileageKm = 0, colors = "سفید", transmission = "Automatic",
            fuelType = "Diesel", drivetrain = "FourWheel", tags = "None", priceRial = 60_000_000_000L, priceOnCall = false,
            publish = true
        };

        var created = await admin.PostAsJsonAsync("/api/v1/admin/cars", valid);
        var duplicateTitle = await admin.PostAsJsonAsync("/api/v1/admin/cars", valid);
        var bad = await admin.PostAsJsonAsync("/api/v1/admin/cars", new { titleFa = "", brandEn = "تویوتا", modelYear = 1800 });

        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        Assert.Equal(HttpStatusCode.Created, duplicateTitle.StatusCode); // same title → new unique slug
        Assert.Equal(HttpStatusCode.UnprocessableEntity, bad.StatusCode);
    }

    [Fact]
    public async Task Price_request_lead_is_created_and_visible_to_admin()
    {
        var client = factory.CreateClient();
        var (carId, _) = await FirstAvailableCarAsync(client);

        var lead = await client.PostAsJsonAsync("/api/v1/leads",
            new { name = "علی", phone = "۰۹۱۷۵۵۵۴۴۳۳", type = "PriceRequest", carId, message = "قیمت لطفاً" });
        var admin = await LoginAsync("09120000001");
        var list = await admin.GetFromJsonAsync<JsonElement>("/api/v1/leads", Json);

        Assert.Equal(HttpStatusCode.Created, lead.StatusCode);
        Assert.Contains(list.GetProperty("items").EnumerateArray(), l => l.GetProperty("phone").GetString() == "09175554433");
    }

    [Fact]
    public async Task Refresh_token_rotates_and_reuse_revokes_session()
    {
        var handler = factory.Server.CreateHandler();
        var cookies = new System.Net.CookieContainer();
        var client = new HttpClient(new CookieHandler(handler, cookies)) { BaseAddress = new Uri("http://localhost") };
        const string phone = "09170000096";

        await client.PostAsJsonAsync("/api/v1/auth/otp", new { phone });
        (await client.PostAsJsonAsync("/api/v1/auth/verify", new { phone, code = factory.Sms.LastCode[phone] })).EnsureSuccessStatusCode();
        var original = cookies.GetCookies(new Uri("http://localhost/api/v1/auth"))["mm_rt"]!.Value;

        var rotated = await client.PostAsync("/api/v1/auth/refresh", null);
        Assert.Equal(HttpStatusCode.OK, rotated.StatusCode);

        // Replay the old (already rotated) token → rejected, and the whole family is revoked.
        var thief = factory.CreateClient();
        var replay = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/refresh");
        replay.Headers.Add("Cookie", $"mm_rt={original}");
        Assert.Equal(HttpStatusCode.Unauthorized, (await thief.SendAsync(replay)).StatusCode);

        var legit = await client.PostAsync("/api/v1/auth/refresh", null);
        Assert.Equal(HttpStatusCode.Unauthorized, legit.StatusCode);
    }

    private static object CarPayload(bool publish, Guid? version = null, string title = "خودروی تست") => new
    {
        titleFa = title, brandEn = "Toyota", modelEn = "Hilux", modelYear = 2025, yearCalendar = "Gregorian",
        condition = "New", listingType = "Regular", mileageKm = 0, colors = "سفید", transmission = "Automatic",
        fuelType = "Diesel", drivetrain = "FourWheel", tags = "None", priceRial = 60_000_000_000L, priceOnCall = false,
        publish, version
    };

    /// <summary>Parallel brute force must not get more than MaxAttempts guesses.</summary>
    [Fact]
    public async Task Parallel_wrong_otp_guesses_cannot_exceed_attempt_limit()
    {
        var client = factory.CreateClient();
        const string phone = "09170000095";
        await client.PostAsJsonAsync("/api/v1/auth/otp", new { phone });
        var real = factory.Sms.LastCode[phone];
        var wrong = Enumerable.Range(0, 30).Select(i => (100000 + i).ToString()).Where(c => c != real).Take(25).ToList();

        await Task.WhenAll(wrong.Select(c => factory.CreateClient().PostAsJsonAsync("/api/v1/auth/verify", new { phone, code = c })));
        var withRealCode = await client.PostAsJsonAsync("/api/v1/auth/verify", new { phone, code = real });

        Assert.NotEqual(HttpStatusCode.OK, withRealCode.StatusCode); // code was burned by the attempt limit
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var attempts = await db.OtpCodes.Where(o => o.Phone == phone).Select(o => o.Attempts).MaxAsync();
        Assert.True(attempts <= 5, $"attempts = {attempts}");
    }

    [Fact]
    public async Task Customer_can_hold_only_one_active_reservation()
    {
        var customer = await LoginAsync("09170000094");
        var (first, _) = await FirstAvailableCarAsync(customer, skip: 6);
        var (second, _) = await FirstAvailableCarAsync(customer, skip: 7);

        var ok = await customer.PostAsync($"/api/v1/cars/{first}/reservations", null);
        var blocked = await customer.PostAsync($"/api/v1/cars/{second}/reservations", null);
        var body = await blocked.Content.ReadFromJsonAsync<JsonElement>(Json);

        Assert.Equal(HttpStatusCode.Created, ok.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, blocked.StatusCode);
        Assert.Equal("reservation.customer_has_active", body.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Editing_a_reserved_car_never_puts_it_back_on_sale()
    {
        var admin = await LoginAsync("09120000001");
        var created = await admin.PostAsJsonAsync("/api/v1/admin/cars", CarPayload(publish: true));
        var id = (await created.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("id").GetGuid();
        var customer = await LoginAsync("09170000093");
        (await customer.PostAsync($"/api/v1/cars/{id}/reservations", null)).EnsureSuccessStatusCode();

        var update = await admin.PutAsJsonAsync($"/api/v1/admin/cars/{id}", CarPayload(publish: true));
        Assert.Equal(HttpStatusCode.NoContent, update.StatusCode);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var status = await db.Cars.Where(c => c.Id == id).Select(c => c.Status).SingleAsync();
        Assert.Equal(Moraveji.Domain.Cars.CarStatus.Reserved, status);
    }

    [Fact]
    public async Task Stale_edit_form_is_rejected_instead_of_overwriting()
    {
        var admin = await LoginAsync("09120000001");
        var created = await admin.PostAsJsonAsync("/api/v1/admin/cars", CarPayload(publish: true));
        var id = (await created.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("id").GetGuid();

        Guid version;
        using (var scope = factory.Services.CreateScope())
            version = await scope.ServiceProvider.GetRequiredService<AppDbContext>().Cars.Where(c => c.Id == id).Select(c => c.Version).SingleAsync();

        var firstEditor = await admin.PutAsJsonAsync($"/api/v1/admin/cars/{id}", CarPayload(publish: true, version, title: "قیمت جدید"));
        var secondEditorWithStaleForm = await admin.PutAsJsonAsync($"/api/v1/admin/cars/{id}", CarPayload(publish: true, version));

        Assert.Equal(HttpStatusCode.NoContent, firstEditor.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, secondEditorWithStaleForm.StatusCode);
    }

    [Fact]
    public async Task Security_headers_are_present()
    {
        var response = await factory.CreateClient().GetAsync("/api/v1/cars");

        Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Equal("DENY", response.Headers.GetValues("X-Frame-Options").Single());
    }
}

/// <summary>Minimal cookie-aware handler for the in-memory test server.</summary>
internal sealed class CookieHandler(HttpMessageHandler inner, System.Net.CookieContainer cookies) : DelegatingHandler(inner)
{
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        var header = cookies.GetCookieHeader(request.RequestUri!);
        if (!string.IsNullOrEmpty(header)) request.Headers.Add("Cookie", header);
        var response = await base.SendAsync(request, ct);
        if (response.Headers.TryGetValues("Set-Cookie", out var setCookies))
            foreach (var c in setCookies) cookies.SetCookies(request.RequestUri!, c.Replace("; secure", "", StringComparison.OrdinalIgnoreCase));
        return response;
    }
}
