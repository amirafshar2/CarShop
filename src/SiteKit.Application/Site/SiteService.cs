using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;
using SiteKit.Application.Abstractions;
using SiteKit.Application.Catalog;
using SiteKit.Application.Common;
using SiteKit.Application.Listings;
using SiteKit.Domain.Catalog;
using SiteKit.Domain.Common;
using SiteKit.Domain.Listings;
using SiteKit.Domain.Site;

namespace SiteKit.Application.Site;

public sealed record PublicSiteDto(string Preset, SiteContent Content, bool IsPublished, bool SetupCompleted);

public sealed record AdminSiteDto(
    string Preset, SiteContent Content, bool IsPublished, bool SetupCompleted, IReadOnlyList<string> CompletedSteps,
    IReadOnlyList<PresetInfo> Presets, SetupProgressDto Progress, Guid Version);

/// <summary>What the assistant checks to tell the owner what is still missing.</summary>
public sealed record SetupProgressDto(bool HasName, bool HasLogo, bool HasContact, bool HasHero, int Listings, int Services, bool IsPublished);

public sealed record UpdateSiteRequest(SiteContent Content, Guid? Version = null);
public sealed record ApplyPresetRequest(string Preset, bool WithDemoData);
public sealed record PublishRequest(bool Published);
public sealed record StepRequest(string Step);
public sealed record ResetRequest(string Mode, string Preset);

/// <summary>A full content package: export from one installation, import into another (a customer's fresh site).</summary>
public sealed record SitePackage(int Format, string Preset, SiteContent Content, IReadOnlyList<UpsertListingRequest> Listings, IReadOnlyList<UpsertServiceRequest> Services);

public interface ISiteService
{
    Task<PublicSiteDto> GetPublicAsync(CancellationToken ct);
    Task<AdminSiteDto> GetAdminAsync(CancellationToken ct);
    Task<Result> UpdateAsync(UpdateSiteRequest request, CancellationToken ct);
    Task<Result> ApplyPresetAsync(ApplyPresetRequest request, CancellationToken ct);
    Task<Result> SetPublishedAsync(bool published, CancellationToken ct);
    Task<Result> CompleteStepAsync(string step, CancellationToken ct);
    Task<Result> FinishSetupAsync(CancellationToken ct);
    Task<Result> RestartSetupAsync(CancellationToken ct);
    Task<SitePackage> ExportAsync(CancellationToken ct);
    /// <summary>Start over: blank (assistant from step 1) or demo (sample content). Leads and users stay.</summary>
    Task<Result> ResetAsync(ResetRequest request, CancellationToken ct);
    Task<Result> ImportAsync(SitePackage package, CancellationToken ct);
    /// <summary>Creates the settings row on first start: blank (wizard), demo (sample content) or from a package.</summary>
    Task InitialiseAsync(string mode, string preset, SitePackage? package, CancellationToken ct, bool publish = false);
}

public sealed class SiteService(IAppDbContext db, HybridCache cache, TimeProvider clock) : ISiteService
{
    public static readonly string[] Steps = ["type", "brand", "look", "contact", "home", "items", "services", "publish"];

    private async Task<SiteSettings> RowAsync(CancellationToken ct)
    {
        var row = await db.SiteSettings.OrderBy(s => s.CreatedAt).FirstOrDefaultAsync(ct);
        if (row is not null) return row;
        row = new SiteSettings("services", SiteJson.Write(Presets.Content("services", demo: false)));
        db.SiteSettings.Add(row);
        await db.SaveChangesAsync(ct);
        return row;
    }

    public async Task<PublicSiteDto> GetPublicAsync(CancellationToken ct) =>
        await cache.GetOrCreateAsync("site:public", async token =>
            {
                var row = await RowAsync(token);
                return new PublicSiteDto(row.Preset, SiteJson.Read(row.ContentJson), row.IsPublished, row.SetupCompleted);
            },
            new HybridCacheEntryOptions { Expiration = TimeSpan.FromMinutes(10), LocalCacheExpiration = TimeSpan.FromMinutes(1) },
            tags: [CacheTags.Site], cancellationToken: ct);

    public async Task<AdminSiteDto> GetAdminAsync(CancellationToken ct)
    {
        var row = await RowAsync(ct);
        var c = SiteJson.Read(row.ContentJson);
        var progress = new SetupProgressDto(
            !string.IsNullOrWhiteSpace(c.Brand.Name),
            !string.IsNullOrWhiteSpace(c.Brand.LogoUrl),
            !string.IsNullOrWhiteSpace(c.Contact.Phone) || !string.IsNullOrWhiteSpace(c.Contact.Whatsapp),
            !string.IsNullOrWhiteSpace(c.Home.HeroTitle),
            await db.Listings.CountAsync(ct),
            await db.ServiceItems.CountAsync(ct),
            row.IsPublished);
        return new AdminSiteDto(row.Preset, c, row.IsPublished, row.SetupCompleted, StepsOf(row), Presets.All, progress, row.Version);
    }

    private static List<string> StepsOf(SiteSettings row) =>
        (row.CompletedSteps ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries).ToList();

    public async Task<Result> UpdateAsync(UpdateSiteRequest r, CancellationToken ct)
    {
        var errors = SiteRules.Validate(r.Content);
        if (errors.Count > 0) return Result.Failure(Error.Validation("site.invalid", errors[0]));
        var row = await RowAsync(ct);
        if (r.Version is { } v && v != row.Version)
            return Result.Failure(Error.Conflict("site.stale", "تنظیمات بعد از باز کردن این صفحه تغییر کرده است. صفحه را تازه کنید."));
        row.ContentJson = SiteJson.Write(Normalise(r.Content));
        return await SaveAsync(ct);
    }

    public async Task<Result> ApplyPresetAsync(ApplyPresetRequest r, CancellationToken ct)
    {
        if (!Presets.Exists(r.Preset)) return Result.Failure(Error.Validation("site.preset", "نوع کسب‌وکار نامعتبر است."));
        var row = await RowAsync(ct);
        var old = SiteJson.Read(row.ContentJson);
        var fresh = Presets.Content(r.Preset, r.WithDemoData);
        if (!r.WithDemoData)
        {
            // Keep what the owner already typed; take labels, fields, menu and suggested texts from the preset.
            if (!string.IsNullOrWhiteSpace(old.Brand.Name)) fresh.Brand = old.Brand;
            if (!string.IsNullOrWhiteSpace(old.Contact.Phone) || !string.IsNullOrWhiteSpace(old.Contact.Whatsapp)) fresh.Contact = old.Contact;
        }
        row.Preset = r.Preset;
        row.ContentJson = SiteJson.Write(fresh);
        if (r.WithDemoData) await AddDemoDataAsync(r.Preset, ct);
        Mark(row, "type");
        return await SaveAsync(ct);
    }

    public async Task<Result> SetPublishedAsync(bool published, CancellationToken ct)
    {
        var row = await RowAsync(ct);
        if (published && string.IsNullOrWhiteSpace(SiteJson.Read(row.ContentJson).Brand.Name))
            return Result.Failure(Error.Validation("site.no_name", "قبل از انتشار، نام کسب‌وکار را وارد کنید."));
        row.IsPublished = published;
        if (published) Mark(row, "publish");
        return await SaveAsync(ct);
    }

    public async Task<Result> CompleteStepAsync(string step, CancellationToken ct)
    {
        if (!Steps.Contains(step)) return Result.Failure(Error.Validation("site.step", "مرحله نامعتبر است."));
        var row = await RowAsync(ct);
        Mark(row, step);
        return await SaveAsync(ct);
    }

    public async Task<Result> FinishSetupAsync(CancellationToken ct)
    {
        var row = await RowAsync(ct);
        row.SetupCompleted = true;
        return await SaveAsync(ct);
    }

    public async Task<Result> RestartSetupAsync(CancellationToken ct)
    {
        var row = await RowAsync(ct);
        row.SetupCompleted = false;
        row.CompletedSteps = null;
        return await SaveAsync(ct);
    }

    public async Task<Result> ResetAsync(ResetRequest r, CancellationToken ct)
    {
        if (!Presets.Exists(r.Preset)) return Result.Failure(Error.Validation("site.preset", "نوع کسب‌وکار نامعتبر است."));
        var demo = r.Mode.Equals("demo", StringComparison.OrdinalIgnoreCase);
        var row = await RowAsync(ct);
        foreach (var l in await db.Listings.ToListAsync(ct)) l.IsDeleted = true;
        foreach (var s in await db.ServiceItems.ToListAsync(ct)) { s.IsDeleted = true; s.IsActive = false; }
        await db.SaveChangesAsync(ct);
        row.Preset = r.Preset;
        row.ContentJson = SiteJson.Write(Presets.Content(r.Preset, demo));
        row.IsPublished = demo;
        row.SetupCompleted = demo;
        row.CompletedSteps = demo ? string.Join(',', Steps) : null;
        if (demo) await AddDemoDataAsync(r.Preset, ct);
        return await SaveAsync(ct);
    }

    public async Task<SitePackage> ExportAsync(CancellationToken ct)
    {
        var row = await RowAsync(ct);
        var listings = await db.Listings.AsNoTracking().OrderBy(l => l.SortOrder).ToListAsync(ct);
        var services = await db.ServiceItems.AsNoTracking().OrderBy(s => s.SortOrder).ToListAsync(ct);
        return new SitePackage(1, row.Preset, SiteJson.Read(row.ContentJson),
            listings.Select(ListingService.ToDto).Select(l => new UpsertListingRequest(
                l.Title, l.Category, l.Summary, l.Description, l.PriceType, l.PriceRial, l.OriginalPriceRial, l.Unit, l.Badge,
                l.Images.ToList(), l.Attributes.ToDictionary(), l.Status, l.IsFeatured, l.SortOrder)).ToList(),
            services.Select(s => new UpsertServiceRequest(
                s.Title, s.Category, s.Description,
                (s.Features ?? "").Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries),
                s.PriceType, s.PriceRial, s.OriginalPriceRial, s.Unit, s.Badge, s.ImageUrl, s.SortOrder, s.IsActive, s.IsFeatured)).ToList());
    }

    /// <summary>Replaces the whole content (settings, listings, services) with the package. Leads and users stay.</summary>
    public async Task<Result> ImportAsync(SitePackage p, CancellationToken ct)
    {
        if (p.Format != 1) return Result.Failure(Error.Validation("package.format", "فرمت فایل محتوا پشتیبانی نمی‌شود."));
        if (!Presets.Exists(p.Preset)) return Result.Failure(Error.Validation("package.preset", "نوع کسب‌وکار فایل نامعتبر است."));
        var errors = SiteRules.Validate(p.Content);
        if (errors.Count > 0) return Result.Failure(Error.Validation("package.invalid", errors[0]));
        if (p.Listings.Count > 500 || p.Services.Count > 200)
            return Result.Failure(Error.Validation("package.too_big", "فایل محتوا بیش از حد بزرگ است."));
        if (p.Listings.Any(l => string.IsNullOrWhiteSpace(l.Title) || !(l.Images ?? []).All(SiteRules.IsSafeUrl))
            || p.Services.Any(s => string.IsNullOrWhiteSpace(s.Title) || !SiteRules.IsSafeUrl(s.ImageUrl)))
            return Result.Failure(Error.Validation("package.items", "بعضی از آیتم‌های فایل عنوان ندارند یا آدرس تصویر نامعتبر دارند."));

        var row = await RowAsync(ct);
        row.Preset = p.Preset;
        row.ContentJson = SiteJson.Write(Normalise(p.Content));

        foreach (var l in await db.Listings.ToListAsync(ct)) l.IsDeleted = true;
        foreach (var s in await db.ServiceItems.ToListAsync(ct)) { s.IsDeleted = true; s.IsActive = false; }
        await db.SaveChangesAsync(ct);

        var now = clock.GetUtcNow();
        var slugs = new HashSet<string>(await db.Listings.IgnoreQueryFilters().Select(l => l.Slug).ToListAsync(ct));
        foreach (var l in p.Listings)
        {
            var slug = ListingService.Slugify(l.Title);
            for (var i = 2; slugs.Contains(slug); i++) slug = $"{ListingService.Slugify(l.Title)}-{i}";
            slugs.Add(slug);
            var entity = new Listing(l.Title, slug)
            {
                Category = l.Category, Summary = l.Summary, Description = l.Description, Unit = l.Unit, Badge = l.Badge,
                Images = l.Images is { Count: > 0 } ? string.Join('\n', l.Images) : null,
                AttributesJson = l.Attributes is { Count: > 0 } ? System.Text.Json.JsonSerializer.Serialize(l.Attributes, SiteJson.Options) : null,
                IsFeatured = l.IsFeatured, SortOrder = l.SortOrder
            };
            if (entity.SetPrice(l.PriceType, l.PriceRial, l.OriginalPriceRial).IsFailure) entity.SetPrice(PriceType.OnCall, null, null);
            entity.SetStatus(l.Status, now);
            db.Listings.Add(entity);
        }
        foreach (var s in p.Services)
        {
            var entity = new ServiceItem(s.Title, s.Category)
            {
                Description = s.Description, Features = s.Features is { Count: > 0 } ? string.Join('\n', s.Features) : null,
                Unit = s.Unit, Badge = s.Badge, ImageUrl = s.ImageUrl, SortOrder = s.SortOrder, IsActive = s.IsActive, IsFeatured = s.IsFeatured
            };
            if (entity.SetPrice(s.PriceType, s.PriceRial, s.OriginalPriceRial).IsFailure) entity.SetPrice(PriceType.OnCall, null, null);
            db.ServiceItems.Add(entity);
        }
        return await SaveAsync(ct);
    }

    public async Task InitialiseAsync(string mode, string preset, SitePackage? package, CancellationToken ct, bool publish = false)
    {
        if (await db.SiteSettings.AnyAsync(ct)) return;
        if (!Presets.Exists(preset)) preset = "services";
        switch (mode.ToLowerInvariant())
        {
            case "demo":
                var row = new SiteSettings(preset, SiteJson.Write(Presets.Content(preset, demo: true)))
                {
                    IsPublished = true, SetupCompleted = true, CompletedSteps = string.Join(',', Steps)
                };
                db.SiteSettings.Add(row);
                await AddDemoDataAsync(preset, ct);
                await db.SaveChangesAsync(ct);
                break;
            case "content" when package is not null:
                db.SiteSettings.Add(new SiteSettings(package.Preset, SiteJson.Write(package.Content)));
                await db.SaveChangesAsync(ct);
                var imported = await ImportAsync(package, ct);
                if (imported.IsFailure) throw new InvalidOperationException($"Content package rejected: {imported.Error!.Message}");
                if (publish)
                {
                    var r = await RowAsync(ct);
                    r.IsPublished = true;
                    r.SetupCompleted = true;
                    r.CompletedSteps = string.Join(',', Steps);
                    await db.SaveChangesAsync(ct);
                }
                break;
            default: // blank: nothing but the assistant
                db.SiteSettings.Add(new SiteSettings(preset, SiteJson.Write(Presets.Content(preset, demo: false))));
                await db.SaveChangesAsync(ct);
                break;
        }
        await cache.RemoveByTagAsync([CacheTags.Site, CacheTags.Listings, CacheTags.Services], ct);
    }

    private async Task AddDemoDataAsync(string preset, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var order = await db.Listings.CountAsync(ct);
        var slugs = new HashSet<string>(await db.Listings.IgnoreQueryFilters().Select(l => l.Slug).ToListAsync(ct));
        foreach (var d in Presets.DemoListings(preset))
        {
            var slug = ListingService.Slugify(d.Title);
            for (var i = 2; slugs.Contains(slug); i++) slug = $"{ListingService.Slugify(d.Title)}-{i}";
            slugs.Add(slug);
            var l = new Listing(d.Title, slug)
            {
                Category = d.Category, Summary = d.Summary, Description = d.Description, Unit = d.Unit, Badge = d.Badge,
                Images = string.Join('\n', d.Images),
                AttributesJson = System.Text.Json.JsonSerializer.Serialize(d.Attributes, SiteJson.Options),
                IsFeatured = d.Featured, SortOrder = ++order
            };
            l.SetPrice(d.PriceType, d.Price, d.Original);
            l.SetStatus(ListingStatus.Published, now);
            db.Listings.Add(l);
        }
        var sOrder = await db.ServiceItems.CountAsync(ct);
        foreach (var d in Presets.DemoServices(preset))
        {
            var s = new ServiceItem(d.Title, d.Category)
            {
                Description = d.Description, Features = string.Join('\n', d.Features), Unit = d.Unit, Badge = d.Badge,
                IsFeatured = d.Featured, SortOrder = ++sOrder
            };
            s.SetPrice(d.PriceType, d.Price, d.Original);
            db.ServiceItems.Add(s);
        }
    }

    private static void Mark(SiteSettings row, string step)
    {
        var steps = StepsOf(row);
        if (!steps.Contains(step)) steps.Add(step);
        row.CompletedSteps = string.Join(',', steps);
    }

    private static SiteContent Normalise(SiteContent c)
    {
        string? T(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();
        c.Brand.Name = c.Brand.Name.Trim();
        c.Brand.LogoUrl = T(c.Brand.LogoUrl);
        c.Home.HeroImageUrl = T(c.Home.HeroImageUrl);
        c.Home.HeroVideoUrl = T(c.Home.HeroVideoUrl);
        c.Home.Highlights = c.Home.Highlights.Where(h => !string.IsNullOrWhiteSpace(h.Title)).ToList();
        c.Home.Faq = c.Home.Faq.Where(f => !string.IsNullOrWhiteSpace(f.Question)).ToList();
        c.Home.Stats = c.Home.Stats.Where(s => !string.IsNullOrWhiteSpace(s.Value)).ToList();
        c.Categories = c.Categories.Select(x => x.Trim()).Where(x => x.Length > 0).Distinct().ToList();
        c.Contact.Instagram = T(c.Contact.Instagram?.TrimStart('@'));
        c.Contact.Whatsapp = T(c.Contact.Whatsapp is { } w ? IranValidators.NormalizeDigits(w).Replace("+", "").Replace(" ", "") : null);
        return c;
    }

    private async Task<Result> SaveAsync(CancellationToken ct)
    {
        await db.SaveChangesAsync(ct);
        await cache.RemoveByTagAsync([CacheTags.Site, CacheTags.Listings, CacheTags.Services], ct);
        return Result.Success();
    }
}
