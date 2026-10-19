"use client";

import { useEffect, useState } from "react";

type NetInfo = { saveData?: boolean; effectiveType?: string };

/** Phones, data-saver, slow networks or reduced motion → the still image; otherwise the looping video. */
function wantsVideo(): boolean {
  const nav = navigator as Navigator & { connection?: NetInfo; deviceMemory?: number };
  const net = nav.connection;
  const slow = !!net && (net.saveData === true || /(^|-)2g|3g/.test(net.effectiveType ?? ""));
  const weak = (nav.deviceMemory !== undefined && nav.deviceMemory < 4) || (nav.hardwareConcurrency || 8) <= 2;
  const phone = window.matchMedia("(max-width: 768px)").matches;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return !(phone || slow || weak || reduced);
}

export default function HeroMedia({ image, video }: { image: string; video: string }) {
  const [play, setPlay] = useState(false);
  useEffect(() => setPlay(!!video && wantsVideo()), [video]);
  return (
    <>
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" fetchPriority="high" />
      )}
      {play && <video className="absolute inset-0 -z-20 h-full w-full object-cover" src={video} poster={image || undefined} autoPlay muted loop playsInline preload="auto" />}
      {!image && !play && <div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_top,var(--primary)_0%,transparent_60%)] opacity-30" />}
    </>
  );
}
