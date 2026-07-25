import type { ReactNode } from "react";
import type { BuildCategory, BuildGuide, BuildTier, HotkeyGuide, Matchup } from "@/data/academy";

const tierMeta: Record<BuildTier, { symbol: string; label: string; className: string }> = {
  top: { symbol: "★", label: "주력", className: "academy-tier-top" },
  variable: { symbol: "!", label: "변수", className: "academy-tier-variable" },
  standard: { symbol: "○", label: "정석", className: "academy-tier-standard" },
  experimental: { symbol: "△", label: "연구", className: "academy-tier-experimental" },
  deprecated: { symbol: "✕", label: "비추천", className: "academy-tier-deprecated" },
};

export const matchupMeta: Record<Matchup, { title: string; ko: string; description: string; href: string }> = {
  TvZ: { title: "VS ZERG", ko: "테란 vs 저그", description: "극초반 압박, 쇼부, 반쇼부, 반운영, 운영, 상황 대응", href: "/academy/playbook/tvz" },
  TvP: { title: "VS PROTOSS", ko: "테란 vs 프로토스", description: "초반 쇼부, 벌쳐 견제, 타이밍 러시, 반운영, 운영, 상황 대응", href: "/academy/playbook/tvp" },
  TvT: { title: "VS TERRAN", ko: "테란 vs 테란", description: "벌쳐전, 탱크전, 레이스, 드랍, 라인전, 상황 대응", href: "/academy/playbook/tvt" },
};

export const categoryLabels: Record<BuildCategory, string> = {
  "all-in": "쇼부",
  "semi-all-in": "반쇼부",
  "semi-macro": "반운영",
  macro: "운영",
  defense: "수비",
  situational: "상황 대응",
  pressure: "압박",
  transition: "운영 전환",
};

export function AcademyBreadcrumb({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav className="academy-breadcrumb" aria-label="Breadcrumb">
      <a href="/">Star HM</a>
      {items.map((item) => (
        <span key={item.label}>
          <span className="academy-breadcrumb-separator" aria-hidden="true">/</span>
          {item.href ? <a href={item.href}>{item.label}</a> : <strong>{item.label}</strong>}
        </span>
      ))}
    </nav>
  );
}

export function AcademyBackLink({ href, label }: { href: string; label: string }) {
  return (
    <a className="academy-back-link print-hidden" href={href}>
      <span aria-hidden="true">←</span>
      {label}
    </a>
  );
}

export function AcademyHero({
  eyebrow,
  title,
  description,
  support,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  support?: string;
  actions?: ReactNode;
}) {
  return (
    <section className="academy-hero px-5 pb-12 pt-28 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="academy-hero-panel">
          <div className="academy-hero-copy">
            <div className="panel-kicker">{eyebrow}</div>
            <h1>{title}</h1>
            <p>{description}</p>
            {support ? <span>{support}</span> : null}
            {actions ? <div className="academy-hero-actions">{actions}</div> : null}
          </div>
          <div className="academy-command-mark" aria-hidden="true">
            HM
          </div>
        </div>
      </div>
    </section>
  );
}

export function AcademySectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="academy-section-head">
      <div className="panel-kicker">{eyebrow}</div>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

export function AcademyModeCard({
  tone,
  eyebrow,
  title,
  description,
  href,
  cta,
}: {
  tone: "rookie" | "playbook";
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <article className={`academy-mode-card academy-mode-${tone}`}>
      <div>
        <span>{eyebrow}</span>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <a className="command-button command-button-primary" href={href}>
        {cta}
      </a>
    </article>
  );
}

export function BuildTierBadge({ tier }: { tier: BuildTier }) {
  const meta = tierMeta[tier];
  return (
    <span className={`build-tier-badge ${meta.className}`}>
      <strong>{meta.symbol}</strong>
      {meta.label}
    </span>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: number }) {
  return (
    <span className="difficulty-badge" aria-label={`난이도 ${difficulty} 단계`}>
      난이도 {Array.from({ length: 5 }, (_, index) => (index < difficulty ? "■" : "□")).join("")}
    </span>
  );
}

export function MatchupBadge({ matchup }: { matchup: Matchup }) {
  return <span className={`matchup-badge matchup-${matchup.toLowerCase()}`}>{matchup}</span>;
}

export function BuildCard({ build }: { build: BuildGuide }) {
  return (
    <article className="build-card">
      <div className="build-card-top">
        <BuildTierBadge tier={build.tier} />
        <MatchupBadge matchup={build.matchup} />
      </div>
      <h3>{build.originalTitle}</h3>
      <strong>{build.easyTitle}</strong>
      <p>{build.playbook.summary}</p>
      <div className="build-card-meta">
        <span>{categoryLabels[build.category]}</span>
        <span>{build.playbook.keyTiming ?? "타이밍 확인"}</span>
        <span>{build.playbook.keyUnits.join(" · ")}</span>
      </div>
      <div className="build-card-actions">
        <a href={`/academy/playbook/build/${build.playbookSlug}`}>상세 보기</a>
        {build.beginnerGuideSlug ? <a href={`/academy/rookie/build/${build.beginnerGuideSlug}`}>초보자 설명</a> : <span>초보자 설명 준비 중</span>}
      </div>
    </article>
  );
}

export function HotkeyKeycap({ value }: { value: string }) {
  return <kbd className="hotkey-keycap">{value}</kbd>;
}

export function HotkeyCombination({ guide }: { guide: HotkeyGuide }) {
  const joiner = guide.type === "simultaneous" ? "+" : guide.type === "sequence" ? "→" : guide.type === "keyAndClick" ? "→" : "";
  return (
    <span className="hotkey-combination" aria-label={guide.description}>
      {guide.keys.map((key, index) => (
        <span key={`${key}-${index}`}>
          {index > 0 ? <span className="hotkey-joiner">{joiner}</span> : null}
          <HotkeyKeycap value={key} />
        </span>
      ))}
    </span>
  );
}

export function ConditionChecklist({ title, tone, items }: { title: string; tone: "go" | "stop"; items: string[] }) {
  return (
    <section className={`condition-box condition-${tone}`}>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>
            <span aria-hidden="true">{tone === "go" ? "✓" : "!"}</span>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
