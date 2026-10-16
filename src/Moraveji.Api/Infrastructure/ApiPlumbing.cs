using System.Diagnostics;
using System.Security.Claims;
using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Moraveji.Application.Abstractions;
using Moraveji.Domain.Common;

namespace Moraveji.Api.Infrastructure;

public sealed class HttpCurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    public Guid? UserId
    {
        get
        {
            var sub = accessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier)
                      ?? accessor.HttpContext?.User.FindFirstValue("sub");
            return Guid.TryParse(sub, out var id) ? id : null;
        }
    }

    public bool IsInRole(string role) => accessor.HttpContext?.User.IsInRole(role) ?? false;
}

/// <summary>Maps domain <see cref="Result"/> errors to RFC 9457 ProblemDetails with the right status code.</summary>
public static class ResultHttpExtensions
{
    public static IActionResult ToProblem(this ControllerBase controller, Error error)
    {
        var status = error.Type switch
        {
            ErrorType.Validation => StatusCodes.Status422UnprocessableEntity,
            ErrorType.NotFound => StatusCodes.Status404NotFound,
            ErrorType.Conflict => StatusCodes.Status409Conflict,
            ErrorType.Unauthorized => StatusCodes.Status401Unauthorized,
            ErrorType.Forbidden => StatusCodes.Status403Forbidden,
            ErrorType.TooManyRequests => StatusCodes.Status429TooManyRequests,
            _ => StatusCodes.Status400BadRequest
        };

        var problem = new ProblemDetails
        {
            Status = status,
            Title = error.Message,
            Type = $"https://httpstatuses.io/{status}",
            Extensions = { ["code"] = error.Code, ["traceId"] = Activity.Current?.Id ?? controller.HttpContext.TraceIdentifier }
        };
        return new ObjectResult(problem) { StatusCode = status };
    }
}

/// <summary>Runs FluentValidation for every action argument that has a registered validator → 422.</summary>
public sealed class ValidationFilter(IServiceProvider services) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        foreach (var argument in context.ActionArguments.Values.Where(a => a is not null))
        {
            var validatorType = typeof(IValidator<>).MakeGenericType(argument!.GetType());
            if (services.GetService(validatorType) is not IValidator validator) continue;

            var result = await validator.ValidateAsync(new ValidationContext<object>(argument), context.HttpContext.RequestAborted);
            if (result.IsValid) continue;

            var errors = result.Errors
                .GroupBy(e => e.PropertyName)
                .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).Distinct().ToArray());
            var problem = new ValidationProblemDetails(errors)
            {
                Status = StatusCodes.Status422UnprocessableEntity,
                Title = "اطلاعات ارسال‌شده معتبر نیست.",
                Extensions = { ["traceId"] = Activity.Current?.Id ?? context.HttpContext.TraceIdentifier }
            };
            context.Result = new ObjectResult(problem) { StatusCode = StatusCodes.Status422UnprocessableEntity };
            return;
        }
        await next();
    }
}

/// <summary>Last line of defence: unexpected exceptions become a generic 500 — no stack trace leaks.</summary>
public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger, IProblemDetailsService problems) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext http, Exception exception, CancellationToken ct)
    {
        if (exception is OperationCanceledException && http.RequestAborted.IsCancellationRequested)
            return true;

        logger.LogError(exception, "Unhandled exception");
        http.Response.StatusCode = StatusCodes.Status500InternalServerError;
        return await problems.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = http,
            Exception = exception,
            ProblemDetails = new ProblemDetails
            {
                Status = 500,
                Title = "خطای غیرمنتظره‌ای رخ داد. لطفاً دوباره تلاش کنید.",
                Extensions = { ["traceId"] = Activity.Current?.Id ?? http.TraceIdentifier }
            }
        });
    }
}

public static class SecurityHeaders
{
    public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder app) => app.Use(async (ctx, next) =>
    {
        var h = ctx.Response.Headers;
        h["X-Content-Type-Options"] = "nosniff";
        h["X-Frame-Options"] = "DENY";
        h["Referrer-Policy"] = "strict-origin-when-cross-origin";
        h["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
        h["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'";
        h["Cross-Origin-Opener-Policy"] = "same-origin";
        await next();
    });
}
