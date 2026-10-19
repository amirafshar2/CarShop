using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace SiteKit.Application.Site;

// Everything an owner can change from the panel. Stored as one JSON document (SiteSettings.ContentJson).
// All classes are plain mutable DTOs with safe defaults so an empty/old document always deserialises.

public sealed class SiteContent
{
    public BrandInfo Brand { get; set; } = new();
    public ThemeInfo Theme { get; set; } = new();
    public LabelInfo Labels { get; set; } = new();
    /// <summary>Extra fields of each listing (year, mileage, duration …), defined by the preset and editable.</summary>
    public List<FieldDef> Fields { get; set; } = [];
    public List<string> Categories { get; set; } = [];
    public HomeInfo Home { get; set; } = new();
    public ContactInfo Contact { get; set; } = new();
    public List<NavLink> Nav { get; set; } = [];
    public FooterInfo Footer { get; set; } = new();
    public SeoInfo Seo { get; set; } = new();
    public PagesInfo Pages { get; set; } = new();
}

public sealed class BrandInfo
{
    public string Name { get; set; } = "";
    public string? Tagline { get; set; }
    public string? Description { get; set; }
    /// <summary>Uploaded or external logo (https:// or /api/v1/files/…). Empty → initials badge.</summary>
    public string? LogoUrl { get; set; }
}

public sealed class ThemeInfo
{
    /// <summary>Main colour, #rrggbb.</summary>
    public string Primary { get; set; } = "#f97316";
    /// <summary>dark | light</summary>
    public string Mode { get; set; } = "dark";
    /// <summary>sharp | soft | round</summary>
    public string Corners { get; set; } = "soft";
}

public sealed class LabelInfo
{
    public string ItemSingular { get; set; } = "آیتم";
    public string ItemPlural { get; set; } = "آیتم‌ها";
    public string ItemsPageTitle { get; set; } = "همه‌ی آیتم‌ها";
    public string RequestButton { get; set; } = "ثبت درخواست";
    public string CategoryLabel { get; set; } = "دسته";
    public string SoldOutLabel { get; set; } = "ناموجود";
    public string ServicesTitle { get; set; } = "خدمات و قیمت‌ها";
}

public sealed class FieldDef
{
    /// <summary>Stable key stored in each listing, latin letters/digits only.</summary>
    public string Key { get; set; } = "";
    public string Label { get; set; } = "";
    /// <summary>text | number | select</summary>
    public string Type { get; set; } = "text";
    public List<string> Options { get; set; } = [];
    public string? Suffix { get; set; }
    /// <summary>Shown as a chip on the card in the list.</summary>
    public bool ShowOnCard { get; set; }
    /// <summary>Offered as a filter on the list page (select fields).</summary>
    public bool Filter { get; set; }
}

public sealed class HomeInfo
{
    /// <summary>Small line above the big hero title (falls back to the brand tagline).</summary>
    public string? HeroEyebrow { get; set; }
    public string HeroTitle { get; set; } = "";
    public string? HeroSubtitle { get; set; }
    public string? HeroImageUrl { get; set; }
    public string? HeroVideoUrl { get; set; }
    /// <summary>scroll = the video plays forward/backward with scrolling; loop = plays on its own.</summary>
    public string HeroVideoMode { get; set; } = "scroll";
    /// <summary>True when the upload optimiser produced {name}-scrub.mp4, {name}-scrub-720.mp4 and {name}.jpg next to the video.</summary>
    public bool HeroVideoOptimized { get; set; }
    public string? HeroCtaText { get; set; }
    public string? HeroCtaUrl { get; set; }
    public bool ShowHighlights { get; set; } = true;
    public string? HighlightsEyebrow { get; set; }
    public string? HighlightsTitle { get; set; }
    public string? HighlightsText { get; set; }
    /// <summary>Steps with an image each → shown as a sticky scroll story (image changes while you read).</summary>
    public List<Highlight> Highlights { get; set; } = [];
    public bool ShowFeatured { get; set; } = true;
    public string? FeaturedEyebrow { get; set; }
    public string? FeaturedTitle { get; set; }
    public string? FeaturedText { get; set; }
    public bool ShowStats { get; set; } = true;
    public bool ShowServices { get; set; } = true;
    public string? ServicesEyebrow { get; set; }
    public string? ServicesTitle { get; set; }
    public bool ShowPartners { get; set; } = true;
    public string? PartnersEyebrow { get; set; }
    public string? PartnersTitle { get; set; }
    /// <summary>Names shown in the moving logo strip (partners, organisations, brands).</summary>
    public List<string> Partners { get; set; } = [];
    public bool ShowTestimonials { get; set; } = true;
    public string? TestimonialsEyebrow { get; set; }
    public string? TestimonialsTitle { get; set; }
    public string? TestimonialsText { get; set; }
    public List<Testimonial> Testimonials { get; set; } = [];
    public bool ShowGallery { get; set; } = true;
    public string? GalleryEyebrow { get; set; }
    public string? GalleryTitle { get; set; }
    /// <summary>Up to 7 photos for the zoom-parallax section (first one is the large centre image).</summary>
    public List<string> Gallery { get; set; } = [];
    public bool ShowAbout { get; set; } = true;
    public string? AboutTitle { get; set; }
    public string? AboutText { get; set; }
    public string? AboutImageUrl { get; set; }
    public List<Stat> Stats { get; set; } = [];
    public bool ShowFaq { get; set; } = true;
    public List<FaqItem> Faq { get; set; } = [];
    public bool ShowCta { get; set; } = true;
    public string? CtaTitle { get; set; }
    public string? CtaText { get; set; }
    public string? CtaButtonText { get; set; }
    public string? CtaButtonUrl { get; set; }
}

public sealed class Highlight
{
    public string Title { get; set; } = "";
    public string? Text { get; set; }
    /// <summary>Icon name from a fixed list (shield, clock, star, truck, heart, check, map, phone, gift, sparkles).</summary>
    public string? Icon { get; set; }
    public string? ImageUrl { get; set; }
}

public sealed class Testimonial
{
    public string Name { get; set; } = "";
    public string? Role { get; set; }
    public string Text { get; set; } = "";
}

public sealed class Stat
{
    public string Value { get; set; } = "";
    public string Label { get; set; } = "";
}

public sealed class FaqItem
{
    public string Question { get; set; } = "";
    public string Answer { get; set; } = "";
}

public sealed class ContactInfo
{
    public string? Phone { get; set; }
    public string? Whatsapp { get; set; }
    public string? Instagram { get; set; }
    public string? Telegram { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? Hours { get; set; }
    /// <summary>Link to Google Maps / Neshan / Balad.</summary>
    public string? MapUrl { get; set; }
}

public sealed class NavLink
{
    public string Label { get; set; } = "";
    public string Href { get; set; } = "/";
    /// <summary>Optional sub-links → the item opens a mega menu (with <see cref="ImageUrl"/> on the side).</summary>
    public List<NavLink> Children { get; set; } = [];
    public string? Badge { get; set; }
    /// <summary>Sub-links with the same group are shown together as one column (group = column heading).</summary>
    public string? Group { get; set; }
    public string? ImageUrl { get; set; }
    public string? Caption { get; set; }
    /// <summary>Small line at the bottom of the mega menu (links to the item's own href).</summary>
    public string? Note { get; set; }
}

public sealed class FooterInfo
{
    public string? Text { get; set; }
    public string? Copyright { get; set; }
}

public sealed class SeoInfo
{
    public string? Title { get; set; }
    public string? Description { get; set; }
}

public sealed class PagesInfo
{
    public bool Items { get; set; } = true;
    public bool Services { get; set; } = true;
    public bool Contact { get; set; } = true;
}

public static class SiteJson
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.Never,
        Converters = { new JsonStringEnumConverter() },
        WriteIndented = false
    };

    public static SiteContent Read(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new SiteContent();
        try { return JsonSerializer.Deserialize<SiteContent>(json, Options) ?? new SiteContent(); }
        catch (JsonException) { return new SiteContent(); }
    }

    public static string Write(SiteContent c) => JsonSerializer.Serialize(c, Options);

    public static Dictionary<string, string> ReadAttributes(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try { return JsonSerializer.Deserialize<Dictionary<string, string>>(json, Options) ?? []; }
        catch (JsonException) { return []; }
    }
}

/// <summary>Validation and clean-up of owner input. Links may only be relative, https, tel, mailto or WhatsApp — never javascript:.</summary>
public static partial class SiteRules
{
    [GeneratedRegex("^#[0-9a-fA-F]{6}$")] private static partial Regex Hex();
    [GeneratedRegex("^[a-z][a-z0-9]{0,29}$")] private static partial Regex FieldKey();

    public static bool IsSafeUrl(string? url) =>
        string.IsNullOrWhiteSpace(url)
        || url.StartsWith("https://", StringComparison.OrdinalIgnoreCase)
        || (url.StartsWith('/') && !url.StartsWith("//"));

    public static bool IsSafeLink(string? href) =>
        IsSafeUrl(href)
        || (href?.StartsWith("#") ?? false)
        || (href?.StartsWith("tel:", StringComparison.OrdinalIgnoreCase) ?? false)
        || (href?.StartsWith("mailto:", StringComparison.OrdinalIgnoreCase) ?? false);

    public static List<string> Validate(SiteContent c)
    {
        var errors = new List<string>();
        void Len(string? v, int max, string name) { if (v is { Length: var l } && l > max) errors.Add($"«{name}» حداکثر {max} حرف است."); }
        void Url(string? v, string name) { if (!IsSafeUrl(v)) errors.Add($"آدرس «{name}» باید با https:// یا / شروع شود."); }

        if (string.IsNullOrWhiteSpace(c.Brand.Name)) errors.Add("نام کسب‌وکار الزامی است.");
        Len(c.Brand.Name, 60, "نام");
        Len(c.Brand.Tagline, 120, "شعار");
        Len(c.Brand.Description, 500, "توضیح کوتاه");
        Url(c.Brand.LogoUrl, "لوگو");
        if (!Hex().IsMatch(c.Theme.Primary)) errors.Add("رنگ اصلی باید به شکل #RRGGBB باشد.");
        if (c.Theme.Mode is not ("dark" or "light")) errors.Add("حالت رنگ نامعتبر است.");
        if (c.Theme.Corners is not ("sharp" or "soft" or "round")) errors.Add("نوع گوشه‌ها نامعتبر است.");

        Len(c.Home.HeroTitle, 120, "تیتر صفحه‌ی اول");
        Len(c.Home.HeroSubtitle, 300, "زیرتیتر");
        Url(c.Home.HeroImageUrl, "تصویر صفحه‌ی اول");
        Url(c.Home.HeroVideoUrl, "ویدیوی صفحه‌ی اول");
        if (c.Home.HeroVideoMode is not ("scroll" or "loop")) errors.Add("حالت پخش ویدیو نامعتبر است.");
        Url(c.Home.AboutImageUrl, "تصویر درباره‌ی ما");
        if (!IsSafeLink(c.Home.HeroCtaUrl)) errors.Add("لینک دکمه‌ی صفحه‌ی اول نامعتبر است.");
        Len(c.Home.AboutText, 3000, "متن درباره‌ی ما");
        if (c.Home.Highlights.Count > 8) errors.Add("حداکثر ۸ ویژگی برای صفحه‌ی اول.");
        if (c.Home.Faq.Count > 20) errors.Add("حداکثر ۲۰ پرسش متداول.");
        if (c.Home.Stats.Count > 6) errors.Add("حداکثر ۶ آمار.");
        if (c.Nav.Any(n => n.Children.Count > 12)) errors.Add("هر منو حداکثر ۱۲ زیرلینک دارد.");
        if (c.Home.Gallery.Count > 7) errors.Add("گالری حداکثر ۷ عکس دارد.");
        if (c.Home.Partners.Count > 20) errors.Add("حداکثر ۲۰ نام در نوار همکاران.");
        if (c.Home.Testimonials.Count > 20) errors.Add("حداکثر ۲۰ نظر.");
        foreach (var g in c.Home.Gallery) Url(g, "عکس گالری");
        foreach (var p in c.Home.Partners) Len(p, 80, "نام همکار");
        foreach (var t in c.Home.Testimonials)
        {
            if (string.IsNullOrWhiteSpace(t.Text)) errors.Add("هر نظر باید متن داشته باشد.");
            Len(t.Name, 60, "نام نظردهنده");
            Len(t.Role, 60, "توضیح نظردهنده");
            Len(t.Text, 500, "متن نظر");
        }
        Len(c.Home.HeroEyebrow, 80, "متن بالای تیتر");
        foreach (var h in c.Home.Highlights) Url(h.ImageUrl, "عکس مرحله");
        if (!IsSafeLink(c.Home.CtaButtonUrl)) errors.Add("لینک دکمه‌ی کادر تماس نامعتبر است.");

        if (c.Nav.Count > 10) errors.Add("منو حداکثر ۱۰ لینک دارد.");
        foreach (var n in c.Nav.Concat(c.Nav.SelectMany(x => x.Children)))
        {
            Url(n.ImageUrl, "تصویر منو");
            if (string.IsNullOrWhiteSpace(n.Label)) errors.Add("هر لینک منو باید عنوان داشته باشد.");
            Len(n.Label, 30, "عنوان لینک منو");
            if (!IsSafeLink(n.Href)) errors.Add($"لینک «{n.Label}» نامعتبر است.");
        }
        if (!IsSafeUrl(c.Contact.MapUrl)) errors.Add("لینک نقشه باید با https:// شروع شود.");

        if (c.Fields.Count > 12) errors.Add("حداکثر ۱۲ فیلد برای هر آیتم.");
        if (c.Fields.Select(f => f.Key).Distinct().Count() != c.Fields.Count) errors.Add("کلید فیلدها نباید تکراری باشد.");
        foreach (var f in c.Fields)
        {
            if (!FieldKey().IsMatch(f.Key)) errors.Add($"کلید فیلد «{f.Label}» فقط حروف کوچک انگلیسی و عدد (مثل year).");
            if (string.IsNullOrWhiteSpace(f.Label)) errors.Add("هر فیلد باید عنوان داشته باشد.");
            if (f.Type is not ("text" or "number" or "select")) errors.Add($"نوع فیلد «{f.Label}» نامعتبر است.");
            if (f.Type == "select" && f.Options.Count == 0) errors.Add($"فیلد انتخابی «{f.Label}» باید گزینه داشته باشد.");
        }
        if (c.Categories.Count > 30) errors.Add("حداکثر ۳۰ دسته.");
        return errors;
    }
}
