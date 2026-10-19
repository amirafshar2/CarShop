using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using SiteKit.Application.Abstractions;
using SiteKit.Domain.Audit;
using SiteKit.Domain.Catalog;
using SiteKit.Domain.Common;
using SiteKit.Domain.Leads;
using SiteKit.Domain.Listings;
using SiteKit.Domain.Site;
using SiteKit.Infrastructure.Identity;

namespace SiteKit.Infrastructure.Persistence;

public sealed class AppDbContext(
    DbContextOptions<AppDbContext> options,
    ICurrentUser currentUser,
    TimeProvider clock)
    : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>(options), IAppDbContext
{
    public DbSet<Listing> Listings => Set<Listing>();
    public DbSet<SiteSettings> SiteSettings => Set<SiteSettings>();
    public DbSet<Lead> Leads => Set<Lead>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<ServiceItem> ServiceItems => Set<ServiceItem>();
    public DbSet<OtpCode> OtpCodes => Set<OtpCode>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    public bool IsSqlite => Database.ProviderName == "Microsoft.EntityFrameworkCore.Sqlite";

    public void SetOriginalVersion(Entity entity, Guid version) =>
        Entry(entity).Property(e => e.Version).OriginalValue = version;

    public void ClearChanges() => ChangeTracker.Clear();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // Soft delete: deleted rows are invisible to every query unless IgnoreQueryFilters() is used.
        builder.Entity<Listing>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<Lead>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<ServiceItem>().HasQueryFilter(e => !e.IsDeleted);

        if (IsSqlite)
        {
            // SQLite cannot compare/order DateTimeOffset natively; store as sortable binary.
            foreach (var entity in builder.Model.GetEntityTypes())
            foreach (var property in entity.GetProperties())
            {
                if (property.ClrType == typeof(DateTimeOffset))
                    property.SetValueConverter(new DateTimeOffsetToBinaryConverter());
                else if (property.ClrType == typeof(DateTimeOffset?))
                    property.SetValueConverter(new ValueConverter<DateTimeOffset?, long?>(
                        v => v.HasValue ? new DateTimeOffsetToBinaryConverter().ConvertToProviderTyped(v.Value) : null,
                        v => v.HasValue ? new DateTimeOffsetToBinaryConverter().ConvertFromProviderTyped(v.Value) : null));
            }
        }
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var now = clock.GetUtcNow();
        var userId = currentUser.UserId;
        var audits = new List<AuditLog>();

        foreach (var entry in ChangeTracker.Entries<Entity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAt = now;
                    entry.Entity.CreatedBy = userId;
                    break;
                case EntityState.Modified:
                    entry.Entity.UpdatedAt = now;
                    entry.Entity.UpdatedBy = userId;
                    // New concurrency token: a concurrent writer holding the old Version will fail.
                    entry.Entity.Version = Guid.NewGuid();
                    break;
                case EntityState.Deleted:
                    // Never hard-delete business data.
                    entry.State = EntityState.Modified;
                    entry.Entity.IsDeleted = true;
                    entry.Entity.UpdatedAt = now;
                    entry.Entity.UpdatedBy = userId;
                    entry.Entity.Version = Guid.NewGuid();
                    break;
            }

            if (entry.Entity is IAudited && entry.State is EntityState.Added or EntityState.Modified)
                audits.Add(BuildAudit(entry, now, userId));
        }

        if (audits.Count > 0) AuditLogs.AddRange(audits);

        // Audit rows are append-only.
        foreach (var entry in ChangeTracker.Entries<AuditLog>())
            if (entry.State is EntityState.Modified or EntityState.Deleted)
                throw new InvalidOperationException("Audit log entries are immutable.");

        return await base.SaveChangesAsync(cancellationToken);
    }

    private static AuditLog BuildAudit(EntityEntry<Entity> entry, DateTimeOffset now, Guid? userId)
    {
        var ignored = new HashSet<string> { nameof(Entity.Version), nameof(Entity.UpdatedAt), nameof(Entity.UpdatedBy) };
        var changes = entry.Properties
            .Where(p => !ignored.Contains(p.Metadata.Name)
                        && (entry.State == EntityState.Added || p.IsModified && !Equals(p.OriginalValue, p.CurrentValue)))
            .ToDictionary(
                p => p.Metadata.Name,
                p => entry.State == EntityState.Added
                    ? new object?[] { null, p.CurrentValue?.ToString() }
                    : new object?[] { p.OriginalValue?.ToString(), p.CurrentValue?.ToString() });

        var action = entry.State == EntityState.Added ? "Created"
            : entry.Entity.IsDeleted ? "Deleted" : "Updated";

        return new AuditLog(entry.Metadata.ClrType.Name, entry.Entity.Id, action, JsonSerializer.Serialize(changes), userId, now);
    }
}
