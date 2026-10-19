using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SiteKit.Application.Abstractions;
using SiteKit.Application.Site;
using SiteKit.Domain.Common;
using SiteKit.Infrastructure.Auth;
using SiteKit.Infrastructure.Identity;

namespace SiteKit.Infrastructure.Persistence;

/// <summary>
/// Roles, optional admin/staff accounts (phones from configuration) and — on the very first start only —
/// the site itself in the configured mode: blank, demo or from a content package.
/// </summary>
public sealed class DbSeeder(
    AppDbContext db,
    RoleManager<IdentityRole<Guid>> roles,
    UserManager<ApplicationUser> users,
    ISiteService site,
    TimeProvider clock,
    IOptions<SeedOptions> options,
    ILogger<DbSeeder> logger)
{
    public async Task SeedAsync(CancellationToken ct = default)
    {
        foreach (var role in new[] { Roles.Admin, Roles.Staff, Roles.Customer })
            if (!await roles.RoleExistsAsync(role))
                await roles.CreateAsync(new IdentityRole<Guid>(role));

        var o = options.Value;
        if (IranValidators.TryNormalizeMobile(o.AdminPhone, out var adminPhone))
            await EnsureUserAsync(adminPhone, "مدیر سایت", Roles.Admin);
        foreach (var staff in o.StaffPhones)
            if (IranValidators.TryNormalizeMobile(staff, out var staffPhone))
                await EnsureUserAsync(staffPhone, "کارمند", Roles.Staff);

        if (await db.SiteSettings.AnyAsync(ct)) return;

        SitePackage? package = null;
        if (o.Mode.Equals("content", StringComparison.OrdinalIgnoreCase))
        {
            if (string.IsNullOrWhiteSpace(o.ContentFile) || !File.Exists(o.ContentFile))
                throw new InvalidOperationException($"Seed:Mode=content needs Seed:ContentFile pointing to an exported package (got '{o.ContentFile}').");
            package = JsonSerializer.Deserialize<SitePackage>(await File.ReadAllTextAsync(o.ContentFile, ct), SiteJson.Options)
                      ?? throw new InvalidOperationException("Content package is empty.");
        }
        await site.InitialiseAsync(o.Mode, o.Preset, package, ct, o.Publish);
        logger.LogInformation("Site initialised: mode {Mode}, preset {Preset}", o.Mode, package?.Preset ?? o.Preset);
    }

    private async Task EnsureUserAsync(string phone, string name, string role)
    {
        var user = await users.Users.FirstOrDefaultAsync(u => u.PhoneNumber == phone);
        if (user is null)
        {
            user = new ApplicationUser
            {
                UserName = phone, PhoneNumber = phone, PhoneNumberConfirmed = true,
                FullName = name, CreatedAt = clock.GetUtcNow()
            };
            await users.CreateAsync(user);
        }
        if (!await users.IsInRoleAsync(user, role))
            await users.AddToRoleAsync(user, role);
    }
}
