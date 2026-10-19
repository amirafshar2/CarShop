using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SiteKit.Api.Infrastructure;

namespace SiteKit.Api.Controllers;

/// <summary>
/// Uploads for logo, hero, listing photos and the hero video. Files are checked by their first bytes (not the
/// file name), renamed to a random id and served back with a fixed content type — SVG/HTML are never accepted.
/// Videos are optimised in the background by <see cref="VideoOptimizer"/>.
/// </summary>
[ApiController]
public sealed partial class FilesController(UploadStore store, VideoOptimizer video) : ControllerBase
{
    private const long MaxImage = 5 * 1024 * 1024;
    private const long MaxVideo = 80 * 1024 * 1024;

    [GeneratedRegex("^[a-f0-9]{32}(-scrub|-scrub-720|-960)?\\.(jpg|png|webp|gif|mp4)$")] private static partial Regex SafeName();
    [GeneratedRegex("^[a-f0-9]{32}$")] private static partial Regex SafeId();

    [HttpPost("api/v1/admin/uploads")]
    [Authorize(Policy = AuthPolicies.StaffOrAdmin)]
    [RequestSizeLimit(MaxVideo + 100_000)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxVideo + 100_000)]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public async Task<IActionResult> Upload(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0) return Problem(title: "فایلی انتخاب نشده است.", statusCode: 422);

        var head = new byte[16];
        await using (var s = file.OpenReadStream()) _ = await s.ReadAsync(head, ct);
        var ext = Detect(head);
        if (ext is null) return Problem(title: "فقط عکس JPG، PNG، WEBP، GIF یا ویدیوی MP4/MOV قابل آپلود است.", statusCode: 422);
        var max = ext == "mp4" ? MaxVideo : MaxImage;
        if (file.Length > max) return Problem(title: ext == "mp4" ? "حجم ویدیو حداکثر ۸۰ مگابایت است." : "حجم عکس حداکثر ۵ مگابایت است.", statusCode: 422);

        var id = Guid.NewGuid().ToString("N");
        await using (var target = System.IO.File.Create(Path.Combine(store.Root, $"{id}.{ext}")))
        await using (var source = file.OpenReadStream())
            await source.CopyToAsync(target, ct);

        var optimizing = ext == "mp4" && video.Enqueue(id);
        return StatusCode(StatusCodes.Status201Created, new { url = $"/api/v1/files/{id}.{ext}", video = ext == "mp4", optimizing });
    }

    /// <summary>Has the background job produced the scroll versions and poster yet?</summary>
    [HttpGet("api/v1/admin/uploads/{id}/status")]
    [Authorize(Policy = AuthPolicies.StaffOrAdmin)]
    public IActionResult Status(string id)
    {
        if (!SafeId().IsMatch(id)) return NotFound();
        var ready = video.IsReady(id);
        return Ok(new { ready, poster = ready ? $"/api/v1/files/{id}.jpg" : null });
    }

    [HttpGet("api/v1/files/{name}")]
    public IActionResult Get(string name)
    {
        if (!SafeName().IsMatch(name)) return NotFound();
        var path = Path.Combine(store.Root, name);
        if (!System.IO.File.Exists(path)) return NotFound();
        var type = Path.GetExtension(name) switch
        {
            ".jpg" => "image/jpeg", ".png" => "image/png", ".webp" => "image/webp", ".gif" => "image/gif", _ => "video/mp4"
        };
        // Optimised videos replace the original under the same name → short cache for videos, long for images.
        Response.Headers.CacheControl = type == "video/mp4" ? "public, max-age=3600" : "public, max-age=31536000, immutable";
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        return PhysicalFile(path, type, enableRangeProcessing: true);
    }

    private static string? Detect(byte[] h)
    {
        if (h[0] == 0xFF && h[1] == 0xD8 && h[2] == 0xFF) return "jpg";
        if (h[0] == 0x89 && h[1] == 0x50 && h[2] == 0x4E && h[3] == 0x47) return "png";
        if (h[0] == 'G' && h[1] == 'I' && h[2] == 'F' && h[3] == '8') return "gif";
        if (h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F' && h[8] == 'W' && h[9] == 'E' && h[10] == 'B' && h[11] == 'P') return "webp";
        if (h[4] == 'f' && h[5] == 't' && h[6] == 'y' && h[7] == 'p') return "mp4"; // MP4 and iPhone MOV (both ISO-BMFF)
        return null;
    }
}
