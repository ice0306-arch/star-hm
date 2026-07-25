import type { Metadata } from "next";
import { LessonPage } from "@/components/academy/AcademyPages";

export const metadata: Metadata = {
  title: "스타 용어 사전 | STAR HM 입문 훈련",
  description: "마당, 쇼부, 째기, 어택땅 같은 스타크래프트 용어를 쉬운 설명으로 정리합니다.",
};

export default function Page() {
  return <LessonPage slug="glossary" />;
}
