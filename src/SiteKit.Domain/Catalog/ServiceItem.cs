using SiteKit.Domain.Common;

namespace SiteKit.Domain.Catalog;

/// <summary>A service with a public price-list entry, managed from the admin panel.</summary>
public sealed class ServiceItem : Entity, IAudited
{
    private ServiceItem() { }

    public ServiceItem(string title, string? category)
    {
        Title = title.Trim();
        Category = string.IsNullOrWhiteSpace(category) ? null : category.Trim();
        IsActive = true;
    }

    public string Title { get; private set; } = default!;
    /// <summary>Free text group, e.g. «تورهای داخلی» or «دیتیلینگ».</summary>
    public string? Category { get; private set; }
    public string? Description { get; set; }
    /// <summary>One feature per line.</summary>
    public string? Features { get; set; }
    public PriceType PriceType { get; private set; }
    public long? PriceRial { get; private set; }
    public long? OriginalPriceRial { get; private set; }
    public string? Unit { get; set; }
    public string? Badge { get; set; }
    public string? ImageUrl { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public bool IsFeatured { get; set; }

    public void Rename(string title, string? category)
    {
        Title = title.Trim();
        Category = string.IsNullOrWhiteSpace(category) ? null : category.Trim();
    }

    public Result SetPrice(PriceType type, long? priceRial, long? originalPriceRial)
    {
        var valid = PriceRules.Validate(type, priceRial, originalPriceRial);
        if (valid.IsFailure) return valid;
        PriceType = type;
        PriceRial = type == PriceType.OnCall ? null : priceRial;
        OriginalPriceRial = type == PriceType.OnCall ? null : originalPriceRial;
        return Result.Success();
    }
}
