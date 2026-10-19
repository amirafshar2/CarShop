using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SiteKit.Api.Infrastructure;
using SiteKit.Application.Site;

namespace SiteKit.Api.Controllers;

[ApiController]
[Route("api/v1/site")]
public sealed class SiteController(ISiteService site) : ControllerBase
{
    /// <summary>Everything the public site needs to render itself: brand, colours, menu, texts.</summary>
    [HttpGet]
    [ProducesResponseType<PublicSiteDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken ct) => Ok(await site.GetPublicAsync(ct));
}

[ApiController]
[Route("api/v1/admin/site")]
[Authorize(Policy = AuthPolicies.StaffOrAdmin)] // staff can read (labels, fields); every change is admin-only
public sealed class AdminSiteController(ISiteService site) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<AdminSiteDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken ct) => Ok(await site.GetAdminAsync(ct));

    [HttpPut]
    [Authorize(Policy = AuthPolicies.Admin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Update(UpdateSiteRequest request, CancellationToken ct) => Done(await site.UpdateAsync(request, ct));

    /// <summary>Switch the kind of business (labels, fields, menu); optionally add sample content.</summary>
    [HttpPost("preset")]
    [Authorize(Policy = AuthPolicies.Admin)]
    public async Task<IActionResult> Preset(ApplyPresetRequest request, CancellationToken ct) => Done(await site.ApplyPresetAsync(request, ct));

    [HttpPost("publish")]
    [Authorize(Policy = AuthPolicies.Admin)]
    public async Task<IActionResult> Publish(PublishRequest request, CancellationToken ct) => Done(await site.SetPublishedAsync(request.Published, ct));

    [HttpPost("setup/step")]
    [Authorize(Policy = AuthPolicies.Admin)]
    public async Task<IActionResult> Step(StepRequest request, CancellationToken ct) => Done(await site.CompleteStepAsync(request.Step, ct));

    [HttpPost("setup/finish")]
    [Authorize(Policy = AuthPolicies.Admin)]
    public async Task<IActionResult> Finish(CancellationToken ct) => Done(await site.FinishSetupAsync(ct));

    [HttpPost("setup/restart")]
    [Authorize(Policy = AuthPolicies.Admin)]
    public async Task<IActionResult> Restart(CancellationToken ct) => Done(await site.RestartSetupAsync(ct));

    [HttpPost("reset")]
    [Authorize(Policy = AuthPolicies.Admin)]
    public async Task<IActionResult> Reset(ResetRequest request, CancellationToken ct) => Done(await site.ResetAsync(request, ct));

    /// <summary>Download the whole content (settings, listings, services) as one JSON package.</summary>
    [HttpGet("export")]
    [Authorize(Policy = AuthPolicies.Admin)]
    public async Task<IActionResult> Export(CancellationToken ct)
    {
        var package = await site.ExportAsync(ct);
        var json = System.Text.Json.JsonSerializer.SerializeToUtf8Bytes(package, SiteJson.Options);
        return File(json, "application/json", $"site-content-{DateTime.UtcNow:yyyyMMdd}.json");
    }

    /// <summary>Replace the content with a package exported from another installation.</summary>
    [HttpPost("import")]
    [Authorize(Policy = AuthPolicies.Admin)]
    [RequestSizeLimit(5_000_000)]
    public async Task<IActionResult> Import(SitePackage package, CancellationToken ct) => Done(await site.ImportAsync(package, ct));

    private IActionResult Done(SiteKit.Domain.Common.Result r) => r.IsSuccess ? NoContent() : this.ToProblem(r.Error!);
}
