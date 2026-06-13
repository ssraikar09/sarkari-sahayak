import { listSchemes } from "@/lib/schemes";
import { loadCache, updateCache } from "./cacheManager";
import type {
  CachedApplicationGuide,
  CachedInterventionPlan,
  CachedScheme,
  OfflineCache,
} from "./types";

export type SyncProgress = {
  step: "schemes" | "guides" | "interventions" | "done";
  percent: number;
  message: string;
};

export type SyncResult = {
  cache: OfflineCache;
  ok: boolean;
  error?: string;
};

function toCachedScheme(s: {
  id: string;
  scheme_name: string;
  state: string;
  category: string;
  scheme_scope: string;
  description: string;
  eligibility_criteria: string;
  benefits: string;
  required_documents: string;
  application_process: string | null;
  official_link: string | null;
}): CachedScheme {
  return {
    id: s.id,
    scheme_name: s.scheme_name,
    state: s.state,
    category: s.category,
    scheme_scope: s.scheme_scope,
    description: s.description,
    eligibility_criteria: s.eligibility_criteria,
    benefits: s.benefits,
    required_documents: s.required_documents,
    application_process: s.application_process,
    official_link: s.official_link,
    cached_at: new Date().toISOString(),
  };
}

function deriveGuide(s: CachedScheme): CachedApplicationGuide {
  const docs = s.required_documents
    .split(/[,;\n]/)
    .map((d) => d.trim())
    .filter(Boolean);
  const rawSteps = (s.application_process ?? "")
    .split(/\n+|(?:\d+\.\s)/)
    .map((t) => t.trim())
    .filter(Boolean);
  const steps =
    rawSteps.length > 0
      ? rawSteps.map((title, i) => ({ index: i + 1, title }))
      : [
          { index: 1, title: "Verify eligibility using cached criteria" },
          { index: 2, title: "Collect required documents" },
          { index: 3, title: "Submit at nearest CSC / official portal when online" },
        ];
  return {
    schemeId: s.id,
    schemeName: s.scheme_name,
    mode: s.official_link ? "Online / Offline" : "Offline",
    estimatedProcessingTime: "15–45 days (approx.)",
    documents: docs,
    steps,
    officialLink: s.official_link,
    cached_at: s.cached_at,
  };
}

function deriveInterventionsFromSchemes(
  schemes: CachedScheme[],
): CachedInterventionPlan[] {
  const byCategory = new Map<string, CachedScheme[]>();
  for (const s of schemes) {
    const arr = byCategory.get(s.category) ?? [];
    arr.push(s);
    byCategory.set(s.category, arr);
  }
  const now = new Date().toISOString();
  const plans: CachedInterventionPlan[] = [];
  let i = 0;
  for (const [category, arr] of byCategory) {
    i += 1;
    const reach = arr.length * 40; // deterministic estimate
    plans.push({
      id: `offline-int-${i}`,
      title: `${category} outreach drive`,
      priority: arr.length >= 3 ? "high" : "medium",
      impactScore: Math.min(95, 60 + arr.length * 5),
      populationAffected: reach,
      rationale: `Cached catalogue contains ${arr.length} ${category.toLowerCase()} scheme(s). Run an awareness + documentation drive to convert eligible households.`,
      expectedImpact: `Estimated ${reach} households reachable through CSC and local camps.`,
      cached_at: now,
    });
  }
  return plans;
}

export async function runSync(
  onProgress?: (p: SyncProgress) => void,
): Promise<SyncResult> {
  try {
    onProgress?.({
      step: "schemes",
      percent: 10,
      message: "Fetching latest scheme catalogue…",
    });
    const schemes = await listSchemes();
    const cachedSchemes = schemes.map(toCachedScheme);

    onProgress?.({
      step: "guides",
      percent: 55,
      message: "Building application guides for offline access…",
    });
    const guides = cachedSchemes.map(deriveGuide);

    onProgress?.({
      step: "interventions",
      percent: 80,
      message: "Caching intervention summaries…",
    });
    const interventions = deriveInterventionsFromSchemes(cachedSchemes);

    const cache = updateCache({
      schemes: cachedSchemes,
      guides,
      interventions,
      lastSyncedAt: new Date().toISOString(),
      lastSyncStatus: "success",
      lastSyncMessage: `Synced ${cachedSchemes.length} schemes, ${guides.length} guides, ${interventions.length} intervention summaries.`,
    });

    onProgress?.({ step: "done", percent: 100, message: "Sync complete." });
    return { cache, ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown sync error";
    const cache = updateCache({
      lastSyncStatus: "failed",
      lastSyncMessage: message,
    });
    onProgress?.({ step: "done", percent: 100, message: `Sync failed: ${message}` });
    return { cache: loadCache() ?? cache, ok: false, error: message };
  }
}
