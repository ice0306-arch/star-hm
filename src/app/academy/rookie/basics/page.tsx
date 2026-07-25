import type { Metadata } from "next";
import { LessonPage } from "@/components/academy/AcademyPages";

export const metadata: Metadata = {
  title: "기본 조작 | STAR HM 입문 훈련",
  description: "유닛 선택, 이동, 공격 이동, 건물 건설과 생산을 배우는 기본 조작 페이지입니다.",
};

export default function Page() {
  return <LessonPage slug="basics" />;
}
