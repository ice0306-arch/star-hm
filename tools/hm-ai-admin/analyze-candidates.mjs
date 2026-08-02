import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { runSqlite } from "./db.mjs";

const limit = Math.min(Math.max(Number(process.env.HM_AI_ANALYZE_LIMIT ?? 5), 1), 50);
const goCacheDir = process.env.GOCACHE || "/private/tmp/hm-ai-go-build-cache";
const goModCacheDir = process.env.GOMODCACHE || "/private/tmp/hm-ai-go-mod-cache";
const remoteAnalyzerEndpoint = process.env.HM_AI_ANALYZER_ENDPOINT || "https://star-hm.vercel.app/api/replays/analyze?compact=admin";
await mkdir(goCacheDir, { recursive: true });
await mkdir(goModCacheDir, { recursive: true });
const rows = await selectRows(
  `select id, file_name, file_path, file_size, sha256
   from replays
   where status in ('candidate', 'downloaded', 'analysis_failed')
     and id not in (select replay_id from replay_analysis where status='completed')
   order by created_at asc
   limit ${limit};`,
);

const summary = {
  ok: true,
  requestedLimit: limit,
  candidates: rows.length,
  analyzed: 0,
  failed: 0,
  results: [],
};

emitProgress({
  phase: rows.length ? "분석할 REP를 찾았습니다" : "분석할 REP가 없습니다",
  total: rows.length,
  analyzed: 0,
  failed: 0,
  currentFile: rows[0]?.file_name ?? null,
});

for (const row of rows) {
  emitProgress({
    phase: "REP 분석 중",
    total: rows.length,
    analyzed: summary.analyzed,
    failed: summary.failed,
    currentFile: row.file_name,
  });

  if (!existsSync(row.file_path)) {
    await markReplayFailed(row.id, `파일을 찾을 수 없습니다: ${row.file_path}`);
    summary.failed += 1;
    summary.results.push({ replayId: row.id, fileName: row.file_name, ok: false, error: "file_missing" });
    emitProgress({
      phase: "REP 분석 중",
      total: rows.length,
      analyzed: summary.analyzed,
      failed: summary.failed,
      currentFile: row.file_name,
    });
    continue;
  }

  try {
    const analysis = await analyzeReplay(row.file_path, row.file_name);
    await persistAnalysis(row, analysis.result);
    summary.analyzed += 1;
    summary.results.push({
      replayId: row.id,
      fileName: row.file_name,
      ok: true,
      players: analysis.result.players?.map((player) => player.name) ?? [],
      findings: analysis.result.coaching?.findings?.length ?? 0,
      victoryPatterns: analysis.result.coaching?.victoryPatterns?.length ?? 0,
      facts: analysis.result.coaching?.facts?.length ?? 0,
      samples: analysis.result.players?.filter((player) => !player.observer).length ?? 0,
    });
    emitProgress({
      phase: "REP 분석 중",
      total: rows.length,
      analyzed: summary.analyzed,
      failed: summary.failed,
      currentFile: row.file_name,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markReplayFailed(row.id, message);
    summary.failed += 1;
    summary.results.push({ replayId: row.id, fileName: row.file_name, ok: false, error: message });
    emitProgress({
      phase: "REP 분석 중",
      total: rows.length,
      analyzed: summary.analyzed,
      failed: summary.failed,
      currentFile: row.file_name,
    });
  }
}

emitProgress({
  phase: "분석 완료",
  total: rows.length,
  analyzed: summary.analyzed,
  failed: summary.failed,
  currentFile: null,
});

console.log(JSON.stringify(summary, null, 2));

function emitProgress(progress) {
  console.error(`HM_AI_PROGRESS ${JSON.stringify(progress)}`);
}

async function persistAnalysis(row, result) {
  const analysisId = randomUUID();
  const analysisJson = JSON.stringify(result);
  const replay = result.replay ?? {};
  const map = replay.map ?? {};
  const durationSeconds = replay.durationSeconds ?? null;

  const statements = [
    "begin;",
    `update replays set status='analyzed', map_name=${sql(map.name)}, map_hash=${sql(replay.exactFingerprint)}, duration_seconds=${num(durationSeconds)}, game_type=${sql(replay.gameType)}, game_version=${sql(result.parser?.version)}, updated_at=datetime('now') where id=${sql(row.id)};`,
    `insert into replay_analysis(id, replay_id, analyzer_version, status, analysis_json) values (${sql(analysisId)}, ${sql(row.id)}, ${sql(result.analysisRun?.semanticEngineVersion ?? "hm-ai-local")}, 'completed', ${sql(analysisJson)});`,
  ];

  for (const player of result.players ?? []) {
    const playerId = randomUUID();
    statements.push(
      `insert into replay_players(id, replay_id, player_slot, player_name, normalized_id, race, team, result, learning_scope, status) values (${sql(playerId)}, ${sql(row.id)}, ${sql(String(player.id))}, ${sql(player.name)}, ${sql(normalizeName(player.name))}, ${sql(player.race)}, ${num(player.team)}, ${sql(player.result?.status ?? player.result?.outcome)}, 'analysis_candidate', 'candidate');`,
    );
    if (!player.observer) {
      const sample = buildTrainingSample(result, player);
      statements.push(
        `insert into training_samples(id, replay_id, player_id, sample_json, status) values (${sql(randomUUID())}, ${sql(row.id)}, ${sql(playerId)}, ${sql(JSON.stringify(sample))}, 'candidate');`,
      );
    }
  }

  for (const fact of result.coaching?.facts ?? []) {
    statements.push(
      `insert into replay_facts(id, replay_id, player_id, frame, time_ms, category, description, source, visibility, confidence, x, y, data_json) values (${sql(randomUUID())}, ${sql(row.id)}, ${sql(fact.playerId)}, null, ${num(fact.timeMs)}, ${sql(fact.category)}, ${sql(fact.label)}, ${sql(fact.source)}, ${sql(fact.visibility)}, ${num(fact.confidence)}, ${num(fact.x)}, ${num(fact.y)}, ${sql(JSON.stringify(fact))});`,
    );
  }

  for (const finding of result.coaching?.findings ?? []) {
    statements.push(
      `insert into coach_findings(id, replay_id, player_id, category, severity, start_time_ms, end_time_ms, evidence_ids_json, knowledge_ids_json, finding_json, review_status) values (${sql(randomUUID())}, ${sql(row.id)}, null, ${sql(finding.category)}, ${sql(finding.severity)}, ${num(finding.startTimeMs)}, ${num(finding.endTimeMs)}, ${sql(JSON.stringify(finding.evidenceIds ?? []))}, ${sql(JSON.stringify(finding.knowledgeIds ?? []))}, ${sql(JSON.stringify(finding))}, 'unreviewed');`,
    );
  }

  statements.push("commit;");
  await runSqlite([], statements.join("\n"));
}

function buildTrainingSample(result, player) {
  return {
    schemaVersion: "hm-ai-training-sample/2026-08-03",
    source: "local-admin-analysis",
    replayId: result.canonical?.replayId,
    fileHash: result.replay?.fileHash,
    map: result.replay?.map?.name ?? null,
    durationSeconds: result.replay?.durationSeconds ?? null,
    player: {
      id: player.id,
      name: player.name,
      race: player.race,
      result: player.result?.outcome ?? "UNKNOWN",
      winnerPerspective: player.result?.outcome === "WIN",
      apm: player.apm,
      eapm: player.eapm,
      effectiveRate: player.effectiveRate,
    },
    victoryPatterns: (result.coaching?.victoryPatterns ?? []).filter((item) => String(item.winnerId) === String(player.id)),
    buildClassifications: (result.semantic?.buildClassifications ?? []).filter((item) => item.playerId === player.id),
    productionReport: (result.semantic?.productionReports ?? []).find((item) => item.playerId === player.id) ?? null,
    commandEfficiency: (result.semantic?.commandEfficiency ?? []).find((item) => item.playerId === player.id) ?? null,
    hotkeyReport: (result.semantic?.hotkeyReports ?? []).find((item) => item.playerId === player.id) ?? null,
    coachingFindings: (result.coaching?.findings ?? []).filter((item) => String(item.playerId ?? "") === String(player.id)),
  };
}

function analyzeReplay(filePath, fileName) {
  return analyzeReplayLocal(filePath, fileName).catch(() => analyzeReplayRemote(filePath, fileName));
}

function analyzeReplayLocal(filePath, fileName) {
  return new Promise((resolve, reject) => {
    const child = spawn("go", ["run", "./tools/hm-ai-admin/analyze-replay.go", filePath, fileName], {
      cwd: process.cwd(),
      env: { ...process.env, GOCACHE: goCacheDir, GOMODCACHE: goModCacheDir },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      try {
        const payload = JSON.parse(stdout || "{}");
        if (code === 0 && payload.ok) resolve(payload);
        else reject(new Error(payload.message || payload.error || stderr.trim() || `go analyzer exited with ${code}`));
      } catch {
        reject(new Error(stderr.trim() || stdout || `go analyzer exited with ${code}`));
      }
    });
  });
}

async function analyzeReplayRemote(filePath, fileName) {
  const bytes = await readFile(filePath);
  const formData = new FormData();
  formData.append("file", new File([bytes], fileName, { type: "application/octet-stream" }));
  const response = await fetch(remoteAnalyzerEndpoint, { method: "POST", body: formData });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    const message = payload?.error?.message || payload?.message || `remote analyzer HTTP ${response.status}`;
    throw new Error(message);
  }
  return { ok: true, result: payload };
}

async function markReplayFailed(replayId, message) {
  await runSqlite([], `update replays set status='analysis_failed', updated_at=datetime('now') where id=${sql(replayId)};`);
  await runSqlite(
    [],
    `insert into error_logs(id, scope, message, detail_json) values (${sql(randomUUID())}, 'analyze-candidates', ${sql(message)}, ${sql(JSON.stringify({ replayId }))});`,
  );
}

async function selectRows(query) {
  const inner = query.replace(/;\s*$/, "");
  const output = await runSqlite([], `select id || char(9) || file_name || char(9) || file_path || char(9) || file_size || char(9) || sha256 from (${inner});`);
  return output
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [id, file_name, file_path, file_size, sha256] = line.split("\t");
      return { id, file_name, file_path, file_size: Number(file_size), sha256 };
    });
}

function normalizeName(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}

function num(value) {
  if (value === null || value === undefined || value === "") return "null";
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : "null";
}

function sql(value) {
  if (value === null || value === undefined || value === "") return "null";
  return `'${String(value).replaceAll("'", "''")}'`;
}
