import { notFound } from "next/navigation";
import { AcademyFrame } from "@/components/academy/AcademyFrame";
import {
  AcademyBreadcrumb,
  AcademyBackLink,
  AcademyHero,
  AcademyModeCard,
  AcademySectionHeader,
  BuildCard,
  BuildTierBadge,
  ConditionChecklist,
  DifficultyBadge,
  HotkeyCombination,
  MatchupBadge,
  categoryLabels,
  matchupMeta,
} from "@/components/academy/AcademyUI";
import {
  AcademySearch,
  ControlGroupPresetEditor,
  FavoriteButton,
  HotkeyReferenceList,
  LessonProgressActions,
  LiveBuildMode,
  PracticeQuestionCard,
  PrintButton,
  RecentlyViewedList,
  RecentlyViewedTracker,
  RookieProgressDashboard,
} from "@/components/academy/AcademyInteractive";
import { academyRepository, buildGuideRepository, glossaryRepository, lessonRepository } from "@/lib/academyRepository";
import type { BuildCategory, BuildGuide, BuildTier, Matchup } from "@/data/academy";

export function AcademyHomePage() {
  return (
    <AcademyFrame>
      <AcademyHero
        eyebrow="STAR HM ACADEMY"
        title="STAR HM ACADEMY"
        description="처음 배우는 사람부터 실전 빌드를 준비하는 플레이어까지"
        support="기본 조작과 단축키를 배우고, 실전에서는 빌드와 상황별 대응을 빠르게 확인하세요."
        actions={
          <>
            <a className="command-button command-button-primary" href="/academy/rookie">
              입문 훈련
            </a>
            <a className="command-button" href="/academy/playbook">
              실전 플레이북
            </a>
          </>
        }
      />
      <section className="academy-section px-5 pb-20 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <AcademyBreadcrumb items={[{ label: "HM 아카데미" }]} />
          <div className="academy-mode-grid mt-8">
            <AcademyModeCard
              tone="rookie"
              eyebrow="ROOKIE CAMP"
              title="입문 훈련"
              description="조작, 단축키, 부대지정, 유닛, 건물, 용어와 기본 운영을 처음부터 쉽게 배웁니다."
              href="/academy/rookie"
              cta="훈련 시작"
            />
            <AcademyModeCard
              tone="playbook"
              eyebrow="HM PLAYBOOK"
              title="실전 플레이북"
              description="종족별 빌드, 핵심 타이밍, 상황별 대응과 운영 전환을 게임 중 빠르게 확인합니다."
              href="/academy/playbook"
              cta="작전 선택"
            />
          </div>
          <div className="mt-10">
            <AcademySearch />
          </div>
        </div>
      </section>
    </AcademyFrame>
  );
}

export function RookieHomePage() {
  const lessons = lessonRepository.getAllLessons();
  const firstBuild = buildGuideRepository.getAllBuilds()[0];
  return (
    <AcademyFrame>
      <AcademyHero
        eyebrow="ROOKIE CAMP"
        title="처음 시작하는 사람을 위한 HM 입문 훈련"
        description="스타크래프트 기본 조작부터 실전 빌드까지 한 단계씩 배워보세요."
        actions={
          <>
            <a className="command-button command-button-primary" href="/academy/rookie/basics">
              기본 조작 시작
            </a>
            {firstBuild ? (
              <a className="command-button" href={`/academy/rookie/build/${firstBuild.beginnerGuideSlug}`}>
                첫 번째 빌드 따라 하기
              </a>
            ) : null}
          </>
        }
      />
      <section className="academy-section px-5 pb-20 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <AcademyBreadcrumb items={[{ label: "HM 아카데미", href: "/academy" }, { label: "입문 훈련" }]} />
          <RookieProgressDashboard lessons={lessons} />
          <AcademySectionHeader eyebrow="TRAINING COURSE" title="입문 훈련 과정" description="한 화면에 한 가지 핵심 행동을 익히고 완료 체크로 진행률을 저장합니다." />
          <div className="lesson-grid mt-8">
            {lessons.map((lesson) => (
              <article key={lesson.id} className="lesson-card">
                <span>{String(lesson.order).padStart(2, "0")}</span>
                <h3>{lesson.title}</h3>
                <p>{lesson.description}</p>
                <div>
                  <strong>{lesson.estimatedMinutes ?? 10}분</strong>
                  <em>{lesson.category}</em>
                </div>
                <a href={`/academy/rookie/${lesson.slug}`}>시작 또는 이어보기</a>
              </article>
            ))}
            <article className="lesson-card lesson-card-featured">
              <span>14</span>
              <h3>첫 번째 빌드 따라 하기</h3>
              <p>초반 마린·벌쳐 기습을 쉬운 설명으로 단계별 학습합니다.</p>
              <div>
                <strong>18분</strong>
                <em>빌드</em>
              </div>
              <a href="/academy/rookie/build/marine-vulture-88">빌드 학습</a>
            </article>
            <article className="lesson-card lesson-card-featured">
              <span>15</span>
              <h3>상황별 대응 연습</h3>
              <p>공격 지속 여부와 운영 전환 판단을 문제로 연습합니다.</p>
              <div>
                <strong>8분</strong>
                <em>연습</em>
              </div>
              <a href="/academy/rookie/practice/marine-vulture-88">연습 시작</a>
            </article>
          </div>
        </div>
      </section>
    </AcademyFrame>
  );
}

export function LessonPage({ slug }: { slug: string }) {
  const lesson = lessonRepository.getLessonBySlug(slug);
  if (!lesson) {
    notFound();
  }

  return (
    <AcademyFrame>
      <AcademyHero eyebrow="ROOKIE CAMP" title={lesson.title} description={lesson.description} support={`${lesson.category} · 예상 ${lesson.estimatedMinutes ?? 10}분`} />
      <section className="academy-section px-5 pb-24 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <AcademyBreadcrumb items={[{ label: "HM 아카데미", href: "/academy" }, { label: "입문 훈련", href: "/academy/rookie" }, { label: lesson.title }]} />
          {slug === "hotkeys" ? <HotkeyPageContent /> : null}
          {slug === "control-groups" ? <ControlGroupPageContent /> : null}
          {slug === "units" ? <UnitsPageContent /> : null}
          {slug === "buildings" ? <BuildingsPageContent /> : null}
          {slug === "glossary" ? <GlossaryPageContent /> : null}
          {slug === "matchups" ? <MatchupsPageContent /> : null}
          {slug === "basics" ? <BasicsPageContent /> : null}
          <div className="lesson-layout mt-8">
            <div className="step-stack">
              {lesson.steps.map((step) => (
                <article key={step.id} className="beginner-step-card">
                  <span>STEP {step.stepNumber}</span>
                  <h2>{step.title}</h2>
                  <p>{step.instruction}</p>
                  <dl>
                    <div>
                      <dt>왜 필요한가요?</dt>
                      <dd>{step.reason}</dd>
                    </div>
                    {step.hotkey ? (
                      <div>
                        <dt>눌러야 할 키</dt>
                        <dd>
                          <HotkeyCombination guide={step.hotkey} />
                          <small>{step.hotkey.description}</small>
                        </dd>
                      </div>
                    ) : null}
                    {step.checkpoint ? (
                      <div>
                        <dt>확인할 화면</dt>
                        <dd>{step.checkpoint}</dd>
                      </div>
                    ) : null}
                    {step.commonMistake ? (
                      <div>
                        <dt>자주 하는 실수</dt>
                        <dd>{step.commonMistake}</dd>
                      </div>
                    ) : null}
                  </dl>
                </article>
              ))}
            </div>
            <LessonProgressActions contentId={lesson.id} steps={lesson.steps} />
          </div>
        </div>
      </section>
      <RecentlyViewedTracker item={{ id: lesson.id, title: lesson.title, href: `/academy/rookie/${lesson.slug}`, type: "lesson" }} />
    </AcademyFrame>
  );
}

export function PlaybookHomePage() {
  const builds = buildGuideRepository.getAllBuilds();
  return (
    <AcademyFrame>
      <AcademyHero
        eyebrow="HM PLAYBOOK"
        title="게임 중 빠르게 확인하는 종족별 빌드·운영 데이터베이스"
        description="종족별 빌드, 핵심 타이밍, 상황별 대응과 운영 전환을 압축해서 확인합니다."
        actions={
          <>
            <a className="command-button command-button-primary" href="/academy/playbook/tvz">
              TvZ
            </a>
            <a className="command-button" href="/academy/playbook/hotkeys">
              실전 단축키
            </a>
          </>
        }
      />
      <section className="academy-section px-5 pb-20 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <AcademyBreadcrumb items={[{ label: "HM 아카데미", href: "/academy" }, { label: "실전 플레이북" }]} />
          <div className="playbook-quick-grid mt-8">
            <RecentlyViewedList />
            <a href="/academy/playbook/hotkeys">단축키</a>
            <span aria-disabled="true">인쇄용 치트시트 준비 중</span>
          </div>
          <div className="matchup-card-grid mt-8">
            {Object.entries(matchupMeta).map(([matchup, meta]) => (
              <a key={matchup} className="matchup-card" href={meta.href}>
                <span>{meta.title}</span>
                <h2>{meta.ko}</h2>
                <strong>{matchup}</strong>
                <p>{meta.description}</p>
              </a>
            ))}
          </div>
          <AcademySectionHeader eyebrow="RECOMMENDED BUILDS" title="초기 추천 빌드" description="관리자 데이터로 옮기기 쉽게 TypeScript 데이터와 repository 계층으로 분리했습니다." />
          <BuildGrid builds={builds.slice(0, 6)} />
        </div>
      </section>
    </AcademyFrame>
  );
}

export function MatchupBuildListPage({ matchup }: { matchup: Matchup }) {
  const builds = buildGuideRepository.getBuildsByMatchup(matchup);
  const meta = matchupMeta[matchup];
  return (
    <AcademyFrame>
      <AcademyHero eyebrow={meta.title} title={meta.ko} description={meta.description} />
      <section className="academy-section px-5 pb-20 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <AcademyBreadcrumb items={[{ label: "HM 아카데미", href: "/academy" }, { label: "실전 플레이북", href: "/academy/playbook" }, { label: matchup }]} />
          <BuildFilterSummary matchup={matchup} />
          <BuildGrid builds={builds} />
        </div>
      </section>
    </AcademyFrame>
  );
}

export function PlaybookBuildDetailPage({ slug }: { slug: string }) {
  const build = buildGuideRepository.getBuildBySlug(slug);
  if (!build) {
    notFound();
  }
  return (
    <AcademyFrame>
      <AcademyHero eyebrow="PLAYBOOK DETAIL" title={build.originalTitle} description={build.playbook.summary} support={`${build.easyTitle} · ${build.matchup}`} />
      <section className="academy-section px-5 pb-24 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <AcademyBreadcrumb items={[{ label: "HM 아카데미", href: "/academy" }, { label: "실전 플레이북", href: "/academy/playbook" }, { label: build.originalTitle }]} />
          <AcademyBackLink href={matchupMeta[build.matchup].href} label={`${build.matchup} 목록으로 돌아가기`} />
          <BuildDetailHeader build={build} />
          <LiveBuildMode build={build} />
          <div className="playbook-detail-layout mt-8">
            <article className="playbook-main-panel">
              <AcademySectionHeader eyebrow="BUILD ORDER" title="빌드오더 타임라인" />
              <div className="timeline-list">
                {build.playbook.buildSteps.map((step) => (
                  <div key={step.id} className="timeline-row">
                    <span>{step.time ?? "-"} / {step.supply ?? "-"}</span>
                    <strong>{step.title}</strong>
                    <p>{[step.production, step.construction, step.movement, step.description].filter(Boolean).join(" · ")}</p>
                    {step.warning ? <em>{step.warning}</em> : null}
                  </div>
                ))}
              </div>
              <AcademySectionHeader eyebrow="REACTIONS" title="상황별 대응" />
              <ReactionGrid build={build} />
            </article>
            <aside className="playbook-side-panel">
              <ConditionChecklist title="공격 계속 조건" tone="go" items={build.playbook.continueConditions} />
              <ConditionChecklist title="공격 중단 조건" tone="stop" items={build.playbook.stopConditions} />
              <section className="condition-box">
                <h3>운영 전환</h3>
                {build.playbook.transitions.map((transition) => (
                  <p key={transition.id}>
                    <strong>{transition.title}</strong>
                    {transition.description}
                  </p>
                ))}
              </section>
            </aside>
          </div>
        </div>
      </section>
      <RecentlyViewedTracker item={{ id: build.id, title: build.originalTitle, href: `/academy/playbook/build/${build.playbookSlug}`, type: "build" }} />
    </AcademyFrame>
  );
}

export function RookieBuildDetailPage({ slug }: { slug: string }) {
  const build = buildGuideRepository.getBuildBySlug(slug);
  if (!build) {
    notFound();
  }
  return (
    <AcademyFrame>
      <AcademyHero eyebrow="BEGINNER BUILD GUIDE" title={build.easyTitle} description={build.beginner.summary} support={`기존 명칭: ${build.originalTitle}`} />
      <section className="academy-section px-5 pb-24 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <AcademyBreadcrumb items={[{ label: "HM 아카데미", href: "/academy" }, { label: "입문 훈련", href: "/academy/rookie" }, { label: build.easyTitle }]} />
          <AcademyBackLink href="/academy/rookie" label="입문 훈련 목록으로 돌아가기" />
          <BuildDetailHeader build={build} beginner />
          <div className="beginner-intro-grid mt-8">
            <InfoBlock title="이 빌드는 무엇인가요?" items={[build.beginner.purpose]} />
            <InfoBlock title="언제 사용하나요?" items={build.beginner.useWhen} />
            <InfoBlock title="강한 상대" items={build.beginner.strongAgainst} />
            <InfoBlock title="약한 상황" items={build.beginner.weakAgainst} />
          </div>
          <div className="lesson-layout mt-8">
            <div className="step-stack">
              {build.beginner.steps.map((step) => (
                <article key={step.id} className="beginner-step-card">
                  <span>STEP {step.stepNumber} · {step.time ?? "시간 확인"} · {step.supply ?? "인구수 확인"}</span>
                  <h2>{step.title}</h2>
                  <p>{step.instruction}</p>
                  <dl>
                    <div>
                      <dt>쉬운 설명</dt>
                      <dd>{step.reason}</dd>
                    </div>
                    {step.hotkey ? (
                      <div>
                        <dt>단축키</dt>
                        <dd>
                          <HotkeyCombination guide={step.hotkey} />
                          <small>{step.hotkey.description}</small>
                        </dd>
                      </div>
                    ) : null}
                    {step.commonMistake ? (
                      <div>
                        <dt>실수 주의</dt>
                        <dd>{step.commonMistake}</dd>
                      </div>
                    ) : null}
                  </dl>
                </article>
              ))}
              <ReactionGrid build={build} beginner />
            </div>
            <LessonProgressActions contentId={`build-${build.id}`} steps={build.beginner.steps} />
          </div>
        </div>
      </section>
      <RecentlyViewedTracker item={{ id: `rookie-${build.id}`, title: build.easyTitle, href: `/academy/rookie/build/${build.beginnerGuideSlug}`, type: "lesson" }} />
    </AcademyFrame>
  );
}

export function PracticePage({ slug }: { slug: string }) {
  const build = buildGuideRepository.getBuildBySlug(slug);
  if (!build) {
    notFound();
  }
  return (
    <AcademyFrame>
      <AcademyHero eyebrow="PRACTICE MODE" title={`${build.easyTitle} 연습`} description="다음 행동, 단축키, 상황 판단을 문제로 확인합니다." />
      <section className="academy-section px-5 pb-20 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-4xl">
          <AcademyBreadcrumb items={[{ label: "HM 아카데미", href: "/academy" }, { label: "입문 훈련", href: "/academy/rookie" }, { label: "연습" }]} />
          <PracticeQuestionCard questions={build.beginner.practiceQuestions} />
          <div className="academy-complete-panel mt-8">
            <div className="panel-kicker">ROOKIE TRAINING COMPLETE</div>
            <h2>입문 훈련을 완료했습니다.</h2>
            <p>이제 HM PLAYBOOK에서 실전 빌드를 확인해보세요.</p>
            <a className="command-button command-button-primary" href={`/academy/playbook/build/${build.playbookSlug}`}>실전 플레이북 이동</a>
          </div>
        </div>
      </section>
    </AcademyFrame>
  );
}

export function HotkeysCompressionPage() {
  const guides = academyRepository.getHotkeys().map((guide, index) => ({ id: String(index), guide }));
  return (
    <AcademyFrame>
      <AcademyHero eyebrow="PLAYBOOK HOTKEYS" title="실전용 압축 단축키" description="게임 중 보조 모니터에 띄워두기 좋은 핵심 단축키와 추천 부대지정입니다." actions={<PrintButton />} />
      <section className="academy-section px-5 pb-20 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <AcademyBreadcrumb items={[{ label: "HM 아카데미", href: "/academy" }, { label: "실전 플레이북", href: "/academy/playbook" }, { label: "단축키" }]} />
          <HotkeyReferenceList guides={guides} />
          <ControlGroupPresetEditor />
        </div>
      </section>
    </AcademyFrame>
  );
}

function HotkeyPageContent() {
  const guides = academyRepository.getHotkeys().map((guide, index) => ({ id: String(index), guide }));
  return (
    <section className="academy-inline-panel">
      <AcademySectionHeader eyebrow="HOTKEY TYPES" title="키캡으로 배우는 단축키" description="같은 키도 선택 대상에 따라 기능이 달라질 수 있습니다. S는 유닛 선택 시 정지, 커맨드센터 선택 시 SCV 생산입니다." />
      <HotkeyReferenceList guides={guides} />
    </section>
  );
}

function ControlGroupPageContent() {
  return (
    <section className="academy-inline-panel">
      <AcademySectionHeader eyebrow="CONTROL GROUPS" title="부대지정 기본 배치" description="1번 주력, 2번 보조, 3번 탱크, 4번 생산 건물, 5번 커맨드센터를 추천합니다." />
      <ControlGroupPresetEditor />
    </section>
  );
}

function UnitsPageContent() {
  const units = academyRepository.getUnits();
  return (
    <section className="academy-card-grid">
      {units.map((unit) => (
        <article key={unit.id} className="academy-data-card">
          <div className="academy-placeholder-icon" aria-hidden="true">{unit.name.slice(0, 1)}</div>
          <h2>{unit.name}</h2>
          <p>{unit.role}</p>
          <dl>
            <div><dt>잘 잡는 것</dt><dd>{unit.strongAgainst}</dd></div>
            <div><dt>약점</dt><dd>{unit.weakAgainst}</dd></div>
            <div><dt>생산 건물</dt><dd>{unit.producedAt}</dd></div>
            <div><dt>단축키</dt><dd>{unit.hotkey}</dd></div>
            <div><dt>추천 부대</dt><dd>{unit.recommendedGroup}번</dd></div>
          </dl>
        </article>
      ))}
    </section>
  );
}

function BuildingsPageContent() {
  const buildings = academyRepository.getBuildings();
  return (
    <section className="academy-card-grid">
      {buildings.map((building) => (
        <article key={building.id} className="academy-data-card">
          <div className="academy-placeholder-icon" aria-hidden="true">{building.name.slice(0, 1)}</div>
          <h2>{building.name}</h2>
          <p>{building.role}</p>
          <dl>
            <div><dt>언제 짓나요?</dt><dd>{building.timing}</dd></div>
            <div><dt>건설 단축키</dt><dd>{building.hotkey}</dd></div>
            <div><dt>생산 가능</dt><dd>{building.produces.length ? building.produces.join(" · ") : "없음"}</dd></div>
            <div><dt>애드온</dt><dd>{building.addon}</dd></div>
          </dl>
        </article>
      ))}
    </section>
  );
}

function GlossaryPageContent() {
  const terms = glossaryRepository.getGlossaryTerms();
  return (
    <section className="academy-inline-panel">
      <AcademySectionHeader eyebrow="GLOSSARY" title="초보자 용어 사전" description="쉬운 설명을 먼저 보고, 필요한 경우 기존 커뮤니티 용어와 연결합니다." />
      <div className="glossary-grid">
        {terms.map((term) => (
          <article key={term.id} className="glossary-card">
            <span>{term.category}</span>
            <h2>{term.term}</h2>
            {term.formalName ? <strong>{term.formalName}</strong> : null}
            <p>{term.easyDescription}</p>
            {term.whyImportant ? <em>{term.whyImportant}</em> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function MatchupsPageContent() {
  return (
    <section className="matchup-card-grid">
      {Object.entries(matchupMeta).map(([matchup, meta]) => (
        <a key={matchup} className="matchup-card" href={meta.href}>
          <span>{meta.title}</span>
          <h2>{meta.ko}</h2>
          <p>{meta.description}</p>
        </a>
      ))}
    </section>
  );
}

function BasicsPageContent() {
  return (
    <section className="academy-inline-panel">
      <AcademySectionHeader eyebrow="BASICS" title="필수 조작 흐름" description="선택, 이동, 공격 이동, 건설, 생산을 순서대로 학습합니다." />
      <div className="rookie-action-strip">
        {["유닛 선택", "이동", "공격", "건물 건설", "유닛 생산"].map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </section>
  );
}

function BuildGrid({ builds }: { builds: BuildGuide[] }) {
  if (builds.length === 0) {
    return <div className="empty-panel mt-8">조건에 맞는 빌드가 없습니다.</div>;
  }
  return (
    <div className="build-grid mt-8">
      {builds.map((build) => (
        <BuildCard key={build.id} build={build} />
      ))}
    </div>
  );
}

function BuildFilterSummary({ matchup }: { matchup: Matchup }) {
  const tiers: Array<BuildTier | "all"> = ["all", "top", "variable", "standard", "experimental", "deprecated"];
  const categories: Array<BuildCategory | "all"> = ["all", "all-in", "semi-all-in", "semi-macro", "macro", "defense", "situational"];
  return (
    <div className="filter-summary-panel">
      <div>
        <span>중요도</span>
        {tiers.map((tier) => (
          <a key={tier} href={`${matchupMeta[matchup].href}${tier === "all" ? "" : `?tier=${tier}`}`}>{tier === "all" ? "전체" : tier}</a>
        ))}
      </div>
      <div>
        <span>유형</span>
        {categories.map((category) => (
          <a key={category} href={`${matchupMeta[matchup].href}${category === "all" ? "" : `?category=${category}`}`}>{category === "all" ? "전체" : categoryLabels[category]}</a>
        ))}
      </div>
    </div>
  );
}

function BuildDetailHeader({ build, beginner = false }: { build: BuildGuide; beginner?: boolean }) {
  return (
    <section className="build-detail-head">
      <div>
        <BuildTierBadge tier={build.tier} />
        <MatchupBadge matchup={build.matchup} />
        <DifficultyBadge difficulty={build.difficulty} />
      </div>
      <h2>{beginner ? build.easyTitle : build.originalTitle}</h2>
      <p>{beginner ? build.beginner.summary : build.playbook.summary}</p>
      <dl>
        <div><dt>유형</dt><dd>{categoryLabels[build.category]}</dd></div>
        <div><dt>핵심 타이밍</dt><dd>{build.playbook.keyTiming ?? "타이밍 확인"}</dd></div>
        <div><dt>핵심 유닛</dt><dd>{build.playbook.keyUnits.join(" · ")}</dd></div>
        <div><dt>추천 맵</dt><dd>{build.maps.join(" · ")}</dd></div>
      </dl>
      <div className="build-detail-actions print-hidden">
        <FavoriteButton buildId={build.id} />
        <PrintButton />
        {beginner ? (
          <a className="command-button command-button-primary" href={`/academy/playbook/build/${build.playbookSlug}`}>
            실전 플레이북에서 압축 보기
          </a>
        ) : build.beginnerGuideSlug ? (
          <a className="command-button command-button-primary" href={`/academy/rookie/build/${build.beginnerGuideSlug}`}>
            입문 훈련에서 쉽게 배우기
          </a>
        ) : (
          <span>연결된 초보자 설명이 아직 준비되지 않았습니다.</span>
        )}
      </div>
    </section>
  );
}

function ReactionGrid({ build, beginner = false }: { build: BuildGuide; beginner?: boolean }) {
  return (
    <section className="reaction-grid">
      {build.playbook.reactions.map((reaction) => (
        <article key={reaction.id} className="reaction-card">
          <span>보이는 것</span>
          <h3>{reaction.observedSituation}</h3>
          {beginner && reaction.beginnerExplanation ? <p>{reaction.beginnerExplanation}</p> : null}
          <strong>{reaction.recommendedAction}</strong>
          {reaction.reason ? <em>{reaction.reason}</em> : null}
        </article>
      ))}
    </section>
  );
}

function InfoBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="info-block">
      <h2>{title}</h2>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}
