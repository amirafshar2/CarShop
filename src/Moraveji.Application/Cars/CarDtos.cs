using Moraveji.Domain.Cars;

namespace Moraveji.Application.Cars;

public sealed record CarListItemDto(
    Guid Id,
    string Slug,
    string TitleFa,
    string BrandEn,
    string ModelEn,
    int ModelYear,
    YearCalendar YearCalendar,
    CarCondition Condition,
    ListingType ListingType,
    int MileageKm,
    string Colors,
    long? PriceRial,
    bool PriceOnCall,
    CarTags Tags,
    CarStatus Status,
    string? CoverImageUrl);

public sealed record CarImageDto(string Url, string? Alt, bool IsCover);

public sealed record CarDetailDto(
    Guid Id,
    string Slug,
    string TitleFa,
    string BrandEn,
    string ModelEn,
    string? Trim,
    string? Package,
    int ModelYear,
    YearCalendar YearCalendar,
    int? FaceliftYear,
    CarCondition Condition,
    ListingType ListingType,
    int MileageKm,
    string Colors,
    string? OriginCountry,
    Transmission Transmission,
    FuelType FuelType,
    Drivetrain Drivetrain,
    CarTags Tags,
    string? Description,
    string? BodyCondition,
    long? PriceRial,
    bool PriceOnCall,
    int? TemporaryPassMonths,
    DateOnly? TemporaryPassExpiresOn,
    string? FreeZone,
    HawalehType? HawalehType,
    DateOnly? HawalehDeliveryOn,
    CarStatus Status,
    IReadOnlyList<CarImageDto> Images,
    Guid Version);

public sealed record CarQuery
{
    public string? Search { get; init; }
    public string? Brand { get; init; }
    public ListingType? ListingType { get; init; }
    public CarCondition? Condition { get; init; }
    public Transmission? Transmission { get; init; }
    public int? YearFrom { get; init; }
    public int? YearTo { get; init; }
    public long? PriceFromRial { get; init; }
    public long? PriceToRial { get; init; }
    public CarTags? Tags { get; init; }
    public string Sort { get; init; } = "newest"; // newest | price_asc | price_desc | year_desc | mileage_asc
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 12;
}

public sealed record UpsertCarRequest(
    string TitleFa,
    string BrandEn,
    string ModelEn,
    string? Trim,
    string? Package,
    int ModelYear,
    YearCalendar YearCalendar,
    int? FaceliftYear,
    CarCondition Condition,
    ListingType ListingType,
    int MileageKm,
    string Colors,
    string? OriginCountry,
    Transmission Transmission,
    FuelType FuelType,
    Drivetrain Drivetrain,
    CarTags Tags,
    string? Description,
    string? BodyCondition,
    string? Vin,
    long? PriceRial,
    bool PriceOnCall,
    int? TemporaryPassMonths,
    DateOnly? TemporaryPassExpiresOn,
    string? FreeZone,
    HawalehType? HawalehType,
    DateOnly? HawalehDeliveryOn,
    bool Publish,
    IReadOnlyList<string>? ImageUrls,
    Guid? Version = null);

public sealed record AdminCarQuery
{
    public string? Search { get; init; }
    public CarStatus? Status { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}

public sealed record AdminCarRowDto(
    Guid Id, string Slug, string TitleFa, string BrandEn, string ModelEn, int ModelYear, CarCondition Condition,
    ListingType ListingType, long? PriceRial, bool PriceOnCall, CarStatus Status, string? CoverImageUrl,
    DateTimeOffset CreatedAt, DateTimeOffset? UpdatedAt);

public sealed record AdminCarDetailDto(CarDetailDto Car, string? Vin);

public enum CarStatusAction { Publish, Hide, MarkSold }

public sealed record ChangeCarStatusRequest(CarStatusAction Action);

public sealed record ReservationDto(Guid Id, Guid CarId, DateTimeOffset ReservedAt, DateTimeOffset ExpiresAt, long DepositRial, string Status);
