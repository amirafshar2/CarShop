using Microsoft.EntityFrameworkCore;
using SiteKit.Domain.Audit;
using SiteKit.Domain.Catalog;
using SiteKit.Domain.Leads;
using SiteKit.Domain.Listings;
using SiteKit.Domain.Site;

namespace SiteKit.Application.Abstractions;

public interface IAppDbContext
{
    DbSet<Listing> Listings { get; }
    DbSet<SiteSettings> SiteSettings { get; }
    DbSet<Lead> Leads { get; }
    DbSet<AuditLog> AuditLogs { get; }
    DbSet<ServiceItem> ServiceItems { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

    /// <summary>Makes the next SaveChanges fail with a concurrency conflict if the row's Version is no longer <paramref name="version"/>.</summary>
    void SetOriginalVersion(Domain.Common.Entity entity, Guid version);

    /// <summary>Discards tracked changes after a failed save.</summary>
    void ClearChanges();
}

public interface ICurrentUser
{
    Guid? UserId { get; }
    bool IsInRole(string role);
}

public static class Roles
{
    public const string Admin = "Admin";
    public const string Staff = "Staff";
    public const string Customer = "Customer";
}

/// <summary>Detects unique-index / concurrency conflicts in a provider-agnostic way.</summary>
public interface IPersistenceConflictDetector
{
    bool IsConflict(Exception exception);
}
