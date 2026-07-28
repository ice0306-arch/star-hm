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

export type UniversityTierSnapshot = {
  college: string;
  total: number;
  race: Record<UniversityRaceKey, number>;
  tiers: Partial<Record<UniversityTierKey, number>>;
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

export const universityTopTierKeys: UniversityTierKey[] = ["God", "King", "Jack", "Joker", "Spade"];

const race = (Terran: number, Zerg: number, Protoss: number, Unknown = 0): Record<UniversityRaceKey, number> => ({
  Terran,
  Zerg,
  Protoss,
  Unknown,
});

export const universityTierSnapshots: UniversityTierSnapshot[] = [
  { college: "수술대", total: 25, race: race(5, 9, 11), tiers: { God: 1, King: 1, Jack: 3, Joker: 1, "0": 1, "1": 2, "3": 3, "4": 1, "5": 3, "6": 3, "7": 3, "8": 1, Baby: 2 } },
  { college: "흑카데미", total: 19, race: race(19, 0, 0), tiers: { Jack: 3, Joker: 1, Spade: 1, "1": 1, "2": 2, "3": 1, "5": 2, "6": 2, "7": 3, "8": 2, Baby: 1 } },
  { college: "JSA", total: 21, race: race(6, 10, 5), tiers: { God: 3, King: 1, Jack: 2, Joker: 1, "2": 1, "3": 3, "4": 1, "6": 1, "7": 3, "8": 1, Baby: 4 } },
  { college: "YB", total: 9, race: race(5, 1, 3), tiers: { Jack: 1, "4": 3, "6": 3, "7": 1, Baby: 1 } },
  { college: "케이대", total: 21, race: race(4, 7, 10), tiers: { God: 2, King: 2, Jack: 2, Joker: 1, Spade: 1, "0": 2, "2": 1, "4": 2, "5": 1, "6": 2, "7": 1, "8": 3, Baby: 1 } },
  { college: "무소속", total: 98, race: race(22, 37, 39), tiers: { God: 13, King: 4, Jack: 9, Joker: 13, Spade: 13, "0": 5, "1": 4, "2": 1, "3": 4, "4": 7, "5": 7, "6": 8, "7": 5, "8": 4, Baby: 1 } },
  { college: "캄몬스타즈", total: 21, race: race(6, 10, 5), tiers: { God: 2, King: 2, Jack: 4, "2": 1, "3": 2, "4": 2, "5": 3, "6": 2, "7": 2, Baby: 1 } },
  { college: "엠비대", total: 21, race: race(5, 8, 8), tiers: { King: 1, Jack: 4, Joker: 1, Spade: 1, "0": 1, "2": 1, "3": 1, "5": 3, "6": 2, "7": 1, "8": 5 } },
  { college: "와플대", total: 16, race: race(3, 7, 6), tiers: { Jack: 2, Joker: 2, Spade: 1, "3": 1, "4": 1, "5": 2, "6": 1, "7": 2, "8": 3, Baby: 1 } },
  { college: "뉴캣슬", total: 23, race: race(5, 6, 12), tiers: { God: 2, Jack: 1, Joker: 3, Spade: 3, "3": 1, "4": 2, "5": 1, "6": 2, "7": 3, "8": 4, Baby: 1 } },
  { college: "BGM", total: 19, race: race(5, 5, 9), tiers: { Jack: 2, Joker: 1, Spade: 2, "1": 1, "2": 1, "3": 1, "4": 1, "5": 3, "6": 1, "7": 2, "8": 2, Baby: 2 } },
  { college: "HM", total: 14, race: race(3, 3, 8), tiers: { God: 1, King: 1, Joker: 1, Spade: 1, "0": 1, "1": 1, "3": 1, "4": 1, "5": 1, "6": 1, "7": 1, "8": 1, Baby: 2 }, featured: true },
  { college: "DM", total: 13, race: race(4, 4, 5), tiers: { King: 3, Spade: 1, "0": 1, "2": 1, "3": 1, "4": 1, "6": 1, "7": 3, "8": 1 } },
  { college: "신세계", total: 14, race: race(3, 3, 8), tiers: { God: 1, King: 1, Jack: 1, Joker: 2, "2": 1, "4": 1, "5": 1, "6": 1, "7": 2, "8": 2, Baby: 1 } },
];
