using Moraveji.Domain.Common;

namespace Moraveji.Domain.Orders;

/// <summary>
/// The car purchase lifecycle. Iranian title transfer is in person, so the last steps are
/// recorded by staff, but the order can never skip a step.
/// </summary>
public enum OrderStatus
{
    Draft = 0,
    Reserved = 1,         // رزرو
    DepositPaid = 2,      // بیعانه پرداخت شد
    Inspected = 3,        // کارشناسی انجام شد
    ContractSigned = 4,   // قرارداد امضا شد
    Settled = 5,          // تسویه
    PlateTransferred = 6, // تعویض پلاک
    Delivered = 7,        // تحویل
    Cancelled = 90,
    Refunded = 91
}

/// <summary>Explicit state machine — illegal transitions are rejected, never silently applied.</summary>
public static class OrderStateMachine
{
    private static readonly Dictionary<OrderStatus, OrderStatus[]> Allowed = new()
    {
        [OrderStatus.Draft] = [OrderStatus.Reserved, OrderStatus.Cancelled],
        [OrderStatus.Reserved] = [OrderStatus.DepositPaid, OrderStatus.Cancelled],
        [OrderStatus.DepositPaid] = [OrderStatus.Inspected, OrderStatus.Refunded],
        [OrderStatus.Inspected] = [OrderStatus.ContractSigned, OrderStatus.Refunded],
        [OrderStatus.ContractSigned] = [OrderStatus.Settled, OrderStatus.Refunded],
        [OrderStatus.Settled] = [OrderStatus.PlateTransferred],
        [OrderStatus.PlateTransferred] = [OrderStatus.Delivered],
        [OrderStatus.Delivered] = [],
        [OrderStatus.Cancelled] = [],
        [OrderStatus.Refunded] = []
    };

    public static bool CanTransition(OrderStatus from, OrderStatus to) =>
        Allowed.TryGetValue(from, out var next) && next.Contains(to);

    public static Result EnsureCanTransition(OrderStatus from, OrderStatus to) =>
        CanTransition(from, to)
            ? Result.Success()
            : Result.Failure(Error.Conflict("order.invalid_transition", $"انتقال سفارش از «{from}» به «{to}» مجاز نیست."));
}
