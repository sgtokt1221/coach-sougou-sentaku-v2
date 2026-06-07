import Anthropic from "@anthropic-ai/sdk";
import { adminDb } from "@/lib/firebase/admin";
import {
  buildResearchEvalSystemPrompt,
  buildMockResearchEval,
  type ResearchEvalResult,
  type ResearchScores,
} from "@/lib/ai/prompts/research";

/**
 * 自己探究授業「生徒が教える」発表の多モーダル講評コア。
 * 生徒画面(自己録音)と講師画面(その場録音)の両方から使う共通ロジック。
 * 同意・権限チェックは呼び出し側(route)の責務。ここでは評価と保存のみ行う。
 */

export interface ResearchAttachment {
  /** base64 (data URL でなく生データ部分) */
  dataBase64: string;
  /** image/jpeg | image/png 等 */
  mediaType: string;
}

export interface ResearchEvaluateBody {
  topic?: string;
  audioBase64?: string;
  mimeType?: string;
  transcriptText?: string;
  attachments?: ResearchAttachment[];
  /** 生徒がアップロードした資料画像の URL（Storage ダウンロードURL）。サーバで取得して評価に含める */
  attachmentUrls?: string[];
  sourceUrls?: string[];
  previousNextItems?: string[];
}

/** 画像URLを取得して base64＋mediaType に変換する（失敗は null） */
async function fetchImageAsBase64(
  url: string,
): Promise<{ dataBase64: string; mediaType: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "image/jpeg";
    if (!ct.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return { dataBase64: buf.toString("base64"), mediaType: ct.split(";")[0] };
  } catch {
    return null;
  }
}

export interface RunResearchEvaluationArgs {
  /** 評価対象（提出者）の生徒 uid。保存先 users/{studentUid}/researchSessions */
  studentUid: string;
  body: ResearchEvaluateBody;
  /** 紐付ける面談セッション ID（カレンダーのセッション）。任意 */
  sessionId?: string;
  /** 誰が評価を実行したか */
  evaluatedBy: "student" | "teacher";
}

export interface RunResearchEvaluationResult {
  id: string;
  transcript: string;
  feedback: ResearchEvalResult;
  nextItems: string[];
}

const MAX_ATTACHMENTS = 6;

async function transcribe(audioBase64: string, mimeType: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return "";
  const buf = Buffer.from(audioBase64, "base64");
  const form = new FormData();
  form.append("file", new Blob([buf], { type: mimeType || "audio/webm" }), "rec.webm");
  form.append("model", "whisper-1");
  form.append("language", "ja");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Whisper error ${res.status}`);
  const data = (await res.json()) as { text?: string };
  return data.text ?? "";
}

/** 0-10 の整数にクランプ。未指定/NaN は 0。 */
function clampScore(v: unknown): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 0;
  return Math.min(10, Math.max(0, n));
}

function parseScores(raw: unknown): ResearchScores | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const s = raw as Record<string, unknown>;
  return {
    clarity: clampScore(s.clarity),
    depth: clampScore(s.depth),
    materials: clampScore(s.materials),
    sources: clampScore(s.sources),
    initiative: clampScore(s.initiative),
  };
}

function parseEval(raw: string): ResearchEvalResult {
  const m = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/(\{[\s\S]*\})/);
  if (!m) throw new Error(`講評のパースに失敗: ${raw.slice(0, 200)}`);
  const p = JSON.parse(m[1]);
  return {
    good: p.good ?? "",
    improve: p.improve ?? "",
    nextQuestion: p.nextQuestion ?? "",
    curriculumItems: Array.isArray(p.curriculumItems) ? p.curriculumItems : [],
    materialConsistency: p.materialConsistency ?? "",
    sourceReliability: p.sourceReliability ?? "",
    scores: parseScores(p.scores),
  };
}

/**
 * 発表を評価して users/{studentUid}/researchSessions に保存する。
 * 戻り値に保存ドキュメント ID・文字起こし・講評・次回やること を返す。
 * @throws 録音/資料が無い場合、または adminDb 未設定時
 */
export async function runResearchEvaluation(
  args: RunResearchEvaluationArgs
): Promise<RunResearchEvaluationResult> {
  const { studentUid, body, sessionId, evaluatedBy } = args;
  if (!adminDb) throw new Error("サーバー設定エラー");

  const topic = (body.topic ?? "").trim();
  const attachments = (body.attachments ?? []).slice(0, MAX_ATTACHMENTS);

  // 生徒がアップロードした画像URLを取得して base64 化し attachments に合流
  const urls = (body.attachmentUrls ?? []).slice(0, MAX_ATTACHMENTS - attachments.length);
  for (const u of urls) {
    const img = await fetchImageAsBase64(u);
    if (img) attachments.push(img);
  }

  // 1) 文字起こし（録音があれば優先）
  let transcript = (body.transcriptText ?? "").trim();
  if (body.audioBase64) {
    try {
      const t = await transcribe(body.audioBase64, body.mimeType ?? "audio/webm");
      if (t) transcript = t;
    } catch (e) {
      console.error("transcribe failed:", e);
    }
  }
  if (!transcript && attachments.length === 0) {
    throw new Error("録音または資料のいずれかが必要です。");
  }

  // 2) 多モーダル講評（API キーが無ければモック）
  let feedback: ResearchEvalResult;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    feedback = buildMockResearchEval(topic || "探究テーマ");
  } else {
    const client = new Anthropic();
    const userContent: Anthropic.MessageParam["content"] = [];
    for (const a of attachments) {
      userContent.push({
        type: "image",
        source: {
          type: "base64",
          media_type: a.mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
          data: a.dataBase64,
        },
      });
    }
    const textParts = [
      `【探究テーマ】${topic || "(未設定)"}`,
      `【発表の文字起こし】\n${transcript || "(録音なし)"}`,
    ];
    if (body.sourceUrls && body.sourceUrls.length > 0) {
      textParts.push(`【出典URL】\n${body.sourceUrls.join("\n")}`);
    }
    if (body.previousNextItems && body.previousNextItems.length > 0) {
      textParts.push(`【前回の次回やること】\n${body.previousNextItems.join("\n")}`);
    }
    userContent.push({ type: "text", text: textParts.join("\n\n") });

    const resp = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: buildResearchEvalSystemPrompt(),
      messages: [{ role: "user", content: userContent }],
    });
    const raw = resp.content[0]?.type === "text" ? resp.content[0].text : "";
    feedback = parseEval(raw);
  }

  // 3) 保存（users/{studentUid}/researchSessions）
  const docRef = await adminDb
    .collection("users")
    .doc(studentUid)
    .collection("researchSessions")
    .add({
      topic,
      transcript,
      attachmentsCount: attachments.length,
      sourceUrls: body.sourceUrls ?? [],
      feedback,
      nextItems: feedback.curriculumItems,
      sessionId: sessionId ?? null,
      evaluatedBy,
      createdAt: new Date(),
    });

  return {
    id: docRef.id,
    transcript,
    feedback,
    nextItems: feedback.curriculumItems,
  };
}
