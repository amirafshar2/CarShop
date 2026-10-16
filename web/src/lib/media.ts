/**
 * DEMO MEDIA — real, free-licensed photos (Unsplash License) and video (Pexels License),
 * loaded by the visitor's browser. Replaced by the dealer's own photos from the admin panel.
 * Sources are listed in /CREDITS.md.
 */
/** NEXT_PUBLIC_LOCAL_MEDIA=1 → serve the copies downloaded by `npm run fetch-media` from /public/media
 *  (works offline and where Unsplash/Pexels are slow or filtered). */
const LOCAL = process.env.NEXT_PUBLIC_LOCAL_MEDIA === "1";

export const unsplash = (id: string, w = 1600) =>
  LOCAL ? `/media/${id}.jpg` : `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

export const HERO_VIDEO_REMOTE = {
  desktop: "https://videos.pexels.com/video-files/29498800/12698079_2714_1440_24fps.mp4",
  mobile: "https://videos.pexels.com/video-files/29498800/12698077_1356_720_24fps.mp4",
};

/** Scroll-scrub videos must be ALL-KEYFRAME (every frame seekable), otherwise scrubbing stutters.
 *  `npm run fetch-media` creates these with ffmpeg (-g 1). Drop a new hero video at public/media/hero-source.mp4 and rerun. */
export const HERO_VIDEO = {
  /** 1080p, ≈4.4 MB — large screens on a good connection. */
  desktop: LOCAL ? "/media/hero-scrub-desktop.mp4" : HERO_VIDEO_REMOTE.desktop,
  /** 720p, ≈2 MB — tablets / small laptops. */
  mid: LOCAL ? "/media/hero-scrub-mid.mp4" : HERO_VIDEO_REMOTE.mobile,
  page: "https://www.pexels.com/video/sleek-sports-car-emerging-from-darkness-29498800/",
  /** First frame of the hero video: poster while the video loads (1920px). */
  poster: LOCAL ? "/media/hero-poster.jpg" : "",
  /** Same frame, 960px (≈70 KB) — shown instead of the video on phones and slow devices. */
  still: LOCAL ? "/media/hero-still-960.jpg" : "",
};

export const PHOTOS = {
  camry: "1621007947382-bb3c3994e3fb",
  rav4: "1617469767053-d3b523a0b982",
  bmwWhite: "1555215695-3004980ad54e",
  bmwSeven: "1601362840469-51e4d8d58785",
  bmwGrey: "1580273916550-e323be2ae537",
  audi: "1606664515524-ed2f786a0bd6",
  mercedesGt: "1618843479313-40f8afb4b4d8",
  mercedesGarage: "1590362891991-f776e747a588",
  rangeRoverGarage: "1563720223185-11003d516935",
  hatchRed: "1550355291-bbee04a92027",
  suvDesert: "1533473359331-0135ef1b58bf",
  sedanDark: "1619767886558-efdc259cde1a",
  wash: "1520340356584-f9917d1eea6f",
  rain: "1609521263047-f8f205293f24",
  mustangDark: "1494976388531-d1058494cdd8",
  porscheDark: "1503376780353-7e6692767b70",
} as const;

/** Picks an illustrative demo photo for a car (until the dealer uploads real ones). */
export function demoPhotoFor(brand: string, model: string): string {
  const b = brand.toLowerCase();
  const m = model.toLowerCase();
  if (m.includes("camry")) return PHOTOS.camry;
  if (m.includes("rav4")) return PHOTOS.rav4;
  if (m.includes("land cruiser") || m.includes("highlander") || m.includes("outlander")) return PHOTOS.suvDesert;
  if (m.includes("corolla")) return PHOTOS.sedanDark;
  if (b === "bmw") return m.includes("528") ? PHOTOS.bmwSeven : PHOTOS.bmwWhite;
  if (b === "audi") return PHOTOS.audi;
  if (b.startsWith("mercedes")) return PHOTOS.mercedesGt;
  if (b === "hyundai" || b === "volkswagen") return PHOTOS.hatchRed;
  if (b === "kmc" || b === "maxus") return PHOTOS.rangeRoverGarage;
  return PHOTOS.mercedesGarage;
}
