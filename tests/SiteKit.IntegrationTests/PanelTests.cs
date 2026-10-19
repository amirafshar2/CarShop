using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Hosting;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace SiteKit.IntegrationTests;

/// <summary>Services price list, admin panel and customer panel endpoints.</summary>
public sealed class PanelTests(ApiFactory factory) : IClassFixture<ApiFactory>
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
        client.DefaultRequestHeaders.Authorization = new("Bearer", body.GetProperty("accessToken").GetString());
        return client;
    }

    private static object Service(string title, string priceType = "Fixed", long? price = 50_000_000, long? original = null,
        bool active = true, Guid? version = null) => new
    {
        title, category = "دیتیلینگ", description = "توضیح", features = new[] { "ویژگی ۱", "ویژگی ۲" },
        priceType, priceRial = price, originalPriceRial = original, unit = "هر مورد", badge = (string?)null,
        imageUrl = (string?)null, sortOrder = 9, isActive = active, isFeatured = false, version
    };

    [Fact]
    public async Task Demo_login_is_disabled_without_access_key()
    {
        var client = factory.CreateClient();
        var info = await client.GetFromJsonAsync<JsonElement>("/api/v1/auth/demo", Json);
        Assert.False(info.GetProperty("enabled").GetBoolean());
        Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsJsonAsync("/api/v1/auth/demo-login", new { role = "Admin", key = "x" })).StatusCode);
    }

    [Fact]
    public async Task Demo_login_with_access_key_signs_in_as_admin_and_rejects_wrong_key()
    {
        using var demo = factory.WithWebHostBuilder(b => b.UseSetting("Demo:AccessKey", "showroom-2026"));
        var client = demo.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/v1/auth/demo-login", new { role = "Admin", key = "wrong-key" })).StatusCode);
        var ok = await client.PostAsJsonAsync("/api/v1/auth/demo-login", new { role = "Admin", key = "showroom-2026" });
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
        var body = await ok.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Contains(body.GetProperty("user").GetProperty("roles").EnumerateArray(), r => r.GetString() == "Admin");
        var customer = await client.PostAsJsonAsync("/api/v1/auth/demo-login", new { role = "Customer", key = "showroom-2026" });
        Assert.NotEqual(HttpStatusCode.OK, customer.StatusCode);
    }

    [Fact]
    public async Task Open_demo_signs_in_as_staff_without_key()
    {
        using var demo = factory.WithWebHostBuilder(b => b.UseSetting("Demo:OpenAccess", "true").UseSetting("Seed:StaffPhones:0", "09120000002"));
        var client = demo.CreateClient();
        var info = await client.GetFromJsonAsync<JsonElement>("/api/v1/auth/demo", Json);
        Assert.True(info.GetProperty("enabled").GetBoolean());
        Assert.False(info.GetProperty("requiresKey").GetBoolean());
        var ok = await client.PostAsJsonAsync("/api/v1/auth/demo-login", new { role = "Staff" });
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
    }

    [Fact]
    public async Task Otp_code_is_never_returned_outside_development()
    {
        var res = await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/otp", new { phone = "09170000086" });
        var body = await res.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.True(!body.TryGetProperty("devCode", out var c) || c.ValueKind == JsonValueKind.Null);
    }

    [Fact]
    public async Task Public_price_list_shows_only_active_seeded_services()
    {
        var list = await factory.CreateClient().GetFromJsonAsync<JsonElement>("/api/v1/services", Json);
        Assert.True(list.GetArrayLength() >= 3);
        Assert.All(list.EnumerateArray(), s => Assert.True(s.GetProperty("isActive").GetBoolean()));
    }

    [Fact]
    public async Task Admin_creates_updates_hides_and_deletes_a_service_and_public_list_follows()
    {
        var admin = await LoginAsync("09120000001");
        var anon = factory.CreateClient();

        var created = await admin.PostAsJsonAsync("/api/v1/admin/services", Service("خدمت تست CRUD"));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var id = (await created.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("id").GetGuid();
        Assert.Contains((await anon.GetFromJsonAsync<JsonElement>("/api/v1/services", Json)).EnumerateArray(),
            s => s.GetProperty("id").GetGuid() == id && s.GetProperty("priceRial").GetInt64() == 50_000_000);

        var all = await admin.GetFromJsonAsync<JsonElement>("/api/v1/admin/services", Json);
        var version = all.EnumerateArray().First(s => s.GetProperty("id").GetGuid() == id).GetProperty("version").GetGuid();
        var updated = await admin.PutAsJsonAsync($"/api/v1/admin/services/{id}", Service("خدمت تست CRUD", price: 70_000_000, original: 90_000_000, version: version));
        Assert.Equal(HttpStatusCode.NoContent, updated.StatusCode);
        var stale = await admin.PutAsJsonAsync($"/api/v1/admin/services/{id}", Service("خدمت تست CRUD", version: version));
        Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
        Assert.Contains((await anon.GetFromJsonAsync<JsonElement>("/api/v1/services", Json)).EnumerateArray(),
            s => s.GetProperty("id").GetGuid() == id && s.GetProperty("priceRial").GetInt64() == 70_000_000);

        var hidden = await admin.PutAsJsonAsync($"/api/v1/admin/services/{id}", Service("خدمت تست CRUD", active: false));
        Assert.Equal(HttpStatusCode.NoContent, hidden.StatusCode);
        Assert.DoesNotContain((await anon.GetFromJsonAsync<JsonElement>("/api/v1/services", Json)).EnumerateArray(),
            s => s.GetProperty("id").GetGuid() == id);

        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/api/v1/admin/services/{id}")).StatusCode);
        Assert.DoesNotContain((await admin.GetFromJsonAsync<JsonElement>("/api/v1/admin/services", Json)).EnumerateArray(),
            s => s.GetProperty("id").GetGuid() == id);
    }

    [Fact]
    public async Task Invalid_service_price_is_rejected()
    {
        var admin = await LoginAsync("09120000001");
        var noPrice = await admin.PostAsJsonAsync("/api/v1/admin/services", Service("بی‌قیمت", price: null));
        var badOriginal = await admin.PostAsJsonAsync("/api/v1/admin/services", Service("تخفیف غلط", price: 50, original: 40));
        var onCall = await admin.PostAsJsonAsync("/api/v1/admin/services", Service("تماس", priceType: "OnCall", price: null));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, noPrice.StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, badOriginal.StatusCode);
        Assert.Equal(HttpStatusCode.Created, onCall.StatusCode);
    }

    [Fact]
    public async Task Customer_and_staff_cannot_change_prices_or_users()
    {
        var customer = await LoginAsync("09170000081");
        Assert.Equal(HttpStatusCode.Forbidden, (await customer.PostAsJsonAsync("/api/v1/admin/services", Service("x"))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await customer.GetAsync("/api/v1/admin/stats")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await factory.CreateClient().GetAsync("/api/v1/me")).StatusCode);

        // Admin promotes a phone to staff → staff sees the dashboard but still cannot edit prices or users.
        var admin = await LoginAsync("09120000001");
        var created = await admin.PostAsJsonAsync("/api/v1/admin/users", new { phone = "09170000082", fullName = "کارشناس", role = "Staff" });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var staff = await LoginAsync("09170000082");
        Assert.Equal(HttpStatusCode.OK, (await staff.GetAsync("/api/v1/admin/stats")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await staff.PostAsJsonAsync("/api/v1/admin/services", Service("x"))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await staff.GetAsync("/api/v1/admin/users")).StatusCode);
    }

    [Fact]
    public async Task Admin_cannot_remove_own_admin_role()
    {
        var admin = await LoginAsync("09120000001");
        var me = await admin.GetFromJsonAsync<JsonElement>("/api/v1/me", Json);
        var res = await admin.PutAsJsonAsync($"/api/v1/admin/users/{me.GetProperty("id").GetGuid()}/role", new { role = "Customer" });
        Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);
    }

    [Fact]
    public async Task Customer_sees_own_leads_and_can_update_profile()
    {
        var anon = factory.CreateClient();
        await anon.PostAsJsonAsync("/api/v1/leads", new { name = "رضا", phone = "09170000085", type = "ServiceRequest", message = "سرامیک" });
        var customer = await LoginAsync("09170000085");

        var leads = await customer.GetFromJsonAsync<JsonElement>("/api/v1/me/leads", Json);
        Assert.Single(leads.EnumerateArray());

        var updated = await customer.PutAsJsonAsync("/api/v1/me", new { fullName = "رضا رضایی" });
        Assert.Equal("رضا رضایی", (await updated.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("fullName").GetString());
    }

}
