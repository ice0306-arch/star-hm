import {
  cupFacts,
  cupGroups,
  cupMatches,
  cupTeams,
  cupTimeline,
  type CupMatch,
  type CupTeamKey,
} from "@/data/kJungmanCup";

const BRAND_EMBLEM_SRC = "/brand/hm-emblem.png";

function formatCupDate(value: string) {
  const [, month, day] = value.split("-").map(Number);
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][new Date(`${value}T12:00:00`).getDay()];
  return `${month}월 ${day}일 (${weekday})`;
}

function TeamBadge({ teamKey }: { teamKey: CupTeamKey }) {
  const team = cupTeams[teamKey];

  return (
    <span className="cup-team-badge">
      <img src={team.logo} alt="" width={34} height={34} loading="lazy" />
      <span>{team.name}</span>
    </span>
  );
}

function MatchCard({ match }: { match: CupMatch }) {
  const leftWon = match.winner === match.left;
  const rightWon = match.winner === match.right;

  return (
    <article className={match.status === "done" ? "kj-cup-match is-done" : "kj-cup-match"}>
      <div className="kj-cup-match-meta">
        <span>{match.group}</span>
        <strong>{formatCupDate(match.date)}</strong>
      </div>
      <div className="kj-cup-match-line">
        <div className={leftWon ? "kj-cup-side is-winner" : "kj-cup-side"}>
          <TeamBadge teamKey={match.left} />
        </div>
        <div className="kj-cup-score">
          <span>{match.status === "done" ? "종료" : "예정"}</span>
          <strong>{match.score ?? match.time}</strong>
        </div>
        <div className={rightWon ? "kj-cup-side is-winner" : "kj-cup-side"}>
          <TeamBadge teamKey={match.right} />
        </div>
      </div>
    </article>
  );
}

export function KJungmanCupPage() {
  const completedMatches = cupMatches.filter((match) => match.status === "done");
  const upcomingMatches = cupMatches.filter((match) => match.status === "scheduled");
  const nextMatch = upcomingMatches[0];

  return (
    <main className="site-shell university-tier-shell kj-cup-shell min-h-screen text-silver">
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/10 bg-carbon/82 backdrop-blur-xl">
        <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10" aria-label="K-중만컵 내비게이션">
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

      <section className="kj-cup-hero px-5 pb-10 pt-28 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-end">
          <div>
            <div className="panel-kicker">K-JUNGMAN CUP 2026</div>
            <h1>K-중만컵</h1>
            <p>정중만 님이 여는 SOOP 스타대학 팀 대회입니다. 조별리그, 순위, 다음 경기 흐름을 한 화면에서 확인합니다.</p>
          </div>
          <div className="kj-cup-next-card">
            <span>NEXT MATCH</span>
            {nextMatch ? (
              <>
                <strong>{formatCupDate(nextMatch.date)} {nextMatch.time}</strong>
                <div className="kj-cup-next-versus">
                  <TeamBadge teamKey={nextMatch.left} />
                  <em>vs</em>
                  <TeamBadge teamKey={nextMatch.right} />
                </div>
              </>
            ) : (
              <strong>예정 경기 없음</strong>
            )}
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="kj-cup-facts" aria-label="K-중만컵 요약">
            {cupFacts.map((fact) => (
              <div key={fact.label} className="kj-cup-fact">
                <span>{fact.label}</span>
                <strong>{fact.value}</strong>
              </div>
            ))}
          </div>

          <div className="kj-cup-section-head">
            <div>
              <div className="panel-kicker">GROUP STAGE</div>
              <h2>조별리그 순위</h2>
            </div>
            <p>각 조 상위 2팀이 8강으로 진출합니다. 승점 동률 시 세트 득실 기준으로 정렬합니다.</p>
          </div>

          <div className="kj-cup-group-grid">
            {cupGroups.map((group) => (
              <section key={group.name} className="kj-cup-group-card">
                <h3>{group.name}</h3>
                <div className="kj-cup-standing-list">
                  {group.teams.map((standing) => (
                    <div key={standing.team} className={standing.advances ? "kj-cup-standing-row is-advance" : "kj-cup-standing-row"}>
                      <span className="kj-cup-rank">{standing.rank}</span>
                      <div className="kj-cup-team-cell">
                        <TeamBadge teamKey={standing.team} />
                        {standing.seed ? <span className="kj-cup-seed">시드 배정 · {standing.seed}</span> : null}
                      </div>
                      <div className="kj-cup-standing-stats">
                        <span><small>승패</small>{standing.wins}승 {standing.losses}패</span>
                        <span><small>세트</small>{standing.setScore}</span>
                        <span><small>승점</small>{standing.points}점</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="kj-cup-two-col">
            <section>
              <div className="kj-cup-section-head compact">
                <div>
                  <div className="panel-kicker">SCHEDULE</div>
                  <h2>다가오는 경기</h2>
                </div>
              </div>
              <div className="kj-cup-match-list">
                {upcomingMatches.map((match) => (
                  <MatchCard key={`${match.date}-${match.left}-${match.right}`} match={match} />
                ))}
              </div>
            </section>

            <section>
              <div className="kj-cup-section-head compact">
                <div>
                  <div className="panel-kicker">RESULTS</div>
                  <h2>완료 경기</h2>
                </div>
              </div>
              <div className="kj-cup-match-list">
                {completedMatches.map((match) => (
                  <MatchCard key={`${match.date}-${match.left}-${match.right}`} match={match} />
                ))}
              </div>
            </section>
          </div>

          <div className="kj-cup-section-head">
            <div>
              <div className="panel-kicker">ROADMAP</div>
              <h2>대회 흐름</h2>
            </div>
          </div>

          <div className="kj-cup-timeline">
            {cupTimeline.map((step) => (
              <article key={`${step.title}-${step.when}`} className={`kj-cup-step is-${step.status}`}>
                <span />
                <div>
                  <strong>{step.title}</strong>
                  <em>{step.when}</em>
                  {step.note ? <p>{step.note}</p> : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
