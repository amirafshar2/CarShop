using SiteKit.Domain.Common;

namespace SiteKit.Application.Site;

public sealed record PresetInfo(string Key, string Title, string Description, string Icon);

public sealed record DemoListing(
    string Title, string? Category, string? Summary, string? Description, PriceType PriceType, long? Price, long? Original,
    string? Unit, string? Badge, string[] Images, Dictionary<string, string> Attributes, bool Featured = false);

public sealed record DemoService(
    string Title, string? Category, string? Description, string[] Features, PriceType PriceType, long? Price,
    string? Unit, string? Badge = null, bool Featured = false, long? Original = null);

/// <summary>
/// Starting points per kind of business. <see cref="Content"/> gives labels, fields, menu and suggested texts;
/// with <c>demo: true</c> it also fills a fictional brand so the site can be shown as a sample.
/// Demo photos: Unsplash License (see CREDITS.md).
/// </summary>
public static class Presets
{
    private const long M = 10_000_000; // 1 million toman in Rial
    private static string U(string id) => $"https://images.unsplash.com/photo-{id}?w=1600&q=80&auto=format&fit=crop";

    public static readonly IReadOnlyList<PresetInfo> All =
    [
        new("car", "گالری خودرو", "موجودی خودرو با سال، کارکرد، گیربکس و سوخت", "car"),
        new("travel", "آژانس مسافرتی", "تورها با مقصد، مدت، تاریخ رفت و هتل", "plane"),
        new("shop", "فروشگاه", "محصولات با برند، رنگ و سایز", "bag"),
        new("services", "خدمات / سالن / کلینیک", "نمونه‌کارها و لیست خدمات با قیمت و رزرو نوبت", "sparkles"),
    ];

    public static bool Exists(string key) => All.Any(p => p.Key == key);

    public static SiteContent Content(string key, bool demo)
    {
        var c = key switch
        {
            "car" => Car(demo),
            "travel" => Travel(demo),
            "shop" => Shop(demo),
            _ => Services(demo),
        };
        c.Nav =
        [
            new() { Label = "خانه", Href = "/" },
            new() { Label = c.Labels.ItemPlural, Href = "/items" },
            new() { Label = "خدمات", Href = "/services" },
            new() { Label = "تماس", Href = "/contact" },
        ];
        c.Home.HeroCtaText ??= $"دیدن {c.Labels.ItemPlural}";
        c.Home.HeroCtaUrl ??= "/items";
        c.Home.FeaturedTitle ??= $"{c.Labels.ItemPlural}ی ویژه";
        c.Home.CtaTitle ??= "سؤالی دارید؟";
        c.Home.CtaText ??= "با ما در تماس باشید؛ در کوتاه‌ترین زمان پاسخ می‌دهیم.";
        c.Home.HighlightsEyebrow ??= c.Brand.Name;
        c.Home.FeaturedEyebrow ??= c.Labels.ItemPlural;
        c.Home.ServicesEyebrow ??= "خدمات ما";
        c.Home.ServicesTitle ??= c.Labels.ServicesTitle;
        c.Home.TestimonialsEyebrow ??= "نظر مشتری‌ها";
        c.Home.TestimonialsTitle ??= "صدای مشتری‌ها";
        c.Home.GalleryTitle ??= c.Brand.Name;
        if (demo)
        {
            // Photos of the sample items give the steps (scroll story) and the zoom gallery something to show.
            var photos = DemoListings(key).SelectMany(l => l.Images).Prepend(c.Home.AboutImageUrl).Prepend(c.Home.HeroImageUrl)
                .Where(u => !string.IsNullOrEmpty(u)).Distinct().ToList();
            for (var i = 0; i < c.Home.Highlights.Count && photos.Count > 0; i++)
                c.Home.Highlights[i].ImageUrl ??= photos[(i + 1) % photos.Count];
            if (c.Home.Gallery.Count == 0) c.Home.Gallery = photos.Take(7).ToList()!;
            // Clearly marked samples — replaced by real reviews from the panel.
            if (c.Home.Testimonials.Count == 0)
            {
                c.Home.TestimonialsText = "(متن نمونه — نظرات واقعی مشتری‌ها را از پنل جایگزین کنید)";
                c.Home.Testimonials =
                [
                    new() { Name = "متن نمونه", Role = c.Labels.ItemSingular, Text = "«اینجا نظر واقعی مشتری بعد از خرید نمایش داده می‌شود.»" },
                    new() { Name = "متن نمونه", Role = "خدمات", Text = "«فقط نظراتی را بگذارید که مشتری اجازه‌ی انتشارشان را داده.»" },
                    new() { Name = "متن نمونه", Role = "پشتیبانی", Text = "«نام، توضیح کوتاه و متن نظر از بخش صفحه‌ی اول پنل عوض می‌شود.»" },
                    new() { Name = "متن نمونه", Role = c.Labels.ItemPlural, Text = "«ستون‌ها خودکار حرکت می‌کنند و روی هاور می‌ایستند.»" },
                    new() { Name = "متن نمونه", Role = "تماس", Text = "«هر تعداد نظر تا ۲۰ مورد قابل افزودن است.»" },
                    new() { Name = "متن نمونه", Role = "رضایت", Text = "«این متن‌ها نمونه‌اند و در سایت شما جایگزین می‌شوند.»" },
                ];
            }
        }
        if (!demo)
        {
            c.Home.Testimonials = [];
            c.Home.Partners = [];
            c.Home.Gallery = [];
            c.Home.GalleryTitle = null;
            c.Home.HighlightsEyebrow = null;
            c.Brand = new BrandInfo();
            c.Contact = new ContactInfo();
            c.Home.Stats = [];
            c.Home.Faq = [];
            c.Home.AboutText = null;
            c.Footer = new FooterInfo();
        }
        return c;
    }

    // ---------------------------------------------------------------- car
    private static SiteContent Car(bool demo) => new()
    {
        Brand = new() { Name = "اتو گالری نمونه", Tagline = "از انتخاب تا تحویل، کنار شما", Description = "خرید و فروش خودروی نو و کارکرده با کارشناسی و قیمت شفاف." },
        Theme = new() { Primary = "#f97316", Mode = "dark" },
        Labels = new() { ItemSingular = "خودرو", ItemPlural = "خودروها", ItemsPageTitle = "موجودی خودرو", RequestButton = "درخواست بازدید", CategoryLabel = "نوع", SoldOutLabel = "فروخته شد" },
        Fields =
        [
            new() { Key = "year", Label = "سال ساخت", Type = "number", ShowOnCard = true },
            new() { Key = "km", Label = "کارکرد", Type = "number", Suffix = "کیلومتر", ShowOnCard = true },
            new() { Key = "gearbox", Label = "گیربکس", Type = "select", Options = ["اتوماتیک", "دنده‌ای"], Filter = true },
            new() { Key = "fuel", Label = "سوخت", Type = "select", Options = ["بنزینی", "هیبرید", "برقی", "دیزل"], Filter = true },
            new() { Key = "color", Label = "رنگ", Type = "text" },
        ],
        Categories = ["نو", "کارکرده", "حواله"],
        Home = new()
        {
            HeroTitle = "خودروی بعدی‌ات اینجاست",
            HeroSubtitle = "موجودی به‌روز، کارشناسی شفاف و همراهی تا روز تحویل.",
            HeroImageUrl = U("1503376780353-7e6692767b70"),
            HighlightsTitle = "چرا ما؟",
            Highlights =
            [
                new() { Title = "کارشناسی کامل", Text = "هر خودرو قبل از فروش بررسی می‌شود.", Icon = "shield" },
                new() { Title = "قیمت شفاف", Text = "بدون هزینه‌ی پنهان.", Icon = "check" },
                new() { Title = "تحویل سریع", Text = "انجام کارهای اداری با ما.", Icon = "clock" },
            ],
            AboutTitle = "درباره‌ی ما",
            AboutText = "این یک متن نمونه است. از پنل مدیریت، معرفی کسب‌وکار خودتان را اینجا بنویسید.",
            AboutImageUrl = U("1590362891991-f776e747a588"),
            Stats = [new() { Value = "۵۰۰+", Label = "خودروی فروخته‌شده" }, new() { Value = "۱۰", Label = "سال تجربه" }],
            Faq =
            [
                new() { Question = "امکان کارشناسی قبل از خرید هست؟", Answer = "بله، هر خودرو قبل از تحویل کارشناسی می‌شود." },
                new() { Question = "خودروی خودم را هم می‌خرید؟", Answer = "بله، با کارشناسی رایگان قیمت‌گذاری می‌کنیم." },
            ],
        },
        Contact = new() { Phone = "02100000000", Whatsapp = "989120000000", Instagram = "sample.gallery", Address = "خیابان نمونه، پلاک ۱", Hours = "شنبه تا پنجشنبه ۹ تا ۲۰" },
        Footer = new() { Text = "این سایت نمونه است؛ همه‌ی متن‌ها و قیمت‌ها نمایشی‌اند." },
    };

    // ---------------------------------------------------------------- travel
    private static SiteContent Travel(bool demo) => new()
    {
        Brand = new() { Name = "آژانس سفر آسمان", Tagline = "سفر بی‌دغدغه، از رزرو تا برگشت", Description = "تورهای داخلی و خارجی، بلیت و هتل با پشتیبانی شبانه‌روزی." },
        Theme = new() { Primary = "#0ea5e9", Mode = "light" },
        Labels = new() { ItemSingular = "تور", ItemPlural = "تورها", ItemsPageTitle = "همه‌ی تورها", RequestButton = "رزرو تور", CategoryLabel = "نوع تور", SoldOutLabel = "تکمیل ظرفیت" },
        Fields =
        [
            new() { Key = "destination", Label = "مقصد", Type = "text", ShowOnCard = true },
            new() { Key = "duration", Label = "مدت", Type = "text", ShowOnCard = true },
            new() { Key = "departure", Label = "تاریخ رفت", Type = "text" },
            new() { Key = "hotel", Label = "هتل", Type = "select", Options = ["۳ ستاره", "۴ ستاره", "۵ ستاره"], Filter = true },
            new() { Key = "transport", Label = "حمل‌ونقل", Type = "select", Options = ["هوایی", "زمینی", "دریایی"], Filter = true },
        ],
        Categories = ["تور خارجی", "تور داخلی", "لحظه‌آخری"],
        Home = new()
        {
            HeroTitle = "سفر بعدی‌ات را همین‌جا انتخاب کن",
            HeroSubtitle = "تورهای منتخب با بهترین قیمت و پشتیبانی کامل در طول سفر.",
            HeroImageUrl = U("1507525428034-b723cf961d3e"),
            HighlightsTitle = "با ما سفر کنید",
            Highlights =
            [
                new() { Title = "پشتیبانی شبانه‌روزی", Text = "در طول سفر همیشه در دسترسیم.", Icon = "phone" },
                new() { Title = "بهترین قیمت", Text = "قیمت مستقیم از هتل و ایرلاین.", Icon = "star" },
                new() { Title = "ویزا و بیمه", Text = "انجام کارهای سفر با ما.", Icon = "map" },
            ],
            AboutTitle = "درباره‌ی ما",
            AboutText = "این یک متن نمونه است. از پنل مدیریت، معرفی آژانس خودتان را اینجا بنویسید.",
            AboutImageUrl = U("1535262412227-85541e910204"),
            Stats = [new() { Value = "۲۰۰۰+", Label = "مسافر راضی" }, new() { Value = "۳۰", Label = "مقصد" }],
            Faq =
            [
                new() { Question = "برای رزرو چه مدارکی لازم است؟", Answer = "برای تور خارجی گذرنامه با حداقل ۶ ماه اعتبار." },
                new() { Question = "امکان پرداخت قسطی هست؟", Answer = "برای برخی تورها بله؛ با ما تماس بگیرید." },
            ],
        },
        Contact = new() { Phone = "02100000000", Whatsapp = "989120000000", Instagram = "sample.travel", Address = "خیابان نمونه، پلاک ۲", Hours = "همه‌روزه ۹ تا ۲۱" },
        Footer = new() { Text = "این سایت نمونه است؛ همه‌ی تورها و قیمت‌ها نمایشی‌اند." },
    };

    // ---------------------------------------------------------------- shop
    private static SiteContent Shop(bool demo) => new()
    {
        Brand = new() { Name = "فروشگاه نمونه", Tagline = "انتخاب خوب، قیمت منصفانه", Description = "کفش، ساعت و لوازم آرایشی اصل با ضمانت." },
        Theme = new() { Primary = "#e11d48", Mode = "light" },
        Labels = new() { ItemSingular = "محصول", ItemPlural = "محصولات", ItemsPageTitle = "همه‌ی محصولات", RequestButton = "ثبت سفارش", CategoryLabel = "دسته", SoldOutLabel = "ناموجود" },
        Fields =
        [
            new() { Key = "brand", Label = "برند", Type = "text", ShowOnCard = true },
            new() { Key = "size", Label = "سایز", Type = "text" },
            new() { Key = "color", Label = "رنگ", Type = "text" },
            new() { Key = "warranty", Label = "ضمانت", Type = "select", Options = ["دارد", "ندارد"], Filter = true },
        ],
        Categories = ["کفش", "ساعت", "آرایشی"],
        Home = new()
        {
            HeroTitle = "جدیدترین‌ها رسید",
            HeroSubtitle = "محصولات اصل با ارسال سریع به سراسر کشور.",
            HeroImageUrl = U("1560769629-975ec94e6a86"),
            HighlightsTitle = "خرید مطمئن",
            Highlights =
            [
                new() { Title = "ضمانت اصالت", Text = "همه‌ی کالاها اصل هستند.", Icon = "shield" },
                new() { Title = "ارسال سریع", Text = "ارسال به سراسر کشور.", Icon = "truck" },
                new() { Title = "مرجوعی آسان", Text = "تا ۷ روز امکان مرجوعی.", Icon = "gift" },
            ],
            AboutTitle = "درباره‌ی ما",
            AboutText = "این یک متن نمونه است. از پنل مدیریت، معرفی فروشگاه خودتان را اینجا بنویسید.",
            AboutImageUrl = U("1611930022073-b7a4ba5fcccd"),
            Stats = [new() { Value = "۱۰۰۰+", Label = "سفارش موفق" }],
            Faq =
            [
                new() { Question = "ارسال چند روز طول می‌کشد؟", Answer = "معمولاً ۲ تا ۴ روز کاری." },
                new() { Question = "امکان تعویض سایز هست؟", Answer = "بله، تا ۷ روز بعد از دریافت." },
            ],
        },
        Contact = new() { Phone = "02100000000", Whatsapp = "989120000000", Instagram = "sample.shop", Address = "خیابان نمونه، پلاک ۳", Hours = "شنبه تا پنجشنبه ۱۰ تا ۲۲" },
        Footer = new() { Text = "این سایت نمونه است؛ همه‌ی محصولات و قیمت‌ها نمایشی‌اند." },
    };

    // ---------------------------------------------------------------- services
    private static SiteContent Services(bool demo) => new()
    {
        Brand = new() { Name = "سالن زیبایی رز", Tagline = "زیبایی با حوصله و دقت", Description = "خدمات مو، پوست و ناخن با متخصصان باتجربه." },
        Theme = new() { Primary = "#a855f7", Mode = "dark" },
        Labels = new() { ItemSingular = "نمونه‌کار", ItemPlural = "نمونه‌کارها", ItemsPageTitle = "نمونه‌کارهای ما", RequestButton = "رزرو نوبت", CategoryLabel = "دسته", SoldOutLabel = "غیرفعال" },
        Fields =
        [
            new() { Key = "duration", Label = "مدت انجام", Type = "text", ShowOnCard = true },
            new() { Key = "specialist", Label = "متخصص", Type = "text" },
        ],
        Categories = ["مو", "پوست", "ناخن"],
        Home = new()
        {
            HeroTitle = "زیبایی‌ات را به ما بسپار",
            HeroSubtitle = "نوبت آنلاین، محیط آرام و متخصصان باتجربه.",
            HeroImageUrl = U("1633681926022-84c23e8cb2d6"),
            HighlightsTitle = "چرا ما؟",
            Highlights =
            [
                new() { Title = "متخصصان باتجربه", Text = "سال‌ها سابقه‌ی کار.", Icon = "star" },
                new() { Title = "مواد باکیفیت", Text = "فقط برندهای معتبر.", Icon = "sparkles" },
                new() { Title = "نوبت سریع", Text = "رزرو آنلاین بدون انتظار.", Icon = "clock" },
            ],
            AboutTitle = "درباره‌ی ما",
            AboutText = "این یک متن نمونه است. از پنل مدیریت، معرفی کسب‌وکار خودتان را اینجا بنویسید.",
            AboutImageUrl = U("1580618672591-eb180b1a973f"),
            Stats = [new() { Value = "۳۰۰۰+", Label = "مشتری" }, new() { Value = "۸", Label = "متخصص" }],
            Faq =
            [
                new() { Question = "چطور نوبت بگیرم؟", Answer = "از دکمه‌ی رزرو نوبت یا با تماس تلفنی." },
                new() { Question = "لغو نوبت هزینه دارد؟", Answer = "تا ۲۴ ساعت قبل رایگان است." },
            ],
        },
        Contact = new() { Phone = "02100000000", Whatsapp = "989120000000", Instagram = "sample.salon", Address = "خیابان نمونه، پلاک ۴", Hours = "شنبه تا پنجشنبه ۱۰ تا ۲۰" },
        Footer = new() { Text = "این سایت نمونه است؛ همه‌ی خدمات و قیمت‌ها نمایشی‌اند." },
    };

    // ---------------------------------------------------------------- demo data
    public static IReadOnlyList<DemoListing> DemoListings(string key) => key switch
    {
        "car" =>
        [
            new("تویوتا کمری هیبرید", "نو", "صفر کیلومتر، فول آپشن", "خودروی نمونه برای نمایش. مشخصات و قیمت را از پنل عوض کنید.", PriceType.Fixed, 85 * 1000 * M / 10, null, null, "تحویل فوری",
                [U("1621007947382-bb3c3994e3fb")], new() { ["year"] = "2025", ["km"] = "0", ["gearbox"] = "اتوماتیک", ["fuel"] = "هیبرید", ["color"] = "سفید" }, true),
            new("بی‌ام‌و سری ۵", "کارکرده", "فابریک، تک‌مالک", null, PriceType.Fixed, 48 * 1000 * M / 10, 52 * 1000 * M / 10, null, null,
                [U("1555215695-3004980ad54e")], new() { ["year"] = "2014", ["km"] = "98000", ["gearbox"] = "اتوماتیک", ["fuel"] = "بنزینی", ["color"] = "سفید" }, true),
            new("تویوتا راوفور", "نو", "دو دیفرانسیل", null, PriceType.OnCall, null, null, null, null,
                [U("1617469767053-d3b523a0b982")], new() { ["year"] = "2025", ["km"] = "0", ["gearbox"] = "اتوماتیک", ["fuel"] = "بنزینی" }, true),
            new("آئودی Q5", "نو", "تیپ کامل", null, PriceType.OnCall, null, null, null, null,
                [U("1606664515524-ed2f786a0bd6")], new() { ["year"] = "2024", ["km"] = "0", ["gearbox"] = "اتوماتیک", ["fuel"] = "بنزینی" }),
            new("مرسدس بنز AMG GT", "کارکرده", "کم‌کارکرد", null, PriceType.From, 120 * 1000 * M / 10, null, null, "ویژه",
                [U("1618843479313-40f8afb4b4d8")], new() { ["year"] = "2019", ["km"] = "21000", ["gearbox"] = "اتوماتیک", ["fuel"] = "بنزینی" }),
            new("هاچ‌بک شهری", "کارکرده", "کم‌مصرف و تمیز", null, PriceType.Fixed, 9 * 1000 * M / 10, null, null, null,
                [U("1550355291-bbee04a92027")], new() { ["year"] = "2020", ["km"] = "45000", ["gearbox"] = "دنده‌ای", ["fuel"] = "بنزینی" }),
        ],
        "travel" =>
        [
            new("تور استانبول", "تور خارجی", "۴ شب و ۵ روز، پرواز مستقیم", "تور نمونه برای نمایش. برنامه، هتل و قیمت را از پنل عوض کنید.", PriceType.From, 45 * M, 52 * M, "هر نفر", "پرفروش",
                [U("1524231757912-21f4fe3a7200"), U("1589561454226-796a8aa89b05")], new() { ["destination"] = "استانبول", ["duration"] = "۴ شب", ["departure"] = "هر پنجشنبه", ["hotel"] = "۴ ستاره", ["transport"] = "هوایی" }, true),
            new("تور دبی", "تور خارجی", "۵ شب، صبحانه و ترانسفر", null, PriceType.From, 60 * M, null, "هر نفر", null,
                [U("1512453979798-5ea266f8880c"), U("1518684079-3c830dcef090")], new() { ["destination"] = "دبی", ["duration"] = "۵ شب", ["hotel"] = "۵ ستاره", ["transport"] = "هوایی" }, true),
            new("تور جزیره‌ی استوایی", "لحظه‌آخری", "ظرفیت محدود", null, PriceType.Fixed, 38 * M, 46 * M, "هر نفر", "لحظه‌آخری",
                [U("1603477849227-705c424d1d80")], new() { ["destination"] = "جزیره", ["duration"] = "۳ شب", ["hotel"] = "۴ ستاره", ["transport"] = "هوایی" }, true),
            new("تور ساحلی", "تور داخلی", "۳ شب، اقامت کنار دریا", null, PriceType.From, 12 * M, null, "هر نفر", null,
                [U("1535262412227-85541e910204")], new() { ["destination"] = "شمال", ["duration"] = "۳ شب", ["hotel"] = "۳ ستاره", ["transport"] = "زمینی" }),
        ],
        "shop" =>
        [
            new("کفش ورزشی قرمز", "کفش", "سبک و راحت برای پیاده‌روی", "محصول نمونه برای نمایش. مشخصات و قیمت را از پنل عوض کنید.", PriceType.Fixed, 3 * M, 4 * M, null, "تخفیف",
                [U("1542291026-7eec264c27ff")], new() { ["brand"] = "نمونه", ["size"] = "۴۰ تا ۴۵", ["color"] = "قرمز", ["warranty"] = "دارد" }, true),
            new("ساعت هوشمند", "ساعت", "ضدآب، باتری ۲ روزه", null, PriceType.Fixed, 12 * M, null, null, "جدید",
                [U("1546868871-7041f2a55e12")], new() { ["brand"] = "نمونه", ["color"] = "خاکستری", ["warranty"] = "دارد" }, true),
            new("عطر زنانه", "آرایشی", "۱۰۰ میلی‌لیتر", null, PriceType.Fixed, 5 * M, null, null, null,
                [U("1563170351-be82bc888aa4")], new() { ["brand"] = "نمونه", ["warranty"] = "ندارد" }, true),
            new("کفش رانینگ", "کفش", "مناسب دویدن", null, PriceType.Fixed, 4 * M, null, null, null,
                [U("1491553895911-0055eca6402d")], new() { ["brand"] = "نمونه", ["size"] = "۳۸ تا ۴۴", ["color"] = "طوسی", ["warranty"] = "دارد" }),
            new("پک مراقبت پوست", "آرایشی", "سه محصول", null, PriceType.From, 2 * M, null, null, null,
                [U("1629198688000-71f23e745b6e")], new() { ["brand"] = "نمونه", ["warranty"] = "ندارد" }),
        ],
        _ =>
        [
            new("کوتاهی و حالت‌دهی مو", "مو", "مدل به انتخاب شما", "نمونه‌کار نمایشی. عکس‌های کارهای خودتان را از پنل بگذارید.", PriceType.From, 1 * M, null, null, null,
                [U("1634449571010-02389ed0f9b0")], new() { ["duration"] = "۱ ساعت", ["specialist"] = "متخصص نمونه" }, true),
            new("براشینگ و سشوار", "مو", null, null, PriceType.From, M / 2, null, null, null,
                [U("1580618672591-eb180b1a973f")], new() { ["duration"] = "۴۵ دقیقه" }, true),
            new("پاکسازی پوست", "پوست", "مناسب همه‌ی پوست‌ها", null, PriceType.Fixed, 2 * M, null, null, "پرطرفدار",
                [U("1616394584738-fc6e612e71b9")], new() { ["duration"] = "۹۰ دقیقه" }, true),
        ],
    };

    public static IReadOnlyList<DemoService> DemoServices(string key) => key switch
    {
        "car" =>
        [
            new("کارشناسی خودرو", "خدمات خرید", "بررسی بدنه، رنگ، موتور و گیربکس با گزارش مکتوب.", ["بررسی رنگ و بدنه", "تست موتور و گیربکس"], PriceType.Fixed, 2 * M, "هر خودرو", null, true),
            new("فروش خودروی شما", "خدمات خرید", "قیمت‌گذاری، عکاسی و پیدا کردن خریدار.", ["قیمت‌گذاری کارشناسی", "عکاسی حرفه‌ای"], PriceType.OnCall, null, null, "بدون کمیسیون"),
            new("سرامیک بدنه", "دیتیلینگ", "پوشش محافظ براق و ماندگار.", ["پولیش", "دو لایه سرامیک"], PriceType.From, 25 * M, "هر خودرو"),
        ],
        "travel" =>
        [
            new("رزرو بلیت هواپیما", "بلیت و هتل", "پروازهای داخلی و خارجی.", ["مقایسه‌ی قیمت", "صدور فوری"], PriceType.OnCall, null, null, null, true),
            new("رزرو هتل", "بلیت و هتل", "هتل در همه‌ی مقصدها.", ["تأیید فوری", "لغو انعطاف‌پذیر"], PriceType.OnCall, null, null),
            new("انجام ویزا", "ویزا", "مشاوره و انجام مراحل ویزا.", ["بررسی مدارک", "نوبت سفارت"], PriceType.From, 5 * M, "هر نفر"),
        ],
        "shop" =>
        [
            new("ارسال سریع", "ارسال", "ارسال همان‌روز در شهر.", ["بسته‌بندی ایمن"], PriceType.Fixed, 1 * M / 2, "هر سفارش"),
            new("بسته‌بندی کادویی", "خدمات ویژه", "کادو با کارت تبریک.", ["کارت تبریک دست‌نویس"], PriceType.Fixed, 1 * M / 5, "هر محصول"),
        ],
        _ =>
        [
            new("کوتاهی مو", "مو", "مشاوره و کوتاهی به مدل دلخواه.", ["شست‌وشو", "سشوار"], PriceType.From, 1 * M, null, "پرطرفدار", true),
            new("رنگ مو", "مو", "رنگ و مش با برندهای معتبر.", ["تست حساسیت", "مشاوره‌ی رنگ"], PriceType.From, 4 * M, null),
            new("پاکسازی پوست", "پوست", "پاکسازی عمیق و ماسک.", ["آنالیز پوست", "ماسک تخصصی"], PriceType.Fixed, 2 * M, "هر جلسه", null, false, 25 * M / 10),
            new("مانیکور", "ناخن", "مانیکور و لاک ژل.", ["فرم‌دهی", "لاک ژل"], PriceType.Fixed, 1 * M, null),
        ],
    };
}
