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

export type UniversityMemberMarker = {
  name: string;
  label: string;
};

export type UniversityTierSnapshot = {
  college: string;
  total: number;
  race: Record<UniversityRaceKey, number>;
  tiers: Partial<Record<UniversitySnapshotTierKey, number>>;
  memberNames?: string[];
  memberMarkers?: UniversityMemberMarker[];
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
  { college: "수술대", total: 22, race: race(5, 8, 9), tiers: { God: 1, King: 1, Jack: 1, Joker: 2, "0": 1, "1": 1, "3": 3, "4": 1, "5": 2, "6": 3, "7": 3, "8": 1, Baby: 2 }, memberNames: ["정중만", "짭제", "신상문", "선우도현", "이소룡", "다린", "공다츠", "파찌", "기나", "몽순", "깨림이", "밍가", "핑핑", "2라니", "면추가", "아링", "밥새", "혜요이", "봉덕이", "온도이", "전제민", "윤준석"], memberMarkers: [{ name: "정중만", label: "이사장" }] },
  { college: "흑카데미", total: 20, race: race(20, 0, 0), tiers: { King: 1, Jack: 3, Joker: 1, Spade: 1, "1": 1, "2": 2, "3": 1, "5": 2, "6": 2, "7": 3, "8": 2, Baby: 1 }, memberNames: ["흑운장", "유승곤", "배호막", "민찬기", "달그락영주", "팔레트", "빡재", "우힝이", "허영", "나예리", "유이", "메몽", "선경은", "갱이다", "제갈츄빈", "경몽", "김유나", "오세은", "가영", "링가"], memberMarkers: [{ name: "흑운장", label: "총장" }] },
  { college: "JSA", total: 21, race: race(6, 10, 5), tiers: { God: 3, King: 1, Jack: 2, Joker: 1, "2": 1, "3": 3, "4": 1, "6": 1, "7": 3, "8": 1, Baby: 4 }, memberNames: ["시조새", "김성대", "홍구", "조기석", "구성훈", "김병수", "김영진", "김민우", "하블리", "라미", "소심", "나린", "려원", "자닌", "백원아", "미진이", "김바다", "떡아", "휘연", "타마양", "모비"], memberMarkers: [{ name: "시조새", label: "이사장" }] },
  { college: "YB", total: 9, race: race(5, 1, 3), tiers: { Jack: 1, "4": 3, "6": 3, "7": 1, Baby: 1 } },
  { college: "케이대", total: 21, race: race(4, 7, 10), tiers: { God: 2, King: 2, Jack: 2, Joker: 1, Spade: 1, "0": 2, "2": 1, "4": 2, "5": 1, "6": 2, "7": 1, "8": 3, Baby: 1 }, memberNames: ["케이", "김학수", "정영재", "장윤철", "홍덕", "깨모다", "정민기", "고석현", "유민", "청소윤", "보혜", "솔돌이", "늑대채린", "링고", "내가연지", "정서린", "박하악", "낭수디", "단비송", "연또", "또야"], memberMarkers: [{ name: "케이", label: "이사장" }, { name: "솔돌이", label: "학생회장" }] },
  { college: "무소속", total: 84, race: race(20, 33, 31), tiers: { God: 13, King: 1, Jack: 9, Joker: 11, Spade: 13, "0": 5, "1": 4, "2": 1, "3": 3, "4": 6, "5": 5, "6": 4, "7": 5, "8": 3, Baby: 1 } },
  { college: "리셋느", total: 11, race: race(2, 4, 5), tiers: { King: 3, "2": 1, "3": 1, "4": 1, "5": 1, "6": 3, "8": 1 }, memberNames: ["김윤중", "어윤수", "윤용태", "빵훈이", "요닝", "오조은", "남수댕", "모리", "오리꿍", "효짱", "진땅콩"] },
  { college: "캄몬스타즈", total: 21, race: race(6, 10, 5), tiers: { God: 2, King: 2, Jack: 4, "2": 1, "3": 2, "4": 2, "5": 3, "6": 2, "7": 2, Baby: 1 }, memberNames: ["김윤환", "변현제", "김민철", "박준오", "사테", "지동원", "배성흠", "박수범", "남덕선", "토마토", "지두두", "햇살", "찌킹", "치리", "주하랑", "소주양", "임조이", "비타밍", "먼진", "아리송이", "낭니"], memberMarkers: [{ name: "김윤환", label: "총장" }] },
  { college: "엠비대", total: 21, race: race(5, 8, 8), tiers: { King: 1, Jack: 4, Joker: 1, Spade: 1, "0": 1, "2": 1, "3": 1, "5": 3, "6": 2, "7": 1, "8": 5 }, memberNames: ["마예준", "병하", "이영한", "얍삼e", "만두호성", "이창우", "정경두", "최재성", "빡죠스", "토스봇", "카히리", "구보라", "최세상", "시녕몽", "오하얀", "김채이", "연수", "정다닝", "권아온", "헴희", "요구리"], memberMarkers: [{ name: "마예준", label: "이사장" }, { name: "병하", label: "이사장" }, { name: "카히리", label: "학생회장" }] },
  { college: "와플대", total: 16, race: race(3, 7, 6), tiers: { Jack: 2, Joker: 2, Spade: 1, "3": 1, "4": 1, "5": 2, "6": 1, "7": 2, "8": 3, Baby: 1 }, memberNames: ["와이퍼", "박성준", "콜지지", "김수식", "허유", "전상욱", "최하니", "금선2", "비재희", "삐약삐약", "태린", "암쥬", "하이현", "구키", "루다", "여지니"], memberMarkers: [{ name: "와이퍼", label: "이사장" }, { name: "박성준", label: "총장" }, { name: "비재희", label: "학생회장" }] },
  { college: "뉴캣슬", total: 23, race: race(5, 6, 12), tiers: { God: 2, Jack: 1, Joker: 3, Spade: 3, "3": 1, "4": 2, "5": 1, "6": 2, "7": 3, "8": 4, Baby: 1 }, memberNames: ["기뉴다", "도재욱", "액션구드론", "초난강", "키링", "최도랑", "퀸주", "막내현진", "단솔", "은니", "박성균", "구라미스", "김건욱", "트슈", "박성준", "박두두", "백갑숙", "진유성", "이아깽", "냥냥코기", "밍또암", "유즈", "하윤"], memberMarkers: [{ name: "기뉴다", label: "대장" }, { name: "도재욱", label: "총장" }] },
  { college: "BGM", total: 20, race: race(5, 5, 10), tiers: { Jack: 2, Joker: 1, Spade: 2, "1": 1, "2": 1, "3": 1, "4": 1, "5": 3, "6": 1, "7": 2, "8": 3, Baby: 2 }, memberNames: ["뽀현욱", "프발", "김범수", "김대한", "난수", "이윤열", "안아", "김효아", "뚜미", "꼬니부깅", "뽀누나", "슈슈", "라운이", "엔돌핀", "다라츄", "황단비", "예담", "제티", "진서랄까", "두플조합"], memberMarkers: [{ name: "뽀현욱", label: "이사장" }, { name: "두플조합", label: "구단주" }] },
  { college: "HM", total: 14, race: race(3, 3, 8), tiers: { God: 1, King: 1, Joker: 1, Spade: 1, "0": 1, "1": 1, "3": 1, "4": 1, "5": 1, "6": 1, "7": 1, "8": 1, Baby: 2 }, memberNames: ["혁민", "강민", "최호선", "방태수", "박준혁", "파메", "솔아", "이응씨", "카리스", "연블비", "이아라", "사랑e", "세월", "설둥이"], memberMarkers: [{ name: "혁민", label: "이사장" }, { name: "강민", label: "총장" }, { name: "연블비", label: "학생회장" }], featured: true },
  { college: "DM", total: 13, race: race(4, 4, 5), tiers: { King: 3, Spade: 1, "0": 1, "2": 1, "3": 1, "4": 1, "6": 1, "7": 3, "8": 1 }, memberNames: ["전태규", "임진묵", "이예훈", "원선재", "서지수", "다나짱", "뿡리나", "정소이", "수니양", "다뉴", "은서", "김말랑", "은조"], memberMarkers: [{ name: "전태규", label: "수장" }, { name: "임진묵", label: "수장" }] },
  { college: "신세계", total: 14, race: race(3, 4, 7), tiers: { God: 1, King: 1, Jack: 1, Joker: 2, "2": 1, "4": 1, "5": 1, "6": 1, "7": 2, "8": 2, Unknown: 1 }, memberNames: ["설영욱", "몽군", "윤수철", "권혁진", "킁식", "김상곤", "또봉순", "연애인", "예실", "김설", "요시", "지우리", "혜냥", "밤하밍"], memberMarkers: [{ name: "설영욱", label: "이사장" }, { name: "몽군", label: "총장" }] },
];
