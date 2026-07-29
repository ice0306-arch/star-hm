"use client";

import { useEffect, useMemo, useState } from "react";
import {
  universityTierLabels,
  universityTierOrder,
  universitySnapshotTierOrder,
  universityTierSnapshots,
  universityTopTierKeys,
  type UniversityRaceKey,
  type UniversitySnapshotTierKey,
  type UniversityTierKey,
  type UniversityTierSnapshot,
} from "@/data/universityTiers";

const BRAND_EMBLEM_SRC = "/brand/hm-emblem.png";
const raceLabels: Record<UniversityRaceKey, string> = {
  Terran: "Terran",
  Zerg: "Zerg",
  Protoss: "Protoss",
  Unknown: "미분류",
};

const allRaceOrder: UniversityRaceKey[] = ["Terran", "Zerg", "Protoss", "Unknown"];
const visibleRaceOrder: UniversityRaceKey[] = ["Terran", "Zerg", "Protoss"];
const tierFilters: Array<UniversitySnapshotTierKey | "all"> = ["all", ...universitySnapshotTierOrder];
const tierCardSuits: Record<UniversitySnapshotTierKey, string> = {
  God: "G",
  King: "K",
  Jack: "J",
  Joker: "JK",
  Spade: "♠",
  "0": "0",
  "1": "1",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
  "6": "6",
  "7": "7",
  "8": "8",
  Baby: "B",
  Unknown: "?",
};
const liveTierOrder: Array<UniversityTierKey | "Unknown"> = [...universityTierOrder, "Unknown"];
const liveRefreshIntervalMs = 120_000;

type UniversityIconInfo = {
  label: string;
  className: string;
  image?: string;
};

const universityIcons: Record<string, UniversityIconInfo> = {
  수술대: { label: "수", className: "icon-surgery", image: "/universities/surgery.webp" },
  흑카데미: { label: "흑", className: "icon-black", image: "/universities/black-academy.webp" },
  JSA: { label: "J", className: "icon-jsa", image: "/universities/jsa.webp" },
  YB: { label: "Y", className: "icon-yb" },
  케이대: { label: "K", className: "icon-k", image: "/universities/k-university.webp" },
  씨나인: { label: "C9", className: "icon-c9", image: "/universities/c9.webp" },
  캄몬스타즈: { label: "캄", className: "icon-kammon", image: "/universities/kammon-stars.webp" },
  엠비대: { label: "MB", className: "icon-mb", image: "/universities/mbu.webp" },
  와플대: { label: "W", className: "icon-waffle", image: "/universities/waffle.webp" },
  뉴캣슬: { label: "N", className: "icon-newcastle", image: "/universities/newcastle.webp" },
  BGM: { label: "B", className: "icon-bgm", image: "/universities/bgm.webp" },
  HM: { label: "HM", className: "icon-hm", image: "/universities/hm.webp" },
  DM: { label: "D", className: "icon-dm", image: "/universities/dm.webp" },
  신세계: { label: "신", className: "icon-shinsegae", image: "/universities/shinsegae.webp" },
  무소속: { label: "FA", className: "icon-free", image: "/universities/free-agent.webp" },
};

type UniversityLivePlayer = {
  id: string;
  name: string;
  college: string;
  race: UniversityRaceKey;
  tier: UniversityTierKey | "Unknown";
  url: string;
  title?: string;
  viewers?: number;
  startedAt?: string;
  thumbnail?: string;
};

type UniversityLivePayload = {
  players: UniversityLivePlayer[];
  liveCount: number;
  updatedAt: number;
};

function topTierCount(college: UniversityTierSnapshot) {
  return universityTopTierKeys.reduce((sum, tier) => sum + (college.tiers[tier] ?? 0), 0);
}

function mainRace(college: UniversityTierSnapshot) {
  return visibleRaceOrder.reduce((current, race) => (college.race[race] > college.race[current] ? race : current), "Terran" as UniversityRaceKey);
}

function shareClass(value: number, total: number) {
  const share = total > 0 ? Math.max(10, Math.round((value / total) * 10) * 10) : 0;
  return `share-${Math.min(100, share)}`;
}

function getUniversityIcon(college: string) {
  return universityIcons[college] ?? { label: college.slice(0, 2) || "?", className: "icon-free" };
}

export function UniversityTiersPage() {
  const [activeCollege, setActiveCollege] = useState("전체");
  const [activeTier, setActiveTier] = useState<UniversitySnapshotTierKey | "all">("all");
  const [activeRace, setActiveRace] = useState<UniversityRaceKey | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [livePayload, setLivePayload] = useState<UniversityLivePayload | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadLivePlayers() {
      try {
        const response = await fetch("/api/university-live", { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as UniversityLivePayload;
        if (isMounted) {
          setLivePayload(payload);
        }
      } catch {
        if (isMounted) {
          setLivePayload({ players: [], liveCount: 0, updatedAt: Date.now() });
        }
      }
    }

    loadLivePlayers();
    const timer = window.setInterval(loadLivePlayers, liveRefreshIntervalMs);

    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const livePlayers = livePayload?.players ?? [];
  const filteredColleges = useMemo(() => {
    return universityTierSnapshots.filter((college) => {
      const collegeMatches = activeCollege === "전체" || college.college === activeCollege;
      const tierMatches = activeTier === "all" || (college.tiers[activeTier] ?? 0) > 0;
      const raceMatches = activeRace === "all" || college.race[activeRace] > 0;
      const searchMatches =
        !normalizedSearch ||
        college.college.toLowerCase().includes(normalizedSearch) ||
        (college.memberNames ?? []).some((name) => name.toLowerCase().includes(normalizedSearch)) ||
        (college.memberMarkers ?? []).some((marker) => [marker.name, marker.label].some((value) => value.toLowerCase().includes(normalizedSearch))) ||
        livePlayers.some((player) => {
          return (
            player.college === college.college &&
            [player.name, player.id, player.title ?? ""].some((value) => value.toLowerCase().includes(normalizedSearch))
          );
        });
      return collegeMatches && tierMatches && raceMatches && searchMatches;
    });
  }, [activeCollege, activeRace, activeTier, livePlayers, normalizedSearch]);

  const summary = useMemo(() => {
    const totalPlayers = filteredColleges.reduce((sum, college) => sum + college.total, 0);
    const topPlayers = filteredColleges.reduce((sum, college) => sum + topTierCount(college), 0);
    const raceTotals = filteredColleges.reduce<Record<UniversityRaceKey, number>>(
      (acc, college) => {
        allRaceOrder.forEach((race) => {
          acc[race] += college.race[race];
        });
        return acc;
      },
      { Terran: 0, Zerg: 0, Protoss: 0, Unknown: 0 },
    );
    return { totalPlayers, topPlayers, raceTotals };
  }, [filteredColleges]);

  const filteredLivePlayers = useMemo(() => {
    return livePlayers.filter((player) => {
      const collegeMatches = activeCollege === "전체" || player.college === activeCollege;
      const tierMatches = activeTier === "all" || player.tier === activeTier;
      const raceMatches = activeRace === "all" || player.race === activeRace;
      const searchMatches =
        !normalizedSearch ||
        [player.name, player.id, player.college, player.title ?? ""].some((value) => value.toLowerCase().includes(normalizedSearch));
      return collegeMatches && tierMatches && raceMatches && searchMatches;
    });
  }, [activeCollege, activeRace, activeTier, livePlayers, normalizedSearch]);

  return (
    <main className="site-shell university-tier-shell min-h-screen text-silver">
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/10 bg-carbon/82 backdrop-blur-xl">
        <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10" aria-label="대학 티어표 내비게이션">
          <a className="flex items-center gap-3 text-white" href="/">
            <img className="h-12 w-12 object-contain" src={BRAND_EMBLEM_SRC} alt="THE HM emblem" width={48} height={48} />
            <span className="text-sm font-black uppercase tracking-[0.24em]">THE HM</span>
          </a>
          <div className="university-tier-nav-links">
            <a className="nav-link" href="/">HOME</a>
            <a className="nav-link" href="/university-tiers">대학티어</a>
            <a className="nav-link" href="/free-agents">FA현황</a>
          </div>
        </nav>
      </header>

      <section className="university-tier-hero px-5 pb-10 pt-28 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="panel-kicker">UNIVERSITY TIER BOARD</div>
          <h1>각 대학 티어표 현황</h1>
          <p>대학별 총원, 상위 티어 비중, 종족 분포를 한 화면에서 비교합니다.</p>
          <div className="university-tier-summary" aria-label="대학 티어표 요약">
            <SummaryTile value={filteredColleges.length} label="대학" />
            <SummaryTile value={summary.totalPlayers} label="총 인원" />
            <SummaryTile value={filteredLivePlayers.length} label="라이브" />
            <SummaryTile value={summary.topPlayers} label="상위 티어" />
            <SummaryTile value={summary.raceTotals.Protoss} label="Protoss" />
            <SummaryTile value={summary.raceTotals.Terran} label="Terran" />
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="university-tier-controls">
            <label className="university-search-control">
              <span>검색</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="대학명, 선수명, SOOP ID"
              />
            </label>
            <label>
              <span>대학</span>
              <select value={activeCollege} onChange={(event) => setActiveCollege(event.target.value)}>
                <option value="전체">전체</option>
                {universityTierSnapshots.map((college) => (
                  <option key={college.college} value={college.college}>{college.college}</option>
                ))}
              </select>
            </label>
            <label>
              <span>티어</span>
              <select value={activeTier} onChange={(event) => setActiveTier(event.target.value as UniversitySnapshotTierKey | "all")}>
                {tierFilters.map((tier) => (
                  <option key={tier} value={tier}>{tier === "all" ? "전체" : tier === "Unknown" ? "티어 확인" : universityTierLabels[tier]}</option>
                ))}
              </select>
            </label>
            <label>
              <span>종족</span>
              <select value={activeRace} onChange={(event) => setActiveRace(event.target.value as UniversityRaceKey | "all")}>
                <option value="all">전체</option>
                {visibleRaceOrder.map((race) => (
                  <option key={race} value={race}>{raceLabels[race]}</option>
                ))}
              </select>
            </label>
          </div>

          <UniversityLiveBoard players={filteredLivePlayers} updatedAt={livePayload?.updatedAt ?? null} />

          <div className="university-tier-grid mt-8">
            {filteredColleges.map((college) => (
              <UniversityTierCard key={college.college} college={college} liveCount={livePlayers.filter((player) => player.college === college.college).length} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function SummaryTile({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function UniversityLiveBoard({ players, updatedAt }: { players: UniversityLivePlayer[]; updatedAt: number | null }) {
  const groupedPlayers = liveTierOrder
    .map((tier) => ({
      tier,
      players: players.filter((player) => player.tier === tier),
    }))
    .filter((group) => group.players.length > 0);

  return (
    <section className="university-live-board" aria-labelledby="university-live-title">
      <div className="university-live-board-head">
        <div>
          <div className="panel-kicker">LIVE PLAYERS</div>
          <h2 id="university-live-title">현재 라이브 선수</h2>
          <p>스폰 게임이나 매치업 상담을 바로 물어볼 수 있게, 방송 중인 선수만 먼저 보여줍니다.</p>
        </div>
        <span>{updatedAt ? `${new Date(updatedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 기준 · 2분 자동 갱신` : "확인 중"}</span>
      </div>

      {groupedPlayers.length > 0 ? (
        <div className="university-live-tier-stack">
          {groupedPlayers.map((group) => (
            <section key={group.tier} className={`university-live-tier-row tier-card-${group.tier.toLowerCase()}`} aria-label={`${group.tier === "Unknown" ? "티어 확인" : universityTierLabels[group.tier]} 라이브 선수`}>
              <div className="university-live-tier-rank">
                <em>{tierCardSuits[group.tier]}</em>
                <strong>{group.tier === "Unknown" ? "티어 확인" : universityTierLabels[group.tier]}</strong>
                <span>{group.players.length} LIVE</span>
              </div>
              <div className="university-live-tier-players">
                {group.players.map((player) => (
                  <a key={`${player.college}-${player.id}`} className={`university-live-card race-${player.race.toLowerCase()}`} href={player.url} target="_blank" rel="noreferrer">
                    <span className="university-live-emblem"><UniversityIcon college={player.college} /></span>
                    <span className="university-live-college"><span>{player.college}</span>{player.viewers ? <em>시청자 {player.viewers.toLocaleString()}명</em> : null}</span>
                    <i>{raceLabels[player.race]}</i>
                    <strong>{player.name}</strong>
                    {player.title ? <p>{player.title}</p> : null}
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="university-live-empty">
          현재 조건에 맞는 라이브 선수가 없습니다.
        </div>
      )}
    </section>
  );
}

function UniversityTierCard({ college, liveCount }: { college: UniversityTierSnapshot; liveCount: number }) {
  const strongestRace = mainRace(college);
  const topCount = topTierCount(college);
  const sortedTiers = universitySnapshotTierOrder.filter((tier) => (college.tiers[tier] ?? 0) > 0);
  const eyebrow = college.college === "무소속" ? "FREE AGENT" : college.featured ? "THE HM" : "UNIVERSITY";
  const displayTotal = college.college === "무소속" && liveCount > 0 ? liveCount : college.total;

  return (
    <article className={college.featured ? "university-tier-card is-featured" : "university-tier-card"}>
      <div className="university-tier-card-head">
        <div className="university-tier-title">
          <UniversityIcon college={college.college} />
          <div>
            <span>{eyebrow}</span>
            <h2>{college.college}</h2>
          </div>
        </div>
        <strong>{displayTotal}</strong>
      </div>

      <div className="university-tier-card-metrics">
        <div>
          <span>상위 티어</span>
          <strong>{topCount}</strong>
        </div>
        <div>
          <span>주 종족</span>
          <strong>{raceLabels[strongestRace]}</strong>
        </div>
        <div>
          <span>라이브</span>
          <strong>{liveCount}</strong>
        </div>
      </div>

      {college.memberMarkers?.length ? (
        <div className="university-role-mark-list" aria-label={`${college.college} 주요 직책`}>
          {college.memberMarkers.map((marker) => (
            <span key={`${marker.label}-${marker.name}`}>
              <em>{marker.label}</em>
              <strong>{marker.name}</strong>
            </span>
          ))}
        </div>
      ) : null}

      <div className="university-race-bars">
        {visibleRaceOrder.filter((race) => college.race[race] > 0).map((race) => (
          <div key={race} className={`university-race-row race-${race.toLowerCase()}`}>
            <span>{raceLabels[race]}</span>
            <div><i className={shareClass(college.race[race], college.total)} /></div>
            <em>{college.race[race]}</em>
          </div>
        ))}
      </div>

      <div className="university-tier-chip-list">
        {sortedTiers.map((tier) => (
          <span key={tier} className={`university-tier-playing-card tier-card-${tier.toLowerCase()}`}>
            <em>{tierCardSuits[tier]}</em>
            <span>{tier === "Unknown" ? "티어 확인" : universityTierLabels[tier]}</span>
            <strong>{college.tiers[tier]}</strong>
          </span>
        ))}
      </div>
    </article>
  );
}

function UniversityIcon({ college, size = "regular" }: { college: string; size?: "regular" | "small" }) {
  const icon = getUniversityIcon(college);
  const className = `university-icon ${icon.className} ${icon.image ? "has-image" : ""} ${size === "small" ? "is-small" : ""}`;

  return (
    <span className={className} aria-hidden="true">
      {icon.image ? <img src={icon.image} alt="" width={size === "small" ? 22 : 42} height={size === "small" ? 22 : 42} /> : <span>{icon.label}</span>}
    </span>
  );
}
