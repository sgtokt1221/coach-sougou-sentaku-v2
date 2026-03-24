export interface WeaknessRecord {
  area: string;
  count: number;
  firstOccurred: Date;
  lastOccurred: Date;
  improving: boolean;
  resolved: boolean;
  source: "essay" | "interview" | "both";
  reminderDismissedAt: Date | null;
}

export type WeaknessReminderLevel = "critical" | "warning" | "improving" | "resolved";

export function getWeaknessReminderLevel(w: WeaknessRecord): WeaknessReminderLevel | null {
  if (w.resolved) return "resolved";
  if (w.count >= 5) return "critical";
  if (w.count >= 3) return "warning";
  if (w.improving) return "improving";
  return null;
}
