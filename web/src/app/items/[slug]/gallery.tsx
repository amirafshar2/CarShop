"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";

/** Main photo + thumbnails; keyboard-accessible, no layout shift. */
export default function Gallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);
  if (images.length === 0)
    return <div className="grid aspect-[4/3] place-items-center rounded-[var(--radius)] bg-muted text-muted-foreground"><ImageOff className="size-10" aria-hidden /></div>;
  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={images[active]} alt={title} className="aspect-[4/3] w-full rounded-[var(--radius)] object-cover" />
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="list" aria-label="تصاویر">
          {images.map((src, i) => (
            <button key={src + i} type="button" role="listitem" onClick={() => setActive(i)} aria-label={`تصویر ${i + 1}`} aria-current={i === active}
              className={`size-20 shrink-0 overflow-hidden rounded-[calc(var(--radius)-4px)] border-2 ${i === active ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
