import type { Metadata } from "next";
import { PracticePage } from "@/components/academy/AcademyPages";

export const metadata: Metadata = {
  title: "연습 모드 | STAR HM 입문 훈련",
  description: "빌드 순서, 단축키, 상황 판단을 문제로 연습합니다.",
};

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PracticePage slug={slug} />;
}
