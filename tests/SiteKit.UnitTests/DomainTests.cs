using SiteKit.Application.Listings;
using SiteKit.Application.Site;
using SiteKit.Domain.Common;
using SiteKit.Domain.Listings;

namespace SiteKit.UnitTests;

public class ListingTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 1, 12, 0, 0, TimeSpan.Zero);

    [Theory]
    [InlineData(PriceType.Fixed, null, false)]
    [InlineData(PriceType.Fixed, 0L, false)]
    [InlineData(PriceType.Fixed, 1000L, true)]
    [InlineData(PriceType.OnCall, null, true)]
    public void Price_rules(PriceType type, long? price, bool ok) =>
        Assert.Equal(ok, new Listing("x", "x").SetPrice(type, price, null).IsSuccess);

    [Fact]
    public void On_call_clears_amounts_and_original_must_be_higher()
    {
        var l = new Listing("x", "x");
        Assert.True(l.SetPrice(PriceType.Fixed, 100, 200).IsSuccess);
        Assert.False(l.SetPrice(PriceType.Fixed, 100, 50).IsSuccess);
        Assert.True(l.SetPrice(PriceType.OnCall, 100, null).IsSuccess);
        Assert.Null(l.PriceRial);
    }

    [Fact]
    public void Publishing_sets_published_at_once()
    {
        var l = new Listing("x", "x");
        Assert.Equal(ListingStatus.Draft, l.Status);
        l.SetStatus(ListingStatus.Published, Now);
        l.SetStatus(ListingStatus.Hidden, Now.AddDays(1));
        l.SetStatus(ListingStatus.Published, Now.AddDays(2));
        Assert.Equal(Now, l.PublishedAt);
    }

    [Theory]
    [InlineData("تور استانبول ۴ شب", "تور-استانبول-4-شب")]
    [InlineData("  BMW 528i!! ", "bmw-528i")]
    [InlineData("???", "item")]
    public void Slugify_keeps_persian_and_normalises(string input, string expected) =>
        Assert.Equal(expected, ListingService.Slugify(input));
}

public class SiteRulesTests
{
    [Theory]
    [InlineData("car")]
    [InlineData("travel")]
    [InlineData("shop")]
    [InlineData("services")]
    public void Every_demo_preset_is_valid(string preset) =>
        Assert.Empty(SiteRules.Validate(Presets.Content(preset, demo: true)));

    [Fact]
    public void Blank_preset_needs_a_name_before_it_is_valid()
    {
        var c = Presets.Content("travel", demo: false);
        Assert.Contains(SiteRules.Validate(c), e => e.Contains("نام"));
        c.Brand.Name = "سفر";
        Assert.Empty(SiteRules.Validate(c));
        Assert.Equal("تور", c.Labels.ItemSingular);
    }

    [Theory]
    [InlineData("/items", true)]
    [InlineData("https://instagram.com/x", true)]
    [InlineData("tel:0912", true)]
    [InlineData("javascript:alert(1)", false)]
    [InlineData("//evil.com", false)]
    [InlineData("data:text/html,x", false)]
    public void Links_are_restricted_to_safe_schemes(string href, bool ok) => Assert.Equal(ok, SiteRules.IsSafeLink(href));

    [Fact]
    public void Bad_colour_and_duplicate_field_keys_are_rejected()
    {
        var c = Presets.Content("car", demo: true);
        c.Theme.Primary = "red";
        c.Fields.Add(new FieldDef { Key = "year", Label = "دوباره", Type = "text" });
        var errors = SiteRules.Validate(c);
        Assert.Contains(errors, e => e.Contains("رنگ"));
        Assert.Contains(errors, e => e.Contains("تکراری"));
    }

    [Fact]
    public void Old_or_broken_json_still_reads_with_defaults() =>
        Assert.Equal("dark", SiteJson.Read("{not json").Theme.Mode);
}

public class IranValidatorTests
{
    [Theory]
    [InlineData("09171006003", "09171006003")]
    [InlineData("۰۹۱۷۱۰۰۶۰۰۳", "09171006003")]
    [InlineData("+989171006003", "09171006003")]
    [InlineData("00989171006003", "09171006003")]
    [InlineData("9171006003", "09171006003")]
    [InlineData("0917 100 6003", "09171006003")]
    public void Normalizes_iranian_mobiles(string input, string expected)
    {
        Assert.True(IranValidators.TryNormalizeMobile(input, out var phone));
        Assert.Equal(expected, phone);
    }

    [Theory]
    [InlineData("02112345678")]
    [InlineData("0917123")]
    [InlineData("")]
    [InlineData("abc")]
    public void Rejects_invalid_mobiles(string input) =>
        Assert.False(IranValidators.TryNormalizeMobile(input, out _));

    [Theory]
    [InlineData("0499370899", true)]
    [InlineData("0790419904", true)]
    [InlineData("0499370898", false)]
    [InlineData("1111111111", false)]
    [InlineData("12345", false)]
    public void Validates_national_code(string code, bool valid) =>
        Assert.Equal(valid, IranValidators.IsValidNationalCode(code));
}
