/**
 * 活動状況（直近30日）の日付の区切りと数え方を確かめる。
 *   npx tsx scripts/verify-activity-heatmap.ts
 */
import { buildActivityHeatmapData, HEATMAP_DAYS } from "../src/lib/utils/activity-heatmap";

let failed = 0;
const check = (name: string, ok: boolean) => {
  console.log(`${ok ? "✓" : "✗"} ${name}`);
  if (!ok) failed++;
};

// 2026-11-01 12:00 JST
const now = Date.parse("2026-11-01T12:00:00+09:00");
const ts = (iso: string) => ({ toDate: () => new Date(iso) });

const days = buildActivityHeatmapData(
  [
    // 日本時間 11/1 0:30 は UTC だと 10/31。日本時間の 11/1 に数える
    { key: "essay", at: ts("2026-10-31T15:30:00Z") },
    // ISO 文字列も数える
    { key: "interview", at: "2026-10-30T10:00:00+09:00" },
    // 同じ書類を同じ日に3回保存 → 1件、別の日 → もう1件
    { key: "document", at: "2026-10-29T09:00:00+09:00", group: "doc1" },
    { key: "document", at: "2026-10-29T18:00:00+09:00", group: "doc1" },
    { key: "document", at: "2026-10-29T23:00:00+09:00", group: "doc1" },
    { key: "document", at: "2026-10-28T10:00:00+09:00", group: "doc1" },
    // 1年前の同じ日付は数えない（以前は月/日だけで照合していた）
    { key: "essay", at: "2025-11-01T10:00:00+09:00" },
    // 期間の初日 0:00 は入る、前日 23:59 は入らない
    { key: "drill", at: "2026-10-03T00:00:00+09:00" },
    { key: "drill", at: "2026-10-02T23:59:00+09:00" },
    // 日付が無いものは数えない
    { key: "choco", at: null },
  ],
  now,
);

const byDate = Object.fromEntries(days.map((d) => [d.date, d]));
check("30日分ある", days.length === HEATMAP_DAYS);
check("初日は 10/3、最終日は 11/1", days[0].date === "10/3" && days.at(-1)!.date === "11/1");
check("日本時間で日付を区切る", byDate["11/1"].essay === 1 && byDate["10/31"].essay === 0);
check("ISO 文字列も数える", byDate["10/30"].interview === 1);
check("同じ書類は1日1件", byDate["10/29"].document === 1 && byDate["10/28"].document === 1);
check("期間の境目", byDate["10/3"].drill === 1);
check("期間外・日付なしは数えない", days.reduce((s, d) => s + d.essay + d.drill + d.choco, 0) === 2);

if (failed) {
  console.error(`${failed} 件失敗`);
  process.exit(1);
}
