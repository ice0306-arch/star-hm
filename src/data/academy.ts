export type Matchup = "TvZ" | "TvP" | "TvT";

export type BuildCategory = "all-in" | "semi-all-in" | "semi-macro" | "macro" | "defense" | "situational" | "pressure" | "transition";

export type BuildTier = "top" | "variable" | "standard" | "experimental" | "deprecated";

export type HotkeyActionType = "simultaneous" | "sequence" | "keyAndClick" | "mouseOnly";

export type GlossaryCategory = "basic" | "building" | "unit" | "build" | "macro" | "control" | "community";

export type HotkeyGuide = {
  type: HotkeyActionType;
  keys: string[];
  description: string;
  functionText: string;
  category?: string;
};

export type BeginnerStep = {
  id: string;
  stepNumber: number;
  time?: string;
  supply?: string;
  title: string;
  instruction: string;
  reason: string;
  hotkey?: HotkeyGuide;
  checkpoint?: string;
  commonMistake?: string;
  image?: string;
};

export type PlaybookStep = {
  id: string;
  time?: string;
  supply?: string;
  title: string;
  description?: string;
  production?: string;
  construction?: string;
  movement?: string;
  warning?: string;
};

export type ReactionGuide = {
  id: string;
  observedSituation: string;
  beginnerExplanation?: string;
  recommendedAction: string;
  reason?: string;
};

export type TransitionGuide = {
  id: string;
  title: string;
  description: string;
  targetBuildSlug?: string;
};

export type ControlGroupGuide = {
  number: number;
  label: string;
  description?: string;
};

export type BuildCommandCue = {
  id: string;
  time?: string;
  trigger: string;
  action: string;
  hotkey: HotkeyGuide;
  note?: string;
};

export type PracticeQuestion = {
  id: string;
  type: "single-choice" | "order" | "hotkey" | "reaction" | "control-group";
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
};

export type BuildGuide = {
  id: string;
  easyTitle: string;
  originalTitle: string;
  matchup: Matchup;
  category: BuildCategory;
  tier: BuildTier;
  difficulty: 1 | 2 | 3 | 4 | 5;
  beginner: {
    summary: string;
    purpose: string;
    useWhen: string[];
    strongAgainst: string[];
    weakAgainst: string[];
    requiredSkills: string[];
    steps: BeginnerStep[];
    glossaryTerms: string[];
    practiceQuestions: PracticeQuestion[];
  };
  playbook: {
    summary: string;
    keyTiming?: string;
    keyUnits: string[];
    buildSteps: PlaybookStep[];
    reactions: ReactionGuide[];
    continueConditions: string[];
    stopConditions: string[];
    transitions: TransitionGuide[];
    controlGroups: ControlGroupGuide[];
    commandCues: BuildCommandCue[];
  };
  beginnerGuideSlug?: string;
  playbookSlug: string;
  maps: string[];
  tags: string[];
  videoUrls: string[];
  isPublished: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
};

export type GlossaryTerm = {
  id: string;
  term: string;
  formalName?: string;
  easyDescription: string;
  detailedDescription?: string;
  whyImportant?: string;
  example?: string;
  category: GlossaryCategory;
  relatedBuildSlugs?: string[];
  relatedHotkeys?: string[];
  image?: string;
};

export type AcademyLesson = {
  id: string;
  slug: string;
  order: number;
  title: string;
  description: string;
  category: string;
  estimatedMinutes?: number;
  steps: BeginnerStep[];
  isPublished: boolean;
};

export type TerranUnit = {
  id: string;
  name: string;
  role: string;
  strongAgainst: string;
  weakAgainst: string;
  producedAt: string;
  hotkey: string;
  recommendedGroup: string;
  relatedBuilds: string[];
};

export type TerranBuilding = {
  id: string;
  name: string;
  role: string;
  timing: string;
  hotkey: string;
  produces: string[];
  addon: string;
  relatedBuilds: string[];
};

const hotkey = (type: HotkeyActionType, keys: string[], description: string, functionText: string, category?: string): HotkeyGuide => ({
  type,
  keys,
  description,
  functionText,
  category,
});

const beginnerSteps = (theme: string): BeginnerStep[] => [
  {
    id: `${theme}-step-1`,
    stepNumber: 1,
    time: "0:00",
    supply: "4",
    title: "일꾼을 계속 생산하세요",
    instruction: "커맨드센터를 선택하고 SCV 생산을 끊기지 않게 누릅니다.",
    reason: "초반에는 일꾼 수가 곧 자원 속도입니다.",
    hotkey: hotkey("sequence", ["S"], "커맨드센터를 선택한 뒤 S를 누릅니다.", "SCV를 생산합니다.", "생산"),
    checkpoint: "미네랄 근처에 새 SCV가 나오는지 확인합니다.",
    commonMistake: "전투 준비에 집중하다가 SCV 생산을 멈추기 쉽습니다.",
  },
  {
    id: `${theme}-step-2`,
    stepNumber: 2,
    time: "1:25",
    supply: "8",
    title: "첫 생산 건물을 지으세요",
    instruction: "SCV 한 기를 보내 배럭 또는 팩토리 준비 건물을 짓습니다.",
    reason: "공격 유닛 생산을 시작하기 위한 첫 관문입니다.",
    hotkey: hotkey("sequence", ["B", "B"], "B를 누른 뒤 다시 B를 누릅니다.", "배럭 건설을 선택합니다.", "건설"),
    checkpoint: "건설 중인 건물이 화면에 보이는지 확인합니다.",
    commonMistake: "서플라이가 막히면 모든 생산이 늦어집니다.",
  },
  {
    id: `${theme}-step-3`,
    stepNumber: 3,
    time: "2:40",
    supply: "10",
    title: "첫 전투 유닛을 모으세요",
    instruction: "마린, 벌쳐, 탱크처럼 이 빌드의 핵심 유닛을 생산합니다.",
    reason: "공격 타이밍은 유닛이 함께 도착할 때 강해집니다.",
    hotkey: hotkey("simultaneous", ["Ctrl", "1"], "Ctrl과 1을 동시에 누릅니다.", "현재 유닛을 1번 부대로 저장합니다.", "부대지정"),
    checkpoint: "1번을 눌렀을 때 전투 유닛이 선택되는지 확인합니다.",
    commonMistake: "유닛을 한 기씩 따로 보내면 쉽게 잡힙니다.",
  },
  {
    id: `${theme}-step-4`,
    stepNumber: 4,
    time: "3:30",
    supply: "14",
    title: "공격 또는 운영 전환을 선택하세요",
    instruction: "상대 방어 상태를 보고 공격을 계속할지 멈출지 판단합니다.",
    reason: "막힌 공격을 억지로 밀면 이후 운영이 크게 불리해집니다.",
    hotkey: hotkey("keyAndClick", ["A", "왼쪽 클릭"], "A를 누른 뒤 이동할 위치를 클릭합니다.", "목적지까지 적을 공격하면서 이동합니다.", "공격"),
    checkpoint: "상대 방어 건물과 병력 수를 확인합니다.",
    commonMistake: "성큰, 벙커, 탱크 라인을 보고도 계속 들어가면 손해가 큽니다.",
  },
];

const reactions: ReactionGuide[] = [
  {
    id: "fast-expand",
    observedSituation: "상대 앞마당에 확장 건물이 보입니다",
    beginnerExplanation: "상대가 초반 병력보다 자원과 생산력을 먼저 키우는 선택입니다.",
    recommendedAction: "준비한 압박을 계속하되 후속 병력을 끊기지 않게 보냅니다.",
    reason: "방어가 늦으면 첫 병력으로 큰 피해를 줄 수 있습니다.",
  },
  {
    id: "heavy-defense",
    observedSituation: "방어 건물이 이미 완성되었습니다",
    beginnerExplanation: "정면 공격이 위험한 상태입니다.",
    recommendedAction: "공격을 멈추고 확장, 테크, 생산 건물 추가로 전환합니다.",
    reason: "무리한 공격보다 다음 운영을 준비하는 편이 안전합니다.",
  },
  {
    id: "many-units",
    observedSituation: "상대 초반 병력이 예상보다 많습니다",
    beginnerExplanation: "상대가 공격 또는 강한 수비를 준비하고 있습니다.",
    recommendedAction: "전진 병력을 뒤로 빼고 본진 입구와 생산을 확인합니다.",
    reason: "첫 병력을 잃으면 다음 타이밍도 늦어집니다.",
  },
];

const controlGroups: ControlGroupGuide[] = [
  { number: 1, label: "주력 전투 유닛", description: "마린 또는 벌쳐처럼 가장 자주 움직이는 유닛" },
  { number: 2, label: "보조 전투 유닛", description: "메딕, 파이어뱃, 골리앗 등 보조 병력" },
  { number: 3, label: "탱크 또는 특수 유닛", description: "시즈 타이밍을 따로 봐야 하는 유닛" },
  { number: 4, label: "생산 건물", description: "배럭, 팩토리, 스타포트" },
  { number: 5, label: "커맨드센터", description: "SCV 생산과 스캔 확인" },
];

const practiceQuestions = (name: string): PracticeQuestion[] => [
  {
    id: `${name}-q1`,
    type: "single-choice",
    question: "인구수 8입니다. 가장 먼저 확인할 행동은 무엇인가요?",
    options: ["생산 건물 건설", "커맨드센터 추가", "아카데미 건설"],
    correctAnswer: "생산 건물 건설",
    explanation: "초반 공격형 빌드는 첫 생산 건물이 늦으면 모든 타이밍이 늦어집니다.",
  },
  {
    id: `${name}-q2`,
    type: "hotkey",
    question: "현재 선택한 유닛을 1번 부대로 저장하는 단축키는?",
    options: ["Ctrl + 1", "Shift + 1", "A + 1"],
    correctAnswer: "Ctrl + 1",
    explanation: "Ctrl과 숫자를 동시에 누르면 현재 선택한 유닛이 해당 번호에 저장됩니다.",
  },
  {
    id: `${name}-q3`,
    type: "reaction",
    question: "상대 방어 건물이 이미 완성되었습니다. 어떤 판단이 안전한가요?",
    options: ["정면 공격 계속", "공격 중단 후 운영 전환", "일꾼만 계속 보냄"],
    correctAnswer: "공격 중단 후 운영 전환",
    explanation: "초보자는 막힌 공격을 오래 끌기보다 다음 생산과 확장을 챙기는 편이 안정적입니다.",
  },
];

const baseBuild = (
  id: string,
  easyTitle: string,
  originalTitle: string,
  matchup: Matchup,
  category: BuildCategory,
  tier: BuildTier,
  difficulty: 1 | 2 | 3 | 4 | 5,
  keyTiming: string,
  keyUnits: string[],
  order: number,
  tags: string[],
): BuildGuide => ({
  id,
  easyTitle,
  originalTitle,
  matchup,
  category,
  tier,
  difficulty,
  beginner: {
    summary: `${easyTitle}은 ${originalTitle}을 처음 배우는 사용자가 핵심 타이밍과 중단 조건을 함께 익히도록 정리한 가이드입니다.`,
    purpose: "초반 주도권을 잡거나 상대의 greedy한 시작을 벌주기 위한 기본 전술입니다.",
    useWhen: ["상대가 초반 수비보다 자원에 투자할 때", "내 생산 건물 타이밍이 밀리지 않았을 때"],
    strongAgainst: ["빠른 확장", "정찰이 늦은 상대", "방어 건물이 늦은 시작"],
    weakAgainst: ["빠른 공격 빌드", "이미 완성된 방어 라인", "내 첫 유닛 손실"],
    requiredSkills: ["SCV 생산 유지", "부대지정", "공격 이동", "상대 방어 확인"],
    steps: beginnerSteps(id),
    glossaryTerms: ["부대지정", "타이밍 러시", "멀티", "운영 전환"],
    practiceQuestions: practiceQuestions(id),
  },
  playbook: {
    summary: `${keyTiming}에 ${keyUnits.join("·")} 중심으로 압박하고, 막히면 생산과 확장으로 전환합니다.`,
    keyTiming,
    keyUnits,
    buildSteps: [
      { id: `${id}-p1`, time: "0:00", supply: "4", title: "SCV 생산 유지", production: "SCV", warning: "생산이 끊기면 타이밍이 늦어짐" },
      { id: `${id}-p2`, time: "1:25", supply: "8", title: "첫 생산 건물", construction: "배럭 또는 팩토리 준비", warning: "서플라이 막힘 주의" },
      { id: `${id}-p3`, time: "2:30", supply: "10", title: "핵심 유닛 생산", production: keyUnits.join(", "), movement: "전진 경로 확인" },
      { id: `${id}-p4`, time: keyTiming, supply: "14+", title: "첫 압박", movement: "상대 앞마당 또는 입구", warning: "방어 완성 시 중단" },
    ],
    reactions,
    continueConditions: ["상대 방어 건물이 완성되지 않음", "내 주력 병력이 함께 도착함", "정찰 유닛이 살아 있음", "상대 병력이 예상보다 적음"],
    stopConditions: ["상대 방어 건물이 이미 완성됨", "내 첫 병력이 먼저 잡힘", "후속 병력이 끊김", "상대가 빠른 공격 빌드"],
    transitions: [
      { id: `${id}-t1`, title: "운영 전환", description: "공격이 막히면 생산 건물을 늘리고 확장 또는 테크를 준비합니다." },
      { id: `${id}-t2`, title: "2차 압박", description: "첫 압박으로 피해를 줬다면 후속 병력과 함께 다시 타이밍을 잡습니다." },
    ],
    controlGroups,
    commandCues: [
      {
        id: `${id}-cue-scv`,
        time: "0:00",
        trigger: "게임 시작 / 커맨드센터 선택",
        action: "SCV 생산을 바로 예약합니다.",
        hotkey: hotkey("sequence", ["S"], "커맨드센터 선택 후 S를 누릅니다.", "SCV 생산", "생산"),
        note: "첫 일꾼 생산이 끊기면 모든 빌드 타이밍이 뒤로 밀립니다.",
      },
      {
        id: `${id}-cue-first-building`,
        time: "1:25",
        trigger: "인구수 8 / 첫 생산 건물 타이밍",
        action: "SCV를 보내 첫 생산 건물을 찍습니다.",
        hotkey: hotkey("sequence", ["B", "B"], "SCV 선택 후 B, B를 누릅니다.", "배럭 건설", "건설"),
        note: "건설 위치를 찍은 뒤 바로 본진 생산 상태를 다시 봅니다.",
      },
      {
        id: `${id}-cue-control-group`,
        time: "2:30",
        trigger: `${keyUnits[0]} 생산 시작`,
        action: "첫 주력 병력을 1번 부대로 묶습니다.",
        hotkey: hotkey("simultaneous", ["Ctrl", "1"], "주력 병력을 선택하고 Ctrl+1을 누릅니다.", "1번 부대지정", "부대지정"),
        note: "이후 1번 두 번으로 병력 위치를 바로 확인합니다.",
      },
      {
        id: `${id}-cue-attack-move`,
        time: keyTiming,
        trigger: "첫 병력 진출 / 상대 앞마당 확인",
        action: "상대 앞마당 또는 입구 쪽으로 공격 이동을 찍습니다.",
        hotkey: hotkey("keyAndClick", ["A", "왼쪽 클릭"], "A를 누른 뒤 압박할 위치를 클릭합니다.", "공격 이동", "공격"),
        note: "방어가 늦으면 계속 압박하고, 완성된 방어선이면 바로 멈춥니다.",
      },
      {
        id: `${id}-cue-retreat`,
        trigger: "성큰, 벙커, 탱크 라인처럼 방어 완성 확인",
        action: "무리하지 말고 병력을 빼며 생산 화면으로 돌아갑니다.",
        hotkey: hotkey("sequence", ["1", "우클릭", "4"], "1번 병력을 뒤로 빼고 4번 생산 건물을 확인합니다.", "후퇴 후 생산 확인", "운영 전환"),
        note: "막힌 공격을 오래 끌면 후속 생산과 확장이 같이 늦어집니다.",
      },
    ],
  },
  beginnerGuideSlug: id,
  playbookSlug: id,
  maps: ["투혼", "폴리포이드", "라이트"],
  tags,
  videoUrls: [],
  isPublished: true,
  order,
  createdAt: "2026-07-26",
  updatedAt: "2026-07-26",
});

export const buildGuides: BuildGuide[] = [
  baseBuild("marine-vulture-88", "초반 마린·벌쳐 기습", "88", "TvZ", "all-in", "top", 2, "3:30", ["마린", "벌쳐"], 1, ["저그전", "쇼부", "초보자 설명"]),
  baseBuild("center-eight-rax-111", "센터 배럭 이후 빠른 레이스", "센터 8배럭 111", "TvZ", "all-in", "variable", 4, "4:40", ["마린", "레이스"], 2, ["저그전", "변수", "레이스"]),
  baseBuild("ten-rax-wall", "큰입막 10배럭", "큰입막 10배럭", "TvZ", "defense", "standard", 2, "3:20", ["마린", "벙커"], 3, ["저그전", "수비", "입구"]),
  baseBuild("two-fac-four-rax-golionic", "2팩4배럭 골리오닉", "2팩4배럭 골리오닉", "TvZ", "semi-macro", "standard", 4, "7:30", ["골리앗", "마린", "메딕"], 4, ["저그전", "뮤탈 대응"]),
  baseBuild("bbs", "전진 배럭 초반 압박", "BBS", "TvP", "all-in", "variable", 3, "2:50", ["마린", "SCV"], 5, ["프로토스전", "쇼부"]),
  baseBuild("one-fac-two-rax-cheese", "1팩2배럭 마린벌쳐 치즈", "1팩2배럭 마린벌쳐 치즈", "TvP", "all-in", "variable", 4, "5:00", ["마린", "벌쳐"], 6, ["프로토스전", "벌쳐"]),
  baseBuild("two-fac-one-star-speed-vulture", "투팩 원스타 속마업 벌쳐", "투팩 원스타 속마업 벌쳐", "TvP", "semi-all-in", "experimental", 5, "6:10", ["벌쳐", "레이스"], 7, ["프로토스전", "견제"]),
  baseBuild("nine-supply-nine-rax", "9서플 9배럭 안정 시작", "9서플 9배럭", "TvP", "macro", "standard", 1, "4:30", ["마린", "팩토리"], 8, ["프로토스전", "정석"]),
  baseBuild("jisung-three-fac-vulture", "김지성식 3팩 벌쳐", "김지성식 3팩 벌쳐", "TvT", "pressure", "top", 4, "5:30", ["벌쳐"], 9, ["테테전", "주력", "벌쳐전"]),
  baseBuild("fifteen-cc-rax-double", "15컴 배럭더블", "15컴 배럭더블", "TvT", "macro", "top", 3, "6:00", ["탱크", "벌쳐"], 10, ["테테전", "운영"]),
  baseBuild("forward-eleven-rax-scout", "전진 11배럭 투서치 3마찌", "전진 11배럭 투서치 3마찌", "TvT", "all-in", "variable", 4, "3:40", ["마린", "SCV"], 11, ["테테전", "압박"]),
  baseBuild("gas-first-two-fac-tank-goliath", "선가스 투팩 탱골", "선가스 투팩 탱골", "TvT", "semi-all-in", "variable", 4, "5:50", ["탱크", "골리앗"], 12, ["테테전", "변수"]),
];

export const lessons: AcademyLesson[] = [
  {
    id: "basics",
    slug: "basics",
    order: 1,
    title: "게임 화면 알아보기",
    description: "유닛 선택, 이동, 공격, 건설, 생산의 기본 흐름을 배웁니다.",
    category: "기본 조작",
    estimatedMinutes: 12,
    isPublished: true,
    steps: [
      {
        id: "select-unit",
        stepNumber: 1,
        title: "유닛 선택",
        instruction: "마우스 왼쪽 클릭으로 유닛 한 기를 선택하고, 드래그로 여러 유닛을 선택합니다.",
        reason: "선택을 정확히 해야 이동과 공격 명령이 원하는 유닛에 들어갑니다.",
        checkpoint: "선택된 유닛 테두리와 하단 정보창을 확인하세요.",
        commonMistake: "빈 땅을 클릭해 선택을 해제하는 실수가 많습니다.",
      },
      {
        id: "move-unit",
        stepNumber: 2,
        title: "이동",
        instruction: "선택한 유닛에게 마우스 오른쪽 클릭으로 이동 명령을 줍니다.",
        reason: "전투 전 위치 잡기와 정찰의 기본입니다.",
        checkpoint: "유닛이 클릭한 위치로 움직이는지 봅니다.",
        commonMistake: "적을 오른쪽 클릭하면 공격 대상 고정이 되어 이동 경로가 꼬일 수 있습니다.",
      },
      {
        id: "attack-move",
        stepNumber: 3,
        title: "공격 이동",
        instruction: "A를 누른 뒤 목적지를 클릭합니다.",
        reason: "가는 길에 만나는 적을 공격하면서 이동합니다.",
        hotkey: hotkey("keyAndClick", ["A", "왼쪽 클릭"], "A를 누른 뒤 공격할 위치를 클릭합니다.", "목적지까지 적을 공격하면서 이동합니다.", "공격"),
        checkpoint: "유닛이 이동 중 적을 만나면 공격하는지 확인합니다.",
        commonMistake: "일반 이동으로 적 진영에 들어가면 맞기만 할 수 있습니다.",
      },
      {
        id: "build-and-rally",
        stepNumber: 4,
        title: "건물 건설과 랠리",
        instruction: "SCV를 선택하고 건설 단축키를 누른 뒤 위치를 정합니다.",
        reason: "생산 건물과 랠리 포인트는 병력 흐름을 만듭니다.",
        hotkey: hotkey("sequence", ["B", "B"], "B를 누른 뒤 다시 B를 누릅니다.", "배럭 건설을 선택합니다.", "건설"),
        checkpoint: "생산 건물에서 유닛이 모일 위치를 지정합니다.",
        commonMistake: "랠리가 적 쪽으로 찍히면 새 유닛이 혼자 잡힙니다.",
      },
    ],
  },
  {
    id: "control-groups",
    slug: "control-groups",
    order: 2,
    title: "부대지정 배우기",
    description: "Ctrl+숫자, 숫자 두 번, Shift 추가를 익히고 나만의 프리셋을 저장합니다.",
    category: "컨트롤",
    estimatedMinutes: 10,
    isPublished: true,
    steps: beginnerSteps("control-groups"),
  },
  {
    id: "hotkeys",
    slug: "hotkeys",
    order: 3,
    title: "필수 단축키",
    description: "동시에 누르기, 순서대로 누르기, 키를 누른 뒤 클릭하는 조작을 구분합니다.",
    category: "단축키",
    estimatedMinutes: 15,
    isPublished: true,
    steps: beginnerSteps("hotkeys"),
  },
  {
    id: "units",
    slug: "units",
    order: 4,
    title: "테란 유닛 알아보기",
    description: "마린, 벌쳐, 탱크, 골리앗의 역할과 약점을 배웁니다.",
    category: "유닛",
    estimatedMinutes: 14,
    isPublished: true,
    steps: beginnerSteps("units"),
  },
  {
    id: "buildings",
    slug: "buildings",
    order: 5,
    title: "테란 건물 알아보기",
    description: "서플라이, 배럭, 팩토리, 스타포트와 애드온을 쉽게 정리합니다.",
    category: "건물",
    estimatedMinutes: 14,
    isPublished: true,
    steps: beginnerSteps("buildings"),
  },
  {
    id: "glossary",
    slug: "glossary",
    order: 6,
    title: "스타 용어 배우기",
    description: "마당, 쇼부, 째기처럼 커뮤니티 용어를 쉬운 말로 바꿔 배웁니다.",
    category: "용어",
    estimatedMinutes: 16,
    isPublished: true,
    steps: beginnerSteps("glossary"),
  },
  {
    id: "matchups",
    slug: "matchups",
    order: 7,
    title: "상대 종족별 기초",
    description: "저그, 프로토스, 테란을 상대할 때 처음 봐야 할 신호를 정리합니다.",
    category: "매치업",
    estimatedMinutes: 18,
    isPublished: true,
    steps: beginnerSteps("matchups"),
  },
];

export const glossaryTerms: GlossaryTerm[] = [
  {
    id: "front-yard",
    term: "마당",
    formalName: "앞마당 멀티",
    easyDescription: "본진 바로 근처에 있는 두 번째 자원 기지입니다.",
    detailedDescription: "초반 이후 자원을 늘리기 위해 가장 먼저 가져가는 확장 위치입니다.",
    whyImportant: "앞마당을 언제 가져가는지 보면 상대가 공격형인지 운영형인지 판단할 수 있습니다.",
    example: "상대가 마당을 빨리 먹으면 초반 병력이 적을 수 있습니다.",
    category: "community",
    relatedBuildSlugs: ["marine-vulture-88", "fifteen-cc-rax-double"],
  },
  {
    id: "expand",
    term: "멀티",
    formalName: "확장 기지",
    easyDescription: "본진 외에 추가로 자원을 캐는 기지입니다.",
    whyImportant: "멀티가 많으면 시간이 갈수록 생산력이 강해집니다.",
    example: "공격이 막히면 멀티를 따라가야 합니다.",
    category: "macro",
  },
  {
    id: "all-in",
    term: "쇼부",
    formalName: "강한 승부수 공격",
    easyDescription: "운영보다 빠른 승부에 힘을 싣는 공격입니다.",
    whyImportant: "막히면 불리하지만 통하면 바로 큰 이득을 봅니다.",
    example: "BBS는 초반 쇼부에 가깝습니다.",
    category: "community",
    relatedBuildSlugs: ["bbs", "marine-vulture-88"],
  },
  {
    id: "semi-all-in",
    term: "반쇼부",
    easyDescription: "공격에 힘을 주지만 완전히 끝내지 못해도 다음 운영이 남는 선택입니다.",
    category: "community",
    example: "공1업 6팩 타이밍은 반쇼부처럼 쓸 수 있습니다.",
  },
  {
    id: "macro",
    term: "운영",
    easyDescription: "한 번의 공격보다 자원, 생산, 테크를 함께 키우며 길게 가는 플레이입니다.",
    whyImportant: "공격이 막혔을 때 운영 전환을 알면 게임이 끝나지 않습니다.",
    category: "macro",
  },
  {
    id: "greedy",
    term: "째다",
    formalName: "일꾼과 확장을 우선하는 운영",
    easyDescription: "공격 유닛을 줄이고 일꾼과 자원을 더 많이 늘리는 선택입니다.",
    category: "community",
    example: "상대가 째면 빠른 압박이 잘 통할 수 있습니다.",
  },
  {
    id: "mach",
    term: "마찌",
    formalName: "마린 치즈성 압박",
    easyDescription: "초반 마린과 SCV를 이용해 빠르게 압박하는 플레이입니다.",
    category: "community",
    relatedBuildSlugs: ["forward-eleven-rax-scout"],
  },
  {
    id: "proxy-fac",
    term: "날려팩",
    formalName: "전진 팩토리",
    easyDescription: "팩토리를 상대 가까운 곳에 지어 벌쳐나 탱크를 빠르게 보내는 전략입니다.",
    category: "build",
  },
  {
    id: "two-scout",
    term: "투서치",
    easyDescription: "정찰을 두 방향으로 보내 상대 위치나 빌드를 빨리 확인하는 방식입니다.",
    category: "control",
  },
  {
    id: "correct-scout",
    term: "정서치",
    easyDescription: "상대 위치를 바로 맞히는 정찰입니다.",
    category: "control",
  },
  {
    id: "ling",
    term: "링",
    formalName: "저글링",
    easyDescription: "저그의 빠른 기본 근접 유닛입니다.",
    category: "unit",
  },
  {
    id: "mutal",
    term: "뮤",
    formalName: "뮤탈리스크",
    easyDescription: "저그의 빠른 공중 유닛입니다. 견제와 흔들기에 강합니다.",
    whyImportant: "뮤탈이 보이면 터렛, 골리앗, 발키리 같은 대공 준비가 필요합니다.",
    category: "unit",
    relatedBuildSlugs: ["two-fac-four-rax-golionic"],
  },
  {
    id: "goliath",
    term: "골럇",
    formalName: "골리앗",
    easyDescription: "공중 유닛을 잘 잡는 테란 기계 유닛입니다.",
    category: "unit",
  },
  {
    id: "barracks-double",
    term: "배더",
    formalName: "배럭 더블",
    easyDescription: "배럭 이후 앞마당 커맨드센터를 가져가는 안정적인 운영 시작입니다.",
    category: "build",
  },
  {
    id: "factory-double",
    term: "팩더",
    formalName: "팩토리 더블",
    easyDescription: "팩토리 이후 확장을 가져가며 벌쳐나 탱크로 버티는 시작입니다.",
    category: "build",
  },
  {
    id: "one-one-one",
    term: "111",
    formalName: "1배럭 1팩토리 1스타포트",
    easyDescription: "배럭, 팩토리, 스타포트를 하나씩 올리는 테크형 구성입니다.",
    category: "build",
    relatedBuildSlugs: ["center-eight-rax-111"],
  },
  {
    id: "bio",
    term: "바이오닉",
    easyDescription: "마린, 메딕, 파이어뱃 중심의 보병 조합입니다.",
    category: "unit",
  },
  {
    id: "mech",
    term: "메카닉",
    easyDescription: "벌쳐, 탱크, 골리앗 중심의 기계 유닛 조합입니다.",
    category: "unit",
  },
  {
    id: "timing-rush",
    term: "타이밍 러시",
    easyDescription: "내 병력이 강하고 상대 준비가 덜 된 순간에 맞춰 공격하는 것입니다.",
    category: "build",
  },
  {
    id: "control-group",
    term: "부대지정",
    easyDescription: "유닛이나 건물을 숫자키에 저장해 빠르게 다시 선택하는 기능입니다.",
    whyImportant: "전투와 생산을 동시에 하기 위한 기본 습관입니다.",
    example: "Ctrl + 1로 주력 병력을 1번 부대에 저장합니다.",
    category: "control",
    relatedHotkeys: ["Ctrl + 1", "1", "Shift + 1"],
  },
  {
    id: "attack-move",
    term: "어택땅",
    formalName: "공격 이동",
    easyDescription: "A를 누르고 땅을 찍어 이동 중 만나는 적을 공격하게 하는 명령입니다.",
    category: "control",
    relatedHotkeys: ["A → 왼쪽 클릭"],
  },
  {
    id: "hold",
    term: "홀드",
    formalName: "위치 유지",
    easyDescription: "유닛이 자리를 벗어나지 않고 그 위치를 지키게 하는 명령입니다.",
    category: "control",
    relatedHotkeys: ["H"],
  },
  {
    id: "patrol",
    term: "패트롤",
    formalName: "순찰",
    easyDescription: "두 지점 사이를 오가며 적을 만나면 공격하게 하는 명령입니다.",
    category: "control",
    relatedHotkeys: ["P"],
  },
  {
    id: "rally",
    term: "랠리",
    formalName: "집결 지점",
    easyDescription: "생산된 유닛이 자동으로 이동할 위치입니다.",
    category: "basic",
  },
  {
    id: "simcity",
    term: "심시티",
    easyDescription: "건물 배치로 입구를 좁히거나 수비하기 쉽게 만드는 것입니다.",
    category: "building",
  },
  {
    id: "bunker-rush",
    term: "벙커링",
    easyDescription: "상대 가까이에 벙커를 지어 초반 압박을 거는 전략입니다.",
    category: "build",
  },
  {
    id: "harass",
    term: "견제",
    easyDescription: "상대 일꾼이나 생산을 흔들어 집중력을 분산시키는 행동입니다.",
    category: "macro",
  },
  {
    id: "main",
    term: "본진",
    easyDescription: "게임을 시작하는 첫 기지입니다.",
    category: "basic",
  },
  {
    id: "tech",
    term: "테크",
    easyDescription: "더 강한 유닛이나 업그레이드를 위해 건물을 올리는 흐름입니다.",
    category: "building",
  },
];

export const hotkeyGuides: HotkeyGuide[] = [
  hotkey("simultaneous", ["Ctrl", "1"], "Ctrl과 1을 동시에 누릅니다.", "현재 선택한 유닛을 1번 부대로 저장합니다.", "부대지정"),
  hotkey("simultaneous", ["Shift", "1"], "Shift와 1을 동시에 누릅니다.", "현재 선택한 유닛을 기존 1번 부대에 추가합니다.", "부대지정"),
  hotkey("sequence", ["1", "1"], "1을 두 번 빠르게 누릅니다.", "1번 부대로 화면을 이동합니다.", "화면 이동"),
  hotkey("keyAndClick", ["A", "왼쪽 클릭"], "A를 누른 뒤 공격할 위치를 클릭합니다.", "목적지까지 적을 공격하면서 이동합니다.", "공격과 정지"),
  hotkey("sequence", ["B", "B"], "B를 누른 뒤 다시 B를 누릅니다.", "배럭 건설을 선택합니다.", "건설"),
  hotkey("sequence", ["V", "F"], "V를 누른 뒤 F를 누릅니다.", "팩토리 건설을 선택합니다.", "건설"),
  hotkey("sequence", ["S"], "유닛 선택 시 S를 누릅니다.", "현재 명령을 멈추고 정지합니다.", "공격과 정지"),
  hotkey("sequence", ["H"], "유닛 선택 시 H를 누릅니다.", "현재 위치를 유지합니다.", "공격과 정지"),
  hotkey("sequence", ["P"], "유닛 선택 시 P를 누릅니다.", "순찰 명령을 사용합니다.", "공격과 정지"),
  hotkey("sequence", ["Space"], "Space를 누릅니다.", "최근 알림 위치로 화면을 이동합니다.", "화면 이동"),
];

export const terranUnits: TerranUnit[] = [
  { id: "marine", name: "마린", role: "초반 기본 전투 유닛", strongAgainst: "일꾼, 소수 저글링, 초반 압박", weakAgainst: "스플래시, 질럿 다수, 러커", producedAt: "배럭", hotkey: "M", recommendedGroup: "1", relatedBuilds: ["marine-vulture-88", "bbs"] },
  { id: "medic", name: "메딕", role: "바이오닉 회복 지원", strongAgainst: "장기 교전", weakAgainst: "기계 유닛 중심 조합", producedAt: "배럭 + 아카데미", hotkey: "C", recommendedGroup: "2", relatedBuilds: ["two-fac-four-rax-golionic"] },
  { id: "vulture", name: "벌쳐", role: "기동 견제와 마인 압박", strongAgainst: "질럿, 일꾼, 빈 공간", weakAgainst: "드라군 다수, 성큰 라인", producedAt: "팩토리", hotkey: "V", recommendedGroup: "1", relatedBuilds: ["jisung-three-fac-vulture", "one-fac-two-rax-cheese"] },
  { id: "tank", name: "시즈 탱크", role: "라인전과 방어 핵심", strongAgainst: "지상 병력 밀집", weakAgainst: "공중 견제, 근접 포위", producedAt: "팩토리", hotkey: "T", recommendedGroup: "3", relatedBuilds: ["gas-first-two-fac-tank-goliath"] },
  { id: "goliath", name: "골리앗", role: "대공과 기계 조합 보강", strongAgainst: "뮤탈, 레이스, 드랍쉽", weakAgainst: "질럿 접근, 탱크 라인", producedAt: "팩토리", hotkey: "G", recommendedGroup: "2", relatedBuilds: ["two-fac-four-rax-golionic", "gas-first-two-fac-tank-goliath"] },
  { id: "wraith", name: "레이스", role: "공중 견제와 시야 압박", strongAgainst: "정찰 부족, 드랍 대비 부족", weakAgainst: "터렛, 골리앗, 스커지", producedAt: "스타포트", hotkey: "W", recommendedGroup: "4", relatedBuilds: ["center-eight-rax-111"] },
];

export const terranBuildings: TerranBuilding[] = [
  { id: "supply", name: "서플라이 디팟", role: "인구수 확보와 입구 좁히기", timing: "인구수 막히기 전에", hotkey: "B → S", produces: [], addon: "없음", relatedBuilds: ["nine-supply-nine-rax"] },
  { id: "barracks", name: "배럭", role: "마린과 메딕 생산", timing: "초반 첫 생산 건물", hotkey: "B → B", produces: ["마린", "메딕", "파이어뱃"], addon: "없음", relatedBuilds: ["marine-vulture-88", "bbs"] },
  { id: "refinery", name: "리파이너리", role: "가스 채취", timing: "팩토리, 아카데미, 스타포트 준비 전", hotkey: "B → R", produces: [], addon: "없음", relatedBuilds: ["center-eight-rax-111", "gas-first-two-fac-tank-goliath"] },
  { id: "factory", name: "팩토리", role: "벌쳐, 탱크, 골리앗 생산", timing: "테란 지상 화력 전환 시점", hotkey: "V → F", produces: ["벌쳐", "탱크", "골리앗"], addon: "머신샵", relatedBuilds: ["jisung-three-fac-vulture", "one-fac-two-rax-cheese"] },
  { id: "starport", name: "스타포트", role: "레이스, 드랍쉽, 베슬 생산", timing: "공중 견제 또는 수송이 필요할 때", hotkey: "V → S", produces: ["레이스", "드랍쉽", "사이언스 베슬"], addon: "컨트롤 타워", relatedBuilds: ["center-eight-rax-111", "two-fac-one-star-speed-vulture"] },
  { id: "academy", name: "아카데미", role: "메딕과 스캔 준비", timing: "바이오닉 운영이나 정보 확인이 필요할 때", hotkey: "B → A", produces: [], addon: "없음", relatedBuilds: ["two-fac-four-rax-golionic"] },
];
