import type {
  CachedApplicationGuide,
  CachedInterventionPlan,
  CachedScheme,
  OfflineCache,
} from "./types";

const STORAGE_KEY = "ssx_offline_cache_v1";

const EMPTY: OfflineCache = {
  schemes: [],
  guides: [],
  interventions: [],
  lastSyncedAt: null,
  lastSyncStatus: "never",
  lastSyncMessage: null,
};

export function loadCache(): OfflineCache {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<OfflineCache>;
    return {
      schemes: parsed.schemes ?? [],
      guides: parsed.guides ?? [],
      interventions: parsed.interventions ?? [],
      lastSyncedAt: parsed.lastSyncedAt ?? null,
      lastSyncStatus: parsed.lastSyncStatus ?? "never",
      lastSyncMessage: parsed.lastSyncMessage ?? null,
    };
  } catch {
    return { ...EMPTY };
  }
}

export function saveCache(cache: OfflineCache): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    /* quota exceeded — ignore */
  }
}

export function clearCache(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function updateCache(
  patch: Partial<{
    schemes: CachedScheme[];
    guides: CachedApplicationGuide[];
    interventions: CachedInterventionPlan[];
    lastSyncedAt: string | null;
    lastSyncStatus: OfflineCache["lastSyncStatus"];
    lastSyncMessage: string | null;
  }>,
): OfflineCache {
  const current = loadCache();
  const next: OfflineCache = { ...current, ...patch };
  saveCache(next);
  return next;
}
