import type { ActionStepStatus, StoredProgress } from "./types";

const KEY_PREFIX = "ssx.navigator.progress::";

function keyFor(goalText: string): string {
  // Hash-ish: lowercase and trim — keeps history per distinct goal.
  return KEY_PREFIX + goalText.trim().toLowerCase().slice(0, 200);
}

export function loadProgress(goalText: string): StoredProgress {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(keyFor(goalText));
    return raw ? (JSON.parse(raw) as StoredProgress) : {};
  } catch {
    return {};
  }
}

export function saveProgress(goalText: string, progress: StoredProgress): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(keyFor(goalText), JSON.stringify(progress));
  } catch {
    /* ignore quota errors */
  }
}

export function setStepStatus(
  goalText: string,
  stepId: string,
  status: ActionStepStatus,
): StoredProgress {
  const current = loadProgress(goalText);
  const next = { ...current, [stepId]: status };
  saveProgress(goalText, next);
  return next;
}

export const STATUS_LABEL: Record<ActionStepStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
};

export const STATUS_ORDER: ActionStepStatus[] = [
  "not_started",
  "in_progress",
  "completed",
];
