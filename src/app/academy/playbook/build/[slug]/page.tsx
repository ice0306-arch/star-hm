import type { Metadata } from "next";
import { PlaybookBuildDetailPage } from "@/components/academy/AcademyPages";
import { buildGuideRepository } from "@/lib/academyRepository";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const build = buildGuideRepository.getBuildBySlug(slug);
  return {
    title: build ? `${build.originalTitle} | STAR HM 플레이북` : "빌드 준비 중 | STAR HM 플레이북",
    description: build?.playbook.summary ?? "요청한 빌드를 찾을 수 없습니다.",
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PlaybookBuildDetailPage slug={slug} />;
}
