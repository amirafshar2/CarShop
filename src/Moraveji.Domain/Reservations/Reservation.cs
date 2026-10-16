using Moraveji.Domain.Common;

namespace Moraveji.Domain.Reservations;

public enum ReservationStatus
{
    Active = 1,
    Converted = 2, // became an order
    Expired = 3,
    Cancelled = 4
}

public sealed class Reservation : Entity, IAudited
{
    private Reservation() { }

    internal Reservation(Guid carId, Guid customerId, DateTimeOffset now, DateTimeOffset expiresAt, long depositRial)
    {
        CarId = carId;
        CustomerId = customerId;
        ReservedAt = now;
        ExpiresAt = expiresAt;
        DepositRial = depositRial;
        Status = ReservationStatus.Active;
    }

    public Guid CarId { get; private set; }
    public Guid CustomerId { get; private set; }
    public DateTimeOffset ReservedAt { get; private set; }
    public DateTimeOffset ExpiresAt { get; private set; }
    public long DepositRial { get; private set; }
    public ReservationStatus Status { get; private set; }

    public bool IsExpired(DateTimeOffset now) => Status == ReservationStatus.Active && now >= ExpiresAt;

    public Result Expire(DateTimeOffset now)
    {
        if (!IsExpired(now))
            return Result.Failure(Error.Conflict("reservation.not_expired", "رزرو هنوز منقضی نشده است."));
        Status = ReservationStatus.Expired;
        return Result.Success();
    }

    public Result Cancel()
    {
        if (Status != ReservationStatus.Active)
            return Result.Failure(Error.Conflict("reservation.not_active", "این رزرو فعال نیست."));
        Status = ReservationStatus.Cancelled;
        return Result.Success();
    }

    public Result Convert()
    {
        if (Status != ReservationStatus.Active)
            return Result.Failure(Error.Conflict("reservation.not_active", "این رزرو فعال نیست."));
        Status = ReservationStatus.Converted;
        return Result.Success();
    }
}
