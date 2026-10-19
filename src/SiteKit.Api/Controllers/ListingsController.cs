using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SiteKit.Api.Infrastructure;
using SiteKit.Application.Common;
using SiteKit.Application.Listings;

namespace SiteKit.Api.Controllers;

[ApiController]
[Route("api/v1/listings")]
public sealed class ListingsController(IListingService listings) : ControllerBase
{
    /// <summary>Public catalogue. Field filters are passed as f_{key}=value, e.g. f_fuel=هیبرید.</summary>
    [HttpGet]
    [ProducesResponseType<PagedResult<ListingDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] ListingQuery query, CancellationToken ct)
    {
        var filters = Request.Query
            .Where(kv => kv.Key.StartsWith("f_", StringComparison.Ordinal) && kv.Key.Length <= 32 && !string.IsNullOrWhiteSpace(kv.Value))
            .Take(8)
            .ToDictionary(kv => kv.Key[2..], kv => kv.Value.ToString());
        return Ok(await listings.ListPublicAsync(query, filters, ct));
    }

    [HttpGet("{slug}")]
    [ProducesResponseType<ListingDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(string slug, CancellationToken ct)
    {
        var r = await listings.GetPublicAsync(slug, ct);
        return r.IsSuccess ? Ok(r.Value) : this.ToProblem(r.Error!);
    }
}

[ApiController]
[Route("api/v1/admin/listings")]
[Authorize(Policy = AuthPolicies.StaffOrAdmin)]
public sealed class AdminListingsController(IListingService listings) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(await listings.ListAllAsync(ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var r = await listings.GetAsync(id, ct);
        return r.IsSuccess ? Ok(r.Value) : this.ToProblem(r.Error!);
    }

    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public async Task<IActionResult> Create(UpsertListingRequest request, CancellationToken ct)
    {
        var r = await listings.CreateAsync(request, ct);
        return r.IsSuccess ? StatusCode(StatusCodes.Status201Created, new { id = r.Value }) : this.ToProblem(r.Error!);
    }

    /// <summary>Only admins change existing entries (prices included).</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = AuthPolicies.Admin)]
    public async Task<IActionResult> Update(Guid id, UpsertListingRequest request, CancellationToken ct)
    {
        var r = await listings.UpdateAsync(id, request, ct);
        return r.IsSuccess ? NoContent() : this.ToProblem(r.Error!);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = AuthPolicies.Admin)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var r = await listings.DeleteAsync(id, ct);
        return r.IsSuccess ? NoContent() : this.ToProblem(r.Error!);
    }
}
