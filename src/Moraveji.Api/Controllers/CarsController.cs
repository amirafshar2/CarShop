using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Moraveji.Api.Infrastructure;
using Moraveji.Application.Abstractions;
using Moraveji.Application.Cars;
using Moraveji.Application.Common;

namespace Moraveji.Api.Controllers;

[ApiController]
[Route("api/v1/cars")]
public sealed class CarsController(ICarService cars, ICurrentUser user) : ControllerBase
{
    /// <summary>Public inventory with filters, sorting and paging.</summary>
    [HttpGet]
    [ProducesResponseType<PagedResult<CarListItemDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] CarQuery query, CancellationToken ct) =>
        Ok(await cars.ListAsync(query, ct));

    [HttpGet("{slug}")]
    [ProducesResponseType<CarDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(string slug, CancellationToken ct)
    {
        var result = await cars.GetBySlugAsync(slug, ct);
        return result.IsSuccess ? Ok(result.Value) : this.ToProblem(result.Error!);
    }

    /// <summary>Reserves a car for the signed-in customer. 409 if someone else got it first.</summary>
    [HttpPost("{id:guid}/reservations")]
    [Authorize]
    [Microsoft.AspNetCore.RateLimiting.EnableRateLimiting(RateLimitPolicies.Forms)]
    [ProducesResponseType<ReservationDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Reserve(Guid id, CancellationToken ct)
    {
        var result = await cars.ReserveAsync(id, user.UserId!.Value, ct);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, result.Value)
            : this.ToProblem(result.Error!);
    }
}

[ApiController]
[Route("api/v1/admin/cars")]
[Authorize(Policy = AuthPolicies.StaffOrAdmin)]
public sealed class AdminCarsController(ICarService cars) : ControllerBase
{
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Create(UpsertCarRequest request, CancellationToken ct)
    {
        var result = await cars.CreateAsync(request, ct);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, new { id = result.Value })
            : this.ToProblem(result.Error!);
    }

    [HttpGet]
    [ProducesResponseType<PagedResult<AdminCarRowDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] AdminCarQuery query, CancellationToken ct) =>
        Ok(await cars.AdminListAsync(query, ct));

    [HttpGet("{id:guid}")]
    [ProducesResponseType<AdminCarDetailDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await cars.GetForEditAsync(id, ct);
        return result.IsSuccess ? Ok(result.Value) : this.ToProblem(result.Error!);
    }

    /// <summary>Publish / hide / mark as sold.</summary>
    [HttpPost("{id:guid}/status")]
    [Authorize(Policy = AuthPolicies.Admin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> ChangeStatus(Guid id, ChangeCarStatusRequest request, CancellationToken ct)
    {
        var result = await cars.ChangeStatusAsync(id, request.Action, ct);
        return result.IsSuccess ? NoContent() : this.ToProblem(result.Error!);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = AuthPolicies.Admin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var result = await cars.DeleteAsync(id, ct);
        return result.IsSuccess ? NoContent() : this.ToProblem(result.Error!);
    }

    /// <summary>Only admins may change existing listings (incl. prices).</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = AuthPolicies.Admin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(Guid id, UpsertCarRequest request, CancellationToken ct)
    {
        var result = await cars.UpdateAsync(id, request, ct);
        return result.IsSuccess ? NoContent() : this.ToProblem(result.Error!);
    }
}
