namespace SiteKit.Application.Common;

public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount)
{
    public int TotalPages => PageSize == 0 ? 0 : (int)Math.Ceiling(TotalCount / (double)PageSize);
}

public static class CacheTags
{
    public const string Listings = "listings";
    public const string Site = "site";
    public const string Services = "services";
}
