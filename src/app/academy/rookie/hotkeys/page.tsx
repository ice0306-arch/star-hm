import type { Metadata } from "next";
import { LessonPage } from "@/components/academy/AcademyPages";

export const metadata: Metadata = {
  title: "필수 단축키 | STAR HM 입문 훈련",
  description: "키캡 UI로 동시에 누르기, 순서대로 누르기, 키와 클릭 조합을 배우는 페이지입니다.",
};

export default function Page() {
  return <LessonPage slug="hotkeys" />;
}
