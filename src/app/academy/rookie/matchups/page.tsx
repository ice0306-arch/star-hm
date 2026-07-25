import type { Metadata } from "next";
import { LessonPage } from "@/components/academy/AcademyPages";

export const metadata: Metadata = {
  title: "상대 종족별 기초 | STAR HM 입문 훈련",
  description: "저그, 프로토스, 테란을 상대할 때 처음 확인할 신호와 기본 대응을 배웁니다.",
};

export default function Page() {
  return <LessonPage slug="matchups" />;
}
