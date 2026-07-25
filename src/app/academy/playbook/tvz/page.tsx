import type { Metadata } from "next";
import { MatchupBuildListPage } from "@/components/academy/AcademyPages";

export const metadata: Metadata = {
  title: "TvZ 플레이북 | STAR HM",
  description: "테란 대 저그 빌드와 상황별 대응을 확인합니다.",
};

export default function Page() {
  return <MatchupBuildListPage matchup="TvZ" />;
}
