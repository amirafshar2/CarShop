using FluentValidation;
using SiteKit.Application.Leads;
using SiteKit.Domain.Common;
using SiteKit.Domain.Leads;

namespace SiteKit.Application.Account;

public sealed record MeDto(Guid Id, string Phone, string? FullName, IReadOnlyList<string> Roles, DateTimeOffset CreatedAt);

public sealed record UpdateProfileRequest(string? FullName);

public sealed record MyLeadDto(Guid Id, LeadType Type, string? Message, LeadStatus Status, DateTimeOffset CreatedAt, string? ListingTitle, string? ListingSlug);

public sealed class UpdateProfileRequestValidator : AbstractValidator<UpdateProfileRequest>
{
    public UpdateProfileRequestValidator() =>
        RuleFor(x => x.FullName).MaximumLength(80).WithMessage("نام حداکثر ۸۰ حرف است.");
}

/// <summary>Everything the signed-in customer can see or do about their own account (never other users' data).</summary>
public interface IAccountService
{
    Task<Result<MeDto>> GetMeAsync(Guid userId, CancellationToken ct);
    Task<Result<MeDto>> UpdateProfileAsync(Guid userId, UpdateProfileRequest request, CancellationToken ct);
    Task<IReadOnlyList<MyLeadDto>> MyLeadsAsync(Guid userId, CancellationToken ct);
    /// <summary>True if the phone belongs to an admin or staff account.</summary>
    Task<bool> IsStaffPhoneAsync(string normalizedPhone, CancellationToken ct);
}

// ---------------- Admin ----------------

public sealed record DashboardStatsDto(
    int ListingsPublished, int ListingsDraft, int ListingsHidden, int ListingsSoldOut,
    int LeadsNew, int LeadsTotal, int ActiveServices, int Customers,
    IReadOnlyList<LeadDto> RecentLeads);

public sealed record AdminUserDto(Guid Id, string Phone, string? FullName, IReadOnlyList<string> Roles, DateTimeOffset CreatedAt);

public sealed record SetUserRoleRequest(string Role);

public sealed record CreateUserRequest(string Phone, string? FullName, string Role);

public sealed class SetUserRoleRequestValidator : AbstractValidator<SetUserRoleRequest>
{
    public SetUserRoleRequestValidator() =>
        RuleFor(x => x.Role).Must(r => r is Abstractions.Roles.Admin or Abstractions.Roles.Staff or Abstractions.Roles.Customer)
            .WithMessage("نقش نامعتبر است.");
}

public sealed class CreateUserRequestValidator : AbstractValidator<CreateUserRequest>
{
    public CreateUserRequestValidator()
    {
        RuleFor(x => x.Phone).Must(p => IranValidators.TryNormalizeMobile(p, out _)).WithMessage("شماره موبایل نامعتبر است.");
        RuleFor(x => x.FullName).MaximumLength(80);
        RuleFor(x => x.Role).Must(r => r is Abstractions.Roles.Admin or Abstractions.Roles.Staff or Abstractions.Roles.Customer)
            .WithMessage("نقش نامعتبر است.");
    }
}

public interface IAdminService
{
    Task<DashboardStatsDto> StatsAsync(CancellationToken ct);
    Task<Common.PagedResult<AdminUserDto>> UsersAsync(string? search, string? role, int page, int pageSize, CancellationToken ct);
    Task<Result<AdminUserDto>> CreateUserAsync(CreateUserRequest request, CancellationToken ct);
    Task<Result> SetRoleAsync(Guid actingAdminId, Guid userId, string role, CancellationToken ct);
}
