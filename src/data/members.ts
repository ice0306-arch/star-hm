export type Race = "Protoss" | "Terran" | "Zerg";

export type BalanceTier =
  | "Spade"
  | "King"
  | "God"
  | "Joker"
  | "0티어"
  | "1티어"
  | "3티어"
  | "4티어"
  | "5티어"
  | "6티어"
  | "7티어"
  | "8티어"
  | "Baby"
  | null;

export type MemberGroup = "leadership" | "faculty-coach" | "student";

export interface Member {
  id: string;
  name: string;
  role: string;
  group: MemberGroup;
  balanceTier: BalanceTier;
  race: Race;
  url: string;
  linkLabel: string;
  order: number;
  avatar?: string;
}

export const members: Member[] = [
  {
    id: "hyukmin",
    name: "혁민",
    role: "이사장",
    group: "leadership",
    balanceTier: null,
    race: "Zerg",
    url: "https://www.sooplive.com/station/suhi370erw",
    linkLabel: "숲티비 채널 바로가기",
    order: 1,
    avatar: "/members/hyukmin.jpg",
  },
  {
    id: "kangmin",
    name: "강민",
    role: "총장",
    group: "faculty-coach",
    balanceTier: "Spade",
    race: "Protoss",
    url: "https://www.sooplive.com/station/nalra82",
    linkLabel: "숲티비 채널 바로가기",
    order: 2,
    avatar: "/members/kangmin.jpg",
  },
  {
    id: "choi-hoseon",
    name: "최호선",
    role: "교수",
    group: "faculty-coach",
    balanceTier: "God",
    race: "Terran",
    url: "https://www.sooplive.com/station/ghtjs3833",
    linkLabel: "숲티비 채널 바로가기",
    order: 3,
    avatar: "/members/choi-hoseon.jpg",
  },
  {
    id: "bang-taesu",
    name: "방태수",
    role: "교수",
    group: "faculty-coach",
    balanceTier: "King",
    race: "Zerg",
    url: "https://www.sooplive.com/station/bts150",
    linkLabel: "숲티비 채널 바로가기",
    order: 4,
    avatar: "/members/bang-taesu.jpg",
  },
  {
    id: "park-junhyuk",
    name: "박준혁",
    role: "교수",
    group: "faculty-coach",
    balanceTier: "Joker",
    race: "Protoss",
    url: "https://www.sooplive.com/station/jhyhlli123",
    linkLabel: "숲티비 채널 바로가기",
    order: 5,
    avatar: "/members/park-junhyuk.jpg",
  },
  {
    id: "kim-sungje",
    name: "김성제",
    role: "교수",
    group: "faculty-coach",
    balanceTier: "Spade",
    race: "Protoss",
    url: "https://www.sooplive.com/station/erosrainbow",
    linkLabel: "숲티비 채널 바로가기",
    order: 6,
    avatar: "/members/kim-sungje.jpg",
  },
  {
    id: "pame",
    name: "파메",
    role: "코치",
    group: "faculty-coach",
    balanceTier: "0티어",
    race: "Protoss",
    url: "https://www.sooplive.com/station/heksd",
    linkLabel: "숲티비 채널 바로가기",
    order: 7,
    avatar: "/members/pame.jpg",
  },
  {
    id: "karis",
    name: "카리스",
    role: "코치",
    group: "faculty-coach",
    balanceTier: "1티어",
    race: "Terran",
    url: "https://www.sooplive.com/station/igoldtree",
    linkLabel: "숲티비 채널 바로가기",
    order: 8,
    avatar: "/members/karis.jpg",
  },
  {
    id: "sarange",
    name: "사랑e",
    role: "학생",
    group: "student",
    balanceTier: "3티어",
    race: "Protoss",
    url: "https://www.sooplive.com/station/sr629",
    linkLabel: "숲티비 채널 바로가기",
    order: 9,
    avatar: "/members/sarange.jpg",
  },
  {
    id: "seula",
    name: "슬아",
    role: "학생",
    group: "student",
    balanceTier: "4티어",
    race: "Protoss",
    url: "https://www.sooplive.com/station/ekfrqkf",
    linkLabel: "숲티비 채널 바로가기",
    order: 10,
    avatar: "/members/seula.jpg",
  },
  {
    id: "seoldungi",
    name: "설둥이",
    role: "학생",
    group: "student",
    balanceTier: "5티어",
    race: "Protoss",
    url: "https://www.sooplive.com/station/snowssa",
    linkLabel: "숲티비 채널 바로가기",
    order: 11,
    avatar: "/members/seoldungi.jpg",
  },
  {
    id: "yeonblbi",
    name: "연블비",
    role: "학생회장",
    group: "student",
    balanceTier: "6티어",
    race: "Zerg",
    url: "https://www.sooplive.com/station/ynblbee",
    linkLabel: "숲티비 채널 바로가기",
    order: 12,
    avatar: "/members/yeonblbi.jpg",
  },
  {
    id: "sasasam",
    name: "사사삼",
    role: "학생",
    group: "student",
    balanceTier: "7티어",
    race: "Protoss",
    url: "https://www.sooplive.com/station/bangsong12",
    linkLabel: "숲티비 채널 바로가기",
    order: 13,
    avatar: "/members/sasasam.jpg",
  },
  {
    id: "sewol",
    name: "세월",
    role: "학생",
    group: "student",
    balanceTier: "7티어",
    race: "Protoss",
    url: "https://www.sooplive.com/station/asdsa1113",
    linkLabel: "숲티비 채널 바로가기",
    order: 14,
    avatar: "/members/sewol.jpg",
  },
  {
    id: "jeongyeon",
    name: "정연이",
    role: "학생",
    group: "student",
    balanceTier: "8티어",
    race: "Protoss",
    url: "https://www.sooplive.com/station/yeom1020",
    linkLabel: "숲티비 채널 바로가기",
    order: 15,
    avatar: "/members/jeongyeon.jpg",
  },
  {
    id: "ieungssi",
    name: "이응씨",
    role: "학생",
    group: "student",
    balanceTier: "8티어",
    race: "Terran",
    url: "https://www.sooplive.com/station/onzzang",
    linkLabel: "숲티비 채널 바로가기",
    order: 16,
    avatar: "/members/ieungssi.jpg",
  },
  {
    id: "iara",
    name: "이아라",
    role: "학생",
    group: "student",
    balanceTier: "Baby",
    race: "Protoss",
    url: "https://www.sooplive.com/station/ara9687",
    linkLabel: "숲티비 채널 바로가기",
    order: 17,
    avatar: "/members/iara.jpg",
  },
];

export const orderedMembers = [...members].sort((a, b) => a.order - b.order);

export const balanceTiers = [
  "Spade",
  "King",
  "God",
  "Joker",
  "0티어",
  "1티어",
  "3티어",
  "4티어",
  "5티어",
  "6티어",
  "7티어",
  "8티어",
  "Baby",
] as const satisfies Exclude<BalanceTier, null>[];

export const races = ["Protoss", "Terran", "Zerg"] as const satisfies Race[];
