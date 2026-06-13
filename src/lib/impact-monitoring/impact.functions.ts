import { createServerFn } from "@tanstack/react-start";
import type { ImpactMonitoringSnapshot } from "./types";

export const getImpactMonitoringFn = createServerFn({ method: "GET" })
  .inputValidator(() => ({}))
  .handler(async (): Promise<ImpactMonitoringSnapshot> => {
    const { getInterventionPlannerFn } = await import(
      "@/lib/intervention-planner/planner.functions"
    );
    const { buildImpactSnapshot } = await import("./impactEngine");
    const planner = await getInterventionPlannerFn();
    return buildImpactSnapshot(planner);
  });
