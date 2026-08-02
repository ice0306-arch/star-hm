import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ADMIN_DATA_DIR, backup, check, ensureAdminDirs, runSqlite } from "./db.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const HOST = "127.0.0.1";
const PORT = Number(process.env.HM_AI_ADMIN_PORT ?? 43821);
const ALLOWED_HOSTS = new Set([`${HOST}:${PORT}`, `localhost:${PORT}`]);
const ALLOWED_ORIGINS = new Set([`http://${HOST}:${PORT}`, `http://localhost:${PORT}`]);
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 45_000;
const FETCH_HEADERS = {
  "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36 HM-AI-Local-Admin/1.0",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,application/octet-stream,*/*;q=0.8",
};
const ASL_PLAYER_PRESETS = [
  "Flash",
  "Bisu",
  "Rain",
  "Snow",
  "Soulkey",
  "Soma",
  "Best",
  "Sharp",
  "Light",
  "Mini",
  "hero",
  "Shuttle",
  "BarrackS",
  "Rush",
  "Action",
  "EffOrt",
  "Queen",
  "Larva",
  "Stork",
  "Jaedong",
  "Scan",
  "Mong",
  "sSak",
  "Speed",
  "RoyaL",
  "Calm",
];

await ensureAdminDirs();

const analysisJobs = new Map();

const server = createServer(async (req, res) => {
  const host = req.headers.host ?? "";
  const origin = req.headers.origin;

  if (!ALLOWED_HOSTS.has(host)) {
    return sendJson(res, 403, { error: "외부 Host는 허용하지 않습니다." });
  }
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return sendJson(res, 403, { error: "외부 Origin은 허용하지 않습니다." });
  }

  try {
    const url = new URL(req.url ?? "/", `http://${host}`);
    if (url.pathname === "/") return sendHtml(res, await readFile(join(__dirname, "static", "index.html"), "utf8"));
    if (url.pathname === "/api/health") return sendJson(res, 200, { ok: true, bind: HOST, storage: "local-sqlite" });
    if (url.pathname === "/api/dashboard") return sendJson(res, 200, await dashboard());
    if (url.pathname === "/api/replays/asl-presets") return sendJson(res, 200, { ok: true, players: ASL_PLAYER_PRESETS });
    if (url.pathname === "/api/migrate" && req.method === "POST") {
      await runSqlite(["tools/hm-ai-admin/migrations/001_init.sql"]);
      return sendJson(res, 200, { ok: true });
    }
    if (url.pathname === "/api/db/check" && req.method === "POST") return sendJson(res, 200, { ok: true, result: await check() });
    if (url.pathname === "/api/db/backup" && req.method === "POST") return sendJson(res, 200, { ok: true, path: await backup() });
    if (url.pathname === "/api/replays/collect" && req.method === "POST") return sendJson(res, 200, await collectReplays(req));
    if (url.pathname === "/api/replays/collect-asl" && req.method === "POST") return sendJson(res, 200, await collectAslReplays(req));
    if (url.pathname === "/api/replays/analyze-candidates" && req.method === "POST") return sendJson(res, 200, await analyzeCandidates(req));
    if (url.pathname === "/api/replays/analyze-candidates/start" && req.method === "POST") return sendJson(res, 200, await startAnalyzeCandidates(req));
    if (url.pathname === "/api/replays/analyze-candidates/status" && req.method === "GET") return sendJson(res, 200, analysisJobStatus(url));
    if (url.pathname === "/api/replays/upload" && req.method === "POST") return sendJson(res, 200, await uploadReplay(req));
    if (url.pathname === "/api/public-pack/build" && req.method === "POST") return sendJson(res, 200, await runScript("scripts/public-pack-build.mjs"));
    if (url.pathname === "/api/public-pack/verify" && req.method === "POST") return sendJson(res, 200, await runScript("scripts/public-pack-verify.mjs"));
    return sendJson(res, 404, { error: "없는 관리자 경로입니다." });
  } catch (error) {
    return sendJson(res, 500, { error: error instanceof Error ? error.message : "관리자 오류" });
  }
});

server.on("error", (error) => {
  console.error(`HM AI local admin failed to bind ${HOST}:${PORT}`);
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

server.listen(PORT, HOST, () => {
  console.log(`HM AI local admin: http://${HOST}:${PORT}`);
  console.log(`You can also open: http://localhost:${PORT}`);
});

async function dashboard() {
  try {
    const rows = await runSqlite([], "select name from sqlite_master where type='table' order by name;");
    const tables = rows.split("\n").filter(Boolean);
    const counts = {};
    for (const table of ["replays", "replay_sources", "replay_analysis", "training_samples", "pro_players", "knowledge_items", "coach_findings", "export_versions"]) {
      counts[table] = tables.includes(table) ? Number((await runSqlite([], `select count(*) from ${table};`)) || 0) : 0;
    }
    const recentReplayRows = tables.includes("replays")
      ? await runSqlite(
          [],
          "select created_at || char(9) || file_name || char(9) || status || char(9) || file_size from replays order by created_at desc limit 12;",
        )
      : "";
    const recentJobRows = tables.includes("download_jobs")
      ? await runSqlite(
          [],
          "select created_at || char(9) || source_url || char(9) || status || char(9) || coalesce(error, '') from download_jobs order by created_at desc limit 8;",
        )
      : "";
    return {
      initialized: rows.includes("replays"),
      bind: HOST,
      dataDir: ADMIN_DATA_DIR,
      tables,
      counts,
      recentReplays: recentReplayRows
        .split("\n")
        .filter(Boolean)
        .map((row) => {
          const [createdAt, fileName, status, fileSize] = row.split("\t");
          return { createdAt, fileName, status, fileSize: Number(fileSize || 0) };
        }),
      recentJobs: recentJobRows
        .split("\n")
        .filter(Boolean)
        .map((row) => {
          const [createdAt, sourceUrl, status, error] = row.split("\t");
          return { createdAt, sourceUrl, status, error };
        }),
      notice: "공개 HM AI 사이트와 분리된 로컬 전용 관리자입니다.",
    };
  } catch (error) {
    return {
      initialized: false,
      bind: HOST,
      tables: [],
      notice: "SQLite 초기화가 필요합니다. npm run admin:db:migrate 를 실행하세요.",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function collectReplays(req) {
  const body = await readJsonRequest(req);
  const sourceUrl = String(body.sourceUrl ?? "").trim();
  const notes = String(body.notes ?? "").trim();
  const maxFiles = Math.min(Math.max(Number(body.maxFiles ?? 12), 1), 30);
  const fromYear = Number(body.fromYear || 0) || null;
  const toYear = Number(body.toYear || 0) || null;

  if (!sourceUrl) throw new Error("수집할 URL을 입력하세요.");

  return collectSourceUrl({ sourceUrl, notes, maxFiles, fromYear, toYear, sourceType: "auto_download" });
}

async function analyzeCandidates(req) {
  const body = await readJsonRequest(req);
  const limit = Math.min(Math.max(Number(body.limit ?? 5), 1), 50);
  const result = await runScript("tools/hm-ai-admin/analyze-candidates.mjs", { HM_AI_ANALYZE_LIMIT: String(limit) });
  try {
    return JSON.parse(result.output || "{}");
  } catch {
    return result;
  }
}

async function startAnalyzeCandidates(req) {
  const body = await readJsonRequest(req);
  const limit = Math.min(Math.max(Number(body.limit ?? 5), 1), 50);
  const id = randomUUID();
  const startedAt = new Date().toISOString();
  const job = {
    id,
    status: "running",
    phase: "분석 준비 중",
    limit,
    startedAt,
    updatedAt: startedAt,
    result: null,
    error: null,
  };
  analysisJobs.set(id, job);

  runScript("tools/hm-ai-admin/analyze-candidates.mjs", { HM_AI_ANALYZE_LIMIT: String(limit) })
    .then((result) => {
      let payload = result;
      try {
        payload = JSON.parse(result.output || "{}");
      } catch {
        payload = result;
      }
      Object.assign(job, {
        status: "completed",
        phase: "분석 완료",
        result: payload,
        updatedAt: new Date().toISOString(),
      });
    })
    .catch((error) => {
      Object.assign(job, {
        status: "failed",
        phase: "분석 실패",
        error: error instanceof Error ? error.message : String(error),
        updatedAt: new Date().toISOString(),
      });
    });

  return { ok: true, job };
}

function analysisJobStatus(url) {
  const id = url.searchParams.get("id");
  const job = id ? analysisJobs.get(id) : null;
  if (!job) return { ok: false, error: "분석 작업을 찾을 수 없습니다." };
  return { ok: true, job };
}

async function collectAslReplays(req) {
  const body = await readJsonRequest(req);
  const selectedPlayers = Array.isArray(body.players) && body.players.length ? body.players : ASL_PLAYER_PRESETS;
  const players = selectedPlayers.map((player) => String(player).trim()).filter(Boolean).slice(0, 40);
  const fromYear = Number(body.fromYear || 2024);
  const toYear = Number(body.toYear || new Date().getFullYear());
  const maxPerPlayer = Math.min(Math.max(Number(body.maxPerPlayer ?? 3), 1), 10);

  if (!players.length) throw new Error("수집할 선수 ID가 없습니다.");
  if (fromYear > toYear) throw new Error("시작 연도는 종료 연도보다 클 수 없습니다.");

  const results = [];
  const seenHashes = new Set();
  for (const player of players) {
    const urls = [
      `https://tl.net/replay/index.php?player1=${encodeURIComponent(player)}&search=1`,
      `https://tl.net/replay/index.php?player2=${encodeURIComponent(player)}&search=1`,
    ];
    const playerResult = { player, searched: urls, downloaded: [], skipped: [], errors: [] };
    for (const sourceUrl of urls) {
      try {
        const result = await collectSourceUrl({
          sourceUrl,
          notes: `ASL 선수 후보 ${player} / ${fromYear}-${toYear} 공개 REP 자동 수집`,
          maxFiles: maxPerPlayer,
          fromYear,
          toYear,
          sourceType: "asl_player_auto",
        });
        for (const replay of result.downloaded) {
          if (seenHashes.has(replay.sha256)) continue;
          seenHashes.add(replay.sha256);
          playerResult.downloaded.push(replay);
        }
        playerResult.skipped.push(...result.skipped);
      } catch (error) {
        playerResult.errors.push({ sourceUrl, error: error instanceof Error ? error.message : String(error) });
      }
    }
    results.push(playerResult);
  }

  const downloaded = results.reduce((sum, item) => sum + item.downloaded.length, 0);
  const errors = results.reduce((sum, item) => sum + item.errors.length, 0);
  return { ok: downloaded > 0, fromYear, toYear, players: players.length, downloaded, errors, results };
}

async function collectSourceUrl({ sourceUrl, notes, maxFiles, fromYear = null, toYear = null, sourceType = "auto_download" }) {
  const normalizedUrl = normalizeHttpUrl(sourceUrl);

  await ensureAdminDirs();
  await runSqlite(["tools/hm-ai-admin/migrations/001_init.sql"]);

  const sourceId = randomUUID();
  const jobId = randomUUID();
  await runSqlite(
    [],
    [
      "begin;",
      `insert into replay_sources(id, source_type, source_grade, source_url, page_url, status, notes) values (${sql(sourceId)}, ${sql(sourceType)}, 'collector_candidate', ${sql(normalizedUrl)}, ${sql(normalizedUrl)}, 'candidate', ${sql(notes || null)});`,
      `insert into download_jobs(id, source_url, source_id, status, attempts) values (${sql(jobId)}, ${sql(normalizedUrl)}, ${sql(sourceId)}, 'running', 1);`,
      "commit;",
    ].join("\n"),
  );

  try {
    const targets = await findReplayTargets(normalizedUrl, maxFiles, { fromYear, toYear });
    if (!targets.length) throw new Error("이 URL에서 .rep 다운로드 링크를 찾지 못했습니다.");

    const downloaded = [];
    const skipped = [];
    for (const target of targets.slice(0, maxFiles)) {
      try {
        downloaded.push(await downloadReplayTarget(target, sourceId));
      } catch (error) {
        skipped.push({ url: target.url, error: error instanceof Error ? error.message : String(error) });
      }
    }

    const status = downloaded.length ? "completed" : "failed";
    const errorText = skipped.length && !downloaded.length ? skipped.map((item) => `${item.url}: ${item.error}`).join(" | ") : null;
    await runSqlite(
      [],
      `update download_jobs set status=${sql(status)}, error=${sql(errorText)}, updated_at=datetime('now') where id=${sql(jobId)};`,
    );

    return { ok: Boolean(downloaded.length), sourceUrl: normalizedUrl, found: targets.length, downloaded, skipped };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await runSqlite([], `update download_jobs set status='failed', error=${sql(message)}, updated_at=datetime('now') where id=${sql(jobId)};`);
    throw error;
  }
}

async function uploadReplay(req) {
  const contentType = req.headers["content-type"] ?? "";
  if (!contentType.includes("multipart/form-data")) throw new Error("multipart/form-data 업로드만 지원합니다.");

  const body = await readRequestBuffer(req, MAX_UPLOAD_BYTES);
  const parts = parseMultipart(body, contentType);
  const filePart = parts.find((part) => part.name === "file" && part.filename);
  const sourceUrl = decodeUtf8(parts.find((part) => part.name === "sourceUrl")?.data ?? Buffer.alloc(0)).trim();
  const notes = decodeUtf8(parts.find((part) => part.name === "notes")?.data ?? Buffer.alloc(0)).trim();

  if (!filePart) throw new Error("REP 파일이 없습니다.");
  if (!filePart.filename.toLowerCase().endsWith(".rep")) throw new Error("REP 파일만 등록할 수 있습니다.");
  if (filePart.data.length < 100) throw new Error("파일이 비어 있거나 REP 파일로 보이지 않습니다.");

  await ensureAdminDirs();
  await runSqlite(["tools/hm-ai-admin/migrations/001_init.sql"]);

  const sourceId = randomUUID();
  await runSqlite(
    [],
    [
      "begin;",
      `insert or ignore into replay_sources(id, source_type, source_grade, source_url, status, notes) values (${sql(sourceId)}, 'manual_upload', 'user_provided', ${sql(sourceUrl || null)}, 'candidate', ${sql(notes || null)});`,
      "commit;",
    ].join("\n"),
  );

  const saved = await saveReplayCandidate({ data: filePart.data, fileName: filePart.filename, sourceId, status: "candidate" });
  return { ok: true, ...saved };
}

async function findReplayTargets(sourceUrl, maxFiles, filters = {}) {
  const url = new URL(sourceUrl);
  if (url.pathname.toLowerCase().endsWith(".rep")) return [{ url: sourceUrl }];

  const response = await fetchResource(sourceUrl, { text: true });
  if (!response.ok) throw new Error(`페이지를 열 수 없습니다. HTTP ${response.status}`);

  const contentType = response.contentType;
  if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
    if (contentType.includes("application/octet-stream")) return [{ url: sourceUrl }];
    throw new Error(`HTML 페이지나 REP 파일이 아닙니다. content-type: ${contentType || "unknown"}`);
  }

  const html = response.body.toString("utf8");
  const tlTargets = extractTeamLiquidReplayTargets(html, sourceUrl, filters);
  if (tlTargets.length) return tlTargets.slice(0, maxFiles);

  const links = new Set();
  const hrefPattern = /href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;
  for (const match of html.matchAll(hrefPattern)) {
    const href = match[1] ?? match[2] ?? match[3] ?? "";
    if (!/\.rep(?:$|[?#])/i.test(href) && !/download\.php\?replay=\d+/i.test(href)) continue;
    links.add(new URL(href, sourceUrl).toString());
    if (links.size >= maxFiles) break;
  }

  return [...links].map((link) => ({ url: link }));
}

function extractTeamLiquidReplayTargets(html, sourceUrl, filters = {}) {
  if (!new URL(sourceUrl).hostname.endsWith("tl.net")) return [];
  const rowPattern = /<tr\b[\s\S]*?<\/tr>/gi;
  const rows = html.match(rowPattern) ?? [];
  const targets = [];

  for (const row of rows) {
    const downloadMatch = row.match(/href=["']([^"']*download\.php\?replay=\d+[^"']*)["']/i);
    if (!downloadMatch) continue;
    const dateMatch = stripHtml(row).match(/\b([A-Z][a-z]{2})\s+(\d{1,2})\s+(\d{2})\b/);
    const year = dateMatch ? 2000 + Number(dateMatch[3]) : null;
    if (filters.fromYear && year && year < filters.fromYear) continue;
    if (filters.toYear && year && year > filters.toYear) continue;
    targets.push({ url: new URL(downloadMatch[1], sourceUrl).toString(), year });
  }

  return targets;
}

function stripHtml(value) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function downloadReplayTarget(target, sourceId) {
  const response = await fetchResource(target.url, { text: false });
  if (!response.ok) throw new Error(`REP 다운로드 실패: HTTP ${response.status}`);

  const length = Number(response.contentLength || 0);
  if (length > MAX_DOWNLOAD_BYTES) throw new Error("REP 파일이 50MB를 넘습니다.");

  const data = response.body;
  if (data.length > MAX_DOWNLOAD_BYTES) throw new Error("REP 파일이 50MB를 넘습니다.");
  if (data.length < 100) throw new Error("다운로드한 파일이 REP 파일로 보이지 않습니다.");

  const fileName = getDownloadFileName(target.url, response.contentDisposition);
  if (!fileName.toLowerCase().endsWith(".rep")) throw new Error("다운로드 파일명이 .rep가 아닙니다.");

  return saveReplayCandidate({ data, fileName, sourceId, status: "candidate" });
}

async function saveReplayCandidate({ data, fileName, sourceId, status }) {
  const hash = createHash("sha256").update(data).digest("hex");
  const safeName = sanitizeFileName(fileName);
  const storedName = `${hash.slice(0, 12)}-${safeName}`;
  const storedPath = join(ADMIN_DATA_DIR, "replays", "incoming", storedName);
  await writeFile(storedPath, data, { flag: "wx" }).catch(async (error) => {
    if (error?.code !== "EEXIST") throw error;
  });

  const replayId = randomUUID();
  await runSqlite(
    [],
    `insert or ignore into replays(id, sha256, file_name, file_path, file_size, status, source_id) values (${sql(replayId)}, ${sql(hash)}, ${sql(safeName)}, ${sql(storedPath)}, ${data.length}, ${sql(status)}, ${sql(sourceId)});`,
  );

  return { fileName: safeName, sha256: hash, bytes: data.length, storedPath };
}

async function fetchResource(url, { text }) {
  try {
    const response = await fetchWithTimeout(url, { headers: FETCH_HEADERS });
    if (response.ok) {
      const body = Buffer.from(await response.arrayBuffer());
      return {
        ok: true,
        status: response.status,
        body,
        contentType: response.headers.get("content-type") ?? "",
        contentLength: response.headers.get("content-length") ?? "",
        contentDisposition: response.headers.get("content-disposition") ?? "",
      };
    }
    if (!new URL(url).hostname.endsWith("tl.net")) {
      return { ok: false, status: response.status, body: Buffer.alloc(0), contentType: "", contentLength: "", contentDisposition: "" };
    }
  } catch (error) {
    if (!new URL(url).hostname.endsWith("tl.net")) throw error;
  }
  return fetchWithCurl(url, { text });
}

function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  return fetch(url, { ...options, redirect: "follow", signal: controller.signal }).finally(() => clearTimeout(timer));
}

function fetchWithCurl(url, { text }) {
  return new Promise((resolve, reject) => {
    const args = [
      "-L",
      "--silent",
      "--show-error",
      "--max-time",
      String(Math.ceil(DOWNLOAD_TIMEOUT_MS / 1000)),
      "--max-filesize",
      String(MAX_DOWNLOAD_BYTES),
      "-A",
      FETCH_HEADERS["user-agent"],
      "-H",
      `Accept: ${text ? "text/html,application/xhtml+xml" : "application/octet-stream,*/*"}`,
      "-w",
      "\\n__HM_STATUS__:%{http_code}\\n__HM_TYPE__:%{content_type}\\n",
      url,
    ];
    const child = spawn("curl", args, { stdio: ["ignore", "pipe", "pipe"] });
    const chunks = [];
    let stderr = "";
    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      const raw = Buffer.concat(chunks);
      const marker = raw.lastIndexOf(Buffer.from("\n__HM_STATUS__:"));
      if (marker === -1) {
        reject(new Error(stderr.trim() || `curl exited with ${code}`));
        return;
      }
      const body = raw.slice(0, marker);
      const meta = raw.slice(marker).toString("utf8");
      const status = Number(meta.match(/__HM_STATUS__:(\d+)/)?.[1] ?? 0);
      const contentType = meta.match(/__HM_TYPE__:(.*)/)?.[1]?.trim() ?? "";
      if (code !== 0 || status >= 400) {
        reject(new Error(stderr.trim() || `curl HTTP ${status || code}`));
        return;
      }
      resolve({ ok: true, status, body, contentType, contentLength: String(body.length), contentDisposition: "" });
    });
  });
}

async function readJsonRequest(req) {
  const body = await readRequestBuffer(req, 64 * 1024);
  if (!body.length) return {};
  return JSON.parse(body.toString("utf8"));
}

function normalizeHttpUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("올바른 URL을 입력하세요.");
  }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("http 또는 https URL만 사용할 수 있습니다.");
  return url.toString();
}

function getDownloadFileName(urlValue, contentDisposition) {
  const replayId = new URL(urlValue).searchParams.get("replay");
  if (/\/replay\/download\.php$/i.test(new URL(urlValue).pathname) && replayId) return `teamliquid-${replayId}.rep`;
  const headerName = contentDisposition?.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
  const fromHeader = headerName ? decodeURIComponent(headerName[1] ?? headerName[2] ?? "") : "";
  const fromUrl = basename(new URL(urlValue).pathname);
  return sanitizeFileName(fromHeader || fromUrl || "download.rep");
}

function readRequestBuffer(req, limitBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error("업로드 파일은 50MB 이하만 지원합니다."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function parseMultipart(body, contentType) {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  const boundary = boundaryMatch?.[1] ?? boundaryMatch?.[2];
  if (!boundary) throw new Error("multipart boundary를 찾을 수 없습니다.");

  const delimiter = Buffer.from(`--${boundary}`);
  const parts = [];
  let cursor = body.indexOf(delimiter);
  while (cursor !== -1) {
    cursor += delimiter.length;
    if (body[cursor] === 45 && body[cursor + 1] === 45) break;
    if (body[cursor] === 13 && body[cursor + 1] === 10) cursor += 2;

    const headerEnd = body.indexOf(Buffer.from("\r\n\r\n"), cursor);
    if (headerEnd === -1) break;
    const headerText = body.slice(cursor, headerEnd).toString("utf8");
    const next = body.indexOf(delimiter, headerEnd + 4);
    if (next === -1) break;

    let data = body.slice(headerEnd + 4, next);
    if (data.length >= 2 && data[data.length - 2] === 13 && data[data.length - 1] === 10) data = data.slice(0, -2);

    const disposition = headerText.match(/content-disposition:[^\r\n]+/i)?.[0] ?? "";
    const name = disposition.match(/name="([^"]+)"/)?.[1] ?? "";
    const filename = disposition.match(/filename="([^"]*)"/)?.[1] ?? "";
    if (name) parts.push({ name, filename, data });
    cursor = next;
  }
  return parts;
}

function runScript(scriptPath, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], { cwd: process.cwd(), env: { ...process.env, ...extraEnv }, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ ok: true, output: stdout.trim() });
      else reject(new Error(stderr.trim() || `${basename(scriptPath)} exited with ${code}`));
    });
  });
}

function sanitizeFileName(fileName) {
  const ext = extname(fileName).toLowerCase();
  const base = basename(fileName, ext).replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 80) || "replay";
  return `${base}${ext}`;
}

function decodeUtf8(buffer) {
  return buffer.toString("utf8").replace(/\0/g, "");
}

function sql(value) {
  if (value === null || value === undefined || value === "") return "null";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sendHtml(res, html) {
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
  });
  res.end(html);
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body, null, 2));
}
