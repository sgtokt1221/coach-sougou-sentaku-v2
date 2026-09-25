/**
 * 過去の答案に「1文ずつの点検」（src/lib/essay/sentence-check-judge.ts）をかけ、
 * 結果を essays/{id}.sentenceCheck に残す。
 *
 * 点検は添削 v26（2026-09-25）で入れたので、それより前の答案には主述のねじれ等が
 * 弱点として一度も積まれていない（本番で、説明の段落ごとにねじれている生徒の
 * 弱点リストに表現力の課題が出ていなかった）。ここで残した結果を
 * rebuild-weaknesses.ts が読み、弱点を作り直す。
 *
 * feedback（生徒が見ている添削結果）は書き換えない。
 *
 * 使い方:
 *   1) 点検だけ（AI を呼ぶ。Firestore には書かない。結果を .claude/sentence-check-backfill.json に保存）
 *      npx tsx --env-file=.env.local scripts/backfill-sentence-check.ts [--name=山内]
 *   2) 1) の結果を書き込む（AI は呼ばない）
 *      npx tsx --env-file=.env.local scripts/backfill-sentence-check.ts --apply
 *   3) 弱点を作り直す
 *      npx tsx --env-file=.env.local scripts/rebuild-weaknesses.ts --apply
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { adminDb } from "../src/lib/firebase/admin";
import {
  judgeSentences,
  type SentenceCheckResult,
} from "../src/lib/essay/sentence-check-judge";
import { withSentenceCheckIssues } from "../src/lib/essay/review-core";

const APPLY = process.argv.includes("--apply");
const ONLY_NAMES = (
  process.argv.find((a) => a.startsWith("--name="))?.slice("--name=".length) ??
  ""
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const CACHE = ".claude/sentence-check-backfill.json";
const CONCURRENCY = 4;

type Cache = Record<string, { uid: string; result: SentenceCheckResult }>;

async function main() {
  const db = adminDb;
  if (!db) throw new Error("Firestore に接続できません");

  if (APPLY) {
    if (!existsSync(CACHE))
      throw new Error(`${CACHE} がありません。先に点検を実行してください`);
    const cache: Cache = JSON.parse(readFileSync(CACHE, "utf8"));
    const ids = Object.keys(cache);
    for (let i = 0; i < ids.length; i += 400) {
      const batch = db.batch();
      for (const id of ids.slice(i, i + 400)) {
        batch.set(
          db.doc(`essays/${id}`),
          {
            sentenceCheck: {
              ...cache[id].result,
              checkedAt: new Date().toISOString(),
              source: "backfill",
            },
          },
          { merge: true }
        );
      }
      await batch.commit();
    }
    console.log(`書き込んだ答案: ${ids.length}件`);
    return;
  }

  const users = await db
    .collection("users")
    .where("role", "==", "student")
    .get();
  const targets = users.docs.filter((u) => {
    if (ONLY_NAMES.length === 0) return true;
    const name = String(u.data().displayName ?? u.data().name ?? "");
    return ONLY_NAMES.some((n) => name.includes(n));
  });

  const jobs: {
    id: string;
    uid: string;
    name: string;
    text: string;
    repeatedIssues: never[];
  }[] = [];
  for (const u of targets) {
    const essays = await db
      .collection("essays")
      .where("userId", "==", u.id)
      .get();
    for (const d of essays.docs) {
      const e = d.data();
      if (!e.scores || !e.feedback || e.sentenceCheck) continue;
      const text = String(e.ocrText ?? "").trim();
      if (!text) continue;
      jobs.push({
        id: d.id,
        uid: u.id,
        name: String(u.data().displayName ?? u.data().name ?? u.id),
        text,
        repeatedIssues: e.feedback.repeatedIssues ?? [],
      });
    }
  }
  console.log(`点検する答案: ${jobs.length}件`);

  const client = new Anthropic();
  const cache: Cache = {};
  const perStudent = new Map<
    string,
    { essays: number; withIssue: number; broken: number }
  >();
  let failed = 0;
  let next = 0;
  async function worker() {
    while (next < jobs.length) {
      const job = jobs[next++];
      const result = await judgeSentences({ client, essayText: job.text });
      if (!result) {
        failed++;
        continue;
      }
      cache[job.id] = { uid: job.uid, result };
      const added =
        withSentenceCheckIssues(job.repeatedIssues, result).length >
        job.repeatedIssues.length;
      const s = perStudent.get(job.name) ?? {
        essays: 0,
        withIssue: 0,
        broken: 0,
      };
      s.essays++;
      s.broken += result.brokenSentences.length;
      if (added) s.withIssue++;
      perStudent.set(job.name, s);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  writeFileSync(CACHE, JSON.stringify(cache, null, 1));
  for (const [name, s] of perStudent) {
    console.log(
      `■ ${name}  答案${s.essays}件 / 崩れた文 計${s.broken}文 / 弱点が積まれる答案 ${s.withIssue}件`
    );
  }
  console.log(`失敗: ${failed}件（書き込まない。再実行で点検し直す）`);
  console.log(`結果: ${CACHE}（--apply で書き込む）`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
