export const runtime = "nodejs";
export const maxDuration = 30;

type CoachRequest = {
  replayId?: number | string;
  perspective?: 1 | 2 | string;
  coachUrl?: string;
  coachInput?: StarHmCoachInput;
  analysisResult?: AnalyzeSuccessInput;
};

type LooseRecord = Record<string, unknown>;

type AnalyzeSuccessInput = {
  success?: boolean;
  replay?: {
    durationSeconds?: number | null;
    map?: {
      name?: string | null;
    };
  };
  players?: Array<{
    id?: number | string;
    name?: string;
    race?: string;
    observer?: boolean;
    result?: {
      outcome?: string;
    };
  }>;
  semantic?: {
    buildClassifications?: LooseRecord[];
    productionReports?: LooseRecord[];
    commandEfficiency?: LooseRecord[];
    hotkeyReports?: LooseRecord[];
  };
  buildClassifications?: LooseRecord[];
  productionReports?: LooseRecord[];
  commandEfficiency?: LooseRecord[];
  hotkeyReports?: LooseRecord[];
  coaching?: {
    scope?: {
      matchup?: string;
      confidence?: number;
      limitations?: string[];
    };
    findings?: LooseRecord[];
  };
  canonical?: {
    commandCount?: number;
  };
};

type StarHmFeedbackItem = {
  number?: number;
  label?: string;
  title: string;
  detail: string;
  next?: string;
};

type StarHmCoachInput = {
  ok?: boolean;
  schema?: string;
  match?: {
    map?: string;
    durationLabel?: string;
  };
  perspective?: {
    player?: string;
    opponent?: string;
    matchup?: string;
    resultLabel?: string;
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
    feedbackItems?: StarHmFeedbackItem[];
    nextGameGuide?: string[];
    limitationNote?: string;
  };
  aiAnalysisInput?: unknown;
};

const DEFAULT_LOCAL_COACH_URL = "http://127.0.0.1:8899";

function jsonResponse(payload: unknown, status = 200) {
  return Response.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function buildAiPrompt(payload: StarHmCoachInput) {
  const feedback = payload.coaching?.feedbackItems ?? [];
  const guide = payload.coaching?.nextGameGuide ?? [];

  return [
    "너는 StarCraft: Brood War 리플레이 코치다.",
    "일반론이 아니라 이 판에서 선택 관점 플레이어가 무엇을 했어야 했는지 말한다.",
    "문장은 코칭 영상처럼 짧고 단호하게 쓴다.",
    "",
    "[경기]",
    `맵: ${payload.match?.map ?? "-"}`,
    `관점: ${payload.perspective?.player ?? "-"} vs ${payload.perspective?.opponent ?? "-"}`,
    `매치업: ${payload.perspective?.matchup ?? "-"}`,
    `결과: ${payload.perspective?.resultLabel ?? "-"}`,
    `길이: ${payload.match?.durationLabel ?? "-"}`,
    "",
    "[데이터]",
    `샘플: ${payload.dataContext?.sampleSize ?? "-"}`,
    `신뢰도: ${payload.dataContext?.confidenceLabel ?? "-"}`,
    `내 전략 축: ${payload.dataContext?.myStrategyFocus ?? "-"}`,
    `상대 흐름: ${payload.dataContext?.opponentStrategyFocus ?? "-"}`,
    "",
    "[이번 판에서 못한 부분]",
    ...feedback.flatMap((item, index) => [
      `${index + 1}. ${item.title}`,
      `- 근거: ${item.detail}`,
      `- 다음 판에는: ${item.next ?? "-"}`,
    ]),
    "",
    "[다음 판 실행 순서]",
    ...guide.map((item, index) => `${index + 1}. ${item}`),
  ].join("\n");
}

function normalizeCoachPayload(payload: StarHmCoachInput) {
  const feedbackItems = payload.coaching?.feedbackItems ?? [];

  return {
    ok: true,
    source: "hm-coach-engine",
    coachInput: payload,
    aiAnalysisInput: payload.aiAnalysisInput,
    aiPrompt: buildAiPrompt(payload),
    feedbackItems,
    nextGameGuide: payload.coaching?.nextGameGuide ?? [],
    summary: {
      map: payload.match?.map,
      matchup: payload.perspective?.matchup,
      result: payload.perspective?.resultLabel,
      confidence: payload.dataContext?.confidenceLabel,
      feedbackCount: feedbackItems.length,
    },
  };
}

function buildCoachInputFromAnalysisResult(result: AnalyzeSuccessInput): StarHmCoachInput {
  const players = (result.players ?? []).filter((player) => !player.observer);
  const perspectivePlayer = players.find((player) => player.result?.outcome === "LOSS") ?? players[0] ?? null;
  const opponent = players.find((player) => player !== perspectivePlayer) ?? null;
  const playerId = String(perspectivePlayer?.id ?? "");
  const buildClassifications = result.semantic?.buildClassifications ?? result.buildClassifications ?? [];
  const productionReports = result.semantic?.productionReports ?? result.productionReports ?? [];
  const commandEfficiency = result.semantic?.commandEfficiency ?? result.commandEfficiency ?? [];
  const hotkeyReports = result.semantic?.hotkeyReports ?? result.hotkeyReports ?? [];
  const findings = result.coaching?.findings ?? [];
  const playerBuild = findReportForPlayer(buildClassifications, playerId);
  const playerProduction = findReportForPlayer(productionReports, playerId);
  const playerCommand = findReportForPlayer(commandEfficiency, playerId);
  const playerHotkey = findReportForPlayer(hotkeyReports, playerId);
  const matchup = stringValue(playerBuild?.matchup) || result.coaching?.scope?.matchup || buildMatchupLabel(perspectivePlayer?.race, opponent?.race);
  const feedbackItems = buildAnalysisFeedbackItems({
    playerName: perspectivePlayer?.name || "관점 플레이어",
    opponentName: opponent?.name || "상대",
    build: playerBuild,
    production: playerProduction,
    command: playerCommand,
    hotkey: playerHotkey,
    findings,
    playerId,
  });
  const nextGameGuide = feedbackItems.slice(0, 4).map((item) => item.next || item.detail);

  return {
    ok: true,
    schema: "star-hm-coach-from-replay-analysis-v1",
    match: {
      map: result.replay?.map?.name ?? "맵 확인 필요",
      durationLabel: formatDuration(result.replay?.durationSeconds ?? null),
    },
    perspective: {
      player: perspectivePlayer?.name ?? "관점 플레이어",
      opponent: opponent?.name ?? "상대",
      matchup,
      resultLabel: perspectivePlayer?.result?.outcome === "WIN" ? "승리" : perspectivePlayer?.result?.outcome === "LOSS" ? "패배" : "결과 확인 필요",
    },
    dataContext: {
      sampleSize: result.canonical?.commandCount ?? undefined,
      confidenceLabel: confidenceText(result.coaching?.scope?.confidence),
      myStrategyFocus: stringValue(playerBuild?.buildName) || "빌드 분류 확인 필요",
      opponentStrategyFocus: opponent ? `${opponent.name} ${raceLabel(opponent.race)}` : "상대 흐름 확인 필요",
    },
    coaching: {
      headline: "HM 자동 코칭",
      verdict: `이번 판에서는 ${perspectivePlayer?.name ?? "관점 플레이어"}가 기록에 나온 문제 구간을 먼저 고쳤어야 했어.`,
      feedbackItems,
      nextGameGuide,
      limitationNote: result.coaching?.scope?.limitations?.join(" ") || "REP 분석 결과에서 확인된 기록만 사용했습니다.",
    },
    aiAnalysisInput: result,
  };
}

function buildAnalysisFeedbackItems({
  playerName,
  opponentName,
  build,
  production,
  command,
  hotkey,
  findings,
  playerId,
}: {
  playerName: string;
  opponentName: string;
  build: LooseRecord | null;
  production: LooseRecord | null;
  command: LooseRecord | null;
  hotkey: LooseRecord | null;
  findings: LooseRecord[];
  playerId: string;
}) {
  const findingItems = findings
    .filter((finding) => {
      const findingPlayerId = stringValue(finding.playerId);
      return !findingPlayerId || !playerId || findingPlayerId === playerId;
    })
    .slice(0, 4)
    .map((finding, index) => {
      const time = formatMs(numberValue(finding.startTimeMs));
      const title = stringValue(finding.title) || stringValue(finding.category) || "확인할 장면";
      const summary = stringValue(finding.summary) || stringValue(finding.whyItMatters) || title;
      const nextAction = stringValue(finding.nextAction) || "같은 상황에서 먼저 해야 할 행동을 정했어야 했어";
      return {
        number: index + 1,
        label: time,
        title: `${time} ${title}`,
        detail: `이번 판에서는 ${playerName}이 ${time} 장면에서 ${summary} 흐름을 그냥 넘기지 말고 바로 수정했어야 했어.`,
        next: `이번 판에서는 ${nextAction.replace(/[.。]+$/g, "")} 했어야 했어.`,
      };
    });

  const metricItems: StarHmFeedbackItem[] = [];
  const buildName = stringValue(build?.buildName);
  if (buildName) {
    metricItems.push({
      title: "빌드 방향 고정",
      detail: `이번 판에서는 ${playerName}이 ${buildName}으로 분류된 초반 흐름을 탔기 때문에 ${opponentName}의 전환 타이밍을 먼저 확인했어야 했어.`,
      next: `이번 판에서는 ${buildName} 이후 정찰과 생산 전환을 한 박자 먼저 맞췄어야 했어.`,
    });
  }

  const gaps = arrayValue(production?.productionGaps);
  const longestGap = gaps
    .map((gap) => recordValue(gap))
    .filter(Boolean)
    .sort((a, b) => numberValue(b?.duration) - numberValue(a?.duration))[0];
  if (longestGap && numberValue(longestGap.duration) > 0) {
    metricItems.push({
      title: "생산 공백 정리",
      detail: `이번 판에서는 ${playerName}이 ${formatSeconds(numberValue(longestGap.startSecond))}부터 ${Math.round(numberValue(longestGap.duration))}초 동안 생산이 비기 전에 미리 예약 생산을 걸었어야 했어.`,
      next: `이번 판에서는 교전이나 이동 전에 생산 건물을 한 번 먼저 찍었어야 했어.`,
    });
  }

  const effectiveRate = optionalNumberValue(command?.effectiveRate);
  if (effectiveRate !== null) {
    metricItems.push({
      title: "유효 명령 비율",
      detail: `이번 판에서는 ${playerName}이 유효 명령 비율 ${Math.round(effectiveRate)}% 구간에서 반복 클릭보다 생산, 이동, 정찰 명령으로 입력을 바꿨어야 했어.`,
      next: `이번 판에서는 손이 바쁠수록 같은 명령 반복을 줄이고 다음 해야 할 명령으로 넘겼어야 했어.`,
    });
  }

  const breadthScore = optionalNumberValue(hotkey?.breadthScore);
  if (breadthScore !== null) {
    metricItems.push({
      title: "부대지정 폭",
      detail: `이번 판에서는 ${playerName}이 부대지정 활용 점수 ${Math.round(breadthScore)} 기준으로 병력과 생산 건물을 더 나눠 잡았어야 했어.`,
      next: `이번 판에서는 주 병력, 생산, 정찰 화면을 따로 묶어서 화면 전환 시간을 줄였어야 했어.`,
    });
  }

  const combined = [...findingItems, ...metricItems].slice(0, 6);
  if (combined.length) {
    return combined.map((item, index) => ({ ...item, number: item.number ?? index + 1 }));
  }
  return [
    {
      number: 1,
      title: "기록 기반 복기",
      detail: `이번 판에서는 ${playerName}이 초반 빌드, 생산 공백, 단축키 기록을 먼저 확인하고 가장 크게 흔들린 구간부터 고쳤어야 했어.`,
      next: "이번 판에서는 감으로 넘기지 말고 REP 기록에 나온 첫 문제 시간부터 다시 봤어야 했어.",
    },
  ];
}

function findReportForPlayer(items: LooseRecord[], playerId: string) {
  return items.find((item) => stringValue(item.playerId) === playerId) ?? items[0] ?? null;
}

function recordValue(value: unknown): LooseRecord | null {
  return value && typeof value === "object" ? (value as LooseRecord) : null;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function numberValue(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function optionalNumberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function buildMatchupLabel(playerRace?: string, opponentRace?: string) {
  const player = raceLabel(playerRace);
  const opponent = raceLabel(opponentRace);
  return player && opponent ? `${player} vs ${opponent}` : "매치업 확인 필요";
}

function raceLabel(value?: string) {
  const lower = (value ?? "").toLowerCase();
  if (lower.startsWith("t")) return "Terran";
  if (lower.startsWith("z")) return "Zerg";
  if (lower.startsWith("p")) return "Protoss";
  return value || "";
}

function confidenceText(value?: number) {
  if (!Number.isFinite(value)) return "REP 분석 기반";
  const percent = Math.round((value ?? 0) * 100);
  if (percent >= 80) return `높음 ${percent}%`;
  if (percent >= 55) return `보통 ${percent}%`;
  return `낮음 ${percent}%`;
}

function formatDuration(value: number | null) {
  if (!Number.isFinite(value ?? NaN)) return "시간 확인 필요";
  return formatSeconds(value ?? 0);
}

function formatSeconds(value: number) {
  const total = Math.max(0, Math.round(value));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatMs(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "초반";
  return formatSeconds(value / 1000);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CoachRequest;

    if (body.coachInput) {
      return jsonResponse(normalizeCoachPayload(body.coachInput));
    }

    if (body.analysisResult) {
      return jsonResponse(normalizeCoachPayload(buildCoachInputFromAnalysisResult(body.analysisResult)));
    }

    const replayId = Number(body.replayId);
    const perspective = Number(body.perspective ?? 1);

    if (!Number.isFinite(replayId) || replayId <= 0) {
      return jsonResponse({ ok: false, error: "replayId is required" }, 400);
    }

    const coachBaseUrl = body.coachUrl || process.env.HM_COACH_ENGINE_URL || DEFAULT_LOCAL_COACH_URL;
    const url = new URL("/api/star-hm/coach", coachBaseUrl);
    url.searchParams.set("id", String(replayId));
    url.searchParams.set("perspective", perspective === 2 ? "2" : "1");

    const coachResponse = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const payload = (await coachResponse.json()) as StarHmCoachInput & { error?: string };

    if (!coachResponse.ok || payload?.ok === false) {
      return jsonResponse(
        {
          ok: false,
          error: payload?.error || "coach engine request failed",
          coachStatus: coachResponse.status,
        },
        502,
      );
    }

    return jsonResponse(normalizeCoachPayload(payload));
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : "unknown error",
      },
      500,
    );
  }
}
