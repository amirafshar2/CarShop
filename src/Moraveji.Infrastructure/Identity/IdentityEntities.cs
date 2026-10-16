using Microsoft.AspNetCore.Identity;

namespace Moraveji.Infrastructure.Identity;

public sealed class ApplicationUser : IdentityUser<Guid>
{
    public string? FullName { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

/// <summary>One-time login code. Only an HMAC of the code is stored, never the code itself.</summary>
public sealed class OtpCode
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Phone { get; set; } = default!;
    public string CodeHash { get; set; } = default!;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public int Attempts { get; set; }
    public bool Used { get; set; }
    public string? RequestIp { get; set; }
}

/// <summary>
/// Refresh token (stored as SHA-256 hash). Tokens rotate on every use; tokens of the same
/// <see cref="FamilyId"/> are all revoked if an already-used token is presented again (theft detection).
/// </summary>
public sealed class RefreshToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid FamilyId { get; set; }
    public string TokenHash { get; set; } = default!;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }
    public Guid? ReplacedById { get; set; }
}
