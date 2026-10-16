"use client";

import { useEffect, useState } from "react";
import { ScrollLinkedVideoScrubber } from "@/components/ui/scroll-linked-video-scrubber";

type Mode = "pending" | "image" | "mid" | "desktop";

type NetInfo = { saveData?: boolean; effectiveType?: string };

/** Phones, data-saver, slow networks, weak hardware or reduced-motion → a still image instead of the video. */
function pickMode(): Mode {
  const nav = navigator as Navigator & { connection?: NetInfo; deviceMemory?: number };
  const net = nav.connection;
  const slowNet = !!net && (net.saveData === true || /(^|-)2g|3g/.test(net.effectiveType ?? ""));
  const weak = (nav.deviceMemory !== undefined && nav.deviceMemory < 4) || (nav.hardwareConcurrency || 8) <= 2;
  const phone = window.matchMedia("(max-width: 768px)").matches;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (phone || slowNet || weak || reduced) return "image";
  return window.matchMedia("(min-width: 1280px)").matches ? "desktop" : "mid";
}

/** Hero: scroll-scrubbed video on capable screens, a still frame of the same video everywhere else. */
export default function HeroVideo({ desktop, mid, poster, still }: { desktop: string; mid: string; poster: string; still: string }) {
  const [mode, setMode] = useState<Mode>("pending");
  useEffect(() => setMode(pickMode()), []);

  if (mode === "desktop" || mode === "mid") {
    return (
      <ScrollLinkedVideoScrubber
        key={mode}
        src={mode === "desktop" ? desktop : mid}
        poster={poster}
        scrollHeight="320vh"
        videoClassName="brightness-[0.8]"
      />
    );
  }

  // Before hydration and on phones / slow devices: the first frame as an image (never an empty hero).
  return (
    <div className="relative h-[100svh] w-full overflow-hidden" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={still || poster}
        srcSet={still && poster ? `${still} 960w, ${poster} 1920w` : undefined}
        sizes="100vw"
        alt=""
        fetchPriority="high"
        className="h-full w-full object-cover brightness-[0.8] motion-safe:animate-[hero-zoom_14s_ease-out_forwards]"
      />
    </div>
  );
}
