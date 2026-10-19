using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SiteKit.Api.Infrastructure;
using SiteKit.Application.Common;
using SiteKit.Application.Leads;
using SiteKit.Domain.Leads;

namespace SiteKit.Api.Controllers;

public sealed record UpdateLeadStatusRequest(LeadStatus Status);

[ApiController]
[Route("api/v1/leads")]
public sealed class LeadsController(ILeadService leads) : ControllerBase
{
    /// <summary>Public: «درخواست قیمت»، رزرو بازدید، ماشینم رو بفروش، خرید از راه دور، ...</summary>
    [HttpPost]
    [EnableRateLimiting(RateLimitPolicies.Forms)]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Create(CreateLeadRequest request, CancellationToken ct)
    {
        var result = await leads.CreateAsync(request, ct);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, new { id = result.Value })
            : this.ToProblem(result.Error!);
    }

    [HttpGet]
    [Authorize(Policy = AuthPolicies.StaffOrAdmin)]
    [ProducesResponseType<PagedResult<LeadDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default) =>
        Ok(await leads.ListForCurrentUserAsync(page, pageSize, ct));

    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = AuthPolicies.StaffOrAdmin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateStatus(Guid id, UpdateLeadStatusRequest request, CancellationToken ct)
    {
        var result = await leads.UpdateStatusAsync(id, request.Status, ct);
        return result.IsSuccess ? NoContent() : this.ToProblem(result.Error!);
    }
}
