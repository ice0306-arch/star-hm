"use client";

import { useEffect, useMemo, useState } from "react";

const PROGRESS_KEY = "star-hm-academy-progress";
const FAVORITES_KEY = "star-hm-academy-favorites";
const RECENT_KEY = "star-hm-academy-recent";
const CONTROL_GROUP_KEY = "star-hm-academy-control-groups";

type ProgressState = Record<string, string[]>;
type FavoritesState = string[];
type RecentItem = {
  id: string;
  title: string;
  href: string;
  type: "build" | "lesson";
  viewedAt: number;
};

const defaultControlGroups = ["주력 전투 유닛", "보조 전투 유닛", "탱크 또는 특수 유닛", "생산 건물", "커맨드센터"];

export function useAcademyProgress() {
  const [progress, setProgress] = useState<ProgressState>({});

  useEffect(() => {
    setProgress(readJson<ProgressState>(PROGRESS_KEY, {}));
  }, []);

  const markStep = (contentId: string, stepId: string) => {
    setProgress((current) => {
      const nextSteps = new Set(current[contentId] ?? []);
      nextSteps.add(stepId);
      const next = { ...current, [contentId]: [...nextSteps] };
      writeJson(PROGRESS_KEY, next);
      return next;
    });
  };

  const resetContent = (contentId: string) => {
    setProgress((current) => {
      const next = { ...current };
      delete next[contentId];
      writeJson(PROGRESS_KEY, next);
      return next;
    });
  };

  return { progress, markStep, resetContent };
}

export function useGuideFavorites() {
  const [favorites, setFavorites] = useState<FavoritesState>([]);

  useEffect(() => {
    setFavorites(readJson<FavoritesState>(FAVORITES_KEY, []));
  }, []);

  const toggleFavorite = (id: string) => {
    setFavorites((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [id, ...current];
      writeJson(FAVORITES_KEY, next);
      return next;
    });
  };

  return { favorites, toggleFavorite, isFavorite: (id: string) => favorites.includes(id) };
}

export function useRecentlyViewed() {
  const [recent, setRecent] = useState<RecentItem[]>([]);

  useEffect(() => {
    setRecent(readJson<RecentItem[]>(RECENT_KEY, []));
  }, []);

  const addRecent = (item: Omit<RecentItem, "viewedAt">) => {
    setRecent((current) => {
      const next = [{ ...item, viewedAt: Date.now() }, ...current.filter((entry) => entry.id !== item.id)].slice(0, 8);
      writeJson(RECENT_KEY, next);
      return next;
    });
  };

  return { recent, addRecent };
}

export function useControlGroupPreset() {
  const [groups, setGroups] = useState(defaultControlGroups);

  useEffect(() => {
    setGroups(readJson<string[]>(CONTROL_GROUP_KEY, defaultControlGroups));
  }, []);

  const updateGroup = (index: number, value: string) => {
    setGroups((current) => {
      const next = [...current];
      next[index] = value;
      writeJson(CONTROL_GROUP_KEY, next);
      return next;
    });
  };

  const completionSummary = useMemo(() => groups.filter(Boolean).join(" · "), [groups]);

  return { groups, updateGroup, completionSummary };
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}
