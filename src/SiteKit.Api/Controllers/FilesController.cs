using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SiteKit.Api.Infrastructure;

namespace SiteKit.Api.Controllers;

/// <summary>
/// Uploads for logo, hero, listing photos. Files are checked by their first bytes (not the file name),
/// renamed to a random id and served back with a fixed content type — SVG/HTML are never accepted.
/// </summary>
[ApiController]
public sealed partial class FilesController(IConfiguration config, IWebHostEnvironment env) : ControllerBase
{
    private const long MaxImage = 5 * 1024 * 1024;
    private const long MaxVideo = 25 * 1024 * 1024;

    [GeneratedRegex("^[a-f0-9]{32}\\.(jpg|png|webp|gif|mp4)$")] private static partial Regex SafeName();

    private string Root
    {
        get
        {
            var path = config["Uploads:Path"];
            path = string.IsNullOrWhiteSpace(path) ? Path.Combine(env.ContentRootPath, "uploads") : path;
            Directory.CreateDirectory(path);
            return path;
        }
    }

    [HttpPost("api/v1/admin/uploads")]
    [Authorize(Policy = AuthPolicies.StaffOrAdmin)]
    [RequestSizeLimit(MaxVideo + 100_000)]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public async Task<IActionResult> Upload(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0) return Problem(title: "فایلی انتخاب نشده است.", statusCode: 422);

        var head = new byte[16];
        await using (var s = file.OpenReadStream()) _ = await s.ReadAsync(head, ct);
        var ext = Detect(head);
        if (ext is null) return Problem(title: "فقط عکس JPG، PNG، WEBP، GIF یا ویدیوی MP4 قابل آپلود است.", statusCode: 422);
        var max = ext == "mp4" ? MaxVideo : MaxImage;
        if (file.Length > max) return Problem(title: ext == "mp4" ? "حجم ویدیو حداکثر ۲۵ مگابایت است." : "حجم عکس حداکثر ۵ مگابایت است.", statusCode: 422);

        var name = $"{Guid.NewGuid():N}.{ext}";
        await using (var target = System.IO.File.Create(Path.Combine(Root, name)))
        await using (var source = file.OpenReadStream())
            await source.CopyToAsync(target, ct);

        return StatusCode(StatusCodes.Status201Created, new { url = $"/api/v1/files/{name}" });
    }

    [HttpGet("api/v1/files/{name}")]
    public IActionResult Get(string name)
    {
        if (!SafeName().IsMatch(name)) return NotFound();
        var path = Path.Combine(Root, name);
        if (!System.IO.File.Exists(path)) return NotFound();
        var type = Path.GetExtension(name) switch
        {
            ".jpg" => "image/jpeg", ".png" => "image/png", ".webp" => "image/webp", ".gif" => "image/gif", _ => "video/mp4"
        };
        Response.Headers.CacheControl = "public, max-age=31536000, immutable";
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        return PhysicalFile(path, type, enableRangeProcessing: true);
    }

    private static string? Detect(byte[] h)
    {
        if (h[0] == 0xFF && h[1] == 0xD8 && h[2] == 0xFF) return "jpg";
        if (h[0] == 0x89 && h[1] == 0x50 && h[2] == 0x4E && h[3] == 0x47) return "png";
        if (h[0] == 'G' && h[1] == 'I' && h[2] == 'F' && h[3] == '8') return "gif";
        if (h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F' && h[8] == 'W' && h[9] == 'E' && h[10] == 'B' && h[11] == 'P') return "webp";
        if (h[4] == 'f' && h[5] == 't' && h[6] == 'y' && h[7] == 'p') return "mp4";
        return null;
    }
}
