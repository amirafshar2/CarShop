using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moraveji.Application.Abstractions;
using Moraveji.Domain.Cars;
using Moraveji.Domain.Catalog;
using Moraveji.Domain.Common;
using Moraveji.Infrastructure.Auth;
using Moraveji.Infrastructure.Identity;

namespace Moraveji.Infrastructure.Persistence;

/// <summary>
/// Seeds roles, the admin/staff accounts (phones from configuration) and DEMO inventory.
/// Demo cars mirror the dealer's real Instagram stock mix; prices are illustrative only
/// and must be replaced from the admin panel.
/// </summary>
public sealed class DbSeeder(
    AppDbContext db,
    RoleManager<IdentityRole<Guid>> roles,
    UserManager<ApplicationUser> users,
    TimeProvider clock,
    IOptions<SeedOptions> options,
    ILogger<DbSeeder> logger)
{
    public async Task SeedAsync(CancellationToken ct = default)
    {
        foreach (var role in new[] { Roles.Admin, Roles.Staff, Roles.Customer })
            if (!await roles.RoleExistsAsync(role))
                await roles.CreateAsync(new IdentityRole<Guid>(role));

        var o = options.Value;
        if (IranValidators.TryNormalizeMobile(o.AdminPhone, out var adminPhone))
            await EnsureUserAsync(adminPhone, "مدیر سیستم", Roles.Admin);
        foreach (var staff in o.StaffPhones)
            if (IranValidators.TryNormalizeMobile(staff, out var staffPhone))
                await EnsureUserAsync(staffPhone, "کارشناس فروش", Roles.Staff);

        if (o.DemoData && !await db.Cars.IgnoreQueryFilters().AnyAsync(ct))
        {
            db.Cars.AddRange(DemoCars(clock.GetUtcNow()));
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Seeded demo inventory");
        }

        if (o.DemoData && !await db.ServiceItems.IgnoreQueryFilters().AnyAsync(ct))
        {
            db.ServiceItems.AddRange(DemoServices());
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Seeded demo services (illustrative prices — replace from the admin panel)");
        }
    }

    private async Task EnsureUserAsync(string phone, string name, string role)
    {
        var user = await users.Users.FirstOrDefaultAsync(u => u.PhoneNumber == phone);
        if (user is null)
        {
            user = new ApplicationUser
            {
                UserName = phone, PhoneNumber = phone, PhoneNumberConfirmed = true,
                FullName = name, CreatedAt = clock.GetUtcNow()
            };
            await users.CreateAsync(user);
        }
        if (!await users.IsInRoleAsync(user, role))
            await users.AddToRoleAsync(user, role);
    }

/// <summary>Services the dealer advertises on Instagram. Prices are ILLUSTRATIVE ONLY and must be set by the dealer in the admin panel.</summary>
    private static IEnumerable<ServiceItem> DemoServices()
    {
        const long M = 10_000_000; // 1 million toman in Rial
        ServiceItem Make(string title, ServiceCategory cat, int order, ServicePriceType type, long? price, string? unit,
            string description, string[] features, string? badge = null, bool featured = false, long? original = null)
        {
            var s = new ServiceItem(title, cat)
            {
                Description = description, Features = string.Join('\n', features), Unit = unit,
                Badge = badge, IsFeatured = featured, SortOrder = order
            };
            s.SetPrice(type, price, original);
            return s;
        }

        return
        [
            Make("سرامیک بدنه", ServiceCategory.Detailing, 1, ServicePriceType.From, 25 * M, "هر خودرو",
                "پوشش سرامیک نانو برای براقیت ماندگار و محافظت از رنگ در برابر آفتاب، آب و آلودگی.",
                ["پولیش و آماده‌سازی رنگ", "دو لایه سرامیک", "ضمانت‌نامه‌ی کتبی", "تحویل در همان روز"], "پرفروش", true),
            Make("واکس و پولیش", ServiceCategory.Detailing, 2, ServicePriceType.From, 6 * M, "هر خودرو",
                "رفع خط و خش سطحی و برگرداندن براقیت رنگ با پولیش چندمرحله‌ای و واکس محافظ.",
                ["پولیش سه‌مرحله‌ای", "واکس کارنوبا", "شست‌وشوی کامل"]),
            Make("صفرشویی کامل", ServiceCategory.Detailing, 3, ServicePriceType.Fixed, 4 * M, "سدان",
                "شست‌وشوی عمیق داخل و بیرون، موتور و رینگ‌ها؛ آماده‌ی فروش یا تحویل.",
                ["موتورشویی", "شست‌وشوی صندلی و سقف", "بوگیری کابین", "تمیزکاری رینگ و لاستیک"], null, false, 5 * M),
            Make("کاور بدنه (PPF)", ServiceCategory.Detailing, 4, ServicePriceType.OnCall, null, "بسته به خودرو",
                "روکش محافظ شفاف برای جلوگیری از سنگ‌خوردگی و خط و خش؛ قیمت بسته به مدل خودرو.",
                ["فیلم شفاف خودترمیم", "پوشش کامل یا قسمتی", "ضمانت‌نامه"]),
            Make("خرید از راه دور", ServiceCategory.Purchase, 1, ServicePriceType.OnCall, null, null,
                "خودروی دلخواهت رو از هر شهری بخر؛ از انتخاب تا تعویض پلاک بدون نیاز به حضور.",
                ["کارشناسی و ویدیوی کامل خودرو", "قرارداد و پرداخت امن", "ارسال درب منزل"], "بدون حضور", true),
            Make("فروش خودروی شما", ServiceCategory.Purchase, 2, ServicePriceType.OnCall, null, null,
                "ماشینت رو بدون دردسر و بدون کمیسیون بفروش؛ عکاسی، آگهی و مشتری با ما.",
                ["قیمت‌گذاری کارشناسی", "عکاسی حرفه‌ای", "نمایش در سایت و اینستاگرام"], "بدون کمیسیون"),
            Make("کارشناسی خودرو", ServiceCategory.Paperwork, 1, ServicePriceType.Fixed, 2 * M, "هر خودرو",
                "کارشناسی بدنه، رنگ، موتور و گیربکس قبل از خرید؛ با گزارش مکتوب.",
                ["بررسی رنگ و بدنه", "تست موتور و گیربکس", "استعلام خلافی و سوابق"]),
            Make("تعویض پلاک و انتقال سند", ServiceCategory.Paperwork, 2, ServicePriceType.From, 3 * M, null,
                "انجام کامل مراحل تعویض پلاک و انتقال سند در دفاتر رسمی.",
                ["نوبت‌گیری", "پیگیری تا پایان", "بدون نیاز به مراجعه‌ی مکرر"]),
        ];
    }

    private static IEnumerable<Car> DemoCars(DateTimeOffset now)
    {
        const long B = 10_000_000_000; // 1 milliard toman in Rial

        Car Make(string fa, string brand, string model, int year, YearCalendar cal, CarCondition cond, long? price,
            Action<Car>? extra = null, ListingType type = ListingType.Regular)
        {
            var car = new Car(fa, brand, model, year, cal, cond, type);
            car.Transmission = Transmission.Automatic;
            car.FuelType = FuelType.Gasoline;
            extra?.Invoke(car);
            car.SetPrice(price, price is null);
            car.Publish(now);
            return car;
        }

        return
        [
            Make("تویوتا کرولا الیت", "Toyota", "Corolla Elite", 2026, YearCalendar.Gregorian, CarCondition.New, null,
                c => { c.Colors = "سفید"; c.Tags = CarTags.SameDayDelivery; c.FuelType = FuelType.Hybrid; }),
            Make("بی‌ام‌و 225L", "BMW", "225L", 2025, YearCalendar.Gregorian, CarCondition.New, 72 * B / 10,
                c => { c.Colors = "سفید"; c.OriginCountry = "چین"; }),
            Make("تویوتا لندکروزر", "Toyota", "Land Cruiser", 2013, YearCalendar.Gregorian, CarCondition.Used, null,
                c => { c.Colors = "مشکی"; c.MileageKm = 165_000; c.FaceliftYear = 2018; c.Drivetrain = Drivetrain.FourWheel; c.Tags = CarTags.SingleSheetDeed; }),
            Make("آئودی Q5 تیپ ۴ بلک پکیج", "Audi", "Q5", 2024, YearCalendar.Gregorian, CarCondition.New, null,
                c => { c.Colors = "سفید,مشکی"; c.Trim = "تیپ ۴"; c.Package = "بلک پکیج"; }),
            Make("میتسوبیشی اوتلندر فول P Line", "Mitsubishi", "Outlander", 2025, YearCalendar.Gregorian, CarCondition.New, null,
                c => { c.Colors = "خاکستری,سفید,نقره‌ای"; c.Trim = "فول P Line"; c.Drivetrain = Drivetrain.FourWheel; c.OriginCountry = "ژاپن"; c.Tags = CarTags.WithPlateAndDocs; }),
            Make("بی‌ام‌و 528i", "BMW", "528i", 2014, YearCalendar.Gregorian, CarCondition.Used, 48 * B / 10,
                c => { c.Colors = "سفید"; c.MileageKm = 98_000; c.Tags = CarTags.Factory | CarTags.SingleKey; c.Description = "فابریک تک کلید ابوظبی"; }),
            Make("فولکس واگن تی‌راک", "Volkswagen", "T-Roc", 2025, YearCalendar.Gregorian, CarCondition.New, 56 * B / 10,
                c => { c.Colors = "مشکی"; c.Tags = CarTags.WithPlateAndDocs; }),
            Make("هیوندای کونا", "Hyundai", "Kona", 2025, YearCalendar.Gregorian, CarCondition.New, 42 * B / 10,
                c => c.Colors = "مشکی"),
            Make("تویوتا کرولا کراس", "Toyota", "Corolla Cross", 2025, YearCalendar.Gregorian, CarCondition.New, 45 * B / 10,
                c => { c.Colors = "سفید"; c.FuelType = FuelType.Hybrid; }),
            Make("تویوتا کمری فول", "Toyota", "Camry", 2025, YearCalendar.Gregorian, CarCondition.New, 85 * B / 10,
                c => { c.Colors = "سفید"; c.OriginCountry = "ژاپن"; c.FuelType = FuelType.Hybrid; }),
            Make("تویوتا راوفور دودیف", "Toyota", "RAV4", 2025, YearCalendar.Gregorian, CarCondition.New, 78 * B / 10,
                c => { c.Colors = "سفید"; c.OriginCountry = "ژاپن"; c.Drivetrain = Drivetrain.FourWheel; }),
            Make("ونوسیا", "Venucia", "V-Online", 2025, YearCalendar.Gregorian, CarCondition.New, 21 * B / 10,
                c => c.Colors = "مشکی"),
            Make("مکسوس استار", "Maxus", "Star", 1403, YearCalendar.Solar, CarCondition.New, 32 * B / 10,
                c => { c.Colors = "مشکی"; c.Drivetrain = Drivetrain.FourWheel; c.FuelType = FuelType.Diesel; }),
            Make("کی‌ام‌سی T9", "KMC", "T9", 1404, YearCalendar.Solar, CarCondition.New, 29 * B / 10,
                c => { c.Colors = "خاکستری"; c.Drivetrain = Drivetrain.FourWheel; }),
            Make("کی‌ام‌سی T8", "KMC", "T8", 1404, YearCalendar.Solar, CarCondition.New, 26 * B / 10,
                c => c.Colors = "مشکی"),
            Make("دنا پلاس اتومات", "IKCO", "Dena Plus", 1404, YearCalendar.Solar, CarCondition.New, 9 * B / 10,
                c => c.Colors = "سفید"),
            Make("پژو ۲۰۷ پانوراما اتومات", "Peugeot", "207i", 1404, YearCalendar.Solar, CarCondition.Used, 8 * B / 10,
                c => { c.Colors = "سفید"; c.MileageKm = 5_000; }),
            Make("مرسدس بنز S550 گذر موقت", "Mercedes-Benz", "S550", 2015, YearCalendar.Gregorian, CarCondition.Used, null,
                c => { c.Colors = "مشکی"; c.TemporaryPassMonths = 12; c.FreeZone = "کیش"; c.Tags = CarTags.SameDayDelivery; },
                ListingType.TemporaryPass),
            Make("حواله فونیکس FX پریمیوم", "Fownix", "FX Premium", 1404, YearCalendar.Solar, CarCondition.New, null,
                c => { c.Colors = "مشکی"; c.HawalehType = HawalehType.Factory; c.HawalehDeliveryOn = new DateOnly(2026, 5, 22); },
                ListingType.Hawaleh),
            Make("حواله جانبازی تویوتا هایلندر", "Toyota", "Highlander", 2025, YearCalendar.Gregorian, CarCondition.New, null,
                c => { c.Colors = "خاکستری"; c.HawalehType = HawalehType.Veteran; c.FuelType = FuelType.Hybrid; },
                ListingType.Hawaleh)
        ];
    }
}
