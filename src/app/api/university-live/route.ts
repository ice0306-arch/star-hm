import { NextResponse } from "next/server";
import { type UniversityRaceKey, type UniversityTierKey } from "@/data/universityTiers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UNIVERSITY_LIVE_URL = "https://ssustar.iwinv.net/live";
const CACHE_TTL_MS = 45_000;
const FETCH_TIMEOUT_MS = 4_000;

type UniversityLivePlayer = {
  id: string;
  name: string;
  college: string;
  race: UniversityRaceKey;
  tier: UniversityTierKey | "Unknown";
  url: string;
  title: string;
  viewers: number;
  startedAt: string;
  thumbnail: string;
};

type SourceLiveStatus = {
  isLive?: boolean;
  thumbnail?: string;
  title?: string;
  viewers?: string | number;
  nickname?: string;
  broad_start?: string;
};

interface UniversityLiveCache {
  payload: null | {
    players: UniversityLivePlayer[];
    liveCount: number;
    updatedAt: number;
  };
  expiresAt: number;
  pending: null | Promise<NonNullable<UniversityLiveCache["payload"]>>;
}

const globalCache = globalThis as typeof globalThis & {
  __STAR_HM_UNIVERSITY_LIVE_CACHE?: UniversityLiveCache;
};

const liveCache =
  globalCache.__STAR_HM_UNIVERSITY_LIVE_CACHE ??
  {
    payload: null,
    expiresAt: 0,
    pending: null,
  };

globalCache.__STAR_HM_UNIVERSITY_LIVE_CACHE = liveCache;

const tierIdMap: Record<string, UniversityLivePlayer["tier"]> = {
  "tier-god": "God",
  "tier-king": "King",
  "tier-jack": "Jack",
  "tier-joker": "Joker",
  "tier-spade": "Spade",
  "tier-0": "0",
  "tier-1": "1",
  "tier-2": "2",
  "tier-3": "3",
  "tier-4": "4",
  "tier-5": "5",
  "tier-6": "6",
  "tier-7": "7",
  "tier-8": "8",
  "tier-9": "Baby",
};

function toRace(value: string): UniversityRaceKey {
  if (value === "terran") {
    return "Terran";
  }
  if (value === "zerg") {
    return "Zerg";
  }
  if (value === "protoss") {
    return "Protoss";
  }
  return "Unknown";
}

function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#039;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .trim();
}

function numberFrom(value: unknown) {
  const normalized = Number(String(value ?? "").replaceAll(",", "").trim());
  return Number.isFinite(normalized) && normalized > 0 ? normalized : 0;
}

function normalizeCollege(value: string) {
  const college = decodeHtml(value) || "무소속";
  if (college === "씨나인" || college.toUpperCase() === "C9") {
    return "무소속";
  }
  return college;
}

function parseLiveStatuses(html: string) {
  const match = html.match(/const\s+liveStatuses\s*=\s*(\{[\s\S]*?\});/);
  if (!match) {
    return {} as Record<string, SourceLiveStatus>;
  }

  try {
    return JSON.parse(match[1]) as Record<string, SourceLiveStatus>;
  } catch {
    return {} as Record<string, SourceLiveStatus>;
  }
}

function parseLivePlayers(html: string): UniversityLivePlayer[] {
  const players: UniversityLivePlayer[] = [];
  const liveStatuses = parseLiveStatuses(html);
  const tierSections = html.matchAll(/<div class="tier-section" id="([^"]+)">([\s\S]*?)(?=<div class="tier-section" id=|<script>)/g);

  for (const section of tierSections) {
    const tier = tierIdMap[section[1]] ?? "Unknown";
    const body = section[2];
    const cards = body.matchAll(
      /<a class="player-card ([^"]+)"[\s\S]*?data-id="([^"]*)"[\s\S]*?data-race="([^"]*)"[\s\S]*?data-name="([^"]*)"[\s\S]*?data-college="([^"]*)"[\s\S]*?href="([^"]*)"/g,
    );

    for (const card of cards) {
      const liveStatus = liveStatuses[decodeHtml(card[2])];
      if (!liveStatus?.isLive) {
        continue;
      }

      players.push({
        id: decodeHtml(card[2]),
        race: toRace(card[3]),
        name: decodeHtml(card[4]),
        college: normalizeCollege(card[5]),
        tier,
        url: decodeHtml(card[6]),
        title: String(liveStatus.title ?? "").trim(),
        viewers: numberFrom(liveStatus.viewers),
        startedAt: String(liveStatus.broad_start ?? "").trim(),
        thumbnail: String(liveStatus.thumbnail ?? "").trim(),
      });
    }
  }

  return players;
}

async function buildLivePayload() {
  let response: Response;
  try {
    response = await fetch(UNIVERSITY_LIVE_URL, {
      headers: { "user-agent": "Mozilla/5.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    return { players: [], liveCount: 0, updatedAt: Date.now() };
  }

  if (!response.ok) {
    return { players: [], liveCount: 0, updatedAt: Date.now() };
  }

  const html = await response.text();
  const players = parseLivePlayers(html);
  return {
    players,
    liveCount: players.length,
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
      liveCache.expiresAt = Date.now() + CACHE_TTL_MS;
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
      "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60",
    },
  });
}
