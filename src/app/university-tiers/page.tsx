import type { Metadata } from "next";
import { UniversityTiersPage } from "@/components/UniversityTiersPage";

export const metadata: Metadata = {
  title: "대학 티어표 현황 | 스타 대학 정보",
  description: "스타크래프트 대학별 티어 분포, 종족 현황, 라이브 선수를 비교하는 현황판입니다.",
};

export default function Page() {
  return <UniversityTiersPage />;
}
