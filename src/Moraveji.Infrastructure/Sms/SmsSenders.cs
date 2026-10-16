using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moraveji.Application.Auth;
using Moraveji.Infrastructure.Auth;

namespace Moraveji.Infrastructure.Sms;

/// <summary>Development only: writes the OTP to the log instead of sending an SMS.</summary>
public sealed class ConsoleSmsSender(ILogger<ConsoleSmsSender> logger) : ISmsSender, IDevOtpPeek
{
    private readonly System.Collections.Concurrent.ConcurrentDictionary<string, string> _last = new();

    public Task SendOtpAsync(string phone, string code, CancellationToken ct)
    {
        _last[phone] = code;
        logger.LogWarning("DEV OTP for {Phone}: {Code}", phone, code);
        return Task.CompletedTask;
    }

    public string? Peek(string normalizedPhone) => _last.TryGetValue(normalizedPhone, out var c) ? c : null;
}

/// <summary>Kavenegar "verify lookup" API (template-based OTP SMS).</summary>
public sealed class KavenegarSmsSender(HttpClient http, IOptions<SmsOptions> options, ILogger<KavenegarSmsSender> logger) : ISmsSender
{
    public async Task SendOtpAsync(string phone, string code, CancellationToken ct)
    {
        var o = options.Value;
        var url = $"https://api.kavenegar.com/v1/{Uri.EscapeDataString(o.ApiKey)}/verify/lookup.json" +
                  $"?receptor={Uri.EscapeDataString(phone)}&token={Uri.EscapeDataString(code)}&template={Uri.EscapeDataString(o.OtpTemplate)}";

        using var response = await http.PostAsync(url, content: null, ct);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogError("Kavenegar OTP send failed with status {Status}", (int)response.StatusCode);
            throw new InvalidOperationException("ارسال پیامک ناموفق بود.");
        }
    }
}
