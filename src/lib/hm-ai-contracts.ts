export const HM_AI_COPY = {
  serviceNameKo: "HM AI 분석툴",
  serviceNameEn: "HM AI ANALYSIS TOOL",
  productDescriptionEn: "REPLAY COACH REPORT",
  hero: "리플레이를 올리면 경기 흐름을 한눈에 정리합니다.",
  supporting: "몇 초에 생산이 끊겼는지, 손은 바빴는데 왜 결과가 안 나왔는지, 다음 게임에서 무엇을 고치면 좋을지 쉽게 보여줍니다.",
} as const;

export const CONFIDENCE_POLICY_CONFIG = {
  version: "confidence-policy/2026-08-01",
  high: 0.9,
  medium: 0.7,
  low: 0.5,
  hideBelow: 0.5,
  lowDisplayLabel: "가능성 있음",
} as const;

export const MATCH_SOURCE_LABELS = {
  DIRECT_UPLOAD: "직접 업로드",
  HM_AI_COLLECTOR: "HM AI Collector",
  REMASTERED: "RepMastered",
  CWAL: "Cwal",
  BATTLE_NET_LADDER: "Battle.net Ladder",
  ADMIN_IMPORT: "관리자 등록",
  UNKNOWN: "출처 미확인",
} as const;

export const HM_AI_ANALYSIS_STAGES = [
  { code: "UPLOADING", label: "파일 받기" },
  { code: "VALIDATING", label: "리플레이 확인" },
  { code: "HASHING", label: "중복 확인" },
  { code: "PARSING", label: "경기 읽기" },
  { code: "NORMALIZING", label: "시간대 정리" },
  { code: "SEMANTIC_ANALYSIS", label: "코치 해석" },
  { code: "BENCHMARKING", label: "비슷한 경기 비교" },
  { code: "REPORTING", label: "리포트 만들기" },
] as const;

export type AnalysisStageCode = (typeof HM_AI_ANALYSIS_STAGES)[number]["code"];

export const CANONICAL_REPLAY_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://star-hm.vercel.app/schemas/hm-canonical-replay.schema.json",
  title: "HM AI Canonical Replay",
  type: "object",
  required: ["replayId", "parser", "header", "map", "players", "commands", "rawMetadata"],
  properties: {
    replayId: { type: "string" },
    parser: {
      type: "object",
      required: ["name", "version"],
      properties: {
        name: { type: "string" },
        version: { type: "string" },
        commitSha: { type: "string" },
      },
      additionalProperties: false,
    },
    header: { type: "object" },
    map: { type: "object" },
    players: { type: "array", items: { type: "object" } },
    commands: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "playerId", "frame", "second", "type"],
        properties: {
          id: { type: "string" },
          playerId: { type: "string" },
          frame: { type: "number" },
          second: { type: "number" },
          type: { type: "string" },
          subtype: { type: "string" },
          unitIds: { type: "array", items: { type: "string" } },
          unitType: { type: "string" },
          targetUnitId: { type: "string" },
          position: {
            type: "object",
            required: ["x", "y"],
            properties: {
              x: { type: "number" },
              y: { type: "number" },
            },
            additionalProperties: false,
          },
          hotkey: { type: "number" },
          payload: { type: "object" },
        },
        additionalProperties: true,
      },
    },
    alliances: { type: "array", items: { type: "object" } },
    chats: { type: "array", items: { type: "object" } },
    exits: { type: "array", items: { type: "object" } },
    rawMetadata: { type: "object" },
  },
  additionalProperties: false,
} as const;
