/**
 * 既存の出願書類本文から、フレームワーク見出し（「結論（Point）」等）を除去する
 * 一度きりのマイグレーション。PR #45 で新規/編集分は見出しなしになったが、
 * それ以前に保存された本文には見出しが残っているため、それを一括で綺麗にする。
 *
 * 安全策:
 * - dry-run がデフォルト（--write を付けたときだけ書き込む）。
 * - 元本文は contentBackup に退避（初回のみ・冪等）。問題があれば戻せる。
 * - フレームワークの全見出しが「出現順どおりに」含まれる場合のみ対象（誤検出防止）。
 * - wizardState.sections も再構築するので、ウィザード再開時の分割も維持される。
 *
 * 実行:
 *   tsx scripts/strip-document-headings.ts           # dry-run（変更しない・対象を表示）
 *   tsx scripts/strip-document-headings.ts --write   # 適用
 */
import { config } from "dotenv";
import { resolve } from "path";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { FRAMEWORKS } from "../src/lib/templates/frameworks";

config({ path: resolve(process.cwd(), ".env.local") });

const args = process.argv.slice(2);
const isWrite = args.includes("--write");

if (getApps().length === 0) {
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  if (privateKey && clientEmail && projectId) {
    initializeApp({ credential: cert({ projectId, privateKey, clientEmail }) });
  } else if (projectId) {
    initializeApp({ projectId });
  } else {
    console.error("認証情報なし: .env.local を確認してください");
    process.exit(1);
  }
}

const db = getFirestore();

type Framework = (typeof FRAMEWORKS)[number];

/**
 * content にフレームワークの全見出しが出現順に含まれていれば、見出しを除いた本文と
 * セクション配列を返す。含まれない/順序が違う場合は null（対象外）。
 */
function stripHeadings(content: string, framework: Framework) {
  const positions = framework.sections.map((s) => ({
    id: s.id,
    title: s.title,
    idx: content.indexOf(s.title),
  }));
  if (!positions.every((p) => p.idx >= 0)) return null;
  // 見出しが定義順どおりに並んでいること（本文中の偶然の一致を弾く）
  for (let i = 1; i < positions.length; i++) {
    if (positions[i].idx <= positions[i - 1].idx) return null;
  }
  const sections = positions.map((p, i) => {
    const start = p.idx + p.title.length;
    const end = i + 1 < positions.length ? positions[i + 1].idx : content.length;
    return { id: p.id, content: content.slice(start, end).replace(/^\n+|\n+$/g, "") };
  });
  const newContent = sections
    .map((s) => s.content)
    .filter((c) => c.trim())
    .join("\n\n");
  return { newContent, sections };
}

async function main() {
  const snap = await db.collection("documents").get();
  console.log(`documents: ${snap.size} 件を走査\n`);

  let target = 0;
  let alreadyClean = 0;
  let empty = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const content: string = data.content ?? "";
    if (!content.trim()) {
      empty++;
      continue;
    }

    // wizardState.frameworkType があればそれを優先し、無ければ全フレームワークを試す
    const fwType: string | undefined = data.wizardState?.frameworkType;
    const candidates = fwType ? FRAMEWORKS.filter((f) => f.type === fwType) : FRAMEWORKS;

    let hit: { fw: Framework; result: NonNullable<ReturnType<typeof stripHeadings>> } | null = null;
    for (const fw of candidates.length ? candidates : FRAMEWORKS) {
      const result = stripHeadings(content, fw);
      if (result) {
        hit = { fw, result };
        break;
      }
    }
    if (!hit) {
      alreadyClean++;
      continue;
    }

    target++;
    const label = `${data.universityName ?? "?"} ${data.type ?? ""}`.trim();
    const before = content.replace(/\n/g, " ").slice(0, 70);
    const after = hit.result.newContent.replace(/\n/g, " ").slice(0, 70);
    console.log(`[${doc.id}] ${label}（${hit.fw.name}）`);
    console.log(`  before: ${before}${content.length > 70 ? "…" : ""}`);
    console.log(`  after : ${after}${hit.result.newContent.length > 70 ? "…" : ""}`);

    if (isWrite) {
      const update: Record<string, unknown> = {
        content: hit.result.newContent,
        wordCount: hit.result.newContent.length,
        wizardState: { ...(data.wizardState ?? {}), sections: hit.result.sections },
      };
      // 元本文は初回のみ退避（再実行しても上書きしない＝冪等）
      if (data.contentBackup === undefined) update.contentBackup = content;
      await doc.ref.update(update);
      console.log("  -> 更新しました");
    }
    console.log("");
  }

  console.log(
    `\n対象: ${target} 件 / 見出しなし・対象外: ${alreadyClean} 件 / 本文空: ${empty} 件`,
  );
  console.log(
    isWrite
      ? "適用しました（--write）。元本文は各書類の contentBackup に退避しています。"
      : "dry-run（変更なし）。問題なければ --write を付けて再実行してください。",
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
