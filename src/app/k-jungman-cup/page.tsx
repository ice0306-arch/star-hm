import type { Metadata } from "next";
import { KJungmanCupPage } from "@/components/KJungmanCupPage";

export const metadata: Metadata = {
  title: "K-중만컵 | THE HM",
  description: "K-중만컵 2026 조별리그 순위와 경기 일정을 확인하는 THE HM 대회 현황판입니다.",
};

export default function Page() {
  return <KJungmanCupPage />;
}
