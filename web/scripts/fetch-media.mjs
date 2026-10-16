// Downloads every demo photo/video into public/media so the demo runs offline.
// Usage:  npm run fetch-media   then set NEXT_PUBLIC_LOCAL_MEDIA=1 in .env.local
import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import { join } from "node:path";

const out = join(process.cwd(), "public", "media");
await mkdir(out, { recursive: true });

const mediaTs = await readFile(join(process.cwd(), "src", "lib", "media.ts"), "utf8");
const ids = [...mediaTs.matchAll(/"(\d{10,13}-[0-9a-f]{12})"/g)].map((m) => m[1]);
const videos = [...mediaTs.matchAll(/(desktop|mobile): "(https:\/\/videos\.pexels\.com\/[^"]+)"/g)].map((m) => [m[1], m[2]]);

const jobs = [
  ...ids.map((id) => [`${id}.jpg`, `https://images.unsplash.com/photo-${id}?w=2400&q=80&auto=format&fit=crop&fm=jpg`]),
  ...videos.map(([kind, url]) => [kind === "desktop" ? "hero-1440.mp4" : "hero-720.mp4", url]),
];

for (const [file, url] of jobs) {
  const target = join(out, file);
  try { await access(target); console.log("✓ exists", file); continue; } catch {}
  const res = await fetch(url);
  if (!res.ok) { console.error("✗", res.status, url); continue; }
  await writeFile(target, Buffer.from(await res.arrayBuffer()));
  console.log("↓", file);
}
// ---- Hero: light, scroll-scrubbable encodes + still images ----
// A keyframe every 8 frames keeps scrubbing smooth while the file is ~5x smaller than all-intra
// (1080p ≈ 4–5 MB instead of ≈ 21 MB, visually identical: SSIM ≈ 0.99). Phones and slow devices get a still image.
// If you shot/generated a new hero video, save it as public/media/hero-source.mp4 and rerun this script.
const { execFileSync } = await import("node:child_process");
const ffmpeg = (await import("ffmpeg-static")).default;
const source = await access(join(out, "hero-source.mp4")).then(() => join(out, "hero-source.mp4"), () => join(out, "hero-1440.mp4"));
for (const [name, width, crf] of [["hero-scrub-desktop.mp4", 1920, 26], ["hero-scrub-mid.mp4", 1280, 27]]) {
  execFileSync(ffmpeg, ["-y", "-v", "error", "-i", source, "-an", "-vf", `scale='min(${width},iw)':-2,fps=24`,
    "-c:v", "libx264", "-preset", "slow", "-crf", String(crf), "-g", "8", "-keyint_min", "8", "-sc_threshold", "0", "-bf", "0",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", join(out, name)], { stdio: "inherit" });
  console.log("🎞  scrub-ready", name);
}
// Still images from the first frame: video poster + the hero for phones / slow connections.
for (const [name, width, q] of [["hero-poster.jpg", 1920, 3], ["hero-still-960.jpg", 960, 4]]) {
  execFileSync(ffmpeg, ["-y", "-v", "error", "-i", source, "-vframes", "1", "-vf", `scale=${width}:-2`, "-q:v", String(q), join(out, name)], { stdio: "inherit" });
}
console.log(`\nDone. Add NEXT_PUBLIC_LOCAL_MEDIA=1 to web/.env.local and restart.`);
