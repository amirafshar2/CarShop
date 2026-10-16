namespace Moraveji.Infrastructure.Auth;

public sealed class JwtOptions
{
    public const string Section = "Jwt";
    public string Issuer { get; set; } = "moraveji-motors";
    public string Audience { get; set; } = "moraveji-web";

    /// <summary>At least 32 bytes. Read ONLY from user-secrets / environment (Jwt__SigningKey).</summary>
    public string SigningKey { get; set; } = string.Empty;

    public int AccessTokenMinutes { get; set; } = 15;
    public int RefreshTokenDays { get; set; } = 30;
}

public sealed class OtpOptions
{
    public const string Section = "Otp";

    /// <summary>Secret pepper for hashing OTP codes. Read from user-secrets / environment (Otp__HashKey).</summary>
    public string HashKey { get; set; } = string.Empty;

    public int CodeLifetimeSeconds { get; set; } = 120;
    public int ResendCooldownSeconds { get; set; } = 60;
    public int MaxAttempts { get; set; } = 5;
    public int MaxSendsPerWindow { get; set; } = 3;
    public int WindowMinutes { get; set; } = 10;
}

public sealed class SmsOptions
{
    public const string Section = "Sms";

    /// <summary>"Console" (development: code is written to the log) or "Kavenegar".</summary>
    public string Provider { get; set; } = "Console";

    /// <summary>Kavenegar API key — environment only (Sms__ApiKey).</summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>Kavenegar "verify lookup" template name.</summary>
    public string OtpTemplate { get; set; } = "moraveji-otp";
}

public sealed class SeedOptions
{
    public const string Section = "Seed";
    public bool DemoData { get; set; } = true;
    public string? AdminPhone { get; set; }
    public string[] StaffPhones { get; set; } = [];
}
