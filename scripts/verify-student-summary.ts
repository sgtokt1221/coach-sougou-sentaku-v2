/** 生徒詳細の要点の帯の組み方の検査（DB を使わない）。 */
import assert from "node:assert/strict";
import {
  buildActionItems,
  buildTopWeaknesses,
  firstLine,
} from "../src/lib/admin/student-summary";
import { parseSessionTime } from "../src/lib/admin/session-time";
import type { WeaknessRecord } from "../src/lib/types/growth";

let checks = 0;
const check = (name: string, fn: () => void) => {
  try {
    fn();
    checks++;
  } catch (e) {
    console.error(`✗ ${name}`);
    throw e;
  }
};

// 2026-09-24 12:00 JST
const now = new Date("2026-09-24T03:00:00Z");
const doc = (id: string, deadline: string, status = "draft") => ({
  id,
  type: "志望理由書",
  deadline,
  status,
});
const hw = (id: string, dueDate: string, status = "assigned") => ({
  id,
  title: "要約練習",
  dueDate,
  status,
});
const labels = (
  documents: ReturnType<typeof doc>[],
  homework: ReturnType<typeof hw>[] = [],
  at = now
) => buildActionItems({ documents, homework, now: at }).map((i) => i.label);

check("書類: 下書きで期限5日後", () => {
  assert.deepEqual(labels([doc("a", "2026-09-29")]), [
    "志望理由書の期限 あと5日",
  ]);
});
check("書類: 下書き以外は出ない", () => {
  assert.deepEqual(labels([doc("a", "2026-09-26", "in_review")]), []);
  assert.deepEqual(labels([doc("a", "2026-09-26", "final")]), []);
});
check("書類: 期限8日後は出ない", () => {
  assert.deepEqual(labels([doc("a", "2026-10-02")]), []);
});
check("書類: 期限2日超過", () => {
  assert.deepEqual(labels([doc("a", "2026-09-22")]), [
    "志望理由書の期限切れ（2日超過）",
  ]);
});
check("書類: ISO の期限も日本時間の日付で数える", () => {
  // 2026-09-25T15:00Z = 9/26 00:00 JST → あと2日
  assert.deepEqual(labels([doc("a", "2026-09-25T15:00:00.000Z")]), [
    "志望理由書の期限 あと2日",
  ]);
});
check("日本時間の日付で今日を決める（UTC ではまだ前日）", () => {
  // 2026-09-24T16:00Z = 9/25 01:00 JST
  const late = new Date("2026-09-24T16:00:00Z");
  assert.deepEqual(labels([doc("a", "2026-09-25")], [], late), [
    "志望理由書の期限 今日",
  ]);
  assert.deepEqual(labels([], [hw("h", "2026-09-24")], late), [
    "宿題「要約練習」期限切れ",
  ]);
});
check("宿題: assigned で期限切れ", () => {
  assert.deepEqual(labels([], [hw("h", "2026-09-23")]), [
    "宿題「要約練習」期限切れ",
  ]);
});
check("宿題: 今日・あと2日", () => {
  assert.deepEqual(
    labels([], [hw("h1", "2026-09-24", "in_progress"), hw("h2", "2026-09-26")]),
    ["宿題「要約練習」期限 今日", "宿題「要約練習」期限 あと2日"]
  );
});
check("宿題: submitted は出ない", () => {
  assert.deepEqual(labels([], [hw("h", "2026-09-23", "submitted")]), []);
});
check("宿題: 期限3日後は出ない", () => {
  assert.deepEqual(labels([], [hw("h", "2026-09-27")]), []);
});

const w = (area: string, extra: Partial<WeaknessRecord> = {}): WeaknessRecord =>
  ({
    area,
    count: 1,
    firstOccurred: new Date(),
    lastOccurred: new Date(),
    improving: false,
    resolved: false,
    source: "essay",
    ...extra,
  }) as WeaknessRecord;

check("弱点: critical が先・warning・母数", () => {
  const out = buildTopWeaknesses([
    w("B", { recentHits: [1, 0, 1] }),
    w("A", { recentHits: [1, 1, 1] }),
  ]);
  assert.deepEqual(out, [
    { area: "A", level: "critical", recent: { hits: 3, of: 3 } },
    { area: "B", level: "warning", recent: { hits: 2, of: 3 } },
  ]);
});
check("弱点: resolved・archivedAt・該当しないものは出ない", () => {
  const out = buildTopWeaknesses([
    w("R", { recentHits: [1, 1, 1], resolved: true }),
    w("X", { recentHits: [1, 1, 1], archivedAt: new Date() }),
    w("L", { recentHits: [1, 0, 0] }),
  ]);
  assert.deepEqual(out, []);
});
check("弱点: 最大3件、旧データは recent null", () => {
  const out = buildTopWeaknesses([
    w("a", { recentHits: [1, 1, 1] }),
    w("b", { recentHits: [1, 1, 1] }),
    w("c", { count: 6 }),
    w("d", { recentHits: [1, 1, 1, 1] }),
  ]);
  assert.equal(out.length, 3);
  assert.ok(out.every((x) => x.level === "critical"));
  assert.equal(buildTopWeaknesses([w("c", { count: 6 })])[0].recent, null);
});

check("firstLine", () => {
  assert.equal(firstLine("\n  次回は反論\n2行目"), "次回は反論");
  assert.equal(firstLine(""), null);
  assert.equal(firstLine(null), null);
});

check("面談時刻は日本時間として読む", () => {
  assert.equal(
    parseSessionTime("2026-09-26T17:00"),
    Date.parse("2026-09-26T08:00:00Z")
  );
  assert.equal(
    parseSessionTime("2026-09-26T17:00:00"),
    Date.parse("2026-09-26T08:00:00Z")
  );
  assert.equal(
    parseSessionTime("2026-09-26T08:00:00.000Z"),
    Date.parse("2026-09-26T08:00:00Z")
  );
});

console.log(`✓ verify-student-summary: ${checks} checks passed`);
