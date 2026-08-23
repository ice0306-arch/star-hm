import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://star-hm.vercel.app"),
  title: "스타 대학 정보",
  description: "스타크래프트 대학 티어표, FA 현황, 라이브 상태, AI 리플레이 분석을 모아 보는 정보 허브",
  applicationName: "스타 대학 정보",
  alternates: {
    canonical: "https://star-hm.vercel.app",
  },
  openGraph: {
    title: "스타 대학 정보",
    description: "스타크래프트 대학 티어표, FA 현황, 라이브 상태, AI 리플레이 분석을 확인하세요.",
    type: "website",
    images: ["/brand/hm-emblem.png"],
  },
  icons: {
    icon: "/brand/hm-emblem-icon.png",
    apple: "/brand/hm-emblem-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#080a0d",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await headers();

  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
