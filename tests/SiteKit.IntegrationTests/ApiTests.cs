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
using SiteKit.Application.Auth;
using SiteKit.Infrastructure.Persistence;

namespace SiteKit.IntegrationTests;

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
    private readonly string _dbPath = Path.Combine(Path.GetTempPath(), $"sitekit-test-{Guid.NewGuid():N}.db");
    public FakeSms Sms { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("Database:Provider", "Sqlite");
        builder.UseSetting("ConnectionStrings:Default", $"Data Source={_dbPath};Default Timeout=30");
        builder.UseSetting("Sms:Provider", "Console");
        builder.UseSetting("Seed:Mode", "demo");
        builder.UseSetting("Seed:Preset", "car");
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
    public async Task Customer_cannot_use_admin_endpoints()
    {
        var customer = await LoginAsync("09170000097");

        var response = await customer.GetAsync("/api/v1/leads");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Item_request_lead_is_created_and_visible_to_admin()
    {
        var client = factory.CreateClient();
        var page = await client.GetFromJsonAsync<JsonElement>("/api/v1/listings", Json);
        var listingId = page.GetProperty("items")[0].GetProperty("id").GetGuid();

        var lead = await client.PostAsJsonAsync("/api/v1/leads",
            new { name = "علی", phone = "۰۹۱۷۵۵۵۴۴۳۳", type = "ItemRequest", listingId, message = "قیمت لطفاً" });
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
        var original = cookies.GetCookies(new Uri("http://localhost/api/v1/auth"))["sk_rt"]!.Value;

        var rotated = await client.PostAsync("/api/v1/auth/refresh", null);
        Assert.Equal(HttpStatusCode.OK, rotated.StatusCode);

        // Replay the old (already rotated) token → rejected, and the whole family is revoked.
        var thief = factory.CreateClient();
        var replay = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/refresh");
        replay.Headers.Add("Cookie", $"sk_rt={original}");
        Assert.Equal(HttpStatusCode.Unauthorized, (await thief.SendAsync(replay)).StatusCode);

        var legit = await client.PostAsync("/api/v1/auth/refresh", null);
        Assert.Equal(HttpStatusCode.Unauthorized, legit.StatusCode);
    }

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
    public async Task Security_headers_are_present()
    {
        var response = await factory.CreateClient().GetAsync("/api/v1/site");

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
