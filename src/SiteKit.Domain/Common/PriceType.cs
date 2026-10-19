namespace SiteKit.Domain.Common;

/// <summary>How a price is shown: exact, «از ...» or «تماس بگیرید».</summary>
public enum PriceType
{
    Fixed = 0,
    From = 1,
    OnCall = 2
}

public static class PriceRules
{
    public static Result Validate(PriceType type, long? price, long? original)
    {
        if (type != PriceType.OnCall && price is null or <= 0)
            return Result.Failure(Error.Validation("price.required", "قیمت باید بیشتر از صفر باشد یا «تماس بگیرید» انتخاب شود."));
        if (original is not null && (type == PriceType.OnCall || original <= price))
            return Result.Failure(Error.Validation("price.original", "قیمت قبل از تخفیف باید از قیمت فعلی بیشتر باشد."));
        return Result.Success();
    }
}
