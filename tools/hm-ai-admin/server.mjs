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

await ensureAdminDirs();

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
    if (url.pathname === "/api/migrate" && req.method === "POST") {
      await runSqlite(["tools/hm-ai-admin/migrations/001_init.sql"]);
      return sendJson(res, 200, { ok: true });
    }
    if (url.pathname === "/api/db/check" && req.method === "POST") return sendJson(res, 200, { ok: true, result: await check() });
    if (url.pathname === "/api/db/backup" && req.method === "POST") return sendJson(res, 200, { ok: true, path: await backup() });
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
    for (const table of ["replays", "replay_sources", "pro_players", "knowledge_items", "coach_findings", "export_versions"]) {
      counts[table] = tables.includes(table) ? Number((await runSqlite([], `select count(*) from ${table};`)) || 0) : 0;
    }
    const recentReplayRows = tables.includes("replays")
      ? await runSqlite(
          [],
          "select created_at || char(9) || file_name || char(9) || status || char(9) || file_size from replays order by created_at desc limit 12;",
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

  const hash = createHash("sha256").update(filePart.data).digest("hex");
  const safeName = sanitizeFileName(filePart.filename);
  const storedName = `${hash.slice(0, 12)}-${safeName}`;
  const storedPath = join(ADMIN_DATA_DIR, "replays", "incoming", storedName);
  await writeFile(storedPath, filePart.data, { flag: "wx" }).catch(async (error) => {
    if (error?.code !== "EEXIST") throw error;
  });

  const sourceId = randomUUID();
  const replayId = randomUUID();
  await runSqlite(
    [],
    [
      "begin;",
      `insert or ignore into replay_sources(id, source_type, source_grade, source_url, status, notes) values (${sql(sourceId)}, 'manual_upload', 'user_provided', ${sql(sourceUrl || null)}, 'candidate', ${sql(notes || null)});`,
      `insert or ignore into replays(id, sha256, file_name, file_path, file_size, status, source_id) values (${sql(replayId)}, ${sql(hash)}, ${sql(safeName)}, ${sql(storedPath)}, ${filePart.data.length}, 'candidate', ${sql(sourceId)});`,
      "commit;",
    ].join("\n"),
  );

  return { ok: true, fileName: safeName, sha256: hash, bytes: filePart.data.length, storedPath };
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

function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] });
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
