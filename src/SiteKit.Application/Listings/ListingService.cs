using System.Text;
using System.Text.Json;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;
using SiteKit.Application.Abstractions;
using SiteKit.Application.Common;
using SiteKit.Application.Site;
using SiteKit.Domain.Common;
using SiteKit.Domain.Listings;

namespace SiteKit.Application.Listings;

public sealed record ListingDto(
    Guid Id, string Title, string Slug, string? Category, string? Summary, string? Description,
    PriceType PriceType, long? PriceRial, long? OriginalPriceRial, string? Unit, string? Badge,
    IReadOnlyList<string> Images, IReadOnlyDictionary<string, string> Attributes,
    ListingStatus Status, bool IsFeatured, int SortOrder, DateTimeOffset? PublishedAt, DateTimeOffset CreatedAt, Guid Version);

public sealed record UpsertListingRequest(
    string Title, string? Category, string? Summary, string? Description,
    PriceType PriceType, long? PriceRial, long? OriginalPriceRial, string? Unit, string? Badge,
    IReadOnlyList<string>? Images, Dictionary<string, string>? Attributes,
    ListingStatus Status, bool IsFeatured, int SortOrder, Guid? Version = null);

public sealed record ListingQuery
{
    public string? Q { get; init; }
    public string? Category { get; init; }
    /// <summary>newest | price-asc | price-desc</summary>
    public string? Sort { get; init; }
    public bool? Featured { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 12;
}

public sealed class UpsertListingRequestValidator : AbstractValidator<UpsertListingRequest>
{
    public UpsertListingRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().WithMessage("Der Titel ist erforderlich.").MaximumLength(150);
        RuleFor(x => x.Category).MaximumLength(60);
        RuleFor(x => x.Summary).MaximumLength(200);
        RuleFor(x => x.Description).MaximumLength(5000);
        RuleFor(x => x.PriceType).IsInEnum();
        RuleFor(x => x.Status).IsInEnum();
        RuleFor(x => x.PriceRial).GreaterThan(0).When(x => x.PriceType != PriceType.OnCall).WithMessage("Der Preis muss größer als null sein.");
        RuleFor(x => x.Unit).MaximumLength(40);
        RuleFor(x => x.Badge).MaximumLength(30);
        RuleFor(x => x.Images).Must(i => i is null || i.Count <= 12).WithMessage("Höchstens 12 Bilder.");
        RuleForEach(x => x.Images).MaximumLength(1000).Must(SiteRules.IsSafeUrl).WithMessage("Die Bildadresse muss mit https:// oder / beginnen.");
        RuleFor(x => x.Attributes).Must(a => a is null || (a.Count <= 12 && a.All(kv => kv.Key.Length <= 30 && (kv.Value?.Length ?? 0) <= 200)))
            .WithMessage("Feldwerte dürfen höchstens 200 Zeichen lang sein.");
    }
}

public interface IListingService
{
    Task<PagedResult<ListingDto>> ListPublicAsync(ListingQuery query, IReadOnlyDictionary<string, string> attributeFilters, CancellationToken ct);
    Task<Result<ListingDto>> GetPublicAsync(string slug, CancellationToken ct);
    Task<IReadOnlyList<ListingDto>> ListAllAsync(CancellationToken ct);
    Task<Result<ListingDto>> GetAsync(Guid id, CancellationToken ct);
    Task<Result<Guid>> CreateAsync(UpsertListingRequest request, CancellationToken ct);
    Task<Result> UpdateAsync(Guid id, UpsertListingRequest request, CancellationToken ct);
    Task<Result> DeleteAsync(Guid id, CancellationToken ct);
}

public sealed class ListingService(IAppDbContext db, HybridCache cache, IPersistenceConflictDetector conflicts, TimeProvider clock) : IListingService
{
    private static readonly Error NotFound = Error.NotFound("listing.not_found", "Nicht gefunden.");

    /// <summary>All visible listings, cached. Catalogues of a small business are small, so filters run in memory —
    /// which also lets them work on the JSON attributes with every database provider.</summary>
    private async Task<List<ListingDto>> PublicAll(CancellationToken ct) =>
        await cache.GetOrCreateAsync(
            "listings:public",
            async token =>
            {
                var rows = await db.Listings.AsNoTracking()
                    .Where(l => l.Status == ListingStatus.Published || l.Status == ListingStatus.SoldOut)
                    .ToListAsync(token);
                return rows.Select(ToDto).ToList();
            },
            new HybridCacheEntryOptions { Expiration = TimeSpan.FromMinutes(10), LocalCacheExpiration = TimeSpan.FromMinutes(1) },
            tags: [CacheTags.Listings],
            cancellationToken: ct);

    public async Task<PagedResult<ListingDto>> ListPublicAsync(ListingQuery q, IReadOnlyDictionary<string, string> filters, CancellationToken ct)
    {
        IEnumerable<ListingDto> items = await PublicAll(ct);
        if (!string.IsNullOrWhiteSpace(q.Q))
        {
            var term = q.Q.Trim();
            items = items.Where(l => l.Title.Contains(term, StringComparison.OrdinalIgnoreCase)
                                     || (l.Summary?.Contains(term, StringComparison.OrdinalIgnoreCase) ?? false)
                                     || l.Attributes.Values.Any(v => v.Contains(term, StringComparison.OrdinalIgnoreCase)));
        }
        if (!string.IsNullOrWhiteSpace(q.Category)) items = items.Where(l => l.Category == q.Category);
        if (q.Featured == true) items = items.Where(l => l.IsFeatured);
        foreach (var (key, value) in filters)
            items = items.Where(l => l.Attributes.TryGetValue(key, out var v) && v == value);

        // Sold-out entries stay visible but go to the end.
        items = q.Sort switch
        {
            "price-asc" => items.OrderBy(l => l.Status).ThenBy(l => l.PriceRial ?? long.MaxValue),
            "price-desc" => items.OrderBy(l => l.Status).ThenByDescending(l => l.PriceRial ?? -1),
            _ => items.OrderBy(l => l.Status).ThenByDescending(l => l.IsFeatured).ThenBy(l => l.SortOrder).ThenByDescending(l => l.PublishedAt),
        };

        var list = items.ToList();
        var page = Math.Max(1, q.Page);
        var size = Math.Clamp(q.PageSize, 1, 48);
        return new PagedResult<ListingDto>(list.Skip((page - 1) * size).Take(size).ToList(), page, size, list.Count);
    }

    public async Task<Result<ListingDto>> GetPublicAsync(string slug, CancellationToken ct)
    {
        var item = (await PublicAll(ct)).FirstOrDefault(l => l.Slug == slug);
        return item is null ? NotFound : item;
    }

    public async Task<IReadOnlyList<ListingDto>> ListAllAsync(CancellationToken ct)
    {
        var rows = await db.Listings.AsNoTracking().ToListAsync(ct);
        return rows.OrderBy(l => l.Status).ThenBy(l => l.SortOrder).ThenByDescending(l => l.CreatedAt).Select(ToDto).ToList();
    }

    public async Task<Result<ListingDto>> GetAsync(Guid id, CancellationToken ct)
    {
        var l = await db.Listings.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return l is null ? NotFound : ToDto(l);
    }

    public async Task<Result<Guid>> CreateAsync(UpsertListingRequest r, CancellationToken ct)
    {
        var listing = new Listing(r.Title, await UniqueSlugAsync(r.Title, null, ct));
        var applied = Apply(listing, r);
        if (applied.IsFailure) return applied.Error!;
        db.Listings.Add(listing);
        await db.SaveChangesAsync(ct);
        await cache.RemoveByTagAsync(CacheTags.Listings, ct);
        return listing.Id;
    }

    public async Task<Result> UpdateAsync(Guid id, UpsertListingRequest r, CancellationToken ct)
    {
        var listing = await db.Listings.FirstOrDefaultAsync(l => l.Id == id, ct);
        if (listing is null) return Result.Failure(NotFound);
        if (r.Version is { } expected)
        {
            if (expected != listing.Version)
                return Result.Failure(Error.Conflict("listing.stale", "Dieser Eintrag wurde geändert, nachdem Sie das Formular geöffnet haben. Bitte die Seite neu laden."));
            db.SetOriginalVersion(listing, expected);
        }
        if (listing.Title != r.Title.Trim()) listing.Rename(r.Title, await UniqueSlugAsync(r.Title, id, ct));
        var applied = Apply(listing, r);
        if (applied.IsFailure) return applied;
        try { await db.SaveChangesAsync(ct); }
        catch (Exception ex) when (conflicts.IsConflict(ex))
        {
            return Result.Failure(Error.Conflict("listing.concurrent_update", "Gleichzeitig von jemand anderem geändert. Bitte die Seite neu laden."));
        }
        await cache.RemoveByTagAsync(CacheTags.Listings, ct);
        return Result.Success();
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken ct)
    {
        var listing = await db.Listings.FirstOrDefaultAsync(l => l.Id == id, ct);
        if (listing is null) return Result.Failure(NotFound);
        listing.IsDeleted = true;
        await db.SaveChangesAsync(ct);
        await cache.RemoveByTagAsync(CacheTags.Listings, ct);
        return Result.Success();
    }

    private Result Apply(Listing l, UpsertListingRequest r)
    {
        l.Category = Clean(r.Category);
        l.Summary = Clean(r.Summary);
        l.Description = Clean(r.Description);
        l.Unit = Clean(r.Unit);
        l.Badge = Clean(r.Badge);
        l.Images = r.Images is { Count: > 0 } ? string.Join('\n', r.Images.Select(i => i.Trim()).Where(i => i.Length > 0)) : null;
        var attrs = (r.Attributes ?? []).Where(kv => !string.IsNullOrWhiteSpace(kv.Value))
            .ToDictionary(kv => kv.Key.Trim(), kv => kv.Value.Trim());
        l.AttributesJson = attrs.Count > 0 ? JsonSerializer.Serialize(attrs, SiteJson.Options) : null;
        l.IsFeatured = r.IsFeatured;
        l.SortOrder = r.SortOrder;
        l.SetStatus(r.Status, clock.GetUtcNow());
        return l.SetPrice(r.PriceType, r.PriceRial, r.OriginalPriceRial);
    }

    public static ListingDto ToDto(Listing l) => new(
        l.Id, l.Title, l.Slug, l.Category, l.Summary, l.Description, l.PriceType, l.PriceRial, l.OriginalPriceRial, l.Unit, l.Badge,
        (l.Images ?? "").Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries),
        SiteJson.ReadAttributes(l.AttributesJson), l.Status, l.IsFeatured, l.SortOrder, l.PublishedAt, l.CreatedAt, l.Version);

    private async Task<string> UniqueSlugAsync(string title, Guid? self, CancellationToken ct)
    {
        var baseSlug = Slugify(title);
        var slug = baseSlug;
        for (var i = 2; await db.Listings.IgnoreQueryFilters().AnyAsync(l => l.Slug == slug && l.Id != self, ct); i++)
            slug = $"{baseSlug}-{i}";
        return slug;
    }

    /// <summary>URL-friendly slug that keeps non-Latin letters: "Tour Istanbul 4 Nächte" → "tour-istanbul-4-nächte".</summary>
    public static string Slugify(string title)
    {
        var sb = new StringBuilder();
        foreach (var ch in PhoneValidators.NormalizeDigits(title.Trim().ToLowerInvariant()))
        {
            if (char.IsLetterOrDigit(ch)) sb.Append(ch);
            else if (sb.Length > 0 && sb[^1] != '-') sb.Append('-');
        }
        var slug = sb.ToString().Trim('-');
        if (slug.Length > 80) slug = slug[..80].Trim('-');
        return slug.Length == 0 ? "item" : slug;
    }

    private static string? Clean(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();
}
