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

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var id in _queue.Reader.ReadAllAsync(stoppingToken))
        {
            try { await ProcessAsync(id, stoppingToken); }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Video optimisation failed for {Id}; the original stays online", id);
            }
        }
    }

    private async Task ProcessAsync(string id, CancellationToken ct)
    {
        var root = store.Root;
        var src = Path.Combine(root, $"{id}.mp4");
        var original = Path.Combine(root, $"{id}.orig.mp4");
        File.Copy(src, original, overwrite: true);
        var sw = Stopwatch.StartNew();

        const string common = "-an -sn -dn -map_metadata -1 -pix_fmt yuv420p -movflags +faststart";
        string Scale(int w) => $"-vf \"scale='min({w},iw)':-2:flags=lanczos\"";
        var jobs = new (string Out, string Args)[]
        {
            ($"{id}.jpg", $"-i \"{original}\" -frames:v 1 {Scale(1920)} -q:v 3"),
            ($"{id}-960.jpg", $"-i \"{original}\" -frames:v 1 {Scale(960)} -q:v 4"),
            ($"{id}-scrub-540.mp4", $"-i \"{original}\" {Scale(960)} -c:v libx264 -preset slow -crf 25 -profile:v main -g 4 -keyint_min 4 -sc_threshold 0 -bf 0 {common}"),
            ($"{id}-scrub-720.mp4", $"-i \"{original}\" {Scale(1280)} -c:v libx264 -preset slow -crf 24 -profile:v main -g 4 -keyint_min 4 -sc_threshold 0 -bf 0 {common}"),
            ($"{id}-scrub.mp4", $"-i \"{original}\" {Scale(1920)} -c:v libx264 -preset slow -crf 24 -profile:v high -g 4 -keyint_min 4 -sc_threshold 0 -bf 0 {common}"),
            ($"{id}.mp4", $"-i \"{original}\" {Scale(1920)} -c:v libx264 -preset slow -crf 21 -profile:v high -g 48 {common}"),
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

    private async Task<int> RunAsync(string args, CancellationToken ct)
    {
        using var p = Process.Start(new ProcessStartInfo(Ffmpeg, args)
        {
            RedirectStandardError = true, RedirectStandardOutput = true, UseShellExecute = false, CreateNoWindow = true
        })!;
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
