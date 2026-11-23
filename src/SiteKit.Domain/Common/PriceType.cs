namespace SiteKit.Domain.Common;

/// <summary>How a price is shown: exact, "ab ..." or "auf Anfrage".</summary>
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
            return Result.Failure(Error.Validation("price.required", "Der Preis muss größer als null sein oder „Auf Anfrage“ gewählt werden."));
        if (original is not null && (type == PriceType.OnCall || original <= price))
            return Result.Failure(Error.Validation("price.original", "Der Preis vor dem Rabatt muss höher sein als der aktuelle Preis."));
        return Result.Success();
    }
}
