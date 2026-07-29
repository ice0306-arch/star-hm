export type UniversityRaceKey = "Terran" | "Zerg" | "Protoss" | "Unknown";

export type UniversityTierKey =
  | "God"
  | "King"
  | "Jack"
  | "Joker"
  | "Spade"
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "Baby";

export type UniversitySnapshotTierKey = UniversityTierKey | "Unknown";

export type UniversityTierSnapshot = {
  college: string;
  total: number;
  race: Record<UniversityRaceKey, number>;
  tiers: Partial<Record<UniversitySnapshotTierKey, number>>;
  memberNames?: string[];
  featured?: boolean;
};

export const universityTierLabels: Record<UniversityTierKey, string> = {
  God: "갓티어",
  King: "킹티어",
  Jack: "잭티어",
  Joker: "조커티어",
  Spade: "스페이드티어",
  "0": "0티어",
  "1": "1티어",
  "2": "2티어",
  "3": "3티어",
  "4": "4티어",
  "5": "5티어",
  "6": "6티어",
  "7": "7티어",
  "8": "8티어",
  Baby: "베이비티어",
};

export const universityTierOrder: UniversityTierKey[] = ["God", "King", "Jack", "Joker", "Spade", "0", "1", "2", "3", "4", "5", "6", "7", "8", "Baby"];
export const universitySnapshotTierOrder: UniversitySnapshotTierKey[] = [...universityTierOrder, "Unknown"];

export const universityTopTierKeys: UniversityTierKey[] = ["God", "King", "Jack", "Joker", "Spade"];

const race = (Terran: number, Zerg: number, Protoss: number, Unknown = 0): Record<UniversityRaceKey, number> => ({
  Terran,
  Zerg,
  Protoss,
  Unknown,
});

export const universityTierSnapshots: UniversityTierSnapshot[] = [
  { college: "수술대", total: 20, race: race(5, 8, 7), tiers: { God: 1, King: 1, Jack: 1, "0": 1, "1": 1, "3": 3, "4": 1, "5": 2, "6": 3, "7": 3, "8": 1, Baby: 2 }, memberNames: ["정중만", "짭제", "신상문", "선우도현", "이소룡", "다린", "공다츠", "파찌", "기나", "몽순", "깨림이", "밍가", "핑핑", "2라니", "면추가", "아링", "밥새", "혜요이", "봉덕이", "온도이"] },
  { college: "흑카데미", total: 20, race: race(20, 0, 0), tiers: { King: 1, Jack: 3, Joker: 1, Spade: 1, "1": 1, "2": 2, "3": 1, "5": 2, "6": 2, "7": 3, "8": 2, Baby: 1 }, memberNames: ["흑운장", "유승곤", "배호막", "민찬기", "달그락영주", "팔레트", "빡재", "우힝이", "허영", "나예리", "유이", "메몽", "선경은", "갱이다", "제갈츄빈", "경몽", "김유나", "오세은", "가영", "링가"] },
  { college: "JSA", total: 21, race: race(6, 10, 5), tiers: { God: 3, King: 1, Jack: 2, Joker: 1, "2": 1, "3": 3, "4": 1, "6": 1, "7": 3, "8": 1, Baby: 4 } },
  { college: "YB", total: 9, race: race(5, 1, 3), tiers: { Jack: 1, "4": 3, "6": 3, "7": 1, Baby: 1 } },
  { college: "케이대", total: 21, race: race(4, 7, 10), tiers: { God: 2, King: 2, Jack: 2, Joker: 1, Spade: 1, "0": 2, "2": 1, "4": 2, "5": 1, "6": 2, "7": 1, "8": 3, Baby: 1 } },
  { college: "무소속", total: 97, race: race(22, 36, 39), tiers: { God: 13, King: 4, Jack: 9, Joker: 13, Spade: 13, "0": 5, "1": 4, "2": 1, "3": 4, "4": 7, "5": 7, "6": 7, "7": 5, "8": 4, Baby: 1 } },
  { college: "캄몬스타즈", total: 21, race: race(6, 10, 5), tiers: { God: 2, King: 2, Jack: 4, "2": 1, "3": 2, "4": 2, "5": 3, "6": 2, "7": 2, Baby: 1 } },
  { college: "엠비대", total: 21, race: race(5, 8, 8), tiers: { King: 1, Jack: 4, Joker: 1, Spade: 1, "0": 1, "2": 1, "3": 1, "5": 3, "6": 2, "7": 1, "8": 5 } },
  { college: "와플대", total: 16, race: race(3, 7, 6), tiers: { Jack: 2, Joker: 2, Spade: 1, "3": 1, "4": 1, "5": 2, "6": 1, "7": 2, "8": 3, Baby: 1 } },
  { college: "뉴캣슬", total: 23, race: race(5, 6, 12), tiers: { God: 2, Jack: 1, Joker: 3, Spade: 3, "3": 1, "4": 2, "5": 1, "6": 2, "7": 3, "8": 4, Baby: 1 } },
  { college: "BGM", total: 20, race: race(5, 5, 10), tiers: { Jack: 2, Joker: 1, Spade: 2, "1": 1, "2": 1, "3": 1, "4": 1, "5": 3, "6": 1, "7": 2, "8": 3, Baby: 2 }, memberNames: ["뽀현욱", "프발", "김범수", "김대한", "난수", "이윤열", "안아", "김효아", "뚜미", "꼬니부깅", "뽀누나", "슈슈", "라운이", "엔돌핀", "다라츄", "황단비", "예담", "제티", "진서랄까", "두줄조합"] },
  { college: "HM", total: 14, race: race(3, 3, 8), tiers: { God: 1, King: 1, Joker: 1, Spade: 1, "0": 1, "1": 1, "3": 1, "4": 1, "5": 1, "6": 1, "7": 1, "8": 1, Baby: 2 }, featured: true },
  { college: "DM", total: 13, race: race(4, 4, 5), tiers: { King: 3, Spade: 1, "0": 1, "2": 1, "3": 1, "4": 1, "6": 1, "7": 3, "8": 1 } },
  { college: "신세계", total: 14, race: race(3, 4, 7), tiers: { God: 1, King: 1, Jack: 1, Joker: 2, "2": 1, "4": 1, "5": 1, "6": 1, "7": 2, "8": 2, Unknown: 1 }, memberNames: ["설영욱", "몽군", "윤수철", "권혁진", "금식", "김상곤", "또봉순", "연애인", "예슬", "김설", "요시", "지우리", "혜냥", "밤하밍"] },
];
