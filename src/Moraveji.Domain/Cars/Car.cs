using Moraveji.Domain.Common;
using Moraveji.Domain.Reservations;

namespace Moraveji.Domain.Cars;

public sealed class Car : Entity, IAudited
{
    private readonly List<CarImage> _images = [];

    private Car() { } // EF

    public Car(
        string titleFa,
        string brandEn,
        string modelEn,
        int modelYear,
        YearCalendar yearCalendar,
        CarCondition condition,
        ListingType listingType)
    {
        TitleFa = titleFa.Trim();
        BrandEn = brandEn.Trim();
        ModelEn = modelEn.Trim();
        ModelYear = modelYear;
        YearCalendar = yearCalendar;
        Condition = condition;
        ListingType = listingType;
        Slug = BuildSlug(brandEn, modelEn, modelYear, Id);
        Status = CarStatus.Draft;
    }

    public string Slug { get; private set; } = default!;
    public string TitleFa { get; set; } = default!;
    public string BrandEn { get; set; } = default!;
    public string ModelEn { get; set; } = default!;

    /// <summary>تیپ — e.g. "تیپ ۴"، "فول P Line".</summary>
    public string? Trim { get; set; }

    /// <summary>پکیج — e.g. "بلک پکیج".</summary>
    public string? Package { get; set; }

    public int ModelYear { get; set; }
    public YearCalendar YearCalendar { get; set; }

    /// <summary>فیس — facelift year if different from model year.</summary>
    public int? FaceliftYear { get; set; }

    public CarCondition Condition { get; set; }
    public ListingType ListingType { get; set; }
    public int MileageKm { get; set; }

    /// <summary>Comma-separated colours available (e.g. "سفید,مشکی").</summary>
    public string Colors { get; set; } = string.Empty;

    /// <summary>سفارش / تولید — e.g. "ژاپن"، "چین".</summary>
    public string? OriginCountry { get; set; }

    public Transmission Transmission { get; set; }
    public FuelType FuelType { get; set; }
    public Drivetrain Drivetrain { get; set; }
    public CarTags Tags { get; set; }
    public string? Description { get; set; }
    public string? BodyCondition { get; set; } // سالم / رنگ‌شدگی — free text until the body map ships
    public string? Vin { get; set; }

    /// <summary>Price in Rial. Money is always <c>long</c>, never floating point.</summary>
    public long? PriceRial { get; private set; }

    /// <summary>«قیمت تماس» — price shown only by phone.</summary>
    public bool PriceOnCall { get; private set; }

    // گذر موقت
    public int? TemporaryPassMonths { get; set; }
    public DateOnly? TemporaryPassExpiresOn { get; set; }
    public string? FreeZone { get; set; }

    // حواله
    public HawalehType? HawalehType { get; set; }
    public DateOnly? HawalehDeliveryOn { get; set; }

    public CarStatus Status { get; private set; }
    public DateTimeOffset? PublishedAt { get; private set; }

    public IReadOnlyCollection<CarImage> Images => _images;

    public Result SetPrice(long? priceRial, bool priceOnCall)
    {
        if (!priceOnCall && priceRial is null or <= 0)
            return Result.Failure(Error.Validation("car.price_required", "قیمت باید بیشتر از صفر باشد یا «قیمت تماس» انتخاب شود."));

        PriceRial = priceOnCall ? null : priceRial;
        PriceOnCall = priceOnCall;
        return Result.Success();
    }

    public Result Publish(DateTimeOffset now)
    {
        if (Status is CarStatus.Sold)
            return Result.Failure(Error.Conflict("car.sold", "خودروی فروخته‌شده قابل انتشار نیست."));
        if (Status is CarStatus.Reserved)
            return Result.Success(); // already public; never put a reserved car back on sale by editing it
        if (!PriceOnCall && PriceRial is null)
            return Result.Failure(Error.Validation("car.price_required", "قبل از انتشار، قیمت را مشخص کنید."));

        Status = CarStatus.Available;
        PublishedAt ??= now;
        return Result.Success();
    }

    public void Hide()
    {
        if (Status is CarStatus.Available or CarStatus.Draft)
            Status = CarStatus.Hidden;
    }

    /// <summary>
    /// Reserves the car for a customer. Domain rule lives here, not in a service:
    /// a car can only be reserved while it is <see cref="CarStatus.Available"/>.
    /// The database additionally enforces "one active reservation per car" with a unique filtered index.
    /// </summary>
    public Result<Reservation> Reserve(Guid customerId, DateTimeOffset now, TimeSpan holdFor, long depositRial)
    {
        if (Status != CarStatus.Available)
            return Error.Conflict("car.not_available", "این خودرو در حال حاضر قابل رزرو نیست.");
        if (holdFor <= TimeSpan.Zero)
            return Error.Validation("reservation.invalid_duration", "مدت رزرو نامعتبر است.");
        if (depositRial < 0)
            return Error.Validation("reservation.invalid_deposit", "مبلغ بیعانه نامعتبر است.");

        Status = CarStatus.Reserved;
        return new Reservation(Id, customerId, now, now.Add(holdFor), depositRial);
    }

    /// <summary>Puts a reserved car back on sale (reservation expired or cancelled).</summary>
    public void ReleaseReservation()
    {
        if (Status == CarStatus.Reserved)
            Status = CarStatus.Available;
    }

    public Result MarkSold()
    {
        if (Status is not (CarStatus.Reserved or CarStatus.Available))
            return Result.Failure(Error.Conflict("car.cannot_sell", "وضعیت خودرو اجازه‌ی فروش نمی‌دهد."));
        Status = CarStatus.Sold;
        return Result.Success();
    }

    /// <summary>Replaces the gallery; the first url becomes the cover.</summary>
    public void ReplaceImages(IReadOnlyList<string> urls, string? alt)
    {
        _images.Clear();
        for (var i = 0; i < urls.Count; i++) AddImage(urls[i], alt, i == 0);
    }

    public void AddImage(string url, string? alt, bool isCover)
    {
        if (isCover)
            foreach (var image in _images) image.IsCover = false;
        _images.Add(new CarImage(Id, url, alt, isCover || _images.Count == 0, _images.Count));
    }

    private static string BuildSlug(string brand, string model, int year, Guid id)
    {
        static string Clean(string s) =>
            new string(s.Trim().ToLowerInvariant()
                .Select(c => char.IsAsciiLetterOrDigit(c) ? c : '-').ToArray())
            .Replace("--", "-").Trim('-');

        return $"{Clean(brand)}-{Clean(model)}-{year}-{id.ToString("N")[..6]}";
    }
}

public sealed class CarImage
{
    private CarImage() { }

    public CarImage(Guid carId, string url, string? alt, bool isCover, int sortOrder)
    {
        CarId = carId;
        Url = url;
        Alt = alt;
        IsCover = isCover;
        SortOrder = sortOrder;
    }

    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid CarId { get; private set; }
    public string Url { get; private set; } = default!;
    public string? Alt { get; private set; }
    public bool IsCover { get; set; }
    public int SortOrder { get; private set; }
}
