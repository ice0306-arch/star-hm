import type { Metadata } from "next";
import { LessonPage } from "@/components/academy/AcademyPages";

export const metadata: Metadata = {
  title: "테란 건물 | STAR HM 입문 훈련",
  description: "서플라이, 배럭, 리파이너리, 팩토리, 스타포트와 아카데미를 쉽게 배웁니다.",
};

export default function Page() {
  return <LessonPage slug="buildings" />;
}
