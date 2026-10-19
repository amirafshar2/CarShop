using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SiteKit.Api.Infrastructure;
using SiteKit.Application.Catalog;

namespace SiteKit.Api.Controllers;

[ApiController]
[Route("api/v1/services")]
public sealed class ServicesController(IServiceCatalog catalog) : ControllerBase
{
    /// <summary>Public price list (active services only).</summary>
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<ServiceDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(await catalog.ListPublicAsync(ct));
}

[ApiController]
[Route("api/v1/admin/services")]
[Authorize(Policy = AuthPolicies.StaffOrAdmin)]
public sealed class AdminServicesController(IServiceCatalog catalog) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<ServiceDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(await catalog.ListAllAsync(ct));

    /// <summary>Only admins may create or change prices.</summary>
    [HttpPost]
    [Authorize(Policy = AuthPolicies.Admin)]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Create(UpsertServiceRequest request, CancellationToken ct)
    {
        var result = await catalog.CreateAsync(request, ct);
        return result.IsSuccess ? StatusCode(StatusCodes.Status201Created, new { id = result.Value }) : this.ToProblem(result.Error!);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = AuthPolicies.Admin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(Guid id, UpsertServiceRequest request, CancellationToken ct)
    {
        var result = await catalog.UpdateAsync(id, request, ct);
        return result.IsSuccess ? NoContent() : this.ToProblem(result.Error!);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = AuthPolicies.Admin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var result = await catalog.DeleteAsync(id, ct);
        return result.IsSuccess ? NoContent() : this.ToProblem(result.Error!);
    }
}
