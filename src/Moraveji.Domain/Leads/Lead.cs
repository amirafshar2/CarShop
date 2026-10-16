using Moraveji.Domain.Common;

namespace Moraveji.Domain.Leads;

public enum LeadType
{
    PriceRequest = 0,  // «قیمت تماس» → درخواست قیمت
    VisitRequest = 1,  // رزرو بازدید
    SellMyCar = 2,     // ماشینم رو بفروش
    Sourcing = 3,      // خرید از راه دور
    Hawaleh = 4,       // درخواست حواله
    Detailing = 5,     // دیتیلینگ
    Organization = 6,  // فروش سازمانی
    General = 7
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

    public Lead(string name, string phone, LeadType type, Guid? carId, string? message)
    {
        Name = name.Trim();
        Phone = phone;
        Type = type;
        CarId = carId;
        Message = message?.Trim();
        Status = LeadStatus.New;
    }

    public string Name { get; private set; } = default!;
    public string Phone { get; private set; } = default!;
    public LeadType Type { get; private set; }
    public Guid? CarId { get; private set; }
    public string? Message { get; private set; }
    public LeadStatus Status { get; private set; }
    public Guid? AssignedStaffId { get; private set; }

    public void AssignTo(Guid staffId) => AssignedStaffId = staffId;

    public void ChangeStatus(LeadStatus status) => Status = status;
}
