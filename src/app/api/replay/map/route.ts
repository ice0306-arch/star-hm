import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { BwMapImage } from "@dada78641/bwmapimage";
import { getBwGraphicsPath } from "@dada78641/bwmapgfx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type BwMapImageMetadata = {
  extension?: string;
  format?: string;
  size?: number;
  width?: number;
  height?: number;
  mapHash?: string;
  mapTitleStripped?: string;
  mapTileWidth?: number;
  mapTileHeight?: number;
};

function isDevelopment() {
  return process.env.NODE_ENV !== "production";
}

function logReplayMap(message: string, value?: unknown) {
  if (!isDevelopment()) return;
  if (value === undefined) {
    console.info(message);
    return;
  }
  console.info(message, value);
}

function jsonError(error: string, status = 500) {
  return Response.json({ error }, { status });
}

async function resolveGraphicsPath() {
  const bundledPath = join(process.cwd(), "server-assets", "bwmapgfx", "resources");
  try {
    await access(bundledPath, constants.R_OK);
    return bundledPath;
  } catch {
    return getBwGraphicsPath();
  }
}

export async function POST(request: Request) {
  logReplayMap("[replay-map] request received");

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonError("REP 파일이 전달되지 않았습니다.", 400);
    }

    if (!file.name.toLowerCase().endsWith(".rep")) {
      return jsonError("REP 파일만 사용할 수 있습니다.", 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const replayBuffer = Buffer.from(arrayBuffer);
    logReplayMap("[replay-map] file bytes", replayBuffer.length);

    if (replayBuffer.length < 100) {
      return jsonError("REP 파일 데이터가 비어 있거나 손상되었습니다.", 400);
    }

    const graphicsPath = await resolveGraphicsPath();
    logReplayMap("[replay-map] graphics path", graphicsPath);

    await access(graphicsPath, constants.R_OK);
    logReplayMap("[replay-map] graphics readable", true);

    const renderer = new BwMapImage(replayBuffer, {
      forceType: "replay",
      bwGraphicsPath: graphicsPath,
      tileSize: 8,
      targetWidth: 768,
      targetHeight: 768,
      targetFit: "inside",
      encoderType: "jpeg",
      encoderOptions: {
        quality: 86,
      },
    });

    logReplayMap("[replay-map] renderer started");
    const [buffer, metadata] = (await renderer.renderMapImage()) as [Buffer, BwMapImageMetadata];

    if (!buffer.length) {
      return jsonError("생성된 맵 이미지가 비어 있습니다.", 500);
    }

    logReplayMap("[replay-map] renderer completed", {
      hash: metadata.mapHash,
      width: metadata.width,
      height: metadata.height,
      bytes: buffer.length,
    });

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": metadata.format === "png" ? "image/png" : "image/jpeg",
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, max-age=3600",
        "X-Map-Hash": metadata.mapHash ?? "",
        "X-Map-Width": String(metadata.mapTileWidth ?? ""),
        "X-Map-Height": String(metadata.mapTileHeight ?? ""),
      },
    });
  } catch (error) {
    console.error("[replay-map] failed", error);
    const message = error instanceof Error ? error.message : "맵 이미지 생성에 실패했습니다.";
    return jsonError(isDevelopment() ? message : "맵 이미지를 만들 수 없습니다.", 500);
  }
}
