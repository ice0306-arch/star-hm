import { NextResponse } from "next/server";
import { orderedMembers, type Member } from "@/data/members";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SOOP_LIVE_URL = "https://live.sooplive.co.kr/afreeca/player_live_api.php";
const LIVE_CACHE_TTL_MS = 15_000;

type LiveState = "live" | "offline" | "unknown" | "unavailable";

interface LiveStatus {
  memberId: string;
  soopId: string;
  isLive: boolean;
  status: LiveState;
  viewer: number;
  title: string;
  startedAt: string;
  broadNo: string;
  url: string;
}

interface LiveCache {
  payload: null | {
    statuses: LiveStatus[];
    liveCount: number;
    total: number;
    updatedAt: number;
  };
  expiresAt: number;
  pending: null | Promise<NonNullable<LiveCache["payload"]>>;
}

const globalCache = globalThis as typeof globalThis & {
  __STAR_HM_LIVE_CACHE?: LiveCache;
};

const liveCache =
  globalCache.__STAR_HM_LIVE_CACHE ??
  {
    payload: null,
    expiresAt: 0,
    pending: null,
  };

globalCache.__STAR_HM_LIVE_CACHE = liveCache;

function getSoopId(member: Member) {
  const match = member.url.match(/sooplive\.com\/station\/([^/?#]+)/i);
  return match?.[1] ?? "";
}

function numberFrom(...values: unknown[]) {
  for (const value of values) {
    const normalized = Number(String(value ?? "").replaceAll(",", "").trim());
    if (Number.isFinite(normalized) && normalized > 0) {
      return normalized;
    }
  }
  return 0;
}

function fallbackStatus(member: Member, status: LiveState): LiveStatus {
  const soopId = getSoopId(member);
  return {
    memberId: member.id,
    soopId,
    isLive: false,
    status,
    viewer: 0,
    title: "",
    startedAt: "",
    broadNo: "",
    url: soopId ? `https://play.sooplive.co.kr/${encodeURIComponent(soopId)}` : member.url,
  };
}

async function fetchLiveStatus(member: Member): Promise<LiveStatus> {
  const soopId = getSoopId(member);
  if (!soopId) {
    return fallbackStatus(member, "unavailable");
  }

  const body = new URLSearchParams({
    bid: soopId,
    type: "live",
    player_type: "html5",
  });

  const response = await fetch(SOOP_LIVE_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      origin: "https://play.sooplive.com",
      referer: `https://play.sooplive.com/${encodeURIComponent(soopId)}`,
      "user-agent": "Mozilla/5.0",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    return fallbackStatus(member, "unknown");
  }

  const payload = await response.json();
  const channel = payload?.CHANNEL ?? {};
  const result = Number(channel?.RESULT ?? 0);
  const broadNo = String(channel?.BNO || channel?.BROAD_NO || channel?.broad_no || "").trim();
  const title = String(channel?.TITLE || channel?.BROAD_TITLE || channel?.broad_title || "").trim();
  const startedAt = String(channel?.BROAD_START || channel?.broad_start || channel?.START_TIME || "").trim();
  const viewer = numberFrom(
    channel?.TOTAL_VIEW_CNT,
    channel?.total_view_cnt,
    channel?.VIEW_CNT,
    channel?.CURRENT_VIEW_CNT,
    channel?.current_view_cnt,
  );

  if (result !== 1) {
    return fallbackStatus(member, "offline");
  }

  return {
    memberId: member.id,
    soopId,
    isLive: true,
    status: "live",
    viewer,
    title,
    startedAt,
    broadNo,
    url: broadNo
      ? `https://play.sooplive.co.kr/${encodeURIComponent(soopId)}/${encodeURIComponent(broadNo)}`
      : `https://play.sooplive.co.kr/${encodeURIComponent(soopId)}`,
  };
}

async function buildLivePayload() {
  const settled = await Promise.allSettled(orderedMembers.map(fetchLiveStatus));
  const statuses = settled.map((item, index) =>
    item.status === "fulfilled" ? item.value : fallbackStatus(orderedMembers[index], "unknown"),
  );

  return {
    statuses,
    liveCount: statuses.filter((status) => status.isLive).length,
    total: statuses.length,
    updatedAt: Date.now(),
  };
}

async function getLivePayload() {
  const now = Date.now();
  if (liveCache.payload && liveCache.expiresAt > now) {
    return liveCache.payload;
  }
  if (liveCache.pending) {
    return liveCache.pending;
  }

  liveCache.pending = buildLivePayload()
    .then((payload) => {
      liveCache.payload = payload;
      liveCache.expiresAt = Date.now() + LIVE_CACHE_TTL_MS;
      return payload;
    })
    .finally(() => {
      liveCache.pending = null;
    });

  return liveCache.pending;
}

export async function GET() {
  const payload = await getLivePayload();
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=10, stale-while-revalidate=20",
    },
  });
}
