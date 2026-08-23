import type { Metadata } from "next";
import { AiToolsPage } from "@/components/AiToolsPage";

export const metadata: Metadata = {
  title: "AI 분석툴 | 스타 대학 정보",
  description: "리플레이와 플레이 명령을 분석해 빌드, 생산, 판단 장면을 코칭 중심으로 보여줍니다.",
  openGraph: {
    title: "AI 분석툴",
    description: "STARCRAFT MATCH INTELLIGENCE",
    images: ["/brand/hm-emblem.png"],
  },
};

export default function Page() {
  return <AiToolsPage />;
}
