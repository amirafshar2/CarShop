"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ScrollLinkedVideoScrubberProps {
  src: string;
  className?: string;
  videoClassName?: string;
  scroller?: React.RefObject<HTMLElement | null>;
  poster?: string;
  muted?: boolean;
  playsInline?: boolean;
  scrollHeight?: string;
}

export function ScrollLinkedVideoScrubber({
  src,
  className,
  videoClassName,
  scroller,
  poster,
  muted = true,
  playsInline = true,
  scrollHeight = "300%",
}: ScrollLinkedVideoScrubberProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stickyHeight, setStickyHeight] = useState("100vh");

  useEffect(() => {
    const container = scroller?.current;
    if (!container) {
      setStickyHeight("100vh");
      return;
    }

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setStickyHeight(`${entry.contentRect.height}px`);
      }
    });
    ro.observe(container);
    setStickyHeight(`${container.clientHeight}px`);
    return () => ro.disconnect();
  }, [scroller]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const video = videoRef.current;
    if (!(wrapper && video)) {
      return;
    }

    const getContainer = () => scroller?.current ?? null;

    const update = () => {
      if (!Number.isFinite(video.duration) || video.duration === 0) {
        return;
      }

      const container = getContainer();
      const viewportTop = container ? container.getBoundingClientRect().top : 0;
      const viewportHeight = container
        ? container.clientHeight
        : window.innerHeight;

      const wrapperRect = wrapper.getBoundingClientRect();
      const scrollableRange = wrapperRect.height - viewportHeight;
      if (scrollableRange <= 0) {
        return;
      }

      const scrolled = viewportTop - wrapperRect.top;
      const progress = Math.max(0, Math.min(1, scrolled / scrollableRange));

      video.currentTime = progress * video.duration;
    };

    const scrollTarget = getContainer() ?? window;

    scrollTarget.addEventListener("scroll", update, { passive: true });
    video.addEventListener("loadedmetadata", update);
    update();

    return () => {
      scrollTarget.removeEventListener("scroll", update);
      video.removeEventListener("loadedmetadata", update);
    };
  }, [scroller]);

  return (
    <div
      ref={wrapperRef}
      className={cn("relative w-full", className)}
      style={{ height: scrollHeight }}
    >
      <div
        className="sticky top-0 w-full overflow-hidden"
        style={{ height: stickyHeight }}
      >
        <video
          ref={videoRef}
          src={src || undefined}
          poster={poster || undefined}
          muted={muted}
          playsInline={playsInline}
          preload="auto"
          className={cn("block h-full w-full object-cover", videoClassName)}
        />
      </div>
    </div>
  );
}

export default ScrollLinkedVideoScrubber;
