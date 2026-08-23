import { NextResponse } from "next/server";
import { type UniversityRaceKey, type UniversityTierKey } from "@/data/universityTiers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UNIVERSITY_TIER_SOURCE_URL = "https://onek-soop.com/tier";
const CACHE_TTL_MS = 45_000;
const FETCH_TIMEOUT_MS = 4_000;
const EXCLUDED_LIVE_SOOP_IDS = new Set(["bangsong12", "yeom1020", "jjyjeh5454", "595935", "suhi370erw"]);
const LIVE_PLAYER_OVERRIDES = new Map<string, Partial<Pick<UniversityLivePlayer, "college" | "name" | "race" | "tier">>>([
  ["nalra82", { college: "무소속", name: "강민", race: "Protoss", tier: "Spade" }],
  ["ghtjs3833", { college: "무소속", name: "최호선", race: "Terran", tier: "God" }],
  ["bts150", { college: "무소속", name: "방태수", race: "Zerg", tier: "King" }],
  ["jhyhlli123", { college: "무소속", name: "박준혁", race: "Protoss", tier: "Joker" }],
  ["heksd", { college: "무소속", name: "파메", race: "Protoss", tier: "0" }],
  ["igoldtree", { college: "무소속", name: "카리스", race: "Terran", tier: "1" }],
  ["sr629", { college: "무소속", name: "사랑e", race: "Protoss", tier: "3" }],
  ["ekfrqkf", { college: "무소속", name: "슬아", race: "Protoss", tier: "4" }],
  ["snowssa", { college: "무소속", name: "설둥이", race: "Protoss", tier: "5" }],
  ["ynblbee", { college: "무소속", name: "연블비", race: "Zerg", tier: "6" }],
  ["asdsa1113", { college: "무소속", name: "세월", race: "Protoss", tier: "7" }],
  ["onzzang", { college: "무소속", name: "이응씨", race: "Terran", tier: "8" }],
  ["ara9687", { college: "무소속", name: "이아라", race: "Protoss", tier: "Baby" }],
  ["2ahgo1203", { college: "뉴캣슬", name: "이아깽" }],
  ["sulstyle00", { college: "신세계", name: "설영욱", race: "Protoss", tier: "Baby" }],
  ["jmc06170", { college: "캄몬스타즈", name: "왜냐맨", race: "Protoss", tier: "Jack" }],
  ["qndnd12", { college: "수술대" }],
  ["comcmxx", { college: "수술대" }],
  ["wjswpalssla1", { college: "수술대" }],
]);

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
  if (college === "FA" || college === "리셋느" || college === "씨나인" || college.toUpperCase() === "C9") {
    return "무소속";
  }
  return college;
}

function toTier(value: string): UniversityLivePlayer["tier"] {
  if (value === "God" || value === "King" || value === "Jack" || value === "Joker" || value === "Spade" || value === "Baby") {
    return value;
  }
  if (/^[0-8]$/.test(value)) {
    return value as UniversityTierKey;
  }
  return "Unknown";
}

function parseOneKString(value: string, key: string) {
  const pattern = new RegExp(`\\\\\\\"${key}\\\\\\\":\\\\\\\"([^]*?)\\\\\\\"`);
  return decodeHtml(pattern.exec(value)?.[1] ?? "");
}

function parseOneKNumber(value: string, key: string) {
  const pattern = new RegExp(`\\\\\\\"${key}\\\\\\\":(\\d+)`);
  return numberFrom(pattern.exec(value)?.[1]);
}

function parseOneKLivePlayers(html: string): UniversityLivePlayer[] {
  const players: UniversityLivePlayer[] = [];
  const itemPattern =
    /\\\"name\\\":\\\"([^\\"]+)\\\",\\\"crew\\\":\\\"([^\\"]+)\\\"[\s\S]*?\\\"race\\\":\\\"([^\\"]+)\\\",\\\"tier\\\":(?:\\\"([^\\"]*)\\\"|null),\\\"soopId\\\":\\\"([^\\"]+)\\\",\\\"image\\\":\\\"([^\\"]*)\\\"[\s\S]*?\\\"live\\\":\{\\\"isLive\\\":(true|false)([\s\S]*?)\}\}/g;

  for (const item of html.matchAll(itemPattern)) {
    if (item[7] !== "true") {
      continue;
    }

    const livePart = item[8];
    const soopId = decodeHtml(item[5]);
    if (EXCLUDED_LIVE_SOOP_IDS.has(soopId)) {
      continue;
    }

    const override = LIVE_PLAYER_OVERRIDES.get(soopId);
    const broadNo = String(parseOneKNumber(livePart, "broadNo") || "").trim();

    players.push({
      id: soopId,
      race: override?.race ?? toRace(item[3].toLowerCase()),
      name: override?.name ?? decodeHtml(item[1]),
      college: override?.college ?? normalizeCollege(item[2]),
      tier: override?.tier ?? toTier(item[4] ?? ""),
      url: broadNo
        ? `https://play.sooplive.com/${encodeURIComponent(soopId)}/${encodeURIComponent(broadNo)}`
        : `https://play.sooplive.com/${encodeURIComponent(soopId)}`,
      title: parseOneKString(livePart, "title"),
      viewers: parseOneKNumber(livePart, "viewers"),
      startedAt: "",
      thumbnail: parseOneKString(livePart, "thumbnail"),
    });
  }

  return players;
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0" },
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    return "";
  }

  return response.text();
}

async function buildLivePayload() {
  try {
    const html = await fetchText(UNIVERSITY_TIER_SOURCE_URL);
    const players = html ? parseOneKLivePlayers(html) : [];
    return {
      players,
      liveCount: players.length,
      updatedAt: Date.now(),
    };
  } catch {
    return {
      players: [],
      liveCount: 0,
      updatedAt: Date.now(),
    };
  }
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
