using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SiteKit.Application.Abstractions;
using SiteKit.Application.Auth;
using SiteKit.Domain.Common;
using SiteKit.Infrastructure.Identity;
using SiteKit.Infrastructure.Persistence;

namespace SiteKit.Infrastructure.Auth;

public sealed class AuthService(
    AppDbContext db,
    UserManager<ApplicationUser> users,
    ISmsSender sms,
    TokenService tokens,
    TimeProvider clock,
    IOptions<OtpOptions> otpOptions,
    IOptions<JwtOptions> jwtOptions,
    IHttpContextAccessor http) : IAuthService
{
    private readonly OtpOptions _otp = otpOptions.Value;

    public async Task<Result<OtpSentResponse>> RequestOtpAsync(RequestOtpRequest request, CancellationToken ct)
    {
        IranValidators.TryNormalizeMobile(request.Phone, out var phone);
        var now = clock.GetUtcNow();
        var windowStart = now.AddMinutes(-_otp.WindowMinutes);

        var recent = await db.OtpCodes.AsNoTracking()
            .Where(o => o.Phone == phone && o.CreatedAt >= windowStart)
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => o.CreatedAt)
            .ToListAsync(ct);

        if (recent.Count >= _otp.MaxSendsPerWindow)
            return Error.TooMany("otp.too_many", $"تعداد درخواست کد زیاد است. {_otp.WindowMinutes} دقیقه‌ی دیگر دوباره تلاش کنید.");
        if (recent.Count > 0 && now - recent[0] < TimeSpan.FromSeconds(_otp.ResendCooldownSeconds))
            return Error.TooMany("otp.cooldown", "لطفاً چند لحظه صبر کنید و دوباره درخواست کد بدهید.");

        // Invalidate previous unused codes for this phone.
        await db.OtpCodes.Where(o => o.Phone == phone && !o.Used)
            .ExecuteUpdateAsync(s => s.SetProperty(o => o.Used, true), ct);

        var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        db.OtpCodes.Add(new OtpCode
        {
            Phone = phone,
            CodeHash = HashCode(phone, code),
            CreatedAt = now,
            ExpiresAt = now.AddSeconds(_otp.CodeLifetimeSeconds),
            RequestIp = http.HttpContext?.Connection.RemoteIpAddress?.ToString()
        });
        await db.SaveChangesAsync(ct);

        await sms.SendOtpAsync(phone, code, ct);
        return new OtpSentResponse(_otp.CodeLifetimeSeconds, _otp.ResendCooldownSeconds);
    }

    public async Task<Result<AuthTokens>> VerifyOtpAsync(VerifyOtpRequest request, CancellationToken ct)
    {
        IranValidators.TryNormalizeMobile(request.Phone, out var phone);
        var code = IranValidators.NormalizeDigits(request.Code.Trim());
        var now = clock.GetUtcNow();
        var invalid = Error.Unauthorized("otp.invalid", "کد تأیید نادرست یا منقضی شده است.");

        var otp = await db.OtpCodes.AsNoTracking()
            .Where(o => o.Phone == phone && !o.Used)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (otp is null || otp.ExpiresAt <= now) return invalid;

        // Atomic attempt counter: parallel guesses cannot all read "0 attempts" and bypass the limit.
        var counted = await db.OtpCodes
            .Where(o => o.Id == otp.Id && !o.Used && o.Attempts < _otp.MaxAttempts)
            .ExecuteUpdateAsync(s => s.SetProperty(o => o.Attempts, o => o.Attempts + 1), ct);
        if (counted == 0)
        {
            await db.OtpCodes.Where(o => o.Id == otp.Id).ExecuteUpdateAsync(s => s.SetProperty(o => o.Used, true), ct);
            return Error.TooMany("otp.locked", "تعداد تلاش‌ها زیاد بود. کد جدید درخواست کنید.");
        }

        var expected = Convert.FromHexString(otp.CodeHash);
        var actual = Convert.FromHexString(HashCode(phone, code));
        if (!CryptographicOperations.FixedTimeEquals(expected, actual))
            return invalid;

        // Consume the code exactly once, even if the right code is submitted twice at the same moment.
        var consumed = await db.OtpCodes
            .Where(o => o.Id == otp.Id && !o.Used)
            .ExecuteUpdateAsync(s => s.SetProperty(o => o.Used, true), ct);
        if (consumed == 0) return invalid;

        var user = await users.Users.FirstOrDefaultAsync(u => u.PhoneNumber == phone, ct);
        if (user is null)
        {
            user = new ApplicationUser
            {
                UserName = phone,
                PhoneNumber = phone,
                PhoneNumberConfirmed = true,
                FullName = string.IsNullOrWhiteSpace(request.FullName) ? null : request.FullName.Trim(),
                CreatedAt = now
            };
            var created = await users.CreateAsync(user);
            if (created.Succeeded)
                await users.AddToRoleAsync(user, Roles.Customer);
            else
            {
                // A parallel first login may have created the account a moment ago.
                user = await users.Users.FirstOrDefaultAsync(u => u.PhoneNumber == phone, ct);
                if (user is null)
                    return Error.Validation("user.create_failed", "ساخت حساب کاربری انجام نشد.");
            }
        }

        if (await users.IsLockedOutAsync(user))
            return Error.Forbidden("user.locked", "حساب کاربری شما موقتاً قفل است.");

        return await IssueTokensAsync(user, familyId: Guid.NewGuid(), ct);
    }

    public async Task<Result<AuthTokens>> RefreshAsync(string refreshToken, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var hash = TokenService.Hash(refreshToken);
        var stored = await db.RefreshTokens.AsNoTracking().FirstOrDefaultAsync(t => t.TokenHash == hash, ct);
        var invalid = Error.Unauthorized("auth.invalid_refresh", "نشست شما منقضی شده است. دوباره وارد شوید.");

        if (stored is null) return invalid;

        async Task RevokeFamily() =>
            await db.RefreshTokens.Where(t => t.FamilyId == stored.FamilyId && t.RevokedAt == null)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, now), ct);

        if (stored.RevokedAt is not null)
        {
            // Reuse of a rotated token = likely theft → revoke the whole family.
            await RevokeFamily();
            return invalid;
        }

        if (stored.ExpiresAt <= now) return invalid;

        var user = await users.FindByIdAsync(stored.UserId.ToString());
        if (user is null || await users.IsLockedOutAsync(user)) return invalid;

        // Atomic rotation: if two requests present the same token at once, only one wins;
        // the loser is treated as reuse and the whole family is revoked.
        var rotated = await db.RefreshTokens
            .Where(t => t.Id == stored.Id && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, now), ct);
        if (rotated == 0)
        {
            await RevokeFamily();
            return invalid;
        }

        var result = await IssueTokensAsync(user, stored.FamilyId, ct);
        if (result.IsSuccess)
        {
            var newHash = TokenService.Hash(result.Value.RefreshToken);
            var newId = await db.RefreshTokens.Where(t => t.TokenHash == newHash).Select(t => t.Id).FirstAsync(ct);
            await db.RefreshTokens.Where(t => t.Id == stored.Id)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.ReplacedById, newId), ct);
        }
        return result;
    }

    public async Task RevokeAsync(string refreshToken, CancellationToken ct)
    {
        var hash = TokenService.Hash(refreshToken);
        var stored = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (stored is null) return;
        await db.RefreshTokens.Where(t => t.FamilyId == stored.FamilyId && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, clock.GetUtcNow()), ct);
    }

    public async Task<Result<AuthTokens>> DemoSignInAsync(string role, CancellationToken ct)
    {
        if (role is not (Roles.Admin or Roles.Staff))
            return Error.Validation("demo.role", "نقش نامعتبر است.");
        var user = (await users.GetUsersInRoleAsync(role)).OrderBy(u => u.CreatedAt).FirstOrDefault();
        if (user is null) return Error.NotFound("demo.no_user", "حساب نمایشی پیدا نشد.");
        return await IssueTokensAsync(user, familyId: Guid.NewGuid(), ct);
    }

    public async Task<bool> HasAdminAsync(CancellationToken ct) => (await users.GetUsersInRoleAsync(Roles.Admin)).Count > 0;

    public async Task<Result<AuthTokens>> ClaimFirstAdminAsync(string phoneInput, string? fullName, CancellationToken ct)
    {
        IranValidators.TryNormalizeMobile(phoneInput, out var phone);
        var user = await users.Users.FirstOrDefaultAsync(u => u.PhoneNumber == phone, ct);
        if (await HasAdminAsync(ct))
        {
            // Site already has an admin: the setup key works as the admin's sign-in (useful before an SMS panel is connected).
            if (user is null || !await users.IsInRoleAsync(user, Roles.Admin))
                return Error.Forbidden("setup.not_admin", "این شماره مدیر این سایت نیست.");
            return await IssueTokensAsync(user, familyId: Guid.NewGuid(), ct);
        }
        if (user is null)
        {
            user = new ApplicationUser
            {
                UserName = phone, PhoneNumber = phone, PhoneNumberConfirmed = true,
                FullName = string.IsNullOrWhiteSpace(fullName) ? "مدیر سایت" : fullName.Trim(), CreatedAt = clock.GetUtcNow()
            };
            var created = await users.CreateAsync(user);
            if (!created.Succeeded) return Error.Conflict("setup.create_failed", "ساخت حساب مدیر انجام نشد.");
        }
        if (!await users.IsInRoleAsync(user, Roles.Admin)) await users.AddToRoleAsync(user, Roles.Admin);
        return await IssueTokensAsync(user, familyId: Guid.NewGuid(), ct);
    }

    private async Task<Result<AuthTokens>> IssueTokensAsync(ApplicationUser user, Guid familyId, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var roles = (await users.GetRolesAsync(user)).ToList();
        var (access, accessExpires) = tokens.CreateAccessToken(user, roles);

        var raw = TokenService.CreateRefreshToken();
        var refresh = new RefreshToken
        {
            UserId = user.Id,
            FamilyId = familyId,
            TokenHash = TokenService.Hash(raw),
            CreatedAt = now,
            ExpiresAt = now.AddDays(jwtOptions.Value.RefreshTokenDays)
        };
        db.RefreshTokens.Add(refresh);
        await db.SaveChangesAsync(ct);

        return new AuthTokens(access, accessExpires, raw, refresh.ExpiresAt,
            new UserInfo(user.Id, user.PhoneNumber!, user.FullName, roles));
    }

    private string HashCode(string phone, string code)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_otp.HashKey));
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes($"{phone}:{code}")));
    }
}
