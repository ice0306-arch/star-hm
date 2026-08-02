import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(self)",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-origin",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Access-Control-Allow-Origin",
    value: "https://star-hm.vercel.app",
  },
];

const publicAssetHeaders = [
  {
    key: "Cache-Control",
    value: "public, max-age=604800, stale-while-revalidate=86400",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: [
    "@dada78641/bwmapimage",
    "@dada78641/bwmapgfx",
    "bw-chk",
    "jssuh",
    "scm-extractor",
    "sharp",
  ],
  outputFileTracingIncludes: {
    "/*": ["./server-assets/bwmapgfx/resources/**/*"],
  },
  async headers() {
    return [
      {
        source: "/brand/:path*",
        headers: [...securityHeaders, ...publicAssetHeaders],
      },
      {
        source: "/members/:path*",
        headers: [...securityHeaders, ...publicAssetHeaders],
      },
      {
        source: "/audio/:path*",
        headers: [...securityHeaders, ...publicAssetHeaders],
      },
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
