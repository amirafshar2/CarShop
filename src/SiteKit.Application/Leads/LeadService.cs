using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SiteKit.Application.Abstractions;
using SiteKit.Application.Common;
using SiteKit.Domain.Common;
using SiteKit.Domain.Leads;

namespace SiteKit.Application.Leads;

public sealed record CreateLeadRequest(string Name, string Phone, LeadType Type, Guid? ListingId, string? Message);

public sealed record LeadDto(Guid Id, string Name, string Phone, LeadType Type, Guid? ListingId, string? Message,
    LeadStatus Status, Guid? AssignedStaffId, DateTimeOffset CreatedAt);

public sealed class CreateLeadRequestValidator : AbstractValidator<CreateLeadRequest>
{
    public CreateLeadRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().WithMessage("نام الزامی است.").MaximumLength(80);
        RuleFor(x => x.Phone).Must(p => IranValidators.TryNormalizeMobile(p, out _)).WithMessage("شماره موبایل نامعتبر است.");
        RuleFor(x => x.Message).MaximumLength(1000);
        RuleFor(x => x.Type).IsInEnum();
    }
}

public interface ILeadService
{
    Task<Result<Guid>> CreateAsync(CreateLeadRequest request, CancellationToken ct);
    Task<PagedResult<LeadDto>> ListForCurrentUserAsync(int page, int pageSize, CancellationToken ct);
    Task<Result> UpdateStatusAsync(Guid id, LeadStatus status, CancellationToken ct);
}

public sealed class LeadService(IAppDbContext db, ICurrentUser user) : ILeadService
{
    public async Task<Result<Guid>> CreateAsync(CreateLeadRequest r, CancellationToken ct)
    {
        IranValidators.TryNormalizeMobile(r.Phone, out var phone);
        if (r.ListingId is { } listingId && !await db.Listings.AnyAsync(l => l.Id == listingId, ct))
            return Error.NotFound("listing.not_found", "مورد انتخاب‌شده پیدا نشد.");

        var lead = new Lead(r.Name, phone, r.Type, r.ListingId, r.Message);
        db.Leads.Add(lead);
        await db.SaveChangesAsync(ct);
        return lead.Id;
    }

    /// <summary>Resource-based access: staff see only their own leads plus the unassigned pool; admins see all.</summary>
    private IQueryable<Lead> VisibleLeads()
    {
        var leads = db.Leads.AsQueryable();
        if (user.IsInRole(Roles.Admin)) return leads;
        var me = user.UserId;
        return leads.Where(l => l.AssignedStaffId == null || l.AssignedStaffId == me);
    }

    public async Task<PagedResult<LeadDto>> ListForCurrentUserAsync(int page, int pageSize, CancellationToken ct)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = VisibleLeads().AsNoTracking();
        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(l => new LeadDto(l.Id, l.Name, l.Phone, l.Type, l.ListingId, l.Message, l.Status, l.AssignedStaffId, l.CreatedAt))
            .ToListAsync(ct);
        return new PagedResult<LeadDto>(items, page, pageSize, total);
    }

    public async Task<Result> UpdateStatusAsync(Guid id, LeadStatus status, CancellationToken ct)
    {
        var lead = await VisibleLeads().FirstOrDefaultAsync(l => l.Id == id, ct);
        if (lead is null) return Result.Failure(Error.NotFound("lead.not_found", "سرنخ پیدا نشد."));

        if (lead.AssignedStaffId is null && user.UserId is { } me && !user.IsInRole(Roles.Admin))
            lead.AssignTo(me); // staff claims the lead when they start working on it

        lead.ChangeStatus(status);
        await db.SaveChangesAsync(ct);
        return Result.Success();
    }
}
