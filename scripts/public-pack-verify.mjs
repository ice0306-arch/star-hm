import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const PACK_DIR = "public/hm-ai-data";
const forbiddenPatterns = [
  /\.rep$/i,
  /\.sqlite$/i,
  /\.db$/i,
  /\.zip$/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
  /\/Users\//,
  /C:\\Users\\/i,
  /quarantine/i,
  /originals/i,
  /replays\/incoming/i,
];

const manifest = JSON.parse(await readFile(join(PACK_DIR, "manifest.json"), "utf8"));
const files = await readdir(PACK_DIR);

for (const file of files) {
  const path = join(PACK_DIR, file);
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(file)) throw new Error(`forbidden public-pack file: ${file}`);
  }
  const text = await readFile(path, "utf8");
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(text)) throw new Error(`forbidden public-pack content in ${file}: ${pattern}`);
  }
  if (file !== "manifest.json") {
    const expected = manifest.files?.[file]?.sha256;
    if (!expected) throw new Error(`manifest missing ${file}`);
    const actual = createHash("sha256").update(await readFile(path)).digest("hex");
    if (expected !== actual) throw new Error(`checksum mismatch for ${file}`);
  }
}

const knowledge = JSON.parse(await readFile(join(PACK_DIR, "knowledge.json"), "utf8"));
const invalid = knowledge.filter((item) => item.status !== "approved");
if (invalid.length) throw new Error(`public knowledge contains non-approved items: ${invalid.map((item) => item.id).join(", ")}`);

console.log("public pack verified");
