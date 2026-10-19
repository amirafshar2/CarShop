using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;
using SiteKit.Application.Abstractions;
using SiteKit.Application.Common;
using SiteKit.Domain.Catalog;
using SiteKit.Domain.Common;

namespace SiteKit.Application.Catalog;

public sealed record ServiceDto(
    Guid Id, string Title, string? Category, string? Description, IReadOnlyList<string> Features,
    PriceType PriceType, long? PriceRial, long? OriginalPriceRial, string? Unit, string? Badge,
    string? ImageUrl, int SortOrder, bool IsActive, bool IsFeatured, Guid Version);

public sealed record UpsertServiceRequest(
    string Title, string? Category, string? Description, IReadOnlyList<string>? Features,
    PriceType PriceType, long? PriceRial, long? OriginalPriceRial, string? Unit, string? Badge,
    string? ImageUrl, int SortOrder, bool IsActive, bool IsFeatured, Guid? Version = null);

public sealed class UpsertServiceRequestValidator : AbstractValidator<UpsertServiceRequest>
{
    public UpsertServiceRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().WithMessage("عنوان خدمت الزامی است.").MaximumLength(120);
        RuleFor(x => x.Category).MaximumLength(60);
        RuleFor(x => x.PriceType).IsInEnum();
        RuleFor(x => x.Description).MaximumLength(1000);
        RuleFor(x => x.Features).Must(f => f is null || (f.Count <= 15 && f.All(s => s.Length <= 120)))
            .WithMessage("حداکثر ۱۵ ویژگی، هرکدام تا ۱۲۰ حرف.");
        RuleFor(x => x.PriceRial).GreaterThan(0).When(x => x.PriceType != PriceType.OnCall)
            .WithMessage("قیمت باید بیشتر از صفر باشد.");
        RuleFor(x => x.Unit).MaximumLength(40);
        RuleFor(x => x.Badge).MaximumLength(30);
        RuleFor(x => x.ImageUrl).MaximumLength(1000)
            .Must(SiteKit.Application.Site.SiteRules.IsSafeUrl)
            .WithMessage("آدرس تصویر باید با https:// یا / شروع شود.");
    }
}

public interface IServiceCatalog
{
    Task<IReadOnlyList<ServiceDto>> ListPublicAsync(CancellationToken ct);
    Task<IReadOnlyList<ServiceDto>> ListAllAsync(CancellationToken ct);
    Task<Result<Guid>> CreateAsync(UpsertServiceRequest request, CancellationToken ct);
    Task<Result> UpdateAsync(Guid id, UpsertServiceRequest request, CancellationToken ct);
    Task<Result> DeleteAsync(Guid id, CancellationToken ct);
}

public sealed class ServiceCatalog(IAppDbContext db, HybridCache cache, IPersistenceConflictDetector conflicts) : IServiceCatalog
{
    public async Task<IReadOnlyList<ServiceDto>> ListPublicAsync(CancellationToken ct) =>
        await cache.GetOrCreateAsync(
            "services:public",
            async token => await Query(db.ServiceItems.Where(s => s.IsActive), token),
            new HybridCacheEntryOptions { Expiration = TimeSpan.FromMinutes(10), LocalCacheExpiration = TimeSpan.FromMinutes(1) },
            tags: [CacheTags.Services],
            cancellationToken: ct);

    public async Task<IReadOnlyList<ServiceDto>> ListAllAsync(CancellationToken ct) => await Query(db.ServiceItems, ct);

    private static async Task<List<ServiceDto>> Query(IQueryable<ServiceItem> q, CancellationToken ct)
    {
        var rows = await q.AsNoTracking()
            .OrderBy(s => s.Category).ThenBy(s => s.SortOrder).ThenBy(s => s.Title)
            .ToListAsync(ct);
        return rows.Select(ToDto).ToList();
    }

    private static ServiceDto ToDto(ServiceItem s) => new(
        s.Id, s.Title, s.Category, s.Description,
        (s.Features ?? "").Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries),
        s.PriceType, s.PriceRial, s.OriginalPriceRial, s.Unit, s.Badge, s.ImageUrl, s.SortOrder, s.IsActive, s.IsFeatured, s.Version);

    public async Task<Result<Guid>> CreateAsync(UpsertServiceRequest r, CancellationToken ct)
    {
        var item = new ServiceItem(r.Title, r.Category);
        var applied = Apply(item, r);
        if (applied.IsFailure) return applied.Error!;
        db.ServiceItems.Add(item);
        await db.SaveChangesAsync(ct);
        await cache.RemoveByTagAsync(CacheTags.Services, ct);
        return item.Id;
    }

    public async Task<Result> UpdateAsync(Guid id, UpsertServiceRequest r, CancellationToken ct)
    {
        var item = await db.ServiceItems.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (item is null) return Result.Failure(Error.NotFound("service.not_found", "خدمت پیدا نشد."));
        if (r.Version is { } expected)
        {
            if (expected != item.Version)
                return Result.Failure(Error.Conflict("service.stale", "این خدمت بعد از باز کردن فرم توسط شخص دیگری تغییر کرده است. صفحه را تازه کنید."));
            db.SetOriginalVersion(item, expected);
        }

        item.Rename(r.Title, r.Category);
        var applied = Apply(item, r);
        if (applied.IsFailure) return applied;

        try { await db.SaveChangesAsync(ct); }
        catch (Exception ex) when (conflicts.IsConflict(ex))
        {
            return Result.Failure(Error.Conflict("service.concurrent_update", "این خدمت همزمان توسط کاربر دیگری تغییر کرد. صفحه را تازه کنید."));
        }
        await cache.RemoveByTagAsync(CacheTags.Services, ct);
        return Result.Success();
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken ct)
    {
        var item = await db.ServiceItems.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (item is null) return Result.Failure(Error.NotFound("service.not_found", "خدمت پیدا نشد."));
        item.IsDeleted = true; // soft delete — history stays in the audit log
        item.IsActive = false;
        await db.SaveChangesAsync(ct);
        await cache.RemoveByTagAsync(CacheTags.Services, ct);
        return Result.Success();
    }

    private static Result Apply(ServiceItem item, UpsertServiceRequest r)
    {
        item.Description = Clean(r.Description);
        item.Features = r.Features is { Count: > 0 }
            ? string.Join('\n', r.Features.Select(f => f.Trim()).Where(f => f.Length > 0))
            : null;
        item.Unit = Clean(r.Unit);
        item.Badge = Clean(r.Badge);
        item.ImageUrl = Clean(r.ImageUrl);
        item.SortOrder = r.SortOrder;
        item.IsActive = r.IsActive;
        item.IsFeatured = r.IsFeatured;
        return item.SetPrice(r.PriceType, r.PriceRial, r.OriginalPriceRial);
    }

    private static string? Clean(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();
}
