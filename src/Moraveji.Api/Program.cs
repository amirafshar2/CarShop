using Microsoft.EntityFrameworkCore;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Moraveji.Api.Infrastructure;
using Moraveji.Application;
using Moraveji.Application.Abstractions;
using Moraveji.Infrastructure;
using Moraveji.Infrastructure.Auth;
using Moraveji.Infrastructure.Persistence;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// ---------- Logging (structured; request logs use the path only — query strings are never logged) ----------
builder.Host.UseSerilog((ctx, cfg) => cfg
    .ReadFrom.Configuration(ctx.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console());

// ---------- Layers ----------
builder.Services.AddApplication(builder.Configuration);
builder.Services.AddInfrastructure(builder.Configuration, builder.Environment);
builder.Services.AddScoped<ICurrentUser, HttpCurrentUser>();

// ---------- MVC, validation, errors ----------
builder.Services.AddControllers(o => o.Filters.Add<ValidationFilter>())
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()))
    .ConfigureApiBehaviorOptions(o => o.InvalidModelStateResponseFactory = ctx =>
    {
        // Malformed / incomplete JSON → same 422 shape as FluentValidation errors.
        var problem = new Microsoft.AspNetCore.Mvc.ValidationProblemDetails(ctx.ModelState)
        {
            Status = StatusCodes.Status422UnprocessableEntity,
            Title = "اطلاعات ارسال‌شده معتبر نیست.",
            Extensions = { ["traceId"] = System.Diagnostics.Activity.Current?.Id ?? ctx.HttpContext.TraceIdentifier }
        };
        return new Microsoft.AspNetCore.Mvc.ObjectResult(problem) { StatusCode = StatusCodes.Status422UnprocessableEntity };
    });
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddResponseCompression(o => o.EnableForHttps = true);
builder.Services.AddHealthChecks().AddDbContextCheck<AppDbContext>("database");

// ---------- Authentication / authorization ----------
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<IOptions<JwtOptions>>((bearer, jwt) =>
    {
        var o = jwt.Value;
        bearer.MapInboundClaims = true;
        bearer.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = o.Issuer,
            ValidateAudience = true,
            ValidAudience = o.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(o.SigningKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    });
builder.Services.AddAuthorizationBuilder()
    .AddPolicy(AuthPolicies.Admin, p => p.RequireRole(Roles.Admin))
    .AddPolicy(AuthPolicies.StaffOrAdmin, p => p.RequireRole(Roles.Admin, Roles.Staff));

// ---------- Real client IP behind a reverse proxy (Docker / Render / Nginx) ----------
// Without this, every visitor shares the proxy's IP and therefore one rate-limit bucket.
builder.Services.Configure<Microsoft.AspNetCore.Builder.ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor
                         | Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto;
    o.ForwardLimit = builder.Configuration.GetValue<int?>("ForwardedHeaders:ForwardLimit") ?? 1;
    foreach (var ip in builder.Configuration.GetSection("ForwardedHeaders:KnownProxies").Get<string[]>() ?? [])
        o.KnownProxies.Add(System.Net.IPAddress.Parse(ip));
    if (builder.Configuration.GetValue<bool>("ForwardedHeaders:TrustAllProxies"))
    {
        // Only for hosts whose proxy IPs are dynamic AND the app is not reachable except through that proxy.
        o.KnownNetworks.Clear();
        o.KnownProxies.Clear();
    }
});

// ---------- Rate limiting (per client IP) ----------
var limits = builder.Configuration.GetSection(RateLimitOptions.Section).Get<RateLimitOptions>() ?? new RateLimitOptions();
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    static string Ip(HttpContext c) => c.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    o.AddPolicy(RateLimitPolicies.Otp, c => RateLimitPartition.GetFixedWindowLimiter(Ip(c),
        _ => new FixedWindowRateLimiterOptions { PermitLimit = limits.OtpPerTenMinutes, Window = TimeSpan.FromMinutes(10) }));
    o.AddPolicy(RateLimitPolicies.Auth, c => RateLimitPartition.GetFixedWindowLimiter(Ip(c),
        _ => new FixedWindowRateLimiterOptions { PermitLimit = limits.AuthPerMinute, Window = TimeSpan.FromMinutes(1) }));
    // Silent token refresh happens on every full page load, so it gets its own, roomier budget.
    o.AddPolicy(RateLimitPolicies.Refresh, c => RateLimitPartition.GetFixedWindowLimiter(Ip(c),
        _ => new FixedWindowRateLimiterOptions { PermitLimit = limits.RefreshPerMinute, Window = TimeSpan.FromMinutes(1) }));
    o.AddPolicy(RateLimitPolicies.Forms, c => RateLimitPartition.GetFixedWindowLimiter(Ip(c),
        _ => new FixedWindowRateLimiterOptions { PermitLimit = limits.FormsPerMinute, Window = TimeSpan.FromMinutes(1) }));
});

// ---------- CORS: explicit whitelist only (never AllowAnyOrigin with credentials) ----------
var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(origins)
    .AllowAnyHeader()
    .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE")
    .AllowCredentials()));

// ---------- OpenAPI (Development only) ----------
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(o =>
{
    o.SwaggerDoc("v1", new OpenApiInfo { Title = "Moraveji Motors API", Version = "v1" });
    o.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http, Scheme = "bearer", BearerFormat = "JWT", In = ParameterLocation.Header
    });
    o.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        [new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }] = []
    });
});

var app = builder.Build();

app.UseForwardedHeaders();
app.UseExceptionHandler();
app.UseSecurityHeaders();
if (!app.Environment.IsDevelopment()) app.UseHsts();
app.UseResponseCompression();
app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapControllers();
app.MapHealthChecks("/health/live", new() { Predicate = _ => false });
app.MapHealthChecks("/health/ready");

// ---------- Database bootstrap ----------
// Development/Testing: create the schema automatically. Production: apply reviewed migration scripts instead.
if (!app.Environment.IsProduction())
{
    await using var scope = app.Services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.EnsureCreatedAsync();
    // Dev databases created by an older build lack newer tables → recreate (demo data only, nothing real is lost).
    if (app.Environment.IsDevelopment() && db.IsSqlite)
    {
        try { _ = await db.ServiceItems.IgnoreQueryFilters().AnyAsync(); }
        catch (Microsoft.Data.Sqlite.SqliteException)
        {
            app.Logger.LogWarning("Dev database schema is outdated — recreating it with demo data");
            await db.Database.EnsureDeletedAsync();
            await db.Database.EnsureCreatedAsync();
        }
    }
    await scope.ServiceProvider.GetRequiredService<DbSeeder>().SeedAsync();
}

app.Run();

public partial class Program; // for WebApplicationFactory in integration tests
