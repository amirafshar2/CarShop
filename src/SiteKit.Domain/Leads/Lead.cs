using SiteKit.Domain.Common;

namespace SiteKit.Domain.Leads;

public enum LeadType
{
    General = 0,      // پیام از صفحه‌ی تماس
    ItemRequest = 1,  // درخواست درباره‌ی یک آیتم (خودرو، تور، محصول …)
    ServiceRequest = 2,
    Booking = 3       // رزرو / وقت ملاقات
}

public enum LeadStatus
{
    New = 0,
    Contacted = 1,
    Visit = 2,
    Won = 3,
    Lost = 4
}

public sealed class Lead : Entity, IAudited
{
    private Lead() { }

    public Lead(string name, string phone, LeadType type, Guid? listingId, string? message)
    {
        Name = name.Trim();
        Phone = phone;
        Type = type;
        ListingId = listingId;
        Message = message?.Trim();
        Status = LeadStatus.New;
    }

    public string Name { get; private set; } = default!;
    public string Phone { get; private set; } = default!;
    public LeadType Type { get; private set; }
    public Guid? ListingId { get; private set; }
    public string? Message { get; private set; }
    public LeadStatus Status { get; private set; }
    public Guid? AssignedStaffId { get; private set; }

    public void AssignTo(Guid staffId) => AssignedStaffId = staffId;

    public void ChangeStatus(LeadStatus status) => Status = status;
}
