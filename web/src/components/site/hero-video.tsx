"use client";

import { useEffect, useRef, useState } from "react";

type Tier = "pending" | "still" | "540" | "720" | "1080";
type NetInfo = { saveData?: boolean; effectiveType?: string };

/**
 * Which version this device gets:
 *  - still image: data saver, 2G or "reduce motion"
 *  - 540p: very slow computers (≤2 CPU cores or ≤2 GB memory) and 3G
 *  - 720p: phones, tablets and modest computers (≤4 cores / ≤4 GB)
 *  - 1080p: everything else
 */
function pickTier(): Tier {
  const nav = navigator as Navigator & { connection?: NetInfo; deviceMemory?: number };
  const net = nav.connection;
  if (net?.saveData || /(^|-)2g/.test(net?.effectiveType ?? "")) return "still";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "still";
  const mem = nav.deviceMemory ?? 8;
  const cores = nav.hardwareConcurrency || 8;
  if (mem <= 2 || cores <= 2 || /3g/.test(net?.effectiveType ?? "")) return "540";
  const small = window.matchMedia("(max-width: 1279px)").matches;
  return mem <= 4 || cores <= 4 || small ? "720" : "1080";
}

const clamp = (n: number) => Math.min(1, Math.max(0, n));

type Props = {
  /** Scroll versions (short keyframe interval). Without optimisation both are the original file. */
  src1080: string;
  src720: string;
  src540: string;
  poster: string;
  still: string;
  /** "scroll" = the page scroll drives the video; "loop" = plays by itself. */
  mode: "scroll" | "loop";
  scrollHeight?: string;
};

/**
 * Hero background. Scroll mode: a tall wrapper with a sticky video; the scroll position sets video.currentTime.
 * Smooth on slow computers because the file is fetched once into memory (blob URL → local seeks), a rAF loop
 * eases toward the target time, a new seek is never queued while one is running, and the loop only runs while visible.
 */
export default function HeroVideo({ src1080, src720, src540, poster, still, mode, scrollHeight = "320vh" }: Props) {
  const wrapper = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [tier, setTier] = useState<Tier>("pending");
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => setTier(src1080 ? pickTier() : "still"), [src1080]);

  // Scroll mode: load the whole file into memory so every seek is local. Falls back to streaming.
  useEffect(() => {
    if (tier !== "540" && tier !== "720" && tier !== "1080") return;
    const url = tier === "1080" ? src1080 : tier === "720" ? src720 : src540;
    if (mode === "loop") { setSrc(url); return; }
    let objectUrl: string | null = null;
    const ctrl = new AbortController();
    fetch(url, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((b) => { objectUrl = URL.createObjectURL(b); setSrc(objectUrl); })
      .catch((e) => { if ((e as Error).name !== "AbortError") setSrc(url); });
    return () => { ctrl.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [tier, src1080, src720, src540, mode]);

  useEffect(() => {
    const el = wrapper.current;
    const video = videoRef.current;
    if (mode !== "scroll" || !el || !video || !src) return;
    let raf = 0;
    let visible = true;
    let current = 0;

    // A video that has never played can leave seeks hanging (Chromium without focus, iOS Safari before a gesture).
    // Prime the decoder: muted play + pause right after loading, and again on the first user input.
    const prime = () => { video.play().then(() => video.pause()).catch(() => undefined); };
    const gestures = ["touchstart", "pointerdown", "wheel", "keydown"] as const;
    const unlock = () => { prime(); gestures.forEach((g) => window.removeEventListener(g, unlock)); };
    gestures.forEach((g) => window.addEventListener(g, unlock, { passive: true }));
    if (video.readyState >= 2) prime(); else video.addEventListener("loadeddata", prime, { once: true });
    let seekSince = 0;

    const tick = () => {
      const rect = el.getBoundingClientRect();
      const progress = clamp(-rect.top / Math.max(1, rect.height - window.innerHeight));
      const d = video.duration;
      if (Number.isFinite(d) && d > 0) {
        const target = progress * (d - 0.04);
        current += (target - current) * 0.22; // easing absorbs jumpy wheel / trackpad input
        if (Math.abs(target - current) < 0.002) current = target;
        // One seek at a time — queued seeks are what makes scrubbing stutter on slow decoders.
        if (!video.seeking && Math.abs(video.currentTime - current) > 0.012) { video.currentTime = current; seekSince = performance.now(); }
        else if (video.seeking && seekSince && performance.now() - seekSince > 700) { seekSince = performance.now(); prime(); } // stuck seek → nudge
      }
      if (visible) raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      gestures.forEach((g) => window.removeEventListener(g, unlock));
      video.removeEventListener("loadeddata", prime);
    };
  }, [src, mode]);

  if (tier !== "pending" && tier !== "still" && mode === "scroll") {
    return (
      <div ref={wrapper} className="relative w-full" style={{ height: scrollHeight }}>
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poster || still} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover brightness-[0.8]" />
          <video
            ref={videoRef}
            src={src ?? undefined}
            poster={poster || undefined}
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            aria-hidden
            className="relative block h-full w-full object-cover brightness-[0.8]"
          />
        </div>
      </div>
    );
  }

  if (tier !== "pending" && tier !== "still" && mode === "loop") {
    return (
      <div className="relative h-[100svh] w-full overflow-hidden" aria-hidden>
        <video src={src ?? undefined} poster={poster || undefined} autoPlay muted loop playsInline preload="auto" className="h-full w-full object-cover brightness-[0.8]" />
      </div>
    );
  }

  // Before hydration, without a video, and on data-saver / reduced-motion: the still frame (never an empty hero).
  return (
    <div className="relative h-[100svh] w-full overflow-hidden" aria-hidden>
      {still || poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={still || poster}
          srcSet={still && poster && still !== poster ? `${still} 960w, ${poster} 1920w` : undefined}
          sizes="100vw"
          alt=""
          fetchPriority="high"
          className="h-full w-full object-cover brightness-[0.8] motion-safe:animate-[hero-zoom_14s_ease-out_forwards]"
        />
      ) : (
        <div className="h-full w-full bg-[radial-gradient(ellipse_at_top,var(--primary)_0%,transparent_60%)] opacity-30" />
      )}
    </div>
  );
}
