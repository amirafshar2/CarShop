using System.Security.Cryptography;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using SiteKit.Application.Abstractions;
using SiteKit.Application.Auth;
using SiteKit.Infrastructure.Auth;
using SiteKit.Infrastructure.Identity;
using SiteKit.Infrastructure.Persistence;
using SiteKit.Infrastructure.Sms;

namespace SiteKit.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config, IHostEnvironment env)
    {
        var provider = config["Database:Provider"] ?? "Sqlite";
        var connection = config.GetConnectionString("Default")
                         ?? throw new InvalidOperationException("ConnectionStrings:Default is not configured.");

        services.AddDbContext<AppDbContext>(o =>
        {
            if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
                o.UseSqlServer(connection, sql => sql.EnableRetryOnFailure());
            else
                o.UseSqlite(connection);
        });
        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());
        services.AddSingleton<IPersistenceConflictDetector, PersistenceConflictDetector>();

        services.AddIdentityCore<ApplicationUser>(o =>
            {
                o.User.RequireUniqueEmail = false;
                o.Lockout.MaxFailedAccessAttempts = 5;
                o.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
            })
            .AddRoles<IdentityRole<Guid>>()
            .AddEntityFrameworkStores<AppDbContext>();

        services.Configure<JwtOptions>(config.GetSection(JwtOptions.Section));
        services.Configure<OtpOptions>(config.GetSection(OtpOptions.Section));
        services.Configure<SmsOptions>(config.GetSection(SmsOptions.Section));
        services.Configure<SeedOptions>(config.GetSection(SeedOptions.Section));
        services.PostConfigure<JwtOptions>(o => o.SigningKey = RequireSecret(o.SigningKey, "Jwt:SigningKey", env));
        services.PostConfigure<OtpOptions>(o => o.HashKey = RequireSecret(o.HashKey, "Otp:HashKey", env));

        services.AddHttpContextAccessor();
        services.AddSingleton<TokenService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<DbSeeder>();
        services.AddScoped<SiteKit.Application.Account.IAccountService, Account.AccountService>();
        services.AddScoped<SiteKit.Application.Account.IAdminService, Account.AdminService>();

        if ((config["Sms:Provider"] ?? "Console").Equals("Kavenegar", StringComparison.OrdinalIgnoreCase))
            services.AddHttpClient<ISmsSender, KavenegarSmsSender>(c => c.Timeout = TimeSpan.FromSeconds(10));
        else
        {
            if (env.IsProduction())
                throw new InvalidOperationException("Console SMS sender must not be used in Production. Set Sms:Provider=Kavenegar.");
            services.AddSingleton<ConsoleSmsSender>();
            services.AddSingleton<ISmsSender>(sp => sp.GetRequiredService<ConsoleSmsSender>());
            services.AddSingleton<IDevOtpPeek>(sp => sp.GetRequiredService<ConsoleSmsSender>());
        }

        return services;
    }

    // Secrets never live in source code. In Development/Testing a random per-process key is generated
    // so the project runs out of the box; in Production a missing secret stops the app.
    private static readonly Dictionary<string, string> EphemeralSecrets = new();

    private static string RequireSecret(string value, string name, IHostEnvironment env)
    {
        if (!string.IsNullOrWhiteSpace(value))
        {
            if (value.Length < 32) throw new InvalidOperationException($"{name} must be at least 32 characters.");
            return value;
        }
        if (env.IsProduction())
            throw new InvalidOperationException($"{name} is missing. Set it via environment variables.");

        lock (EphemeralSecrets)
        {
            if (!EphemeralSecrets.TryGetValue(name, out var secret))
                EphemeralSecrets[name] = secret = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
            return secret;
        }
    }
}
