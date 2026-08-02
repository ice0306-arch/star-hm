import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const baseUrl = process.env.HM_AI_TEST_BASE_URL ?? "https://star-hm.vercel.app";
const samplePath = process.env.HM_AI_SAMPLE_REP ?? "/private/tmp/hm-sample.rep";

if (!existsSync(samplePath)) {
  console.log(`sample REP not found, skipping API smoke: ${samplePath}`);
  process.exit(0);
}

const bytes = await readFile(samplePath);
const file = new File([bytes], "hm-sample.rep", { type: "application/octet-stream" });

const mapForm = new FormData();
mapForm.append("file", file);
const mapResponse = await fetch(`${baseUrl}/api/replay/map`, { method: "POST", body: mapForm });
if (!mapResponse.ok) throw new Error(`map API failed: ${mapResponse.status}`);
const contentType = mapResponse.headers.get("content-type") ?? "";
if (!contentType.startsWith("image/")) throw new Error(`map API content-type mismatch: ${contentType}`);
const mapBytes = new Uint8Array(await mapResponse.arrayBuffer());
const isJpeg = mapBytes[0] === 0xff && mapBytes[1] === 0xd8;
const isPng = mapBytes[0] === 0x89 && mapBytes[1] === 0x50;
if (!isJpeg && !isPng) throw new Error("map API magic bytes mismatch");
if (!mapResponse.headers.get("x-map-hash")) throw new Error("map API missing x-map-hash");

const analyzeForm = new FormData();
analyzeForm.append("file", file);
const analyzeResponse = await fetch(`${baseUrl}/api/replays/analyze`, { method: "POST", body: analyzeForm });
if (!analyzeResponse.ok) throw new Error(`analyze API failed: ${analyzeResponse.status}`);
const result = await analyzeResponse.json();
if (!result.success) throw new Error("analyze API returned failure");
if (!result.coaching?.facts?.length) throw new Error("coaching facts missing");
if (!result.coaching?.findings?.every((finding) => finding.evidenceIds?.length)) throw new Error("finding evidence missing");

console.log(JSON.stringify({
  ok: true,
  mapContentType: contentType,
  facts: result.coaching.facts.length,
  issues: result.coaching.issues.length,
  findings: result.coaching.findings.length,
}, null, 2));
