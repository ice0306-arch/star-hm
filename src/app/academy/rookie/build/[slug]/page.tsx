import type { Metadata } from "next";
import { RookieBuildDetailPage } from "@/components/academy/AcademyPages";
import { buildGuideRepository } from "@/lib/academyRepository";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const build = buildGuideRepository.getBuildBySlug(slug);
  return {
    title: build ? `${build.easyTitle} | STAR HM 입문 훈련` : "빌드 준비 중 | STAR HM 입문 훈련",
    description: build?.beginner.summary ?? "연결된 초보자 설명이 아직 준비되지 않았습니다.",
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <RookieBuildDetailPage slug={slug} />;
}
