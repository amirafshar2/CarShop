using FluentValidation;
using Moraveji.Domain.Common;

namespace Moraveji.Application.Auth;

public sealed record RequestOtpRequest(string Phone);

public sealed record VerifyOtpRequest(string Phone, string Code, string? FullName);

public sealed record AuthTokens(string AccessToken, DateTimeOffset AccessTokenExpiresAt, string RefreshToken, DateTimeOffset RefreshTokenExpiresAt, UserInfo User);

public sealed record UserInfo(Guid Id, string Phone, string? FullName, IReadOnlyList<string> Roles);

public sealed record DemoLoginRequest(string Role, string? Key);

public sealed record DemoInfoResponse(bool Enabled, bool RequiresKey);

public sealed record OtpSentResponse(int ExpiresInSeconds, int ResendAfterSeconds, string? DevCode = null);

/// <summary>Development only: lets the API show the last OTP on the login page (no real SMS in dev).</summary>
public interface IDevOtpPeek
{
    string? Peek(string normalizedPhone);
}

public interface IAuthService
{
    Task<Result<OtpSentResponse>> RequestOtpAsync(RequestOtpRequest request, CancellationToken ct);
    Task<Result<AuthTokens>> VerifyOtpAsync(VerifyOtpRequest request, CancellationToken ct);
    Task<Result<AuthTokens>> RefreshAsync(string refreshToken, CancellationToken ct);
    Task RevokeAsync(string refreshToken, CancellationToken ct);
    /// <summary>Demo/development only: signs in as the first account with the given role (Admin/Staff). The caller checks the access key.</summary>
    Task<Result<AuthTokens>> DemoSignInAsync(string role, CancellationToken ct);
}

public interface ISmsSender
{
    Task SendOtpAsync(string phone, string code, CancellationToken ct);
}

public sealed class RequestOtpRequestValidator : AbstractValidator<RequestOtpRequest>
{
    public RequestOtpRequestValidator()
    {
        RuleFor(x => x.Phone).Must(p => IranValidators.TryNormalizeMobile(p, out _)).WithMessage("شماره موبایل نامعتبر است.");
    }
}

public sealed class VerifyOtpRequestValidator : AbstractValidator<VerifyOtpRequest>
{
    public VerifyOtpRequestValidator()
    {
        RuleFor(x => x.Phone).Must(p => IranValidators.TryNormalizeMobile(p, out _)).WithMessage("شماره موبایل نامعتبر است.");
        RuleFor(x => x.Code).Must(c => IranValidators.NormalizeDigits(c ?? "").Length == 6 && IranValidators.NormalizeDigits(c!).All(char.IsAsciiDigit))
            .WithMessage("کد تأیید باید ۶ رقم باشد.");
        RuleFor(x => x.FullName).MaximumLength(80);
    }
}
