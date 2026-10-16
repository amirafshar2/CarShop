using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Options;
using Moraveji.Application.Abstractions;
using Moraveji.Application.Common;
using Moraveji.Domain.Cars;
using Moraveji.Domain.Common;
using Moraveji.Domain.Reservations;

namespace Moraveji.Application.Cars;

public sealed class ReservationOptions
{
    public const string Section = "Reservation";
    public int HoldHours { get; set; } = 48;
    public long DepositRial { get; set; } = 500_000_000; // ۵۰ میلیون تومان — از پنل ادمین قابل تغییر خواهد بود
}

public interface ICarService
{
    Task<PagedResult<CarListItemDto>> ListAsync(CarQuery query, CancellationToken ct);
    Task<Result<CarDetailDto>> GetBySlugAsync(string slug, CancellationToken ct);
    Task<Result<Guid>> CreateAsync(UpsertCarRequest request, CancellationToken ct);
    Task<Result> UpdateAsync(Guid id, UpsertCarRequest request, CancellationToken ct);
    Task<Result<ReservationDto>> ReserveAsync(Guid carId, Guid customerId, CancellationToken ct);
    Task<int> ExpireReservationsAsync(CancellationToken ct);
    Task<PagedResult<AdminCarRowDto>> AdminListAsync(AdminCarQuery query, CancellationToken ct);
    Task<Result<AdminCarDetailDto>> GetForEditAsync(Guid id, CancellationToken ct);
    Task<Result> ChangeStatusAsync(Guid id, CarStatusAction action, CancellationToken ct);
    Task<Result> DeleteAsync(Guid id, CancellationToken ct);
}

public sealed class CarService(
    IAppDbContext db,
    HybridCache cache,
    TimeProvider clock,
    IPersistenceConflictDetector conflicts,
    IOptions<ReservationOptions> reservationOptions) : ICarService
{
    private static readonly CarStatus[] PublicStatuses = [CarStatus.Available, CarStatus.Reserved];

    public async Task<PagedResult<CarListItemDto>> ListAsync(CarQuery query, CancellationToken ct)
    {
        var key = $"cars:list:{System.Text.Json.JsonSerializer.Serialize(query)}";
        return await cache.GetOrCreateAsync(
            key,
            async token => await QueryListAsync(query, token),
            new HybridCacheEntryOptions { Expiration = TimeSpan.FromMinutes(5), LocalCacheExpiration = TimeSpan.FromMinutes(1) },
            tags: [CacheTags.Cars],
            cancellationToken: ct);
    }

    private async Task<PagedResult<CarListItemDto>> QueryListAsync(CarQuery q, CancellationToken ct)
    {
        var cars = db.Cars.AsNoTracking().Where(c => PublicStatuses.Contains(c.Status));

        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var term = IranValidators.NormalizeDigits(q.Search.Trim());
            cars = cars.Where(c => c.TitleFa.Contains(term) || c.BrandEn.Contains(term) || c.ModelEn.Contains(term));
        }
        if (!string.IsNullOrWhiteSpace(q.Brand)) cars = cars.Where(c => c.BrandEn == q.Brand);
        if (q.ListingType is { } lt) cars = cars.Where(c => c.ListingType == lt);
        if (q.Condition is { } cond) cars = cars.Where(c => c.Condition == cond);
        if (q.Transmission is { } tr) cars = cars.Where(c => c.Transmission == tr);
        if (q.YearFrom is { } yf) cars = cars.Where(c => c.ModelYear >= yf);
        if (q.YearTo is { } yt) cars = cars.Where(c => c.ModelYear <= yt);
        if (q.PriceFromRial is { } pf) cars = cars.Where(c => c.PriceRial >= pf);
        if (q.PriceToRial is { } pt) cars = cars.Where(c => c.PriceRial <= pt);
        if (q.Tags is { } tags && tags != CarTags.None) cars = cars.Where(c => (c.Tags & tags) == tags);

        cars = q.Sort switch
        {
            "price_asc" => cars.OrderBy(c => c.PriceOnCall).ThenBy(c => c.PriceRial),
            "price_desc" => cars.OrderBy(c => c.PriceOnCall).ThenByDescending(c => c.PriceRial),
            "year_desc" => cars.OrderByDescending(c => c.ModelYear),
            "mileage_asc" => cars.OrderBy(c => c.MileageKm),
            _ => cars.OrderByDescending(c => c.PublishedAt)
        };

        var total = await cars.CountAsync(ct);
        var items = await cars
            .Skip((q.Page - 1) * q.PageSize)
            .Take(q.PageSize)
            .Select(c => new CarListItemDto(
                c.Id, c.Slug, c.TitleFa, c.BrandEn, c.ModelEn, c.ModelYear, c.YearCalendar, c.Condition,
                c.ListingType, c.MileageKm, c.Colors, c.PriceRial, c.PriceOnCall, c.Tags, c.Status,
                c.Images.Where(i => i.IsCover).Select(i => i.Url).FirstOrDefault()))
            .ToListAsync(ct);

        return new PagedResult<CarListItemDto>(items, q.Page, q.PageSize, total);
    }

    public async Task<Result<CarDetailDto>> GetBySlugAsync(string slug, CancellationToken ct)
    {
        var dto = await db.Cars.AsNoTracking()
            .Where(c => c.Slug == slug && PublicStatuses.Contains(c.Status))
            .Select(c => new CarDetailDto(
                c.Id, c.Slug, c.TitleFa, c.BrandEn, c.ModelEn, c.Trim, c.Package, c.ModelYear, c.YearCalendar,
                c.FaceliftYear, c.Condition, c.ListingType, c.MileageKm, c.Colors, c.OriginCountry,
                c.Transmission, c.FuelType, c.Drivetrain, c.Tags, c.Description, c.BodyCondition,
                c.PriceRial, c.PriceOnCall, c.TemporaryPassMonths, c.TemporaryPassExpiresOn, c.FreeZone,
                c.HawalehType, c.HawalehDeliveryOn, c.Status,
                c.Images.OrderBy(i => i.SortOrder).Select(i => new CarImageDto(i.Url, i.Alt, i.IsCover)).ToList(),
                c.Version))
            .FirstOrDefaultAsync(ct);

        return dto is null ? Error.NotFound("car.not_found", "خودرو پیدا نشد.") : dto;
    }

    public async Task<Result<Guid>> CreateAsync(UpsertCarRequest r, CancellationToken ct)
    {
        var car = new Car(r.TitleFa, r.BrandEn, r.ModelEn, r.ModelYear, r.YearCalendar, r.Condition, r.ListingType);
        var applied = Apply(car, r);
        if (applied.IsFailure) return applied.Error!;

        foreach (var (url, i) in (r.ImageUrls ?? []).Select((u, i) => (u, i)))
            car.AddImage(url, r.TitleFa, i == 0);

        db.Cars.Add(car);
        await db.SaveChangesAsync(ct);
        await cache.RemoveByTagAsync(CacheTags.Cars, ct);
        return car.Id;
    }

    public async Task<Result> UpdateAsync(Guid id, UpsertCarRequest r, CancellationToken ct)
    {
        var car = await db.Cars.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (car is null) return Result.Failure(Error.NotFound("car.not_found", "خودرو پیدا نشد."));

        // Optimistic concurrency for editors: the form sends back the Version it loaded.
        if (r.Version is { } expected)
        {
            if (expected != car.Version)
                return Result.Failure(Error.Conflict("car.stale", "این خودرو بعد از باز کردن فرم توسط شخص دیگری تغییر کرده است. صفحه را تازه کنید."));
            db.SetOriginalVersion(car, expected);
        }

        car.TitleFa = r.TitleFa;
        car.BrandEn = r.BrandEn;
        car.ModelEn = r.ModelEn;
        car.ModelYear = r.ModelYear;
        car.YearCalendar = r.YearCalendar;
        car.Condition = r.Condition;
        car.ListingType = r.ListingType;

        var applied = Apply(car, r);
        if (applied.IsFailure) return applied;
        if (r.ImageUrls is { } urls) car.ReplaceImages(urls, r.TitleFa);

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (Exception ex) when (conflicts.IsConflict(ex))
        {
            return Result.Failure(Error.Conflict("car.concurrent_update", "این خودرو همزمان توسط کاربر دیگری تغییر کرد. صفحه را تازه کنید."));
        }

        await cache.RemoveByTagAsync(CacheTags.Cars, ct);
        return Result.Success();
    }

    private Result Apply(Car car, UpsertCarRequest r)
    {
        car.Trim = r.Trim;
        car.Package = r.Package;
        car.FaceliftYear = r.FaceliftYear;
        car.MileageKm = r.MileageKm;
        car.Colors = r.Colors;
        car.OriginCountry = r.OriginCountry;
        car.Transmission = r.Transmission;
        car.FuelType = r.FuelType;
        car.Drivetrain = r.Drivetrain;
        car.Tags = r.Tags;
        car.Description = r.Description;
        car.BodyCondition = r.BodyCondition;
        car.Vin = r.Vin;
        car.TemporaryPassMonths = r.TemporaryPassMonths;
        car.TemporaryPassExpiresOn = r.TemporaryPassExpiresOn;
        car.FreeZone = r.FreeZone;
        car.HawalehType = r.HawalehType;
        car.HawalehDeliveryOn = r.HawalehDeliveryOn;

        var price = car.SetPrice(r.PriceRial, r.PriceOnCall);
        if (price.IsFailure) return price;

        return r.Publish ? car.Publish(clock.GetUtcNow()) : Result.Success();
    }

    /// <summary>
    /// Safe reservation. Two layers protect against selling one car twice:
    /// 1) the Car row's concurrency token (Version) — concurrent updates of the same car fail;
    /// 2) a unique filtered index on Reservations(CarId) WHERE Status = Active.
    /// Either conflict is reported as HTTP 409, never as a second successful reservation.
    /// </summary>
    public async Task<Result<ReservationDto>> ReserveAsync(Guid carId, Guid customerId, CancellationToken ct)
    {
        var car = await db.Cars.FirstOrDefaultAsync(c => c.Id == carId, ct);
        if (car is null) return Error.NotFound("car.not_found", "خودرو پیدا نشد.");

        var activeReservation = Error.Conflict("reservation.customer_has_active", "شما یک رزرو فعال دارید. هر مشتری هم‌زمان فقط یک خودرو را می‌تواند رزرو کند.");
        if (await db.Reservations.AnyAsync(r => r.CustomerId == customerId && r.Status == ReservationStatus.Active, ct))
            return activeReservation;

        var options = reservationOptions.Value;
        var reserved = car.Reserve(customerId, clock.GetUtcNow(), TimeSpan.FromHours(options.HoldHours), options.DepositRial);
        if (reserved.IsFailure) return reserved.Error!;

        var reservation = reserved.Value;
        db.Reservations.Add(reservation);

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (Exception ex) when (conflicts.IsConflict(ex))
        {
            db.ClearChanges();
            return await db.Reservations.AnyAsync(r => r.CustomerId == customerId && r.Status == ReservationStatus.Active, ct)
                ? activeReservation
                : Error.Conflict("car.just_reserved", "این خودرو همین الان توسط مشتری دیگری رزرو شد.");
        }

        await cache.RemoveByTagAsync(CacheTags.Cars, ct);
        return new ReservationDto(reservation.Id, reservation.CarId, reservation.ReservedAt, reservation.ExpiresAt,
            reservation.DepositRial, reservation.Status.ToString());
    }

    public async Task<PagedResult<AdminCarRowDto>> AdminListAsync(AdminCarQuery q, CancellationToken ct)
    {
        var page = Math.Max(1, q.Page);
        var size = Math.Clamp(q.PageSize, 1, 100);
        var cars = db.Cars.AsNoTracking();
        if (q.Status is { } st) cars = cars.Where(c => c.Status == st);
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var term = IranValidators.NormalizeDigits(q.Search.Trim());
            cars = cars.Where(c => c.TitleFa.Contains(term) || c.BrandEn.Contains(term) || c.ModelEn.Contains(term));
        }
        var total = await cars.CountAsync(ct);
        var items = await cars.OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * size).Take(size)
            .Select(c => new AdminCarRowDto(c.Id, c.Slug, c.TitleFa, c.BrandEn, c.ModelEn, c.ModelYear, c.Condition,
                c.ListingType, c.PriceRial, c.PriceOnCall, c.Status,
                c.Images.Where(i => i.IsCover).Select(i => i.Url).FirstOrDefault(), c.CreatedAt, c.UpdatedAt))
            .ToListAsync(ct);
        return new PagedResult<AdminCarRowDto>(items, page, size, total);
    }

    public async Task<Result<AdminCarDetailDto>> GetForEditAsync(Guid id, CancellationToken ct)
    {
        var dto = await db.Cars.AsNoTracking()
            .Where(c => c.Id == id)
            .Select(c => new AdminCarDetailDto(new CarDetailDto(
                c.Id, c.Slug, c.TitleFa, c.BrandEn, c.ModelEn, c.Trim, c.Package, c.ModelYear, c.YearCalendar,
                c.FaceliftYear, c.Condition, c.ListingType, c.MileageKm, c.Colors, c.OriginCountry,
                c.Transmission, c.FuelType, c.Drivetrain, c.Tags, c.Description, c.BodyCondition,
                c.PriceRial, c.PriceOnCall, c.TemporaryPassMonths, c.TemporaryPassExpiresOn, c.FreeZone,
                c.HawalehType, c.HawalehDeliveryOn, c.Status,
                c.Images.OrderBy(i => i.SortOrder).Select(i => new CarImageDto(i.Url, i.Alt, i.IsCover)).ToList(),
                c.Version), c.Vin))
            .FirstOrDefaultAsync(ct);
        return dto is null ? Error.NotFound("car.not_found", "خودرو پیدا نشد.") : dto;
    }

    public async Task<Result> ChangeStatusAsync(Guid id, CarStatusAction action, CancellationToken ct)
    {
        var car = await db.Cars.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (car is null) return Result.Failure(Error.NotFound("car.not_found", "خودرو پیدا نشد."));

        Result result;
        switch (action)
        {
            case CarStatusAction.Publish:
                result = car.Publish(clock.GetUtcNow());
                break;
            case CarStatusAction.Hide:
                if (car.Status is CarStatus.Reserved or CarStatus.Sold)
                    return Result.Failure(Error.Conflict("car.cannot_hide", "خودروی رزروشده یا فروخته‌شده را نمی‌توان پنهان کرد."));
                car.Hide();
                result = Result.Success();
                break;
            case CarStatusAction.MarkSold:
                result = car.MarkSold();
                if (result.IsSuccess)
                {
                    var active = await db.Reservations.Where(r => r.CarId == id && r.Status == ReservationStatus.Active).ToListAsync(ct);
                    foreach (var r in active) r.Convert();
                }
                break;
            default:
                return Result.Failure(Error.Validation("car.invalid_action", "عملیات نامعتبر است."));
        }
        if (result.IsFailure) return result;

        try { await db.SaveChangesAsync(ct); }
        catch (Exception ex) when (conflicts.IsConflict(ex))
        {
            return Result.Failure(Error.Conflict("car.concurrent_update", "این خودرو همزمان تغییر کرد. صفحه را تازه کنید."));
        }
        await cache.RemoveByTagAsync(CacheTags.Cars, ct);
        return Result.Success();
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken ct)
    {
        var car = await db.Cars.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (car is null) return Result.Failure(Error.NotFound("car.not_found", "خودرو پیدا نشد."));
        if (car.Status == CarStatus.Reserved)
            return Result.Failure(Error.Conflict("car.reserved", "این خودرو رزرو فعال دارد و حذف نمی‌شود."));
        car.IsDeleted = true;
        await db.SaveChangesAsync(ct);
        await cache.RemoveByTagAsync(CacheTags.Cars, ct);
        return Result.Success();
    }

    public async Task<int> ExpireReservationsAsync(CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var expired = await db.Reservations
            .Where(r => r.Status == ReservationStatus.Active && r.ExpiresAt <= now)
            .OrderBy(r => r.ExpiresAt)
            .Take(200)
            .ToListAsync(ct);
        if (expired.Count == 0) return 0;

        var carIds = expired.Select(r => r.CarId).ToList();
        var cars = await db.Cars.Where(c => carIds.Contains(c.Id)).ToListAsync(ct);

        foreach (var reservation in expired)
        {
            reservation.Expire(now);
            cars.FirstOrDefault(c => c.Id == reservation.CarId)?.ReleaseReservation();
        }

        await db.SaveChangesAsync(ct);
        await cache.RemoveByTagAsync(CacheTags.Cars, ct);
        return expired.Count;
    }
}
