import type { Metadata } from "next";
import { UniversityTiersPage } from "@/components/UniversityTiersPage";

export const metadata: Metadata = {
  title: "대학 티어표 현황 | THE HM",
  description: "스타크래프트 대학별 티어 분포와 종족 현황을 비교하는 THE HM 현황판입니다.",
};

export default function Page() {
  return <UniversityTiersPage />;
}
