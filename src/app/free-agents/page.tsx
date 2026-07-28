import type { Metadata } from "next";
import { FreeAgentsPage } from "@/components/FreeAgentsPage";

export const metadata: Metadata = {
  title: "FA 현황판 | THE HM",
  description: "무소속 스타크래프트 선수의 라이브 상태, 티어, 종족을 확인하는 THE HM FA 현황판입니다.",
};

export default function Page() {
  return <FreeAgentsPage />;
}
