"use client";

import { useEffect, useMemo, useState } from "react";
import type { AcademySearchResult } from "@/lib/academyRepository";
import { academyRepository } from "@/lib/academyRepository";
import type { AcademyLesson, BeginnerStep, BuildGuide, PracticeQuestion } from "@/data/academy";
import { useAcademyProgress, useControlGroupPreset, useGuideFavorites, useRecentlyViewed } from "@/hooks/useAcademyStorage";
import { HotkeyCombination } from "@/components/academy/AcademyUI";

export function AcademySearch() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => academyRepository.searchAcademy(query), [query]);

  return (
    <section className="academy-search-panel" aria-labelledby="academy-search-title">
      <div>
        <div className="panel-kicker">ACADEMY SEARCH</div>
        <h2 id="academy-search-title">통합 검색</h2>
      </div>
      <label>
        <span className="sr-only">아카데미 검색</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="빌드, 유닛, 상황, 맵 검색" />
      </label>
      <div className="academy-search-results" aria-live="polite">
        {query.trim() && results.length === 0 ? <div className="empty-panel">검색 결과가 없습니다. 다른 용어나 빌드 이름으로 검색해보세요.</div> : null}
        {results.map((result) => (
          <SearchResultRow key={result.id} result={result} />
        ))}
      </div>
    </section>
  );
}

function SearchResultRow({ result }: { result: AcademySearchResult }) {
  return (
    <a className="academy-search-row" href={result.href}>
      <span>{result.type}</span>
      <strong>{result.title}</strong>
      <p>{result.description}</p>
    </a>
  );
}

export function RookieProgressDashboard({ lessons }: { lessons: AcademyLesson[] }) {
  const { progress } = useAcademyProgress();
  const totalSteps = lessons.reduce((sum, lesson) => sum + lesson.steps.length, 0);
  const completedSteps = lessons.reduce((sum, lesson) => sum + (progress[lesson.id]?.length ?? 0), 0);
  const percent = totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const nextLesson = lessons.find((lesson) => (progress[lesson.id]?.length ?? 0) < lesson.steps.length) ?? lessons[0];

  return (
    <section className="progress-console" aria-labelledby="rookie-progress-title">
      <div>
        <div className="panel-kicker">TRAINING STATUS</div>
        <h2 id="rookie-progress-title">현재 진행률</h2>
      </div>
      <div className="progress-meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="progress-console-grid">
        <div>
          <strong>{percent}%</strong>
          <span>전체 진행률</span>
        </div>
        <div>
          <strong>{completedSteps}/{totalSteps}</strong>
          <span>완료한 훈련</span>
        </div>
        <div>
          <strong>{nextLesson?.title ?? "완료"}</strong>
          <span>이어서 학습하기</span>
        </div>
      </div>
      {nextLesson ? (
        <a className="command-button command-button-primary" href={`/academy/rookie/${nextLesson.slug}`}>
          이어서 학습
        </a>
      ) : (
        <a className="command-button command-button-primary" href="/academy/playbook">
          실전 플레이북 이동
        </a>
      )}
    </section>
  );
}

export function LessonProgressActions({ contentId, steps }: { contentId: string; steps: BeginnerStep[] }) {
  const { progress, markStep, resetContent } = useAcademyProgress();
  const completed = new Set(progress[contentId] ?? []);
  const percent = steps.length ? Math.round((completed.size / steps.length) * 100) : 0;

  return (
    <aside className="lesson-progress-panel">
      <div className="panel-kicker">PROGRESS</div>
      <strong>{percent}% 완료</strong>
      <div className="progress-meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="lesson-step-actions">
        {steps.map((step) => (
          <button key={step.id} type="button" className={completed.has(step.id) ? "is-complete" : ""} onClick={() => markStep(contentId, step.id)}>
            {completed.has(step.id) ? "완료" : "완료 체크"} · {step.stepNumber}
          </button>
        ))}
      </div>
      <button className="text-reset-button" type="button" onClick={() => resetContent(contentId)}>
        진행률 초기화
      </button>
    </aside>
  );
}

export function FavoriteButton({ buildId }: { buildId: string }) {
  const { toggleFavorite, isFavorite } = useGuideFavorites();
  const active = isFavorite(buildId);
  return (
    <button className={active ? "favorite-button is-active" : "favorite-button"} type="button" onClick={() => toggleFavorite(buildId)} aria-pressed={active}>
      {active ? "★ 즐겨찾기됨" : "☆ 즐겨찾기"}
    </button>
  );
}

export function RecentlyViewedTracker({ item }: { item: { id: string; title: string; href: string; type: "build" | "lesson" } }) {
  const { addRecent } = useRecentlyViewed();
  useEffect(() => {
    addRecent(item);
  }, [item.id]);
  return null;
}

export function RecentlyViewedList() {
  const { recent } = useRecentlyViewed();
  if (recent.length === 0) {
    return <div className="empty-panel">최근 본 빌드가 아직 없습니다.</div>;
  }
  return (
    <div className="recent-list">
      {recent.map((item) => (
        <a key={`${item.id}-${item.viewedAt}`} href={item.href}>
          <span>{item.type === "build" ? "빌드" : "훈련"}</span>
          <strong>{item.title}</strong>
        </a>
      ))}
    </div>
  );
}

export function ControlGroupPresetEditor() {
  const { groups, updateGroup, completionSummary } = useControlGroupPreset();
  return (
    <section className="control-preset-editor">
      <div>
        <div className="panel-kicker">MY CONTROL GROUPS</div>
        <h2>나만의 부대지정 프리셋</h2>
        <p>{completionSummary}</p>
      </div>
      <div className="control-preset-grid">
        {groups.map((group, index) => (
          <label key={index}>
            <span>{index + 1}번</span>
            <input value={group} onChange={(event) => updateGroup(index, event.target.value)} />
          </label>
        ))}
      </div>
    </section>
  );
}

export function PracticeQuestionCard({ questions }: { questions: PracticeQuestion[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const score = questions.reduce((sum, question) => {
    const answer = answers[question.id];
    const correct = Array.isArray(question.correctAnswer) ? question.correctAnswer.join("|") : question.correctAnswer;
    return answer === correct ? sum + 1 : sum;
  }, 0);

  return (
    <section className="practice-panel">
      <div className="practice-score">
        <strong>{score}/{questions.length}</strong>
        <span>현재 정답률</span>
      </div>
      {questions.map((question) => {
        const current = answers[question.id];
        const correct = Array.isArray(question.correctAnswer) ? question.correctAnswer.join("|") : question.correctAnswer;
        return (
          <article key={question.id} className="practice-card">
            <span>{question.type}</span>
            <h2>{question.question}</h2>
            <div className="practice-options">
              {(question.options ?? []).map((option) => (
                <button key={option} type="button" className={current === option ? "is-selected" : ""} onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: option }))}>
                  {option}
                </button>
              ))}
            </div>
            {current ? (
              <p className={current === correct ? "practice-feedback is-correct" : "practice-feedback is-wrong"}>
                {current === correct ? "정답입니다. " : "다시 확인하세요. "}
                {question.explanation}
              </p>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}

export function FullscreenModeButton({ targetId }: { targetId: string }) {
  const [fullscreen, setFullscreen] = useState(false);
  const handleClick = async () => {
    const target = document.getElementById(targetId);
    if (!target || !document.fullscreenEnabled) {
      return;
    }
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      setFullscreen(false);
    } else {
      await target.requestFullscreen();
      setFullscreen(true);
    }
  };

  return (
    <button className="command-button print-hidden" type="button" onClick={handleClick}>
      {fullscreen ? "전체화면 종료" : "실전 모드 전체화면"}
    </button>
  );
}

export function PrintButton() {
  return (
    <button className="command-button print-hidden" type="button" onClick={() => window.print()}>
      인쇄
    </button>
  );
}

export function LiveBuildMode({ build }: { build: BuildGuide }) {
  const [index, setIndex] = useState(0);
  const steps = build.playbook.buildSteps;
  const current = steps[index] ?? steps[0];
  const next = steps[index + 1];

  return (
    <section id="live-build-mode" className="live-build-mode" aria-labelledby="live-mode-title">
      <div className="live-mode-head">
        <div>
          <div className="panel-kicker">LIVE MODE</div>
          <h2 id="live-mode-title">{build.originalTitle}</h2>
        </div>
        <FullscreenModeButton targetId="live-build-mode" />
      </div>
      <div className="live-mode-now">
        <span>{current.time ?? "현재"} / {current.supply ?? "인구수 확인"}</span>
        <strong>{current.title}</strong>
        <p>{current.description ?? current.production ?? current.construction ?? current.movement ?? build.playbook.summary}</p>
      </div>
      <div className="live-mode-grid">
        <div>
          <span>다음 행동</span>
          <strong>{next?.title ?? "운영 전환 확인"}</strong>
        </div>
        <div>
          <span>핵심 단축키</span>
          <strong>Ctrl+1 · A 클릭 · S</strong>
        </div>
        <div>
          <span>주의</span>
          <strong>{current.warning ?? build.playbook.stopConditions[0]}</strong>
        </div>
      </div>
      <div className="sticky-step-controls print-hidden">
        <button type="button" onClick={() => setIndex((value) => Math.max(0, value - 1))}>
          이전 단계
        </button>
        <button type="button" onClick={() => setIndex((value) => Math.min(steps.length - 1, value + 1))}>
          완료 / 다음 단계
        </button>
      </div>
    </section>
  );
}

export function HotkeyReferenceList({ guides }: { guides: Array<{ id?: string; guide: { keys: string[]; type: "simultaneous" | "sequence" | "keyAndClick" | "mouseOnly"; description: string; functionText: string; category?: string } }> }) {
  return (
    <div className="hotkey-reference-grid">
      {guides.map((item, index) => (
        <article key={item.id ?? index} className="hotkey-card">
          <HotkeyCombination guide={item.guide} />
          <strong>{item.guide.functionText}</strong>
          <p>{item.guide.description}</p>
          {item.guide.category ? <span>{item.guide.category}</span> : null}
        </article>
      ))}
    </div>
  );
}
