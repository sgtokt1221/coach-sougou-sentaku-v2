/**
 * 弱点レコードの更新規則の検査（AI も DB も使わない）。validate:data に連結している。
 *
 * 2026-09-23 の点検で本番に出ていた不具合を、再発したら落ちるように固定する:
 *   - 正規ラベルを読み直すと別の正規ラベルになり、提出のたびに回数が合算された
 *   - 面接の提出で小論文の弱点が「改善中」になった
 *   - 解決済みが一度も付かず、累計5回で「重要」が出続けた
 *   - 「もう見ない」を押しても次に開くと出た
 */
import assert from "node:assert/strict";
import {
  WEAKNESS_TAXONOMY,
  resolveCanonical,
  isLocationOnlyLabel,
} from "../src/lib/growth/weakness-taxonomy";
import {
  updateWeaknessRecords,
  analyzeGrowth,
  getRemindableWeaknesses,
} from "../src/lib/growth/analyze";
import {
  getWeaknessReminderLevel,
  type WeaknessRecord,
} from "../src/lib/types/growth";

let checks = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    checks++;
  } catch (e) {
    console.error(`✗ ${name}`);
    throw e;
  }
}

const T0 = new Date("2026-09-01T00:00:00Z");
const day = (n: number) => new Date(T0.getTime() + n * 86400000);

function rec(p: Partial<WeaknessRecord> & { area: string }): WeaknessRecord {
  return {
    count: 1,
    firstOccurred: T0,
    lastOccurred: T0,
    improving: false,
    resolved: false,
    source: "essay",
    reminderDismissedAt: null,
    ...p,
  };
}

const find = (xs: WeaknessRecord[], area: string) => {
  const w = xs.find((x) => x.area === area);
  assert.ok(w, `「${area}」が無い: ${xs.map((x) => x.area).join(" / ")}`);
  return w;
};

// --- 正規ラベルは読み直しても自分自身に戻る ---------------------------------
check("正規ラベルの読み直しが自分自身に戻る", () => {
  for (const e of WEAKNESS_TAXONOMY) {
    assert.equal(resolveCanonical(e.label)?.id, e.id, `「${e.label}」`);
    assert.equal(
      resolveCanonical(e.label, { categoryHint: e.category })?.id,
      e.id,
      `「${e.label}」（カテゴリつき）`
    );
  }
});

check("問番号だけのラベルは場所を指すだけとみなす", () => {
  assert.ok(isLocationOnlyLabel("問1・問3"));
  assert.ok(isLocationOnlyLabel("問2"));
  assert.ok(!isLocationOnlyLabel("結論が不明確・欠落している"));
});

// --- 回数が合算され直さない ---------------------------------------------------
const WEAK = WEAKNESS_TAXONOMY.find((e) => e.id === "logic.weak_evidence")!;
const NOEXP = WEAKNESS_TAXONOMY.find((e) => e.id === "logic.leap")!;

check("別の正規ラベル同士は統合されず、提出を重ねても回数が増えない", () => {
  let recs = [
    rec({ area: WEAK.label, count: 11 }),
    rec({ area: NOEXP.label, count: 7 }),
  ];
  for (let i = 0; i < 3; i++) {
    recs = updateWeaknessRecords(recs, [], {
      source: "interview", // 別分野の提出なので小論文の弱点は動かない
      now: day(i + 1),
    });
  }
  assert.equal(recs.length, 2);
  assert.equal(find(recs, WEAK.label).count, 11);
  assert.equal(find(recs, NOEXP.label).count, 7);
});

check("表記ゆれは1回だけ統合され、次の提出で再び足されない", () => {
  // 正規ラベルに寄る旧来の自由文（ラベルそのものではない）
  const variant = "根拠となるデータが不足";
  assert.equal(
    resolveCanonical(variant)?.id,
    WEAK.id,
    "前提: 変種が weak_evidence に寄る"
  );
  let recs = [
    rec({ area: WEAK.label, count: 3 }),
    rec({ area: variant, count: 2 }),
  ];
  recs = updateWeaknessRecords(recs, [], { source: "interview", now: day(1) });
  assert.equal(recs.length, 1);
  assert.equal(find(recs, WEAK.label).count, 5);
  // 保存後に読み直した状態（統合後の1件だけ）で次の提出
  recs = updateWeaknessRecords(recs, [], { source: "interview", now: day(2) });
  assert.equal(find(recs, WEAK.label).count, 5);
});

// --- 分野 ---------------------------------------------------------------------
check("面接の提出で小論文の弱点は動かない", () => {
  const before = rec({ area: WEAK.label, count: 4, recentHits: [1, 1] });
  const [after] = updateWeaknessRecords([before], ["視線が散漫"], {
    source: "interview",
    now: day(1),
  }).filter((w) => w.area === WEAK.label);
  assert.equal(after.improving, false);
  assert.deepEqual(after.recentHits, [1, 1]);
  assert.equal(after.missStreak ?? 0, 0);
});

check("部分練習（countMisses=false）は指摘されなかった回を数えない", () => {
  const before = rec({ area: WEAK.label, count: 4, recentHits: [1] });
  const out = updateWeaknessRecords([before], [], {
    source: "essay",
    now: day(1),
    countMisses: false,
  });
  assert.deepEqual(find(out, WEAK.label).recentHits, [1]);
  assert.equal(find(out, WEAK.label).improving, false);
});

// --- 解決済みと段階 -----------------------------------------------------------
check(
  "同じ分野で3回続けて指摘されなければ解決済み、再び指摘されたら戻る",
  () => {
    let recs = [rec({ area: WEAK.label, count: 6, recentHits: [1, 1, 1] })];
    for (let i = 1; i <= 2; i++) {
      recs = updateWeaknessRecords(recs, [], { source: "essay", now: day(i) });
      assert.equal(
        find(recs, WEAK.label).resolved,
        false,
        `${i}回目で解決にしない`
      );
      assert.equal(find(recs, WEAK.label).improving, true);
    }
    recs = updateWeaknessRecords(recs, [], {
      source: "skill_check",
      now: day(3),
    });
    assert.equal(find(recs, WEAK.label).resolved, true, "3回目で解決済み");
    assert.equal(getWeaknessReminderLevel(find(recs, WEAK.label)), "resolved");

    recs = updateWeaknessRecords(recs, [WEAK.label], {
      source: "essay",
      now: day(4),
    });
    const w = find(recs, WEAK.label);
    assert.equal(w.resolved, false, "再び指摘されたら戻る");
    assert.equal(w.count, 7);
    assert.equal(w.missStreak, 0);
  }
);

check("段階は累計でなく直近5回の指摘数で決まる", () => {
  const lv = (hits: number[], improving = false) =>
    getWeaknessReminderLevel(
      rec({ area: "x", count: 20, recentHits: hits, improving })
    );
  assert.equal(lv([1, 1, 1, 0, 0]), "critical");
  assert.equal(lv([0, 1, 0, 1, 0]), "warning");
  assert.equal(lv([0, 0, 1, 0, 0], true), "improving");
  assert.equal(lv([0, 0, 0, 0, 0], true), "improving");
  // 直近の記録が無い旧データは累計で判定する
  assert.equal(
    getWeaknessReminderLevel(rec({ area: "x", count: 5 })),
    "critical"
  );
});

// --- 成長イベント -------------------------------------------------------------
check("「改善されています」は前回同じ分野で指摘され今回無いときだけ", () => {
  const essayWeak = rec({ area: WEAK.label, count: 3, recentHits: [1, 1] });
  const oldWeak = rec({ area: NOEXP.label, count: 3, recentHits: [1, 0] });
  const praised = (evs: ReturnType<typeof analyzeGrowth>) =>
    evs.filter((e) => e.type === "praise").map((e) => e.area);

  assert.deepEqual(praised(analyzeGrowth([], [essayWeak, oldWeak], "essay")), [
    WEAK.label,
  ]);
  // 面接の提出では小論文の弱点を褒めない
  assert.deepEqual(praised(analyzeGrowth([], [essayWeak], "interview")), []);
});

// --- リマインド ---------------------------------------------------------------
check("「もう見ない」は再び指摘されるまで出さない。解決済みも出さない", () => {
  const base = { count: 5, recentHits: [1, 1, 1] };
  const dismissed = rec({
    area: "a",
    ...base,
    lastOccurred: day(1),
    reminderDismissedAt: day(2),
  });
  const repointed = rec({
    area: "b",
    ...base,
    lastOccurred: day(3),
    reminderDismissedAt: day(2),
  });
  const resolved = rec({ area: "c", ...base, resolved: true });
  const shown = getRemindableWeaknesses(
    [dismissed, repointed, resolved],
    "dashboard"
  ).map((w) => w.area);
  assert.deepEqual(shown, ["b"]);
});

// --- v2 の別名 ID と domain -----------------------------------------------------
check("旧 ID の既存レコードと新ラベルのタグは同じ弱点として比べる", () => {
  const old = rec({
    area: "根拠が一般論で具体に乏しい",
    canonicalId: "originality.no_experience",
    count: 3,
    recentHits: [1],
  });
  const events = analyzeGrowth([WEAK.label], [old], "essay");
  assert.deepEqual(
    events.filter((e) => e.type === "praise" || e.type === "new_weakness"),
    [],
    JSON.stringify(events)
  );
});

check(
  "小論文の「具体的なエピソードの欠如」は既存の統合でも面接の弱点に寄らない",
  () => {
    const essayRec = rec({ area: "具体的なエピソードの欠如" });
    const consolidated = updateWeaknessRecords([essayRec], [], {
      source: "essay",
      now: day(1),
    });
    assert.equal(consolidated.length, 1);
    assert.equal(consolidated[0].canonicalId, "logic.weak_evidence");
    // 書き込み側と同じ弱点に1本で畳まれる（2本に割れない）
    const written = updateWeaknessRecords(
      [essayRec],
      ["具体的なエピソードの欠如"],
      { source: "essay", now: day(1) }
    );
    assert.equal(written.length, 1);
    assert.equal(written[0].canonicalId, "logic.weak_evidence");
    // 面接の提出で付いた弱点は面接の ID のまま
    const iv = updateWeaknessRecords([], ["具体的なエピソードの欠如"], {
      source: "interview",
      now: day(1),
    });
    assert.equal(iv[0].canonicalId, "iv.no_episode");
  }
);

console.log(`verify-weakness-records: ${checks} checks passed`);
