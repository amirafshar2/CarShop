import { ImageResponse } from "next/og";
import { getSite } from "@/lib/site";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

/** Tab icon in the owner's brand colour (an uploaded logo, if any, is added as icon in the layout metadata). */
export default async function AppleIcon() {
  const { content } = await getSite();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: content.theme.primary, borderRadius: 36 }}>
        <div style={{ width: 72, height: 72, borderRadius: 999, background: "rgba(255,255,255,0.92)" }} />
      </div>
    ),
    size,
  );
}
