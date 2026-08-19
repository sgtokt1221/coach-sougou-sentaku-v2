/**
 * 既存の出願書類を、新しい採点軸（document-review-v4）で添削し直す。
 *
 * v4 で軸と基準が変わった:
 *   旧: AP合致度 / 構成 / 独自性 の3軸。共通アンカーのみ。字数を渡していない
 *   新: 上記 + 表現（日本語）の4軸。軸ごとに基準を書き分け、目標字数と
 *       充足率をサーバー計算値で渡す。日本語の直し（赤ペン）も返る
 *
 * 混ざったままだと、表現軸のある書類と無い書類が同じ画面に並び、
 * 生徒間の比較ができない。
 *
 * 採点は生徒・管理者と同じ lib/documents/review-core.ts を通す。
 * 旧スコアは feedbackBeforeV4 に退避するので元に戻せる。
 *
 * 使い方（既定は確認のみ。--apply で書き込み）:
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID=coach-sougou-sentaku \
 *   GOOGLE_CLOUD_PROJECT=coach-sougou-sentaku \
 *   npx tsx scripts/rescore-documents.ts [--apply] [--limit=20] [--names=長谷川] [--force]
 *
 * --force: すでに最新版で採点済みのものも対象にする。指定した生徒の書類を
 *          まとめて採点し直したいときに使う。未添削（feedback が無い）書類も
 *          対象に含める。
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { adminDb } from "../src/lib/firebase/admin";
import { reviewDocumentCore } from "../src/lib/documents/review-core";
import { AI_PROMPT_VERSIONS } from "../src/lib/ai/prompt-versions";

const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");
const LIMIT = Number(
  process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 0,
);
const TARGET_VERSION = AI_PROMPT_VERSIONS.documentReview.promptVersion;
const NAMES = (
  process.argv.find((a) => a.startsWith("--names="))?.split("=")[1] ?? ""
)
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);

async function main() {
  if (!adminDb) throw new Error("Firestore に接続できません");

  const users = await adminDb.collection("users").get();
  const nameByUid = new Map(
    users.docs.map((u) => [
      u.id,
      String(u.data().displayName ?? u.data().name ?? u.id),
    ]),
  );

  let allowedUids: Set<string> | null = null;
  if (NAMES.length > 0) {
    allowedUids = new Set(
      [...nameByUid.entries()]
        .filter(([, name]) => NAMES.some((n) => name.includes(n)))
        .map(([uid]) => uid),
    );
    console.log(
      `対象の生徒: ${[...allowedUids].map((u) => nameByUid.get(u)).join(" / ") || "（該当なし）"}`,
    );
  }

  const snap = await adminDb.collection("documents").get();
  const targets = snap.docs.filter((d) => {
    const x = d.data();
    if (!String(x.content ?? "").trim()) return false;
    if (allowedUids && !allowedUids.has(x.userId)) return false;
    // --force なら版も添削済みかも問わない（指名した生徒をまとめて採点し直す用）
    if (FORCE) return true;
    // 通常は添削済みのものだけを対象にする（未添削は生徒・管理者が実行する）
    if (!x.feedback) return false;
    // すでに新版で採点済みなら飛ばす（再実行しても二重に課金しない）
    return x.feedback?.aiMetadata?.promptVersion !== TARGET_VERSION;
  });

  const list = LIMIT > 0 ? targets.slice(0, LIMIT) : targets;
  console.log(
    `全 ${snap.size} 件 / 対象 ${targets.length} 件 / 今回処理 ${list.length} 件` +
      `${APPLY ? "" : "（確認のみ。--apply で書き込み）"}\n`,
  );

  let ok = 0;
  let failed = 0;

  for (const d of list) {
    const x = d.data();
    const before = x.feedback;
    try {
      const { feedback } = await reviewDocumentCore({
        documentId: d.id,
        ownerUid: x.userId,
      });
      console.log(
        `${d.id}  ${nameByUid.get(x.userId) ?? x.userId}  ${x.type} (${x.wordCount ?? "?"}字)\n` +
          `  旧 ${before ? `AP${before.apAlignmentScore ?? "-"} 構成${before.structureScore} 独自${before.originalityScore}` : "（未添削）"}\n` +
          `  新 AP${feedback.apAlignmentScore ?? "-"} 構成${feedback.structureScore} 独自${feedback.originalityScore} 表現${feedback.expressionScore}` +
          `  赤ペン${feedback.languageCorrections?.length ?? 0}件`,
      );

      if (APPLY) {
        // reviewDocumentCore が feedback を保存済み。旧スコアの退避だけ足す
        if (before && !x.feedbackBeforeV4) {
          await d.ref.set({ feedbackBeforeV4: before }, { merge: true });
        }
      } else {
        /**
         * 確認のみの実行でも core は保存してしまうため、元に戻す。
         * feedbackAt / feedbackContent も core が書くので一緒に戻すこと。
         * 以前は feedback だけ戻していたため、未添削だった書類に
         * 「添削日はあるが結果が無い」状態が残った。
         */
        await d.ref.set(
          {
            feedback: before,
            feedbackAt: x.feedbackAt ?? null,
            feedbackContent: x.feedbackContent ?? null,
          },
          { merge: true },
        );
      }
      ok++;
    } catch (err) {
      console.log(`${d.id}: 失敗 ${String(err).slice(0, 160)}`);
      failed++;
    }
  }

  console.log(`\n成功 ${ok} 件 / 失敗 ${failed} 件`);
  if (!APPLY) console.log("--- 確認のみ。--apply で書き込む ---");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
