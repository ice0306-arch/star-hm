"use client";

import { useEffect, useMemo, useState } from "react";
import { RaceIcon } from "@/components/RaceIcon";
import {
  balanceTiers,
  orderedMembers,
  races,
  type BalanceTier,
  type Member,
  type MemberGroup,
  type Race,
} from "@/data/members";

const ENTRY_KEY = "the-hm-entry-completed";
const SOUND_KEY = "the-hm-sound-enabled";
const THEME_KEY = "the-hm-theme-mode";
const BRAND_EMBLEM_SRC = "/brand/hm-emblem.png";
const BRAND_EMBLEM_ANIMATED_SRC = "/brand/hm-emblem.gif";

type NoticeTierFilter = "전체" | "CHAIRMAN" | Exclude<BalanceTier, null>;
type RaceFilter = "전체" | Race;
type LiveState = "checking" | "live" | "offline" | "unknown" | "unavailable";
type ThemeMode = "dark" | "light";

interface LiveStatus {
  memberId: string;
  isLive: boolean;
  status: LiveState;
  viewer: number;
  title: string;
  startedAt: string;
  url: string;
}

interface PostItem {
  id: string;
  memberId: string;
  memberName: string;
  title: string;
  summary: string;
  url: string;
  regDate: string;
  commentCount: number;
  readCount: number;
  boardName: string;
  isNotice: boolean;
}

const groupOrder: MemberGroup[] = ["leadership", "faculty-coach", "student"];

const groupMeta: Record<MemberGroup, { title: string; description: string }> = {
  leadership: {
    title: "이사장",
    description: "THE HM의 방향과 팀 정체성을 대표합니다.",
  },
  "faculty-coach": {
    title: "총장 / 교수 / 코치",
    description: "전략, 운영, 성장을 이끄는 핵심 라인입니다.",
  },
  student: {
    title: "학생",
    description: "각자의 티어와 종족으로 팀 밸런스를 완성합니다.",
  },
};

const navItems = [
  { label: "TEAM", href: "#team" },
  { label: "ACTIVITY", href: "#activity" },
  { label: "ROSTER", href: "#roster" },
  { label: "INTEL", href: "#intel" },
  { label: "대학티어", href: "/university-tiers" },
  { label: "ABOUT", href: "#about" },
];

const specialTiers = new Set<Exclude<BalanceTier, null>>(["Spade", "King", "God", "Joker"]);
const noticeTierFilters: NoticeTierFilter[] = ["CHAIRMAN", ...balanceTiers];

function countBy<T extends string>(items: Member[], getKey: (member: Member) => T | null) {
  return items.reduce<Record<T, number>>((acc, member) => {
    const key = getKey(member);
    if (key) {
      acc[key] = (acc[key] ?? 0) + 1;
    }
    return acc;
  }, {} as Record<T, number>);
}

function readStorage(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    return;
  }
}

function removeStorage(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    return;
  }
}

export function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showEntry, setShowEntry] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeRace, setActiveRace] = useState<RaceFilter>("전체");
  const [liveStatuses, setLiveStatuses] = useState<Record<string, LiveStatus>>({});
  const [activityUpdatedAt, setActivityUpdatedAt] = useState<number | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [activePostTier, setActivePostTier] = useState<NoticeTierFilter>("전체");
  const [activePostMember, setActivePostMember] = useState("전체");
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [hasCompletedEntry, setHasCompletedEntry] = useState(true);

  const entryOverlayEnabled = process.env.NEXT_PUBLIC_ENABLE_ENTRY_OVERLAY !== "false";
  const forceEntryOverlay = process.env.NEXT_PUBLIC_FORCE_ENTRY_OVERLAY === "true";

  const raceCounts = useMemo(
    () => countBy(orderedMembers, (member) => member.race),
    [],
  );

  const fallbackPosts = useMemo(
    () =>
      orderedMembers.map((member) => ({
        id: `${member.id}-station-board`,
        memberId: member.id,
        memberName: member.name,
        title: `${member.name} 공지 게시판`,
        summary: "최신 공지는 멤버 채널 게시판에서 확인할 수 있습니다.",
        url: member.url,
        regDate: "",
        commentCount: 0,
        readCount: 0,
        boardName: "채널 공지",
        isNotice: true,
      })),
    [],
  );

  const activePosts = posts.length ? posts : fallbackPosts;

  const filteredIntelMembers = useMemo(() => {
    if (activeRace === "전체") {
      return orderedMembers;
    }
    return orderedMembers.filter((member) => member.race === activeRace);
  }, [activeRace]);

  const filteredPosts = useMemo(() => {
    return activePosts.filter((post) => {
      const member = orderedMembers.find((item) => item.id === post.memberId);
      const tierMatches = activePostTier === "전체" || (member ? noticeTierValue(member) === activePostTier : false);
      const memberMatches = activePostMember === "전체" || post.memberId === activePostMember;
      return tierMatches && memberMatches;
    });
  }, [activePostMember, activePostTier, activePosts]);

  const stats = useMemo(
    () => [
      {
        label: "이사장",
        value: orderedMembers.filter((member) => member.group === "leadership").length,
      },
      {
        label: "총장 / 교수 / 코치",
        value: orderedMembers.filter((member) => member.group === "faculty-coach").length,
      },
      {
        label: "학생",
        value: orderedMembers.filter((member) => member.group === "student").length,
      },
      {
        label: "총 멤버",
        value: orderedMembers.length,
      },
    ],
    [],
  );

  useEffect(() => {
    setSoundEnabled(readStorage(SOUND_KEY) !== "false");
    setThemeMode(readStorage(THEME_KEY) === "light" ? "light" : "dark");

    const completed = readStorage(ENTRY_KEY) === "true";
    setHasCompletedEntry(entryOverlayEnabled ? completed : true);

    if (!entryOverlayEnabled) {
      return;
    }

    if (forceEntryOverlay || !completed) {
      setHasCompletedEntry(false);
      setShowEntry(true);
    }
  }, [entryOverlayEnabled, forceEntryOverlay]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadLiveStatus() {
      try {
        const response = await fetch("/api/live", { signal: controller.signal });

        if (response.ok) {
          const payload = await response.json();
          setLiveStatuses(
            Object.fromEntries((payload.statuses ?? []).map((status: LiveStatus) => [status.memberId, status])),
          );
          setActivityUpdatedAt(Number(payload.updatedAt || Date.now()));
        }
      } catch {
        return;
      }
    }

    async function loadPosts() {
      try {
        const response = await fetch("/api/posts", { signal: controller.signal });

        if (response.ok) {
          const payload = await response.json();
          setPosts(Array.isArray(payload.posts) ? payload.posts : []);
        }
      } catch {
        return;
      } finally {
        setPostsLoading(false);
      }
    }

    loadLiveStatus();
    const postsTimer = window.setTimeout(loadPosts, 300);

    return () => {
      window.clearTimeout(postsTimer);
      controller.abort();
    };
  }, []);

  const playEntrySound = async () => {
    if (!soundEnabled) {
      return;
    }

    try {
      const audio = new Audio("/audio/hm-entry.mp3");
      audio.volume = 0.24;
      await audio.play();
    } catch {
      return;
    }
  };

  const handleEnter = async () => {
    await playEntrySound();
    writeStorage(ENTRY_KEY, "true");
    setHasCompletedEntry(true);
    setShowEntry(false);
  };

  const handleReplayIntro = () => {
    if (!entryOverlayEnabled) {
      return;
    }

    removeStorage(ENTRY_KEY);
    setHasCompletedEntry(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setShowEntry(true);
  };

  const handleSoundToggle = () => {
    setSoundEnabled((current) => {
      const next = !current;
      writeStorage(SOUND_KEY, String(next));
      return next;
    });
  };

  const handleThemeToggle = () => {
    setThemeMode((current) => {
      const next = current === "dark" ? "light" : "dark";
      writeStorage(THEME_KEY, next);
      return next;
    });
  };

  return (
    <main className={`site-shell theme-${themeMode} min-h-screen overflow-hidden text-silver`}>
      {showEntry ? (
        <EntryOverlay onEnter={handleEnter} soundEnabled={soundEnabled} onSoundToggle={handleSoundToggle} />
      ) : null}

      <Header
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        homeHref={hasCompletedEntry ? "#activity" : "#team"}
        items={hasCompletedEntry ? navItems.filter((item) => item.href !== "#team") : navItems}
      />

      {!hasCompletedEntry ? (
        <>
          <section id="team" className="hero-shell relative isolate flex min-h-[92vh] items-center px-5 pt-24 sm:px-8 lg:px-10">
            <div className="mx-auto grid w-full max-w-7xl gap-10 py-14 lg:grid-cols-[1fr_0.86fr] lg:items-center">
              <div className="max-w-3xl">
                <div className="mb-7 inline-flex items-center gap-3 border border-gold/35 bg-gold/10 px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-gold">
                  <span className="h-1.5 w-1.5 bg-gold" />
                  Premium esports institution
                </div>
                <h1 className="text-[clamp(3.25rem,12vw,8.7rem)] font-black uppercase leading-[0.84] tracking-0 text-white">
                  THE HM
                </h1>
                <p className="mt-5 text-sm font-semibold uppercase tracking-[0.42em] text-steel sm:text-base">
                  StarCraft Team Roster
                </p>
                <p className="mt-7 max-w-2xl text-balance text-lg leading-8 text-silver/84 sm:text-xl">
                  전략, 성장, 그리고 팀워크로 완성되는 스타크래프트 팀 THE HM
                </p>
                <div className="mt-9 flex flex-wrap gap-3">
                  <a className="command-button command-button-primary" href="#activity">
                    LIVE STATUS
                  </a>
                  <a className="command-button" href="#roster">
                    VIEW ROSTER
                  </a>
                </div>
                <StatsGrid stats={stats} className="mt-8 lg:hidden" />
              </div>

              <div className="hero-emblem-wrap mx-auto w-full max-w-[430px]">
                <div className="hero-emblem-frame">
                  <img
                    className="mx-auto h-auto w-full max-w-[360px]"
                    src={BRAND_EMBLEM_ANIMATED_SRC}
                    alt="THE HM emblem"
                    width={288}
                    height={288}
                    fetchPriority="high"
                    decoding="async"
                  />
                </div>
                <div className="mt-5 text-center text-xs font-semibold uppercase tracking-[0.34em] text-steel/80">
                  Strategic hierarchy protocol
                </div>
              </div>
            </div>
          </section>

          <section aria-label="Team statistics" className="hidden px-5 pb-12 sm:px-8 lg:block lg:px-10">
            <StatsGrid stats={stats} className="mx-auto max-w-7xl" />
          </section>
        </>
      ) : null}

      <section id="activity" className="activity-priority section-band px-5 py-20 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="ACTIVITY"
            title="LIVE STATUS & NOTICE BOARD"
            description="현재 온라인 여부와 멤버별 공지 게시글을 한 화면에서 확인할 수 있습니다."
          />
          <div className="activity-layout mt-8">
            <LiveStatusBoard members={orderedMembers} liveStatuses={liveStatuses} updatedAt={activityUpdatedAt} />
            <NoticeBoard
              posts={filteredPosts}
              allPosts={activePosts}
              loading={postsLoading}
              activeTier={activePostTier}
              activeMember={activePostMember}
              onTierChange={(tier) => {
                setActivePostTier(tier);
                setActivePostMember("전체");
              }}
              onMemberChange={setActivePostMember}
            />
          </div>
        </div>
      </section>

      <section id="roster" className="section-band px-5 py-20 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="ROSTER"
            title="THE HM COMMAND ROSTER"
            description="직책, 밸런스 티어, 종족을 분리해 팀의 구조와 전력을 한눈에 볼 수 있도록 구성했습니다."
          />
          <div className="mt-10 space-y-14">
            {groupOrder.map((group) => (
              <RosterGroup
                key={group}
                title={groupMeta[group].title}
                description={groupMeta[group].description}
                members={orderedMembers.filter((member) => member.group === group)}
                liveStatuses={liveStatuses}
              />
            ))}
          </div>
        </div>
      </section>

      <section id="intel" className="section-band px-5 py-20 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="INTEL"
            title="RACE INTEL"
            description="종족별 멤버 구성을 빠르게 볼 수 있도록 정리했습니다."
          />
          <div className="intel-panel mt-8">
            <div className="race-intel-head">
              <div>
                <span className="panel-kicker">RACE FILTER</span>
                <strong>{activeRace === "전체" ? "전체 종족" : activeRace}</strong>
              </div>
              <span>{filteredIntelMembers.length} members</span>
            </div>
            <div className="filter-chip-grid race-only mt-5" aria-label="Race filter">
              <RaceChip race="전체" count={orderedMembers.length} active={activeRace === "전체"} onClick={() => setActiveRace("전체")} />
              {races.map((race) => (
                <RaceChip
                  key={race}
                  race={race}
                  count={raceCounts[race] ?? 0}
                  active={activeRace === race}
                  onClick={() => setActiveRace(race)}
                />
              ))}
            </div>
            <div className="mt-6">
              <IntelMemberList members={filteredIntelMembers} liveStatuses={liveStatuses} />
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="px-5 py-20 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1fr] lg:items-center">
          <SectionHeader eyebrow="ABOUT" title="THE HM IDENTITY" />
          <div className="about-panel">
            <p>
              THE HM은 스타크래프트를 중심으로 각자의 성장과 전략을 함께 만들어가는 팀입니다.
              직급과 티어를 넘어, 모든 멤버가 하나의 팀으로 연결됩니다.
            </p>
          </div>
        </div>
      </section>

      <Footer onReplayIntro={handleReplayIntro} entryOverlayEnabled={entryOverlayEnabled} />
      <ThemeControl themeMode={themeMode} onToggle={handleThemeToggle} />
      <SoundControl soundEnabled={soundEnabled} onToggle={handleSoundToggle} />
    </main>
  );
}

function Header({
  isMenuOpen,
  setIsMenuOpen,
  homeHref,
  items,
}: {
  isMenuOpen: boolean;
  setIsMenuOpen: (value: boolean) => void;
  homeHref: string;
  items: typeof navItems;
}) {
  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/10 bg-carbon/82 backdrop-blur-xl">
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10" aria-label="Primary navigation">
        <a className="flex items-center gap-3 text-white" href={homeHref} onClick={() => setIsMenuOpen(false)}>
          <img
            className="h-12 w-12 object-contain"
            src={BRAND_EMBLEM_SRC}
            alt="THE HM emblem"
            width={48}
            height={48}
            loading="eager"
            decoding="async"
          />
          <span className="text-sm font-black uppercase tracking-[0.24em]">THE HM</span>
        </a>

        <button
          className="menu-button md:hidden"
          type="button"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <span className="sr-only">Toggle navigation</span>
          <span />
          <span />
          <span />
        </button>

        <div className="hidden items-center gap-7 md:flex">
          {items.map((item) => (
            <a key={item.href} className="nav-link" href={item.href}>
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      <div id="mobile-menu" className={isMenuOpen ? "mobile-menu is-open" : "mobile-menu"} aria-hidden={!isMenuOpen}>
        {items.map((item) => (
          <div key={item.href}>
            <a href={item.href} onClick={() => setIsMenuOpen(false)}>
              {item.label}
            </a>
          </div>
        ))}
      </div>
    </header>
  );
}

function EntryOverlay({
  onEnter,
  soundEnabled,
  onSoundToggle,
}: {
  onEnter: () => void;
  soundEnabled: boolean;
  onSoundToggle: () => void;
}) {
  return (
    <div className="entry-overlay" role="dialog" aria-modal="true" aria-labelledby="entry-title">
      <div className="entry-panel">
        <img
          className="mx-auto h-auto w-44 sm:w-56"
          src={BRAND_EMBLEM_ANIMATED_SRC}
          alt="THE HM emblem"
          width={288}
          height={288}
          loading="eager"
          decoding="async"
        />
        <h2 id="entry-title" className="mt-6 text-4xl font-black uppercase tracking-[0.18em] text-white sm:text-6xl">
          THE HM
        </h2>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.34em] text-steel sm:text-sm">
          StarCraft Team Roster
        </p>
        <button className="command-button command-button-primary mt-8" type="button" onClick={onEnter}>
          ENTER THE HM
        </button>
        <button className="mx-auto mt-4 block text-xs font-semibold uppercase tracking-[0.18em] text-steel transition hover:text-white" type="button" onClick={onSoundToggle}>
          {soundEnabled ? "SOUND ON" : "SOUND OFF"}
        </button>
        <p className="mt-5 text-xs leading-5 text-steel/72">
          클릭 후에만 짧은 오리지널 입장 사운드가 재생됩니다.
        </p>
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-3xl">
      <div className="text-xs font-black uppercase tracking-[0.34em] text-gold">{eyebrow}</div>
      <h2 className="mt-3 text-3xl font-black uppercase text-white sm:text-5xl">{title}</h2>
      {description ? <p className="mt-4 text-base leading-7 text-steel sm:text-lg">{description}</p> : null}
    </div>
  );
}

function StatsGrid({
  stats,
  className = "",
}: {
  stats: Array<{ label: string; value: number }>;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-2 gap-3 md:grid-cols-4 ${className}`}>
      {stats.map((stat) => (
        <div key={stat.label} className="stat-card">
          <div className="text-3xl font-black text-white">{stat.value}</div>
          <div className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-steel">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

function RosterGroup({
  title,
  description,
  members,
  liveStatuses,
}: {
  title: string;
  description: string;
  members: Member[];
  liveStatuses: Record<string, LiveStatus>;
}) {
  return (
    <section aria-labelledby={`group-${title}`}>
      <div className="roster-group-head">
        <div className="roster-group-title">
          <h3 id={`group-${title}`} className="text-xl font-black text-white">
            {title}
          </h3>
          <p className="mt-1 text-sm text-steel">{description}</p>
        </div>
        <span className="roster-group-count">{members.length} members</span>
      </div>
      <MemberGrid members={members} liveStatuses={liveStatuses} />
    </section>
  );
}

function MemberGrid({
  members,
  liveStatuses = {},
  compact = false,
}: {
  members: Member[];
  liveStatuses?: Record<string, LiveStatus>;
  compact?: boolean;
}) {
  if (members.length === 0) {
    return <div className="empty-panel">조건에 맞는 멤버가 없습니다.</div>;
  }

  return (
    <div className={compact ? "member-grid compact" : "member-grid"}>
      {members.map((member) => (
        <MemberCard key={member.id} member={member} liveStatus={liveStatuses[member.id]} />
      ))}
    </div>
  );
}

function MemberCard({ member, liveStatus }: { member: Member; liveStatus?: LiveStatus }) {
  const tierLabel = member.balanceTier ?? "CHAIRMAN";
  const isSpecial = member.balanceTier ? specialTiers.has(member.balanceTier) : false;

  return (
    <article className={`member-card ${raceClass(member.race)}`}>
      <div className="member-card-status">
        <StatusPill liveStatus={liveStatus} />
      </div>
      <div className="member-card-main">
        <MemberAvatar member={member} liveStatus={liveStatus} />
        <div className="member-card-copy">
          <h4>{member.name}</h4>
          <div className="member-card-meta">
            <div className="member-card-tags">
              <span className={tierClass(member.balanceTier, isSpecial)}>{tierLabel}</span>
              <span className={roleClass(member)}>{member.role}</span>
              <span className={racePillClass(member.race)}>
                <RaceIcon race={member.race} className="h-4 w-4" />
                {member.race}
              </span>
            </div>
          </div>
        </div>
      </div>
      <span className="member-card-link">
        <a href={member.url} target="_blank" rel="noopener noreferrer" aria-label={`${member.name} ${member.linkLabel}`}>
          {member.linkLabel}
          <span aria-hidden="true">↗</span>
        </a>
        {member.youtubeUrl ? (
          <>
            <span className="member-card-link-divider" aria-hidden="true">|</span>
            <a href={member.youtubeUrl} target="_blank" rel="noopener noreferrer" aria-label={`${member.name} 유튜브 채널 바로가기`}>
              유튜브 채널 바로가기
              <span aria-hidden="true">↗</span>
            </a>
          </>
        ) : null}
      </span>
    </article>
  );
}

function MemberAvatar({
  member,
  liveStatus,
  compact = false,
}: {
  member: Member;
  liveStatus?: LiveStatus;
  compact?: boolean;
}) {
  const label = Array.from(member.name).slice(0, 2).join("");
  const isLive = liveStatus?.isLive;

  return (
    <span className={`${compact ? "profile-avatar compact" : "profile-avatar"} ${member.avatar ? "has-image" : ""} ${raceClass(member.race)} ${isLive ? "is-live" : ""}`} aria-hidden="true">
      {member.avatar ? (
        <img
          className="profile-avatar-image"
          src={member.avatar}
          alt=""
          width={compact ? 46 : 58}
          height={compact ? 46 : 58}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <>
          <RaceIcon race={member.race} className="profile-avatar-mark" />
          <span>{label}</span>
        </>
      )}
    </span>
  );
}

function StatusPill({ liveStatus }: { liveStatus?: LiveStatus }) {
  const state = liveStatus?.status ?? "checking";
  return <span className={`status-pill status-${state}`}>{statusLabel(state, liveStatus?.isLive)}</span>;
}

function LiveStatusBoard({
  members,
  liveStatuses,
  updatedAt,
}: {
  members: Member[];
  liveStatuses: Record<string, LiveStatus>;
  updatedAt: number | null;
}) {
  const sortedMembers = [...members].sort((a, b) => {
    const aLive = liveStatuses[a.id]?.isLive ? 1 : 0;
    const bLive = liveStatuses[b.id]?.isLive ? 1 : 0;
    return bLive - aLive || a.order - b.order;
  });
  const liveCount = members.filter((member) => liveStatuses[member.id]?.isLive).length;

  return (
    <section className="activity-panel" aria-labelledby="live-status-title">
      <div className="activity-panel-head">
        <div>
          <div className="panel-kicker">LIVE STATUS</div>
          <h3 id="live-status-title">온라인 멤버</h3>
        </div>
        <div className="live-count">
          <strong>{liveCount}</strong>
          <span>LIVE</span>
        </div>
      </div>
      <div className="activity-updated">{updatedAt ? `${formatTimestamp(updatedAt)} 기준` : "온라인 상태 확인중"}</div>
      <div className="live-list">
        {sortedMembers.map((member) => {
          const status = liveStatuses[member.id];
          const href = status?.url || member.url;
          return (
            <a key={member.id} className="live-row" href={href} target="_blank" rel="noopener noreferrer">
              <MemberAvatar member={member} liveStatus={status} compact />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <strong>{member.name}</strong>
                  <IdentityTags member={member} />
                </div>
                <p>{status?.isLive ? status.title || "방송 중" : statusMessage(status?.status)}</p>
              </div>
              <div className="live-row-side">
                <StatusPill liveStatus={status} />
                {status?.isLive && status.viewer > 0 ? <span>{status.viewer.toLocaleString()}명</span> : null}
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}

function NoticeBoard({
  posts,
  allPosts,
  loading,
  activeTier,
  activeMember,
  onTierChange,
  onMemberChange,
}: {
  posts: PostItem[];
  allPosts: PostItem[];
  loading: boolean;
  activeTier: NoticeTierFilter;
  activeMember: string;
  onTierChange: (tier: NoticeTierFilter) => void;
  onMemberChange: (memberId: string) => void;
}) {
  const postMembersById = useMemo(() => new Map(orderedMembers.map((member) => [member.id, member])), []);

  const tierPostCounts = useMemo(() => {
    const counts: Partial<Record<NoticeTierFilter, number>> = { 전체: allPosts.length };
    allPosts.forEach((post) => {
      const member = postMembersById.get(post.memberId);
      if (!member) {
        return;
      }
      const tier = noticeTierValue(member);
      counts[tier] = (counts[tier] ?? 0) + 1;
    });
    return counts;
  }, [allPosts, postMembersById]);

  const memberOptions = useMemo(() => {
    return orderedMembers.filter((member) => activeTier === "전체" || noticeTierValue(member) === activeTier);
  }, [activeTier]);

  return (
    <section className="activity-panel" aria-labelledby="notice-board-title">
      <div className="activity-panel-head">
        <div>
          <div className="panel-kicker">NOTICE BOARD</div>
          <h3 id="notice-board-title">멤버 공지 보관함</h3>
        </div>
        <div className="live-count">
          <strong>{posts.length}</strong>
          <span>POSTS</span>
        </div>
      </div>
      <div className="notice-tools" aria-label="공지 필터">
        <label className="notice-select-field">
          <span>Tier</span>
          <select value={activeTier} onChange={(event) => onTierChange(event.target.value as NoticeTierFilter)}>
            <option value="전체">전체 ({allPosts.length})</option>
            {noticeTierFilters.map((tier) => (
              <option key={tier} value={tier}>
                {tier} ({tierPostCounts[tier] ?? 0})
              </option>
            ))}
          </select>
        </label>
        <label className="notice-select-field">
          <span>Member</span>
          <select value={activeMember} onChange={(event) => onMemberChange(event.target.value)}>
            <option value="전체">전체 멤버</option>
            {memberOptions.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
        <div className="notice-filter-state">
          <span>{activeTier}</span>
          <strong>{posts.length.toLocaleString()} posts</strong>
        </div>
      </div>
      <div className="post-list">
        {loading && allPosts.length === 0 ? <div className="empty-panel">공지 게시글을 불러오는 중입니다.</div> : null}
        {!loading && posts.length === 0 ? <div className="empty-panel">선택한 조건의 공지가 없습니다.</div> : null}
        {posts.slice(0, 10).map((post, index) => {
          const member = orderedMembers.find((item) => item.id === post.memberId);
          return (
            <a key={post.id} className={index === 0 ? "post-row is-featured" : "post-row"} href={post.url} target="_blank" rel="noopener noreferrer">
              <div className="post-owner">
                {member ? <MemberAvatar member={member} compact /> : null}
                <div className="min-w-0">
                  <div className="post-owner-line">
                    <strong>{post.memberName}</strong>
                    {member ? <IdentityTags member={member} /> : null}
                  </div>
                  <div className="post-row-meta">
                    <span>{post.boardName || "공지"}</span>
                    {post.regDate ? <span>{formatPostDate(post.regDate)}</span> : null}
                  </div>
                </div>
              </div>
              <strong className="post-title">{post.title}</strong>
              {post.summary ? <p>{post.summary}</p> : null}
              <div className="post-row-foot">
                {post.isNotice ? <span>NOTICE</span> : <span>POST</span>}
                {post.readCount > 0 ? <span>조회 {post.readCount.toLocaleString()}</span> : null}
                {post.commentCount > 0 ? <span>댓글 {post.commentCount.toLocaleString()}</span> : null}
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}

function IntelMemberList({
  members,
  liveStatuses,
}: {
  members: Member[];
  liveStatuses: Record<string, LiveStatus>;
}) {
  if (members.length === 0) {
    return <div className="empty-panel">조건에 맞는 멤버가 없습니다.</div>;
  }

  return (
    <div className="intel-list">
      {members.map((member) => (
        <a key={member.id} className={`intel-row ${raceClass(member.race)}`} href={member.url} target="_blank" rel="noopener noreferrer">
          <MemberAvatar member={member} liveStatus={liveStatuses[member.id]} compact />
          <div className="min-w-0 flex-1">
            <div className="intel-row-name">
              <strong>{member.name}</strong>
              <StatusPill liveStatus={liveStatuses[member.id]} />
            </div>
            <IdentityTags member={member} />
          </div>
          <span className="intel-row-arrow" aria-hidden="true">↗</span>
        </a>
      ))}
    </div>
  );
}

function IdentityTags({ member }: { member: Member }) {
  return (
    <span className="identity-tags">
      <span className={identityRoleClass(member)}>{member.role}</span>
      <span className={identityTierClass(member.balanceTier)}>{member.balanceTier ?? "CHAIRMAN"}</span>
      <span className={identityRaceClass(member.race)}>{member.race}</span>
    </span>
  );
}

function RaceChip({ race, count, active, onClick }: { race: RaceFilter; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      className={active ? `filter-chip race-chip is-active ${raceClass(race)}` : `filter-chip race-chip ${raceClass(race)}`}
      type="button"
      data-race-value={race}
      onClick={onClick}
    >
      {race === "전체" ? <span className="race-chip-dot" aria-hidden="true" /> : <RaceIcon race={race} className="h-5 w-5" />}
      <span>{race}</span>
      <span>{count}</span>
    </button>
  );
}

function Footer({
  onReplayIntro,
  entryOverlayEnabled,
}: {
  onReplayIntro: () => void;
  entryOverlayEnabled: boolean;
}) {
  return (
    <footer className="border-t border-white/10 px-5 py-10 sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 text-sm text-steel sm:flex-row sm:items-end sm:justify-between">
        <div>
          <img
            className="h-14 w-14 object-contain"
            src={BRAND_EMBLEM_SRC}
            alt="THE HM emblem"
            width={56}
            height={56}
            loading="lazy"
            decoding="async"
          />
          <div className="mt-3 font-black uppercase tracking-[0.2em] text-white">THE HM STARCRAFT TEAM</div>
          <p className="mt-2">Independent community team site. Not affiliated with Blizzard Entertainment.</p>
          <p className="mt-1 text-xs text-steel/70">Copyright 2026 THE HM. All rights reserved.</p>
        </div>
        {entryOverlayEnabled ? (
          <button className="replay-button" type="button" onClick={onReplayIntro}>
            Replay Intro
          </button>
        ) : null}
      </div>
    </footer>
  );
}

function SoundControl({ soundEnabled, onToggle }: { soundEnabled: boolean; onToggle: () => void }) {
  return (
    <button className="sound-control" type="button" onClick={onToggle} aria-label={soundEnabled ? "Turn sound off" : "Turn sound on"}>
      {soundEnabled ? "SOUND ON" : "SOUND OFF"}
    </button>
  );
}

function ThemeControl({ themeMode, onToggle }: { themeMode: ThemeMode; onToggle: () => void }) {
  const nextLabel = themeMode === "dark" ? "LIGHT MODE" : "DARK MODE";

  return (
    <button className="theme-control" type="button" onClick={onToggle} aria-label={`Switch to ${nextLabel.toLowerCase()}`}>
      {nextLabel}
    </button>
  );
}

function statusLabel(state: LiveState, isLive = false) {
  if (isLive || state === "live") {
    return "ONLINE";
  }
  if (state === "offline") {
    return "OFFLINE";
  }
  if (state === "unavailable") {
    return "EXTERNAL";
  }
  if (state === "unknown") {
    return "CHECK";
  }
  return "SYNC";
}

function statusMessage(state?: LiveState) {
  if (state === "offline") {
    return "현재 방송 대기중";
  }
  if (state === "unavailable") {
    return "외부 페이지 연결";
  }
  if (state === "unknown") {
    return "상태 확인 지연";
  }
  return "온라인 상태 확인중";
}

function formatTimestamp(value: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function formatPostDate(value: string) {
  const [datePart, timePart = ""] = value.split(" ");
  const [, month, day] = datePart.split("-");
  const [hour, minute] = timePart.split(":");
  if (!month || !day) {
    return value;
  }
  return `${month}.${day}${hour && minute ? ` ${hour}:${minute}` : ""}`;
}

function tierClass(tier: BalanceTier, isSpecial: boolean) {
  if (!tier) {
    return "tier-badge tier-chairman tier-color-chairman";
  }

  if (isSpecial) {
    return `tier-badge tier-special ${tierColorClass(tier)}`;
  }

  return `tier-badge ${tierColorClass(tier)}`;
}

function noticeTierValue(member: Member): NoticeTierFilter {
  return member.balanceTier ?? "CHAIRMAN";
}

function tierColorClass(tier: BalanceTier) {
  if (!tier) {
    return "tier-color-chairman";
  }
  if (tier === "0티어") {
    return "tier-color-zero";
  }
  if (tier === "1티어") {
    return "tier-color-one";
  }
  if (tier === "3티어") {
    return "tier-color-three";
  }
  if (tier === "4티어") {
    return "tier-color-four";
  }
  if (tier === "5티어") {
    return "tier-color-five";
  }
  if (tier === "6티어") {
    return "tier-color-six";
  }
  if (tier === "7티어") {
    return "tier-color-seven";
  }
  if (tier === "8티어") {
    return "tier-color-eight";
  }
  if (tier === "Baby") {
    return "tier-color-baby";
  }
  return `tier-color-${tier.toLowerCase()}`;
}

function roleClass(member: Member) {
  return `role-pill ${roleColorClass(member)}`;
}

function racePillClass(race: Race) {
  return `race-pill tag-race ${raceClass(race)}`;
}

function roleColorClass(member: Member) {
  if (member.group === "leadership") {
    return "role-color-leadership";
  }
  if (member.role === "총장") {
    return "role-color-president";
  }
  if (member.role === "교수") {
    return "role-color-professor";
  }
  if (member.role === "코치") {
    return "role-color-coach";
  }
  if (member.role === "학생회장") {
    return "role-color-student-lead";
  }
  return "role-color-student";
}

function identityRoleClass(member: Member) {
  return `identity-tag tag-role ${roleColorClass(member)}`;
}

function identityTierClass(tier: BalanceTier) {
  return `identity-tag tag-tier ${tierColorClass(tier)}`;
}

function identityRaceClass(race: Race) {
  return `identity-tag tag-race ${raceClass(race)}`;
}

function raceClass(race: RaceFilter) {
  if (race === "전체") {
    return "race-all";
  }
  if (race === "Protoss") {
    return "race-protoss";
  }
  if (race === "Terran") {
    return "race-terran";
  }
  return "race-zerg";
}
