import { NextResponse } from "next/server";
import { orderedMembers, type Member } from "@/data/members";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SOOP_CHANNEL_API = "https://api-channel.sooplive.com/v1.1/channel";
const MAX_BOARDS_PER_MEMBER = 2;
const MAX_POSTS_PER_BOARD = 4;
const MAX_TOTAL_POSTS = 30;
const POSTS_CACHE_TTL_MS = 90_000;
const POSTS_FETCH_TIMEOUT_MS = 3_500;
const MEMBER_POSTS_CONCURRENCY = 4;

interface BoardMenu {
  bbsNo?: string | number;
  name?: string;
  authNo?: string | number;
  displayType?: string | number;
}

interface PostItem {
  id: string;
  memberId: string;
  memberName: string;
  soopId: string;
  title: string;
  summary: string;
  url: string;
  regDate: string;
  commentCount: number;
  readCount: number;
  boardName: string;
  isNotice: boolean;
}

interface PostsCache {
  payload: null | {
    posts: PostItem[];
    total: number;
    updatedAt: number;
    fallback: boolean;
  };
  expiresAt: number;
  pending: null | Promise<NonNullable<PostsCache["payload"]>>;
}

const globalCache = globalThis as typeof globalThis & {
  __STAR_HM_POSTS_CACHE?: PostsCache;
};

const postsCache =
  globalCache.__STAR_HM_POSTS_CACHE ??
  {
    payload: null,
    expiresAt: 0,
    pending: null,
  };

globalCache.__STAR_HM_POSTS_CACHE = postsCache;

function getSoopId(member: Member) {
  const match = member.url.match(/sooplive\.com\/station\/([^/?#]+)/i);
  return match?.[1] ?? "";
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "Mozilla/5.0",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(POSTS_FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`SOOP ${response.status}`);
  }
  return response.json();
}

function pickBoards(menu: unknown): BoardMenu[] {
  const boardRows = Array.isArray((menu as { board?: unknown[] })?.board)
    ? ((menu as { board: BoardMenu[] }).board)
    : [];
  const publicBoards = boardRows.filter((board) => {
    const authNo = Number(board?.authNo || 0);
    const displayType = Number(board?.displayType || 0);
    return authNo === 101 && (displayType === 103 || displayType === 104);
  });
  const noticeBoards = publicBoards.filter((board) => /공지|방송|notice|general|hm/i.test(String(board?.name || "")));
  const unique = new Map<string, BoardMenu>();
  [...noticeBoards, ...publicBoards].forEach((board) => {
    const bbsNo = String(board?.bbsNo || "").trim();
    if (bbsNo && !unique.has(bbsNo)) {
      unique.set(bbsNo, board);
    }
  });
  return [...unique.values()].slice(0, MAX_BOARDS_PER_MEMBER);
}

function normalizePost(post: Record<string, unknown>, member: Member, soopId: string, board: BoardMenu): PostItem | null {
  const titleNo = String(post?.titleNo || "").trim();
  const title = String(post?.titleName || "").trim();
  if (!titleNo || !title) {
    return null;
  }

  const content = post?.content as Record<string, unknown> | undefined;
  const count = post?.count as Record<string, unknown> | undefined;
  const display = post?.display as Record<string, unknown> | undefined;

  return {
    id: `${member.id}-${titleNo}`,
    memberId: member.id,
    memberName: member.name,
    soopId,
    title,
    summary: String(content?.summary || content?.textContent || "").trim(),
    url: `https://www.sooplive.com/station/${encodeURIComponent(soopId)}/post/${encodeURIComponent(titleNo)}`,
    regDate: String(post?.regDate || ""),
    commentCount: Number(count?.commentCnt || 0),
    readCount: Number(count?.readCnt || count?.vodReadCnt || 0),
    boardName: String(display?.bbsName || board?.name || "공지"),
    isNotice: Number(post?.noticeYn || 0) > 0,
  };
}

async function fetchBoardPosts(member: Member, soopId: string, board: BoardMenu) {
  const bbsNo = String(board?.bbsNo || "").trim();
  if (!bbsNo) {
    return [];
  }

  const params = new URLSearchParams({
    bbs_no: bbsNo,
    per_page: String(MAX_POSTS_PER_BOARD),
    field: "title,user_nick,user_id",
  });
  const payload = await fetchJson(`${SOOP_CHANNEL_API}/${encodeURIComponent(soopId)}/board?${params}`);
  const noticeData = Array.isArray(payload?.noticeData) ? payload.noticeData : [];
  const contents = Array.isArray(payload?.contents) ? payload.contents : [];
  return [...noticeData, ...contents]
    .slice(0, MAX_POSTS_PER_BOARD)
    .map((post: Record<string, unknown>) => normalizePost(post, member, soopId, board))
    .filter((post: PostItem | null): post is PostItem => Boolean(post));
}

async function fetchMemberPosts(member: Member) {
  const soopId = getSoopId(member);
  if (!soopId) {
    return [];
  }

  const menu = await fetchJson(`${SOOP_CHANNEL_API}/${encodeURIComponent(soopId)}/menu`);
  const boards = pickBoards(menu);
  const settled = await Promise.allSettled(boards.map((board) => fetchBoardPosts(member, soopId, board)));
  return settled.flatMap((item) => (item.status === "fulfilled" ? item.value : []));
}

async function fetchMembersPosts() {
  const results: PostItem[][] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < orderedMembers.length) {
      const index = cursor;
      cursor += 1;

      try {
        results[index] = await fetchMemberPosts(orderedMembers[index]);
      } catch {
        results[index] = [];
      }
    }
  }

  await Promise.all(Array.from({ length: MEMBER_POSTS_CONCURRENCY }, worker));
  return results.flat();
}

function fallbackPosts(): PostItem[] {
  return orderedMembers.map((member) => {
    const soopId = getSoopId(member);
    return {
      id: `${member.id}-station-board`,
      memberId: member.id,
      memberName: member.name,
      soopId,
      title: `${member.name} 공지 게시판`,
      summary: "최신 공지는 멤버 채널 게시판에서 확인할 수 있습니다.",
      url: member.url,
      regDate: "",
      commentCount: 0,
      readCount: 0,
      boardName: "채널 공지",
      isNotice: true,
    };
  });
}

function sortPosts(posts: PostItem[]) {
  const unique = new Map<string, PostItem>();
  posts.forEach((post) => {
    if (!unique.has(post.id)) {
      unique.set(post.id, post);
    }
  });
  return [...unique.values()]
    .sort((a, b) => {
      const aTime = Date.parse(a.regDate.replace(" ", "T"));
      const bTime = Date.parse(b.regDate.replace(" ", "T"));
      return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
    })
    .slice(0, MAX_TOTAL_POSTS);
}

async function buildPostsPayload() {
  const posts = sortPosts(await fetchMembersPosts());
  const fallback = posts.length === 0;
  const finalPosts = fallback ? fallbackPosts() : posts;
  return {
    posts: finalPosts,
    total: finalPosts.length,
    updatedAt: Date.now(),
    fallback,
  };
}

async function getPostsPayload() {
  const now = Date.now();
  if (postsCache.payload && postsCache.expiresAt > now) {
    return postsCache.payload;
  }
  if (postsCache.pending) {
    return postsCache.pending;
  }

  postsCache.pending = buildPostsPayload()
    .then((payload) => {
      postsCache.payload = payload;
      postsCache.expiresAt = Date.now() + POSTS_CACHE_TTL_MS;
      return payload;
    })
    .finally(() => {
      postsCache.pending = null;
    });

  return postsCache.pending;
}

export async function GET() {
  const payload = await getPostsPayload();
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=90, stale-while-revalidate=180",
    },
  });
}
