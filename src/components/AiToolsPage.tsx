"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CONFIDENCE_POLICY_CONFIG,
  HM_AI_ANALYSIS_STAGES,
  HM_AI_COPY,
  MATCH_SOURCE_LABELS,
  type AnalysisStageCode,
} from "@/lib/hm-ai-contracts";

const BRAND_EMBLEM_SRC = "/brand/hm-emblem.png";
const MAX_REPLAY_SIZE_MB = 20;

type ApiError = {
  code: string;
  message: string;
  details: unknown;
};

type PlayerResultStatus = "CONFIRMED" | "ADMIN_CONFIRMED" | "INFERRED_HIGH" | "INFERRED_MEDIUM" | "INFERRED_LOW" | "UNKNOWN";

type ReplayPlayer = {
  id: number;
  name: string;
  race: string;
  team: number | null;
  observer: boolean;
  startLocation?: { x: number; y: number } | null;
  apm: number | null;
  eapm: number | null;
  effectiveRate: number | null;
  totalCommands: number;
  effectiveCommands: number;
  ineffectiveCommands: number;
  lastCommandSeconds: number | null;
  mostUsedHotkey: number | null;
  result: {
    outcome: "WIN" | "LOSS" | "UNKNOWN";
    status: PlayerResultStatus;
  };
};

type ParserInfo = {
  name: string;
  version: string;
  eapmVersion: string;
};

type AnalysisRun = {
  id: string;
  status: string;
  parserName: string;
  parserVersion: string;
  semanticEngineName: string;
  semanticEngineVersion: string;
  rulesetVersion: string;
  startedAt: string;
  completedAt: string;
  processingTimeMs: number;
};

type PipelineStage = {
  code: AnalysisStageCode | string;
  label: string;
  status: string;
  detail: string;
};

type CanonicalReplaySummary = {
  replayId: string;
  schemaVersion: string;
  modelVersion: string;
  parser: ParserInfo;
  commandCount: number;
  buildEventCount: number;
  hotkeyEventCount: number;
  chatEventCount: number;
  exactFingerprint: string;
  fuzzyFingerprint: string;
  validationStatus: string;
  normalizationNote: string;
};

type AnalysisEvidence = {
  confidence: number;
  commandIds?: string[];
  frames?: number[];
  seconds?: number[];
  unitTypes?: string[];
  positions?: Array<{ x: number; y: number }>;
  reasonCodes: string[];
  explanation: string;
  benchmark?: {
    group: string;
    sampleSize: number;
    average?: number;
    median?: number;
    percentile?: number;
  };
};

type BuildClassification = {
  playerId: number;
  playerName: string;
  matchup: string;
  buildCode: string;
  buildName: string;
  confidence: number;
  status: PlayerResultStatus;
  alternativeBuilds: Array<{ buildCode: string; buildName: string; confidence: number }>;
  evidence: AnalysisEvidence;
  classifierVersion: string;
};

type SkillMetric = {
  playerId: number;
  playerName: string;
  metricType: string;
  label: string;
  rawValue: number;
  unit: string;
  normalizedScore: number;
  percentile: number | null;
  sampleSize: number;
  benchmarkGroup: string;
  confidence: number;
  evidence: AnalysisEvidence;
  metricVersion: string;
};

type SegmentMetric = {
  segment: string;
  startSecond: number;
  endSecond: number;
  apm: number;
  eapm: number;
  effectiveRate: number | null;
};

type CommandEfficiencyReport = {
  playerId: number;
  playerName: string;
  apm: number | null;
  eapm: number | null;
  effectiveRate: number | null;
  ineffectiveCommands: number;
  repeatedCommandCandidate: number;
  segmentEfficiency: SegmentMetric[];
  evidence: AnalysisEvidence;
};

type ProductionReport = {
  playerId: number;
  playerName: string;
  productionEvents: number;
  productionGaps: Array<{ startSecond: number; endSecond: number; duration: number; reasonCode: string }>;
  facilityUtilization: number | null;
  stabilityScore: number;
  evidence: AnalysisEvidence;
};

type HotkeyReportData = {
  playerId: number;
  playerName: string;
  usedGroups: number[];
  breadthScore: number;
  consistencyScore: number;
  dominantGroup: number | null;
  dominantShare: number;
  evidence: AnalysisEvidence;
};

type MultitaskingReportData = {
  playerId: number;
  playerName: string;
  positionedCommands: number;
  regionSwitchEstimate: number;
  confidence: number;
  qualifier: string;
  evidence: AnalysisEvidence;
};

type ReplayCommand = {
  index: number;
  frame: number;
  timeSeconds: number;
  timeLabel: string;
  playerId: number;
  playerName: string;
  type: string;
  category: string;
  details: string;
  unitOrBuilding: string | null;
  position: { x: number; y: number } | null;
  effective: boolean;
  inefficiencyReason: string | null;
};

type CoachingScope = {
  headline: string;
  matchup: string;
  mapName: string;
  phase: string;
  dataTypes: string[];
  confidence: number;
  limitations: string[];
  knowledgeState: string[];
};

type ReplayFact = {
  id: string;
  timeMs: number;
  endTimeMs?: number;
  playerId?: string;
  opponentId?: string;
  category: "build" | "production" | "scouting" | "economy" | "army" | "engagement" | "control" | "map_position" | "strategy" | string;
  type: string;
  label: string;
  source: string;
  visibility: string;
  confidence: number;
  x?: number;
  y?: number;
  unitType?: string;
  buildingType?: string;
  value?: number;
  rawEventIds?: string[];
  metadata?: Record<string, unknown>;
};

type DetectedIssue = {
  id: string;
  category: "scouting" | "production" | "economy" | "engagement" | "build" | "control" | "strategy" | string;
  severity: "critical" | "major" | "minor" | "info" | string;
  title: string;
  description: string;
  playerId: string;
  startTimeMs: number;
  endTimeMs?: number;
  evidenceIds: string[];
  confidence: number;
  measurableValue?: number;
  expectedRange?: {
    min?: number;
    max?: number;
    unit?: string;
  };
};

type CoachFinding = {
  id: string;
  severity: "critical" | "major" | "minor" | "positive" | string;
  category: "scouting" | "production" | "economy" | "engagement" | "build" | "control" | "strategy" | string;
  title: string;
  summary: string;
  whyItMatters: string;
  nextAction: string;
  startTimeMs: number;
  endTimeMs?: number;
  evidenceIds: string[];
  knowledgeIds: string[];
  confidence: number;
  limitations?: string[];
};

type VictoryPattern = {
  id: string;
  winnerId: string;
  winnerName: string;
  race: string;
  category: string;
  title: string;
  summary: string;
  whyItWon: string;
  coachingUse: string;
  startTimeMs: number;
  evidenceIds: string[];
  metrics?: Record<string, unknown>;
  confidence: number;
};

type WinReadiness = {
  playerId: string;
  playerName: string;
  race: string;
  outcome: "WIN" | "LOSS" | "UNKNOWN" | string;
  score: number;
  verdict: string;
  winningCases: string[];
  missingCases: string[];
  coachingAdvice: string;
  confidence: number;
};

type KnowledgeMatch = {
  knowledgeId: string;
  title: string;
  score: number;
  reason: string;
};

type CoachingAnalysis = {
  scope: CoachingScope;
  facts: ReplayFact[];
  issues: DetectedIssue[];
  victoryPatterns?: VictoryPattern[];
  winReadiness?: WinReadiness[];
  findings: CoachFinding[];
  knowledgeMatches: KnowledgeMatch[];
  review: {
    status: string;
    badge: string;
    canPersist: boolean;
    storageState: string;
  };
};

type WinConditionThresholds = {
  minimumEapm: number | null;
  minimumEffectiveRate: number | null;
  minimumProductionStability: number | null;
  maximumProductionGapSeconds: number | null;
  minimumHotkeyBreadth: number | null;
  minimumWinReadinessScore: number | null;
};

type WinCondition = {
  id: string;
  race: string;
  matchup: string;
  map: string;
  buildCode: string;
  buildName: string;
  sampleCount: number;
  thresholds: WinConditionThresholds;
  repeatedWinningCases: Array<{ title: string; count: number }>;
  coachingUse: string;
  confidence: number;
};

type WinConditionModel = {
  schemaVersion: string;
  generatedAt: string;
  modelType: string;
  description: string;
  limitations: string[];
  totalWinnerSamples: number;
  conditions: WinCondition[];
};

type WinConditionMatch = {
  condition: WinCondition;
  score: number;
  player: ReplayPlayer | null;
  rows: Array<{ label: string; actual: string; target: string; pass: boolean | null }>;
};

type SemanticAnalysisResult = {
  engine: { name: string; version: string; commitSha?: string };
  rulesetVersion: string;
  status: string;
  buildClassifications: BuildClassification[];
  semanticEvents: Array<{
    id: string;
    eventType: string;
    subtype?: string;
    playerId?: number;
    playerName?: string;
    startFrame: number;
    startSecond: number;
    confidence: number;
    evidence: AnalysisEvidence;
  }>;
  skillMetrics: SkillMetric[];
  commandEfficiency: CommandEfficiencyReport[];
  productionReports: ProductionReport[];
  hotkeyReports: HotkeyReportData[];
  multitaskingReports: MultitaskingReportData[];
  mapEvents: Array<{
    id: string;
    eventType: string;
    playerId: number;
    playerName: string;
    position: { x: number; y: number } | null;
    startSecond: number;
    confidence: number;
    evidence: AnalysisEvidence;
  }>;
  warnings: Array<{ code: string; severity: string; message: string; context: Record<string, unknown> }>;
};

type AnalyzeSuccess = {
  success: true;
  parser: ParserInfo;
  analysisRun: AnalysisRun;
  confidencePolicy: typeof CONFIDENCE_POLICY_CONFIG;
  pipeline: PipelineStage[];
  canonical: CanonicalReplaySummary;
  replay: {
    fileName: string;
    fileSize: number;
    fileHash: string;
    binarySignature: string;
    source: keyof typeof MATCH_SOURCE_LABELS | string;
    protected: boolean;
    downloadable: boolean;
    exactFingerprint: string;
    fuzzyFingerprint: string;
    gameTitle: string | null;
    startedAt: string | null;
    durationSeconds: number | null;
    gameType: string;
    map: {
      name: string | null;
      width: number | null;
      height: number | null;
      tileset: string | null;
    };
    playerCount: number;
    observerCount: number;
  };
  players: ReplayPlayer[];
  timeline: Array<{
    playerId: number;
    playerName: string;
    startSeconds: number;
    endSeconds: number;
    apm: number;
    eapm: number;
  }>;
  commands: ReplayCommand[];
  buildOrder: Array<{
    id: string;
    timeLabel: string;
    frame: number;
    timeSeconds: number;
    playerId: number;
    playerName: string;
    category: string;
    label: string;
  }>;
  hotkeys: Array<{
    playerId: number;
    playerName: string;
    group: number;
    assigned: number;
    added: number;
    selected: number;
    total: number;
    selectShare: number;
  }>;
  chat: Array<{
    timeLabel: string;
    playerName: string;
    message: string;
  }>;
  semantic: SemanticAnalysisResult;
  coaching: CoachingAnalysis;
  analysis: {
    sections: Array<{
      title: string;
      items: Array<{ text: string; evidence: string | null }>;
    }>;
    cautions: string[];
  };
  hmCoaches?: Record<string, HmCoachBridgeResult>;
  hmCoach?: HmCoachBridgeResult | null;
  hmCoachError?: string | null;
};

type AnalyzeResponse = AnalyzeSuccess | { success: false; error: ApiError };
type QueueStatus = "QUEUED" | "VALIDATING" | "PARSING" | "COMPLETED" | "FAILED";
type ReportTab = "OVERVIEW" | "ECONOMY" | "CONTROL" | "TIMING" | "BUILD" | "STRATEGY" | "COACH" | "EVIDENCE";

type HmCoachFeedbackItem = {
  number?: number;
  label?: string;
  title: string;
  detail: string;
  next?: string;
};

type HmCoachInput = {
  match?: {
    map?: string;
    durationLabel?: string;
  };
  perspective?: {
    playerId?: string;
    opponentId?: string;
    player?: string;
    opponent?: string;
    matchup?: string;
    resultLabel?: string;
    outcome?: "WIN" | "LOSS" | "UNKNOWN" | string;
  };
  dataContext?: {
    sampleSize?: number;
    confidenceLabel?: string;
    myStrategyFocus?: string;
    opponentStrategyFocus?: string;
  };
  coaching?: {
    headline?: string;
    verdict?: string;
    feedbackItems?: HmCoachFeedbackItem[];
    nextGameGuide?: string[];
    limitationNote?: string;
  };
};

type HmCoachBridgeResult = {
  ok: true;
  source: string;
  coachInput: HmCoachInput;
  aiPrompt: string;
  feedbackItems: HmCoachFeedbackItem[];
  nextGameGuide: string[];
  summary: {
    playerId?: string;
    player?: string;
    map?: string;
    matchup?: string;
    result?: string;
    outcome?: string;
    confidence?: string;
    feedbackCount?: number;
  };
};

type HmCoachBridgeResponse = HmCoachBridgeResult | { ok: false; error: string; coachStatus?: number };

type CoachSeverity = "HIGH" | "MEDIUM" | "INFO";

type CoachMoment = {
  id: string;
  timeLabel: string;
  playerName: string;
  severity: CoachSeverity;
  tag: string;
  title: string;
  detail: string;
  evidence: string;
};

type RegionSwitchTransition = {
  label: string;
  count: number;
  examples: string[];
};

type CoachDrill = {
  title: string;
  detail: string;
  successMetric: string;
};

type CoachNarrativeItem = {
  title: string;
  body: string;
  meta?: string;
  tone?: "strength" | "mistake" | "priority" | "neutral";
};

type CoachNarrativeMoment = CoachNarrativeItem & {
  timeLabel: string;
  severity: CoachSeverity;
};

type CoachNarrative = {
  overall: CoachNarrativeItem;
  strategy: CoachNarrativeItem;
  feedback: CoachNarrativeItem[];
  strengths: CoachNarrativeItem[];
  mistakes: CoachNarrativeItem[];
  keyMoments: CoachNarrativeMoment[];
  priorities: CoachNarrativeItem[];
};

type MacroMicroProfile = {
  playerName: string;
  macro: number;
  micro: number;
  hotkey: number;
  other: number;
  macroShare: number;
  microShare: number;
  multitaskingScore: number;
  readout: string;
  summary: string;
};

type TacticalReplayEvent = {
  id: string;
  playerId: number;
  playerName: string;
  timeSeconds: number;
  timeLabel: string;
  category: string;
  label: string;
  position: { x: number; y: number };
  effective: boolean;
};

type TacticalReplayRange = {
  id: string;
  start: number;
  end: number;
  label: string;
  severity: CoachSeverity;
  playerName: string;
  tag: string;
  problem: string;
  reason: string;
  reviewPoint: string;
  fixPoint: string;
};

type TacticalReplaySimulation = {
  events: TacticalReplayEvent[];
  ranges: TacticalReplayRange[];
};

type QueuedReplay = {
  id: string;
  file: File;
  status: QueueStatus;
  message: string;
  error?: string;
  result?: AnalyzeSuccess;
};

const tabs: ReportTab[] = ["OVERVIEW", "ECONOMY", "CONTROL", "TIMING", "BUILD", "STRATEGY", "COACH", "EVIDENCE"];

const tabMeta: Record<ReportTab, { label: string; hint: string }> = {
  OVERVIEW: { label: "개요", hint: "경기 전체" },
  ECONOMY: { label: "생산", hint: "끊긴 시간" },
  CONTROL: { label: "조작", hint: "손속도·단축키" },
  TIMING: { label: "시간 분석", hint: "먼저 볼 장면" },
  BUILD: { label: "빌드", hint: "초반 순서" },
  STRATEGY: { label: "전략", hint: "경기 해석" },
  COACH: { label: "코치 리포트", hint: "총평과 연습" },
  EVIDENCE: { label: "근거", hint: "세부 기록" },
};

async function attachHmCoachToAnalysis(result: AnalyzeSuccess): Promise<AnalyzeSuccess> {
  const activePlayers = result.players.filter((player) => !player.observer);
  if (!activePlayers.length) {
    return {
      ...result,
      hmCoach: null,
      hmCoachError: "코칭할 플레이어를 찾지 못했습니다.",
    };
  }

  const requests = await Promise.allSettled(
    activePlayers.map(async (player) => {
      const response = await fetch("/api/hm-coach/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ analysisResult: result, perspectivePlayerId: player.id }),
      });
      const payload = (await response.json()) as HmCoachBridgeResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok === false ? payload.error : `${player.name} 코칭 결과를 만들지 못했습니다.`);
      }
      return [String(player.id), payload] as const;
    }),
  );

  const hmCoaches = requests.reduce<Record<string, HmCoachBridgeResult>>((coaches, request) => {
    if (request.status === "fulfilled") {
      const [playerId, coach] = request.value;
      coaches[playerId] = coach;
    }
    return coaches;
  }, {});

  const defaultCoach = defaultHmCoachForResult(result, hmCoaches);
  const failedCount = requests.filter((request) => request.status === "rejected").length;
  if (defaultCoach) {
    return {
      ...result,
      hmCoaches,
      hmCoach: defaultCoach,
      hmCoachError: failedCount ? `${failedCount}명 코칭은 생성하지 못했습니다.` : null,
    };
  }

  const firstError = requests.find((request): request is PromiseRejectedResult => request.status === "rejected")?.reason;
  return {
    ...result,
    hmCoaches,
    hmCoach: null,
    hmCoachError: firstError instanceof Error ? firstError.message : "HM 코칭 결과를 만들지 못했습니다.",
  };
}

function defaultHmCoachForResult(result: AnalyzeSuccess, hmCoaches: Record<string, HmCoachBridgeResult> | undefined) {
  const coaches = hmCoaches ?? result.hmCoaches ?? {};
  const loser = result.players.find((player) => !player.observer && player.result.outcome === "LOSS" && coaches[String(player.id)]);
  const fallback = result.players.find((player) => !player.observer && coaches[String(player.id)]);
  return coaches[String(loser?.id ?? fallback?.id ?? "")] ?? result.hmCoach ?? null;
}

function hmCoachPerspectivePlayerId(hmCoach: HmCoachBridgeResult | null | undefined) {
  return hmCoach?.coachInput.perspective?.playerId ?? hmCoach?.summary.playerId ?? null;
}

function hmCoachForSelectedPlayer(result: AnalyzeSuccess, activePlayerId: string | null) {
  const coaches = result.hmCoaches ?? {};
  if (activePlayerId && coaches[activePlayerId]) return coaches[activePlayerId];
  return defaultHmCoachForResult(result, coaches);
}

function hmCoachPerspectiveOptions(result: AnalyzeSuccess) {
  const coaches = result.hmCoaches ?? {};
  return result.players
    .filter((player) => !player.observer && coaches[String(player.id)])
    .map((player) => ({
      player,
      id: String(player.id),
    }));
}

function playerPerspectiveLabel(player: ReplayPlayer) {
  if (player.result.outcome === "WIN") return "승자 관점";
  if (player.result.outcome === "LOSS") return "패자 관점";
  return "관점";
}

function hmCoachHeading(hmCoach: HmCoachBridgeResult) {
  const outcome = hmCoach.coachInput.perspective?.outcome ?? hmCoach.summary.outcome;
  return outcome === "WIN" ? "이긴 판에서 더 다듬을 부분" : "이번 판에서 바로 고칠 것";
}

export function AiToolsPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const uploadPanelRef = useRef<HTMLElement | null>(null);
  const reportPanelRef = useRef<HTMLElement | null>(null);
  const [queue, setQueue] = useState<QueuedReplay[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<ReportTab>("COACH");
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [activeHmCoachPlayerId, setActiveHmCoachPlayerId] = useState<string | null>(null);
  const [winConditionModel, setWinConditionModel] = useState<WinConditionModel | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadWinConditions() {
      try {
        const response = await fetch("/hm-ai-data/win-conditions.json", { cache: "no-store" });
        if (!response.ok) return;
        const model = (await response.json()) as WinConditionModel;
        if (!cancelled) setWinConditionModel(model);
      } catch {
        if (!cancelled) setWinConditionModel(null);
      }
    }
    void loadWinConditions();
    return () => {
      cancelled = true;
    };
  }, []);

  const isAnalyzing = queue.some((item) => item.status === "VALIDATING" || item.status === "PARSING");
  const selectedQueueItem = useMemo(() => {
    return queue.find((item) => item.id === activeReportId) ?? queue.find((item) => item.result) ?? null;
  }, [activeReportId, queue]);
  const selectedReport = useMemo(() => {
    return selectedQueueItem?.result ?? null;
  }, [selectedQueueItem]);
  const players = selectedReport?.players.filter((player) => !player.observer) ?? [];
  const selectedHmCoach = selectedReport ? hmCoachForSelectedPlayer(selectedReport, activeHmCoachPlayerId) : null;
  const selectedHmCoachPlayerId = hmCoachPerspectivePlayerId(selectedHmCoach);

  function addFiles(fileList: FileList | File[]) {
    setError(null);
    const incoming = Array.from(fileList);
    if (!incoming.length) return;
    const nextItems: QueuedReplay[] = [];
    const messages: string[] = [];
    for (const nextFile of incoming) {
      const validationError = validateReplayFile(nextFile);
      if (validationError) {
        messages.push(`${nextFile.name}: ${validationError}`);
        continue;
      }
      const duplicate = queue.some((item) => item.file.name === nextFile.name && item.file.size === nextFile.size) || nextItems.some((item) => item.file.name === nextFile.name && item.file.size === nextFile.size);
      if (duplicate) {
        messages.push(`${nextFile.name}: 같은 이름과 크기의 파일이 이미 큐에 있습니다.`);
        continue;
      }
      nextItems.push({
        id: makeId(),
        file: nextFile,
        status: "QUEUED",
        message: "분석 대기",
      });
    }
    if (nextItems.length) {
      setQueue((current) => [...current, ...nextItems]);
      setActiveReportId((current) => current ?? nextItems[0].id);
    }
    if (messages.length) {
      setError(messages.join(" "));
    }
  }

  async function analyzeItem(item: QueuedReplay) {
    setError(null);
      updateQueueItem(item.id, { status: "VALIDATING", message: "파일을 확인하는 중" });
    try {
      const form = new FormData();
      form.append("file", item.file);
      updateQueueItem(item.id, { status: "PARSING", message: "리플레이를 읽고 리포트를 만드는 중" });
      const response = await fetch("/api/replays/analyze", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json()) as AnalyzeResponse;
      if (!payload.success) {
        updateQueueItem(item.id, { status: "FAILED", message: "분석 실패", error: payload.error.message });
        setError(payload.error.message);
        return;
      }
      updateQueueItem(item.id, { status: "PARSING", message: "기본 분석 완료, HM 코칭 생성 중" });
      const resultWithCoach = await attachHmCoachToAnalysis(payload);
      updateQueueItem(item.id, {
        status: "COMPLETED",
        message: resultWithCoach.hmCoach ? "분석 완료 · HM 코칭 포함" : resultWithCoach.hmCoachError ? "분석 완료 · 추가 코칭 생성 실패" : "분석 완료",
        result: resultWithCoach,
        error: undefined,
      });
      setActiveReportId(item.id);
      setActiveTab("COACH");
      window.requestAnimationFrame(() => scrollToReportPanel());
    } catch {
      updateQueueItem(item.id, { status: "FAILED", message: "연결 실패", error: "분석 서버에 연결할 수 없습니다." });
      setError("분석 서버에 연결할 수 없습니다.");
    }
  }

  async function analyzeAll() {
    const targets = queue.filter((item) => item.status === "QUEUED" || item.status === "FAILED");
    if (!targets.length) {
      setError("분석할 리플레이 파일을 추가하세요.");
      return;
    }
    for (const item of targets) {
      await analyzeItem(item);
    }
  }

  function updateQueueItem(id: string, patch: Partial<QueuedReplay>) {
    setQueue((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeQueueItem(id: string) {
    setQueue((current) => current.filter((item) => item.id !== id));
    setActiveReportId((current) => (current === id ? null : current));
  }

  function scrollToUploadPanel() {
    const target = uploadPanelRef.current;
    if (!target) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
    window.setTimeout(() => target.focus({ preventScroll: true }), prefersReducedMotion ? 0 : 450);
  }

  function scrollToReportPanel() {
    const target = reportPanelRef.current;
    if (!target) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
    window.setTimeout(() => target.focus({ preventScroll: true }), prefersReducedMotion ? 0 : 450);
  }

  return (
    <main className="site-shell ai-tools-shell min-h-screen text-silver">
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/10 bg-carbon/82 backdrop-blur-xl">
        <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10" aria-label="AI 분석툴 내비게이션">
          <a className="flex items-center gap-3 text-white" href="/">
            <img className="h-12 w-12 object-contain" src={BRAND_EMBLEM_SRC} alt="THE HM emblem" width={48} height={48} />
            <span className="text-sm font-black uppercase tracking-[0.24em]">THE HM</span>
          </a>
          <div className="university-tier-nav-links">
            <a className="nav-link" href="/">HOME</a>
            <a className="nav-link" href="/ai-tools">AI분석툴</a>
            <a className="nav-link" href="/university-tiers">대학티어</a>
            <a className="nav-link" href="/free-agents">FA현황</a>
            <a className="nav-link" href="/k-jungman-cup">K-중만컵</a>
          </div>
        </nav>
      </header>

      <section className="ai-tools-hero px-5 pb-8 pt-28 sm:px-8 lg:px-10">
        <div className="ai-hero-grid mx-auto max-w-7xl">
          <div className="ai-hero-copy">
            <div className="panel-kicker">{HM_AI_COPY.productDescriptionEn}</div>
            <h1>{HM_AI_COPY.serviceNameKo}</h1>
            <p>
              <strong>{HM_AI_COPY.hero}</strong>
              {HM_AI_COPY.supporting}
            </p>
            <div className="ai-hero-actions">
              <button className="command-button command-button-primary" type="button" onClick={scrollToUploadPanel}>
                REP 파일 선택
              </button>
              <a className="command-button" href="#hm-ai-upload">업로드 영역 보기</a>
            </div>
            <p className="ai-scope-note">REP 파일 안의 클릭, 생산, 단축키 기록을 읽어서 경기 흐름을 정리합니다. 원본 리플레이를 보관하지 않고, 복기에 필요한 장면만 리포트로 보여줍니다.</p>
          </div>
          <div className="ai-tactical-board" aria-label="리플레이 분석 순서">
            {HM_AI_ANALYSIS_STAGES.slice(0, 6).map((stage, index) => (
              <span key={stage.code}>
                <b>{String(index + 1).padStart(2, "0")}</b>
                <i>{stage.label}</i>
                <small>{[
                  "REP 파일을 임시로 읽습니다",
                  "깨진 파일인지 확인합니다",
                  "같은 리플레이를 걸러냅니다",
                  "명령 기록을 시간순으로 풉니다",
                  "문제 구간을 묶어 정리합니다",
                  "사람이 읽는 리포트로 바꿉니다",
                ][index]}</small>
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-8 sm:px-8 lg:px-10">
        <div className="ai-system-strip mx-auto max-w-7xl" aria-label="리포트에 포함되는 항목">
          {[
            ["리플레이 읽기", "REP 명령 로그 확인"],
            ["시간대 정리", "몇 초에 흔들렸는지"],
            ["생산 공백 찾기", "유닛·건물 예약이 빈 구간"],
            ["손속도 비교", "분당 명령과 유효 명령"],
            ["화면 전환 보기", "운영과 전투 시선 흐름"],
            ["코치 노트 작성", "다음 게임에서 고칠 점"],
          ].map(([title, detail], index) => (
            <span key={title}>
              <b>{String(index + 1).padStart(2, "0")}</b>
              <strong>{title}</strong>
              <small>{detail}</small>
            </span>
          ))}
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 lg:px-10">
        <div className="ai-workspace mx-auto max-w-7xl">
          <div className="ai-intake-grid">
            <section ref={uploadPanelRef} className="ai-upload-panel" id="hm-ai-upload" aria-labelledby="upload-title" tabIndex={-1}>
              <div className="ai-panel-head">
                <div>
                  <div className="panel-kicker">REPLAY UPLOAD</div>
                  <h2 id="upload-title">리플레이 업로드</h2>
                </div>
                <strong>.rep</strong>
              </div>
              <div
                className={isDragging ? "ai-dropzone is-dragging" : "ai-dropzone"}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  addFiles(event.dataTransfer.files);
                }}
              >
                <input
                  ref={inputRef}
                  className="sr-only"
                  type="file"
                  accept=".rep"
                  multiple
                  onChange={(event) => {
                    addFiles(event.target.files ?? []);
                    event.currentTarget.value = "";
                  }}
                />
                <strong>REP 파일을 올리면 바로 코치 리포트를 만들어드립니다.</strong>
                <p>원본 파일은 보관하지 않습니다. 리포트를 만들 때 필요한 경기 기록만 읽습니다.</p>
                <button className="command-button" type="button" onClick={() => inputRef.current?.click()}>
                  파일 선택
                </button>
              </div>

              {error ? <div className="ai-error-line" role="status">{error}</div> : null}

              <div className="ai-queue" aria-live="polite">
                {queue.map((item) => (
                  <article key={item.id} className={activeReportId === item.id ? "ai-queue-row is-active" : "ai-queue-row"}>
                    <button type="button" onClick={() => setActiveReportId(item.id)}>
                      <strong>{item.file.name}</strong>
                      <span>{formatBytes(item.file.size)} · {statusLabel(item.status)} · {item.message}</span>
                      {item.error ? <em>{item.error}</em> : null}
                    </button>
                    <button type="button" aria-label={`${item.file.name} 제거`} onClick={() => removeQueueItem(item.id)}>
                      제거
                    </button>
                  </article>
                ))}
                {queue.length === 0 ? <p>대기 중인 리플레이가 없습니다.</p> : null}
              </div>

              <button className="command-button command-button-primary ai-analyze-button" type="button" disabled={isAnalyzing} onClick={analyzeAll}>
                {isAnalyzing ? "분석 중" : "선택 파일 분석"}
              </button>
            </section>

          </div>

          <section ref={reportPanelRef} className={selectedReport ? "ai-report-panel" : "ai-report-panel is-empty"} aria-labelledby="report-title" tabIndex={-1}>
            {!selectedReport ? (
              <EmptyReport />
            ) : (
              <>
                <div className="ai-report-head">
                  <div>
                    <span className="panel-kicker">{selectedReport.analysisRun.status}</span>
                    <h2 id="report-title">{selectedReport.replay.map.name ?? selectedReport.replay.gameTitle ?? "Replay Report"}</h2>
                    <p>
                      {formatDate(selectedReport.replay.startedAt)} · {formatDuration(selectedReport.replay.durationSeconds)} · {sourceLabel(selectedReport.replay.source)}
                    </p>
                  </div>
                  <div className="ai-report-actions">
                    <button className="command-button command-button-primary" type="button" onClick={() => void downloadPdf(selectedReport, players, selectedHmCoach)}>
                      PDF 다운로드
                    </button>
                    <button className="command-button" type="button" onClick={() => downloadJson(selectedReport)}>
                      JSON 다운로드
                    </button>
                  </div>
                </div>

                <ReportInsightStrip result={selectedReport} players={players} />

                <div className="ai-tab-row" role="tablist" aria-label="리플레이 분석 탭">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === tab}
                      className={activeTab === tab ? "is-active" : ""}
                      onClick={() => setActiveTab(tab)}
                    >
                      <span>{tabMeta[tab].label}</span>
                      <small>{tabMeta[tab].hint}</small>
                    </button>
                  ))}
                </div>

                {activeTab === "COACH" ? (
                  <CoachReport
                    result={selectedReport}
                    players={players}
                    replayFile={selectedQueueItem?.file ?? null}
                    winConditionModel={winConditionModel}
                    hmCoach={selectedHmCoach}
                    hmCoachPlayerId={selectedHmCoachPlayerId}
                    onHmCoachPlayerChange={setActiveHmCoachPlayerId}
                    hmCoachError={selectedReport.hmCoachError ?? null}
                  />
                ) : null}
                {activeTab === "OVERVIEW" ? <OverviewReport result={selectedReport} players={players} winConditionModel={winConditionModel} /> : null}
                {activeTab === "ECONOMY" ? <ProductionReportView result={selectedReport} /> : null}
                {activeTab === "CONTROL" ? <ControlReportView result={selectedReport} players={players} /> : null}
                {activeTab === "TIMING" ? <TimingReportView result={selectedReport} players={players} /> : null}
                {activeTab === "BUILD" ? <BuildReport result={selectedReport} /> : null}
                {activeTab === "STRATEGY" ? <StrategyReportView result={selectedReport} players={players} /> : null}
                {activeTab === "EVIDENCE" ? <EvidenceReport result={selectedReport} /> : null}
                <PrintableCoachReport result={selectedReport} players={players} />
              </>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function EmptyReport() {
  return (
    <div className="ai-empty-report">
      <div className="ai-empty-report-copy">
        <span className="panel-kicker">REP 파일 대기 중</span>
        <h2 id="report-title">리플레이를 올리면 이곳에 복기 리포트가 나옵니다</h2>
        <p>파일을 선택하고 분석을 시작하세요. 몇 초에 흐름이 끊겼는지, 어떤 습관이 반복됐는지, 다음 게임에서 바로 해볼 연습까지 한 화면에 정리됩니다.</p>
      </div>
      <div className="ai-empty-report-flow" aria-label="리포트 생성 순서">
        {[
          ["1", "REP 업로드", "파일을 보관하지 않고 경기 기록만 읽습니다"],
          ["2", "경기 흐름 정리", "생산, 손속도, 단축키, 화면 이동을 시간대별로 봅니다"],
          ["3", "코치 해석", "왜 그 시간이 아쉬웠는지 사람이 읽기 쉽게 풀어씁니다"],
          ["4", "PDF 저장", "그래프와 코치 노트를 문서로 내려받을 수 있습니다"],
        ].map(([step, title, detail]) => (
          <section key={step}>
            <strong>{step}</strong>
            <div>
              <h3>{title}</h3>
              <p>{detail}</p>
            </div>
          </section>
        ))}
      </div>
      <div className="ai-empty-report-output">
        <span>리포트에 들어가는 내용</span>
        <div>
          {["코치 총평", "손속도 그래프", "생산 공백", "느린 시간대", "왜 문제인지 설명", "다음 연습"].map((item) => (
            <strong key={item}>{item}</strong>
          ))}
        </div>
      </div>
    </div>
  );
}

function HmCoachBridgeReport({ hmCoach }: { hmCoach: HmCoachBridgeResult }) {
  const input = hmCoach.coachInput;
  const feedback = (hmCoach.feedbackItems.length ? hmCoach.feedbackItems : input.coaching?.feedbackItems ?? []).slice(0, 3);
  const nextGuide = (hmCoach.nextGameGuide.length ? hmCoach.nextGameGuide : input.coaching?.nextGameGuide ?? []).slice(0, 3);
  return (
    <section className="ai-hm-coach-report">
      <div className="ai-hm-coach-report-head">
        <div>
          <span className="panel-kicker">이번 판 피드백</span>
          <h3>{hmCoachHeading(hmCoach)}</h3>
          <p>
            {input.coaching?.verdict ?? "화면에 나온 유닛을 어디에 두고 어떻게 싸웠어야 했는지부터 봅니다."}
          </p>
        </div>
        <strong>{feedback.length}개</strong>
      </div>

      <div className="ai-hm-coach-meta-grid">
        <Metric label="맵" value={input.match?.map ?? "-"} />
        <Metric label="종족전" value={input.perspective?.matchup ?? "-"} />
        <Metric label="관점" value={input.perspective?.player ?? "-"} />
        <Metric label="상대" value={input.perspective?.opponent ?? "-"} />
      </div>

      <div className="ai-hm-feedback-list">
        {feedback.map((item, index) => (
          <article key={`${item.title}-${index}`} className={index === 0 ? "is-primary" : ""}>
            <div>
              <span>{item.number ?? index + 1}</span>
            </div>
            <section>
              <small className="ai-hm-priority-label">{hmCoachPriorityLabel(index)}</small>
              <h4>{item.title}</h4>
              <p>{item.detail}</p>
              {item.next ? (
                <div className="ai-hm-next-line">
                  <strong>다음 판에는</strong>
                  <span>{item.next}</span>
                </div>
              ) : null}
            </section>
          </article>
        ))}
      </div>

      {nextGuide.length ? (
        <section className="ai-hm-next-guide">
          <span className="panel-kicker">다음 게임 실행 순서</span>
          <ol>
            {nextGuide.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ol>
        </section>
      ) : null}
    </section>
  );
}

function HmCoachPerspectiveTabs({
  result,
  activePlayerId,
  onChange,
}: {
  result: AnalyzeSuccess;
  activePlayerId: string | null;
  onChange: (playerId: string) => void;
}) {
  const options = hmCoachPerspectiveOptions(result);
  if (options.length < 2) return null;

  return (
    <div className="ai-hm-perspective-tabs" role="tablist" aria-label="HM 코칭 관점 선택">
      {options.map(({ player, id }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={activePlayerId === id}
          className={activePlayerId === id ? "is-active" : ""}
          onClick={() => onChange(id)}
        >
          <strong>{player.name}</strong>
          <span>{playerPerspectiveLabel(player)}</span>
        </button>
      ))}
    </div>
  );
}

function hmCoachPriorityLabel(index: number) {
  if (index === 0) return "이번 판에서 바로 고칠 것";
  if (index === 1) return "다음 판에 이렇게 하세요";
  return "복기할 장면";
}

function EmptyReportPreviewGraphic() {
  const demoApm = [52, 78, 44, 88, 61, 92, 68, 74];
  const demoEapm = [38, 54, 31, 63, 45, 70, 52, 58];
  return (
    <div className="ai-empty-graphic" aria-label="리포트 그래픽 미리보기">
      <section className="ai-empty-visual-card">
        <div className="ai-visual-card-head">
          <span>분당 명령 수</span>
          <strong>구간별 조작 흐름</strong>
        </div>
        <div className="ai-demo-bars">
          {demoApm.map((value, index) => (
            <i key={`demo-${index}`} style={{ height: `${value}%` }}>
              <b style={{ height: `${demoEapm[index]}%` }} />
            </i>
          ))}
        </div>
      </section>
      <section className="ai-empty-visual-card">
        <div className="ai-visual-card-head">
          <span>생산 / 전투</span>
          <strong>입력이 어디에 몰렸는지</strong>
        </div>
        <div className="ai-demo-split">
          <span className="macro" style={{ width: "34%" }} />
          <span className="micro" style={{ width: "42%" }} />
          <span className="hotkey" style={{ width: "18%" }} />
          <span className="other" style={{ width: "6%" }} />
        </div>
        <div className="ai-demo-legend">
          <span>Macro</span>
          <span>Micro</span>
          <span>Hotkey</span>
        </div>
      </section>
      <section className="ai-empty-visual-card">
        <div className="ai-visual-card-head">
          <span>TIMING</span>
          <strong>느린 구간 표시</strong>
        </div>
        <div className="ai-demo-heatmap">
          {["0:45", "2:10", "4:30", "6:15", "8:40", "11:20"].map((time, index) => (
            <span key={time} className={index === 1 || index === 4 ? "hot" : index === 2 ? "warm" : ""}>
              {time}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function ReportInsightStrip({ result, players }: { result: AnalyzeSuccess; players: ReplayPlayer[] }) {
  const coach = buildCoachInsights(result, players);
  const primaryBuild = [...result.semantic.buildClassifications].sort((a, b) => b.confidence - a.confidence)[0];
  const bestReadiness = [...(result.coaching.winReadiness ?? [])].sort((a, b) => b.score - a.score)[0];
  const firstProblem = [...coach.moments]
    .filter((moment) => moment.severity !== "INFO" && !isMetricOnlyMoment(moment))
    .sort((a, b) => timeValue(a.timeLabel) - timeValue(b.timeLabel))[0];
  return (
    <div className="ai-report-intel-strip" aria-label="분석 리포트 요약">
      <section>
        <span>코칭 요약</span>
        <strong>{coach.score}</strong>
        <small>낮은 항목은 보조 근거에서만 봅니다</small>
      </section>
      <section>
        <span>복기할 장면</span>
        <strong>{firstProblem ? firstProblem.timeLabel : "큰 문제 없음"}</strong>
        <small>{firstProblem ? firstProblem.tag : "새 코칭 카드부터 보세요"}</small>
      </section>
      <section>
        <span>빌드 흐름</span>
        <strong>{primaryBuild ? confidenceLabel(primaryBuild.confidence) : "대기"}</strong>
        <small>{primaryBuild ? conciseText(primaryBuild.buildName, 42) : "빌드 정보가 부족합니다"}</small>
      </section>
      <section>
        <span>승리 조건</span>
        <strong>{bestReadiness ? `${bestReadiness.score}점` : "계산 전"}</strong>
        <small>{bestReadiness ? `${bestReadiness.playerName} 기준` : "부족한 조건만 봅니다"}</small>
      </section>
    </div>
  );
}

function buildWinConditionMatches(result: AnalyzeSuccess, players: ReplayPlayer[], model: WinConditionModel | null): WinConditionMatch[] {
  if (!model?.conditions?.length) return [];
  const mapName = normalizedConditionText(result.replay.map.name ?? "");
  return model.conditions
    .map((condition) => {
      const player = players.find((item) => normalizedRace(item.race) === normalizedRace(condition.race)) ?? players.find((item) => !item.observer) ?? null;
      const build = player ? result.semantic.buildClassifications.find((item) => item.playerId === player.id) : null;
      const conditionMap = normalizedConditionText(condition.map);
      let score = 0;
      if (player) score += 2;
      if (conditionMap && mapName && (conditionMap.includes(mapName) || mapName.includes(conditionMap))) score += 4;
      if (build?.matchup && normalizedConditionText(build.matchup) === normalizedConditionText(condition.matchup)) score += 3;
      if (build?.buildCode && build.buildCode === condition.buildCode) score += 3;
      score += Math.min(2, condition.sampleCount / 3);
      return {
        condition,
        score,
        player,
        rows: player ? buildWinConditionRows(result, player, condition) : [],
      };
    })
    .filter((match) => match.score >= 2)
    .sort((a, b) => b.score - a.score || b.condition.confidence - a.condition.confidence)
    .slice(0, 4);
}

function buildWinConditionRows(result: AnalyzeSuccess, player: ReplayPlayer, condition: WinCondition) {
  const command = result.semantic.commandEfficiency.find((item) => item.playerId === player.id);
  const production = result.semantic.productionReports.find((item) => item.playerId === player.id);
  const hotkey = result.semantic.hotkeyReports.find((item) => item.playerId === player.id);
  const readiness = result.coaching.winReadiness?.find((item) => item.playerId === String(player.id));
  const longestGap = Math.max(0, ...(production?.productionGaps ?? []).map((gap) => gap.duration));
  const thresholds = condition.thresholds;
  return [
    thresholdRow("입력 효율 참고", command?.eapm ?? player.eapm, thresholds.minimumEapm, "higher", "회"),
    thresholdRow("의미 있는 입력 비중", command?.effectiveRate ?? player.effectiveRate, thresholds.minimumEffectiveRate, "higher", "%"),
    thresholdRow("운영 유지 점수", production?.stabilityScore ?? null, thresholds.minimumProductionStability, "higher", "점"),
    thresholdRow("가장 긴 운영 중단", longestGap || null, thresholds.maximumProductionGapSeconds, "lower", "초"),
    thresholdRow("부대지정 활용 폭", hotkey?.breadthScore ?? null, thresholds.minimumHotkeyBreadth, "higher", "점"),
    thresholdRow("승리 조건 점수", readiness?.score ?? null, thresholds.minimumWinReadinessScore, "higher", "점"),
  ].filter((row) => row.target !== "기준 없음");
}

function thresholdRow(label: string, actual: number | null | undefined, target: number | null | undefined, direction: "higher" | "lower", unit: string) {
  if (target === null || target === undefined) {
    return { label, actual: actual === null || actual === undefined ? "확인 안 됨" : formatThresholdNumber(actual, unit), target: "기준 없음", pass: null };
  }
  const hasActual = actual !== null && actual !== undefined;
  const pass = hasActual ? (direction === "higher" ? actual >= target : actual <= target) : null;
  const targetLabel = direction === "higher" ? `${formatThresholdNumber(target, unit)} 이상` : `${formatThresholdNumber(target, unit)} 이하`;
  return { label, actual: hasActual ? formatThresholdNumber(actual, unit) : "확인 안 됨", target: targetLabel, pass };
}

function formatThresholdNumber(value: number, unit: string) {
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${rounded}${unit}`;
}

function normalizedRace(value: string) {
  const lower = value.toLowerCase();
  if (lower.startsWith("t")) return "terran";
  if (lower.startsWith("p")) return "protoss";
  if (lower.startsWith("z")) return "zerg";
  return lower;
}

function normalizedConditionText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "");
}

function winReadinessTone(score: number) {
  if (score >= 72) return "strong";
  if (score >= 52) return "medium";
  return "weak";
}

function plainWinReadinessVerdict(value: string) {
  return plainConditionText(value)
    .replaceAll("승리 가능성", "이긴 경기 기준과의 근접도")
    .replaceAll("EAPM", "입력 효율")
    .replaceAll("APM", "분당 명령 수");
}

function plainConditionText(value: string) {
  return value
    .replaceAll("EAPM", "입력 효율")
    .replaceAll("APM", "분당 명령 수")
    .replaceAll("도움 된 명령 비율", "의미 있는 입력 비중")
    .replaceAll("유효 명령 비율", "입력 효율")
    .replaceAll("마우스 클릭 수", "반복 입력")
    .replaceAll("hotkey", "부대지정")
    .replaceAll("Hotkey", "부대지정")
    .replaceAll("production", "생산")
    .replaceAll("macro", "생산·운영")
    .replaceAll("micro", "전투·이동")
    .replaceAll("저하이", "저하가");
}

function WinConditionPanel({ result, players, model, compact = false }: { result: AnalyzeSuccess; players: ReplayPlayer[]; model: WinConditionModel | null; compact?: boolean }) {
  const readiness = [...(result.coaching.winReadiness ?? [])].sort((a, b) => b.score - a.score).slice(0, compact ? 2 : 99);
  const matches = useMemo(() => buildWinConditionMatches(result, players, model), [result, players, model]);
  const topMatch = matches[0] ?? null;
  const visibleRows = topMatch?.rows.filter((row) => row.pass === false).slice(0, 3) ?? [];
  return (
    <section className="ai-win-condition-panel">
      <div className="ai-section-title">
        <span className="panel-kicker">승리 조건 비교</span>
        <h3>이긴 경기들과 비교했을 때 부족했던 기준만 봅니다</h3>
      </div>
      <p className="ai-win-condition-note">지금 화면에서는 다음 판에 바로 고칠 부족 조건만 짧게 보여줍니다.</p>

      <div className="ai-win-readiness-grid">
        {readiness.length > 0 ? (
          readiness.map((item) => (
            <article className={`ai-win-readiness-card tone-${winReadinessTone(item.score)}`} key={item.playerId}>
              <div className="ai-win-readiness-head">
                <div>
                  <span>{item.outcome === "WIN" ? "이긴 플레이어" : item.outcome === "LOSS" ? "진 플레이어" : "플레이어"}</span>
                  <strong>{item.playerName}</strong>
                  <small>{item.race}</small>
                </div>
                <b>{item.score}</b>
              </div>
              {!compact ? <p>{plainWinReadinessVerdict(item.verdict)}</p> : null}
              <div className="ai-win-case-columns">
                {!compact ? (
                <div>
                  <span>맞은 조건</span>
                  {(item.winningCases.length > 0 ? item.winningCases : ["아직 뚜렷한 강점 조건이 적습니다."]).slice(0, 3).map((text) => (
                    <em key={text}>{plainConditionText(text)}</em>
                  ))}
                </div>
                ) : null}
                <div>
                  <span>부족한 조건</span>
                  {(item.missingCases.length > 0 ? item.missingCases : ["큰 결손은 적습니다. 세부 타이밍을 보세요."]).slice(0, compact ? 2 : 3).map((text) => (
                    <em key={text}>{plainConditionText(text)}</em>
                  ))}
                </div>
              </div>
              <strong className="ai-win-next-action">{plainConditionText(item.coachingAdvice)}</strong>
            </article>
          ))
        ) : (
          <article className="ai-win-readiness-card tone-wait">
            <div className="ai-win-readiness-head">
              <div>
                <span>승리 조건</span>
                <strong>분석 결과 대기</strong>
              </div>
              <b>-</b>
            </div>
            <p>현재 REP에는 승리 조건 점수가 포함되지 않았습니다. 최신 분석기로 다시 돌리면 이 영역에 선수별 비교가 표시됩니다.</p>
          </article>
        )}
      </div>

      <details className="ai-win-condition-model" open={!compact}>
        <summary>{compact ? "세부 기준 보기" : "비교 기준"}</summary>
        <div className="ai-win-condition-model-head">
          <div>
            <span className="panel-kicker">비교 기준</span>
            <h4>{model ? "승리 패턴 기준" : "승리 조건 데이터 로딩 중"}</h4>
          </div>
          <strong>{model ? `${model.conditions.length.toLocaleString("ko-KR")}개 조건` : "대기"}</strong>
        </div>
        {topMatch ? (
          <div className="ai-win-condition-detail">
            <div>
              <span>가장 가까운 승리 패턴</span>
              <h4>{topMatch.condition.buildName}</h4>
              <p>
                {topMatch.condition.race} · {topMatch.condition.matchup} · {topMatch.condition.map || "맵 제한 없음"}
              </p>
            </div>
            <div className="ai-win-threshold-grid">
              {(visibleRows.length ? visibleRows : topMatch.rows.slice(0, compact ? 3 : 6)).map((row) => (
                <div className={`ai-win-threshold-row ${row.pass === true ? "pass" : row.pass === false ? "fail" : "unknown"}`} key={row.label}>
                  <span>{row.label}</span>
                  <strong>{row.actual}</strong>
                  <small>{row.target}</small>
                </div>
              ))}
            </div>
            {!compact ? <p className="ai-win-condition-advice">{topMatch.condition.coachingUse}</p> : null}
          </div>
        ) : (
          <p className="ai-win-condition-empty">
            아직 이 REP와 바로 비교할 수 있는 공개 승리 조건이 부족합니다.
          </p>
        )}
      </details>
    </section>
  );
}

function CoachReport({
  result,
  players,
  replayFile,
  winConditionModel,
  hmCoach,
  hmCoachPlayerId,
  onHmCoachPlayerChange,
  hmCoachError,
}: {
  result: AnalyzeSuccess;
  players: ReplayPlayer[];
  replayFile: File | null;
  winConditionModel: WinConditionModel | null;
  hmCoach: HmCoachBridgeResult | null;
  hmCoachPlayerId: string | null;
  onHmCoachPlayerChange: (playerId: string) => void;
  hmCoachError?: string | null;
}) {
  const coach = buildCoachInsights(result, players);
  const [viewerSeekMs, setViewerSeekMs] = useState<number | null>(null);
  const firstProblem = [...coach.moments]
    .filter((moment) => moment.severity !== "INFO" && !isMetricOnlyMoment(moment))
    .sort((a, b) => timeValue(a.timeLabel) - timeValue(b.timeLabel))[0];
  const hasHmCoach = Boolean(hmCoach);
  const supportMoments = hasHmCoach ? coach.moments.filter((moment) => !isMetricOnlyMoment(moment)).slice(0, 4) : coach.moments;
  function jumpToFinding(finding: CoachFinding, withLead = false) {
    const nextMs = Math.max(0, finding.startTimeMs - (withLead ? 5000 : 0));
    setViewerSeekMs(nextMs);
    requestAnimationFrame(() => {
      document.querySelector(".ai-replay-viewer")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  return (
    <div className="ai-report-section ai-coach-report">
      {!hasHmCoach ? <section className="ai-coach-hero-card">
        <div>
          <span className="panel-kicker">한 줄 결론</span>
          <h3>{coach.focus}</h3>
          <p>{conciseText(coach.summary, 180)}</p>
          <div className="ai-plain-summary-row">
            <span>{firstProblem ? `복기할 장면: ${firstProblem.timeLabel}` : "먼저 볼 큰 장면 없음"}</span>
            <span>지표는 보조 근거에서만 확인</span>
          </div>
        </div>
        <div className="ai-coach-score">
          <strong>{coach.score}</strong>
          <span>리포트 점수</span>
        </div>
      </section> : null}

      {hmCoach ? <HmCoachPerspectiveTabs result={result} activePlayerId={hmCoachPlayerId} onChange={onHmCoachPlayerChange} /> : null}
      {hmCoach ? <HmCoachBridgeReport hmCoach={hmCoach} /> : null}
      {!hmCoach && hmCoachError ? <div className="ai-error-line" role="status">추가 코칭 생성 실패: {hmCoachError}</div> : null}

      {hasHmCoach ? (
        <details className="ai-coach-supporting-evidence">
          <summary>
            <span>보조 근거</span>
            <strong>승리 조건, 원본 분석, 짧은 복기 보기</strong>
          </summary>
          <WinConditionPanel result={result} players={players} model={winConditionModel} compact />
          <EvidenceBasedCoachPanel result={result} onJumpToFinding={jumpToFinding} compact />
          <CoachNarrativePanel narrative={coach.narrative} compact />
        </details>
      ) : (
        <>
          <WinConditionPanel result={result} players={players} model={winConditionModel} />
          <EvidenceBasedCoachPanel result={result} onJumpToFinding={jumpToFinding} />
          <CoachNarrativePanel narrative={coach.narrative} />
        </>
      )}

      <ReplayMapViewer2D result={result} players={players} replayFile={replayFile} seekMs={viewerSeekMs} />

      <TacticalReplaySimulator result={result} players={players} moments={supportMoments} />

      <CoachVisualPanel result={result} players={players} coach={coach} />

      {!hasHmCoach ? <div className="ai-coach-profile-grid">
        {coach.profiles.map((profile) => (
          <section key={profile.playerName}>
            <span>{profile.playerName}</span>
            <h3>{profile.readout}</h3>
            <p>{profile.summary}</p>
            <div>
              <Metric label="Macro" value={profile.macro} />
              <Metric label="Micro" value={profile.micro} />
              <Metric label="Hotkey" value={profile.hotkey} />
              <Metric label="MT Score" value={profile.multitaskingScore} />
            </div>
          </section>
        ))}
      </div> : null}

      {!hasHmCoach ? <section className="ai-coach-moment-panel">
        <div className="ai-section-title">
          <span className="panel-kicker">시간별 복기</span>
          <h3>몇 초에 흐름이 끊겼는지</h3>
        </div>
        <TimingOverviewGraphic moments={coach.moments} durationSeconds={result.replay.durationSeconds} />
        <div className="ai-coach-moment-list">
          {coach.moments.map((moment) => (
            <article key={moment.id} className={`ai-coach-moment severity-${moment.severity.toLowerCase()}`}>
              <div>
                <span>{moment.timeLabel}</span>
                <strong>{moment.tag}</strong>
              </div>
              <MomentDiagnosticGraphic moment={moment} durationSeconds={result.replay.durationSeconds} />
              <section>
                <h4>{moment.title}</h4>
                <p>{moment.detail}</p>
                <p className="ai-moment-interpretation">
                  <strong>해석</strong>
                  {momentInterpretation(moment)}
                </p>
                <div className="ai-moment-coach-notes">
                  {momentCoachNotes(moment).map((note) => (
                    <div key={note.label}>
                      <strong>{note.label}</strong>
                      <p>{note.text}</p>
                    </div>
                  ))}
                </div>
                <small>{moment.playerName} · {moment.evidence}</small>
              </section>
            </article>
          ))}
        </div>
      </section> : null}

      {!hasHmCoach ? <section className="ai-coach-drill-panel">
        <div className="ai-section-title">
          <span className="panel-kicker">다음 게임에서 해볼 것</span>
          <h3>바로 연습할 과제</h3>
        </div>
        <div className="ai-coach-drill-grid">
          {coach.drills.map((drill) => (
            <article key={drill.title}>
              <h4>{drill.title}</h4>
              <p>{drill.detail}</p>
              <small>{drill.successMetric}</small>
            </article>
          ))}
        </div>
      </section> : null}

      {!hasHmCoach ? <section className="ai-pdf-guide">
        <div>
          <span className="panel-kicker">PDF 저장</span>
          <h3>복기용 문서로 내려받기</h3>
          <p>PDF에는 그래프와 코치 노트를 함께 저장합니다.</p>
        </div>
      </section> : null}
    </div>
  );
}

function ControlReportView({ result, players }: { result: AnalyzeSuccess; players: ReplayPlayer[] }) {
  return (
    <div className="ai-control-report-view">
      <CommandEfficiencyView result={result} players={players} />
      <HotkeyReport result={result} players={players} />
    </div>
  );
}

function TimingReportView({ result, players }: { result: AnalyzeSuccess; players: ReplayPlayer[] }) {
  const coach = buildCoachInsights(result, players);
  const visibleMoments = coach.moments.filter((moment) => moment.severity !== "INFO").slice(0, 6);
  return (
    <div className="ai-report-section ai-timing-report-view">
      <section className="ai-coach-moment-panel ai-timing-focus-panel">
        <div className="ai-section-title">
          <span className="panel-kicker">시간 분석</span>
          <h3>먼저 다시 볼 장면입니다</h3>
        </div>
        <TimingOverviewGraphic moments={coach.moments} durationSeconds={result.replay.durationSeconds} />
        <div className="ai-timing-brief-list">
          {visibleMoments.map((moment) => (
            <article key={`timing-${moment.id}`} className={`ai-timing-brief severity-${moment.severity.toLowerCase()}`}>
              <div>
                <span>{moment.timeLabel}</span>
                <strong>{moment.tag}</strong>
              </div>
              <section>
                <h4>{moment.title}</h4>
                <p>{moment.detail}</p>
                <p className="ai-moment-interpretation">
                  <strong>해석</strong>
                  {momentInterpretation(moment)}
                </p>
              </section>
            </article>
          ))}
          {visibleMoments.length === 0 ? <p className="ai-help-copy">크게 흔들린 시간대는 보이지 않습니다. 대신 초반 빌드 순서와 전투 직후 생산 입력을 가볍게 확인해보세요.</p> : null}
        </div>
      </section>

      <MultitaskingReportView result={result} />
    </div>
  );
}

function StrategyReportView({ result, players }: { result: AnalyzeSuccess; players: ReplayPlayer[] }) {
  const coach = buildCoachInsights(result, players);
  const primaryBuilds = result.semantic.buildClassifications
    .filter((item) => item.confidence >= result.confidencePolicy.hideBelow)
    .slice(0, 2);
  return (
    <div className="ai-report-section ai-strategy-report-view">
      <section className="ai-strategy-read-panel">
        <span className="panel-kicker">전략 해석</span>
        <h3>{coach.narrative.strategy.title}</h3>
        <p>
          <CoachRichText text={coach.narrative.strategy.body} />
        </p>
        <div className="ai-strategy-build-strip">
          {primaryBuilds.map((build) => (
            <section key={`strategy-${build.playerId}-${build.buildCode}`}>
              <span>{build.playerName}</span>
              <strong>{build.buildName}</strong>
              <small>{confidenceLabel(build.confidence)} · {build.matchup}</small>
            </section>
          ))}
        </div>
      </section>

      <div className="ai-strategy-column-grid">
        <section>
          <span className="panel-kicker">잘한 점</span>
          <h3>살릴 장면</h3>
          {coach.narrative.strengths.slice(0, 2).map((item) => (
            <article key={`strategy-strength-${item.title}`}>
              <strong>{item.title}</strong>
              <p>
                <CoachRichText text={item.body} />
              </p>
            </article>
          ))}
        </section>
        <section>
          <span className="panel-kicker">고칠 점</span>
          <h3>고칠 장면</h3>
          {coach.narrative.mistakes.slice(0, 2).map((item) => (
            <article key={`strategy-mistake-${item.title}`}>
              <strong>{item.title}</strong>
              <p>
                <CoachRichText text={item.body} />
              </p>
            </article>
          ))}
        </section>
      </div>

      <section className="ai-strategy-priority-panel">
        <span className="panel-kicker">다음 게임 체크리스트</span>
        <h3>다음 게임에서 바로 확인할 체크리스트</h3>
        <ol>
          {coach.narrative.priorities.map((item) => (
            <li key={`strategy-priority-${item.title}`}>
              <strong>{item.title}</strong>
              <p>
                <CoachRichText text={item.body} />
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function CoachNarrativePanel({ narrative, compact = false }: { narrative: CoachNarrative; compact?: boolean }) {
  const feedbackItems = narrative.feedback.filter((item) => !isMetricOnlyText(`${item.title} ${item.body} ${item.meta ?? ""}`)).slice(0, compact ? 3 : 4);
  return (
    <section className="ai-coach-narrative-panel">
      <div className="ai-section-title">
        <span className="panel-kicker">복기 리포트</span>
        <h3>{compact ? "핵심만 짧게 다시 봅니다" : "읽고 바로 다시 볼 수 있게 정리했습니다"}</h3>
      </div>

      <article className="ai-narrative-report">
        {!compact ? <NarrativeCard eyebrow="이번 경기 요약" item={narrative.overall} /> : null}
        <NarrativeFeedbackCard items={feedbackItems.length ? feedbackItems : narrative.feedback.slice(0, compact ? 2 : 4)} compact={compact} />
        {!compact ? <NarrativeCard eyebrow="빌드와 운영 흐름" item={narrative.strategy} /> : null}
        {!compact ? <NarrativeListCard title="잘한 점" items={narrative.strengths} tone="strength" /> : null}
        {!compact ? <NarrativeListCard title="고칠 점" items={narrative.mistakes} tone="mistake" /> : null}
        {!compact ? <NarrativeMomentCard title={`복기할 장면 ${narrative.keyMoments.length}개`} moments={narrative.keyMoments} /> : null}
        <NarrativeListCard title="다음 판에 이렇게 하세요" items={narrative.priorities.slice(0, compact ? 2 : 4)} tone="priority" compact={compact} />
      </article>
    </section>
  );
}

function EvidenceBasedCoachPanel({ result, onJumpToFinding, compact = false }: { result: AnalyzeSuccess; onJumpToFinding: (finding: CoachFinding, withLead?: boolean) => void; compact?: boolean }) {
  const { coaching } = result;
  const findings = coaching.findings
    .filter((finding) => !compact || !isMetricOnlyFinding(finding))
    .slice(0, compact ? 2 : 3);
  const factById = useMemo(() => new Map(coaching.facts.map((fact) => [fact.id, fact])), [coaching.facts]);
  return (
    <section className="ai-evidence-coach-panel">
      {!compact ? <div className="ai-evidence-scope">
        <div>
          <span className="panel-kicker">분석 범위</span>
          <h3>{coaching.scope.headline}</h3>
          <p>{coaching.scope.dataTypes.join(" · ")}</p>
        </div>
        <div className="ai-evidence-scope-grid">
          <Metric label="종족전" value={coaching.scope.matchup} />
          <Metric label="맵" value={coaching.scope.mapName} />
          <Metric label="신뢰도" value={percent(coaching.scope.confidence)} />
          <Metric label="검수 상태" value={coaching.review.badge} />
        </div>
      </div> : null}

      {!compact ? <div className="ai-evidence-limits">
        {coaching.scope.limitations.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div> : null}

      <div className="ai-section-title">
        <span className="panel-kicker">{compact ? "보조 근거" : "근거 기반 코칭"}</span>
        <h3>{compact ? "복기할 장면" : "이번 판에서 먼저 고칠 장면"}</h3>
      </div>

      <div className="ai-finding-list">
        {findings.length > 0 ? (
          findings.map((finding, index) => (
            <article key={finding.id} className={`ai-finding-card severity-${finding.severity}`}>
              <div className="ai-finding-rank">
                <b>{index + 1}</b>
                <span>{formatMsLabel(finding.startTimeMs)}</span>
              </div>
              <div className="ai-finding-body">
                <div className="ai-finding-head">
                  <small>{severityLabel(finding.severity)} · {categoryLabel(finding.category)}</small>
                  <h4>{conciseText(finding.title, 72)}</h4>
                </div>
                <p>{conciseText(finding.summary, compact ? 120 : 220)}</p>
                {!compact ? <div className="ai-finding-cause">
                  <strong>왜 문제인가</strong>
                  <p>{finding.whyItMatters}</p>
                </div> : null}
                <div className="ai-finding-next">
                  <strong>다음 판에는</strong>
                  <p>{conciseText(finding.nextAction, compact ? 120 : 220)}</p>
                </div>
                {!compact ? <div className="ai-finding-evidence">
                  <span>리플레이 근거</span>
                  {finding.evidenceIds.slice(0, 4).map((id) => {
                    const fact = factById.get(id);
                    return <code key={id}>{fact ? `${formatMsLabel(fact.timeMs)} · ${fact.label}` : id}</code>;
                  })}
                </div> : null}
                {!compact && finding.knowledgeIds.length > 0 ? (
                  <div className="ai-finding-knowledge">
                    <span>참고 지식</span>
                    {finding.knowledgeIds.slice(0, 2).map((id) => {
                      const match = coaching.knowledgeMatches.find((item) => item.knowledgeId === id);
                      return <code key={id}>{match?.title ?? id}</code>;
                    })}
                  </div>
                ) : null}
                {!compact && finding.limitations?.length ? (
                  <p className="ai-finding-limit">{finding.limitations.join(" ")}</p>
                ) : null}
                <div className="ai-finding-actions">
                  <button type="button" onClick={() => onJumpToFinding(finding)}>해당 장면 보기</button>
                  <button type="button" onClick={() => onJumpToFinding(finding, true)}>5초 전부터 보기</button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <article className="ai-finding-card is-empty">
            <div className="ai-finding-body">
              <h4>추가로 볼 핵심 장면은 적습니다.</h4>
              <p>먼저 위의 HM 코칭 카드부터 복기하세요.</p>
            </div>
          </article>
        )}
      </div>

      {!compact ? <div className="ai-knowledge-state">
        {coaching.scope.knowledgeState.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div> : null}
    </section>
  );
}

function NarrativeFeedbackCard({ items, compact = false }: { items: CoachNarrativeItem[]; compact?: boolean }) {
  return (
    <section className="ai-narrative-block ai-feedback-card">
      <div className="ai-feedback-card-head">
        <span>이번 판 피드백</span>
        <h4>이번 판에서 못한 부분</h4>
        <em>{items.length}개</em>
      </div>
      {!compact ? <p>애매한 추측은 숨기고, 근거가 잡힌 내용만 먼저 보여줍니다.</p> : null}
      <ol>
        {items.map((item, index) => (
          <li key={`${item.title}-${index}`}>
            <b>{index + 1}</b>
            <div>
              <small>{index === 0 ? "이번 판에서 바로 고칠 것" : "다음 판에 이렇게 하세요"}</small>
              <strong>{item.title}</strong>
              <p>
                <CoachRichText text={compact ? conciseText(item.body, 140) : item.body} />
              </p>
              {item.meta ? (
                <div className="ai-feedback-next">
                  <span>다음 판에는</span>
                  <p>
                    <CoachRichText text={item.meta} />
                  </p>
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function NarrativeCard({ eyebrow, item }: { eyebrow: string; item: CoachNarrativeItem }) {
  return (
    <section className="ai-narrative-block">
      <span>{eyebrow}</span>
      <h4>{item.title}</h4>
      <p>
        <CoachRichText text={item.body} />
      </p>
      {item.meta ? <small>{item.meta}</small> : null}
    </section>
  );
}

function NarrativeListCard({ title, items, tone, compact = false }: { title: string; items: CoachNarrativeItem[]; tone: "strength" | "mistake" | "priority"; compact?: boolean }) {
  return (
    <section className={`ai-narrative-block ai-narrative-list tone-${tone}`}>
      <h4>{title}</h4>
      <ul>
        {items.map((item, index) => (
          <li key={`${title}-${item.title}-${index}`}>
            <strong>{tone === "priority" ? `${index + 1}. ${item.title}` : item.title}</strong>
            <p>
              <CoachRichText text={compact ? conciseText(item.body, 130) : item.body} />
            </p>
            {item.meta && !compact ? <small>{item.meta}</small> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function NarrativeMomentCard({ title, moments }: { title: string; moments: CoachNarrativeMoment[] }) {
  return (
    <section className="ai-narrative-block ai-narrative-list ai-key-moment-card">
      <h4>{title}</h4>
      <ul>
        {moments.map((moment) => (
          <li key={`${moment.timeLabel}-${moment.title}`}>
            <div className="ai-key-moment-head">
              <span className={`severity-${moment.severity.toLowerCase()}`}>{moment.timeLabel}</span>
              <strong>{moment.title}</strong>
            </div>
            <p>
              <CoachRichText text={moment.body} />
            </p>
            {moment.meta ? <small>{moment.meta}</small> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function CoachRichText({ text }: { text: string }) {
  return (
    <>
      {splitCoachMarkup(text).map((part, index) => (
        part.highlight ? <mark key={`${part.text}-${index}`}>{part.text}</mark> : <span key={`${part.text}-${index}`}>{part.text}</span>
      ))}
    </>
  );
}

type ReplayViewerLayerKey = "starts" | "units" | "buildings" | "moves" | "attacks" | "camera" | "heatmap" | "grid";
type ReplayViewerLayers = Record<ReplayViewerLayerKey, boolean>;
type ReplayViewerEvent = {
  id: string;
  timeMs: number;
  playerId: number;
  playerName: string;
  type: "start" | "build" | "train" | "move" | "attack" | "camera" | "other";
  marker: "start" | "worker" | "army" | "building" | "attack" | "move" | "camera" | "other";
  x?: number;
  y?: number;
  label: string;
};
type ReplayViewerData = {
  map: { name: string; tileWidth: number; tileHeight: number; pixelWidth: number; pixelHeight: number; imageUrl?: string };
  durationMs: number;
  players: Array<{ id: number; name: string; race: string; color: string; startX?: number; startY?: number; apm: number | null; eapm: number | null }>;
  events: ReplayViewerEvent[];
};
type ReplayViewerCurrentPosition = {
  key: string;
  event: ReplayViewerEvent;
  marker: ReplayViewerEvent["marker"];
  label: string;
  color: string;
};

const REPLAY_VIEWER_DEFAULT_LAYERS: ReplayViewerLayers = {
  starts: true,
  units: true,
  buildings: true,
  moves: true,
  attacks: true,
  camera: false,
  heatmap: false,
  grid: false,
};
const REPLAY_VIEWER_COLORS = ["#58a6ff", "#ff6d6d", "#65e7ff", "#f6c76a", "#b8f15a", "#a78bfa", "#49d19a", "#ff9f43"];
const REPLAY_VIEWER_SPEEDS = [1, 2, 4, 8] as const;

function ReplayMapViewer2D({ result, players, replayFile, seekMs }: { result: AnalyzeSuccess; players: ReplayPlayer[]; replayFile: File | null; seekMs?: number | null }) {
  const data = useMemo(() => buildReplayViewerData(result, players), [result, players]);
  const [currentMs, setCurrentMs] = useState(data.durationMs);
  const [displayMs, setDisplayMs] = useState(data.durationMs);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof REPLAY_VIEWER_SPEEDS)[number]>(1);
  const [layers, setLayers] = useState<ReplayViewerLayers>(REPLAY_VIEWER_DEFAULT_LAYERS);
  const [visiblePlayers, setVisiblePlayers] = useState<Record<number, boolean>>(() => Object.fromEntries(data.players.map((player) => [player.id, true])));
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null);
  const [mapImageStatus, setMapImageStatus] = useState<"IDLE" | "LOADING" | "READY" | "FAILED">("IDLE");
  const [mapImageError, setMapImageError] = useState<string | null>(null);
  const mapImageUrlRef = useRef<string | null>(null);
  const currentRef = useRef(currentMs);
  const frameRef = useRef<number | null>(null);
  const prevFrameRef = useRef<number | null>(null);
  const displayTickRef = useRef(0);

  useEffect(() => {
    setCurrentMs(data.durationMs);
    setDisplayMs(data.durationMs);
    currentRef.current = data.durationMs;
    setIsPlaying(false);
    setVisiblePlayers(Object.fromEntries(data.players.map((player) => [player.id, true])));
  }, [data]);

  useEffect(() => {
    let cancelled = false;

    async function loadMapImage() {
      if (mapImageUrlRef.current) {
        URL.revokeObjectURL(mapImageUrlRef.current);
        mapImageUrlRef.current = null;
      }
      setMapImageUrl(null);
      setMapImageError(null);

      if (!replayFile) {
        setMapImageStatus("FAILED");
        setMapImageError("원본 REP 파일을 찾지 못해 실제 맵 이미지를 만들 수 없습니다.");
        return;
      }

      setMapImageStatus("LOADING");

      try {
        const form = new FormData();
        form.append("file", replayFile);
        const response = await fetch("/api/replay/map", {
          method: "POST",
          body: form,
        });
        const contentType = response.headers.get("content-type") ?? "";

        if (!response.ok || !contentType.startsWith("image/")) {
          const message = contentType.includes("application/json")
            ? ((await response.json()) as { error?: string }).error
            : await response.text();
          throw new Error(message || "맵 이미지 생성에 실패했습니다.");
        }

        const blob = await response.blob();
        if (blob.size === 0) {
          throw new Error("생성된 맵 이미지가 비어 있습니다.");
        }

        const imageUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(imageUrl);
          return;
        }

        mapImageUrlRef.current = imageUrl;
        setMapImageUrl(imageUrl);
        setMapImageStatus("READY");
      } catch (error) {
        if (cancelled) return;
        setMapImageStatus("FAILED");
        setMapImageError(error instanceof Error ? error.message : "맵 이미지를 표시하지 못했습니다.");
      }
    }

    loadMapImage();

    return () => {
      cancelled = true;
      if (mapImageUrlRef.current) {
        URL.revokeObjectURL(mapImageUrlRef.current);
        mapImageUrlRef.current = null;
      }
    };
  }, [replayFile]);

  function seek(nextMs: number) {
    const bounded = Math.max(0, Math.min(data.durationMs, nextMs));
    currentRef.current = bounded;
    setCurrentMs(bounded);
    setDisplayMs(bounded);
  }

  useEffect(() => {
    if (typeof seekMs !== "number") return;
    seek(seekMs);
    setIsPlaying(false);
  }, [seekMs]);

  useEffect(() => {
    if (!isPlaying) {
      prevFrameRef.current = null;
      return;
    }
    const tick = (now: number) => {
      const previous = prevFrameRef.current ?? now;
      prevFrameRef.current = now;
      const next = Math.min(data.durationMs, currentRef.current + (now - previous) * speed);
      currentRef.current = next;
      setCurrentMs(next);
      if (now - displayTickRef.current > 180) {
        displayTickRef.current = now;
        setDisplayMs(next);
      }
      if (next >= data.durationMs) {
        setIsPlaying(false);
        setDisplayMs(next);
        return;
      }
      frameRef.current = window.requestAnimationFrame(tick);
    };
    frameRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, [data.durationMs, isPlaying, speed]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
      if (event.code === "Space") {
        event.preventDefault();
        setIsPlaying((value) => !value);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        seek(currentRef.current - 5000);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        seek(currentRef.current + 5000);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const visibleIds = useMemo(() => new Set(Object.entries(visiblePlayers).filter(([, visible]) => visible).map(([id]) => Number(id))), [visiblePlayers]);
  const state = useMemo(() => replayViewerStateAt(data, displayMs, visibleIds), [data, displayMs, visibleIds]);
  const hasCoordinates = data.events.some((event) => Number.isFinite(event.x) && Number.isFinite(event.y));

  return (
    <section className="ai-replay-viewer" aria-label="2D 리플레이 뷰어">
      <div className="ai-section-title">
        <span className="panel-kicker">2D REPLAY VIEWER</span>
        <h3>실제 명령 좌표로 보는 2D 복기</h3>
      </div>
      <div className="ai-replay-viewer-head">
        <p>현재 파서가 제공하는 시작 위치, 건설 좌표, 이동·공격 명령 좌표만 표시합니다. 정확한 유닛 이동과 전투 결과는 게임 엔진이 필요하므로 실제값처럼 꾸미지 않습니다.</p>
        <div>
          <span>맵 이미지</span>
          <strong>{mapImageStatus === "READY" ? "표시 중" : mapImageStatus === "LOADING" ? "생성 중" : "표시 실패"}</strong>
          <small>{data.map.tileWidth} x {data.map.tileHeight} tiles · {data.events.length.toLocaleString("ko-KR")} events</small>
        </div>
      </div>
      <div className="ai-replay-viewer-grid">
        <div className="ai-replay-viewer-map-col">
          <ReplayMapCanvas2D data={data} currentMs={displayMs} layers={layers} visibleIds={visibleIds} mapImageUrl={mapImageUrl} mapImageStatus={mapImageStatus} mapImageError={mapImageError} />
          <div className="ai-replay-timeline no-print">
            <div>
              <button type="button" onClick={() => seek(0)}>처음</button>
              <button type="button" onClick={() => seek(currentMs - 10000)}>-10초</button>
              <button type="button" className="is-primary" onClick={() => setIsPlaying((value) => !value)}>{isPlaying ? "일시정지" : "재생"}</button>
              <button type="button" onClick={() => seek(currentMs + 10000)}>+10초</button>
              <span>{formatDuration(displayMs / 1000)} / {formatDuration(data.durationMs / 1000)}</span>
              <div>
                {REPLAY_VIEWER_SPEEDS.map((item) => (
                  <button key={item} type="button" className={speed === item ? "is-active" : ""} onClick={() => setSpeed(item)}>{item}x</button>
                ))}
              </div>
            </div>
            <input type="range" min={0} max={Math.max(1, data.durationMs)} step={250} value={Math.round(displayMs)} onChange={(event) => seek(Number(event.target.value))} aria-label="리플레이 시간 이동" />
          </div>
        </div>
        <aside className="ai-replay-side">
          <section>
            <h4>표시할 정보</h4>
            <div className="ai-replay-layer-grid">
              {([
                ["starts", "시작 위치"],
                ["units", "유닛/생산"],
                ["buildings", "건물"],
                ["moves", "이동 명령"],
                ["attacks", "공격 명령"],
                ["camera", "화면 이동"],
                ["heatmap", "히트맵"],
                ["grid", "맵 그리드"],
              ] as Array<[ReplayViewerLayerKey, string]>).map(([key, label]) => (
                <label key={key}><input type="checkbox" checked={layers[key]} onChange={(event) => setLayers({ ...layers, [key]: event.target.checked })} />{label}</label>
              ))}
            </div>
          </section>
          <section>
            <h4>플레이어</h4>
            <div className="ai-replay-player-toggle-list">
              {data.players.map((player) => (
                <label key={player.id}><input type="checkbox" checked={visiblePlayers[player.id] ?? true} onChange={(event) => setVisiblePlayers({ ...visiblePlayers, [player.id]: event.target.checked })} /><span style={{ background: player.color }} />{player.name}</label>
              ))}
            </div>
          </section>
          <section>
            <h4>지도 표시 설명</h4>
            <div className="ai-replay-legend">
              {[
                ["worker", "일꾼", "SCV, Probe, Drone처럼 자원 채취나 건설에 관여하는 명령입니다."],
                ["army", "유닛", "생산되거나 조작된 병력 관련 명령입니다."],
                ["attack", "공격", "상대를 찍거나 교전 방향으로 들어간 명령입니다."],
                ["building", "건물", "건설 또는 생산 건물 관련 좌표입니다."],
                ["move", "이동", "점선은 최근 이동 흐름입니다. 시간이 지나면 사라집니다."],
              ].map(([kind, title, detail]) => (
                <div key={kind} className={`ai-replay-legend-row is-${kind}`}>
                  <span aria-hidden="true" />
                  <div>
                    <strong>{title}</strong>
                    <p>{detail}</p>
                  </div>
                </div>
              ))}
              <p className="ai-replay-legend-note">현재 위치 표시는 명령 로그에 나온 유닛/명령 종류별 마지막 조작 위치입니다.</p>
            </div>
          </section>
          <section>
            <h4>현재 시점</h4>
            <div className="ai-replay-player-card-list">
              {data.players.map((player) => {
                const playerState = state.players.get(player.id);
                return (
                  <article key={player.id}>
                    <div><span style={{ background: player.color }} /><strong>{player.name}</strong><small>{player.race}</small></div>
                    <dl>
                      <dt>상태 수치</dt><dd>서플라이·현재 일꾼·현재 병력은 게임 상태 재구성이 필요합니다</dd>
                      <dt>생산 명령</dt><dd>{playerState?.productionCommandCount ?? 0}회</dd>
                      <dt>일꾼 관련</dt><dd>{playerState?.workerCommandCount ?? 0}회</dd>
                      <dt>건물 명령</dt><dd>{playerState?.buildings.size ? Array.from(playerState.buildings.entries()).map(([name, count]) => `${name} ${count}`).join(", ") : "아직 없음"}</dd>
                      <dt>공격 명령</dt><dd>{playerState?.attackCount ?? 0}회</dd>
                      <dt>APM/EAPM</dt><dd>{player.apm ?? "?"} / {player.eapm ?? "?"}</dd>
                    </dl>
                  </article>
                );
              })}
            </div>
          </section>
        </aside>
      </div>
      {!hasCoordinates ? <p className="ai-help-copy">이 리플레이는 좌표가 포함된 명령이 적습니다. 기존 분석 리포트는 유지되며, 맵 뷰어는 가능한 데이터만 표시합니다.</p> : null}
    </section>
  );
}

function ReplayMapCanvas2D({
  data,
  currentMs,
  layers,
  visibleIds,
  mapImageUrl,
  mapImageStatus,
  mapImageError,
}: {
  data: ReplayViewerData;
  currentMs: number;
  layers: ReplayViewerLayers;
  visibleIds: Set<number>;
  mapImageUrl: string | null;
  mapImageStatus: "IDLE" | "LOADING" | "READY" | "FAILED";
  mapImageError: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    setMapLoaded(false);
  }, [mapImageUrl]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(shell);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    drawReplayMapCanvas(canvasRef.current, data, currentMs, layers, visibleIds, Boolean(mapImageUrl && mapLoaded));
  }, [data, currentMs, layers, mapImageUrl, mapLoaded, size, visibleIds]);

  return (
    <div className="ai-replay-map-stage" ref={shellRef}>
      {mapImageUrl ? (
        <img
          src={mapImageUrl}
          alt={`${data.map.name} 2D 맵`}
          onLoad={() => setMapLoaded(true)}
          onError={() => setMapLoaded(false)}
        />
      ) : null}
      <canvas ref={canvasRef} />
      {mapImageStatus !== "READY" ? (
        <div className="ai-replay-map-watermark">
          <strong>{mapImageStatus === "LOADING" ? "실제 맵 이미지를 만드는 중" : "실제 맵 이미지를 표시하지 못했습니다"}</strong>
          <span>{mapImageError ?? "명령 좌표는 계속 표시되며, 서버 로그에서 실패 원인을 확인합니다."}</span>
        </div>
      ) : null}
    </div>
  );
}

function buildReplayViewerData(result: AnalyzeSuccess, players: ReplayPlayer[]): ReplayViewerData {
  const tileWidth = result.replay.map.width ?? 128;
  const tileHeight = result.replay.map.height ?? 128;
  const pixelWidth = tileWidth * 32;
  const pixelHeight = tileHeight * 32;
  const viewerPlayers = players.filter((player) => !player.observer).map((player, index) => ({
    id: player.id,
    name: player.name,
    race: player.race,
    color: REPLAY_VIEWER_COLORS[index % REPLAY_VIEWER_COLORS.length],
    startX: player.startLocation?.x,
    startY: player.startLocation?.y,
    apm: player.apm,
    eapm: player.eapm,
  }));
  const startEvents: ReplayViewerEvent[] = viewerPlayers
    .filter((player) => Number.isFinite(player.startX) && Number.isFinite(player.startY))
    .map((player) => ({
      id: `start-${player.id}`,
      timeMs: 0,
      playerId: player.id,
      playerName: player.name,
      type: "start",
      marker: "start",
      x: player.startX,
      y: player.startY,
      label: "시작 위치",
    }));
  const commandEvents: ReplayViewerEvent[] = result.commands
    .filter((command) => command.position)
    .map((command) => {
      const type = replayViewerCommandType(command);
      const label = command.unitOrBuilding ?? command.details ?? command.type;
      return {
        id: `command-${command.index}`,
        timeMs: Math.round(command.timeSeconds * 1000),
        playerId: command.playerId,
        playerName: command.playerName,
        type,
        marker: replayViewerMarkerType(command, type),
        x: command.position?.x,
        y: command.position?.y,
        label,
      };
    });
  const events = [...startEvents, ...commandEvents].sort((a, b) => a.timeMs - b.timeMs);
  const durationMs = Math.max(1000, Math.round((result.replay.durationSeconds ?? 0) * 1000), ...events.map((event) => event.timeMs));
  return {
    map: {
      name: result.replay.map.name ?? result.replay.gameTitle ?? "Unknown Map",
      tileWidth,
      tileHeight,
      pixelWidth,
      pixelHeight,
    },
    durationMs,
    players: viewerPlayers,
    events,
  };
}

function drawReplayMapCanvas(canvas: HTMLCanvasElement | null, data: ReplayViewerData, currentMs: number, layers: ReplayViewerLayers, visibleIds: Set<number>, hasMapImage: boolean) {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  const viewport = replayViewerContain(rect.width, rect.height, data.map.pixelWidth, data.map.pixelHeight);
  ctx.fillStyle = hasMapImage ? "transparent" : "#071016";
  ctx.fillRect(0, 0, rect.width, rect.height);
  ctx.save();
  ctx.beginPath();
  ctx.rect(viewport.offsetX, viewport.offsetY, viewport.width, viewport.height);
  ctx.clip();
  if (hasMapImage) {
    if (layers.grid) drawReplayViewerGrid(ctx, viewport);
  } else {
    drawReplayViewerFallbackMap(ctx, viewport, layers.grid);
  }
  const activeEvents = data.events.slice(0, replayViewerUpperBound(data.events, currentMs)).filter((event) => visibleIds.has(event.playerId));
  if (layers.heatmap) drawReplayViewerHeatmap(ctx, activeEvents, viewport);
  if (layers.moves) drawReplayViewerMoveTrails(ctx, data, activeEvents, currentMs, viewport);
  if (layers.starts) drawReplayViewerStarts(ctx, data, viewport, visibleIds);
  if (layers.buildings) drawReplayViewerEvents(ctx, activeEvents.filter((event) => event.type === "build"), data, viewport, "building");
  if (layers.units) drawReplayViewerEvents(ctx, activeEvents.filter((event) => event.type === "train"), data, viewport, "unit");
  if (layers.attacks) drawReplayViewerEvents(ctx, replayViewerRecent(activeEvents, currentMs, "attack"), data, viewport, "attack");
  if (layers.camera) drawReplayViewerEvents(ctx, replayViewerRecent(activeEvents, currentMs, "camera"), data, viewport, "camera");
  if (layers.units || layers.moves || layers.attacks) drawReplayViewerCurrentPositions(ctx, data, activeEvents, viewport);
  ctx.restore();
  ctx.strokeStyle = "rgba(88,166,255,0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(viewport.offsetX, viewport.offsetY, viewport.width, viewport.height);
}

function drawReplayViewerGrid(ctx: CanvasRenderingContext2D, viewport: ReturnType<typeof replayViewerContain>) {
  ctx.strokeStyle = "rgba(88, 166, 255, 0.13)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 12; i += 1) {
    const x = viewport.offsetX + (viewport.width * i) / 12;
    const y = viewport.offsetY + (viewport.height * i) / 12;
    ctx.beginPath();
    ctx.moveTo(x, viewport.offsetY);
    ctx.lineTo(x, viewport.offsetY + viewport.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(viewport.offsetX, y);
    ctx.lineTo(viewport.offsetX + viewport.width, y);
    ctx.stroke();
  }
}

function drawReplayViewerFallbackMap(ctx: CanvasRenderingContext2D, viewport: ReturnType<typeof replayViewerContain>, showGrid: boolean) {
  const gradient = ctx.createLinearGradient(viewport.offsetX, viewport.offsetY, viewport.offsetX + viewport.width, viewport.offsetY + viewport.height);
  gradient.addColorStop(0, "#0c1a22");
  gradient.addColorStop(0.5, "#101722");
  gradient.addColorStop(1, "#0b1016");
  ctx.fillStyle = gradient;
  ctx.fillRect(viewport.offsetX, viewport.offsetY, viewport.width, viewport.height);
  ctx.fillStyle = "rgba(88, 166, 255, 0.08)";
  ctx.fillRect(viewport.offsetX + viewport.width * 0.08, viewport.offsetY + viewport.height * 0.1, viewport.width * 0.2, viewport.height * 0.16);
  ctx.fillStyle = "rgba(202, 163, 91, 0.08)";
  ctx.fillRect(viewport.offsetX + viewport.width * 0.72, viewport.offsetY + viewport.height * 0.74, viewport.width * 0.2, viewport.height * 0.16);
  if (showGrid) {
    drawReplayViewerGrid(ctx, viewport);
  }
}

function drawReplayViewerStarts(ctx: CanvasRenderingContext2D, data: ReplayViewerData, viewport: ReturnType<typeof replayViewerContain>, visibleIds: Set<number>) {
  for (const player of data.players) {
    if (!visibleIds.has(player.id) || !Number.isFinite(player.startX) || !Number.isFinite(player.startY)) continue;
    const point = replayViewerMapToScreen(player.startX ?? 0, player.startY ?? 0, viewport);
    ctx.fillStyle = "rgba(4,7,11,0.82)";
    ctx.strokeStyle = player.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = player.color;
    ctx.font = "900 11px ui-monospace, Menlo, monospace";
    ctx.fillText(player.name.slice(0, 12), point.x + 16, point.y - 6);
  }
}

function drawReplayViewerEvents(ctx: CanvasRenderingContext2D, events: ReplayViewerEvent[], data: ReplayViewerData, viewport: ReturnType<typeof replayViewerContain>, mode: "building" | "unit" | "move" | "attack" | "camera") {
  const playerColor = new Map(data.players.map((player) => [player.id, player.color]));
  for (const event of events.slice(-240)) {
    if (!Number.isFinite(event.x) || !Number.isFinite(event.y)) continue;
    const point = replayViewerMapToScreen(event.x ?? 0, event.y ?? 0, viewport);
    const color = playerColor.get(event.playerId) ?? "#58a6ff";
    drawReplayViewerMarker(ctx, point.x, point.y, event.marker, color, mode);
  }
}

function drawReplayViewerMoveTrails(ctx: CanvasRenderingContext2D, data: ReplayViewerData, events: ReplayViewerEvent[], currentMs: number, viewport: ReturnType<typeof replayViewerContain>) {
  const playerColor = new Map(data.players.map((player) => [player.id, player.color]));
  const positioned = events.filter((event) => Number.isFinite(event.x) && Number.isFinite(event.y));
  const recentMoves = positioned.filter((event) => event.type === "move" && currentMs - event.timeMs <= 12000).slice(-120);

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const move of recentMoves) {
    const previous = replayViewerPreviousPosition(positioned, move);
    if (!previous) continue;
    const age = Math.max(0, currentMs - move.timeMs);
    const alpha = Math.max(0.16, 1 - age / 12000);
    const from = replayViewerMapToScreen(previous.x ?? 0, previous.y ?? 0, viewport);
    const to = replayViewerMapToScreen(move.x ?? 0, move.y ?? 0, viewport);
    const color = playerColor.get(move.playerId) ?? "#58a6ff";

    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.2;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    ctx.setLineDash([]);
    drawReplayViewerArrowHead(ctx, from.x, from.y, to.x, to.y, color);
  }

  ctx.restore();
}

function drawReplayViewerCurrentPositions(ctx: CanvasRenderingContext2D, data: ReplayViewerData, events: ReplayViewerEvent[], viewport: ReturnType<typeof replayViewerContain>) {
  const playerColor = new Map(data.players.map((player) => [player.id, player.color]));
  const latestByGroup = new Map<string, ReplayViewerCurrentPosition>();

  for (const event of events) {
    const position = replayViewerCurrentPositionFromEvent(events, event, playerColor.get(event.playerId) ?? "#58a6ff");
    if (!position) continue;
    latestByGroup.set(position.key, position);
  }

  const visiblePositions = Array.from(latestByGroup.values())
    .sort((a, b) => a.event.timeMs - b.event.timeMs)
    .slice(-18);
  const occupied = new Map<string, number>();

  for (const position of visiblePositions) {
    const point = replayViewerMapToScreen(position.event.x ?? 0, position.event.y ?? 0, viewport);
    const offset = replayViewerMarkerOffset(point.x, point.y, occupied);
    const x = point.x + offset.x;
    const y = point.y + offset.y;
    drawReplayViewerPositionHalo(ctx, x, y, position.color);
    drawReplayViewerMarker(ctx, x, y, position.marker, position.color, "unit");
    drawReplayViewerPositionLabel(ctx, x, y, position.label, position.color);
  }
}

function replayViewerCurrentPositionFromEvent(events: ReplayViewerEvent[], event: ReplayViewerEvent, color: string): ReplayViewerCurrentPosition | null {
  if (!Number.isFinite(event.x) || !Number.isFinite(event.y)) return null;
  if (event.type === "build" || event.type === "camera" || event.type === "start") return null;

  const inferred = event.marker === "move" ? replayViewerLastUnitDescriptor(events, event) : null;
  const marker = inferred?.marker ?? (event.marker === "move" ? "army" : event.marker);
  const label = replayViewerPositionGroupLabel(event, inferred?.label);
  const key = `${event.playerId}:${marker}:${label}`;
  return { key, event, marker, label, color };
}

function replayViewerLastUnitDescriptor(events: ReplayViewerEvent[], target: ReplayViewerEvent): { marker: ReplayViewerEvent["marker"]; label: string } | null {
  const index = events.findIndex((event) => event.id === target.id);
  for (let i = index - 1; i >= 0; i -= 1) {
    const event = events[i];
    if (event.playerId !== target.playerId) continue;
    if (event.marker === "worker" || event.marker === "army" || event.marker === "attack") {
      return { marker: event.marker, label: replayViewerPositionGroupLabel(event) };
    }
  }
  return null;
}

function replayViewerPositionGroupLabel(event: ReplayViewerEvent, fallback?: string) {
  const cleaned = replayViewerDisplayLabel(event.marker === "move" ? fallback ?? event.label : event.label);
  if (event.marker === "worker") return replayViewerIsWorkerLabel(cleaned) ? cleaned : "일꾼";
  if (event.marker === "attack") return cleaned ? `공격 · ${cleaned}` : "공격 명령";
  if (event.marker === "building") return cleaned || "건물";
  if (event.marker === "move") return cleaned || "이동 병력";
  if (event.marker === "army") return cleaned || "전투 유닛";
  return cleaned || "기타 명령";
}

function replayViewerDisplayLabel(value: string | null | undefined) {
  const cleaned = cleanCommandTarget(value ?? null)?.replaceAll("_", " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  return cleaned.length > 16 ? `${cleaned.slice(0, 15)}…` : cleaned;
}

function replayViewerIsWorkerLabel(label: string) {
  const raw = label.toLowerCase();
  return raw.includes("scv") || raw.includes("probe") || raw.includes("drone") || raw.includes("일꾼");
}

function replayViewerMarkerOffset(x: number, y: number, occupied: Map<string, number>) {
  const key = `${Math.round(x / 22)}:${Math.round(y / 22)}`;
  const index = occupied.get(key) ?? 0;
  occupied.set(key, index + 1);
  if (index === 0) return { x: 0, y: 0 };
  const angle = (index - 1) * 1.85;
  const radius = 18 + Math.floor(index / 6) * 8;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

function drawReplayViewerPositionHalo(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.save();
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, 28);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.32, `${color}66`);
  gradient.addColorStop(1, "rgba(4,7,11,0)");
  ctx.globalAlpha = 0.42;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawReplayViewerPositionLabel(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, color: string) {
  const text = label.slice(0, 12);
  ctx.save();
  ctx.font = "900 10px ui-monospace, Menlo, monospace";
  const width = ctx.measureText(text).width + 12;
  ctx.fillStyle = "rgba(4,7,11,0.82)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  drawCanvasPill(ctx, x - width / 2, y + 18, width, 18, 9);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(241,240,235,0.92)";
  ctx.fillText(text, x - width / 2 + 6, y + 31);
  ctx.restore();
}

function drawCanvasPill(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function replayViewerPreviousPosition(events: ReplayViewerEvent[], target: ReplayViewerEvent) {
  const index = events.findIndex((event) => event.id === target.id);
  for (let i = index - 1; i >= 0; i -= 1) {
    const event = events[i];
    if (event.playerId === target.playerId && Number.isFinite(event.x) && Number.isFinite(event.y) && target.timeMs - event.timeMs <= 25000) {
      return event;
    }
  }
  return null;
}

function drawReplayViewerArrowHead(ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, color: string) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  if (!Number.isFinite(angle)) return;
  ctx.save();
  ctx.translate(toX, toY);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(-5, -5);
  ctx.lineTo(-2, 0);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawReplayViewerMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  marker: ReplayViewerEvent["marker"],
  color: string,
  mode: "building" | "unit" | "move" | "attack" | "camera",
) {
  if (marker === "move") return;

  const markerSize = marker === "attack" ? 20 : marker === "camera" ? 20 : 18;
  const fill = marker === "attack" ? "rgba(255,109,109,0.88)" : marker === "worker" ? "rgba(73,209,154,0.9)" : marker === "building" ? "rgba(202,163,91,0.92)" : "rgba(88,166,255,0.9)";
  const stroke = marker === "attack" ? "#ff6d6d" : color;

  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = 2;
  ctx.strokeStyle = stroke;
  const portrait = ctx.createLinearGradient(-12, -12, 12, 12);
  portrait.addColorStop(0, "rgba(255,255,255,0.2)");
  portrait.addColorStop(0.38, fill);
  portrait.addColorStop(1, "rgba(4,7,11,0.86)");
  ctx.fillStyle = portrait;
  ctx.beginPath();
  ctx.arc(0, 0, markerSize / 2 + 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (marker === "worker") {
    drawWorkerMarkerIcon(ctx, fill);
  } else if (marker === "building") {
    drawBuildingMarkerIcon(ctx, fill);
  } else if (marker === "attack") {
    drawAttackMarkerIcon(ctx);
  } else if (marker === "camera") {
    drawCameraMarkerIcon(ctx, stroke);
  } else {
    drawArmyMarkerIcon(ctx, mode === "unit" ? fill : stroke);
  }

  ctx.restore();
}

function drawWorkerMarkerIcon(ctx: CanvasRenderingContext2D, fill: string) {
  ctx.fillStyle = "rgba(4,7,11,0.74)";
  ctx.beginPath();
  ctx.arc(0, 1, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(0, -4, 5, Math.PI, 0);
  ctx.lineTo(6, 1);
  ctx.lineTo(-6, 1);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(-5, 2, 10, 5);
  ctx.strokeStyle = "rgba(241,240,235,0.56)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-6, -1);
  ctx.lineTo(6, -1);
  ctx.stroke();
}

function drawArmyMarkerIcon(ctx: CanvasRenderingContext2D, fill: string) {
  ctx.fillStyle = "rgba(4,7,11,0.72)";
  ctx.fillRect(-7, -7, 14, 14);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(0, -4, 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(7, 8);
  ctx.lineTo(-7, 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(241,240,235,0.5)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-5, 2);
  ctx.lineTo(5, 2);
  ctx.stroke();
}

function drawBuildingMarkerIcon(ctx: CanvasRenderingContext2D, fill: string) {
  ctx.fillStyle = fill;
  ctx.fillRect(-6, -5, 12, 11);
  ctx.fillStyle = "rgba(4,7,11,0.72)";
  ctx.fillRect(-3, -2, 2, 2);
  ctx.fillRect(2, -2, 2, 2);
  ctx.fillRect(-1, 2, 3, 4);
}

function drawAttackMarkerIcon(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = "#ffdddd";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
  ctx.moveTo(-8, 0);
  ctx.lineTo(8, 0);
  ctx.moveTo(0, -8);
  ctx.lineTo(0, 8);
  ctx.stroke();
}

function drawCameraMarkerIcon(ctx: CanvasRenderingContext2D, stroke: string) {
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.8;
  ctx.strokeRect(-8, -5, 16, 10);
  ctx.beginPath();
  ctx.moveTo(-4, -7);
  ctx.lineTo(4, -7);
  ctx.stroke();
}

function drawMoveMarkerIcon(ctx: CanvasRenderingContext2D, stroke: string) {
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-7, 2);
  ctx.lineTo(3, 2);
  ctx.lineTo(3, -3);
  ctx.lineTo(8, 3);
  ctx.lineTo(3, 9);
  ctx.lineTo(3, 4);
  ctx.lineTo(-7, 4);
  ctx.stroke();
}

function drawReplayViewerHeatmap(ctx: CanvasRenderingContext2D, events: ReplayViewerEvent[], viewport: ReturnType<typeof replayViewerContain>) {
  for (const event of events.filter((item) => Number.isFinite(item.x) && Number.isFinite(item.y)).slice(-360)) {
    const point = replayViewerMapToScreen(event.x ?? 0, event.y ?? 0, viewport);
    const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 34);
    gradient.addColorStop(0, "rgba(202, 163, 91, 0.22)");
    gradient.addColorStop(1, "rgba(202, 163, 91, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(point.x - 34, point.y - 34, 68, 68);
  }
}

function replayViewerStateAt(data: ReplayViewerData, currentMs: number, visibleIds: Set<number>) {
  const players = new Map<number, { buildings: Map<string, number>; attackCount: number; workerCommandCount: number; armyCommandCount: number; productionCommandCount: number }>();
  for (const player of data.players) players.set(player.id, { buildings: new Map(), attackCount: 0, workerCommandCount: 0, armyCommandCount: 0, productionCommandCount: 0 });
  for (const event of data.events.slice(0, replayViewerUpperBound(data.events, currentMs))) {
    if (!visibleIds.has(event.playerId)) continue;
    const state = players.get(event.playerId);
    if (!state) continue;
    if (event.type === "build") state.buildings.set(event.label, (state.buildings.get(event.label) ?? 0) + 1);
    if (event.type === "attack") state.attackCount += 1;
    if (event.marker === "worker") state.workerCommandCount += 1;
    if (event.marker === "army") state.armyCommandCount += 1;
    if (event.type === "train") state.productionCommandCount += 1;
  }
  return { players };
}

function replayViewerCommandType(command: ReplayCommand): ReplayViewerEvent["type"] {
  const raw = `${command.category} ${command.type} ${command.details}`.toLowerCase();
  if (command.category === "building" || raw.includes("build")) return "build";
  if (command.category === "production" || raw.includes("train")) return "train";
  if (raw.includes("attack") || raw.includes("target")) return "attack";
  if (command.category === "movement" || raw.includes("right") || raw.includes("move")) return "move";
  if (raw.includes("camera") || raw.includes("minimap")) return "camera";
  if (command.category === "order") return "move";
  return "other";
}

function replayViewerMarkerType(command: ReplayCommand, type: ReplayViewerEvent["type"]): ReplayViewerEvent["marker"] {
  const raw = `${command.category} ${command.type} ${command.details} ${command.unitOrBuilding ?? ""}`.toLowerCase();
  if (type === "build") return "building";
  if (type === "attack") return "attack";
  if (type === "camera") return "camera";
  if (raw.includes("scv") || raw.includes("probe") || raw.includes("drone") || raw.includes("worker") || raw.includes("일꾼")) {
    return "worker";
  }
  if (type === "move") return "move";
  if (type === "train") return "army";
  return "other";
}

function replayViewerContain(containerWidth: number, containerHeight: number, mapPixelWidth: number, mapPixelHeight: number) {
  const scale = Math.min(containerWidth / mapPixelWidth, containerHeight / mapPixelHeight);
  const width = mapPixelWidth * scale;
  const height = mapPixelHeight * scale;
  return { scale, width, height, offsetX: (containerWidth - width) / 2, offsetY: (containerHeight - height) / 2 };
}

function replayViewerMapToScreen(x: number, y: number, viewport: ReturnType<typeof replayViewerContain>) {
  return { x: viewport.offsetX + x * viewport.scale, y: viewport.offsetY + y * viewport.scale };
}

function replayViewerUpperBound(events: ReplayViewerEvent[], currentMs: number) {
  let low = 0;
  let high = events.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (events[mid].timeMs <= currentMs) low = mid + 1;
    else high = mid;
  }
  return low;
}

function replayViewerRecent(events: ReplayViewerEvent[], currentMs: number, type: ReplayViewerEvent["type"]) {
  return events.filter((event) => event.type === type && currentMs - event.timeMs <= 45000);
}

function TacticalReplaySimulator({ result, moments }: { result: AnalyzeSuccess; players: ReplayPlayer[]; moments: CoachMoment[] }) {
  const simulation = useMemo(() => buildTacticalReplaySimulation(result, moments), [result, moments]);
  const [selectedRangeId, setSelectedRangeId] = useState<string | null>(simulation.ranges[0]?.id ?? null);
  const selectedRange = simulation.ranges.find((range) => range.id === selectedRangeId) ?? simulation.ranges[0] ?? null;
  const reviewEvents = selectedRange ? tacticalEventsForRange(simulation, selectedRange) : simulation.events.slice(0, 5);

  return (
    <section className="ai-tactical-simulator" aria-label="이번 판에서 바로 고칠 장면">
      <div className="ai-section-title">
        <span className="panel-kicker">이번 판에서 바로 고칠 장면</span>
        <h3>좌표가 아니라 행동으로 복기하기</h3>
      </div>

      <div className="ai-review-layout">
        <div className="ai-review-main">
          {selectedRange ? (
            <article className={`ai-review-focus severity-${selectedRange.severity.toLowerCase()}`}>
              <div className="ai-review-meta">
                <span>{formatDuration(selectedRange.start)}-{formatDuration(selectedRange.end)}</span>
                <strong>{selectedRange.playerName}</strong>
                <em>{selectedRange.tag}</em>
              </div>
              <h4>{selectedRange.problem}</h4>
              <div className="ai-review-coaching-grid">
                <section>
                  <span>실제로 보인 흐름</span>
                  <p>{tacticalHumanFlow(selectedRange, reviewEvents)}</p>
                </section>
                <section>
                  <span>이번 판에서 했어야 한 행동</span>
                  <p>{tacticalHadToAction(selectedRange)}</p>
                </section>
                <section>
                  <span>다음 판 체크포인트</span>
                  <p>{tacticalNextCheckpoint(selectedRange)}</p>
                </section>
              </div>
            </article>
          ) : (
            <article className="ai-review-focus">
              <div className="ai-review-meta">
                <span>전체 경기</span>
                <strong>{result.replay.map.name ?? "리플레이"}</strong>
                <em>안정</em>
              </div>
              <h4>크게 튄 문제 구간은 많지 않습니다.</h4>
              <div className="ai-review-coaching-grid">
                <section>
                  <span>실제로 보인 흐름</span>
                  <p>큰 실수보다 첫 생산, 첫 확장, 첫 진출 타이밍이 얼마나 일정했는지를 봐야 하는 경기입니다.</p>
                </section>
                <section>
                  <span>이번 판에서 했어야 한 행동</span>
                  <p>이번 판에서는 첫 교전 전에 생산, 정찰, 병력 위치를 한 번씩 확인하고 들어갔어야 했어.</p>
                </section>
                <section>
                  <span>다음 판 체크포인트</span>
                  <p>첫 6분을 30초 단위로 끊어서 생산, 정찰, 병력 이동이 모두 들어갔는지 확인하세요.</p>
                </section>
              </div>
            </article>
          )}

          <details className="ai-review-raw-details">
            <summary>근거 보기</summary>
            <div className="ai-review-event-list" aria-label="개발용 원시 명령 보기">
              <span>개발용 원시 명령 보기</span>
              {reviewEvents.length ? (
                reviewEvents.slice(0, 8).map((event, index) => (
                  <article key={`review-event-${event.id}`}>
                    <b>{index + 1}</b>
                    <div>
                      <strong>{event.timeLabel} · {event.playerName}</strong>
                      <p>{plainTacticalEventLabel(event)} · x={event.position.x}, y={event.position.y}</p>
                    </div>
                  </article>
                ))
              ) : (
                <p>이 구간에는 위치가 남은 명령이 적습니다. 그래도 시간대와 생산 공백은 리포트 기준으로 확인할 수 있습니다.</p>
              )}
            </div>
          </details>
        </div>

        <aside className="ai-review-side">
            <div className="ai-review-side-head">
            <span>다시 볼 순서</span>
            <strong>큰 문제부터 차례대로 눌러보세요</strong>
          </div>
          <div className="ai-review-range-list" aria-label="문제 구간 바로가기">
            {simulation.ranges.slice(0, 5).map((range) => (
              <button key={range.id} type="button" className={selectedRange?.id === range.id ? "is-active" : ""} onClick={() => setSelectedRangeId(range.id)}>
                <span>{formatDuration(range.start)}-{formatDuration(range.end)}</span>
                <strong>{range.problem}</strong>
                <small>{range.playerName} · {range.tag}</small>
              </button>
            ))}
            {simulation.ranges.length === 0 ? <p>우선 확인할 문제 구간이 적습니다.</p> : null}
          </div>
        </aside>
      </div>
    </section>
  );
}

function CoachVisualPanel({ result, players, coach }: { result: AnalyzeSuccess; players: ReplayPlayer[]; coach: ReturnType<typeof buildCoachInsights> }) {
  return (
    <section className="ai-coach-visual-panel">
      <div className="ai-section-title">
        <span className="panel-kicker">운영 리듬</span>
        <h3>생산, 교전, 화면 전환이 끊긴 흐름 보기</h3>
      </div>
      <RhythmGuide />
      <div className="ai-coach-visual-grid">
        <ApmEapmChart result={result} players={players} />
        <MacroMicroChart profiles={coach.profiles} />
        <TimingHeatmap moments={coach.moments} />
      </div>
    </section>
  );
}

function RhythmGuide() {
  return (
    <aside className="ai-term-guide" aria-label="운영 리듬 설명">
      <section>
        <span>생산 공백</span>
        <strong>병력이 늦게 나오는 구간입니다</strong>
        <p>전투를 보느라 생산 건물을 놓쳤는지, 정찰 직후 다음 유닛 예약이 늦었는지를 확인하는 근거입니다.</p>
      </section>
      <section>
        <span>교전 리듬</span>
        <strong>싸우기 전 자리를 잡았는지 봅니다</strong>
        <p>공격, 후퇴, 생산 중 첫 행동이 늦으면 병력이 있어도 싸움이 흐트러집니다.</p>
      </section>
      <section>
        <span>다음 행동 지연</span>
        <strong>화면 이동 뒤 무엇을 했는지 봅니다</strong>
        <p>화면을 옮긴 뒤 생산, 수비 위치, 정찰 확인 중 무엇을 먼저 했어야 했는지를 찾습니다.</p>
      </section>
    </aside>
  );
}

function ApmEapmChart({ result, players }: { result: AnalyzeSuccess; players: ReplayPlayer[] }) {
  const maxValue = Math.max(
    1,
    ...result.timeline.flatMap((point) => [point.apm, point.eapm]),
    ...players.flatMap((player) => [player.apm ?? 0, player.eapm ?? 0]),
  );
  return (
    <article className="ai-visual-card ai-apm-visual">
      <div className="ai-visual-card-head">
        <span>입력 리듬</span>
        <strong>명령이 많았던 시간보다 다음 행동이 이어졌는지 보기</strong>
      </div>
      <div className="ai-visual-legend">
        <span className="apm">전체 입력 참고</span>
        <span className="eapm">흐름을 바꾼 입력</span>
      </div>
      <div className="ai-player-chart-list">
        {players.map((player) => {
          const points = timelinePointsForPlayer(result, player).slice(0, 10);
          return (
            <section key={player.id} className="ai-player-chart">
              <div className="ai-player-chart-head">
                <strong>{player.name}</strong>
                <span>{player.apm ?? "?"} / {player.eapm ?? "?"}</span>
              </div>
              <div className="ai-chart-bars">
                {points.map((point) => (
                  <span key={`${player.id}-${point.startSeconds}`} title={`${formatDuration(point.startSeconds)}-${formatDuration(point.endSeconds)} 전체 입력 ${point.apm} / 흐름을 바꾼 입력 ${point.eapm}`}>
                    <i className="apm" style={{ height: barHeight(point.apm, maxValue) }} />
                    <i className="eapm" style={{ height: barHeight(point.eapm, maxValue) }} />
                  </span>
                ))}
              </div>
              <small>{points[0] ? `${formatDuration(points[0].startSeconds)}-${formatDuration(points[points.length - 1].endSeconds)} · 파란색은 전체 입력 참고, 금색은 흐름을 바꾼 입력` : "구간 데이터 없음"}</small>
            </section>
          );
        })}
      </div>
    </article>
  );
}

function MacroMicroChart({ profiles }: { profiles: MacroMicroProfile[] }) {
  return (
    <article className="ai-visual-card ai-macro-visual">
      <div className="ai-visual-card-head">
        <span>플레이 습관</span>
        <strong>생산, 전투, 단축키가 어느 쪽에 몰렸는지</strong>
      </div>
      <div className="ai-macro-stack-list">
        {profiles.map((profile) => {
          const total = Math.max(1, profile.macro + profile.micro + profile.hotkey + profile.other);
          const macroShare = share(profile.macro, total);
          const microShare = share(profile.micro, total);
          const hotkeyShare = share(profile.hotkey, total);
          const otherShare = Math.max(0, 100 - macroShare - microShare - hotkeyShare);
          return (
            <section key={profile.playerName} className="ai-macro-row">
              <div>
                <strong>{profile.playerName}</strong>
                <span>MT {profile.multitaskingScore}</span>
              </div>
              <div className="ai-macro-split" aria-label={`${profile.playerName} 명령 비율`}>
                <i className="macro" style={{ width: `${macroShare}%` }} />
                <i className="micro" style={{ width: `${microShare}%` }} />
                <i className="hotkey" style={{ width: `${hotkeyShare}%` }} />
                <i className="other" style={{ width: `${otherShare}%` }} />
              </div>
              <small>Macro {macroShare}% · Micro {microShare}% · Hotkey {hotkeyShare}%</small>
            </section>
          );
        })}
      </div>
    </article>
  );
}

function TimingHeatmap({ moments }: { moments: CoachMoment[] }) {
  const visibleMoments = moments.filter((moment) => moment.severity !== "INFO").slice(0, 8);
  return (
    <article className="ai-visual-card ai-timing-visual">
      <div className="ai-visual-card-head">
        <span>다시 볼 시간대</span>
        <strong>흐름이 흔들린 장면</strong>
      </div>
      <div className="ai-timing-heatmap">
        {visibleMoments.length > 0 ? (
          visibleMoments.map((moment) => (
            <span key={moment.id} className={`severity-${moment.severity.toLowerCase()}`}>
              <strong>{moment.timeLabel}</strong>
              <small>{moment.tag}</small>
            </span>
          ))
        ) : (
          <span className="is-empty">
            <strong>우선 문제 없음</strong>
            <small>크게 흔들린 시간대는 보이지 않습니다.</small>
          </span>
        )}
      </div>
      <p>먼저 볼 장면 {visibleMoments.filter((moment) => moment.severity === "HIGH").length}개, 가볍게 확인할 장면 {visibleMoments.filter((moment) => moment.severity === "MEDIUM").length}개가 있습니다.</p>
    </article>
  );
}

function TimingOverviewGraphic({ moments, durationSeconds }: { moments: CoachMoment[]; durationSeconds: number | null }) {
  const visibleMoments = moments.filter((moment) => moment.severity !== "INFO").slice(0, 10);
  const totalSeconds = timingTotalSeconds(visibleMoments, durationSeconds);
  const highCount = visibleMoments.filter((moment) => moment.severity === "HIGH").length;
  const mediumCount = visibleMoments.filter((moment) => moment.severity === "MEDIUM").length;
  const firstMoment = [...visibleMoments].sort((a, b) => momentBounds(a, totalSeconds).start - momentBounds(b, totalSeconds).start)[0];
  return (
    <div className="ai-timing-overview" aria-label="경기 시간대별 문제 구간 요약">
      <div className="ai-timing-overview-head">
        <div>
          <span>경기 흐름 지도</span>
          <strong>흐름이 끊긴 시간이 경기 어디쯤인지</strong>
        </div>
        <p>빨간 구간은 먼저 다시 볼 장면, 금색 구간은 습관을 고치면 좋아지는 장면입니다.</p>
      </div>
      <div className="ai-timing-track" aria-hidden="true">
        {visibleMoments.map((moment) => {
          const range = momentRangeStyle(moment, totalSeconds);
          return <span key={moment.id} className={`severity-${moment.severity.toLowerCase()}`} style={range} title={`${moment.timeLabel} · ${moment.tag}`} />;
        })}
      </div>
      <div className="ai-timing-scale">
        <span>00:00</span>
        <span>{formatDuration(Math.round(totalSeconds / 2))}</span>
        <span>{formatDuration(totalSeconds)}</span>
      </div>
      <div className="ai-timing-summary-grid">
        <span>
          <b>{highCount}</b>
          먼저 볼 장면
        </span>
        <span>
          <b>{mediumCount}</b>
          확인할 장면
        </span>
        <span>
          <b>{firstMoment ? firstMoment.timeLabel : "없음"}</b>
          첫 번째 장면
        </span>
      </div>
    </div>
  );
}

function MomentDiagnosticGraphic({ moment, durationSeconds }: { moment: CoachMoment; durationSeconds: number | null }) {
  const totalSeconds = timingTotalSeconds([moment], durationSeconds);
  const bounds = momentBounds(moment, totalSeconds);
  const stats = momentDiagnosticStats(moment, bounds);
  return (
    <div className="ai-moment-graphic" aria-label={`${moment.timeLabel} 그래픽 진단`}>
      <div className="ai-moment-window">
        <span className={`severity-${moment.severity.toLowerCase()}`} style={momentRangeStyle(moment, totalSeconds)} />
      </div>
      <div className="ai-moment-bars">
        {stats.map((stat) => (
          <span key={stat.label}>
            <b>{stat.label}</b>
            <i>
              <em style={{ width: `${stat.value}%` }} />
            </i>
            <strong>{stat.caption}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

function PrintableCoachReport({ result, players }: { result: AnalyzeSuccess; players: ReplayPlayer[] }) {
  const coach = buildCoachInsights(result, players);
  return (
    <article className="ai-print-report">
      <section className="ai-print-cover">
        <span>HM AI 분석툴</span>
        <h1>{result.replay.map.name ?? result.replay.gameTitle ?? "리플레이 코치 리포트"}</h1>
        <p>{formatDate(result.replay.startedAt)} · {formatDuration(result.replay.durationSeconds)} · {sourceLabel(result.replay.source)}</p>
      </section>

      <section>
        <h2>코치 총평</h2>
        <p>{coach.summary}</p>
        <div className="ai-print-grid">
          <Metric label="리포트 점수" value={coach.score} />
          <Metric label="읽은 기록" value={result.canonical.commandCount.toLocaleString("ko-KR")} />
          <Metric label="분석 상태" value={statusLabel(result.analysisRun.status)} />
          <Metric label="먼저 볼 장면" value={coach.moments.filter((moment) => moment.severity !== "INFO").length} />
        </div>
      </section>

      <section>
        <h2>상세 코치 노트</h2>
        <div className="ai-print-item">
          <strong>{coach.narrative.overall.title}</strong>
          <p>{stripCoachMarkup(coach.narrative.overall.body)}</p>
        </div>
        {coach.narrative.feedback.map((item, index) => (
          <div className="ai-print-item" key={`feedback-${item.title}-${index}`}>
            <strong>{index + 1}. {item.title}</strong>
            <p>{stripCoachMarkup(item.body)}</p>
            {item.meta ? <small>다음 판에는: {stripCoachMarkup(item.meta)}</small> : null}
          </div>
        ))}
        <div className="ai-print-item">
          <strong>{coach.narrative.strategy.title}</strong>
          <p>{stripCoachMarkup(coach.narrative.strategy.body)}</p>
        </div>
        {[...coach.narrative.strengths, ...coach.narrative.mistakes, ...coach.narrative.keyMoments, ...coach.narrative.priorities].map((item, index) => (
          <div className="ai-print-item" key={`${item.title}-${index}`}>
            <strong>{"timeLabel" in item ? `${item.timeLabel} · ${item.title}` : item.title}</strong>
            <p>{stripCoachMarkup(item.body)}</p>
            {item.meta ? <small>{item.meta}</small> : null}
          </div>
        ))}
      </section>

      <section>
        <h2>그래프로 보는 흐름</h2>
        <div className="ai-print-visuals">
          {coach.profiles.map((profile) => {
            const total = Math.max(1, profile.macro + profile.micro + profile.hotkey + profile.other);
            const macroShare = share(profile.macro, total);
            const microShare = share(profile.micro, total);
            const hotkeyShare = share(profile.hotkey, total);
            const otherShare = Math.max(0, 100 - macroShare - microShare - hotkeyShare);
            return (
              <div className="ai-print-visual-item" key={profile.playerName}>
                <strong>{profile.playerName}</strong>
                <div className="ai-print-stack">
                  <span className="macro" style={{ width: `${macroShare}%` }} />
                  <span className="micro" style={{ width: `${microShare}%` }} />
                  <span className="hotkey" style={{ width: `${hotkeyShare}%` }} />
                  <span className="other" style={{ width: `${otherShare}%` }} />
                </div>
                <small>생산 {macroShare}% · 전투/이동 {microShare}% · 단축키 {hotkeyShare}% · 전환 점수 {profile.multitaskingScore}</small>
              </div>
            );
          })}
        </div>
      </section>

      <section className="ai-print-page-break">
        <h2>시간대별 복기</h2>
        <div className="ai-print-timing-map">
          {coach.moments.slice(0, 10).map((moment) => (
            <span key={moment.id}>
              <strong>{moment.timeLabel}</strong>
              {moment.tag}
            </span>
          ))}
        </div>
        {coach.moments.map((moment) => (
          <div className="ai-print-item" key={moment.id}>
            <strong>{moment.timeLabel} · {moment.title}</strong>
            <p>{moment.detail}</p>
            <p>
              <strong>해석: </strong>
              {momentInterpretation(moment)}
            </p>
            <div className="ai-print-note-list">
              {momentCoachNotes(moment).map((note) => (
                <p key={note.label}>
                  <strong>{note.label}: </strong>
                  {note.text}
                </p>
              ))}
            </div>
            <small>{moment.playerName} · {moment.evidence}</small>
          </div>
        ))}
      </section>

      <section>
        <h2>플레이 습관</h2>
        {coach.profiles.map((profile) => (
          <div className="ai-print-item" key={profile.playerName}>
            <strong>{profile.playerName}: {profile.readout} / MT Score {profile.multitaskingScore}</strong>
            <p>{profile.summary}</p>
          </div>
        ))}
      </section>

      <section>
        <h2>다음 연습 과제</h2>
        {coach.drills.map((drill) => (
          <div className="ai-print-item" key={drill.title}>
            <strong>{drill.title}</strong>
            <p>{drill.detail}</p>
            <small>{drill.successMetric}</small>
          </div>
        ))}
      </section>

      <section>
        <h2>읽기 전에 참고할 점</h2>
        {result.analysis.cautions.map((caution) => (
          <p key={caution}>{caution}</p>
        ))}
      </section>
    </article>
  );
}

function OverviewReport({ result, players, winConditionModel }: { result: AnalyzeSuccess; players: ReplayPlayer[]; winConditionModel: WinConditionModel | null }) {
  const primaryBuilds = result.semantic.buildClassifications.filter((item) => item.confidence >= result.confidencePolicy.hideBelow);
  const readiness = [...(result.coaching.winReadiness ?? [])].sort((a, b) => b.score - a.score);
  const matches = buildWinConditionMatches(result, players, winConditionModel);
  return (
    <div className="ai-report-section">
      <div className="ai-verdict-line">
        <span>{result.replay.gameType}</span>
        <strong>{result.replay.map.name ?? "Unknown map"}</strong>
        <em>{result.replay.exactFingerprint.slice(0, 22)}</em>
      </div>
      <div className="ai-match-summary">
        {players.map((player) => (
          <article key={player.id}>
            <span>{resultLabel(player)}</span>
            <h3>{player.name}</h3>
            <p>{player.race} · Team {player.team ?? "?"}</p>
            <div>
              <strong>{player.apm ?? "unknown"}</strong>
              <small>분당 명령 수</small>
            </div>
            <div>
              <strong>{player.eapm ?? "unknown"}</strong>
              <small>분당 유효 명령 수</small>
            </div>
            <div>
              <strong>{percent(player.effectiveRate)}</strong>
              <small>실제 입력</small>
            </div>
          </article>
        ))}
      </div>
      <RhythmGuide />
      <section className="ai-overview-win-card">
        <div>
          <span className="panel-kicker">승리 조건</span>
          <h3>이긴 경기 기준과 비교</h3>
          <p>
            {readiness[0]
              ? `${readiness[0].playerName} 기준 ${readiness[0].score}점입니다. ${plainWinReadinessVerdict(readiness[0].verdict)}`
              : "최신 분석기로 다시 돌리면 이긴 경기 기준과의 비교가 표시됩니다."}
          </p>
        </div>
        <strong>{matches[0] ? `${matches[0].condition.sampleCount}개 샘플 기준` : winConditionModel ? "비교 기준 부족" : "데이터 로딩"}</strong>
      </section>
      <div className="ai-metric-grid">
        <Metric label="소스" value={sourceLabel(result.replay.source)} />
        <Metric label="분석 상태" value={statusLabel(result.analysisRun.status)} />
        <Metric label="맵 크기" value={`${result.replay.map.width ?? "?"} x ${result.replay.map.height ?? "?"}`} />
        <Metric label="읽은 기록" value={result.canonical.commandCount.toLocaleString("ko-KR")} />
        <Metric label="빌드 이벤트" value={result.canonical.buildEventCount.toLocaleString("ko-KR")} />
        <Metric label="단축키 기록" value={result.canonical.hotkeyEventCount.toLocaleString("ko-KR")} />
      </div>
      <div className="ai-analysis-grid">
        {primaryBuilds.map((item) => (
          <section key={`${item.playerId}-${item.buildCode}`}>
            <h3>{item.playerName}</h3>
            <p>
              {item.buildName}
              <small>{confidenceLabel(item.confidence)} · {item.matchup} · {benchmarkLabel(item.evidence)}</small>
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}

function BuildReport({ result }: { result: AnalyzeSuccess }) {
  return (
    <div className="ai-report-section">
      <div className="ai-classification-grid">
        {result.semantic.buildClassifications.map((item) => (
          <section key={`${item.playerId}-${item.buildCode}`}>
            <span>{statusLabel(item.status)}</span>
            <h3>{item.buildName}</h3>
            <p>{item.playerName} · {item.matchup} · {confidenceLabel(item.confidence)}</p>
            <EvidenceBlock evidence={item.evidence} />
            <div className="ai-alternatives">
              {item.alternativeBuilds.map((alternative) => (
                <small key={alternative.buildCode}>{alternative.buildName} {Math.round(alternative.confidence * 100)}%</small>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="ai-build-list">
        {result.buildOrder.slice(0, 90).map((event) => (
          <div key={event.id}>
            <span>{event.timeLabel}</span>
            <strong>{event.playerName}</strong>
            <p>{event.label}</p>
            <em>{event.category}</em>
          </div>
        ))}
        {result.buildOrder.length === 0 ? <p className="ai-help-copy">표시할 빌드 오더 데이터가 없습니다.</p> : null}
      </div>
    </div>
  );
}

function ProductionReportView({ result }: { result: AnalyzeSuccess }) {
  return (
    <div className="ai-report-section">
      <div className="ai-analysis-grid">
        {result.semantic.productionReports.map((report) => (
          <section key={report.playerId}>
            <h3>{report.playerName}</h3>
            <p>
              생산 흐름 {report.stabilityScore}점
              <small>이벤트 {report.productionEvents}개 · 공백 {report.productionGaps.length}회 · {benchmarkLabel(report.evidence)}</small>
            </p>
            <EvidenceBlock evidence={report.evidence} />
            <div className="ai-gap-list">
              {report.productionGaps.slice(0, 4).map((gap) => (
                <span key={`${gap.startSecond}-${gap.endSecond}`}>{formatDuration(gap.startSecond)} → {formatDuration(gap.endSecond)} · {gap.duration.toFixed(1)}초</span>
              ))}
              {report.productionGaps.length === 0 ? <span>길게 빈 생산 시간이 보이지 않습니다</span> : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function CommandEfficiencyView({ result, players }: { result: AnalyzeSuccess; players: ReplayPlayer[] }) {
  const maxApm = Math.max(1, ...result.timeline.map((point) => point.apm));
  return (
    <div className="ai-report-section">
      <RhythmGuide />
      {result.semantic.commandEfficiency.map((report) => (
        <section className="ai-efficiency-panel" key={report.playerId}>
          <div>
            <h3>{report.playerName}</h3>
            <p>분당 명령 수 {report.apm ?? "unknown"} · 분당 유효 명령 수 {report.eapm ?? "unknown"} · 반복된 입력 {report.repeatedCommandCandidate}개</p>
          </div>
          <div className="ai-segment-grid">
            {report.segmentEfficiency.map((segment) => (
              <span key={segment.segment}>
                <b>{segment.segment}</b>
                <strong>{percent(segment.effectiveRate)}</strong>
                <i>{formatDuration(segment.startSecond)}-{formatDuration(segment.endSecond)}</i>
              </span>
            ))}
          </div>
          <EvidenceBlock evidence={report.evidence} />
        </section>
      ))}
      {players.map((player) => {
        const points = result.timeline.filter((point) => point.playerId === player.id).slice(0, 18);
        return (
          <section className="ai-apm-track" key={player.id}>
            <h3>{player.name}</h3>
            <div>
              {points.length ? (
                points.map((point) => (
                  <span key={`${player.id}-${point.startSeconds}`} title={`${formatDuration(point.startSeconds)} 분당 명령 수 ${point.apm} / 분당 유효 명령 수 ${point.eapm}`}>
                    <i style={{ height: `${Math.max(8, (point.apm / maxApm) * 100)}%` }} />
                  </span>
                ))
              ) : (
                <p>표시할 분당 명령 수 데이터가 없습니다.</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function HotkeyReport({ result, players }: { result: AnalyzeSuccess; players: ReplayPlayer[] }) {
  return (
    <div className="ai-report-section">
      <div className="ai-analysis-grid">
        {result.semantic.hotkeyReports.map((report) => (
          <section key={report.playerId}>
            <h3>{report.playerName}</h3>
            <p>
              단축키 사용 폭 {report.breadthScore}점
              <small>사용 번호 {report.usedGroups.join(", ") || "없음"} · 편중 {report.dominantGroup ?? "none"}번 {report.dominantShare.toFixed(1)}%</small>
            </p>
            <EvidenceBlock evidence={report.evidence} />
          </section>
        ))}
      </div>
      {players.map((player) => {
        const stats = result.hotkeys.filter((item) => item.playerId === player.id);
        const maxTotal = Math.max(1, ...stats.map((item) => item.total));
        return (
          <section className="ai-hotkey-panel" key={player.id}>
            <h3>{player.name}</h3>
            {stats.map((stat) => (
              <div key={`${player.id}-${stat.group}`}>
                <span>{stat.group}번</span>
                <b style={{ width: `${(stat.total / maxTotal) * 100}%` }} />
                <strong>{stat.total}회</strong>
                <small>호출 {stat.selected} · 지정 {stat.assigned} · 추가 {stat.added} · 비율 {stat.selectShare.toFixed(1)}%</small>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}

function MultitaskingReportView({ result }: { result: AnalyzeSuccess }) {
  return (
    <div className="ai-report-section">
      <div className="ai-analysis-grid">
        {result.semantic.multitaskingReports.map((report) => {
          const flowProfile = regionSwitchProfile(result, report.playerId);
          return (
            <section className="ai-multitasking-card" key={report.playerId}>
              <h3>{report.playerName}</h3>
              <strong className="ai-region-headline">{flowProfile.headline}</strong>
              <p>
                {flowProfile.summary}
                <small>위치가 잡힌 명령 {report.positionedCommands}개 · 큰 화면 이동 {report.regionSwitchEstimate}회 · {confidenceLabel(report.confidence)}</small>
              </p>
              {flowProfile.topTransitions.length > 0 && (
                <div className="ai-region-flow-list" aria-label={`${report.playerName} 주요 지역 전환`}>
                  {flowProfile.topTransitions.map((transition) => (
                    <span key={transition.label}>
                      <b>{transition.label}</b>
                      <em>{transition.count}회 · 대표 {transition.examples.slice(0, 2).join(", ")}</em>
                    </span>
                  ))}
                </div>
              )}
              <EvidenceBlock evidence={report.evidence} />
            </section>
          );
        })}
      </div>
      <div className="ai-map-event-list">
        {result.semantic.mapEvents.slice(0, 12).map((event) => (
          <span key={event.id}>
            {event.playerName} · {event.position ? `${regionLabelForResultPoint(result, event.playerId, event.position)} · ${event.position.x}, ${event.position.y}` : "좌표 없음"} · {formatDuration(event.startSecond)}
          </span>
        ))}
      </div>
    </div>
  );
}

function EvidenceReport({ result }: { result: AnalyzeSuccess }) {
  return (
    <div className="ai-report-section">
      <div className="ai-evidence-ledger">
        <Metric label="리플레이 읽기" value={`${result.analysisRun.parserName} ${result.analysisRun.parserVersion}`} />
        <Metric label="코치 해석 버전" value={result.analysisRun.semanticEngineVersion} />
        <Metric label="판단 기준" value={result.analysisRun.rulesetVersion.replace("hm-ai-ruleset/", "")} />
        <Metric label="처리 시간" value={`${result.analysisRun.processingTimeMs}ms`} />
        <Metric label="리플레이 ID" value={result.canonical.replayId} />
        <Metric label="파일 확인값" value={result.replay.fileHash.slice(0, 18)} />
      </div>
      <div className="ai-pipeline">
        {result.pipeline.map((stage) => (
          <article key={stage.code} className={`stage-${stage.status.toLowerCase()}`}>
            <span>{stage.status}</span>
            <h3>{stage.label}</h3>
            <p>{stage.detail}</p>
          </article>
        ))}
      </div>
      <div className="ai-analysis-grid">
        {result.semantic.warnings.map((warning) => (
          <section key={warning.code}>
            <h3>{warning.code}</h3>
            <p>{warning.message}<small>{warning.severity}</small></p>
          </section>
        ))}
      </div>
      <div className="ai-analysis-grid">
        {result.analysis.sections.map((section) => (
          <section key={section.title}>
            <h3>{section.title}</h3>
            {section.items.map((item, index) => (
              <p key={`${section.title}-${index}`}>
                {item.text}
                {item.evidence ? <small>{item.evidence}</small> : null}
              </p>
            ))}
          </section>
        ))}
      </div>
      <p className="ai-help-copy">{result.analysis.cautions.join(" ")}</p>
    </div>
  );
}

function EvidenceBlock({ evidence }: { evidence: AnalysisEvidence }) {
  return (
    <div className="ai-evidence-block">
      <strong>왜 이렇게 봤나요?</strong>
      <p>{evidence.explanation}</p>
      <small>
        {confidenceLabel(evidence.confidence)} · {benchmarkLabel(evidence)}
        {evidence.frames?.length ? ` · 프레임 ${evidence.frames.slice(0, 4).join(", ")}` : ""}
      </small>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="ai-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function timelinePointsForPlayer(result: AnalyzeSuccess, player: ReplayPlayer): AnalyzeSuccess["timeline"] {
  const points = result.timeline.filter((point) => point.playerId === player.id);
  if (points.length > 0) return points;
  return [
    {
      playerId: player.id,
      playerName: player.name,
      startSeconds: 0,
      endSeconds: 60,
      apm: player.apm ?? 0,
      eapm: player.eapm ?? 0,
    },
  ];
}

function barHeight(value: number, maxValue: number) {
  if (value <= 0) return "3%";
  return `${Math.max(8, Math.round((value * 100) / Math.max(1, maxValue)))}%`;
}

function share(value: number, total: number) {
  if (value <= 0) return 0;
  return bounded(Math.round((value * 100) / Math.max(1, total)));
}

function timingTotalSeconds(moments: CoachMoment[], durationSeconds: number | null) {
  const eventMax = moments.reduce((max, moment) => {
    const [startToken, endToken] = moment.timeLabel.split("-");
    const start = secondsFromClockToken(startToken);
    const end = secondsFromClockToken(endToken);
    return Math.max(max, Number.isFinite(end) ? end : Number.isFinite(start) ? start + 45 : 0);
  }, 0);
  return Math.max(300, Math.round(durationSeconds ?? 0), eventMax + 45);
}

function momentBounds(moment: CoachMoment, totalSeconds: number) {
  const [startToken, endToken] = moment.timeLabel.split("-");
  const parsedStart = secondsFromClockToken(startToken);
  const parsedEnd = secondsFromClockToken(endToken);
  if (!Number.isFinite(parsedStart)) return { start: 0, end: totalSeconds };
  const start = Math.max(0, Math.min(totalSeconds, parsedStart));
  const fallbackEnd = start + (moment.tag === "생산 공백" ? 45 : 60);
  const end = Math.max(start + 8, Math.min(totalSeconds, Number.isFinite(parsedEnd) ? parsedEnd : fallbackEnd));
  return { start, end };
}

function momentRangeStyle(moment: CoachMoment, totalSeconds: number) {
  const bounds = momentBounds(moment, totalSeconds);
  const left = Math.max(0, Math.min(96, (bounds.start / Math.max(1, totalSeconds)) * 100));
  const rawWidth = ((bounds.end - bounds.start) / Math.max(1, totalSeconds)) * 100;
  const width = Math.max(3, Math.min(100 - left, rawWidth));
  return { left: `${left}%`, width: `${width}%` };
}

function momentDiagnosticStats(moment: CoachMoment, bounds: { start: number; end: number }) {
  const duration = Math.max(8, bounds.end - bounds.start);
  const severityScore = moment.severity === "HIGH" ? 92 : moment.severity === "MEDIUM" ? 68 : 42;
  const durationScore = bounded(Math.round(18 + Math.min(82, duration * 1.15)));
  const recoveryScore =
    moment.tag === "생산 공백" ? 88 : moment.tag === "EAPM 저하" ? 74 : moment.tag === "단축키 편중" ? 70 : 46;
  return [
    { label: "중요도", value: severityScore, caption: moment.severity === "HIGH" ? "먼저 보기" : moment.severity === "MEDIUM" ? "확인" : "참고" },
    { label: "길이", value: durationScore, caption: `${Math.round(duration)}초` },
    { label: "원인", value: recoveryScore, caption: coachProblemShortLabel(moment.tag) },
  ];
}

function momentInterpretation(moment: CoachMoment) {
  if (moment.tag === "생산 공백") {
    return "이 장면은 생산 버튼 하나가 늦은 정도로 끝나지 않습니다. 지금 생산이 비면 다음 병력 합류가 늦고, 업그레이드나 멀티 활성화도 같이 밀릴 수 있습니다. 리플레이를 볼 때는 공백이 시작되기 직전 화면을 먼저 보세요. 전투를 보고 있었는지, 정찰을 따라가고 있었는지, 병력을 이동시키느라 생산 건물 호출을 놓쳤는지가 핵심입니다.";
  }
  if (moment.tag === "EAPM 저하") {
    return "손은 바쁘게 움직였지만 실제로 경기에 도움이 된 명령은 적었던 시간입니다. 같은 부대를 다시 잡거나, 이미 이동 중인 유닛에 우클릭을 반복하거나, 교전 직전에 생산 건물을 놓치면 이런 모양이 나옵니다. 이 구간은 더 빨리 누르는 연습보다 쓸데없는 입력을 줄이는 연습이 먼저입니다.";
  }
  if (moment.tag === "단축키 편중") {
    return "한 번호에 너무 많은 역할이 몰리면 교전 중에 다시 찾고 다시 선택하는 시간이 생깁니다. 초반에는 티가 덜 나지만, 병력이 둘로 갈라지고 생산 건물이 늘어나는 순간부터 생산 확인, 견제 반응, 특수 유닛 컨트롤이 늦어질 수 있습니다. 번호마다 역할을 나눠두면 화면을 찾는 시간이 줄어듭니다.";
  }
  if (moment.tag === "화면 전환") {
    return "화면을 많이 바꿨다는 사실만으로 잘했다거나 못했다고 볼 수는 없습니다. 중요한 것은 화면을 옮긴 다음에 무엇을 했는지입니다. 본진으로 돌아왔으면 생산이 눌렸는지, 전장으로 갔으면 공격이나 후퇴 판단이 있었는지, 확장을 봤으면 일꾼이나 수비 배치가 이어졌는지를 같이 확인해야 합니다.";
  }
  return "큰 실수라기보다는 경기 리듬을 확인할 장면입니다. 같은 시간대를 다시 보면서 화면이 어디에 있었는지, 어떤 유닛을 잡고 있었는지, 생산 건물을 불렀는지만 확인해도 다음 경기에서 고칠 행동이 더 분명해집니다.";
}

function momentCoachNotes(moment: CoachMoment) {
  if (moment.tag === "생산 공백") {
    return [
      {
        label: "경기 영향",
        text: `${moment.timeLabel}에 생산이 비면 당장 화면에는 큰 문제가 없어 보여도 다음 병력 도착이 늦어집니다. 테란은 벌처·탱크 충원, 저그는 라바 사용과 드론/병력 전환, 프로토스는 게이트 회전과 업그레이드 시작이 같이 밀릴 수 있습니다.`,
      },
      {
        label: "복기 포인트",
        text: "공백이 시작된 순간보다 10초 전을 먼저 보세요. 그때 화면이 전투, 정찰, 멀티 체크, 병력 이동 중 어디에 있었는지 확인하면 왜 생산을 놓쳤는지 훨씬 잘 보입니다.",
      },
      {
        label: "다음 게임에서 해볼 것",
        text: "교전이 시작되기 직전과 끝난 직후에 생산 건물 단축키를 한 번씩 눌러보세요. 전투 컨트롤을 포기하라는 뜻이 아니라, 전투를 보면서도 1초 안에 생산 예약을 끼워 넣는 습관을 만드는 연습입니다.",
      },
    ];
  }
  if (moment.tag === "EAPM 저하") {
    return [
      {
        label: "경기 영향",
        text: `${moment.timeLabel}에는 손이 멈춘 것이 아니라 첫 판단이 경기 흐름으로 잘 이어지지 않았습니다. 이 시간에는 생산, 공격 전환, 후퇴, 업그레이드 중 무엇을 먼저 했어야 했는지 확인해야 합니다.`,
      },
      {
        label: "복기 포인트",
        text: "같은 유닛을 다시 잡았는지보다, 교전 직전에 생산 건물을 열었는지와 병력을 계속 밀지 아니면 빼야 했는지를 먼저 보세요.",
      },
      {
        label: "다음 게임에서 해볼 것",
        text: "20초만 일부러 천천히 플레이해보세요. 누르기 전에 이 입력이 공격, 후퇴, 생산, 정찰 중 무엇인지 말로 설명할 수 있을 때만 누르는 방식입니다.",
      },
    ];
  }
  if (moment.tag === "단축키 편중") {
    return [
      {
        label: "경기 영향",
        text: "단축키가 한 번호에 몰리면 중반부터 손실이 커집니다. 주병력, 견제 병력, 생산 건물, 특수 유닛이 섞이면 화면을 바꿀 때마다 다시 찾는 시간이 생기고, 그 시간이 생산 공백이나 컨트롤 누락으로 이어집니다.",
      },
      {
        label: "복기 포인트",
        text: "리플레이에서 전체 경기 기준으로 어떤 번호를 가장 자주 눌렀는지보다, 교전이 시작된 뒤에도 생산 건물 번호와 주병력 번호가 분리되어 있었는지를 봐야 합니다. 특정 번호 호출 비중이 높고 생산 공백까지 같이 보이면 단순 취향이 아니라 운영을 끊는 구조적 습관일 수 있습니다.",
      },
      {
        label: "다음 게임에서 해볼 것",
        text: "한 경기 동안 번호 역할을 고정해보세요. 예를 들어 1번 주병력, 2번 견제/수비 병력, 3번 생산 랠리 또는 앞마당 방어, 4번 특수 유닛처럼 역할을 정하고 끝까지 유지하면 화면을 찾는 시간이 줄고 교전 중에도 생산 확인이 끼어들 여지가 생깁니다.",
      },
    ];
  }
  if (moment.tag === "화면 전환") {
    return [
      {
        label: "경기 영향",
        text: "멀티태스킹은 화면을 많이 바꾸는 능력만 뜻하지 않습니다. 전장과 본진을 오가더라도 돌아온 직후 생산 예약이 없다면 그냥 바빴던 장면입니다. 반대로 전환이 적어도 전환마다 공격, 후퇴, 생산, 업그레이드 판단이 붙으면 좋은 화면 운영입니다.",
      },
      {
        label: "복기 포인트",
        text: "카드에 표시된 대표 시점으로 이동해서, 전환 직전 화면과 전환 직후 첫 명령을 같이 보세요. 전투 화면에서 본진으로 돌아왔는데 생산 건물 호출이 없었는지, 확장권역을 확인한 뒤에도 병력 배치나 일꾼 보정이 없었는지까지 봐야 실제 문제인지 판단할 수 있습니다.",
      },
      {
        label: "다음 게임에서 해볼 것",
        text: "화면 전환 횟수를 늘리려 하지 말고, 화면을 옮긴 뒤 첫 행동을 정해두세요. 본진으로 오면 생산 예약, 중앙을 보면 병력 합류 확인, 전장이나 확장을 보면 공격·후퇴·수비 배치 중 하나를 바로 결정하는 식입니다.",
      },
    ];
  }
  return [
    {
      label: "경기 영향",
      text: "크게 무너진 장면이 적다는 것은 문제가 없다는 뜻이 아닙니다. 손실이 작은 편차로 흩어져 있을 수 있습니다. 이런 경기는 한 장면의 큰 실수보다 첫 생산, 첫 테크, 첫 확장, 첫 진출이 조금씩 늦어지는지를 봐야 합니다.",
    },
    {
      label: "복기 포인트",
      text: "같은 시간대를 리플레이로 다시 보며 화면 위치, 선택 유닛, 생산 건물 호출 여부를 같이 확인하세요. 점수만 보면 안정적으로 보일 수 있지만, 실제 화면에서는 이미 다음 전환이 늦어지는 신호가 있을 수 있습니다.",
    },
    {
      label: "다음 게임에서 해볼 것",
      text: "동일 빌드를 3게임 연속 반복하면서 첫 5개 핵심 이벤트 시간을 기록해보는 것이 좋습니다. 큰 실수보다 시간 편차를 줄이는 연습을 해야 중반 운영 판단도 안정적으로 이어집니다.",
    },
  ];
}

function secondsFromClockToken(value: string | undefined) {
  if (!value) return Number.NaN;
  const parts = value.trim().split(":").map((part) => Number(part));
  if (parts.length === 2 && parts.every(Number.isFinite)) return parts[0] * 60 + parts[1];
  if (parts.length === 3 && parts.every(Number.isFinite)) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return Number.NaN;
}

function splitCoachMarkup(text: string) {
  const parts: Array<{ text: string; highlight: boolean }> = [];
  const pattern = /\[\[([^\]]+)\]\]/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) parts.push({ text: text.slice(cursor, match.index), highlight: false });
    parts.push({ text: match[1], highlight: true });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), highlight: false });
  return parts;
}

function stripCoachMarkup(text: string) {
  return text.replace(/\[\[([^\]]+)\]\]/g, "$1");
}

function coachMark(value: string | number) {
  return `[[${String(value).replace(/\]\]/g, "")}]]`;
}

function coachProblemLabel(tag: string) {
  if (tag === "EAPM 저하") return "입력 효율을 참고할 장면";
  if (tag === "생산 공백") return "생산이 끊긴 장면";
  if (tag === "단축키 편중") return "단축키 사용이 한쪽에 몰린 장면";
  if (tag === "화면 전환") return "화면 전환을 확인할 장면";
  return tag;
}

function coachProblemShortLabel(tag: string) {
  if (tag === "EAPM 저하") return "입력 효율 참고";
  if (tag === "생산 공백") return "생산 끊김";
  if (tag === "단축키 편중") return "단축키 몰림";
  if (tag === "화면 전환") return "화면 이동 확인";
  return tag;
}

function buildCoachNarrative(
  result: AnalyzeSuccess,
  players: ReplayPlayer[],
  profiles: MacroMicroProfile[],
  moments: CoachMoment[],
  drills: CoachDrill[],
  score: number,
): CoachNarrative {
  const activePlayers = players.filter((player) => !player.observer);
  const playerLine = activePlayers.map((player) => `${coachMark(player.name)} 입력 효율 참고 ${percent(player.effectiveRate)}`).join(" · ");
  const problemMoments = moments.filter((moment) => moment.severity !== "INFO");
  const firstProblem = [...problemMoments].sort((a, b) => timeValue(a.timeLabel) - timeValue(b.timeLabel))[0];
  const majorProblem = problemMoments.find((moment) => moment.severity === "HIGH") ?? firstProblem;
  const productionCount = problemMoments.filter((moment) => moment.tag === "생산 공백").length;
  const eapmCount = problemMoments.filter((moment) => moment.tag === "EAPM 저하").length;
  const hotkeyCount = problemMoments.filter((moment) => moment.tag === "단축키 편중").length;
  const classificationLine = buildClassificationLine(result);
  const openingLine = buildOpeningEvidenceLine(result);
  const flowLine = buildRegionFlowLine(result);

  const overallBody = [
    "이 리포트는 손속도보다 장면별 선택을 먼저 봅니다.",
    `보조 입력 흐름은 ${playerLine || "확인할 기록이 충분하지 않습니다"}로만 참고하고, 리포트 점수는 ${coachMark(score)}입니다.`,
    majorProblem
      ? `가장 먼저 볼 장면은 ${coachMark(`${majorProblem.timeLabel} ${coachProblemLabel(majorProblem.tag)}`)}입니다. 이 장면은 단순히 수치가 낮아서 표시된 것이 아닙니다. 그 시간에 무엇을 보고 있었는지, 생산 건물을 불렀는지, 병력을 움직인 뒤 다음 행동이 이어졌는지가 같이 드러나기 때문에 직접 다시 볼 가치가 큽니다.`
      : "크게 흔들린 장면은 많지 않습니다. 이럴 때는 승패보다 초반 빌드가 몇 초씩 늦어졌는지, 첫 진출 타이밍이 흔들렸는지, 전투 직후 생산 입력이 유지됐는지를 보면 좋습니다.",
    `이번 리포트에서는 후속 병력이 늦어진 구간 ${coachMark(`${productionCount}개`)}, 입력 효율 참고 구간 ${coachMark(`${eapmCount}개`)}, 부대지정 확인 구간 ${coachMark(`${hotkeyCount}개`)}를 보조로 잡았습니다.`,
  ].join(" ");

  const strategyBody = [
    classificationLine,
    openingLine,
    flowLine,
    "빌드는 이름보다 그 빌드가 강한 시간에 실제 교전과 운영으로 이어졌는지가 중요합니다.",
  ].join(" ");

  return {
    overall: {
      title: majorProblem ? `${majorProblem.timeLabel}부터 먼저 다시 보세요.` : "큰 실수보다 작은 시간 차이를 보는 경기입니다.",
      body: overallBody,
      meta: `리포트 점수 ${score} · 읽은 기록 ${result.canonical.commandCount.toLocaleString("ko-KR")}개`,
    },
    strategy: {
      title: "빌드가 좋은지 보려면 생산, 화면 이동, 전투 판단을 같이 봐야 합니다.",
      body: strategyBody,
      meta: `${result.analysisRun.rulesetVersion} · ${confidenceLabel(result.semantic.buildClassifications[0]?.confidence ?? 0.46)}`,
    },
    feedback: buildNarrativeFeedback(result, problemMoments),
    strengths: buildNarrativeStrengths(result, activePlayers, profiles, moments),
    mistakes: buildNarrativeMistakes(result, problemMoments),
    keyMoments: buildNarrativeKeyMoments(problemMoments),
    priorities: buildNarrativePriorities(drills, problemMoments),
  };
}

function buildNarrativeFeedback(result: AnalyzeSuccess, problemMoments: CoachMoment[]): CoachNarrativeItem[] {
  const feedback: CoachNarrativeItem[] = [];
  const productionGaps = result.semantic.productionReports
    .flatMap((report) => report.productionGaps.map((gap) => ({ ...gap, playerName: report.playerName })))
    .sort((a, b) => b.duration - a.duration);

  for (const gap of productionGaps.slice(0, 2)) {
    feedback.push({
      title: `${formatDuration(gap.startSecond)}-${formatDuration(gap.endSecond)} 생산이 멈춰 후속 병력이 늦었습니다`,
      body: `${coachMark(Math.round(gap.duration).toString())}초 동안 후속 병력과 테크가 늦었습니다. 이 구간은 교전 전에 병력을 더 채웠어야 했는지 확인하세요.`,
      meta: `다음 판에는 ${coachMark(formatDuration(Math.max(0, gap.startSecond - 10)))}부터 생산 예약을 먼저 넣고 교전을 보세요.`,
      tone: "mistake",
    });
  }

  const uncertainBuilds = result.semantic.buildClassifications
    .filter((classification) => classification.confidence < 0.68)
    .slice(0, 2);
  for (const build of uncertainBuilds) {
    feedback.push({
      title: `${build.playerName}의 초반 빌드 의도가 기록상 뚜렷하지 않습니다`,
      body: `${coachMark(build.buildName)} 후보로 읽힙니다. 초반 선택이 중반 교전 계획으로 이어졌는지만 확인하세요.`,
      meta: "다음 판에는 첫 생산, 첫 테크, 첫 진출 기준점을 정하고 같은 빌드를 반복하세요.",
      tone: "mistake",
    });
  }

  const hotkeyIssues = result.semantic.hotkeyReports
    .filter((report) => report.dominantShare >= 58 || report.usedGroups.length <= 2)
    .sort((a, b) => b.dominantShare - a.dominantShare)
    .slice(0, 2);
  for (const report of hotkeyIssues) {
    feedback.push({
      title: `${report.playerName}는 부대지정이 한쪽에 몰려 조작이 꼬일 수 있습니다`,
      body: `번호 역할이 섞이면 교전 중 유닛을 다시 찾는 시간이 생깁니다. 주 병력과 보조 병력을 나눠 두세요.`,
      meta: "다음 판에는 1번 주병력, 2번 보조 병력, 3번 생산 확인처럼 역할을 고정하세요.",
      tone: "mistake",
    });
  }

  const concreteFeedbackCount = feedback.length;
  const eapmMoments = problemMoments.filter((moment) => moment.tag === "EAPM 저하").slice(0, concreteFeedbackCount >= 2 ? 1 : 2);
  for (const moment of eapmMoments) {
    feedback.push({
      title: `${moment.timeLabel} 입력 효율 참고`,
      body: "이 구간은 손속도 평가가 아니라, 교전 중 첫 명령이 공격·후퇴·생산 중 무엇이었는지 확인하는 보조 지표입니다.",
      meta: "다음 판에는 같은 장면에서 먼저 공격할지, 빠질지, 생산을 누를지 하나만 정하세요.",
      tone: "mistake",
    });
  }

  if (feedback.length > 0) return feedback.slice(0, 3);

  return [
    {
      title: "크게 못한 장면은 적지만 초반 기준점을 더 엄격하게 봐야 합니다",
      body: "큰 실수보다 첫 생산, 첫 테크, 첫 진출 기준점이 일정했는지 확인하세요.",
      meta: "다음 판에는 같은 빌드를 3번 반복하며 첫 5분 기준점을 맞추세요.",
      tone: "mistake",
    },
  ];
}

function buildClassificationLine(result: AnalyzeSuccess) {
  const classifications = result.semantic.buildClassifications.slice(0, 4);
  if (!classifications.length) {
    return "빌드 이름을 확실히 말할 만큼 초반 기록이 충분하지 않습니다. 이럴 때는 첫 생산, 첫 테크, 첫 확장, 첫 진출 시간이 얼마나 늦었는지 직접 비교하는 편이 더 정확합니다.";
  }
  const line = classifications
    .map((classification) => `${coachMark(`${classification.playerName} · ${classification.buildName}`)} (${confidenceLabel(classification.confidence)})`)
    .join(" / ");
  return `빌드는 ${line} 흐름으로 읽힙니다. 중요한 것은 빌드 이름보다 이 빌드가 어느 시간대에 강해야 하는지입니다.`;
}

function buildOpeningEvidenceLine(result: AnalyzeSuccess) {
  const earlyEvents = result.buildOrder.slice(0, 6);
  if (!earlyEvents.length) {
    return "초반 기록이 충분하지 않아 오프닝 완성도는 리플레이 화면으로 한 번 더 확인하는 편이 좋습니다.";
  }
  const evidence = earlyEvents.map((event) => coachMark(`${event.playerName} ${formatDuration(event.timeSeconds)} ${event.label}`)).join(", ");
  return `초반에는 ${evidence} 순서가 보입니다. 여기서는 “무엇을 지었나”보다 그 직후 생산과 정찰이 끊기지 않았는지를 같이 보는 것이 중요합니다.`;
}

function buildRegionFlowLine(result: AnalyzeSuccess) {
  const report = result.semantic.multitaskingReports.find((item) => item.positionedCommands > 0);
  if (!report) return "화면 이동을 볼 수 있는 기록이 적습니다. 이 경우 화면 전환보다 생산 공백과 단축키 사용을 먼저 확인하세요.";
  const profile = regionSwitchProfile(result, report.playerId);
  return `화면 이동은 ${coachMark(`${report.playerName} · ${profile.headline}`)} 흐름이 먼저 보입니다. ${profile.summary}`;
}

function buildNarrativeStrengths(result: AnalyzeSuccess, players: ReplayPlayer[], profiles: MacroMicroProfile[], moments: CoachMoment[]) {
  const strengths: CoachNarrativeItem[] = [];
  const bestEffective = [...players].sort((a, b) => (b.effectiveRate ?? 0) - (a.effectiveRate ?? 0))[0];
  if (bestEffective) {
    strengths.push({
      title: "많이 누른 만큼 실제로 도움이 된 입력도 남았습니다.",
      body: `${coachMark(bestEffective.name)}는 분당 명령 수 ${bestEffective.apm ?? "?"}, 분당 유효 명령 수 ${bestEffective.eapm ?? "?"}, 유효 명령 비율 ${coachMark(percent(bestEffective.effectiveRate))}로 기록됐습니다. 이 수치가 높다는 것은 단순히 손이 빠른 것보다 생산, 이동, 공격처럼 경기 흐름을 바꾸는 입력이 잘 섞였다는 뜻입니다. 다음 단계는 이 흐름을 교전 중에도 유지하는 것입니다.`,
      meta: "분당 명령 수 / 유효 명령 비율",
      tone: "strength",
    });
  }

  const bestProfile = [...profiles].sort((a, b) => b.multitaskingScore - a.multitaskingScore)[0];
  if (bestProfile) {
    strengths.push({
      title: "어떤 습관부터 고칠지 볼 수 있는 기록이 충분합니다.",
      body: `${coachMark(bestProfile.playerName)}의 입력은 생산 ${bestProfile.macroShare}%, 전투/이동 ${bestProfile.microShare}%, 화면 전환 점수 ${coachMark(bestProfile.multitaskingScore)}로 보입니다. 생산 비중이 낮으면 전투 중 생산 호출을, 전투/이동 비중이 낮으면 병력 움직임과 교전 입력을, 단축키가 치우치면 번호 역할 분리를 먼저 보면 됩니다.`,
      meta: "생산 / 전투 / 단축키 흐름",
      tone: "strength",
    });
  }

  const earlyEvents = result.buildOrder.slice(0, 3);
  if (earlyEvents.length > 0) {
    strengths.push({
      title: "초반 빌드 기준점이 잡혀 복기 출발점이 분명합니다.",
      body: `초반에는 ${earlyEvents.map((event) => coachMark(`${formatDuration(event.timeSeconds)} ${event.label}`)).join(", ")} 흐름이 보입니다. 이 기준점이 있으면 “느낌상 늦었다”가 아니라 첫 생산, 첫 테크, 첫 확장, 첫 진출이 실제로 몇 초 흔들렸는지 볼 수 있습니다.`,
      meta: "초반 빌드 흐름",
      tone: "strength",
    });
  }

  if (!strengths.length) {
    strengths.push({
      title: "크게 흔들린 장면이 적은 안정적인 리플레이입니다.",
      body: "바로 크게 지적할 장면은 많지 않습니다. 이 경우에는 큰 실수를 찾기보다 같은 빌드를 3게임 연속 비슷한 시간으로 재현하는 쪽이 더 좋은 연습이 됩니다.",
      tone: "strength",
    });
  }

  const positiveInfo = moments.find((moment) => moment.tag === "화면 전환");
  if (positiveInfo && strengths.length < 4) {
    strengths.push({
      title: "화면을 어디로 옮겼는지 복기할 수 있습니다.",
      body: `${positiveInfo.detail} 이 항목은 화면을 많이 바꿨다고 칭찬하는 점수가 아닙니다. 화면을 옮긴 직후 생산, 공격, 정찰이 실제로 이어졌는지 확인하기 위한 복기용 표시입니다.`,
      meta: positiveInfo.evidence,
      tone: "strength",
    });
  }

  return strengths.slice(0, 4);
}

function buildNarrativeMistakes(result: AnalyzeSuccess, problemMoments: CoachMoment[]) {
  const mistakes = problemMoments.slice(0, 4).map((moment) => ({
    title: `${moment.timeLabel} · ${coachProblemShortLabel(moment.tag)}`,
    body: `${coachMark(moment.title)}. ${moment.detail} 이 장면은 숫자만 보고 넘기면 안 됩니다. 해당 시간대 10초 전부터 다시 보면서 화면 위치, 선택한 유닛, 생산 건물 호출 여부, 첫 번째로 도움이 된 명령이 무엇이었는지 확인해야 실제 원인이 보입니다.`,
    meta: `${moment.playerName} · ${moment.evidence}`,
    tone: "mistake" as const,
  }));

  if (mistakes.length > 0) return mistakes;

  return [
    {
      title: "크게 흔들린 실수는 많지 않습니다.",
      body: `이번 리플레이에서는 큰 생산 공백이나 손속도 흐름이 무너진 장면이 많이 보이지 않습니다. 대신 ${coachMark(result.canonical.commandCount.toLocaleString("ko-KR"))}개 기록을 기준으로 초반 5개 빌드 타이밍, 단축키 역할 분리, 전투 직후 생산 입력이 유지됐는지를 더 세밀하게 보면 좋습니다.`,
      meta: "큰 실수보다 작은 시간 차이를 확인하세요",
      tone: "mistake" as const,
    },
  ];
}

function buildNarrativeKeyMoments(problemMoments: CoachMoment[]) {
  const source = problemMoments.length > 0 ? problemMoments : [];
  const keyMoments = source.slice(0, 5).map((moment) => ({
    title: `${severityLabel(moment.severity)} · ${coachProblemShortLabel(moment.tag)}`,
    timeLabel: moment.timeLabel,
    severity: moment.severity,
    body: `${coachMark(moment.title)}. ${momentInterpretation(moment)} 다음 복기에서는 이 장면을 0.5배속으로 보고, 화면이 바뀐 직후 첫 명령이 생산, 공격, 후퇴, 정찰 중 무엇이었는지 적어보세요.`,
    meta: `${moment.playerName} · ${moment.evidence}`,
    tone: "neutral" as const,
  }));

  if (keyMoments.length > 0) return keyMoments;

  return [
    {
      title: "안정적인 경기 흐름",
      timeLabel: "전체 경기",
      severity: "INFO" as CoachSeverity,
      body: "크게 흔들린 시간이 적다면 핵심은 특정 실수보다 반복 가능한 오프닝 기준점입니다. 첫 생산, 첫 테크, 첫 확장, 첫 진출 타이밍을 다음 리플레이와 비교해서 5초 이상 흔들린 지점을 찾아보세요.",
      meta: "오프닝 기준점 확인",
      tone: "neutral" as const,
    },
  ];
}

function buildNarrativePriorities(drills: CoachDrill[], problemMoments: CoachMoment[]) {
  const priorities = drills.slice(0, 4).map((drill) => ({
    title: drill.title,
    body: `${drill.detail} 한 번만 해보고 끝내기보다 다음 3게임 동안 같은 기준으로 반복해보세요. 성공 기준은 ${coachMark(drill.successMetric)}입니다.`,
    meta: drill.successMetric,
    tone: "priority" as const,
  }));

  if (priorities.length > 0) return priorities;

  const firstProblem = problemMoments[0];
  return [
    {
      title: "리플레이 시간대 고정 복기",
      body: firstProblem
        ? `${coachMark(firstProblem.timeLabel)}부터 다시 보면서 장면 10초 전 화면과 장면 직후 첫 명령을 기록하세요. 같은 장면을 3번 보면 원인이 손속도인지, 화면 위치인지, 단축키 습관인지 분리됩니다.`
        : "첫 6분을 30초 단위로 멈춰 보며 생산, 정찰, 병력 이동, 단축키 호출이 모두 한 번씩 들어갔는지 체크하세요.",
      meta: "고정 시간 복기",
      tone: "priority" as const,
    },
  ];
}

function severityLabel(severity: CoachSeverity | string) {
  if (severity === "critical") return "치명";
  if (severity === "major") return "중요";
  if (severity === "minor") return "확인";
  if (severity === "positive") return "잘한 점";
  if (severity === "HIGH") return "먼저 보기";
  if (severity === "MEDIUM") return "확인";
  return "참고";
}

function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    scouting: "정찰",
    production: "생산",
    economy: "운영",
    engagement: "교전",
    build: "빌드",
    control: "조작",
    strategy: "전략",
  };
  return labels[category] ?? category;
}

function formatMsLabel(value: number) {
  return formatDuration(value / 1000);
}

function conciseText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function isMetricOnlyMoment(moment: CoachMoment) {
  return isMetricOnlyText(`${moment.tag} ${moment.title} ${moment.detail}`);
}

function isMetricOnlyFinding(finding: CoachFinding) {
  if (["control", "hotkey"].includes(finding.category)) return true;
  return isMetricOnlyText(`${finding.category} ${finding.title} ${finding.summary} ${finding.whyItMatters} ${finding.nextAction}`);
}

function isMetricOnlyText(value: string) {
  const text = value.toLowerCase();
  return (
    text.includes("eapm") ||
    text.includes("apm") ||
    text.includes("클릭") ||
    text.includes("마우스") ||
    text.includes("유효 명령") ||
    text.includes("도움 된 명령") ||
    text.includes("부대지정") ||
    text.includes("hotkey")
  );
}

function regionSwitchProfile(result: AnalyzeSuccess, playerId: number) {
  const commands = positionedReplayCommands(result, playerId);
  if (commands.length < 2) {
    return {
      headline: "화면 이동 기록이 적습니다",
      summary: "위치가 남은 명령이 적어서 본진, 중앙, 전장 중 어디를 오갔는지 안정적으로 보기 어렵습니다. 이 경우 화면 전환보다 생산 공백과 단축키 사용을 먼저 보는 편이 좋습니다.",
      topTransitions: [] as RegionSwitchTransition[],
      evidenceLabel: "화면 이동 기록 부족",
    };
  }

  const homeCenter = averagePoint(commands.slice(0, Math.min(24, commands.length)).map((command) => command.position));
  const maxDistance = Math.max(1, ...commands.map((command) => pointDistance(homeCenter, command.position)));
  const transitionMap = new Map<string, RegionSwitchTransition>();

  for (let index = 1; index < commands.length; index += 1) {
    const previous = commands[index - 1];
    const current = commands[index];
    if (pointDistance(previous.position, current.position) < 48) continue;
    const from = regionLabelFromPoint(previous.position, homeCenter, maxDistance);
    const to = regionLabelFromPoint(current.position, homeCenter, maxDistance);
    const label = from === to ? `${from} 내부 장거리 이동` : `${from} → ${to}`;
    const transition = transitionMap.get(label) ?? { label, count: 0, examples: [] };
    transition.count += 1;
    if (transition.examples.length < 3) {
      transition.examples.push(`${formatDuration(previous.timeSeconds)}-${formatDuration(current.timeSeconds)}`);
    }
    transitionMap.set(label, transition);
  }

  const topTransitions = [...transitionMap.values()].sort((a, b) => b.count - a.count).slice(0, 3);
  const primary = topTransitions[0];
  if (!primary) {
    return {
      headline: "큰 거리 전환은 제한적",
      summary: "위치가 잡힌 명령은 있지만 화면이 크게 이동한 장면은 많지 않습니다. 이 경우 화면 전환 횟수보다 생산 공백과 단축키 역할 분리를 먼저 보는 편이 좋습니다.",
      topTransitions,
      evidenceLabel: "큰 화면 이동 적음",
    };
  }

  const examples = primary.examples.join(", ");
  return {
    headline: `${primary.label}이 가장 많이 잡힘`,
    summary: `가장 많이 반복된 흐름은 ${primary.label}이고 ${primary.count}회 보입니다. 대표 시점은 ${examples}입니다. ${regionSwitchCoachContext(primary.label)}`,
    topTransitions,
    evidenceLabel: `${primary.label} ${primary.count}회`,
  };
}

function positionedReplayCommands(result: AnalyzeSuccess, playerId: number) {
  return result.commands
    .filter((command): command is ReplayCommand & { position: { x: number; y: number } } => (
      command.playerId === playerId &&
      command.position !== null &&
      Number.isFinite(command.position.x) &&
      Number.isFinite(command.position.y)
    ))
    .sort((a, b) => a.timeSeconds - b.timeSeconds);
}

function buildTacticalReplaySimulation(result: AnalyzeSuccess, moments: CoachMoment[]): TacticalReplaySimulation {
  const commandEvents = result.commands
    .filter((command): command is ReplayCommand & { position: { x: number; y: number } } => (
      command.position !== null &&
      Number.isFinite(command.position.x) &&
      Number.isFinite(command.position.y) &&
      isMapMeaningfulCommand(command)
    ))
    .map((command) => ({
      id: `command-${command.index}`,
      playerId: command.playerId,
      playerName: command.playerName,
      timeSeconds: command.timeSeconds,
      timeLabel: command.timeLabel,
      category: command.category,
      label: tacticalCommandLabel(command),
      position: command.position,
      effective: command.effective,
    }));

  const semanticEvents = result.semantic.mapEvents
    .filter((event): event is (typeof event) & { position: { x: number; y: number } } => (
      event.position !== null &&
      Number.isFinite(event.position.x) &&
      Number.isFinite(event.position.y)
    ))
    .map((event) => ({
      id: `map-${event.id}`,
      playerId: event.playerId,
      playerName: event.playerName,
      timeSeconds: event.startSecond,
      timeLabel: formatDuration(event.startSecond),
      category: event.eventType,
      label: tacticalEventTypeLabel(event.eventType),
      position: event.position,
      effective: event.confidence >= 0.5,
    }));

  const mergedEvents = [...commandEvents, ...semanticEvents].sort((a, b) => a.timeSeconds - b.timeSeconds);
  const sampleStep = Math.max(1, Math.ceil(mergedEvents.length / 520));
  const events = mergedEvents.filter((event, index) => index % sampleStep === 0 || isHighValueTacticalEvent(event)).slice(0, 620);

  const ranges = moments
    .filter((moment) => moment.severity !== "INFO" && hasConcreteTimeRange(moment.timeLabel))
    .map((moment) => {
      const bounds = momentBounds(moment, timingTotalSeconds(moments, result.replay.durationSeconds));
      const copy = plainReviewCopy(moment);
      return {
        id: `range-${moment.id}`,
        start: bounds.start,
        end: bounds.end,
        label: `${moment.timeLabel} · ${moment.playerName} · ${moment.tag}`,
        severity: moment.severity,
        playerName: moment.playerName,
        tag: moment.tag,
        problem: copy.problem,
        reason: copy.reason,
        reviewPoint: copy.reviewPoint,
        fixPoint: copy.fixPoint,
      };
    })
    .sort((a, b) => a.start - b.start);

  return {
    events,
    ranges,
  };
}

function isMapMeaningfulCommand(command: ReplayCommand) {
  const raw = `${command.category} ${command.type} ${command.details} ${command.unitOrBuilding ?? ""}`.toLowerCase();
  if (raw.includes("selection") || raw.includes("hotkey")) return false;
  if (raw.includes("select") && !raw.includes("attack")) return false;
  if (raw.includes("cancel")) return false;
  return command.effective || raw.includes("move") || raw.includes("attack") || raw.includes("build") || raw.includes("train") || raw.includes("morph") || raw.includes("right");
}

function hasConcreteTimeRange(timeLabel: string) {
  const [startToken, endToken] = timeLabel.split("-");
  return Number.isFinite(secondsFromClockToken(startToken)) && Number.isFinite(secondsFromClockToken(endToken));
}

function plainReviewCopy(moment: CoachMoment) {
  if (moment.tag.includes("생산")) {
    return {
      problem: "생산이 잠시 멈춰 병력이 늦게 나왔습니다.",
      reason: "이 시간에는 새 유닛, 건물, 업그레이드 명령 사이가 길게 비었습니다. 한 번만 비어도 다음 교전에서 병력 수가 줄고, 멀티 활성화도 늦어질 수 있습니다.",
      reviewPoint: "이 구간 10초 전부터 보세요. 화면이 전투나 정찰에 가 있는 동안 생산 건물 단축키를 눌렀는지 확인하면 원인이 보입니다.",
      fixPoint: "교전이나 정찰을 보기 전에 생산 건물 단축키를 한 번 누르고, 필요한 유닛을 미리 예약하는 습관을 만드세요.",
    };
  }

  if (moment.tag.includes("EAPM")) {
    return {
      problem: "입력 효율을 참고할 장면입니다.",
      reason: "이 구간은 손속도 평가가 아니라 첫 결정이 분명했는지 보는 보조 근거입니다.",
      reviewPoint: "이 시간대를 0.5배속으로 보면서 첫 10초 안에 공격, 후퇴, 생산 중 무엇을 먼저 선택했는지 보세요.",
      fixPoint: "다음 판에는 같은 상황에서 먼저 싸울지, 빠질지, 생산을 누를지 하나를 정하세요.",
    };
  }

  if (moment.tag.includes("단축키")) {
    return {
      problem: "부대지정이 한 번호에 몰려 조작이 꼬일 수 있습니다.",
      reason: "주병력, 생산 건물, 견제 병력이 같은 번호에 섞이면 화면을 옮길 때마다 다시 찾는 시간이 생깁니다. 교전 중 생산이 끊기는 원인이 되기 쉽습니다.",
      reviewPoint: "교전 직전과 교전 중에 어떤 번호를 반복해서 눌렀는지 보세요. 한 번호가 너무 자주 나오면 역할 분리가 부족한 신호입니다.",
      fixPoint: "1번 주병력, 2번 보조 병력, 3번 생산 또는 수비처럼 번호 역할을 정하고 한 경기 동안 유지해보세요.",
    };
  }

  return {
    problem: moment.title.replace(/\.$/, ""),
    reason: "이 구간은 다른 시간대보다 경기 흐름이 흔들린 후보입니다. 숫자만 보지 말고 화면이 어디에 있었고, 그 직후 어떤 명령을 넣었는지 같이 확인해야 합니다.",
    reviewPoint: "문제 구간 직전 10초부터 보면서 화면 위치, 선택한 유닛, 첫 번째 의미 있는 명령을 확인하세요.",
    fixPoint: "다음 게임에서는 같은 상황이 오기 전에 생산, 공격, 후퇴, 정찰 중 하나를 먼저 결정하고 입력하세요.",
  };
}

function tacticalHumanFlow(range: TacticalReplayRange, events: TacticalReplayEvent[]) {
  const nearTime = formatDuration(range.start);
  const eventTypes = events.map((event) => tacticalPlainEventKind(event));
  const movementCount = eventTypes.filter((type) => type === "이동").length;
  const productionCount = eventTypes.filter((type) => type.includes("생산") || type.includes("건설") || type.includes("테크")).length;
  const fightCount = eventTypes.filter((type) => type.includes("공격") || type.includes("교전")).length;
  const firstTarget = cleanCommandTarget(events[0]?.label.split("·")[1]?.trim() ?? null);

  if (!events.length) {
    return `${nearTime} 전후에는 좌표가 남은 명령이 적었습니다. 그래서 좌표보다 이 시간대에 생산, 수비 위치, 다음 진출이 이어졌는지를 먼저 봐야 했습니다.`;
  }

  if (productionCount >= Math.max(movementCount, fightCount)) {
    const target = firstTarget ? ` ${firstTarget}` : "";
    return `${nearTime} 전후에 ${range.playerName}의 생산/건설${target} 흐름이 보였습니다. 이 타이밍이면 상대 테크 전환이나 다음 진출 준비까지 같이 확인했어야 했습니다.`;
  }

  if (fightCount >= Math.max(movementCount, productionCount)) {
    return `${nearTime} 전후에 ${range.playerName}의 공격/교전 명령이 이어졌습니다. 이때 병력을 먼저 밀어 넣기보다 앞에서 맞아줄 유닛과 뒤에서 때릴 유닛 위치가 나뉘어 있었는지 봐야 했습니다.`;
  }

  return `${nearTime} 전후에 ${range.playerName}의 병력이 한 방향으로 빠지는 흐름이 보였습니다. 이때 본진/앞마당 방어 병력이 남아 있었는지, 이동 뒤 다음 생산이 바로 이어졌는지 확인해야 했습니다.`;
}

function tacticalHadToAction(range: TacticalReplayRange) {
  if (range.tag.includes("생산")) {
    return `이번 판에서는 ${formatDuration(range.start)}에 화면이 다른 곳으로 가기 전에 생산 건물 단축키를 먼저 열고 필요한 유닛을 예약했어야 했어.`;
  }
  if (range.tag.includes("EAPM")) {
    return `이번 판에서는 ${formatDuration(range.start)}에 더 빨리 누르기보다 공격, 후퇴, 생산 중 무엇을 먼저 할지 정하고 입력했어야 했어.`;
  }
  if (range.tag.includes("단축키")) {
    return `이번 판에서는 ${formatDuration(range.start)} 전에 주병력, 수비 병력, 생산 건물 번호를 나눠서 교전 중 다시 찾는 시간을 줄였어야 했어.`;
  }
  return `이번 판에서는 ${formatDuration(range.start)}에 병력을 움직이기 전에 생산, 수비 위치, 교전 시작 순서를 먼저 정했어야 했어.`;
}

function tacticalNextCheckpoint(range: TacticalReplayRange) {
  if (range.tag.includes("생산")) {
    return "다음 판에는 전투 화면을 보기 전 생산 건물 단축키를 한 번 누르고, 병력 예약 후 교전 화면으로 돌아가세요.";
  }
  if (range.tag.includes("EAPM")) {
    return "다음 판에는 같은 상황에서 첫 입력을 넣기 전에 공격/후퇴/생산 중 하나를 말로 정하고 누르세요.";
  }
  if (range.tag.includes("단축키")) {
    return "다음 판에는 1번 주병력, 2번 보조 병력, 3번 생산처럼 번호 역할을 정하고 한 경기 동안 유지하세요.";
  }
  return range.fixPoint;
}

function tacticalEventsForRange(simulation: TacticalReplaySimulation, range: TacticalReplayRange) {
  const margin = 20;
  const events = simulation.events
    .filter((event) => event.timeSeconds >= range.start - margin && event.timeSeconds <= range.end + margin)
    .sort((a, b) => a.timeSeconds - b.timeSeconds);
  if (events.length) return events.slice(0, 10);
  return simulation.events
    .filter((event) => Math.abs(event.timeSeconds - range.start) <= 90)
    .sort((a, b) => Math.abs(a.timeSeconds - range.start) - Math.abs(b.timeSeconds - range.start))
    .slice(0, 6)
    .sort((a, b) => a.timeSeconds - b.timeSeconds);
}

function plainTacticalEventLabel(event: TacticalReplayEvent) {
  const kind = tacticalPlainEventKind(event);
  const target = cleanCommandTarget(event.label.split("·")[1]?.trim() ?? null);
  if (target) return `${kind}: ${target}`;
  return kind;
}

function tacticalPlainEventKind(event: TacticalReplayEvent) {
  const raw = `${event.category} ${event.label}`.toLowerCase();
  if (raw.includes("build") || raw.includes("production") || raw.includes("생산") || raw.includes("건설")) return "생산 또는 건설";
  if (raw.includes("attack") || raw.includes("combat") || raw.includes("공격") || raw.includes("교전")) return "공격 또는 교전";
  if (raw.includes("scout") || raw.includes("정찰")) return "정찰";
  if (raw.includes("upgrade") || raw.includes("tech") || raw.includes("테크")) return "업그레이드 또는 테크";
  return "이동";
}

function isHighValueTacticalEvent(event: TacticalReplayEvent) {
  const raw = `${event.category} ${event.label}`.toLowerCase();
  return event.effective || raw.includes("build") || raw.includes("attack") || raw.includes("production") || raw.includes("combat");
}

function tacticalCommandLabel(command: ReplayCommand) {
  const target = cleanCommandTarget(command.unitOrBuilding) ?? cleanCommandTarget(command.details);
  const category = tacticalEventTypeLabel(command.category || command.type);
  if (target && target !== command.type) return `${category} · ${target}`;
  return category;
}

function cleanCommandTarget(value: string | null) {
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized) return null;
  if (["none", "unknown", "null", "undefined", "-"].includes(normalized.toLowerCase())) return null;
  return normalized;
}

function tacticalEventTypeLabel(value: string) {
  const raw = value.toLowerCase();
  if (raw.includes("build") || raw.includes("production")) return "생산/건설";
  if (raw.includes("attack") || raw.includes("combat")) return "공격/교전";
  if (raw.includes("move") || raw.includes("right")) return "이동";
  if (raw.includes("scout")) return "정찰";
  if (raw.includes("upgrade") || raw.includes("tech")) return "테크";
  return value.replaceAll("_", " ");
}

function averagePoint(points: Array<{ x: number; y: number }>) {
  const total = points.reduce(
    (sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }),
    { x: 0, y: 0 },
  );
  const count = Math.max(1, points.length);
  return { x: total.x / count, y: total.y / count };
}

function regionLabelForResultPoint(result: AnalyzeSuccess, playerId: number, point: { x: number; y: number }) {
  const commands = positionedReplayCommands(result, playerId);
  if (commands.length < 2) return "권역 미분류";
  const homeCenter = averagePoint(commands.slice(0, Math.min(24, commands.length)).map((command) => command.position));
  const maxDistance = Math.max(1, ...commands.map((command) => pointDistance(homeCenter, command.position)));
  return regionLabelFromPoint(point, homeCenter, maxDistance);
}

function regionLabelFromPoint(point: { x: number; y: number }, homeCenter: { x: number; y: number }, maxDistance: number) {
  const distanceFromHome = pointDistance(homeCenter, point);
  if (distanceFromHome <= Math.max(34, maxDistance * 0.28)) return "본진/생산권역";
  if (distanceFromHome <= Math.max(72, maxDistance * 0.58)) return "중앙/이동권역";
  return "전장/확장권역";
}

function pointDistance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function regionSwitchCoachContext(label: string) {
  if (label.includes("본진/생산권역") && label.includes("전장/확장권역")) {
    return "교전 화면과 생산 화면을 크게 오간 흐름입니다. 좋은 전환이라면 전장 확인 뒤 생산 예약이나 업그레이드 체크가 따라와야 하고, 아쉬운 전환이라면 화면만 크게 움직이고 생산이 비는 모습으로 나타납니다.";
  }
  if (label.includes("본진/생산권역") && label.includes("중앙/이동권역")) {
    return "병력 이동을 보다가 본진 생산을 확인하는 흐름입니다. 중요한 것은 본진으로 돌아온 직후 생산 건물 호출, 일꾼 분배, 업그레이드 예약이 실제로 들어갔는지입니다.";
  }
  if (label.includes("전장/확장권역")) {
    return "병력 이동, 견제, 확장 확인을 따라간 흐름입니다. 같은 권역 안에서 장거리 이동이 많다면 시야는 넓게 쓰고 있지만, 그 사이 생산과 단축키 습관이 끊기는지 같이 봐야 합니다.";
  }
  return "화면이 한 곳에만 머문 것이 아니라 중간 이동과 운영 확인이 반복된 흐름입니다. 전환 횟수보다 화면을 옮긴 뒤 첫 명령이 생산, 공격, 후퇴, 정찰 중 무엇이었는지를 확인하세요.";
}

function buildCoachInsights(result: AnalyzeSuccess, players: ReplayPlayer[]) {
  const profiles = players.map((player) => macroMicroProfile(result, player));
  const moments = buildCoachMoments(result, players);
  const drills = buildCoachDrills(result, players, moments, profiles);
  const score = coachScore(players, moments, profiles);
  const narrative = buildCoachNarrative(result, players, profiles, moments, drills, score);
  const highCount = moments.filter((moment) => moment.severity === "HIGH").length;
  const mediumCount = moments.filter((moment) => moment.severity === "MEDIUM").length;
  const productionGapCount = moments.filter((moment) => moment.tag === "생산 공백").length;
  const eapmDropCount = moments.filter((moment) => moment.tag === "EAPM 저하").length;
  const hotkeyIssueCount = moments.filter((moment) => moment.tag === "단축키 편중").length;
  const focus =
    productionGapCount > 0
      ? "후속 병력이 늦어진 구간부터 복기하세요."
      : eapmDropCount > 0
        ? "교전 중 첫 결정을 더 분명히 해야 합니다."
        : hotkeyIssueCount > 0
          ? "부대지정 역할 분리가 다음 성장 포인트입니다."
          : "큰 실수보다 작은 시간 차이를 줄이는 것이 핵심입니다.";
  const summary = [
    highCount > 0
      ? `복기할 장면 ${highCount}개와 보조 확인 장면 ${mediumCount}개가 있습니다.`
      : `큰 흔들림은 적고 보조 확인 장면 ${mediumCount}개가 있습니다.`,
    productionGapCount > 0
      ? `후속 병력이 늦어진 구간은 교전 직전 화면과 함께 보세요.`
      : "후속 병력 흐름은 크게 무너지지 않았습니다.",
    eapmDropCount > 0
      ? `입력 효율 참고 구간은 보조 근거에서만 확인하세요.`
      : "다음은 빌드 순서와 진출 타이밍을 더 엄격히 비교할 단계입니다.",
  ].join(" ");
  return { score, focus, summary, profiles, moments, drills, narrative };
}

function buildCoachMoments(result: AnalyzeSuccess, players: ReplayPlayer[]) {
  const moments: CoachMoment[] = [];

  for (const report of result.semantic.productionReports) {
    const sortedGaps = [...report.productionGaps].sort((a, b) => b.duration - a.duration).slice(0, 3);
    for (const gap of sortedGaps) {
      moments.push({
        id: `production-${report.playerId}-${gap.startSecond}-${gap.endSecond}`,
        timeLabel: `${formatDuration(gap.startSecond)}-${formatDuration(gap.endSecond)}`,
        playerName: report.playerName,
        severity: gap.duration >= 55 ? "HIGH" : "MEDIUM",
        tag: "생산 공백",
        title: `${Math.round(gap.duration)}초 동안 생산이 비었습니다`,
        detail: `${formatDuration(gap.startSecond)}부터 ${formatDuration(gap.endSecond)}까지 생산·건설·테크 기록 사이가 길게 벌어졌습니다. 이 정도 공백은 다음 교전 병력 수, 업그레이드 시작, 멀티 활성화 시간을 같이 늦출 수 있습니다. 교전이나 정찰 화면을 보고 있었더라도 생산 건물 단축키를 한 번 눌러 예약을 넣는 습관이 필요합니다.`,
        evidence: gap.reasonCode,
      });
    }
  }

  for (const player of players) {
    const points = result.timeline.filter((point) => point.playerId === player.id && point.apm > 0);
    const averageEapm = average(points.map((point) => point.eapm).filter((value) => value > 0));
    const weakWindows = points
      .filter((point) => {
        const rate = point.apm > 0 ? (point.eapm * 100) / point.apm : 0;
        return (averageEapm > 0 && point.eapm < averageEapm * 0.72) || rate < 56;
      })
      .sort((a, b) => a.eapm - b.eapm)
      .slice(0, 2);

    for (const point of weakWindows) {
      const rate = point.apm > 0 ? round1((point.eapm * 100) / point.apm) : 0;
      moments.push({
        id: `slow-${player.id}-${point.startSeconds}`,
        timeLabel: `${formatDuration(point.startSeconds)}-${formatDuration(point.endSeconds)}`,
        playerName: player.name,
        severity: rate < 45 ? "HIGH" : "MEDIUM",
        tag: "EAPM 저하",
        title: "입력 효율 참고 구간입니다",
        detail: `이 구간은 손속도 평가가 아니라 교전 중 첫 결정이 분명했는지 보는 보조 근거입니다. 같은 장면에서 먼저 공격할지, 빠질지, 생산을 누를지 하나를 정해 복기하세요.`,
        evidence: "입력 효율 참고",
      });
    }
  }

  for (const report of result.semantic.hotkeyReports) {
    if (report.dominantShare >= 58 || report.usedGroups.length <= 2) {
      moments.push({
        id: `hotkey-${report.playerId}`,
        timeLabel: "전체 경기",
        playerName: report.playerName,
        severity: report.dominantShare >= 70 || report.usedGroups.length <= 1 ? "HIGH" : "MEDIUM",
        tag: "단축키 편중",
        title: `부대지정이 ${report.dominantGroup ?? "특정"}번에 많이 몰렸습니다`,
        detail: `사용 번호는 ${report.usedGroups.join(", ") || "없음"}이고 최다 호출 비중은 ${report.dominantShare.toFixed(1)}%입니다. 한 번호에 주병력, 견제 병력, 생산 확인이 같이 몰리면 화면 전환 때마다 다시 찾는 시간이 생깁니다. 주병력, 견제/수비 병력, 생산 건물, 특수 유닛의 역할을 번호별로 나누면 교전 중에도 생산 루틴이 덜 끊깁니다.`,
        evidence: report.evidence.reasonCodes.join(", "),
      });
    }
  }

  for (const report of result.semantic.multitaskingReports) {
    if (report.positionedCommands > 0) {
      const flowProfile = regionSwitchProfile(result, report.playerId);
      moments.push({
        id: `multi-${report.playerId}`,
        timeLabel: "전체 경기",
        playerName: report.playerName,
        severity: "INFO",
        tag: "화면 전환",
        title: `${report.playerName} · ${flowProfile.headline}`,
        detail: `${report.playerName}은 위치가 잡힌 명령 ${report.positionedCommands}개 중 화면이 크게 이동한 장면이 ${report.regionSwitchEstimate}회 보입니다. ${flowProfile.summary} 화면을 많이 바꾼 것보다 중요한 것은, 화면을 옮긴 직후 생산·업그레이드·추가 건설·전투 명령이 실제로 이어졌는지입니다.`,
        evidence: `${report.evidence.reasonCodes.join(", ")} · ${flowProfile.evidenceLabel}`,
      });
    }
  }

  if (moments.length === 0) {
    moments.push({
      id: "stable-default",
      timeLabel: "전체 경기",
      playerName: "HM AI",
      severity: "INFO",
      tag: "안정",
      title: "크게 흔들린 시간대가 많지 않습니다.",
      detail: "이번 리플레이에서는 바로 크게 지적할 장면이 많지 않습니다. 이럴 때는 첫 생산, 첫 테크, 첫 확장, 첫 진출 타이밍을 빌드 기준표와 비교해보세요. 큰 실수보다 5초 차이가 쌓이는 유형인지 확인하는 것이 좋습니다.",
      evidence: "읽을 수 있는 경기 기록",
    });
  }

  return moments
    .sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity) || timeValue(a.timeLabel) - timeValue(b.timeLabel))
    .slice(0, 12);
}

function buildCoachDrills(result: AnalyzeSuccess, players: ReplayPlayer[], moments: CoachMoment[], profiles: MacroMicroProfile[]) {
  const drills: CoachDrill[] = [];
  if (moments.some((moment) => moment.tag === "생산 공백")) {
    drills.push({
      title: "30초마다 생산 건물 확인하기",
      detail: "공백이 시작되기 10초 전부터 리플레이를 다시 보세요. 화면이 전투, 정찰, 멀티 어디에 있든 생산 건물 단축키를 한 번 누르고 예약을 넣는 연습입니다. 목표는 더 빨리 누르는 것이 아니라, 화면을 바꿔도 생산 확인이 자연스럽게 끼어들게 만드는 것입니다.",
      successMetric: "다음 리플레이에서 35초 이상 생산 공백 2회 이하",
    });
  }
  if (moments.some((moment) => moment.tag === "EAPM 저하")) {
    drills.push({
      title: "교전 중 첫 결정 정하기",
      detail: "문제 구간 20초 전부터 다시 보며 먼저 공격할지, 빠질지, 생산을 누를지 하나를 정하세요.",
      successMetric: "같은 장면에서 첫 명령을 2초 안에 결정",
    });
  }
  if (moments.some((moment) => moment.tag === "단축키 편중")) {
    drills.push({
      title: "부대지정 역할 고정",
      detail: "1번 주병력, 2번 견제/보조 병력, 3번 생산 랠리 또는 앞마당 방어, 4번 탐지/특수 유닛처럼 역할을 고정하고 한 경기 동안 바꾸지 않습니다. 번호 역할이 흔들리면 교전 중 생산 건물을 찾는 시간이 늘어납니다.",
      successMetric: "사용 부대번호 4개 이상, 최다 그룹 호출 비중 55% 이하",
    });
  }
  if (profiles.some((profile) => profile.macroShare < 16)) {
    drills.push({
      title: "전투 중 생산 한 번 끼워 넣기",
      detail: "교전이 시작된 뒤 8초 안에 생산 명령, 업그레이드 확인, 추가 건물 예약 중 하나를 반드시 넣어보세요. 전투를 포기하라는 뜻이 아니라, 전투 화면을 보면서도 운영 명령을 한 번 끼워 넣는 습관을 만드는 훈련입니다.",
      successMetric: "생산·테크 입력 비중 16% 이상",
    });
  }
  if (drills.length === 0) {
    drills.push({
      title: "오프닝 정확도 고정",
      detail: "현재는 큰 실수보다 세부 타이밍을 고정하는 단계입니다. 첫 생산, 첫 보급, 첫 테크, 첫 확장, 첫 진출 타이밍을 빌드표와 비교하며 3게임 연속 같은 리듬으로 재현해보세요. 초반 편차가 줄어야 중반 판단도 안정됩니다.",
      successMetric: "동일 빌드 첫 5개 이벤트 편차 5초 이하",
    });
  }
  return drills.slice(0, 4);
}

function macroMicroProfile(result: AnalyzeSuccess, player: ReplayPlayer): MacroMicroProfile {
  const commands = (result.commands ?? []).filter((command) => command.playerId === player.id);
  const macro = commands.filter((command) => ["unit", "building", "tech", "upgrade"].includes(command.category)).length;
  const micro = commands.filter((command) => ["movement", "selection"].includes(command.category)).length;
  const hotkey = commands.filter((command) => command.category === "hotkey").length;
  const other = Math.max(0, commands.length - macro - micro - hotkey);
  const total = Math.max(1, commands.length);
  const macroShare = Math.round((macro * 100) / total);
  const microShare = Math.round((micro * 100) / total);
  const hotkeyShare = Math.round((hotkey * 100) / total);
  const multitaskingScore = bounded(Math.round((Math.sqrt((macro + 1) * (micro + 1)) * 100) / total));
  const readout = `생산 ${macroShare}% / 전투·이동 ${microShare}%`;
  const summary =
    macroShare < 14
      ? `생산·테크·업그레이드 입력 비중이 ${macroShare}%로 낮습니다. 이동, 선택, 전투 관련 입력이 앞서고 있어 교전이 시작되면 병력 충원과 테크 진행이 밀릴 수 있습니다. 전투 컨트롤 자체보다 전투 중 생산 건물 호출을 먼저 고치는 편이 좋습니다.`
      : microShare < 18
        ? `전투·이동 입력 비중이 ${microShare}%로 낮습니다. 생산 흐름은 어느 정도 남아 있지만 병력 이동, 압박, 교전 중 세부 컨트롤이 부족했을 수 있습니다. 진출 직전 병력이 멈춰 있지 않았는지, 압박 타이밍이 늦지 않았는지 확인해보세요.`
        : `생산 ${macroShare}%, 전투·이동 ${microShare}%, 단축키 ${hotkeyShare}%로 운영과 전투 입력이 모두 기록됩니다. 다음 단계는 두 흐름이 같은 시간대에 끊기지 않는지 보는 것입니다. 좋은 리플레이는 전투가 벌어진 10초 안에도 생산, 업그레이드, 추가 건설이 이어집니다.`;
  return { playerName: player.name, macro, micro, hotkey, other, macroShare, microShare, multitaskingScore, readout, summary };
}

function coachScore(players: ReplayPlayer[], moments: CoachMoment[], profiles: MacroMicroProfile[]) {
  const averageRate = average(players.map((player) => player.effectiveRate ?? 0).filter((value) => value > 0));
  const profileScore = average(profiles.map((profile) => profile.multitaskingScore));
  const penalty = moments.reduce((total, moment) => total + (moment.severity === "HIGH" ? 10 : moment.severity === "MEDIUM" ? 5 : 1), 0);
  return bounded(Math.round((averageRate || 60) * 0.58 + profileScore * 0.42 - penalty));
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function bounded(value: number) {
  return Math.max(0, Math.min(100, value));
}

function severityWeight(value: CoachSeverity) {
  if (value === "HIGH") return 3;
  if (value === "MEDIUM") return 2;
  return 1;
}

function timeValue(value: string) {
  const [first] = value.split("-");
  const parts = first.split(":").map((part) => Number(part));
  if (parts.length !== 2 || parts.some(Number.isNaN)) return Number.MAX_SAFE_INTEGER;
  return parts[0] * 60 + parts[1];
}

function validateReplayFile(nextFile: File) {
  if (!nextFile.name.toLowerCase().endsWith(".rep")) {
    return "스타크래프트 .rep 파일만 업로드할 수 있습니다.";
  }
  if (nextFile.size === 0) {
    return "빈 리플레이 파일은 분석할 수 없습니다.";
  }
  if (nextFile.size > MAX_REPLAY_SIZE_MB * 1024 * 1024) {
    return `최대 ${MAX_REPLAY_SIZE_MB}MB까지 업로드할 수 있습니다.`;
  }
  return null;
}

function resultLabel(player: ReplayPlayer) {
  if (player.result.outcome === "WIN") return player.result.status === "CONFIRMED" || player.result.status === "ADMIN_CONFIRMED" ? "승리" : "승리로 보임";
  if (player.result.outcome === "LOSS") return player.result.status === "CONFIRMED" || player.result.status === "ADMIN_CONFIRMED" ? "패배" : "패배로 보임";
  return "결과 미확인";
}

function confidenceLabel(value: number) {
  if (value >= CONFIDENCE_POLICY_CONFIG.high) return `꽤 확실 ${Math.round(value * 100)}%`;
  if (value >= CONFIDENCE_POLICY_CONFIG.medium) return `가능성 높음 ${Math.round(value * 100)}%`;
  if (value >= CONFIDENCE_POLICY_CONFIG.low) return `가능성 있음 ${Math.round(value * 100)}%`;
  return `참고용 ${Math.round(value * 100)}%`;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    QUEUED: "대기",
    VALIDATING: "검사",
    PARSING: "분석",
    COMPLETED: "완료",
    FAILED: "실패",
    PARTIALLY_COMPLETED: "부분 완료",
    SKIPPED: "보류",
    INFERRED_HIGH: "거의 확실",
    INFERRED_MEDIUM: "가능성 높음",
    INFERRED_LOW: "확인 필요",
    UNKNOWN: "미확인",
  };
  return labels[status] ?? status;
}

function sourceLabel(value: string) {
  return MATCH_SOURCE_LABELS[value as keyof typeof MATCH_SOURCE_LABELS] ?? value;
}

function benchmarkLabel(evidence: AnalysisEvidence) {
  if (!evidence.benchmark || evidence.benchmark.sampleSize <= 0) return "비슷한 경기 비교 자료가 적음";
  return `${evidence.benchmark.group} 비슷한 경기 ${evidence.benchmark.sampleSize.toLocaleString("ko-KR")}개와 비교`;
}

function percent(value: number | null) {
  return value === null ? "확인 안 됨" : `${value.toFixed(1)}%`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string | null) {
  if (!value) return "unknown";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(value: number | null) {
  const total = Math.max(0, Math.round(value ?? 0));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const PDF_CANVAS_WIDTH = 1240;
const PDF_CANVAS_HEIGHT = 1754;
const PDF_MARGIN = 86;
const PDF_CONTENT_WIDTH = PDF_CANVAS_WIDTH - PDF_MARGIN * 2;
const PDF_COLORS = {
  paper: "#f7f5ef",
  ink: "#121722",
  muted: "#5b6472",
  soft: "#ece7dd",
  line: "#d1c6b8",
  gold: "#b88a3d",
  blue: "#2f7ddf",
  green: "#299f78",
  red: "#c54d4d",
  slate: "#2b3441",
} as const;

type PdfPage = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  y: number;
  pageNumber: number;
};

async function downloadPdf(result: AnalyzeSuccess, players: ReplayPlayer[], selectedHmCoach?: HmCoachBridgeResult | null) {
  try {
    await preparePdfFonts();
    const hmCoach = selectedHmCoach ?? result.hmCoach ?? null;
    const images = hmCoach ? renderHmCoachPdfReportImages(result, hmCoach) : renderPdfReportImages(result, players, buildCoachInsights(result, players));
    const blob = buildImagePdfBlob(images);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `hm-ai-coach-report-${safeFilePart(result.replay.fileName)}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error(error);
    window.print();
  }
}

function renderHmCoachPdfReportImages(result: AnalyzeSuccess, hmCoach: HmCoachBridgeResult) {
  const pages: string[] = [];
  const feedback = (hmCoach.feedbackItems.length ? hmCoach.feedbackItems : hmCoach.coachInput.coaching?.feedbackItems ?? []).slice(0, 3);
  const nextGuide = (hmCoach.nextGameGuide.length ? hmCoach.nextGameGuide : hmCoach.coachInput.coaching?.nextGameGuide ?? []).slice(0, 4);
  let page = createPdfPage(1);
  drawHmCoachPdfCover(page, result, hmCoach, feedback.length);

  for (const [index, item] of feedback.entries()) {
    const height = measureHmCoachFeedbackCard(page.ctx, item);
    if (page.y + height > PDF_CANVAS_HEIGHT - 110) {
      finishPdfPage(page, pages);
      page = createPdfPage(page.pageNumber + 1);
      drawPdfSectionTitle(page, "이번 판 피드백", "구체적으로 고칠 장면");
      page.y += 18;
    }
    drawHmCoachFeedbackCard(page, item, index);
    page.y += 22;
  }

  if (nextGuide.length) {
    const guideHeight = measureHmCoachNextGuide(page.ctx, nextGuide);
    if (page.y + guideHeight > PDF_CANVAS_HEIGHT - 110) {
      finishPdfPage(page, pages);
      page = createPdfPage(page.pageNumber + 1);
      drawPdfSectionTitle(page, "다음 판 실행 순서", "한 경기에서 하나씩 바꾸기");
      page.y += 18;
    }
    drawHmCoachNextGuide(page, nextGuide);
  }

  finishPdfPage(page, pages);
  return pages;
}

function drawHmCoachPdfCover(page: PdfPage, result: AnalyzeSuccess, hmCoach: HmCoachBridgeResult, feedbackCount: number) {
  const { ctx } = page;
  const input = hmCoach.coachInput;
  const firstNext = hmCoach.nextGameGuide[0] ?? input.coaching?.nextGameGuide?.[0] ?? input.coaching?.feedbackItems?.[0]?.next ?? "";
  setPdfFont(ctx, 22, 900);
  ctx.fillStyle = PDF_COLORS.gold;
  ctx.fillText("HM COACH REPORT", PDF_MARGIN, page.y);
  page.y += 42;
  setPdfFont(ctx, 62, 900);
  ctx.fillStyle = PDF_COLORS.ink;
  page.y = drawPdfWrappedText(ctx, hmCoachHeading(hmCoach), PDF_MARGIN, page.y, PDF_CONTENT_WIDTH, 72, 2) + 12;

  setPdfFont(ctx, 24, 800);
  ctx.fillStyle = PDF_COLORS.muted;
  const meta = [
    input.match?.map ?? result.replay.map.name ?? "맵 확인",
    input.perspective?.matchup ?? "매치업 확인",
    input.perspective?.resultLabel ?? "결과 확인",
    input.dataContext?.confidenceLabel ?? null,
    typeof input.dataContext?.sampleSize === "number" ? `읽은 기록 ${input.dataContext.sampleSize.toLocaleString("ko-KR")}` : null,
  ].filter(Boolean).join(" · ");
  page.y = drawPdfWrappedText(ctx, meta, PDF_MARGIN, page.y, PDF_CONTENT_WIDTH, 34, 2) + 34;

  drawHmCoachPdfMetaTiles(page, [
    { label: "관점", value: input.perspective?.matchup ?? "-" },
    { label: "결과", value: input.perspective?.resultLabel ?? "-" },
    { label: "피드백", value: `${feedbackCount}개` },
    {
      label: "읽은 기록",
      value: typeof input.dataContext?.sampleSize === "number" ? input.dataContext.sampleSize.toLocaleString("ko-KR") : "-",
    },
  ]);
  page.y += 28;

  const x = PDF_MARGIN;
  const y = page.y;
  const width = PDF_CONTENT_WIDTH;
  const height = 184;
  drawPdfRoundRect(ctx, x, y, width, height, 18, "#ffffff", PDF_COLORS.gold);
  setPdfFont(ctx, 24, 900);
  ctx.fillStyle = PDF_COLORS.gold;
  ctx.fillText("코칭 요약", x + 28, y + 24);
  setPdfFont(ctx, 34, 900);
  ctx.fillStyle = PDF_COLORS.ink;
  drawPdfWrappedText(ctx, input.coaching?.verdict ?? "화면에 나온 유닛을 어디에 두고 어떻게 싸웠어야 했는지부터 봅니다.", x + 28, y + 62, width - 56, 42, 2);
  setPdfFont(ctx, 20, 900);
  ctx.fillStyle = PDF_COLORS.muted;
  ctx.fillText("수치 설명보다 다음 판에서 바로 바꿀 행동만 남겼습니다.", x + 28, y + 148);
  page.y += height + 24;

  drawHmCoachPdfBriefing(page, firstNext);
  page.y += 28;
}

function drawHmCoachPdfMetaTiles(page: PdfPage, metrics: Array<{ label: string; value: string }>) {
  const { ctx } = page;
  const gap = 14;
  const tileWidth = (PDF_CONTENT_WIDTH - gap * (metrics.length - 1)) / metrics.length;
  const tileHeight = 96;
  metrics.forEach((metric, index) => {
    const x = PDF_MARGIN + index * (tileWidth + gap);
    drawPdfRoundRect(ctx, x, page.y, tileWidth, tileHeight, 12, "#ffffff", PDF_COLORS.line);
    setPdfFont(ctx, 16, 900);
    ctx.fillStyle = PDF_COLORS.muted;
    ctx.fillText(metric.label, x + 18, page.y + 18);
    setPdfFont(ctx, 26, 900);
    ctx.fillStyle = PDF_COLORS.ink;
    drawPdfWrappedText(ctx, metric.value, x + 18, page.y + 48, tileWidth - 36, 30, 1);
  });
  page.y += tileHeight;
}

function drawHmCoachPdfBriefing(page: PdfPage, firstNext: string) {
  const { ctx } = page;
  const gap = 18;
  const cardWidth = (PDF_CONTENT_WIDTH - gap) / 2;
  const height = 178;
  const cards = [
    {
      kicker: "복기할 때 먼저 볼 것",
      title: "상대가 들어온 순간 내 유닛이 어디 있었는지",
      body: "빌드명보다 병력이 먼저 맞았는지, 뒤에서 때렸는지, 빠져야 할 유닛이 오래 남았는지를 봅니다.",
      color: PDF_COLORS.blue,
    },
    {
      kicker: "다음 게임 목표",
      title: "한 가지 행동만 바꿔서 다시 해보기",
      body: firstNext || "첫 교전 직전 유닛 위치와 진입 순서를 하나만 정하고 싸움을 여세요.",
      color: PDF_COLORS.green,
    },
  ];

  cards.forEach((card, index) => {
    const x = PDF_MARGIN + index * (cardWidth + gap);
    drawPdfRoundRect(ctx, x, page.y, cardWidth, height, 16, "#ffffff", card.color);
    setPdfFont(ctx, 17, 900);
    ctx.fillStyle = card.color;
    ctx.fillText(card.kicker, x + 22, page.y + 22);
    setPdfFont(ctx, 24, 900);
    ctx.fillStyle = PDF_COLORS.ink;
    const titleEnd = drawPdfWrappedText(ctx, card.title, x + 22, page.y + 54, cardWidth - 44, 29, 2);
    setPdfFont(ctx, 18, 600);
    ctx.fillStyle = PDF_COLORS.slate;
    drawPdfWrappedText(ctx, card.body, x + 22, titleEnd + 12, cardWidth - 44, 24, 3);
  });
  page.y += height;
}

function measureHmCoachFeedbackCard(ctx: CanvasRenderingContext2D, item: HmCoachFeedbackItem) {
  setPdfFont(ctx, 31, 900);
  const titleHeight = Math.min(92, measurePdfTextBlock(ctx, item.title, PDF_CONTENT_WIDTH - 72, 38));
  setPdfFont(ctx, 21, 500);
  const detailHeight = Math.min(116, measurePdfTextBlock(ctx, item.detail, PDF_CONTENT_WIDTH - 72, 29));
  const nextHeight = item.next ? Math.min(72, measurePdfTextBlock(ctx, item.next, PDF_CONTENT_WIDTH - 190, 26)) : 0;
  return 118 + titleHeight + detailHeight + (item.next ? 44 + nextHeight : 0);
}

function drawHmCoachFeedbackCard(page: PdfPage, item: HmCoachFeedbackItem, index: number) {
  const { ctx } = page;
  const x = PDF_MARGIN;
  const y = page.y;
  const width = PDF_CONTENT_WIDTH;
  const height = measureHmCoachFeedbackCard(ctx, item);
  const tone = index === 0 ? PDF_COLORS.gold : index === 1 ? PDF_COLORS.green : PDF_COLORS.blue;
  drawPdfRoundRect(ctx, x, y, width, height, 18, "#ffffff", tone);
  ctx.fillStyle = tone;
  ctx.fillRect(x, y, 10, height);
  setPdfFont(ctx, 18, 900);
  ctx.fillStyle = tone;
  ctx.fillText(pdfHmCoachPriorityLabel(index), x + 30, y + 24);
  setPdfFont(ctx, 31, 900);
  ctx.fillStyle = PDF_COLORS.ink;
  const titleEnd = drawPdfWrappedText(ctx, item.title, x + 30, y + 60, width - 60, 38, 3);
  setPdfFont(ctx, 21, 500);
  ctx.fillStyle = PDF_COLORS.slate;
  const detailEnd = drawPdfWrappedText(ctx, item.detail, x + 30, titleEnd + 16, width - 60, 29, 4);
  if (item.next) {
    const nextY = detailEnd + 22;
    drawPdfRoundRect(ctx, x + 30, nextY, width - 60, Math.min(116, height - (nextY - y) - 24), 14, PDF_COLORS.soft, PDF_COLORS.line);
    setPdfFont(ctx, 18, 900);
    ctx.fillStyle = PDF_COLORS.green;
    ctx.fillText("다음 판에는", x + 52, nextY + 22);
    setPdfFont(ctx, 20, 700);
    ctx.fillStyle = PDF_COLORS.ink;
    drawPdfWrappedText(ctx, item.next, x + 174, nextY + 18, width - 226, 26, 3);
  }
  page.y += height;
}

function pdfHmCoachPriorityLabel(index: number) {
  if (index === 0) return "제일 먼저 고칠 포인트";
  if (index === 1) return "두 번째로 고칠 포인트";
  return "같이 확인할 포인트";
}

function measureHmCoachNextGuide(ctx: CanvasRenderingContext2D, items: string[]) {
  setPdfFont(ctx, 22, 700);
  return 126 + items.reduce((total, item) => total + Math.max(34, measurePdfTextBlock(ctx, item, PDF_CONTENT_WIDTH - 120, 28)), 0);
}

function drawHmCoachNextGuide(page: PdfPage, items: string[]) {
  const { ctx } = page;
  const x = PDF_MARGIN;
  const y = page.y;
  const width = PDF_CONTENT_WIDTH;
  const height = measureHmCoachNextGuide(ctx, items);
  drawPdfRoundRect(ctx, x, y, width, height, 18, "#ffffff", PDF_COLORS.green);
  setPdfFont(ctx, 22, 900);
  ctx.fillStyle = PDF_COLORS.green;
  ctx.fillText("다음 판 실행 순서", x + 28, y + 24);
  let rowY = y + 70;
  items.forEach((item, index) => {
    drawPdfRoundRect(ctx, x + 28, rowY, 42, 42, 10, PDF_COLORS.green, PDF_COLORS.green);
    setPdfFont(ctx, 20, 900);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(String(index + 1), x + 43, rowY + 10);
    setPdfFont(ctx, 22, 700);
    ctx.fillStyle = PDF_COLORS.ink;
    const nextY = drawPdfWrappedText(ctx, item, x + 88, rowY + 4, width - 116, 28, 2);
    rowY = Math.max(rowY + 54, nextY + 18);
  });
  page.y += height;
}

function renderPdfReportImages(result: AnalyzeSuccess, players: ReplayPlayer[], coach: ReturnType<typeof buildCoachInsights>) {
  const pages: string[] = [];
  const cover = createPdfPage(1);
  drawPdfCoverPage(cover, result, players, coach);
  finishPdfPage(cover, pages);

  let page = createPdfPage(2);
  drawPdfSectionTitle(page, "복기 리포트", "읽고 바로 다시 볼 수 있게 정리했습니다");
  page.y += 18;
  for (const item of pdfNarrativeItems(coach.narrative)) {
    const height = measurePdfNarrativeCard(page.ctx, item);
    if (page.y + height > PDF_CANVAS_HEIGHT - 96) {
      finishPdfPage(page, pages);
      page = createPdfPage(page.pageNumber + 1);
      drawPdfSectionTitle(page, "복기 리포트", "이어지는 코치 노트");
      page.y += 18;
    }
    drawPdfNarrativeCard(page, item);
    page.y += 18;
  }
  finishPdfPage(page, pages);

  page = createPdfPage(pages.length + 1);
  drawPdfSectionTitle(page, "이번 판에서 바로 고칠 장면", "좌표가 아니라 행동으로 복기하기");
  page.y += 18;
  for (const moment of coach.moments) {
    const cardHeight = measurePdfMomentCard(page.ctx, moment);
    if (page.y + cardHeight > PDF_CANVAS_HEIGHT - 96) {
      finishPdfPage(page, pages);
      page = createPdfPage(page.pageNumber + 1);
      drawPdfSectionTitle(page, "이번 판에서 바로 고칠 장면", "이어지는 코칭 카드");
      page.y += 18;
    }
    drawPdfMomentCard(page, moment, result.replay.durationSeconds);
    page.y += 22;
  }
  finishPdfPage(page, pages);

  page = createPdfPage(pages.length + 1);
  drawPdfSectionTitle(page, "다음 연습", "다음 경기에서 바로 해볼 것");
  page.y += 18;
  for (const drill of coach.drills) {
    const height = measurePdfTextBlock(page.ctx, drill.detail, PDF_CONTENT_WIDTH - 52, 26) + 118;
    if (page.y + height > PDF_CANVAS_HEIGHT - 96) {
      finishPdfPage(page, pages);
      page = createPdfPage(page.pageNumber + 1);
      drawPdfSectionTitle(page, "다음 연습", "이어지는 연습 과제");
      page.y += 18;
    }
    drawPdfDrillCard(page, drill);
    page.y += 18;
  }
  finishPdfPage(page, pages);
  return pages;
}

function createPdfPage(pageNumber: number): PdfPage {
  const canvas = document.createElement("canvas");
  canvas.width = PDF_CANVAS_WIDTH;
  canvas.height = PDF_CANVAS_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("PDF canvas context is not available.");
  ctx.fillStyle = PDF_COLORS.paper;
  ctx.fillRect(0, 0, PDF_CANVAS_WIDTH, PDF_CANVAS_HEIGHT);
  ctx.fillStyle = PDF_COLORS.ink;
  ctx.textBaseline = "top";
  setPdfFont(ctx, 22, 900);
  ctx.fillText("HM AI 분석툴", PDF_MARGIN, 42);
  setPdfFont(ctx, 18, 800);
  ctx.textAlign = "right";
  ctx.fillStyle = PDF_COLORS.muted;
  ctx.fillText(`PAGE ${pageNumber}`, PDF_CANVAS_WIDTH - PDF_MARGIN, 46);
  ctx.textAlign = "left";
  ctx.strokeStyle = PDF_COLORS.gold;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(PDF_MARGIN, 84);
  ctx.lineTo(PDF_CANVAS_WIDTH - PDF_MARGIN, 84);
  ctx.stroke();
  return { canvas, ctx, y: 124, pageNumber };
}

function finishPdfPage(page: PdfPage, pages: string[]) {
  pages.push(page.canvas.toDataURL("image/jpeg", 0.92));
}

function drawPdfCoverPage(page: PdfPage, result: AnalyzeSuccess, players: ReplayPlayer[], coach: ReturnType<typeof buildCoachInsights>) {
  const { ctx } = page;
  setPdfFont(ctx, 22, 900);
  ctx.fillStyle = PDF_COLORS.gold;
  ctx.fillText("리플레이 코치 리포트", PDF_MARGIN, page.y);
  page.y += 42;
  setPdfFont(ctx, 64, 900);
  ctx.fillStyle = PDF_COLORS.ink;
  drawPdfWrappedText(ctx, result.replay.map.name ?? result.replay.gameTitle ?? "리플레이 코치 리포트", PDF_MARGIN, page.y, PDF_CONTENT_WIDTH, 70);
  page.y += 82;
  setPdfFont(ctx, 25, 800);
  ctx.fillStyle = PDF_COLORS.muted;
  ctx.fillText(`${formatDate(result.replay.startedAt)} · ${formatDuration(result.replay.durationSeconds)} · ${sourceLabel(result.replay.source)}`, PDF_MARGIN, page.y);
  page.y += 60;

  drawPdfSummaryBox(page, coach);
  page.y += 28;
  drawPdfMetricTiles(page, [
    { label: "리포트 점수", value: String(coach.score) },
    { label: "읽은 기록", value: result.canonical.commandCount.toLocaleString("ko-KR") },
    { label: "플레이어", value: String(players.length) },
    { label: "먼저 볼 장면", value: String(coach.moments.filter((moment) => moment.severity !== "INFO").length) },
  ]);
  page.y += 44;

  drawPdfSectionTitle(page, "운영 리듬", "생산, 교전, 화면 전환이 끊긴 흐름");
  page.y += 16;
  drawPdfApmChart(page, result, players);
  page.y += 24;
  drawPdfMacroStacks(page, coach.profiles);
  page.y += 24;
  drawPdfTimingTrack(page, coach.moments, result.replay.durationSeconds);
}

function drawPdfSummaryBox(page: PdfPage, coach: ReturnType<typeof buildCoachInsights>) {
  const { ctx } = page;
  const x = PDF_MARGIN;
  const y = page.y;
  const width = PDF_CONTENT_WIDTH;
  const height = 238;
  drawPdfRoundRect(ctx, x, y, width, height, 18, "#ffffff", PDF_COLORS.line);
  setPdfFont(ctx, 24, 900);
  ctx.fillStyle = PDF_COLORS.gold;
  ctx.fillText("한 줄 결론", x + 28, y + 24);
  setPdfFont(ctx, 34, 900);
  ctx.fillStyle = PDF_COLORS.ink;
  drawPdfWrappedText(ctx, coach.focus, x + 28, y + 62, width - 56, 40, 2);
  setPdfFont(ctx, 22, 500);
  ctx.fillStyle = PDF_COLORS.slate;
  drawPdfWrappedText(ctx, coach.summary, x + 28, y + 146, width - 56, 31, 3);
  page.y += height;
}

function drawPdfMetricTiles(page: PdfPage, metrics: Array<{ label: string; value: string }>) {
  const { ctx } = page;
  const gap = 16;
  const tileWidth = (PDF_CONTENT_WIDTH - gap * 3) / 4;
  const tileHeight = 128;
  metrics.forEach((metric, index) => {
    const x = PDF_MARGIN + index * (tileWidth + gap);
    drawPdfRoundRect(ctx, x, page.y, tileWidth, tileHeight, 14, "#ffffff", PDF_COLORS.line);
    setPdfFont(ctx, 18, 900);
    ctx.fillStyle = PDF_COLORS.gold;
    ctx.fillText(metric.label, x + 20, page.y + 20);
    setPdfFont(ctx, 36, 900);
    ctx.fillStyle = PDF_COLORS.ink;
    drawPdfWrappedText(ctx, metric.value, x + 20, page.y + 60, tileWidth - 40, 38, 2);
  });
  page.y += tileHeight;
}

function drawPdfSectionTitle(page: PdfPage, kicker: string, title: string) {
  const { ctx } = page;
  setPdfFont(ctx, 20, 900);
  ctx.fillStyle = PDF_COLORS.gold;
  ctx.fillText(kicker, PDF_MARGIN, page.y);
  page.y += 34;
  setPdfFont(ctx, 42, 900);
  ctx.fillStyle = PDF_COLORS.ink;
  ctx.fillText(title, PDF_MARGIN, page.y);
  page.y += 58;
}

function pdfNarrativeItems(narrative: CoachNarrative) {
  return [
    { kicker: "이번 경기 요약", title: narrative.overall.title, body: narrative.overall.body, meta: narrative.overall.meta, tone: "neutral" },
    ...narrative.feedback.slice(0, 4).map((item, index) => ({
      kicker: `이번 판에서 못한 부분 ${index + 1}`,
      title: item.title,
      body: item.body,
      meta: item.meta ? `다음 판에는: ${item.meta}` : undefined,
      tone: "mistake",
    })),
    { kicker: "빌드와 운영 흐름", title: narrative.strategy.title, body: narrative.strategy.body, meta: narrative.strategy.meta, tone: "neutral" },
    ...narrative.strengths.slice(0, 4).map((item) => ({ kicker: "잘한 점", title: item.title, body: item.body, meta: item.meta, tone: "strength" })),
    ...narrative.mistakes.slice(0, 4).map((item) => ({ kicker: "고칠 점", title: item.title, body: item.body, meta: item.meta, tone: "mistake" })),
    ...narrative.keyMoments.slice(0, 5).map((item) => ({ kicker: `다시 볼 장면 · ${item.timeLabel}`, title: item.title, body: item.body, meta: item.meta, tone: item.severity.toLowerCase() })),
    ...narrative.priorities.slice(0, 4).map((item, index) => ({ kicker: `다음 연습 ${index + 1}`, title: item.title, body: item.body, meta: item.meta, tone: "priority" })),
  ];
}

function measurePdfNarrativeCard(ctx: CanvasRenderingContext2D, item: { title: string; body: string; meta?: string }) {
  setPdfFont(ctx, 28, 900);
  const titleHeight = Math.min(72, measurePdfTextBlock(ctx, stripCoachMarkup(item.title), PDF_CONTENT_WIDTH - 56, 34));
  setPdfFont(ctx, 21, 500);
  const bodyHeight = measurePdfTextBlock(ctx, stripCoachMarkup(item.body), PDF_CONTENT_WIDTH - 56, 29);
  return Math.max(210, 94 + titleHeight + bodyHeight + (item.meta ? 30 : 0));
}

function drawPdfNarrativeCard(page: PdfPage, item: { kicker: string; title: string; body: string; meta?: string; tone: string }) {
  const { ctx } = page;
  const x = PDF_MARGIN;
  const y = page.y;
  const width = PDF_CONTENT_WIDTH;
  const height = measurePdfNarrativeCard(ctx, item);
  const toneColor = item.tone === "mistake" || item.tone === "high" ? PDF_COLORS.red : item.tone === "strength" ? PDF_COLORS.green : PDF_COLORS.gold;
  drawPdfRoundRect(ctx, x, y, width, height, 18, "#ffffff", toneColor);
  ctx.fillStyle = toneColor;
  ctx.fillRect(x, y, 9, height);
  setPdfFont(ctx, 18, 900);
  ctx.fillStyle = toneColor;
  ctx.fillText(item.kicker, x + 28, y + 26);
  setPdfFont(ctx, 29, 900);
  ctx.fillStyle = PDF_COLORS.ink;
  const titleEnd = drawPdfWrappedText(ctx, stripCoachMarkup(item.title), x + 28, y + 64, width - 56, 34, 2);
  setPdfFont(ctx, 21, 500);
  ctx.fillStyle = PDF_COLORS.slate;
  const bodyEnd = drawPdfWrappedText(ctx, stripCoachMarkup(item.body), x + 28, titleEnd + 16, width - 56, 29);
  if (item.meta) {
    setPdfFont(ctx, 17, 800);
    ctx.fillStyle = PDF_COLORS.muted;
    drawPdfWrappedText(ctx, stripCoachMarkup(item.meta), x + 28, bodyEnd + 16, width - 56, 24, 1);
  }
  page.y += height;
}

function drawPdfApmChart(page: PdfPage, result: AnalyzeSuccess, players: ReplayPlayer[]) {
  const { ctx } = page;
  const x = PDF_MARGIN;
  const y = page.y;
  const width = PDF_CONTENT_WIDTH;
  const height = 306;
  drawPdfRoundRect(ctx, x, y, width, height, 18, "#ffffff", PDF_COLORS.line);
  setPdfFont(ctx, 20, 900);
  ctx.fillStyle = PDF_COLORS.blue;
  ctx.fillText("운영 리듬", x + 24, y + 22);
  setPdfFont(ctx, 28, 900);
  ctx.fillStyle = PDF_COLORS.ink;
  ctx.fillText("다음 행동이 이어졌는지 보는 근거", x + 24, y + 52);

  const points = players.flatMap((player) => timelinePointsForPlayer(result, player).slice(0, 6));
  const maxValue = Math.max(1, ...points.map((point) => Math.max(point.apm, point.eapm)));
  const chartX = x + 34;
  const chartY = y + 118;
  const chartWidth = width - 68;
  const chartHeight = 118;
  const barGap = 10;
  const pairCount = Math.max(1, points.length);
  const pairWidth = Math.max(34, (chartWidth - barGap * (pairCount - 1)) / pairCount);
  points.forEach((point, index) => {
    const px = chartX + index * (pairWidth + barGap);
    const apmHeight = Math.max(8, (point.apm / maxValue) * chartHeight);
    const eapmHeight = Math.max(8, (point.eapm / maxValue) * chartHeight);
    ctx.fillStyle = PDF_COLORS.blue;
    ctx.fillRect(px, chartY + chartHeight - apmHeight, pairWidth * 0.42, apmHeight);
    ctx.fillStyle = PDF_COLORS.gold;
    ctx.fillRect(px + pairWidth * 0.48, chartY + chartHeight - eapmHeight, pairWidth * 0.42, eapmHeight);
  });
  ctx.strokeStyle = PDF_COLORS.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(chartX, chartY + chartHeight);
  ctx.lineTo(chartX + chartWidth, chartY + chartHeight);
  ctx.stroke();
  setPdfFont(ctx, 18, 800);
  ctx.fillStyle = PDF_COLORS.muted;
  drawPdfWrappedText(
    ctx,
    "이 그래프는 클릭 수를 평가하려는 것이 아니라 생산, 이동, 공격 뒤에 다음 행동이 끊기지 않았는지 확인하는 보조 근거입니다.",
    x + 24,
    y + height - 62,
    width - 48,
    23,
    2,
  );
  page.y += height;
}

function drawPdfMacroStacks(page: PdfPage, profiles: Array<MacroMicroProfile & { hotkey: number; other: number }>) {
  const { ctx } = page;
  const x = PDF_MARGIN;
  const y = page.y;
  const width = PDF_CONTENT_WIDTH;
  const height = 172 + Math.max(0, profiles.length - 2) * 54;
  drawPdfRoundRect(ctx, x, y, width, height, 18, "#ffffff", PDF_COLORS.line);
  setPdfFont(ctx, 20, 900);
  ctx.fillStyle = PDF_COLORS.blue;
  ctx.fillText("플레이 습관", x + 24, y + 22);
  let rowY = y + 62;
  profiles.forEach((profile) => {
    const total = Math.max(1, profile.macro + profile.micro + profile.hotkey + profile.other);
    const macroShare = share(profile.macro, total);
    const microShare = share(profile.micro, total);
    const hotkeyShare = share(profile.hotkey, total);
    const otherShare = Math.max(0, 100 - macroShare - microShare - hotkeyShare);
    setPdfFont(ctx, 24, 900);
    ctx.fillStyle = PDF_COLORS.ink;
    ctx.fillText(profile.playerName, x + 24, rowY);
    drawPdfStack(ctx, x + 220, rowY + 4, width - 430, 26, [
      { value: macroShare, color: PDF_COLORS.green },
      { value: microShare, color: PDF_COLORS.blue },
      { value: hotkeyShare, color: PDF_COLORS.gold },
      { value: otherShare, color: "#c9ced6" },
    ]);
    setPdfFont(ctx, 18, 800);
    ctx.fillStyle = PDF_COLORS.muted;
    ctx.fillText(`Macro ${macroShare}% · Micro ${microShare}% · Hotkey ${hotkeyShare}% · MT ${profile.multitaskingScore}`, x + 24, rowY + 34);
    rowY += 58;
  });
  page.y += height;
}

function drawPdfTimingTrack(page: PdfPage, moments: CoachMoment[], durationSeconds: number | null) {
  const { ctx } = page;
  const x = PDF_MARGIN;
  const y = page.y;
  const width = PDF_CONTENT_WIDTH;
  const height = 210;
  const totalSeconds = timingTotalSeconds(moments, durationSeconds);
  drawPdfRoundRect(ctx, x, y, width, height, 18, "#ffffff", PDF_COLORS.line);
  setPdfFont(ctx, 20, 900);
  ctx.fillStyle = PDF_COLORS.blue;
  ctx.fillText("시간대 지도", x + 24, y + 22);
  setPdfFont(ctx, 28, 900);
  ctx.fillStyle = PDF_COLORS.ink;
  ctx.fillText("문제 구간이 경기 시간축 어디에 걸렸는지", x + 24, y + 52);
  const trackX = x + 34;
  const trackY = y + 110;
  const trackWidth = width - 68;
  drawPdfRoundRect(ctx, trackX, trackY, trackWidth, 30, 15, PDF_COLORS.soft, PDF_COLORS.line);
  moments.slice(0, 10).forEach((moment) => {
    const bounds = momentBounds(moment, totalSeconds);
    const left = trackX + (bounds.start / Math.max(1, totalSeconds)) * trackWidth;
    const barWidth = Math.max(10, ((bounds.end - bounds.start) / Math.max(1, totalSeconds)) * trackWidth);
    drawPdfRoundRect(ctx, left, trackY + 5, Math.min(barWidth, trackX + trackWidth - left), 20, 10, pdfSeverityColor(moment.severity), pdfSeverityColor(moment.severity));
  });
  setPdfFont(ctx, 18, 800);
  ctx.fillStyle = PDF_COLORS.muted;
  ctx.fillText("00:00", trackX, trackY + 48);
  ctx.textAlign = "center";
  ctx.fillText(formatDuration(Math.round(totalSeconds / 2)), trackX + trackWidth / 2, trackY + 48);
  ctx.textAlign = "right";
  ctx.fillText(formatDuration(totalSeconds), trackX + trackWidth, trackY + 48);
  ctx.textAlign = "left";
  page.y += height;
}

function measurePdfMomentCard(ctx: CanvasRenderingContext2D, moment: CoachMoment) {
  const textWidth = PDF_CONTENT_WIDTH - 348;
  const copy = plainReviewCopy(moment);
  setPdfFont(ctx, 21, 500);
  const flowHeight = measurePdfTextBlock(ctx, copy.reason, textWidth, 28, 3);
  const actionHeight = measurePdfTextBlock(ctx, pdfMomentHadToAction(moment), textWidth, 28, 3);
  const checkHeight = measurePdfTextBlock(ctx, pdfMomentNextCheckpoint(moment), textWidth, 28, 3);
  return Math.max(360, 172 + flowHeight + actionHeight + checkHeight);
}

function drawPdfMomentCard(page: PdfPage, moment: CoachMoment, durationSeconds: number | null) {
  const { ctx } = page;
  const x = PDF_MARGIN;
  const y = page.y;
  const width = PDF_CONTENT_WIDTH;
  const height = measurePdfMomentCard(ctx, moment);
  drawPdfRoundRect(ctx, x, y, width, height, 18, "#ffffff", pdfSeverityColor(moment.severity));
  ctx.fillStyle = pdfSeverityColor(moment.severity);
  ctx.fillRect(x, y, 9, height);
  setPdfFont(ctx, 24, 900);
  ctx.fillStyle = PDF_COLORS.blue;
  ctx.fillText(moment.timeLabel, x + 28, y + 24);
  setPdfFont(ctx, 19, 900);
  ctx.fillStyle = PDF_COLORS.gold;
  ctx.fillText(coachProblemShortLabel(moment.tag), x + 28, y + 58);
  setPdfFont(ctx, 30, 900);
  ctx.fillStyle = PDF_COLORS.ink;
  drawPdfWrappedText(ctx, moment.title, x + 320, y + 24, width - 348, 34, 2);
  drawPdfMiniMomentGraphic(ctx, x + 28, y + 106, 246, 116, moment, durationSeconds);
  const copy = plainReviewCopy(moment);
  let rowY = y + 106;
  rowY = drawPdfCoachingRow(ctx, "실제로 보인 흐름", copy.reason, x + 320, rowY, width - 348) + 16;
  rowY = drawPdfCoachingRow(ctx, "이번 판에서 했어야 한 행동", pdfMomentHadToAction(moment), x + 320, rowY, width - 348) + 16;
  drawPdfCoachingRow(ctx, "다음 판 체크포인트", pdfMomentNextCheckpoint(moment), x + 320, rowY, width - 348);
  setPdfFont(ctx, 17, 800);
  ctx.fillStyle = PDF_COLORS.muted;
  ctx.fillText(`${moment.playerName} · ${moment.evidence}`, x + 28, y + height - 34);
  page.y += height;
}

function drawPdfCoachingRow(ctx: CanvasRenderingContext2D, label: string, text: string, x: number, y: number, width: number) {
  setPdfFont(ctx, 18, 900);
  ctx.fillStyle = label.includes("했어야") ? PDF_COLORS.gold : PDF_COLORS.blue;
  ctx.fillText(label, x, y);
  setPdfFont(ctx, 21, 500);
  ctx.fillStyle = PDF_COLORS.slate;
  return drawPdfWrappedText(ctx, text, x, y + 28, width, 28, 3);
}

function pdfMomentHadToAction(moment: CoachMoment) {
  const start = moment.timeLabel.split("-")[0] || moment.timeLabel;
  if (moment.tag.includes("생산")) {
    return `이번 판에서는 ${start}에 화면이 다른 곳으로 가기 전에 생산 건물 단축키를 먼저 열고 필요한 유닛을 예약했어야 했어.`;
  }
  if (moment.tag.includes("EAPM")) {
    return `이번 판에서는 ${start}에 더 빨리 누르기보다 공격, 후퇴, 생산 중 무엇을 먼저 할지 정하고 입력했어야 했어.`;
  }
  if (moment.tag.includes("단축키")) {
    return `이번 판에서는 ${start} 전에 주병력, 수비 병력, 생산 건물 번호를 나눠서 교전 중 다시 찾는 시간을 줄였어야 했어.`;
  }
  return `이번 판에서는 ${start}에 병력을 움직이기 전에 생산, 수비 위치, 교전 시작 순서를 먼저 정했어야 했어.`;
}

function pdfMomentNextCheckpoint(moment: CoachMoment) {
  const copy = plainReviewCopy(moment);
  if (moment.tag.includes("생산")) return "다음 판에는 전투 화면을 보기 전 생산 건물 단축키를 한 번 누르고, 병력 예약 후 교전 화면으로 돌아가세요.";
  if (moment.tag.includes("EAPM")) return "다음 판에는 같은 상황에서 첫 입력을 넣기 전에 공격/후퇴/생산 중 하나를 말로 정하고 누르세요.";
  if (moment.tag.includes("단축키")) return "다음 판에는 1번 주병력, 2번 보조 병력, 3번 생산처럼 번호 역할을 정하고 한 경기 동안 유지하세요.";
  return copy.fixPoint;
}

function drawPdfMiniMomentGraphic(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, moment: CoachMoment, durationSeconds: number | null) {
  drawPdfRoundRect(ctx, x, y, width, height, 14, PDF_COLORS.soft, PDF_COLORS.line);
  const totalSeconds = timingTotalSeconds([moment], durationSeconds);
  const bounds = momentBounds(moment, totalSeconds);
  const trackX = x + 20;
  const trackY = y + 24;
  const trackWidth = width - 40;
  drawPdfRoundRect(ctx, trackX, trackY, trackWidth, 18, 9, "#ffffff", PDF_COLORS.line);
  const left = trackX + (bounds.start / Math.max(1, totalSeconds)) * trackWidth;
  const barWidth = Math.max(9, ((bounds.end - bounds.start) / Math.max(1, totalSeconds)) * trackWidth);
  drawPdfRoundRect(ctx, left, trackY + 3, Math.min(barWidth, trackX + trackWidth - left), 12, 6, pdfSeverityColor(moment.severity), pdfSeverityColor(moment.severity));
  momentDiagnosticStats(moment, bounds).forEach((stat, index) => {
    const rowY = y + 58 + index * 18;
    setPdfFont(ctx, 13, 900);
    ctx.fillStyle = PDF_COLORS.muted;
    ctx.fillText(stat.label, x + 20, rowY);
    drawPdfRoundRect(ctx, x + 82, rowY + 2, 90, 8, 4, "#ffffff", PDF_COLORS.line);
    drawPdfRoundRect(ctx, x + 82, rowY + 2, Math.max(4, (stat.value / 100) * 90), 8, 4, pdfSeverityColor(moment.severity), pdfSeverityColor(moment.severity));
    setPdfFont(ctx, 12, 800);
    ctx.fillStyle = PDF_COLORS.ink;
    drawPdfFittedText(ctx, stat.caption, x + 182, rowY, width - 196);
  });
}

function drawPdfDrillCard(page: PdfPage, drill: CoachDrill) {
  const { ctx } = page;
  const x = PDF_MARGIN;
  const y = page.y;
  const height = measurePdfTextBlock(ctx, drill.detail, PDF_CONTENT_WIDTH - 52, 28) + 116;
  drawPdfRoundRect(ctx, x, y, PDF_CONTENT_WIDTH, height, 18, "#ffffff", PDF_COLORS.line);
  setPdfFont(ctx, 30, 900);
  ctx.fillStyle = PDF_COLORS.ink;
  ctx.fillText(drill.title, x + 26, y + 24);
  setPdfFont(ctx, 22, 500);
  ctx.fillStyle = PDF_COLORS.slate;
  const textEnd = drawPdfWrappedText(ctx, drill.detail, x + 26, y + 70, PDF_CONTENT_WIDTH - 52, 28);
  setPdfFont(ctx, 18, 900);
  ctx.fillStyle = PDF_COLORS.gold;
  ctx.fillText(drill.successMetric, x + 26, textEnd + 18);
  page.y += height;
}

function drawPdfStack(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, items: Array<{ value: number; color: string }>) {
  drawPdfRoundRect(ctx, x, y, width, height, height / 2, PDF_COLORS.soft, PDF_COLORS.line);
  let currentX = x;
  items.forEach((item) => {
    const itemWidth = (Math.max(0, item.value) / 100) * width;
    ctx.fillStyle = item.color;
    ctx.fillRect(currentX, y, itemWidth, height);
    currentX += itemWidth;
  });
  ctx.strokeStyle = PDF_COLORS.line;
  ctx.lineWidth = 2;
  drawPdfPathRoundRect(ctx, x, y, width, height, height / 2);
  ctx.stroke();
}

function drawPdfWrappedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines?: number) {
  const lines = pdfTextLines(ctx, text, maxWidth);
  const visibleLines = typeof maxLines === "number" ? lines.slice(0, maxLines) : lines;
  visibleLines.forEach((line, index) => {
    const suffix = maxLines && index === visibleLines.length - 1 && lines.length > maxLines ? "..." : "";
    ctx.fillText(`${line}${suffix}`, x, y + index * lineHeight);
  });
  return y + visibleLines.length * lineHeight;
}

function measurePdfTextBlock(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, lineHeight: number, maxLines?: number) {
  return Math.min(pdfTextLines(ctx, text, maxWidth).length, maxLines ?? Number.POSITIVE_INFINITY) * lineHeight;
}

function pdfTextLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  let line = "";
  for (const char of Array.from(text)) {
    if (char === "\n") {
      if (line.trim()) lines.push(line.trim());
      line = "";
      continue;
    }
    const next = line + char;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line.trim());
      line = char.trimStart();
    } else {
      line = next;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines.length ? lines : [""];
}

function setPdfFont(ctx: CanvasRenderingContext2D, size: number, weight: number) {
  ctx.font = `${weight} ${size}px "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", "Nanum Gothic", Arial, sans-serif`;
}

async function preparePdfFonts() {
  const fonts = document.fonts;
  if (!fonts) return;
  try {
    await Promise.all([
      fonts.load(`900 64px "Apple SD Gothic Neo"`),
      fonts.load(`500 21px "Apple SD Gothic Neo"`),
      fonts.load(`900 64px "Noto Sans KR"`),
      fonts.ready,
    ]);
  } catch {
    await fonts.ready.catch(() => undefined);
  }
}

function drawPdfFittedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) {
    ctx.fillText(text, x, y);
    return;
  }
  let clipped = "";
  for (const char of Array.from(text)) {
    const next = `${clipped}${char}`;
    if (ctx.measureText(`${next}…`).width > maxWidth) break;
    clipped = next;
  }
  ctx.fillText(`${clipped || text.slice(0, 1)}…`, x, y);
}

function drawPdfRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fill: string, stroke?: string) {
  drawPdfPathRoundRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawPdfPathRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function pdfSeverityColor(severity: CoachSeverity) {
  if (severity === "HIGH") return PDF_COLORS.red;
  if (severity === "MEDIUM") return PDF_COLORS.gold;
  return PDF_COLORS.blue;
}

function buildImagePdfBlob(imageDataUrls: string[]) {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let offset = 0;
  const pageWidthPt = 595.28;
  const pageHeightPt = 841.89;

  const append = (chunk: string | Uint8Array) => {
    const bytes = typeof chunk === "string" ? encoder.encode(chunk) : chunk;
    chunks.push(bytes);
    offset += bytes.length;
  };
  const beginObject = (id: number) => {
    offsets[id] = offset;
    append(`${id} 0 obj\n`);
  };
  const imageBytes = imageDataUrls.map(dataUrlToBytes);
  const objectCount = 2 + imageBytes.length * 3;
  append("%PDF-1.4\n");

  beginObject(1);
  append("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  beginObject(2);
  const kids = imageBytes.map((_, index) => `${3 + index * 3} 0 R`).join(" ");
  append(`<< /Type /Pages /Kids [${kids}] /Count ${imageBytes.length} >>\nendobj\n`);

  imageBytes.forEach((bytes, index) => {
    const pageId = 3 + index * 3;
    const imageId = pageId + 1;
    const contentId = pageId + 2;
    const imageName = `Im${index + 1}`;
    beginObject(pageId);
    append(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt} ${pageHeightPt}] /Resources << /XObject << /${imageName} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`);
    beginObject(imageId);
    append(`<< /Type /XObject /Subtype /Image /Width ${PDF_CANVAS_WIDTH} /Height ${PDF_CANVAS_HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`);
    append(bytes);
    append("\nendstream\nendobj\n");
    const stream = `q\n${pageWidthPt} 0 0 ${pageHeightPt} 0 0 cm\n/${imageName} Do\nQ\n`;
    beginObject(contentId);
    append(`<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}endstream\nendobj\n`);
  });

  const xrefOffset = offset;
  append(`xref\n0 ${objectCount + 1}\n`);
  append("0000000000 65535 f \n");
  for (let id = 1; id <= objectCount; id += 1) {
    append(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  }
  append(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  const output = new Uint8Array(offset);
  let cursor = 0;
  chunks.forEach((chunk) => {
    output.set(chunk, cursor);
    cursor += chunk.length;
  });
  return new Blob([output.buffer as ArrayBuffer], { type: "application/pdf" });
}

function dataUrlToBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function downloadJson(result: AnalyzeSuccess) {
  const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `hm-ai-analysis-${safeFilePart(result.replay.fileName)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function safeFilePart(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || "replay";
}

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
