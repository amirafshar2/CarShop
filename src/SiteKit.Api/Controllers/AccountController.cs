using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SiteKit.Api.Infrastructure;
using SiteKit.Application.Abstractions;
using SiteKit.Application.Account;

namespace SiteKit.Api.Controllers;

/// <summary>The signed-in user's own account. Every query is scoped to the token's user id.</summary>
[ApiController]
[Route("api/v1/me")]
[Authorize]
public sealed class AccountController(IAccountService account, ICurrentUser user) : ControllerBase
{
    private Guid Me => user.UserId!.Value;

    [HttpGet]
    [ProducesResponseType<MeDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var result = await account.GetMeAsync(Me, ct);
        return result.IsSuccess ? Ok(result.Value) : this.ToProblem(result.Error!);
    }

    [HttpPut]
    [ProducesResponseType<MeDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(UpdateProfileRequest request, CancellationToken ct)
    {
        var result = await account.UpdateProfileAsync(Me, request, ct);
        return result.IsSuccess ? Ok(result.Value) : this.ToProblem(result.Error!);
    }

    [HttpGet("leads")]
    [ProducesResponseType<IReadOnlyList<MyLeadDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Leads(CancellationToken ct) => Ok(await account.MyLeadsAsync(Me, ct));
}

[ApiController]
[Route("api/v1/admin")]
[Authorize(Policy = AuthPolicies.StaffOrAdmin)]
public sealed class AdminController(IAdminService admin, ICurrentUser user) : ControllerBase
{
    [HttpGet("stats")]
    [ProducesResponseType<DashboardStatsDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Stats(CancellationToken ct) => Ok(await admin.StatsAsync(ct));

    [HttpGet("users")]
    [Authorize(Policy = AuthPolicies.Admin)]
    public async Task<IActionResult> Users([FromQuery] string? search, [FromQuery] string? role,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default) =>
        Ok(await admin.UsersAsync(search, role, page, pageSize, ct));

    [HttpPost("users")]
    [Authorize(Policy = AuthPolicies.Admin)]
    [ProducesResponseType<AdminUserDto>(StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateUser(CreateUserRequest request, CancellationToken ct)
    {
        var result = await admin.CreateUserAsync(request, ct);
        return result.IsSuccess ? StatusCode(StatusCodes.Status201Created, result.Value) : this.ToProblem(result.Error!);
    }

    [HttpPut("users/{id:guid}/role")]
    [Authorize(Policy = AuthPolicies.Admin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> SetRole(Guid id, SetUserRoleRequest request, CancellationToken ct)
    {
        var result = await admin.SetRoleAsync(user.UserId!.Value, id, request.Role, ct);
        return result.IsSuccess ? NoContent() : this.ToProblem(result.Error!);
    }
}
