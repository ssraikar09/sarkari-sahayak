import { createServerFn } from "@tanstack/react-start";
import type { WelfareObservatorySnapshot } from "./types";

export const getWelfareObservatoryFn = createServerFn({ method: "GET" })
  .inputValidator(() => ({}))
  .handler(async (): Promise<WelfareObservatorySnapshot> => {
    const { getCommandCenterFn } = await import(
      "@/lib/command-center/nationalAnalytics"
    );
    const { getInterventionPlannerFn } = await import(
      "@/lib/intervention-planner/planner.functions"
    );
    const { getEarlyWarningFn } = await import(
      "@/lib/early-warning/warning.functions"
    );
    const { getImpactMonitoringFn } = await import(
      "@/lib/impact-monitoring/impact.functions"
    );
    const { buildObservatorySnapshot } = await import("./observatoryEngine");

    const [national, planner, warnings, impact] = await Promise.all([
      getNationalSnapshotFn(),
      getInterventionPlannerFn(),
      getEarlyWarningFn(),
      getImpactMonitoringFn(),
    ]);

    return buildObservatorySnapshot(national, planner, warnings, impact);
  });
