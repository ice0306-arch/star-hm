import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://star-hm.vercel.app"),
  title: "THE HM | StarCraft Team Roster",
  description: "전략, 성장, 그리고 팀워크로 완성되는 스타크래프트 팀 THE HM 공식 로스터 사이트",
  applicationName: "THE HM",
  openGraph: {
    title: "THE HM | StarCraft Team Roster",
    description: "THE HM의 직책, 밸런스 티어, 종족별 로스터를 확인하세요.",
    type: "website",
    images: ["/brand/hm-emblem.gif"],
  },
  icons: {
    icon: "/brand/hm-emblem.gif",
  },
};

export const viewport: Viewport = {
  themeColor: "#080a0d",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
