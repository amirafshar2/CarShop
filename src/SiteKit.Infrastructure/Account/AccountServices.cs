using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;
using SiteKit.Application.Abstractions;
using SiteKit.Application.Account;
using SiteKit.Application.Common;
using SiteKit.Application.Leads;
using SiteKit.Domain.Listings;
using SiteKit.Domain.Common;
using SiteKit.Domain.Leads;
using SiteKit.Infrastructure.Identity;
using SiteKit.Infrastructure.Persistence;

namespace SiteKit.Infrastructure.Account;

public sealed class AccountService(AppDbContext db, UserManager<ApplicationUser> users) : IAccountService
{
    private static readonly Error NotFound = Error.NotFound("user.not_found", "کاربر پیدا نشد.");

    public async Task<Result<MeDto>> GetMeAsync(Guid userId, CancellationToken ct)
    {
        var user = await users.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return NotFound;
        return new MeDto(user.Id, user.PhoneNumber ?? "", user.FullName, (await users.GetRolesAsync(user)).ToList(), user.CreatedAt);
    }

    public async Task<Result<MeDto>> UpdateProfileAsync(Guid userId, UpdateProfileRequest request, CancellationToken ct)
    {
        var user = await users.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return NotFound;
        user.FullName = string.IsNullOrWhiteSpace(request.FullName) ? null : request.FullName.Trim();
        await users.UpdateAsync(user);
        return await GetMeAsync(userId, ct);
    }

    public async Task<bool> IsStaffPhoneAsync(string normalizedPhone, CancellationToken ct)
    {
        var user = await users.Users.AsNoTracking().FirstOrDefaultAsync(u => u.PhoneNumber == normalizedPhone, ct);
        if (user is null) return false;
        var roles = await users.GetRolesAsync(user);
        return roles.Contains(Roles.Admin) || roles.Contains(Roles.Staff);
    }

    public async Task<IReadOnlyList<MyLeadDto>> MyLeadsAsync(Guid userId, CancellationToken ct)
    {
        var phone = await users.Users.Where(u => u.Id == userId).Select(u => u.PhoneNumber).FirstOrDefaultAsync(ct);
        if (string.IsNullOrEmpty(phone)) return [];
        return await (from l in db.Leads.AsNoTracking()
                      where l.Phone == phone
                      orderby l.CreatedAt descending
                      select new MyLeadDto(l.Id, l.Type, l.Message, l.Status, l.CreatedAt,
                          db.Listings.Where(c => c.Id == l.ListingId).Select(c => c.Title).FirstOrDefault(),
                          db.Listings.Where(c => c.Id == l.ListingId).Select(c => c.Slug).FirstOrDefault()))
            .Take(50).ToListAsync(ct);
    }
}

public sealed class AdminService(AppDbContext db, UserManager<ApplicationUser> users, TimeProvider clock) : IAdminService
{
    public async Task<DashboardStatsDto> StatsAsync(CancellationToken ct)
    {
        var byStatus = await db.Listings.AsNoTracking().GroupBy(c => c.Status)
            .Select(g => new { g.Key, Count = g.Count() }).ToListAsync(ct);
        int Count(ListingStatus s) => byStatus.FirstOrDefault(x => x.Key == s)?.Count ?? 0;

        var customerRoleId = await db.Roles.Where(r => r.Name == Roles.Customer).Select(r => r.Id).FirstOrDefaultAsync(ct);
        var recent = await db.Leads.AsNoTracking().OrderByDescending(l => l.CreatedAt).Take(6)
            .Select(l => new LeadDto(l.Id, l.Name, l.Phone, l.Type, l.ListingId, l.Message, l.Status, l.AssignedStaffId, l.CreatedAt))
            .ToListAsync(ct);

        return new DashboardStatsDto(
            Count(ListingStatus.Published), Count(ListingStatus.Draft), Count(ListingStatus.Hidden), Count(ListingStatus.SoldOut),
            await db.Leads.CountAsync(l => l.Status == LeadStatus.New, ct),
            await db.Leads.CountAsync(ct),
            await db.ServiceItems.CountAsync(s => s.IsActive, ct),
            await db.UserRoles.CountAsync(ur => ur.RoleId == customerRoleId, ct),
            recent);
    }

    public async Task<PagedResult<AdminUserDto>> UsersAsync(string? search, string? role, int page, int pageSize, CancellationToken ct)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var q = db.Users.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = IranValidators.NormalizeDigits(search.Trim());
            q = q.Where(u => (u.PhoneNumber != null && u.PhoneNumber.Contains(term)) || (u.FullName != null && u.FullName.Contains(term)));
        }
        if (!string.IsNullOrWhiteSpace(role))
        {
            var roleId = await db.Roles.Where(r => r.Name == role).Select(r => r.Id).FirstOrDefaultAsync(ct);
            q = q.Where(u => db.UserRoles.Any(ur => ur.UserId == u.Id && ur.RoleId == roleId));
        }
        var total = await q.CountAsync(ct);
        var rows = await q.OrderByDescending(u => u.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(u => new
            {
                u.Id, u.PhoneNumber, u.FullName, u.CreatedAt,
                Roles = (from ur in db.UserRoles join r in db.Roles on ur.RoleId equals r.Id where ur.UserId == u.Id select r.Name).ToList()
            })
            .ToListAsync(ct);
        return new PagedResult<AdminUserDto>(
            rows.Select(u => new AdminUserDto(u.Id, u.PhoneNumber ?? "", u.FullName, u.Roles.Where(r => r != null).Select(r => r!).ToList(), u.CreatedAt)).ToList(),
            page, pageSize, total);
    }

    public async Task<Result<AdminUserDto>> CreateUserAsync(CreateUserRequest request, CancellationToken ct)
    {
        IranValidators.TryNormalizeMobile(request.Phone, out var phone);
        var user = await users.Users.FirstOrDefaultAsync(u => u.PhoneNumber == phone, ct);
        if (user is null)
        {
            user = new ApplicationUser
            {
                UserName = phone, PhoneNumber = phone, PhoneNumberConfirmed = true,
                FullName = string.IsNullOrWhiteSpace(request.FullName) ? null : request.FullName.Trim(),
                CreatedAt = clock.GetUtcNow()
            };
            var created = await users.CreateAsync(user);
            if (!created.Succeeded)
                return Error.Conflict("user.create_failed", "ساخت کاربر انجام نشد.");
        }
        var set = await ApplyRoleAsync(user, request.Role);
        if (set.IsFailure) return set.Error!;
        return new AdminUserDto(user.Id, phone, user.FullName, (await users.GetRolesAsync(user)).ToList(), user.CreatedAt);
    }

    public async Task<Result> SetRoleAsync(Guid actingAdminId, Guid userId, string role, CancellationToken ct)
    {
        if (actingAdminId == userId && role != Roles.Admin)
            return Result.Failure(Error.Conflict("user.self_demote", "نمی‌توانید نقش مدیر را از حساب خودتان بردارید."));
        var user = await users.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return Result.Failure(Error.NotFound("user.not_found", "کاربر پیدا نشد."));
        return await ApplyRoleAsync(user, role);
    }

    /// <summary>A user has exactly one role. Admin/Staff accounts keep working as customers too.</summary>
    private async Task<Result> ApplyRoleAsync(ApplicationUser user, string role)
    {
        var current = await users.GetRolesAsync(user);
        var remove = current.Where(r => r != role).ToList();
        if (remove.Count > 0) await users.RemoveFromRolesAsync(user, remove);
        if (!current.Contains(role)) await users.AddToRoleAsync(user, role);
        return Result.Success();
    }
}
