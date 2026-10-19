using SiteKit.Domain.Common;
using SiteKit.Domain.Catalog;

namespace SiteKit.UnitTests;

public sealed class ServiceItemTests
{
    [Fact]
    public void Fixed_price_requires_positive_amount()
    {
        var s = new ServiceItem("سرامیک", "دیتیلینگ");
        Assert.True(s.SetPrice(PriceType.Fixed, null, null).IsFailure);
        Assert.True(s.SetPrice(PriceType.Fixed, 0, null).IsFailure);
        Assert.True(s.SetPrice(PriceType.Fixed, 100, null).IsSuccess);
    }

    [Fact]
    public void On_call_price_clears_amounts()
    {
        var s = new ServiceItem("PPF", "دیتیلینگ");
        s.SetPrice(PriceType.Fixed, 100, 200);
        Assert.True(s.SetPrice(PriceType.OnCall, null, null).IsSuccess);
        Assert.Null(s.PriceRial);
        Assert.Null(s.OriginalPriceRial);
    }

    [Fact]
    public void Original_price_must_be_higher_than_current_price()
    {
        var s = new ServiceItem("پولیش", "دیتیلینگ");
        Assert.True(s.SetPrice(PriceType.From, 100, 90).IsFailure);
        Assert.True(s.SetPrice(PriceType.From, 100, 100).IsFailure);
        Assert.True(s.SetPrice(PriceType.From, 100, 150).IsSuccess);
    }
}
