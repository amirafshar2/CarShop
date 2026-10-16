namespace Moraveji.Domain.Cars;

public enum CarStatus
{
    Draft = 0,
    Available = 1,
    Reserved = 2,
    Sold = 3,
    Hidden = 4
}

/// <summary>Regular stock, "گذر موقت" (temporary-pass) cars, or "حواله" (delivery vouchers).</summary>
public enum ListingType
{
    Regular = 0,
    TemporaryPass = 1,
    Hawaleh = 2
}

public enum CarCondition
{
    New = 0,   // صفر
    Used = 1   // کارکرده
}

public enum Transmission
{
    Automatic = 0,
    Manual = 1
}

public enum FuelType
{
    Gasoline = 0,
    Hybrid = 1,
    Electric = 2,
    Diesel = 3,
    Cng = 4    // دوگانه‌سوز
}

public enum Drivetrain
{
    TwoWheel = 0,
    FourWheel = 1   // دودیفرانسیل
}

public enum YearCalendar
{
    Gregorian = 0, // میلادی
    Solar = 1      // شمسی
}

public enum HawalehType
{
    Factory = 0,   // کارخانه
    Veteran = 1,   // جانبازی
    Import = 2     // واردات
}

/// <summary>Badges taken from how the dealer describes stock on Instagram.</summary>
[Flags]
public enum CarTags
{
    None = 0,
    Factory = 1 << 0,          // فابریک
    SingleKey = 1 << 1,        // تک‌کلید
    WithPlateAndDocs = 1 << 2, // با پلاک و مدارک
    SameDayDelivery = 1 << 3,  // تحویل روز
    SingleSheetDeed = 1 << 4,  // تک برگ سند
    NoCommission = 1 << 5      // بدون کمیسیون
}
