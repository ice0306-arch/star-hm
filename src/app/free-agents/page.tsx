import type { Metadata } from "next";
import { FreeAgentsPage } from "@/components/FreeAgentsPage";

export const metadata: Metadata = {
  title: "FA 현황판 | 스타 대학 정보",
  description: "무소속 스타크래프트 선수의 라이브 상태, 티어, 종족을 확인하는 FA 현황판입니다.",
};

export default function Page() {
  return <FreeAgentsPage />;
}
