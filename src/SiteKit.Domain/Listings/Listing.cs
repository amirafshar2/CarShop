using SiteKit.Domain.Common;

namespace SiteKit.Domain.Listings;

public enum ListingStatus
{
    Draft = 0,
    Published = 1,
    Hidden = 2,
    /// <summary>Still visible, marked «فروخته شد» / «تکمیل ظرفیت».</summary>
    SoldOut = 3
}

/// <summary>
/// One entry of the site's catalogue — a car, a tour, a product … depending on the chosen preset.
/// Business-specific fields (year, mileage, duration, destination …) live in <see cref="AttributesJson"/>
/// so a single schema serves every kind of business.
/// </summary>
public sealed class Listing : Entity, IAudited
{
    private Listing() { }

    public Listing(string title, string slug)
    {
        Title = title.Trim();
        Slug = slug;
        Status = ListingStatus.Draft;
    }

    public string Title { get; private set; } = default!;
    public string Slug { get; private set; } = default!;
    public string? Category { get; set; }
    public string? Summary { get; set; }
    public string? Description { get; set; }
    public PriceType PriceType { get; private set; } = PriceType.OnCall;
    public long? PriceRial { get; private set; }
    public long? OriginalPriceRial { get; private set; }
    public string? Unit { get; set; }
    public string? Badge { get; set; }
    /// <summary>One image URL per line; the first is the cover.</summary>
    public string? Images { get; set; }
    /// <summary>JSON object of preset fields, e.g. {"year":"2024","km":"12000"}.</summary>
    public string? AttributesJson { get; set; }
    public ListingStatus Status { get; private set; }
    public bool IsFeatured { get; set; }
    public int SortOrder { get; set; }
    public DateTimeOffset? PublishedAt { get; private set; }

    public void Rename(string title, string slug)
    {
        Title = title.Trim();
        Slug = slug;
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

    public void SetStatus(ListingStatus status, DateTimeOffset now)
    {
        if (status is ListingStatus.Published && PublishedAt is null) PublishedAt = now;
        Status = status;
    }
}
