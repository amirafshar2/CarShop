using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Moraveji.Api.Infrastructure;
using Moraveji.Application.Auth;

namespace Moraveji.Api.Controllers;

public sealed record AccessTokenResponse(string AccessToken, DateTimeOffset ExpiresAt, UserInfo User);

[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController(IAuthService auth, IWebHostEnvironment env, IConfiguration config) : ControllerBase
{
    public const string RefreshCookie = "mm_rt";

    /// <summary>Sends a 6-digit login code by SMS.</summary>
    [HttpPost("otp")]
    [EnableRateLimiting(RateLimitPolicies.Otp)]
    [ProducesResponseType<OtpSentResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> RequestOtp(RequestOtpRequest request, CancellationToken ct)
    {
        var result = await auth.RequestOtpAsync(request, ct);
        if (result.IsFailure) return this.ToProblem(result.Error!);

        // No real SMS outside Production → the login page shows the code.
        // Development: always. Public demo: only for customer phones — admin/staff codes stay in the server log.
        if (!env.IsProduction()
            && HttpContext.RequestServices.GetService<IDevOtpPeek>() is { } peek
            && Moraveji.Domain.Common.IranValidators.TryNormalizeMobile(request.Phone, out var phone))
        {
            var reveal = env.IsDevelopment()
                || (config.GetValue<bool>("Demo:RevealCustomerOtp")
                    && !await HttpContext.RequestServices.GetRequiredService<Moraveji.Application.Account.IAccountService>().IsStaffPhoneAsync(phone, ct));
            if (reveal) return Ok(result.Value with { DevCode = peek.Peek(phone) });
        }

        return Ok(result.Value);
    }

    /// <summary>Verifies the code. Returns a short-lived access token; the refresh token goes into an HttpOnly cookie.</summary>
    [HttpPost("verify")]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [ProducesResponseType<AccessTokenResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Verify(VerifyOtpRequest request, CancellationToken ct)
    {
        var result = await auth.VerifyOtpAsync(request, ct);
        if (result.IsFailure) return this.ToProblem(result.Error!);
        return TokensResponse(result.Value);
    }

    /// <summary>Rotates the refresh token (cookie) and returns a new access token.</summary>
    [HttpPost("refresh")]
    [EnableRateLimiting(RateLimitPolicies.Refresh)]
    [ProducesResponseType<AccessTokenResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Refresh(CancellationToken ct)
    {
        if (!Request.Cookies.TryGetValue(RefreshCookie, out var token) || string.IsNullOrWhiteSpace(token))
            return Unauthorized();

        var result = await auth.RefreshAsync(token, ct);
        if (result.IsFailure)
        {
            Response.Cookies.Delete(RefreshCookie, CookieOptions(DateTimeOffset.UnixEpoch));
            return this.ToProblem(result.Error!);
        }
        return TokensResponse(result.Value);
    }

    /// <summary>Is the one-click demo login (admin/staff) available on this server?</summary>
    [HttpGet("demo")]
    public IActionResult DemoInfo() => Ok(new DemoInfoResponse(DemoEnabled, RequiresDemoKey));

    /// <summary>
    /// Presentation helper: sign in as the demo admin/staff without SMS.
    /// Development: no key needed. Public demo (e.g. Render): needs the secret Demo:AccessKey. Production: disabled.
    /// </summary>
    [HttpPost("demo-login")]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [ProducesResponseType<AccessTokenResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> DemoLogin(DemoLoginRequest request, CancellationToken ct)
    {
        if (!DemoEnabled) return NotFound();
        if (RequiresDemoKey)
        {
            var expected = System.Text.Encoding.UTF8.GetBytes(config["Demo:AccessKey"]!);
            var actual = System.Text.Encoding.UTF8.GetBytes(request.Key?.Trim() ?? "");
            if (!System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(expected, actual))
                return Problem(title: "رمز ورود نمایشی نادرست است.", statusCode: StatusCodes.Status401Unauthorized);
        }
        var result = await auth.DemoSignInAsync(request.Role, ct);
        return result.IsSuccess ? TokensResponse(result.Value) : this.ToProblem(result.Error!);
    }

    /// <summary>Demo:OpenAccess = true → public demo without a key (one click for visitors). Never in Production.</summary>
    private bool DemoOpen => env.IsDevelopment() || config.GetValue<bool>("Demo:OpenAccess");
    private bool RequiresDemoKey => !DemoOpen;
    private bool DemoEnabled => !env.IsProduction()
        && (DemoOpen || (config["Demo:AccessKey"]?.Trim().Length ?? 0) >= 6);

    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        if (Request.Cookies.TryGetValue(RefreshCookie, out var token) && !string.IsNullOrWhiteSpace(token))
            await auth.RevokeAsync(token, ct);
        Response.Cookies.Delete(RefreshCookie, CookieOptions(DateTimeOffset.UnixEpoch));
        return NoContent();
    }

    private IActionResult TokensResponse(AuthTokens tokens)
    {
        Response.Cookies.Append(RefreshCookie, tokens.RefreshToken, CookieOptions(tokens.RefreshTokenExpiresAt));
        return Ok(new AccessTokenResponse(tokens.AccessToken, tokens.AccessTokenExpiresAt, tokens.User));
    }

    private CookieOptions CookieOptions(DateTimeOffset expires) => new()
    {
        HttpOnly = true,
        Secure = !env.IsDevelopment() || Request.IsHttps,
        SameSite = SameSiteMode.Strict,
        Path = "/api/v1/auth",
        Expires = expires,
        IsEssential = true
    };
}
