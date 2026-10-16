using FluentValidation;
using Moraveji.Domain.Cars;

namespace Moraveji.Application.Cars;

public sealed class UpsertCarRequestValidator : AbstractValidator<UpsertCarRequest>
{
    public UpsertCarRequestValidator()
    {
        RuleFor(x => x.TitleFa).NotEmpty().WithMessage("عنوان خودرو الزامی است.").MaximumLength(150);
        RuleFor(x => x.BrandEn).NotEmpty().Matches("^[A-Za-z0-9 .-]+$").WithMessage("نام برند را به انگلیسی وارد کنید.").MaximumLength(60);
        RuleFor(x => x.ModelEn).NotEmpty().Matches("^[A-Za-z0-9 .-]+$").WithMessage("نام مدل را به انگلیسی وارد کنید.").MaximumLength(60);
        RuleFor(x => x.ModelYear)
            .Must((req, year) => req.YearCalendar == YearCalendar.Gregorian
                ? year is >= 1970 and <= 2035
                : year is >= 1350 and <= 1415)
            .WithMessage("سال ساخت نامعتبر است.");
        RuleFor(x => x.MileageKm).InclusiveBetween(0, 2_000_000).WithMessage("کارکرد نامعتبر است.");
        RuleFor(x => x.Colors).MaximumLength(200);
        RuleFor(x => x.PriceRial)
            .NotNull().GreaterThan(0).When(x => !x.PriceOnCall)
            .WithMessage("قیمت را وارد کنید یا «قیمت تماس» را انتخاب کنید.");
        RuleFor(x => x.Vin)
            .Matches("^[A-HJ-NPR-Z0-9]{17}$").When(x => !string.IsNullOrWhiteSpace(x.Vin))
            .WithMessage("شماره شاسی (VIN) باید ۱۷ کاراکتر معتبر باشد.");
        RuleFor(x => x.TemporaryPassMonths)
            .NotNull().InclusiveBetween(1, 60).When(x => x.ListingType == ListingType.TemporaryPass)
            .WithMessage("مدت تردد گذر موقت را مشخص کنید.");
        RuleFor(x => x.HawalehType)
            .NotNull().When(x => x.ListingType == ListingType.Hawaleh)
            .WithMessage("نوع حواله را مشخص کنید.");
        RuleForEach(x => x.ImageUrls)
            .Must(u => Uri.TryCreate(u, UriKind.Absolute, out var uri) && uri.Scheme is "https" or "http" || u.StartsWith('/'))
            .WithMessage("آدرس تصویر نامعتبر است.");
    }
}

public sealed class CarQueryValidator : AbstractValidator<CarQuery>
{
    private static readonly string[] Sorts = ["newest", "price_asc", "price_desc", "year_desc", "mileage_asc"];

    public CarQueryValidator()
    {
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 48);
        RuleFor(x => x.Sort).Must(s => Sorts.Contains(s)).WithMessage("مرتب‌سازی نامعتبر است.");
        RuleFor(x => x.Search).MaximumLength(100);
    }
}
