import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const PACK_DIR = "public/hm-ai-data";
const files = ["knowledge.json", "rules.json", "coverage.json", "pro-reference-stats.json"];

const manifest = {
  schemaVersion: "hm-ai-public-pack-manifest/2026-08-03",
  version: new Date().toISOString().slice(0, 10).replaceAll("-", "."),
  generatedAt: new Date().toISOString(),
  minimumAppVersion: "hm-ai-rule-engine/0.2.0",
  approvedItemCount: 0,
  supportedMatchups: [],
  supportedMaps: [],
  supportedBuilds: [],
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
}

await writeFile(join(PACK_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`built ${join(PACK_DIR, "manifest.json")}`);
