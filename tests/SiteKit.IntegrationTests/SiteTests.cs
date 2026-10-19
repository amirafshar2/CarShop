using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace SiteKit.IntegrationTests;

/// <summary>Template features: settings, generic listings, publishing, uploads, content packages.</summary>
public sealed class SiteTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private static async Task<HttpClient> Login(WebApplicationFactory<Program> f, FakeSms sms, string phone)
    {
        var client = f.CreateClient();
        (await client.PostAsJsonAsync("/api/v1/auth/otp", new { phone })).EnsureSuccessStatusCode();
        var verify = await client.PostAsJsonAsync("/api/v1/auth/verify", new { phone, code = sms.LastCode[phone] });
        verify.EnsureSuccessStatusCode();
        var body = await verify.Content.ReadFromJsonAsync<JsonElement>(Json);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", body.GetProperty("accessToken").GetString());
        return client;
    }

    private Task<HttpClient> Admin() => Login(factory, factory.Sms, "09120000001");

    private static object Listing(string title, string status = "Published", long? price = 10_000_000, string[]? images = null, Guid? version = null) => new
    {
        title, category = "نو", summary = "خلاصه", description = (string?)null, priceType = price is null ? "OnCall" : "Fixed",
        priceRial = price, originalPriceRial = (long?)null, unit = (string?)null, badge = (string?)null,
        images = images ?? ["https://example.com/a.jpg"], attributes = new Dictionary<string, string> { ["year"] = "2024", ["fuel"] = "برقی" },
        status, isFeatured = false, sortOrder = 0, version
    };

    [Fact]
    public async Task Demo_site_is_published_with_preset_content()
    {
        var site = await factory.CreateClient().GetFromJsonAsync<JsonElement>("/api/v1/site", Json);
        Assert.Equal("car", site.GetProperty("preset").GetString());
        Assert.True(site.GetProperty("isPublished").GetBoolean());
        Assert.Equal("خودرو", site.GetProperty("content").GetProperty("labels").GetProperty("itemSingular").GetString());
        Assert.NotEmpty(site.GetProperty("content").GetProperty("fields").EnumerateArray());
    }

    [Fact]
    public async Task Listings_filter_by_category_and_field_and_resolve_persian_slug()
    {
        var c = factory.CreateClient();
        var used = await c.GetFromJsonAsync<JsonElement>("/api/v1/listings?category=" + Uri.EscapeDataString("کارکرده"), Json);
        Assert.All(used.GetProperty("items").EnumerateArray(), i => Assert.Equal("کارکرده", i.GetProperty("category").GetString()));

        var hybrid = await c.GetFromJsonAsync<JsonElement>("/api/v1/listings?f_fuel=" + Uri.EscapeDataString("هیبرید"), Json);
        Assert.True(hybrid.GetProperty("totalCount").GetInt32() >= 1);
        Assert.All(hybrid.GetProperty("items").EnumerateArray(), i => Assert.Equal("هیبرید", i.GetProperty("attributes").GetProperty("fuel").GetString()));

        var slug = hybrid.GetProperty("items")[0].GetProperty("slug").GetString()!;
        Assert.Equal(HttpStatusCode.OK, (await c.GetAsync("/api/v1/listings/" + Uri.EscapeDataString(slug))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await c.GetAsync("/api/v1/listings/nope")).StatusCode);
    }

    [Fact]
    public async Task Admin_creates_listing_drafts_stay_private_and_unsafe_images_are_rejected()
    {
        var admin = await Admin();
        var a = await admin.PostAsJsonAsync("/api/v1/admin/listings", Listing("تور تست اسلاگ"));
        var b = await admin.PostAsJsonAsync("/api/v1/admin/listings", Listing("تور تست اسلاگ"));
        var draft = await admin.PostAsJsonAsync("/api/v1/admin/listings", Listing("پیش‌نویس مخفی", status: "Draft"));
        var bad = await admin.PostAsJsonAsync("/api/v1/admin/listings", Listing("بد", images: ["javascript:alert(1)"]));
        Assert.Equal(HttpStatusCode.Created, a.StatusCode);
        Assert.Equal(HttpStatusCode.Created, b.StatusCode);
        Assert.Equal(HttpStatusCode.Created, draft.StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, bad.StatusCode);

        var pub = await factory.CreateClient().GetFromJsonAsync<JsonElement>("/api/v1/listings?pageSize=48&q=" + Uri.EscapeDataString("تور تست اسلاگ"), Json);
        var slugs = pub.GetProperty("items").EnumerateArray().Select(i => i.GetProperty("slug").GetString()).ToList();
        Assert.Contains("تور-تست-اسلاگ", slugs);
        Assert.Contains("تور-تست-اسلاگ-2", slugs);
        var hidden = await factory.CreateClient().GetFromJsonAsync<JsonElement>("/api/v1/listings?q=" + Uri.EscapeDataString("پیش‌نویس مخفی"), Json);
        Assert.Equal(0, hidden.GetProperty("totalCount").GetInt32());
    }

    [Fact]
    public async Task Stale_listing_edit_is_rejected_and_staff_cannot_edit()
    {
        var admin = await Admin();
        var created = await admin.PostAsJsonAsync("/api/v1/admin/listings", Listing("رقابت ویرایش"));
        var id = (await created.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("id").GetGuid();
        var v = (await admin.GetFromJsonAsync<JsonElement>($"/api/v1/admin/listings/{id}", Json)).GetProperty("version").GetGuid();

        var first = await admin.PutAsJsonAsync($"/api/v1/admin/listings/{id}", Listing("رقابت ویرایش", price: 20_000_000, version: v));
        var stale = await admin.PutAsJsonAsync($"/api/v1/admin/listings/{id}", Listing("رقابت ویرایش", price: 30_000_000, version: v));
        Assert.Equal(HttpStatusCode.NoContent, first.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);

        await admin.PostAsJsonAsync("/api/v1/admin/users", new { phone = "09170000201", fullName = "کارمند", role = "Staff" });
        var staff = await Login(factory, factory.Sms, "09170000201");
        Assert.Equal(HttpStatusCode.Forbidden, (await staff.PutAsJsonAsync($"/api/v1/admin/listings/{id}", Listing("x"))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await staff.GetAsync("/api/v1/admin/site")).StatusCode);
        var content = (await staff.GetFromJsonAsync<JsonElement>("/api/v1/admin/site", Json)).GetProperty("content");
        Assert.Equal(HttpStatusCode.Forbidden, (await staff.PutAsJsonAsync("/api/v1/admin/site", new { content })).StatusCode);
    }

    [Fact]
    public async Task Site_settings_update_validates_links_and_publish_toggles_visibility()
    {
        var admin = await Admin();
        var site = await admin.GetFromJsonAsync<JsonElement>("/api/v1/admin/site", Json);
        var content = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(site.GetProperty("content").GetRawText(), Json)!;

        var evil = new Dictionary<string, object>(content.ToDictionary(k => k.Key, k => (object)k.Value))
        {
            ["nav"] = new[] { new { label = "بد", href = "javascript:alert(1)" } }
        };
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await admin.PutAsJsonAsync("/api/v1/admin/site", new { content = evil })).StatusCode);

        var brand = JsonSerializer.Deserialize<Dictionary<string, object?>>(content["brand"].GetRawText(), Json)!;
        brand["name"] = "نام جدید تست";
        var good = new Dictionary<string, object>(content.ToDictionary(k => k.Key, k => (object)k.Value)) { ["brand"] = brand };
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PutAsJsonAsync("/api/v1/admin/site", new { content = good })).StatusCode);
        var pub = await factory.CreateClient().GetFromJsonAsync<JsonElement>("/api/v1/site", Json);
        Assert.Equal("نام جدید تست", pub.GetProperty("content").GetProperty("brand").GetProperty("name").GetString());

        Assert.Equal(HttpStatusCode.NoContent, (await admin.PostAsJsonAsync("/api/v1/admin/site/publish", new { published = false })).StatusCode);
        Assert.False((await factory.CreateClient().GetFromJsonAsync<JsonElement>("/api/v1/site", Json)).GetProperty("isPublished").GetBoolean());
        await admin.PostAsJsonAsync("/api/v1/admin/site/publish", new { published = true });
    }

    [Fact]
    public async Task Upload_accepts_real_images_only_and_serves_them_back()
    {
        var admin = await Admin();
        var png = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=");
        using var ok = new MultipartFormDataContent { { new ByteArrayContent(png), "file", "logo.png" } };
        var res = await admin.PostAsync("/api/v1/admin/uploads", ok);
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        var url = (await res.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("url").GetString()!;
        var file = await factory.CreateClient().GetAsync(url);
        Assert.Equal("image/png", file.Content.Headers.ContentType!.MediaType);

        using var svg = new MultipartFormDataContent { { new ByteArrayContent("<svg onload=alert(1)>"u8.ToArray()), "file", "x.png" } };
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await admin.PostAsync("/api/v1/admin/uploads", svg)).StatusCode);
        using var anon = new MultipartFormDataContent { { new ByteArrayContent(png), "file", "a.png" } };
        Assert.Equal(HttpStatusCode.Unauthorized, (await factory.CreateClient().PostAsync("/api/v1/admin/uploads", anon)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await factory.CreateClient().GetAsync("/api/v1/files/..%2Fappsettings.json")).StatusCode);
    }

    [Fact]
    public async Task Blank_site_setup_key_claim_import_and_reset()
    {
        using var blank = new ApiFactory();
        using var fresh = blank.WithWebHostBuilder(b =>
        {
            b.UseSetting("Seed:Mode", "blank");
            b.UseSetting("Seed:AdminPhone", "");
            b.UseSetting("Setup:Key", "secret-key-123");
        });
        var anon = fresh.CreateClient();
        var site = await anon.GetFromJsonAsync<JsonElement>("/api/v1/site", Json);
        Assert.False(site.GetProperty("isPublished").GetBoolean());
        Assert.False(site.GetProperty("setupCompleted").GetBoolean());
        var status = await anon.GetFromJsonAsync<JsonElement>("/api/v1/auth/setup", Json);
        Assert.False(status.GetProperty("hasAdmin").GetBoolean());
        Assert.Equal(0, (await anon.GetFromJsonAsync<JsonElement>("/api/v1/listings", Json)).GetProperty("totalCount").GetInt32());

        Assert.Equal(HttpStatusCode.Unauthorized, (await anon.PostAsJsonAsync("/api/v1/auth/setup", new { phone = "09121110000", key = "wrong-key" })).StatusCode);
        var claim = await anon.PostAsJsonAsync("/api/v1/auth/setup", new { phone = "09121110000", fullName = "صاحب سایت", key = "secret-key-123" });
        Assert.Equal(HttpStatusCode.OK, claim.StatusCode);
        var token = (await claim.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("accessToken").GetString();
        // Someone else with the key cannot take over an already claimed site.
        Assert.Equal(HttpStatusCode.Forbidden, (await anon.PostAsJsonAsync("/api/v1/auth/setup", new { phone = "09121119999", key = "secret-key-123" })).StatusCode);

        var owner = fresh.CreateClient();
        owner.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Export from the demo site, import into the blank one.
        var export = await (await Admin()).GetAsync("/api/v1/admin/site/export");
        var package = await export.Content.ReadFromJsonAsync<JsonElement>(Json);
        var import = await owner.PostAsync("/api/v1/admin/site/import", new StringContent(package.GetRawText(), System.Text.Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.NoContent, import.StatusCode);
        var imported = await anon.GetFromJsonAsync<JsonElement>("/api/v1/site", Json);
        Assert.Equal("car", imported.GetProperty("preset").GetString());
        Assert.Equal(package.GetProperty("listings").EnumerateArray().Count(l => l.GetProperty("status").GetString() is "Published" or "SoldOut"),
            (await anon.GetFromJsonAsync<JsonElement>("/api/v1/listings?pageSize=48", Json)).GetProperty("totalCount").GetInt32());

        // Start over as a blank travel site.
        Assert.Equal(HttpStatusCode.NoContent, (await owner.PostAsJsonAsync("/api/v1/admin/site/reset", new { mode = "blank", preset = "travel" })).StatusCode);
        var reset = await owner.GetFromJsonAsync<JsonElement>("/api/v1/admin/site", Json);
        Assert.Equal("travel", reset.GetProperty("preset").GetString());
        Assert.Equal(0, reset.GetProperty("progress").GetProperty("listings").GetInt32());
        Assert.Equal("", reset.GetProperty("content").GetProperty("brand").GetProperty("name").GetString());
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await owner.PostAsJsonAsync("/api/v1/admin/site/publish", new { published = true })).StatusCode);
    }
}
