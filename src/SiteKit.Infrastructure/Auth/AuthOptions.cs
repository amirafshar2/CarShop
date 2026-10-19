namespace SiteKit.Infrastructure.Auth;

public sealed class JwtOptions
{
    public const string Section = "Jwt";
    public string Issuer { get; set; } = "sitekit";
    public string Audience { get; set; } = "sitekit-web";

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
    public string OtpTemplate { get; set; } = "sitekit-otp";
}

public sealed class SeedOptions
{
    public const string Section = "Seed";
    /// <summary>First start only: blank (empty site + setup assistant) | demo (sample content) | content (import <see cref="ContentFile"/>).</summary>
    public string Mode { get; set; } = "blank";
    /// <summary>car | travel | shop | services — used by demo mode and as the blank default.</summary>
    public string Preset { get; set; } = "services";
    /// <summary>Path to a content package (.json exported from another installation's panel).</summary>
    public string? ContentFile { get; set; }
    /// <summary>content mode: publish right away and skip the assistant (ready-made demo for a presentation).</summary>
    public bool Publish { get; set; }
    public string? AdminPhone { get; set; }
    public string[] StaffPhones { get; set; } = [];
}
