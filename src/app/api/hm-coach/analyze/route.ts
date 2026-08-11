export const runtime = "nodejs";
export const maxDuration = 30;

type CoachRequest = {
  replayId?: number | string;
  perspective?: 1 | 2 | string;
  coachUrl?: string;
  coachInput?: StarHmCoachInput;
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CoachRequest;

    if (body.coachInput) {
      return jsonResponse(normalizeCoachPayload(body.coachInput));
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
