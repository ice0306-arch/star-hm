import type { Metadata } from "next";
import { RookieHomePage } from "@/components/academy/AcademyPages";

export const metadata: Metadata = {
  title: "STAR HM 입문 훈련 | 스타크래프트 초보자 가이드",
  description: "유닛 선택, 이동, 공격, 단축키, 부대지정, 용어와 첫 빌드를 배우는 입문 훈련입니다.",
};

export default function Page() {
  return <RookieHomePage />;
}
