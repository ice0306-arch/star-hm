import type { Metadata } from "next";
import { LessonPage } from "@/components/academy/AcademyPages";

export const metadata: Metadata = {
  title: "테란 유닛 | STAR HM 입문 훈련",
  description: "마린, 메딕, 벌쳐, 탱크, 골리앗, 레이스의 역할과 약점을 배웁니다.",
};

export default function Page() {
  return <LessonPage slug="units" />;
}
