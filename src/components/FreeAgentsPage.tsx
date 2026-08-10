"use client";

import { useEffect, useMemo, useState } from "react";
import { faRoster, type FaRosterEntry } from "@/data/faRoster";
import {
  universityTierLabels,
  universityTierOrder,
  universityTopTierKeys,
  type UniversityRaceKey,
  type UniversityTierKey,
} from "@/data/universityTiers";

const BRAND_EMBLEM_SRC = "/brand/hm-emblem.png";
const FA_ICON_SRC = "/universities/free-agent.webp";
const liveRefreshIntervalMs = 120_000;

const raceLabels: Record<UniversityRaceKey, string> = {
  Terran: "Terran",
  Zerg: "Zerg",
  Protoss: "Protoss",
  Unknown: "미분류",
};

const visibleRaceOrder: Array<Exclude<UniversityRaceKey, "Unknown">> = ["Terran", "Zerg", "Protoss"];
const liveRaceOrder: UniversityRaceKey[] = ["Terran", "Zerg", "Protoss", "Unknown"];
const tierFilters: Array<UniversityTierKey | "all"> = ["all", ...universityTierOrder];
const liveTierOrder: Array<UniversityTierKey | "Unknown"> = [...universityTierOrder, "Unknown"];
const tierCardSuits: Record<UniversityTierKey, string> = {
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

function formatTime(value: number | null) {
  if (!value) {
    return "확인 중";
  }

  return `${new Date(value).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 기준 · 2분 자동 갱신`;
}

function topTierCount(players: UniversityLivePlayer[]) {
  return players.filter((player) => player.tier !== "Unknown" && universityTopTierKeys.includes(player.tier)).length;
}

function mainRosterRace(players: readonly FaRosterEntry[]) {
  const totals = players.reduce<Record<Exclude<UniversityRaceKey, "Unknown">, number>>(
    (acc, player) => {
      acc[player.race] += 1;
      return acc;
    },
    { Terran: 0, Zerg: 0, Protoss: 0 },
  );

  return visibleRaceOrder.reduce((current, race) => (totals[race] > totals[current] ? race : current), "Terran" as Exclude<UniversityRaceKey, "Unknown">);
}

function sortLivePlayers(players: UniversityLivePlayer[]) {
  return [...players].sort((a, b) => {
    const raceOrderDiff = liveRaceOrder.indexOf(a.race) - liveRaceOrder.indexOf(b.race);
    if (raceOrderDiff !== 0) {
      return raceOrderDiff;
    }

    const viewerDiff = (b.viewers ?? 0) - (a.viewers ?? 0);
    if (viewerDiff !== 0) {
      return viewerDiff;
    }

    return a.name.localeCompare(b.name, "ko");
  });
}

export function FreeAgentsPage() {
  const [activeTier, setActiveTier] = useState<UniversityTierKey | "all">("all");
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
  const freeAgents = useMemo(() => (livePayload?.players ?? []).filter((player) => player.college === "무소속"), [livePayload]);
  const filteredPlayers = useMemo(() => {
    return freeAgents.filter((player) => {
      const tierMatches = activeTier === "all" || player.tier === activeTier;
      const raceMatches = activeRace === "all" || player.race === activeRace;
      const searchMatches =
        !normalizedSearch ||
        [player.name, player.id, player.title ?? ""].some((value) => value.toLowerCase().includes(normalizedSearch));
      return tierMatches && raceMatches && searchMatches;
    });
  }, [activeRace, activeTier, freeAgents, normalizedSearch]);

  const filteredRoster = useMemo(() => {
    return faRoster.filter((player) => {
      const tierMatches = activeTier === "all" || player.tier === activeTier;
      const raceMatches = activeRace === "all" || player.race === activeRace;
      const liveTitle = freeAgents.find((livePlayer) => livePlayer.id === player.soopId)?.title ?? "";
      const searchMatches =
        !normalizedSearch ||
        [player.name, player.registeredName ?? "", player.soopId, liveTitle].some((value) => value.toLowerCase().includes(normalizedSearch));
      return tierMatches && raceMatches && searchMatches;
    });
  }, [activeRace, activeTier, freeAgents, normalizedSearch]);

  const liveBySoopId = useMemo(() => new Map(freeAgents.map((player) => [player.id, player])), [freeAgents]);

  const rosterRaceCounts = useMemo(() => {
    return faRoster.reduce<Record<Exclude<UniversityRaceKey, "Unknown">, number>>(
      (acc, player) => {
        acc[player.race] += 1;
        return acc;
      },
      { Terran: 0, Zerg: 0, Protoss: 0 },
    );
  }, []);

  const totalViewers = freeAgents.reduce((sum, player) => sum + (player.viewers ?? 0), 0);
  const strongestRace = mainRosterRace(faRoster);

  return (
    <main className="site-shell university-tier-shell free-agent-shell min-h-screen text-silver">
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/10 bg-carbon/82 backdrop-blur-xl">
        <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10" aria-label="FA 현황판 내비게이션">
          <a className="flex items-center gap-3 text-white" href="/">
            <img className="h-12 w-12 object-contain" src={BRAND_EMBLEM_SRC} alt="THE HM emblem" width={48} height={48} />
            <span className="text-sm font-black uppercase tracking-[0.24em]">THE HM</span>
          </a>
          <div className="university-tier-nav-links">
            <a className="nav-link" href="/">HOME</a>
            <a className="nav-link" href="/university-tiers">대학티어</a>
            <a className="nav-link" href="/free-agents">FA현황</a>
            <a className="nav-link" href="/k-jungman-cup">K-중만컵</a>
            <a className="nav-link" href="/ai-tools">AI분석툴</a>
          </div>
        </nav>
      </header>

      <section className="free-agent-hero px-5 pb-8 pt-28 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="free-agent-hero-card">
            <div className="free-agent-logo" aria-hidden="true">
              <img src={FA_ICON_SRC} alt="" width={96} height={96} />
            </div>
            <div className="free-agent-hero-copy">
              <div className="panel-kicker">FREE AGENT BOARD</div>
              <h1>FA 현황판</h1>
              <p>전체 FA 등록 인원과 현재 라이브 선수를 분리해서, 티어와 종족 기준으로 바로 확인합니다.</p>
            </div>
            <a className="free-agent-back-link" href="/university-tiers">대학티어 보기</a>
          </div>

          <div className="university-tier-summary" aria-label="FA 현황 요약">
            <SummaryTile value={faRoster.length} label="등록 FA" />
            <SummaryTile value={freeAgents.length} label="라이브 FA" />
            <SummaryTile value={totalViewers} label="총 시청자" />
            <SummaryTile value={rosterRaceCounts.Terran} label="Terran" />
            <SummaryTile value={rosterRaceCounts.Zerg} label="Zerg" />
            <SummaryTile value={rosterRaceCounts.Protoss} label="Protoss" />
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="free-agent-quick-panel">
            <div>
              <span>주 종족</span>
              <strong>{raceLabels[strongestRace]}</strong>
            </div>
            <div>
              <span>상위 티어 라이브</span>
              <strong>{topTierCount(freeAgents)}명</strong>
            </div>
            <div>
              <span>현재 조건</span>
              <strong>{filteredRoster.length}명 등록 · {filteredPlayers.length}명 LIVE</strong>
            </div>
          </div>

          <div className="university-tier-controls free-agent-controls">
            <label className="university-search-control">
              <span>검색</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="선수명, SOOP ID"
              />
            </label>
            <label>
              <span>티어</span>
              <select value={activeTier} onChange={(event) => setActiveTier(event.target.value as UniversityTierKey | "all")}>
                {tierFilters.map((tier) => (
                  <option key={tier} value={tier}>{tier === "all" ? "전체" : universityTierLabels[tier]}</option>
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

          <FreeAgentLiveBoard players={filteredPlayers} updatedAt={livePayload?.updatedAt ?? null} />
          <FreeAgentRosterBoard players={filteredRoster} liveBySoopId={liveBySoopId} />
        </div>
      </section>
    </main>
  );
}

function FreeAgentRosterBoard({ players, liveBySoopId }: { players: readonly FaRosterEntry[]; liveBySoopId: Map<string, UniversityLivePlayer> }) {
  return (
    <section className="free-agent-roster-board" aria-labelledby="free-agent-roster-title">
      <div className="university-live-board-head">
        <div>
          <div className="panel-kicker">REGISTERED FREE AGENTS</div>
          <h2 id="free-agent-roster-title">FA 전체 명단</h2>
          <p>저장된 SOOP 방송국 주소 기준입니다. 라이브 중이면 방송 보기 링크로 연결됩니다.</p>
        </div>
        <span>{players.length}명</span>
      </div>
      <div className="free-agent-roster-grid">
        {players.map((player) => {
          const live = liveBySoopId.get(player.soopId);
          const href = live?.url ?? player.url;

          return (
            <a key={player.soopId} className={`free-agent-roster-card race-${player.race.toLowerCase()} ${live ? "is-live" : ""}`} href={href} target="_blank" rel="noreferrer">
              {live?.thumbnail ? (
                <span className="live-thumbnail-preview" aria-hidden="true">
                  <img src={live.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" />
                </span>
              ) : null}
              <span className="free-agent-roster-avatar">
                <img src={player.profileImage} alt="" width={48} height={48} loading="lazy" referrerPolicy="no-referrer" />
              </span>
              <span className="free-agent-roster-body">
                <strong>{player.name}</strong>
                <small>{player.registeredName ? `${player.registeredName} · ` : ""}{player.soopId}</small>
                <span className="free-agent-roster-tags">
                  <em>{universityTierLabels[player.tier]}</em>
                  <i>{raceLabels[player.race]}</i>
                  {live ? <b>LIVE</b> : null}
                </span>
              </span>
            </a>
          );
        })}
      </div>
    </section>
  );
}

function SummaryTile({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <strong>{value.toLocaleString()}</strong>
      <span>{label}</span>
    </div>
  );
}

function FreeAgentLiveBoard({ players, updatedAt }: { players: UniversityLivePlayer[]; updatedAt: number | null }) {
  const groupedPlayers = liveTierOrder
    .map((tier) => ({
      tier,
      players: sortLivePlayers(players.filter((player) => player.tier === tier)),
    }))
    .filter((group) => group.players.length > 0);

  return (
    <section className="university-live-board free-agent-live-board" aria-labelledby="free-agent-live-title">
      <div className="university-live-board-head">
        <div>
          <div className="panel-kicker">LIVE FREE AGENTS</div>
          <h2 id="free-agent-live-title">무소속 라이브 명단</h2>
          <p>현재 방송 중인 FA를 티어별로 나눠서 보여줍니다. 카드 색은 종족 기준입니다.</p>
        </div>
        <span>{formatTime(updatedAt)}</span>
      </div>

      {groupedPlayers.length > 0 ? (
        <div className="university-live-tier-stack">
          {groupedPlayers.map((group) => (
            <section key={group.tier} className={`university-live-tier-row tier-card-${group.tier.toLowerCase()}`} aria-label={`${group.tier === "Unknown" ? "티어 확인" : universityTierLabels[group.tier]} FA 라이브`}>
              <div className="university-live-tier-rank">
                <em>{group.tier === "Unknown" ? "?" : tierCardSuits[group.tier]}</em>
                <strong>{group.tier === "Unknown" ? "티어 확인" : universityTierLabels[group.tier]}</strong>
                <span>{group.players.length} LIVE</span>
              </div>
              <div className="university-live-tier-players">
                {group.players.map((player) => (
                  <a key={player.id} className={`university-live-card free-agent-player-card race-${player.race.toLowerCase()}`} href={player.url} target="_blank" rel="noreferrer">
                    {player.thumbnail ? (
                      <span className="live-thumbnail-preview" aria-hidden="true">
                        <img src={player.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" />
                      </span>
                    ) : null}
                    <span className="university-live-emblem free-agent-card-emblem">
                      <span className="university-icon icon-free has-image" aria-hidden="true">
                        <img src={FA_ICON_SRC} alt="" width={42} height={42} />
                      </span>
                    </span>
                    <span className="university-live-college">
                      <span>무소속</span>
                      {player.viewers ? <em>시청자 {player.viewers.toLocaleString()}명</em> : null}
                    </span>
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
          현재 조건에 맞는 무소속 라이브 선수가 없습니다.
        </div>
      )}
    </section>
  );
}
