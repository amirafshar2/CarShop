namespace SiteKit.Domain.Audit;

/// <summary>Append-only audit trail. Rows are inserted, never updated or deleted.</summary>
public sealed class AuditLog
{
    private AuditLog() { }

    public AuditLog(string entityName, Guid entityId, string action, string changesJson, Guid? userId, DateTimeOffset at)
    {
        EntityName = entityName;
        EntityId = entityId;
        Action = action;
        ChangesJson = changesJson;
        UserId = userId;
        At = at;
    }

    public long Id { get; private set; }
    public string EntityName { get; private set; } = default!;
    public Guid EntityId { get; private set; }
    public string Action { get; private set; } = default!;
    public string ChangesJson { get; private set; } = default!;
    public Guid? UserId { get; private set; }
    public DateTimeOffset At { get; private set; }
}
