using System.Diagnostics;
using System.Threading.Channels;

namespace SiteKit.Api.Infrastructure;

/// <summary>Where uploads live (Uploads:Path, default ./uploads).</summary>
public sealed class UploadStore(IConfiguration config, IWebHostEnvironment env)
{
    public string Root
    {
        get
        {
            var path = config["Uploads:Path"];
            path = string.IsNullOrWhiteSpace(path) ? Path.Combine(env.ContentRootPath, "uploads") : path;
            Directory.CreateDirectory(path);
            return path;
        }
    }
}

/// <summary>
/// Turns an uploaded video into web versions that play smoothly on slow computers, in the background:
/// <list type="bullet">
/// <item><c>{id}.mp4</c> — loop version: H.264 High, ≤1920px, CRF 21, no audio, faststart.</item>
/// <item><c>{id}-scrub.mp4</c> — scroll version ≤1920px: a keyframe every 4 frames and no B-frames,
/// so every scroll position can be decoded almost instantly (CRF 24).</item>
/// <item><c>{id}-scrub-720.mp4</c> — same for phones and tablets (≤1280px).</item>
/// <item><c>{id}-scrub-540.mp4</c> — same for slow computers (few CPU cores / little memory, ≤960px).</item>
/// <item><c>{id}.jpg</c> / <c>{id}-960.jpg</c> — first frame as poster / still image.</item>
/// <item><c>{id}.ready</c> — written last; the panel polls for it.</item>
/// </list>
/// H.264 is used on purpose: it is hardware-decoded on practically every device, unlike VP9/AV1 on older PCs.
/// Until the job is done the original upload is served as <c>{id}.mp4</c>, so nothing is ever broken.
/// Memory: one job at a time, one output at a time, ffmpeg/x264 limited to <c>Video:Threads</c> (default 1) with a short
/// look-ahead and 1 reference frame → measured ffmpeg peak ≈ 150 MB (1080p source) / 170 MB (4K source), so
/// API (~165 MB) + website (~155 MB) + ffmpeg stay under 512 MB. ffmpeg runs at low CPU priority so the site stays responsive.
/// More threads (Video:Threads=2) are faster but cost ~30–50 MB more.
/// Sources above 4K or longer than <c>Video:MaxSeconds</c> (default 60) are not processed (<c>{id}.failed</c> holds the reason).
/// </summary>
public sealed class VideoOptimizer(UploadStore store, IConfiguration config, ILogger<VideoOptimizer> logger) : BackgroundService
{
    private readonly Channel<string> _queue = Channel.CreateBounded<string>(new BoundedChannelOptions(20) { FullMode = BoundedChannelFullMode.DropOldest });
    private bool? _available;

    private string Ffmpeg => config["Video:Ffmpeg"] is { Length: > 0 } p ? p : "ffmpeg";

    /// <summary>True when ffmpeg can be started on this machine (checked once).</summary>
    public bool Available => _available ??= Probe();

    public bool Enqueue(string id) => Available && _queue.Writer.TryWrite(id);

    public bool IsReady(string id) => File.Exists(Path.Combine(store.Root, $"{id}.ready"));

    /// <summary>Reason the video was not optimised (too large / too long / broken), or null.</summary>
    public string? FailureOf(string id)
    {
        var f = Path.Combine(store.Root, $"{id}.failed");
        return File.Exists(f) ? File.ReadAllText(f) : null;
    }

    private int Threads => Math.Clamp(config.GetValue("Video:Threads", 1), 1, 8);
    private int MaxSeconds => Math.Clamp(config.GetValue("Video:MaxSeconds", 60), 5, 600);
    /// <summary>x264 preset; "medium" with 1 reference frame is ~1 % bigger than "slow" at the same quality, but lighter.</summary>
    private string Preset => config["Video:Preset"] is { Length: > 0 } p && System.Text.RegularExpressions.Regex.IsMatch(p, "^[a-z]+$") ? p : "medium";
    private string Ffprobe => config["Video:Ffprobe"] is { Length: > 0 } p ? p : "ffprobe";

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var id in _queue.Reader.ReadAllAsync(stoppingToken))
        {
            try { await ProcessAsync(id, stoppingToken); }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Video optimisation failed for {Id}; the original stays online", id);
                await File.WriteAllTextAsync(Path.Combine(store.Root, $"{id}.failed"), "ساخت نسخه‌ی سبک انجام نشد؛ ویدیوی اصلی نمایش داده می‌شود.", CancellationToken.None);
            }
        }
    }

    private async Task ProcessAsync(string id, CancellationToken ct)
    {
        var root = store.Root;
        var src = Path.Combine(root, $"{id}.mp4");

        // Check size and length first: a huge source is what would blow the memory limit.
        var (w, h, seconds) = await ProbeAsync(src, ct);
        string? refuse = w * h > 3840 * 2160 ? "ویدیو بزرگ‌تر از 4K است؛ لطفاً نسخه‌ی 4K یا 1080 آپلود کنید."
            : seconds > MaxSeconds ? $"ویدیو بیشتر از {MaxSeconds} ثانیه است؛ برای اسکرول ۵ تا ۱۵ ثانیه بهترین است."
            : w == 0 ? "فایل ویدیو خوانده نشد." : null;
        if (refuse is not null)
        {
            await File.WriteAllTextAsync(Path.Combine(root, $"{id}.failed"), refuse, ct);
            logger.LogWarning("Video {Id} not optimised: {Reason}", id, refuse);
            return;
        }
        var original = Path.Combine(root, $"{id}.orig.mp4");
        File.Copy(src, original, overwrite: true);
        var sw = Stopwatch.StartNew();

        var t = Threads;
        // Few threads + short look-ahead = low, predictable memory (default x264 uses ~1.5 threads per core).
        var common = $"-threads {t} -filter_threads 1 -an -sn -dn -map_metadata -1 -pix_fmt yuv420p -movflags +faststart";
        var x264 = $"-x264-params threads={t}:lookahead-threads=1:rc-lookahead=4:ref=1";
        string Scale(int w) => $"-vf \"scale='min({w},iw)':-2:flags=lanczos\"";
        var jobs = new (string Out, string Args)[]
        {
            ($"{id}.jpg", $"-threads {t} -i \"{original}\" -frames:v 1 {Scale(1920)} -q:v 3 -threads {t}"),
            ($"{id}-960.jpg", $"-threads {t} -i \"{original}\" -frames:v 1 {Scale(960)} -q:v 4 -threads {t}"),
            ($"{id}-scrub-540.mp4", $"-threads {t} -i \"{original}\" {Scale(960)} -c:v libx264 -preset {Preset} -crf 25 -profile:v main -g 4 -keyint_min 4 -sc_threshold 0 -bf 0 {x264} {common}"),
            ($"{id}-scrub-720.mp4", $"-threads {t} -i \"{original}\" {Scale(1280)} -c:v libx264 -preset {Preset} -crf 24 -profile:v main -g 4 -keyint_min 4 -sc_threshold 0 -bf 0 {x264} {common}"),
            ($"{id}-scrub.mp4", $"-threads {t} -i \"{original}\" {Scale(1920)} -c:v libx264 -preset {Preset} -crf 24 -profile:v high -g 4 -keyint_min 4 -sc_threshold 0 -bf 0 {x264} {common}"),
            ($"{id}.mp4", $"-threads {t} -i \"{original}\" {Scale(1920)} -c:v libx264 -preset {Preset} -crf 21 -profile:v high -g 48 {x264} {common}"),
        };
        foreach (var (output, args) in jobs)
        {
            var target = Path.Combine(root, output);
            var temp = Path.Combine(root, $"tmp-{Guid.NewGuid():N}{Path.GetExtension(output)}");
            var code = await RunAsync($"-v error -y {args} \"{temp}\"", ct);
            if (code != 0 || !File.Exists(temp))
            {
                if (File.Exists(temp)) File.Delete(temp);
                throw new InvalidOperationException($"ffmpeg exited with {code} for {output}");
            }
            File.Move(temp, target, overwrite: true); // atomic swap: visitors never see a half-written file
        }
        File.Delete(original);
        await File.WriteAllTextAsync(Path.Combine(root, $"{id}.ready"), DateTimeOffset.UtcNow.ToString("O"), ct);
        logger.LogInformation("Video {Id} optimised in {Seconds:n0}s", id, sw.Elapsed.TotalSeconds);
    }

    /// <summary>Width, height and duration of the first video stream (0 when unreadable).</summary>
    private async Task<(int W, int H, double Seconds)> ProbeAsync(string file, CancellationToken ct)
    {
        try
        {
            using var p = Process.Start(new ProcessStartInfo(Ffprobe,
                $"-v error -select_streams v:0 -show_entries stream=width,height:format=duration -of csv=p=0:s=x \"{file}\"")
            { RedirectStandardOutput = true, RedirectStandardError = true, UseShellExecute = false, CreateNoWindow = true })!;
            var text = await p.StandardOutput.ReadToEndAsync(ct);
            await p.WaitForExitAsync(ct);
            var lines = text.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            var wh = lines.FirstOrDefault(l => l.Contains('x'))?.Split('x');
            var dur = lines.Select(l => double.TryParse(l, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var d) ? d : -1).FirstOrDefault(d => d >= 0);
            return wh is { Length: >= 2 } && int.TryParse(wh[0], out var w) && int.TryParse(wh[1], out var h) ? (w, h, dur) : (0, 0, dur);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "ffprobe failed; trying to optimise anyway");
            return (1920, 1080, 0);
        }
    }

    private async Task<int> RunAsync(string args, CancellationToken ct)
    {
        using var p = Process.Start(new ProcessStartInfo(Ffmpeg, args)
        {
            RedirectStandardError = true, RedirectStandardOutput = true, UseShellExecute = false, CreateNoWindow = true
        })!;
        try { p.PriorityClass = ProcessPriorityClass.BelowNormal; } catch { /* not allowed on this host */ }
        var err = p.StandardError.ReadToEndAsync(ct);
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeout.CancelAfter(TimeSpan.FromMinutes(20)); // tiny free-tier CPUs are slow, but never hang forever
        try { await p.WaitForExitAsync(timeout.Token); }
        catch (OperationCanceledException) { try { p.Kill(true); } catch { /* already gone */ } throw; }
        if (p.ExitCode != 0) logger.LogWarning("ffmpeg: {Error}", (await err).Trim());
        return p.ExitCode;
    }

    private bool Probe()
    {
        try
        {
            using var p = Process.Start(new ProcessStartInfo(Ffmpeg, "-version") { RedirectStandardOutput = true, RedirectStandardError = true, UseShellExecute = false, CreateNoWindow = true });
            if (p is null) return false;
            p.WaitForExit(5000);
            return p.ExitCode == 0;
        }
        catch (Exception)
        {
            logger.LogWarning("ffmpeg not found – uploaded videos are served as they are (install ffmpeg or set Video:Ffmpeg)");
            return false;
        }
    }
}
