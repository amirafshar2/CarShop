using Moraveji.Domain.Cars;
using Moraveji.Domain.Common;
using Moraveji.Domain.Orders;
using Moraveji.Domain.Reservations;

namespace Moraveji.UnitTests;

public class CarTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 16, 10, 0, 0, TimeSpan.Zero);

    private static Car PublishedCar()
    {
        var car = new Car("تویوتا کمری", "Toyota", "Camry", 2025, YearCalendar.Gregorian, CarCondition.New, ListingType.Regular);
        car.SetPrice(85_000_000_000, false);
        car.Publish(Now);
        return car;
    }

    [Fact]
    public void Reserve_available_car_succeeds_and_marks_car_reserved()
    {
        // Arrange
        var car = PublishedCar();
        var customer = Guid.NewGuid();

        // Act
        var result = car.Reserve(customer, Now, TimeSpan.FromHours(48), 500_000_000);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal(CarStatus.Reserved, car.Status);
        Assert.Equal(ReservationStatus.Active, result.Value.Status);
        Assert.Equal(Now.AddHours(48), result.Value.ExpiresAt);
    }

    [Fact]
    public void Reserve_already_reserved_car_fails_with_conflict()
    {
        var car = PublishedCar();
        car.Reserve(Guid.NewGuid(), Now, TimeSpan.FromHours(48), 0);

        var second = car.Reserve(Guid.NewGuid(), Now, TimeSpan.FromHours(48), 0);

        Assert.True(second.IsFailure);
        Assert.Equal(ErrorType.Conflict, second.Error!.Type);
    }

    [Fact]
    public void Draft_car_cannot_be_reserved()
    {
        var car = new Car("x", "Toyota", "Camry", 2025, YearCalendar.Gregorian, CarCondition.New, ListingType.Regular);
        Assert.True(car.Reserve(Guid.NewGuid(), Now, TimeSpan.FromHours(1), 0).IsFailure);
    }

    [Fact]
    public void Releasing_reservation_puts_car_back_on_sale()
    {
        var car = PublishedCar();
        car.Reserve(Guid.NewGuid(), Now, TimeSpan.FromHours(48), 0);

        car.ReleaseReservation();

        Assert.Equal(CarStatus.Available, car.Status);
    }

    [Fact]
    public void Sold_car_cannot_be_published_or_reserved()
    {
        var car = PublishedCar();
        car.MarkSold();

        Assert.True(car.Publish(Now).IsFailure);
        Assert.True(car.Reserve(Guid.NewGuid(), Now, TimeSpan.FromHours(1), 0).IsFailure);
    }

    [Theory]
    [InlineData(null, false)]
    [InlineData(0L, false)]
    [InlineData(-5L, false)]
    public void Price_is_required_unless_price_on_call(long? price, bool onCall)
    {
        var car = PublishedCar();
        Assert.True(car.SetPrice(price, onCall).IsFailure);
    }

    [Fact]
    public void Price_on_call_clears_numeric_price()
    {
        var car = PublishedCar();
        Assert.True(car.SetPrice(1, true).IsSuccess);
        Assert.Null(car.PriceRial);
        Assert.True(car.PriceOnCall);
    }

    [Fact]
    public void Reservation_expires_only_after_hold_time()
    {
        var car = PublishedCar();
        var reservation = car.Reserve(Guid.NewGuid(), Now, TimeSpan.FromHours(48), 0).Value;

        Assert.True(reservation.Expire(Now.AddHours(47)).IsFailure);
        Assert.True(reservation.Expire(Now.AddHours(48)).IsSuccess);
        Assert.Equal(ReservationStatus.Expired, reservation.Status);
    }

    [Fact]
    public void Slug_is_ascii_and_unique_per_car()
    {
        var a = new Car("کرولا", "Toyota", "Corolla Cross", 2025, YearCalendar.Gregorian, CarCondition.New, ListingType.Regular);
        var b = new Car("کرولا", "Toyota", "Corolla Cross", 2025, YearCalendar.Gregorian, CarCondition.New, ListingType.Regular);

        Assert.StartsWith("toyota-corolla-cross-2025-", a.Slug);
        Assert.NotEqual(a.Slug, b.Slug);
        Assert.All(a.Slug, c => Assert.True(char.IsAsciiLetterOrDigit(c) || c == '-'));
    }
}

public class OrderStateMachineTests
{
    [Theory]
    [InlineData(OrderStatus.Reserved, OrderStatus.DepositPaid)]
    [InlineData(OrderStatus.DepositPaid, OrderStatus.Inspected)]
    [InlineData(OrderStatus.ContractSigned, OrderStatus.Settled)]
    [InlineData(OrderStatus.PlateTransferred, OrderStatus.Delivered)]
    public void Allows_next_step(OrderStatus from, OrderStatus to) =>
        Assert.True(OrderStateMachine.CanTransition(from, to));

    [Theory]
    [InlineData(OrderStatus.Reserved, OrderStatus.Delivered)]       // cannot skip payment
    [InlineData(OrderStatus.DepositPaid, OrderStatus.Settled)]      // cannot skip inspection/contract
    [InlineData(OrderStatus.Delivered, OrderStatus.Refunded)]       // final
    [InlineData(OrderStatus.Settled, OrderStatus.Cancelled)]        // money already settled
    public void Rejects_skipping_or_reversing(OrderStatus from, OrderStatus to)
    {
        var result = OrderStateMachine.EnsureCanTransition(from, to);
        Assert.True(result.IsFailure);
        Assert.Equal(ErrorType.Conflict, result.Error!.Type);
    }
}

public class IranValidatorTests
{
    [Theory]
    [InlineData("09171006003", "09171006003")]
    [InlineData("۰۹۱۷۱۰۰۶۰۰۳", "09171006003")]
    [InlineData("+989171006003", "09171006003")]
    [InlineData("00989171006003", "09171006003")]
    [InlineData("9171006003", "09171006003")]
    [InlineData("0917 100 6003", "09171006003")]
    public void Normalizes_iranian_mobiles(string input, string expected)
    {
        Assert.True(IranValidators.TryNormalizeMobile(input, out var phone));
        Assert.Equal(expected, phone);
    }

    [Theory]
    [InlineData("02112345678")]
    [InlineData("0917123")]
    [InlineData("")]
    [InlineData("abc")]
    public void Rejects_invalid_mobiles(string input) =>
        Assert.False(IranValidators.TryNormalizeMobile(input, out _));

    [Theory]
    [InlineData("0499370899", true)]
    [InlineData("0790419904", true)]
    [InlineData("0499370898", false)]
    [InlineData("1111111111", false)]
    [InlineData("12345", false)]
    public void Validates_national_code(string code, bool valid) =>
        Assert.Equal(valid, IranValidators.IsValidNationalCode(code));
}
