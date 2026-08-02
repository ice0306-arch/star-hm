import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureAdminDirs, runSqlite } from "./db.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const HOST = "127.0.0.1";
const PORT = Number(process.env.HM_AI_ADMIN_PORT ?? 43821);
const ALLOWED_HOSTS = new Set([`${HOST}:${PORT}`, `localhost:${PORT}`]);
const ALLOWED_ORIGINS = new Set([`http://${HOST}:${PORT}`, `http://localhost:${PORT}`]);

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
    return {
      initialized: rows.includes("replays"),
      bind: HOST,
      tables: rows.split("\n").filter(Boolean),
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
