using Moraveji.Domain.Common;

namespace Moraveji.Domain.Catalog;

public enum ServiceCategory
{
    Detailing = 0,   // دیتیلینگ (سرامیک، پولیش، صفرشویی، ...)
    Purchase = 1,    // خرید و فروش (خرید از راه دور، فروش بدون کمیسیون، ...)
    Paperwork = 2,   // کارشناسی، تعویض پلاک، اسناد
    Other = 3
}

public enum ServicePriceType
{
    Fixed = 0,   // قیمت مشخص
    From = 1,    // «از ... تومان»
    OnCall = 2   // «تماس بگیرید»
}

/// <summary>A sellable service with a public price list entry, managed from the admin panel.</summary>
public sealed class ServiceItem : Entity, IAudited
{
    private ServiceItem() { }

    public ServiceItem(string title, ServiceCategory category)
    {
        Title = title.Trim();
        Category = category;
        IsActive = true;
    }

    public string Title { get; private set; } = default!;
    public ServiceCategory Category { get; private set; }
    public string? Description { get; set; }
    /// <summary>One feature per line.</summary>
    public string? Features { get; set; }
    public ServicePriceType PriceType { get; private set; }
    public long? PriceRial { get; private set; }
    public long? OriginalPriceRial { get; private set; }
    /// <summary>e.g. «هر خودرو»، «سدان»، «۳ ساعت».</summary>
    public string? Unit { get; set; }
    public string? Badge { get; set; }
    public string? ImageUrl { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public bool IsFeatured { get; set; }

    public void Rename(string title, ServiceCategory category)
    {
        Title = title.Trim();
        Category = category;
    }

    public Result SetPrice(ServicePriceType type, long? priceRial, long? originalPriceRial)
    {
        if (type != ServicePriceType.OnCall && priceRial is null or <= 0)
            return Result.Failure(Error.Validation("service.price_required", "قیمت باید بیشتر از صفر باشد یا «تماس بگیرید» انتخاب شود."));
        if (originalPriceRial is not null && (type == ServicePriceType.OnCall || originalPriceRial <= priceRial))
            return Result.Failure(Error.Validation("service.original_price", "قیمت قبل از تخفیف باید از قیمت فعلی بیشتر باشد."));

        PriceType = type;
        PriceRial = type == ServicePriceType.OnCall ? null : priceRial;
        OriginalPriceRial = type == ServicePriceType.OnCall ? null : originalPriceRial;
        return Result.Success();
    }
}
