/** 生徒詳細の時系列の合わせ方の検査（DB を使わない）。 */
import assert from "node:assert/strict";
import {
  mergeTimeline,
  dailyActivity,
  allowedTimelineKinds,
  TIMELINE_FILTERS,
  TIMELINE_KINDS,
  type TimelineItem,
} from "../src/lib/admin/timeline";

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
const it = (
  kind: TimelineItem["kind"],
  id: string,
  at: string
): TimelineItem => ({
  kind,
  id,
  at,
  title: id,
});

check("種類をまたいで新しい順", () => {
  const r = mergeTimeline(
    {
      essay: [it("essay", "e1", "2026-09-20T10:00:00Z")],
      session: [it("session", "s1", "2026-09-21T10:00:00Z")],
      document: [it("document", "d1", "2026-09-19T10:00:00Z")],
    },
    20
  );
  assert.deepEqual(
    r.items.map((x) => x.id),
    ["s1", "e1", "d1"]
  );
  assert.equal(r.nextBefore, null);
});

check("limit を超えたら nextBefore を返す", () => {
  const essays = Array.from({ length: 5 }, (_, i) =>
    it("essay", `e${i}`, `2026-09-2${i}T00:00:00Z`)
  );
  const r = mergeTimeline({ essay: essays }, 3);
  assert.deepEqual(
    r.items.map((x) => x.id),
    ["e4", "e3", "e2"]
  );
  assert.equal(r.nextBefore, "2026-09-22T00:00:00Z");
});

check("同じ日時の行はページ境界で割らない", () => {
  const r = mergeTimeline(
    {
      essay: [
        it("essay", "a", "2026-09-23T00:00:00Z"),
        it("essay", "b", "2026-09-22T00:00:00Z"),
      ],
      session: [it("session", "c", "2026-09-22T00:00:00Z")],
    },
    2
  );
  // 2件目と3件目が同じ日時なので、2件目も次のページへ回す
  assert.deepEqual(
    r.items.map((x) => x.id),
    ["a"]
  );
  assert.equal(r.nextBefore, "2026-09-23T00:00:00Z");
});

check("日時が壊れた行は捨てる・失敗した種類を返す", () => {
  const r = mergeTimeline(
    {
      essay: [
        it("essay", "x", "not-a-date"),
        it("essay", "y", "2026-09-01T00:00:00Z"),
      ],
    },
    20,
    ["session"]
  );
  assert.deepEqual(
    r.items.map((x) => x.id),
    ["y"]
  );
  assert.deepEqual(r.failedKinds, ["session"]);
});

check("活動量は日本時間の日ごと", () => {
  const now = new Date("2026-09-24T03:00:00Z"); // 日本時間 12:00
  const r = dailyActivity(
    [
      { at: "2026-09-23T16:00:00Z" }, // 日本時間 9/24 01:00
      { at: "2026-09-23T14:00:00Z" }, // 日本時間 9/23 23:00
    ],
    2,
    now
  );
  assert.deepEqual(r, [
    { date: "2026-09-23", count: 1 },
    { date: "2026-09-24", count: 1 },
  ]);
});

check("面談の救済だけの講師は、開いた先も通る種類だけ", () => {
  assert.deepEqual(allowedTimelineKinds(TIMELINE_KINDS, true), [
    "chocoReview",
    "summaryDrill",
    "logicDrill",
    "interviewDrill",
  ]);
  assert.deepEqual(allowedTimelineKinds(TIMELINE_KINDS, false), [...TIMELINE_KINDS]);
  const kindsOf = (key: string) => TIMELINE_FILTERS.find((f) => f.key === key)!.kinds;
  assert.deepEqual(allowedTimelineKinds(kindsOf("essay"), true), ["chocoReview"]);
  assert.deepEqual(allowedTimelineKinds(kindsOf("document"), true), []);
  assert.deepEqual(allowedTimelineKinds(kindsOf("drill"), true), ["summaryDrill", "logicDrill"]);
});

console.log(`verify-timeline: ${checks} checks passed`);
