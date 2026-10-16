import type { NextConfig } from "next";

/** Single-container deploy (Render/Docker): the browser talks only to this site and /api/* is
 *  proxied to the .NET API inside the container → same origin, so the HttpOnly login cookie works. */
const apiInternal = process.env.API_INTERNAL_URL;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: "standalone",
  async rewrites() {
    return apiInternal ? [{ source: "/api/v1/:path*", destination: `${apiInternal}/api/v1/:path*` }] : [];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.21st.dev" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
