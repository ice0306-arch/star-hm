import type { Metadata } from "next";
import { LessonPage } from "@/components/academy/AcademyPages";

export const metadata: Metadata = {
  title: "부대지정 | STAR HM 입문 훈련",
  description: "Ctrl+숫자, Shift+숫자, 숫자 두 번과 나만의 부대지정 프리셋을 배우는 페이지입니다.",
};

export default function Page() {
  return <LessonPage slug="control-groups" />;
}
