namespace SiteKit.Domain.Common;

/// <summary>
/// Base class for all aggregates. Ids are Guids (no sequential ids exposed → prevents IDOR guessing).
/// <see cref="Version"/> is an optimistic-concurrency token that works on every provider
/// (it is regenerated on each update by the DbContext).
/// </summary>
public abstract class Entity
{
    public Guid Id { get; protected set; } = Guid.NewGuid();
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }
    public bool IsDeleted { get; set; }
    public Guid Version { get; set; } = Guid.NewGuid();
}

/// <summary>Marker: changes to these entities are written to the immutable audit log.</summary>
public interface IAudited;
