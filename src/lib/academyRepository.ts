import {
  buildGuides,
  glossaryTerms,
  hotkeyGuides,
  lessons,
  terranBuildings,
  terranUnits,
  type BuildCategory,
  type BuildGuide,
  type BuildTier,
  type GlossaryTerm,
  type Matchup,
} from "@/data/academy";

export type AcademySearchResult = {
  id: string;
  type: "입문 훈련" | "용어" | "실전 빌드" | "유닛" | "건물";
  title: string;
  description: string;
  href: string;
};

const publishedBuilds = () => buildGuides.filter((build) => build.isPublished).sort((a, b) => a.order - b.order);

export const buildGuideRepository = {
  getAllBuilds(): BuildGuide[] {
    return publishedBuilds();
  },
  getBuildBySlug(slug: string): BuildGuide | undefined {
    return publishedBuilds().find((build) => build.playbookSlug === slug || build.beginnerGuideSlug === slug || build.id === slug);
  },
  getBuildsByMatchup(matchup: Matchup): BuildGuide[] {
    return publishedBuilds().filter((build) => build.matchup === matchup);
  },
  getBuildsByFilters(filters: { matchup?: Matchup; tier?: BuildTier | "all"; category?: BuildCategory | "all"; query?: string }): BuildGuide[] {
    const query = normalize(filters.query ?? "");
    return publishedBuilds().filter((build) => {
      const matchupMatches = !filters.matchup || build.matchup === filters.matchup;
      const tierMatches = !filters.tier || filters.tier === "all" || build.tier === filters.tier;
      const categoryMatches = !filters.category || filters.category === "all" || build.category === filters.category;
      const queryMatches =
        !query ||
        normalize(
          [
            build.easyTitle,
            build.originalTitle,
            build.playbook.summary,
            build.beginner.summary,
            build.tags.join(" "),
            build.maps.join(" "),
            build.playbook.keyUnits.join(" "),
          ].join(" "),
        ).includes(query);
      return matchupMatches && tierMatches && categoryMatches && queryMatches;
    });
  },
  getRelatedBeginnerGuide(build: BuildGuide): string | undefined {
    return build.beginnerGuideSlug ? `/academy/rookie/build/${build.beginnerGuideSlug}` : undefined;
  },
  getRelatedPlaybook(build: BuildGuide): string {
    return `/academy/playbook/build/${build.playbookSlug}`;
  },
};

export const lessonRepository = {
  getAllLessons() {
    return lessons.filter((lesson) => lesson.isPublished).sort((a, b) => a.order - b.order);
  },
  getLessonBySlug(slug: string) {
    return lessons.find((lesson) => lesson.slug === slug && lesson.isPublished);
  },
};

export const glossaryRepository = {
  getGlossaryTerms(): GlossaryTerm[] {
    return [...glossaryTerms].sort((a, b) => a.term.localeCompare(b.term, "ko"));
  },
  getTermById(id: string): GlossaryTerm | undefined {
    return glossaryTerms.find((term) => term.id === id);
  },
  searchTerms(query: string): GlossaryTerm[] {
    const normalized = normalize(query);
    if (!normalized) {
      return this.getGlossaryTerms();
    }
    return this.getGlossaryTerms().filter((term) =>
      normalize([term.term, term.formalName, term.easyDescription, term.detailedDescription, term.example].filter(Boolean).join(" ")).includes(normalized),
    );
  },
};

export const academyRepository = {
  getHotkeys() {
    return hotkeyGuides;
  },
  getUnits() {
    return terranUnits;
  },
  getBuildings() {
    return terranBuildings;
  },
  searchAcademy(query: string): AcademySearchResult[] {
    const normalized = normalize(query);
    if (!normalized) {
      return [];
    }

    const lessonResults = lessonRepository
      .getAllLessons()
      .filter((lesson) => normalize(`${lesson.title} ${lesson.description} ${lesson.category}`).includes(normalized))
      .map((lesson) => ({
        id: `lesson-${lesson.id}`,
        type: "입문 훈련" as const,
        title: lesson.title,
        description: lesson.description,
        href: `/academy/rookie/${lesson.slug}`,
      }));

    const termResults = glossaryRepository.searchTerms(query).map((term) => ({
      id: `term-${term.id}`,
      type: "용어" as const,
      title: term.term,
      description: term.easyDescription,
      href: "/academy/rookie/glossary",
    }));

    const buildResults = buildGuideRepository.getBuildsByFilters({ query }).map((build) => ({
      id: `build-${build.id}`,
      type: "실전 빌드" as const,
      title: `${build.originalTitle} · ${build.easyTitle}`,
      description: build.playbook.summary,
      href: `/academy/playbook/build/${build.playbookSlug}`,
    }));

    const unitResults = terranUnits
      .filter((unit) => normalize(`${unit.name} ${unit.role} ${unit.strongAgainst} ${unit.weakAgainst}`).includes(normalized))
      .map((unit) => ({
        id: `unit-${unit.id}`,
        type: "유닛" as const,
        title: unit.name,
        description: unit.role,
        href: "/academy/rookie/units",
      }));

    const buildingResults = terranBuildings
      .filter((building) => normalize(`${building.name} ${building.role} ${building.timing}`).includes(normalized))
      .map((building) => ({
        id: `building-${building.id}`,
        type: "건물" as const,
        title: building.name,
        description: building.role,
        href: "/academy/rookie/buildings",
      }));

    return [...lessonResults, ...termResults, ...buildResults, ...unitResults, ...buildingResults].slice(0, 18);
  },
};

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
