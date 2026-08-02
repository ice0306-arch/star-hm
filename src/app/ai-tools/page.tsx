import type { Metadata } from "next";
import { AiToolsPage } from "@/components/AiToolsPage";

export const metadata: Metadata = {
  title: "HM AI 분석툴 | THE HM",
  description: "리플레이와 플레이 명령을 분석해 전략, 빌드, 생산, 단축키와 플레이 습관을 증거 기반으로 보여줍니다.",
  openGraph: {
    title: "HM AI 분석툴",
    description: "STARCRAFT MATCH INTELLIGENCE",
    images: ["/brand/hm-emblem.png"],
  },
};

export default function Page() {
  return <AiToolsPage />;
}
