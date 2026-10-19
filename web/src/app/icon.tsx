import { ImageResponse } from "next/og";
import { getSite } from "@/lib/site";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

/** Tab icon in the owner's brand colour (an uploaded logo, if any, is added as icon in the layout metadata). */
export default async function Icon() {
  const { content } = await getSite();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: content.theme.primary, borderRadius: 14 }}>
        <div style={{ width: 26, height: 26, borderRadius: 999, background: "rgba(255,255,255,0.92)" }} />
      </div>
    ),
    size,
  );
}
