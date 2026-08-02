import { spawn } from "node:child_process";
import { mkdir, copyFile, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

export const ADMIN_DATA_DIR = resolve(process.env.HM_AI_ADMIN_DATA_DIR ?? "data/hm-ai-admin");
export const ADMIN_DB_PATH = resolve(process.env.HM_AI_ADMIN_DB ?? join(ADMIN_DATA_DIR, "hm-ai-admin.sqlite"));
const BACKUP_DIR = join(ADMIN_DATA_DIR, "backups");

export async function ensureAdminDirs() {
  await mkdir(ADMIN_DATA_DIR, { recursive: true });
  await mkdir(BACKUP_DIR, { recursive: true });
  await mkdir(join(ADMIN_DATA_DIR, "replays", "incoming"), { recursive: true });
  await mkdir(join(ADMIN_DATA_DIR, "replays", "originals"), { recursive: true });
  await mkdir(join(ADMIN_DATA_DIR, "replays", "processed"), { recursive: true });
  await mkdir(join(ADMIN_DATA_DIR, "replays", "rejected"), { recursive: true });
  await mkdir(join(ADMIN_DATA_DIR, "replays", "quarantine"), { recursive: true });
  await mkdir(join(ADMIN_DATA_DIR, "replays", "packs"), { recursive: true });
}

export async function runSqlite(files = [], sql = "") {
  await ensureAdminDirs();
  const args = [ADMIN_DB_PATH];
  for (const file of files) args.push(`.read ${resolve(file)}`);
  if (sql) args.push(sql);
  return run("sqlite3", args);
}

export async function backup() {
  await ensureAdminDirs();
  if (!existsSync(ADMIN_DB_PATH)) throw new Error("백업할 SQLite DB가 없습니다.");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = join(BACKUP_DIR, `hm-ai-admin-${stamp}.sqlite`);
  await copyFile(ADMIN_DB_PATH, target);
  await pruneBackups();
  return target;
}

export async function check() {
  return runSqlite([], "pragma integrity_check;");
}

async function pruneBackups() {
  const files = (await readdir(BACKUP_DIR))
    .filter((file) => file.endsWith(".sqlite") && !file.includes(".pinned."))
    .sort()
    .reverse();
  for (const file of files.slice(10)) {
    await rm(join(BACKUP_DIR, file), { force: true });
  }
}

function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", (error) => {
      reject(new Error(`${command} 실행 실패: ${error.message}. sqlite3 CLI가 설치되어 있는지 확인하세요.`));
    });
    child.on("close", (code) => {
      if (code === 0) resolvePromise(stdout.trim());
      else reject(new Error(stderr.trim() || `${command} exited with ${code}`));
    });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  try {
    if (command === "migrate") {
      await runSqlite(["tools/hm-ai-admin/migrations/001_init.sql"]);
      console.log(`migrated ${ADMIN_DB_PATH}`);
    } else if (command === "backup") {
      console.log(await backup());
    } else if (command === "check") {
      console.log(await check());
    } else {
      console.log("Usage: node tools/hm-ai-admin/db.mjs migrate|backup|check");
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
