const KEY_PREFIX = "ssx_app_guide_checklist_";

function key(schemeId: string): string {
  return `${KEY_PREFIX}${schemeId}`;
}

export function loadChecklistState(schemeId: string): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(key(schemeId));
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function saveChecklistState(
  schemeId: string,
  state: Record<string, boolean>,
): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key(schemeId), JSON.stringify(state));
  } catch {
    /* ignore quota errors */
  }
}

export function clearChecklistState(schemeId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(key(schemeId));
  } catch {
    /* ignore */
  }
}
