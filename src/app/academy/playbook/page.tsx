import type { Metadata } from "next";
import { PlaybookHomePage } from "@/components/academy/AcademyPages";

export const metadata: Metadata = {
  title: "STAR HM 플레이북 | 테란 종족별 빌드 가이드",
  description: "게임 중 빠르게 확인하는 테란 종족별 빌드, 타이밍, 상황별 대응 데이터베이스입니다.",
};

export default function Page() {
  return <PlaybookHomePage />;
}
