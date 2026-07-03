import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://star-hm.vercel.app"),
  title: "THE HM | StarCraft Team Roster",
  description: "전략, 성장, 그리고 팀워크로 완성되는 스타크래프트 팀 THE HM 공식 로스터 사이트",
  applicationName: "THE HM",
  alternates: {
    canonical: "https://star-hm.vercel.app",
  },
  openGraph: {
    title: "THE HM | StarCraft Team Roster",
    description: "THE HM의 직책, 밸런스 티어, 종족별 로스터를 확인하세요.",
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
