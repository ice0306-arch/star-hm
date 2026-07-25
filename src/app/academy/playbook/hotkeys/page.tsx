import type { Metadata } from "next";
import { HotkeysCompressionPage } from "@/components/academy/AcademyPages";

export const metadata: Metadata = {
  title: "실전 단축키 | STAR HM 플레이북",
  description: "실전 중 빠르게 확인하는 테란 단축키와 추천 부대지정입니다.",
};

export default function Page() {
  return <HotkeysCompressionPage />;
}
