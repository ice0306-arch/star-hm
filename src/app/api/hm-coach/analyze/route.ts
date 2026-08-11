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
  commands?: Array<{
    playerId?: number | string;
    type?: string;
    category?: string;
    details?: string;
    unitOrBuilding?: string | null;
  }>;
  buildOrder?: Array<{
    playerId?: number | string;
    label?: string;
    category?: string;
  }>;
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
    `읽은 기록: ${payload.dataContext?.sampleSize ?? "-"}`,
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
  const buildMatchup = stringValue(playerBuild?.matchup);
  const matchup =
    buildMatchup && /v|vs/i.test(buildMatchup)
      ? buildMatchup
      : result.coaching?.scope?.matchup && /v|vs/i.test(result.coaching.scope.matchup)
        ? result.coaching.scope.matchup
        : buildMatchupLabel(perspectivePlayer?.race, opponent?.race);
  const unitHints = collectUnitHints(result, playerId);
  const feedbackItems = buildAnalysisFeedbackItems({
    playerName: perspectivePlayer?.name || "관점 플레이어",
    opponentName: opponent?.name || "상대",
    playerRace: perspectivePlayer?.race,
    opponentRace: opponent?.race,
    matchup,
    unitHints,
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
      confidenceLabel: confidenceText(result.coaching?.scope?.confidence),
      myStrategyFocus: stringValue(playerBuild?.buildName) || "빌드 분류 확인 필요",
      opponentStrategyFocus: opponent ? `${opponent.name} ${raceLabel(opponent.race)}` : "상대 흐름 확인 필요",
    },
    coaching: {
      headline: "이번 판에서 못한 부분",
      verdict: `이번 판에서는 ${perspectivePlayer?.name ?? "관점 플레이어"}가 수치 자체보다 화면에 나온 유닛을 어디에 두고 어떻게 싸웠어야 했는지를 먼저 봐야 했어.`,
      feedbackItems,
      nextGameGuide,
      limitationNote: result.coaching?.scope?.limitations?.join(" ") || "REP 분석 결과에서 확인된 기록만 사용했습니다.",
    },
  };
}

function buildAnalysisFeedbackItems({
  playerName,
  opponentName,
  playerRace,
  opponentRace,
  matchup,
  unitHints,
  build,
  production,
  command,
  hotkey,
  findings,
  playerId,
}: {
  playerName: string;
  opponentName: string;
  playerRace?: string;
  opponentRace?: string;
  matchup: string;
  unitHints: string[];
  build: LooseRecord | null;
  production: LooseRecord | null;
  command: LooseRecord | null;
  hotkey: LooseRecord | null;
  findings: LooseRecord[];
  playerId: string;
}) {
  const buildName = stringValue(build?.buildName);
  const gaps = arrayValue(production?.productionGaps);
  const longestGap = gaps
    .map((gap) => recordValue(gap))
    .filter(Boolean)
    .sort((a, b) => numberValue(b?.duration) - numberValue(a?.duration))[0];
  const effectiveRate = optionalNumberValue(command?.effectiveRate);
  const breadthScore = optionalNumberValue(hotkey?.breadthScore);
  const evidence = {
    buildName,
    longestGapSeconds: longestGap ? Math.round(numberValue(longestGap.duration)) : null,
    longestGapStart: longestGap ? formatSeconds(numberValue(longestGap.startSecond)) : null,
    effectiveRate: effectiveRate === null ? null : Math.round(effectiveRate),
    breadthScore: breadthScore === null ? null : Math.round(breadthScore),
    firstFindingTime: firstFindingTime(findings, playerId),
    unitHints,
  };
  const matchupItems = matchupCoachItems({
    playerName,
    opponentName,
    playerRace,
    opponentRace,
    matchup,
    evidence,
  });

  return matchupItems.slice(0, 3).map((item, index) => ({ ...item, number: index + 1 }));
}

function collectUnitHints(result: AnalyzeSuccessInput, playerId: string) {
  const chunks = [...(result.commands ?? []), ...(result.buildOrder ?? [])]
    .filter((item) => !playerId || stringValue(item.playerId) === playerId)
    .flatMap((item) => [
      stringValue(fieldValue(item, "unitOrBuilding")),
      stringValue(fieldValue(item, "details")),
      stringValue(fieldValue(item, "label")),
      stringValue(fieldValue(item, "category")),
      stringValue(fieldValue(item, "type")),
    ])
    .join(" ")
    .toLowerCase();
  const labels: Array<[string, string[]]> = [
    ["탱크", ["tank", "siege"]],
    ["벌처", ["vulture"]],
    ["마린", ["marine"]],
    ["메딕", ["medic"]],
    ["드라군", ["dragoon"]],
    ["질럿", ["zealot"]],
    ["셔틀", ["shuttle"]],
    ["리버", ["reaver"]],
    ["커세어", ["corsair"]],
    ["하이템플러", ["templar"]],
    ["저글링", ["zergling"]],
    ["뮤탈", ["mutalisk"]],
    ["스커지", ["scourge"]],
    ["히드라", ["hydralisk"]],
    ["럴커", ["lurker"]],
  ];
  return labels.filter(([, tokens]) => tokens.some((token) => chunks.includes(token))).map(([label]) => label);
}

function fieldValue(item: unknown, key: string) {
  return item && typeof item === "object" && key in item ? (item as LooseRecord)[key] : undefined;
}

function firstFindingTime(findings: LooseRecord[], playerId: string) {
  const finding = findings.find((item) => {
    const findingPlayerId = stringValue(item.playerId);
    return !findingPlayerId || !playerId || findingPlayerId === playerId;
  });
  return finding ? formatMs(numberValue(finding.startTimeMs)) : null;
}

function matchupCoachItems({
  playerName,
  opponentName,
  playerRace,
  opponentRace,
  matchup,
  evidence,
}: {
  playerName: string;
  opponentName: string;
  playerRace?: string;
  opponentRace?: string;
  matchup: string;
  evidence: {
    buildName: string;
    longestGapSeconds: number | null;
    longestGapStart: string | null;
    effectiveRate: number | null;
    breadthScore: number | null;
    firstFindingTime: string | null;
    unitHints: string[];
  };
}): StarHmFeedbackItem[] {
  const player = raceCode(playerRace);
  const opponent = raceCode(opponentRace);
  const code = player !== "?" && opponent !== "?" ? `${player}v${opponent}` : matchup.replace(/[^PTZ]/gi, "").toUpperCase();
  const context = evidenceLine(evidence);

  if (code === "TvP") {
    return [
      {
        title: "이번 판에서는 탱크가 먼저 나가기보다 자리를 먼저 잡았어야 했어",
        detail: `${playerName}은 ${opponentName}의 드라군/질럿이 들어오는 각을 먼저 끊고, 벌처 마인으로 길목을 잠근 뒤 탱크를 시즈했어야 했어. 탱크가 앞으로 걸어 나가면 드라군 사거리와 질럿 진입 각을 동시에 내줍니다.${context}`,
        next: "다음 판에는 벌처로 앞 경로에 마인을 먼저 깔고, 탱크는 한 줄씩만 전진시키면서 드라군이 때릴 수 없는 언덕/좁은 길부터 잡으세요.",
      },
      {
        title: "이번 판에서는 벌처를 탱크 앞에서 죽이지 말고 상대 이동을 막는 데 썼어야 했어",
        detail: "벌처는 데미지를 넣는 유닛이라기보다 드라군 이동을 늦추고 질럿 돌파 각을 막는 유닛입니다. 탱크 정면에 던지면 마인을 못 깔고 사라져서 탱크가 바로 노출됩니다.",
        next: "다음 판에는 벌처 시야 → 마인으로 길목 잠금 → 탱크 시즈 → 스타포트/드랍 체크 순서로 보세요.",
      },
    ];
  }

  if (code === "PvT") {
    return [
      {
        title: "이번 판에서는 드라군을 던지기보다 테란 탱크 자리부터 깨뜨렸어야 했어",
        detail: `${playerName}은 드라군을 한 번에 앞으로 밀기 전에, 테란 탱크가 시즈할 자리와 벌처 마인 라인을 먼저 봤어야 했어. 옵저버나 셔틀이 들어가기 전에 드라군이 정면으로 나가면 탱크 포격에 병력만 줄어듭니다.${context}`,
        next: "다음 판에는 옵저버로 탱크 수와 마인 위치를 먼저 보고, 셔틀/질럿이 먼저 맞아주는 동안 드라군은 뒤에서 탱크를 점사하세요.",
      },
      {
        title: "이번 판에서는 질럿을 먼저 던져서 탱크 포신을 빼고 드라군이 때렸어야 했어",
        detail: "테란전 큰 싸움은 드라군만 앞으로 가는 싸움이 아닙니다. 질럿이 먼저 들어가 탱크 포격과 벌처 마인을 빼고, 드라군은 탱크가 자리 잡은 라인을 하나씩 지워야 합니다.",
        next: "다음 판에는 질럿 진입 → 셔틀 하차 → 드라군 탱크 점사 → 후속 게이트 생산 순서로 싸움을 여세요.",
      },
    ];
  }

  if (code === "ZvP") {
    return [
      {
        title: "이번 판에서는 뮤탈이 프로브보다 하이템플러와 커세어를 먼저 끊었어야 했어",
        detail: `${playerName}이 뮤탈로 피해를 내려는 순간에도 먼저 봐야 할 건 프로브 수가 아니라 커세어 수와 하이템플러 위치입니다. 커세어가 쌓이고 스톰이 준비되면 프로브를 조금 잡아도 뮤탈 싸움이 끝납니다.${context}`,
        next: "다음 판에는 뮤탈은 하이템플러를 먼저 찍고, 스커지는 커세어 옆 각으로 보내서 커세어가 정면으로 쫓아오지 못하게 만드세요.",
      },
      {
        title: "이번 판에서는 히드라가 한 점으로 뭉치지 말고 스톰을 빼고 들어갔어야 했어",
        detail: "프로토스가 템플러를 들고 있으면 히드라를 한 덩어리로 밀어 넣는 순간 스톰 한 번에 싸움이 끝납니다. 먼저 저글링이나 뮤탈 움직임으로 스톰을 빼고, 히드라는 넓게 펴서 들어가야 합니다.",
        next: "다음 판에는 저글링으로 앞선 시야를 잡고, 히드라는 옆으로 펼친 뒤 템플러가 보이면 먼저 빼거나 점사하세요.",
      },
    ];
  }

  if (code === "PvZ") {
    return [
      {
        title: "이번 판에서는 커세어가 오버로드만 보지 말고 뮤탈 출발 방향을 먼저 봤어야 했어",
        detail: `${playerName}은 저그전에서 커세어를 띄웠다면 오버로드를 잡는 것보다 뮤탈이 어느 방향에서 나오는지 먼저 확인했어야 했어. 뮤탈 출발을 놓치면 하이템플러와 프로브가 동시에 위험해집니다.${context}`,
        next: "다음 판에는 커세어로 스파이어 이후 뮤탈 출발 방향을 확인하고, 하이템플러는 캐논 뒤쪽에 두고 스톰 에너지를 아끼세요.",
      },
      {
        title: "이번 판에서는 질럿이 드론만 보지 말고 저그 뮤탈 타이밍을 늦췄어야 했어",
        detail: "저그전 초반 질럿은 드론 한두 기보다 가스 채취와 앞마당 운영을 흔들어서 뮤탈 시간을 늦추는 게 더 중요합니다. 무리하게 깊게 들어가 죽으면 이후 커세어/템플러 준비 시간이 부족해집니다.",
        next: "다음 판에는 질럿은 살아서 압박을 유지하고, 커세어와 하이템플러가 갖춰질 때까지 캐논 위치를 먼저 완성하세요.",
      },
    ];
  }

  if (code === "TvZ") {
    return [
      {
        title: "이번 판에서는 마린이 뮤탈을 쫓기보다 벙커와 터렛 라인 안에서 싸웠어야 했어",
        detail: `${playerName}은 뮤탈이 보이면 마린을 밖으로 끌고 나가기보다 터렛/벙커/메딕이 있는 자리로 끌어들였어야 했어. 마린이 열린 공간에서 뮤탈을 쫓으면 스커지와 저글링에 끊기기 쉽습니다.${context}`,
        next: "다음 판에는 마린은 터렛 라인 안에서 스팀 후 점사하고, 메딕은 뒤에 두고, 베슬이나 탱크가 나오기 전까지 밖으로 길게 나가지 마세요.",
      },
      {
        title: "이번 판에서는 탱크가 러커를 보기 전에 먼저 시야와 스캔을 준비했어야 했어",
        detail: "러커 싸움은 탱크 숫자보다 스캔과 마린 위치가 먼저입니다. 시야 없이 탱크가 앞으로 가면 러커에 묶이고, 마린은 러커 앞에서 녹습니다.",
        next: "다음 판에는 스캔 → 마린 산개 → 탱크 시즈 → 베슬/터렛 시야 순서로 러커 라인을 밀어야 합니다.",
      },
    ];
  }

  if (code === "ZvT") {
    return [
      {
        title: "이번 판에서는 저글링으로 테란 진출 시간을 먼저 늦췄어야 했어",
        detail: `${playerName}은 저글링을 드론 피해용으로만 쓰기보다 마린/메딕이 나오는 길목에서 테란 진출 시간을 늦췄어야 했어. 테란 병력이 편하게 중앙을 잡으면 뮤탈이나 러커가 나오기 전 수비가 계속 끌려갑니다.${context}`,
        next: "다음 판에는 저글링은 테란 앞마당과 중앙 길목에 나눠 두고, 마린이 나오는 순간 싸우기보다 진출 방향을 먼저 확인하세요.",
      },
      {
        title: "이번 판에서는 뮤탈이 마린 정면이 아니라 메딕과 탱크 전환을 먼저 끊었어야 했어",
        detail: "뮤탈은 마린 덩어리를 정면으로 때리는 유닛이 아닙니다. 메딕이 빠지거나 탱크/베슬 전환이 늦어지는 순간을 만들어야 테란 병력이 앞으로 못 나옵니다.",
        next: "다음 판에는 뮤탈은 마린 정면을 피하고, 메딕이 벌어진 순간이나 본진 생산 라인을 찍고 바로 빠지세요.",
      },
    ];
  }

  if (code === "ZvZ") {
    return [
      {
        title: "이번 판에서는 저글링으로 뮤탈 타이밍을 먼저 늦추고 드론을 잡았어야 했어",
        detail: `${playerName}은 저글링을 드론만 보러 넣기보다 상대 가스와 앞마당 동선을 흔들어서 뮤탈 출발 시간을 늦췄어야 했어. 저글링을 무리하게 깊게 넣어 잃으면 이후 뮤탈 싸움에서 시야와 숫자가 같이 밀립니다.${context}`,
        next: "다음 판에는 저글링은 드론 킬보다 가스 타이밍과 뮤탈 출발 방향 확인을 먼저 목표로 두세요.",
      },
      {
        title: "이번 판에서는 뮤탈 싸움 전에 스커지를 옆 각으로 보냈어야 했어",
        detail: "뮤탈끼리 정면으로만 싸우면 숫자 싸움이 됩니다. 스커지를 옆으로 보내 상대 뮤탈 움직임을 제한하고, 내 뮤탈은 드론 피해를 낸 뒤 잃지 않고 빠졌어야 합니다.",
        next: "다음 판에는 저글링 정찰 유지 → 뮤탈 출발 방향 확인 → 스커지 옆 각 → 피해 후 이탈 순서로 보세요.",
      },
    ];
  }

  if (code === "PvP") {
    return [
      {
        title: "이번 판에서는 드라군을 먼저 던지지 말고 리버/셔틀 각을 먼저 봤어야 했어",
        detail: `${playerName}은 드라군 숫자만 보고 앞으로 나가기보다 상대 리버와 셔틀 위치를 먼저 확인했어야 했어. 프프전은 드라군 몇 기보다 리버 한 방과 셔틀 시야가 싸움을 갈라요.${context}`,
        next: "다음 판에는 옵저버로 로보 타이밍을 보고, 드라군은 셔틀 점사 각을 유지한 채 리버가 때릴 자리를 먼저 막으세요.",
      },
      {
        title: "이번 판에서는 셔틀이 보이면 드라군 점사를 먼저 맞췄어야 했어",
        detail: "셔틀을 놓치면 리버가 원하는 위치에서 먼저 쏩니다. 드라군은 정면 병력보다 셔틀을 먼저 찍고, 리버가 내리면 내 리버나 드라군으로 리버를 먼저 봤어야 합니다.",
        next: "다음 판에는 셔틀 시야 확보 → 드라군 셔틀 점사 → 리버 하차 위치 차단 순서로 싸우세요.",
      },
    ];
  }

  if (code === "TvT") {
    return [
      {
        title: "이번 판에서는 탱크가 먼저 많이 나가기보다 자리를 먼저 잡았어야 했어",
        detail: `${playerName}은 탱크를 한 번에 전진시키기보다 벌처 시야와 마인으로 길목을 잠그고 시즈 라인을 먼저 만들었어야 했어. 탱크가 자리 없이 걸어가면 상대 탱크 첫 포격에 라인이 무너집니다.${context}`,
        next: "다음 판에는 벌처 시야 → 마인 길목 잠금 → 탱크 한 줄 시즈 → 레이스/드랍 체크 순서로 전진하세요.",
      },
      {
        title: "이번 판에서는 벌처를 탱크 앞에 던지지 말고 상대 이동을 막는 데 썼어야 했어",
        detail: "테테전 벌처는 탱크 대신 맞아주는 유닛이 아니라 상대 탱크가 자리 잡기 전에 길목을 막는 유닛입니다. 벌처가 사라지면 내 탱크는 시야 없이 움직이게 됩니다.",
        next: "다음 판에는 벌처는 상대 진입로와 언덕 아래에 먼저 두고, 탱크는 시야가 있는 곳까지만 전진시키세요.",
      },
    ];
  }

  return [
    {
      title: "이번 판에서는 수치보다 첫 교전에서 유닛이 맡아야 할 역할을 먼저 정했어야 했어",
      detail: `${playerName}은 ${opponentName}과의 ${matchup}에서 병력을 한 덩어리로 움직이기보다, 앞에서 맞아줄 유닛과 뒤에서 때릴 유닛을 나눠 싸웠어야 했어.${context}`,
      next: "다음 판에는 교전 직전 내 병력 중 누가 먼저 맞고, 누가 점사하고, 누가 빠질지 정한 뒤 싸움을 여세요.",
    },
  ];
}

function raceCode(value?: string) {
  const lower = (value ?? "").toLowerCase();
  if (lower.startsWith("t")) return "T";
  if (lower.startsWith("z")) return "Z";
  if (lower.startsWith("p")) return "P";
  return "?";
}

function evidenceLine(evidence: {
  buildName: string;
  longestGapSeconds: number | null;
  longestGapStart: string | null;
  effectiveRate: number | null;
  breadthScore: number | null;
  firstFindingTime: string | null;
  unitHints: string[];
}) {
  const parts = [
    evidence.buildName ? `초반 선택은 ${evidence.buildName}로 읽혔고` : "",
    evidence.unitHints.length ? `기록에 보인 핵심 유닛은 ${evidence.unitHints.slice(0, 4).join(", ")}입니다` : "",
    evidence.firstFindingTime ? `먼저 볼 구간은 ${evidence.firstFindingTime}입니다` : "",
  ].filter(Boolean);
  return parts.length ? ` 기록 근거로는 ${parts.join(". ")}.` : "";
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
