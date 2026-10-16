namespace Moraveji.Api.Infrastructure;

public static class AuthPolicies
{
    public const string Admin = "admin";
    public const string StaffOrAdmin = "staff-or-admin";
}

public static class RateLimitPolicies
{
    public const string Otp = "otp";
    public const string Auth = "auth";
    public const string Forms = "forms";
    public const string Refresh = "refresh";
}

public sealed class RateLimitOptions
{
    public const string Section = "RateLimits";
    public int OtpPerTenMinutes { get; set; } = 5;
    public int AuthPerMinute { get; set; } = 10;
    public int FormsPerMinute { get; set; } = 5;
    public int RefreshPerMinute { get; set; } = 60;
}
