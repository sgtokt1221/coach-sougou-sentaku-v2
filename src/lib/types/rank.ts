import type { AggregateBreakdown } from "@/lib/skill-check/aggregate";

export interface StudentRankResponse {
  essay: AggregateBreakdown;
  interview: AggregateBreakdown;
}
