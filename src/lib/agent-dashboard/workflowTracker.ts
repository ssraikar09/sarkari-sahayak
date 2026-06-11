import type { ApplicationStatus } from "./types";

/**
 * Manual workflow status overrides keyed by citizen profile id. Persisted
 * client-side so agents can mark a citizen's application as Submitted /
 * Completed without a schema change. Falls back to the derived status when
 * no override exists.
 */
const STORAGE_KEY = "sarkari-agent-workflow-overrides-v1";

type OverrideMap = Record<string, ApplicationStatus>;

function read(): OverrideMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as OverrideMap;
  } catch {
    return {};
  }
}

function write(map: OverrideMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export function getStatusOverride(
  citizenProfileId: string,
): ApplicationStatus | null {
  return read()[citizenProfileId] ?? null;
}

export function setStatusOverride(
  citizenProfileId: string,
  status: ApplicationStatus,
): void {
  const map = read();
  map[citizenProfileId] = status;
  write(map);
}

export function clearStatusOverride(citizenProfileId: string): void {
  const map = read();
  delete map[citizenProfileId];
  write(map);
}

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "Not Started",
  "In Progress",
  "Submitted",
  "Completed",
];
