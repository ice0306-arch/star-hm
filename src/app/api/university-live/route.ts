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

function parseLivePlayers(html: string): UniversityLivePlayer[] {
  const players: UniversityLivePlayer[] = [];
  const tierSections = html.matchAll(/<div class="tier-section" id="([^"]+)">([\s\S]*?)(?=<div class="tier-section" id=|<script>)/g);

  for (const section of tierSections) {
    const tier = tierIdMap[section[1]] ?? "Unknown";
    const body = section[2];
    const cards = body.matchAll(
      /<a class="player-card ([^"]+)"[\s\S]*?data-id="([^"]*)"[\s\S]*?data-race="([^"]*)"[\s\S]*?data-name="([^"]*)"[\s\S]*?data-college="([^"]*)"[\s\S]*?href="([^"]*)"/g,
    );

    for (const card of cards) {
      const className = card[1];
      if (className.includes("offline")) {
        continue;
      }

      players.push({
        id: decodeHtml(card[2]),
        race: toRace(card[3]),
        name: decodeHtml(card[4]),
        college: decodeHtml(card[5]) || "무소속",
        tier,
        url: decodeHtml(card[6]),
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
