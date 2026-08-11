export type CupTeamKey =
  | "kammon"
  | "hm"
  | "mbu"
  | "newcastle"
  | "bgm"
  | "jsa"
  | "dm"
  | "k-university"
  | "waffle"
  | "surgery"
  | "shinsegae"
  | "black-academy";

export type CupTeam = {
  key: CupTeamKey;
  name: string;
  logo: string;
};

export type CupStanding = {
  team: CupTeamKey;
  rank: string;
  wins: number;
  losses: number;
  setScore: string;
  points: number;
  seed?: string;
  advances?: boolean;
};

export type CupGroup = {
  name: string;
  teams: CupStanding[];
};

export type CupMatch = {
  date: string;
  time: string;
  group: string;
  left: CupTeamKey;
  right: CupTeamKey;
  status: "done" | "scheduled";
  score?: string;
  winner?: CupTeamKey;
};

export type CupTimelineStep = {
  title: string;
  when: string;
  status: "done" | "soon" | "tbd";
  note?: string;
};

export const cupTeams: Record<CupTeamKey, CupTeam> = {
  kammon: { key: "kammon", name: "캄몬스타즈", logo: "/universities/kammon-stars.webp" },
  hm: { key: "hm", name: "HM", logo: "/universities/hm.webp" },
  mbu: { key: "mbu", name: "엠비대", logo: "/universities/mbu.webp" },
  newcastle: { key: "newcastle", name: "뉴캣슬", logo: "/universities/newcastle.webp" },
  bgm: { key: "bgm", name: "BGM", logo: "/universities/bgm.webp" },
  jsa: { key: "jsa", name: "JSA", logo: "/universities/jsa.webp" },
  dm: { key: "dm", name: "DM", logo: "/universities/dm.webp" },
  "k-university": { key: "k-university", name: "케이대", logo: "/universities/k-university.webp" },
  waffle: { key: "waffle", name: "와플대", logo: "/universities/waffle.webp" },
  surgery: { key: "surgery", name: "수술대", logo: "/universities/surgery.webp" },
  shinsegae: { key: "shinsegae", name: "신세계", logo: "/universities/shinsegae.webp" },
  "black-academy": { key: "black-academy", name: "흑카데미", logo: "/universities/black-academy.webp" },
};

export const cupFacts = [
  { label: "기간", value: "2026-08-02 ~ 2026-09-19" },
  { label: "참가 대학", value: "12팀" },
  { label: "우승 상금", value: "3,500만 원" },
  { label: "결승", value: "상암 SOOP 콜로세움" },
];

export const cupGroups: CupGroup[] = [
  {
    name: "A조",
    teams: [
      { rank: "1", team: "kammon", wins: 1, losses: 0, setScore: "5-2", points: 1, seed: "인기투표 1위", advances: true },
      { rank: "2", team: "hm", wins: 0, losses: 0, setScore: "0-0", points: 0, advances: true },
      { rank: "3", team: "mbu", wins: 0, losses: 1, setScore: "2-5", points: 0 },
    ],
  },
  {
    name: "B조",
    teams: [
      { rank: "-", team: "newcastle", wins: 0, losses: 0, setScore: "0-0", points: 0, seed: "인기투표 2위" },
      { rank: "-", team: "bgm", wins: 0, losses: 0, setScore: "0-0", points: 0 },
      { rank: "-", team: "jsa", wins: 0, losses: 0, setScore: "0-0", points: 0 },
    ],
  },
  {
    name: "C조",
    teams: [
      { rank: "1", team: "dm", wins: 1, losses: 0, setScore: "5-0", points: 1, advances: true },
      { rank: "2", team: "k-university", wins: 0, losses: 0, setScore: "0-0", points: 0, seed: "인기투표 3위", advances: true },
      { rank: "3", team: "waffle", wins: 0, losses: 1, setScore: "0-5", points: 0 },
    ],
  },
  {
    name: "D조",
    teams: [
      { rank: "-", team: "surgery", wins: 0, losses: 0, setScore: "0-0", points: 0, seed: "주최 대학" },
      { rank: "-", team: "shinsegae", wins: 0, losses: 0, setScore: "0-0", points: 0 },
      { rank: "-", team: "black-academy", wins: 0, losses: 0, setScore: "0-0", points: 0 },
    ],
  },
];

export const cupMatches: CupMatch[] = [
  { date: "2026-08-08", time: "종료", group: "A조", left: "kammon", right: "mbu", status: "done", score: "5:2", winner: "kammon" },
  { date: "2026-08-09", time: "종료", group: "C조", left: "waffle", right: "dm", status: "done", score: "0:5", winner: "dm" },
  { date: "2026-08-13", time: "19:00", group: "D조", left: "surgery", right: "shinsegae", status: "scheduled" },
  { date: "2026-08-14", time: "19:00", group: "B조", left: "newcastle", right: "bgm", status: "scheduled" },
  { date: "2026-08-15", time: "19:00", group: "C조", left: "k-university", right: "waffle", status: "scheduled" },
  { date: "2026-08-16", time: "19:00", group: "A조", left: "kammon", right: "hm", status: "scheduled" },
  { date: "2026-08-20", time: "19:00", group: "D조", left: "surgery", right: "black-academy", status: "scheduled" },
  { date: "2026-08-21", time: "19:00", group: "B조", left: "newcastle", right: "jsa", status: "scheduled" },
  { date: "2026-08-22", time: "19:00", group: "C조", left: "k-university", right: "dm", status: "scheduled" },
  { date: "2026-08-23", time: "19:00", group: "A조", left: "hm", right: "mbu", status: "scheduled" },
  { date: "2026-08-27", time: "19:00", group: "D조", left: "shinsegae", right: "black-academy", status: "scheduled" },
  { date: "2026-08-28", time: "19:00", group: "B조", left: "bgm", right: "jsa", status: "scheduled" },
];

export const cupTimeline: CupTimelineStep[] = [
  { title: "수장회의", when: "7월 19일", status: "done", note: "대회 규정과 참가 대학 확정" },
  { title: "인기투표", when: "7월 27일 ~ 7월 30일", status: "done", note: "1~3위가 시드 배정권 획득" },
  { title: "와일드카드전", when: "8월 2일", status: "done", note: "본선 마지막 자리 결정" },
  { title: "조 추첨식", when: "8월 3일 15:00", status: "done", note: "12팀을 A~D 네 조로 배치" },
  { title: "조별리그", when: "8월 8일 ~ 8월 28일", status: "soon", note: "각 조 상위 2팀 8강 진출" },
  { title: "8강", when: "미정", status: "tbd" },
  { title: "4강", when: "미정", status: "tbd" },
  { title: "결승", when: "9월 19일", status: "soon", note: "상암 SOOP 콜로세움 오프라인" },
];
