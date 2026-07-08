// src/lib/types/logical-tour.ts
export type TourStationKey = "choco" | "summary" | "logic";

export interface TourStation {
  key: TourStationKey;
  label: string;
  href: string;      // 導線URL（?tour=1 は付けない。付与は tourHref() で）
  collection: string; // users/{uid}/<collection>
  dateField: "createdAt" | "completedAt";
  dateType: "isoString" | "timestamp";
  estMinutes: number;
  order: number;
}

/** 単票 logicalTours/{uid} */
export interface LogicalTourState {
  lastCompletedDate: string; // "YYYY-MM-DD"（未達は ""）
  streak: number;
  longestStreak: number;
}

export interface LogicalTourResponse {
  date: string;
  stations: { key: TourStationKey; done: boolean }[];
  completedCount: number;
  allDone: boolean;
  nextStationKey: TourStationKey | null;
  remainingMinutes: number;
  streak: number;
  longestStreak: number;
}
