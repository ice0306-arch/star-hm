import type { Metadata } from "next";
import { AcademyHomePage } from "@/components/academy/AcademyPages";

export const metadata: Metadata = {
  title: "스타 아카데미 | 입문 훈련과 실전 플레이북",
  description: "스타크래프트 기본 조작과 실전 빌드오더를 연결하는 입문 훈련 페이지입니다.",
};

export default function Page() {
  return <AcademyHomePage />;
}
