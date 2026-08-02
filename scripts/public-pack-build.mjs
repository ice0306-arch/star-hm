import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { runSqlite } from "../tools/hm-ai-admin/db.mjs";

const PACK_DIR = "public/hm-ai-data";
const files = ["knowledge.json", "rules.json", "coverage.json", "pro-reference-stats.json", "win-conditions.json"];

await buildWinConditions();

const manifest = {
  schemaVersion: "hm-ai-public-pack-manifest/2026-08-03",
  version: seoulDateVersion(),
  generatedAt: new Date().toISOString(),
  minimumAppVersion: "hm-ai-rule-engine/0.2.0",
  approvedItemCount: 0,
  supportedMatchups: [],
  supportedMaps: [],
  supportedBuilds: [],
  winConditionCount: 0,
  files: {},
};

for (const file of files) {
  const path = join(PACK_DIR, file);
  const bytes = await readFile(path);
  manifest.files[file] = {
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes: bytes.length,
  };
  if (file === "knowledge.json") {
    const items = JSON.parse(bytes.toString("utf8"));
    const approved = items.filter((item) => item.status === "approved");
    manifest.approvedItemCount = approved.length;
    manifest.supportedMatchups = [...new Set(approved.flatMap((item) => item.matchup ?? []))].sort();
    manifest.supportedMaps = [...new Set(approved.flatMap((item) => item.maps ?? []))].sort();
    manifest.supportedBuilds = [...new Set(approved.flatMap((item) => item.builds ?? []))].sort();
  }
  if (file === "win-conditions.json") {
    const model = JSON.parse(bytes.toString("utf8"));
    manifest.winConditionCount = model.conditions?.length ?? 0;
  }
}

await writeFile(join(PACK_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`built ${join(PACK_DIR, "manifest.json")}`);

async function buildWinConditions() {
  const samples = await loadTrainingSamples();
  const winners = samples.filter((sample) => sample.player?.winnerPerspective && sample.player?.result === "WIN");
  const groups = new Map();
  for (const sample of winners) {
    const classification = sample.buildClassifications?.[0] ?? {};
    const key = [
      sample.player?.race ?? "Unknown",
      classification.matchup ?? "Unknown",
      sample.map ?? "Unknown map",
      classification.buildCode ?? "unknown-build",
    ].join("|");
    if (!groups.has(key)) {
      groups.set(key, {
        race: sample.player?.race ?? "Unknown",
        matchup: classification.matchup ?? "Unknown",
        map: sample.map ?? "Unknown map",
        buildCode: classification.buildCode ?? "unknown-build",
        buildName: classification.buildName ?? "빌드 미분류",
        samples: [],
      });
    }
    groups.get(key).samples.push(sample);
  }

  const conditions = [...groups.values()]
    .filter((group) => group.samples.length >= 1)
    .map((group) => buildCondition(group))
    .sort((a, b) => b.sampleCount - a.sampleCount || a.race.localeCompare(b.race));

  const model = {
    schemaVersion: "hm-ai-win-conditions/2026-08-03",
    generatedAt: new Date().toISOString(),
    modelType: "winner-replay-derived-thresholds",
    description: "승리한 REP에서 반복된 빌드, 생산 유지, 도움 되는 명령 비중, 부대지정 흐름을 기준값으로 만든 자동 승리 조건 모델입니다.",
    limitations: [
      "실제 스타크래프트 엔진 시뮬레이션이 아니라 REP 명령 로그 기반 판정입니다.",
      "자원, 서플라이, 유닛 생존 상태는 현재 파서 데이터만으로 완전 복원하지 않습니다.",
      "새 REP 평가는 승패 예언이 아니라 승리 조건 충족도 점수입니다.",
    ],
    totalWinnerSamples: winners.length,
    conditions,
  };
  await writeFile(join(PACK_DIR, "win-conditions.json"), `${JSON.stringify(model, null, 2)}\n`);
}

async function loadTrainingSamples() {
  try {
    const output = await runSqlite([], "select sample_json from training_samples;");
    return output
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .filter((sample) => sample && typeof sample === "object");
  } catch {
    return [];
  }
}

function buildCondition(group) {
  const commandRates = group.samples.map((sample) => Number(sample.commandEfficiency?.effectiveRate)).filter(Number.isFinite);
  const eapms = group.samples.map((sample) => Number(sample.player?.eapm)).filter(Number.isFinite);
  const productionScores = group.samples.map((sample) => Number(sample.productionReport?.stabilityScore)).filter(Number.isFinite);
  const productionGaps = group.samples.map((sample) => maxGap(sample.productionReport?.productionGaps ?? [])).filter(Number.isFinite);
  const hotkeyScores = group.samples.map((sample) => Number(sample.hotkeyReport?.breadthScore)).filter(Number.isFinite);
  const readinessScores = group.samples.map((sample) => Number(sample.winReadiness?.score)).filter(Number.isFinite);
  const patternTitles = topValues(group.samples.flatMap((sample) => (sample.victoryPatterns ?? []).map((pattern) => pattern.title)).filter(Boolean), 4);

  return {
    id: stableConditionID(group),
    race: group.race,
    matchup: group.matchup,
    map: group.map,
    buildCode: group.buildCode,
    buildName: group.buildName,
    sampleCount: group.samples.length,
    thresholds: {
      minimumEapm: rounded(percentile(eapms, 0.25)),
      minimumEffectiveRate: rounded(percentile(commandRates, 0.25)),
      minimumProductionStability: rounded(percentile(productionScores, 0.25)),
      maximumProductionGapSeconds: rounded(percentile(productionGaps, 0.75)),
      minimumHotkeyBreadth: rounded(percentile(hotkeyScores, 0.25)),
      minimumWinReadinessScore: rounded(percentile(readinessScores, 0.25)),
    },
    repeatedWinningCases: patternTitles,
    coachingUse: "새 REP가 이 기준보다 낮으면 해당 항목이 패배 가능성을 키운 원인 후보입니다. 기준보다 높으면 승리 조건을 갖춘 장면으로 보고 다음 교전·운영 판단을 확인합니다.",
    confidence: confidenceForSampleCount(group.samples.length),
  };
}

function stableConditionID(group) {
  return `win-${slug([group.race, group.matchup, group.map, group.buildCode].join("-"))}`;
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 96) || "unknown";
}

function maxGap(gaps) {
  return gaps.reduce((max, gap) => Math.max(max, Number(gap.duration) || 0), 0);
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[index];
}

function rounded(value) {
  return value == null ? null : Math.round(value * 10) / 10;
}

function topValues(values, limit) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([title, count]) => ({ title, count }));
}

function confidenceForSampleCount(count) {
  if (count >= 20) return 0.82;
  if (count >= 10) return 0.74;
  if (count >= 3) return 0.64;
  return 0.52;
}

function seoulDateVersion() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parts.replaceAll("-", ".");
}
