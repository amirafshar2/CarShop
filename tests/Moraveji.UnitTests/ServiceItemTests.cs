using Moraveji.Domain.Catalog;

namespace Moraveji.UnitTests;

public sealed class ServiceItemTests
{
    [Fact]
    public void Fixed_price_requires_positive_amount()
    {
        var s = new ServiceItem("سرامیک", ServiceCategory.Detailing);
        Assert.True(s.SetPrice(ServicePriceType.Fixed, null, null).IsFailure);
        Assert.True(s.SetPrice(ServicePriceType.Fixed, 0, null).IsFailure);
        Assert.True(s.SetPrice(ServicePriceType.Fixed, 100, null).IsSuccess);
    }

    [Fact]
    public void On_call_price_clears_amounts()
    {
        var s = new ServiceItem("PPF", ServiceCategory.Detailing);
        s.SetPrice(ServicePriceType.Fixed, 100, 200);
        Assert.True(s.SetPrice(ServicePriceType.OnCall, null, null).IsSuccess);
        Assert.Null(s.PriceRial);
        Assert.Null(s.OriginalPriceRial);
    }

    [Fact]
    public void Original_price_must_be_higher_than_current_price()
    {
        var s = new ServiceItem("پولیش", ServiceCategory.Detailing);
        Assert.True(s.SetPrice(ServicePriceType.From, 100, 90).IsFailure);
        Assert.True(s.SetPrice(ServicePriceType.From, 100, 100).IsFailure);
        Assert.True(s.SetPrice(ServicePriceType.From, 100, 150).IsSuccess);
    }
}
