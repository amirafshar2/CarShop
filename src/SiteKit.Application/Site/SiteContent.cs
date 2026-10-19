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
    public string HeroTitle { get; set; } = "";
    public string? HeroSubtitle { get; set; }
    public string? HeroImageUrl { get; set; }
    public string? HeroVideoUrl { get; set; }
    public string? HeroCtaText { get; set; }
    public string? HeroCtaUrl { get; set; }
    public bool ShowHighlights { get; set; } = true;
    public string? HighlightsTitle { get; set; }
    public List<Highlight> Highlights { get; set; } = [];
    public bool ShowFeatured { get; set; } = true;
    public string? FeaturedTitle { get; set; }
    public bool ShowServices { get; set; } = true;
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
}

public sealed class Highlight
{
    public string Title { get; set; } = "";
    public string? Text { get; set; }
    /// <summary>Icon name from a fixed list (shield, clock, star, truck, heart, check, map, phone, gift, sparkles).</summary>
    public string? Icon { get; set; }
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
        Url(c.Home.AboutImageUrl, "تصویر درباره‌ی ما");
        if (!IsSafeLink(c.Home.HeroCtaUrl)) errors.Add("لینک دکمه‌ی صفحه‌ی اول نامعتبر است.");
        Len(c.Home.AboutText, 3000, "متن درباره‌ی ما");
        if (c.Home.Highlights.Count > 8) errors.Add("حداکثر ۸ ویژگی برای صفحه‌ی اول.");
        if (c.Home.Faq.Count > 20) errors.Add("حداکثر ۲۰ پرسش متداول.");
        if (c.Home.Stats.Count > 6) errors.Add("حداکثر ۶ آمار.");

        if (c.Nav.Count > 10) errors.Add("منو حداکثر ۱۰ لینک دارد.");
        foreach (var n in c.Nav)
        {
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
