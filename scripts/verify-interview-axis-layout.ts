/**
 * 面接の軸の正本（axis-layout.ts）の検査。
 * 版ごとに「合計に入る軸の和 = total」になること、旧回・新回でラベルが正しく付くことを見る。
 *   npx tsx scripts/verify-interview-axis-layout.ts
 */
import assert from "node:assert/strict";
import {
  interviewAxisLayout,
  interviewAxisLabel,
  sumInTotalAxes,
} from "../src/lib/interview/axis-layout";
import { normalizedInterviewTotal } from "../src/lib/types/interview";

// v5 個人面接: 明確さ・AP・一貫性・具体性
const v5 = { clarity: 7, apAlignment: 6, consistency: 5, specificity: 8, bodyLanguage: null, total: 26, totalMax: 40 };
assert.equal(sumInTotalAxes("individual", v5), 26);
assert.deepEqual(
  interviewAxisLayout("individual", v5).map((a) => a.key),
  ["clarity", "apAlignment", "consistency", "specificity"]
);
assert.ok(interviewAxisLayout("individual", v5).every((a) => a.inTotal));

// v4 以前の個人面接: 熱意が出て、一貫性は出ない
const v3 = { clarity: 7, apAlignment: 6, enthusiasm: 9, specificity: 8, bodyLanguage: null, total: 30 };
assert.equal(sumInTotalAxes("individual", v3), 30);
assert.deepEqual(
  interviewAxisLayout("individual", v3).map((a) => a.key),
  ["clarity", "apAlignment", "enthusiasm", "specificity"]
);

// v4/v5 口頭試問（満点40）: AP・一貫性は合計外、専門知識・応用思考力が合計に入る
const oral = { clarity: 8, apAlignment: 6, consistency: 6, specificity: 6, bodyLanguage: null, knowledgeAccuracy: 8, criticalThinking: 8, total: 30, totalMax: 40 };
assert.equal(sumInTotalAxes("oral_exam", oral), 30);
const oralAxes = interviewAxisLayout("oral_exam", oral);
assert.equal(interviewAxisLabel(oralAxes.find((a) => a.key === "apAlignment")!), "AP合致度（合計外）");
assert.equal(interviewAxisLabel(oralAxes.find((a) => a.key === "consistency")!), "一貫性（合計外）");
assert.equal(interviewAxisLabel(oralAxes.find((a) => a.key === "criticalThinking")!), "応用思考力");

// 旧口頭試問（満点50）: 共通4軸＋専門知識が合計、応用思考力は合計外
const oral50 = { clarity: 8, apAlignment: 7, enthusiasm: 7, specificity: 6, bodyLanguage: null, knowledgeAccuracy: 8, criticalThinking: 9, total: 36, totalMax: 50 };
assert.equal(sumInTotalAxes("oral_exam", oral50), 36);
assert.equal(interviewAxisLabel(interviewAxisLayout("oral_exam", oral50).find((a) => a.key === "criticalThinking")!), "応用思考力（合計外）");
assert.equal(normalizedInterviewTotal(oral50), 36 / 50 * 40);

// 動画が無い回はボディランゲージを出さない。ある回は合計外で出す
assert.ok(!interviewAxisLayout("individual", v5).some((a) => a.key === "bodyLanguage"));
const withVideo = { ...v5, bodyLanguage: 7 };
const bl = interviewAxisLayout("individual", withVideo).find((a) => a.key === "bodyLanguage")!;
assert.equal(interviewAxisLabel(bl), "ボディランゲージ（合計外）");

// v6 集団討論: 明確さ・協調性・リーダーシップ・傾聴力が合計、AP・一貫性・具体性は合計外
const gd6 = { clarity: 6, apAlignment: 5, consistency: 6, specificity: 3, bodyLanguage: null, collaboration: 7, leadership: 5, listening: 7, total: 25, totalMax: 40, totalBasis: "mode-v6" as const };
assert.equal(sumInTotalAxes("group_discussion", gd6), 25);
const gdAxes = interviewAxisLayout("group_discussion", gd6);
assert.equal(interviewAxisLabel(gdAxes.find((a) => a.key === "specificity")!), "具体性（合計外）");
assert.equal(interviewAxisLabel(gdAxes.find((a) => a.key === "listening")!), "傾聴力");
// v5 までの集団討論: 共通4軸が合計のまま、討論の軸は合計外
const gd5 = { clarity: 6, apAlignment: 5, consistency: 6, specificity: 6, bodyLanguage: null, collaboration: 7, leadership: 5, listening: 7, total: 23, totalMax: 40 };
assert.equal(sumInTotalAxes("group_discussion", gd5), 23);
assert.equal(interviewAxisLabel(interviewAxisLayout("group_discussion", gd5).find((a) => a.key === "listening")!), "傾聴力（合計外）");
// v6 プレゼン: 明確さ・AP合致度・発表の論理構成・データの根拠が合計
const pr6 = { clarity: 7, apAlignment: 6, consistency: 6, specificity: 5, bodyLanguage: null, presentationStructure: 7, dataEvidence: 5, resourceConsistency: 6, total: 25, totalMax: 40, totalBasis: "mode-v6" as const };
assert.equal(sumInTotalAxes("presentation", pr6), 25);
assert.equal(interviewAxisLabel(interviewAxisLayout("presentation", pr6).find((a) => a.key === "resourceConsistency")!), "資料との整合性（合計外）");

console.log("verify-interview-axis-layout: ok");
