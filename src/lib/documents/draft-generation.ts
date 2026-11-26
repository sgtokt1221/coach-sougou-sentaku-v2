/**
 * 書類の AI 下書きを作る処理（2026-11-26 に2つのルートから切り出した）。
 *
 * - 自己分析から書く: /api/documents/generate-statement（4段の構造で書く）
 * - 型で書く: /api/documents/generate-draft（選んだフレームワークの段で書く）
 * - 別の案: /api/documents/[id]/alternative が、保存した生成条件で同じ処理を呼び、
 *   前の案と理由を足して書き直させる
 *
 * どれも Firestore には書かない（保存は画面か呼び出し側）。
 */
import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { adminDb } from "@/lib/firebase/admin";
import {
  buildAlternativeRule,
  buildStatementDraftPrompt,
  normalizeSelfAnalysisData,
  type AlternativeReason,
  type SelfAnalysisData,
} from "@/lib/ai/prompts/statement";
import { buildTemplateDraftPrompt } from "@/lib/ai/prompts/template-draft";
import {
  fitStatementToTarget,
  joinStatementStructure,
} from "@/lib/documents/statement-length";
import { charRangeFor, fitToCharRange } from "@/lib/ai/fit-char-limit";
import { StatementDraftOutputSchema } from "@/lib/ai/schemas/statement";
import { TemplateDraftOutputSchema } from "@/lib/ai/schemas/template-draft";
import { prepareAdmissionPolicy } from "@/lib/ai/admission-policy";
import {
  AI_MODEL_STATEMENT_DRAFT,
  AI_PROMPT_VERSIONS,
  selectDraftModel,
} from "@/lib/ai/prompt-versions";
import {
  loadActivityContexts,
  loadStudentDocumentContext,
} from "@/lib/documents/student-context";
import type { AiGenerationMetadata } from "@/lib/types/ai";
import type {
  FrameworkDefinition,
  DraftGenerateResponse,
} from "@/lib/types/template";
import { loadFacultyInfo, type FacultyInfoItem } from "@/lib/universities/faculty-info";

export type { AlternativeReason };

/** 前の案と、作り直す理由。別の案を作るときだけ渡す */
export interface AlternativeRequest {
  reason: AlternativeReason;
  previousDraft: string;
}

/** 入力の誤り（大学・学部が無い等）。ルートが status をそのまま返す */
export class DraftInputError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

/** 構造化応答が壊れていた（max_tokens 等）。ルートは 502 / 500 で返す */
export class DraftOutputError extends Error {}

export interface UniversityFaculty {
  universityName: string;
  facultyName: string;
  admissionPolicy: string;
  /** 公式サイトで確かめた学部の特色。まだ調べていない学部は空 */
  facultyInfo: FacultyInfoItem[];
}

export async function loadUniversityFaculty(
  universityId: string,
  facultyId: string,
  fallback?: { universityName?: string; facultyName?: string }
): Promise<UniversityFaculty> {
  if (!adminDb) throw new DraftInputError("データベース接続エラー", 500);
  const [snap, facultyInfo] = await Promise.all([
    adminDb.doc(`universities/${universityId}`).get(),
    loadFacultyInfo(universityId, facultyId),
  ]);
  const data = snap.exists ? snap.data() : null;
  if (!data) throw new DraftInputError("大学が見つかりません", 404);
  const faculties = Array.isArray(data.faculties)
    ? (data.faculties as Array<{
        id?: string;
        name?: string;
        admissionPolicy?: string;
      }>)
    : [];
  const faculty = faculties.find((item) => item.id === facultyId);
  if (!faculty) throw new DraftInputError("学部が見つかりません", 404);
  return {
    universityName:
      typeof data.name === "string"
        ? data.name
        : (fallback?.universityName ?? "志望大学"),
    facultyName:
      typeof faculty.name === "string"
        ? faculty.name
        : (fallback?.facultyName ?? "学部"),
    admissionPolicy: prepareAdmissionPolicy(faculty.admissionPolicy).text,
    facultyInfo,
  };
}

// ---------------------------------------------------------------- 自己分析から書く

export interface StatementDraftResult {
  draft: string;
  structure: {
    intro: string;
    body: string;
    strengths: string;
    conclusion: string;
  };
  improvementSuggestions: string[];
  aiMetadata: AiGenerationMetadata;
  /** 字数が目標を超えたときなどの知らせ */
  notice?: string;
}

export interface StatementMaterial extends UniversityFaculty {
  selfAnalysis: SelfAnalysisData;
  activities: Awaited<ReturnType<typeof loadActivityContexts>>;
}

export async function loadStatementMaterial(
  uid: string,
  universityId: string,
  facultyId: string
): Promise<StatementMaterial> {
  if (!adminDb) throw new DraftInputError("データベース接続エラー", 500);
  const uf = await loadUniversityFaculty(universityId, facultyId);
  // 現行の保存先を優先し、旧形式のサブコレクションも後方互換で読む。
  let selfAnalysisDoc = await adminDb.doc(`selfAnalysis/${uid}`).get();
  if (!selfAnalysisDoc.exists) {
    selfAnalysisDoc = await adminDb
      .doc(`users/${uid}/selfAnalysis/current`)
      .get();
  }
  const selfAnalysis = normalizeSelfAnalysisData(
    selfAnalysisDoc.exists ? selfAnalysisDoc.data() : null
  );
  /**
   * 活動実績。以前は自己分析だけで志望理由書を書かせていたため、
   * 生徒が登録した具体的な場面や数値が下書きに一切入らなかった。
   */
  const activities = await loadActivityContexts(uid);
  return { ...uf, selfAnalysis, activities };
}

export async function writeStatementDraft(
  client: Anthropic,
  material: StatementMaterial,
  options: {
    targetWordCount: number;
    emphasis: string;
    documentType: string;
    /** 生徒が調べて書いた、この大学・学部のこと（任意） */
    universityResearch?: string;
    alternative?: AlternativeRequest;
  }
): Promise<StatementDraftResult> {
  const target = options.targetWordCount || 800;
  const prompt =
    buildStatementDraftPrompt(
      material.universityName,
      material.facultyName,
      material.admissionPolicy,
      material.selfAnalysis,
      target,
      material.activities,
      options.emphasis,
      options.documentType,
      options.universityResearch ?? "",
      material.facultyInfo
    ) +
    (options.alternative
      ? `\n\n${buildAlternativeRule(options.alternative)}`
      : "");
  const response = await client.messages.parse({
    model: AI_MODEL_STATEMENT_DRAFT,
    // 拡張思考が有効なモデルでは max_tokens を thinking と本文で分け合う。
    // 4096 だと思考だけで使い切って本文が0トークンになり、
    // parsed_output が空のまま stop_reason=max_tokens で失敗していた。
    max_tokens: 16384,
    system: prompt,
    messages: [
      {
        role: "user",
        content: "reference_dataに基づいて志望理由書を生成してください。",
      },
    ],
    output_config: {
      format: zodOutputFormat(StatementDraftOutputSchema),
      // 拡張思考を使わせない。思考が max_tokens を食うと本文が途中で切れ、
      // 構造化出力のJSONパースに失敗して生成ごと落ちていた（実測で thinking 0tok・15秒）。
      effort: "low",
    },
  });
  if (response.stop_reason === "max_tokens" || !response.parsed_output) {
    // usage には thinking の内訳も入る（max_tokens を思考で使い切ったかの判別用）
    console.error("[generate-statement] 構造化応答が不正", {
      stop_reason: response.stop_reason,
      usage: response.usage,
    });
    throw new DraftOutputError("Claude APIの構造化応答が不正です");
  }

  const limit = Math.round(target);
  // 生徒が設定した字数の90〜100%に合わせる（超えれば縮め、足りなければ伸ばす）
  const structure = await fitStatementToTarget(
    client,
    { ...response.parsed_output.structure },
    target,
    options.emphasis,
    options.documentType,
    AI_MODEL_STATEMENT_DRAFT
  );
  const draft = joinStatementStructure(structure);
  /**
   * それでも上限を超えたときは、下書きを捨てずに知らせて返す。
   * 以前はここで例外にしており、生成した下書きごと失われて 500 になっていた
   * （2026-10-09 本番。生徒は何も受け取れない）。超えた分は生徒が削れる。
   */
  const notice =
    draft.length > limit
      ? `目標${target}字に対して${draft.length}字あります。${draft.length - target}字ほど削ってください。`
      : undefined;
  return {
    notice,
    draft,
    structure,
    improvementSuggestions: response.parsed_output.improvementSuggestions,
    aiMetadata: {
      ...AI_PROMPT_VERSIONS.statementDraft,
      model: AI_MODEL_STATEMENT_DRAFT,
    },
  };
}

/** 開発環境のモック（AI を呼ばない）。別の案のときは前の案と見分けられる印を付ける */
export function mockStatementDraft(
  material: StatementMaterial,
  alternative?: AlternativeRequest
): StatementDraftResult {
  const { universityName, facultyName, admissionPolicy, selfAnalysis } =
    material;
  const value = selfAnalysis.values[0] || "【大切にしている価値観を入力】";
  const strength = selfAnalysis.strengths[0] || "【自分の強みを入力】";
  const experience =
    selfAnalysis.experiences[0] || "【関心を持った原体験を入力】";
  const vision = selfAnalysis.vision || "【将来実現したいことを入力】";
  const apConnection = selfAnalysis.apConnection
    ? selfAnalysis.apConnection
    : admissionPolicy
      ? "【自分の経験とAPの接点を入力】"
      : "【AP確認後に接続を書く】";
  const mark = alternative ? `（別の案: ${alternative.reason}）` : "";
  const structure = {
    intro: `${mark}私は${value}を大切にしている。${experience}を振り返る中で、${facultyName.replace("学部", "")}分野への関心を持った。`,
    body: `${universityName}${facultyName}で、【大学で探究したい問いを入力】に取り組みたい。${apConnection}。`,
    strengths: `${strength}を、${selfAnalysis.experiences[0] ? "上記の経験" : "【強みが表れた経験を入力】"}で培ってきた。この強みを大学でどのように生かすか、【具体的な行動を入力】。`,
    conclusion: `大学での学びを通じて、${vision}。そのために、【入学後の行動計画を入力】。`,
  };
  return {
    draft: joinStatementStructure(structure),
    structure,
    improvementSuggestions: [
      "【】内を、実際の経験と自分の言葉で埋めてください。",
      "大学固有の授業・研究内容は、公式情報を確認してから追加してください。",
    ],
    aiMetadata: {
      ...AI_PROMPT_VERSIONS.statementDraft,
      model: "development-mock",
    },
  };
}

// ---------------------------------------------------------------- 型で書く

export interface TemplateMaterial extends UniversityFaculty {
  selfAnalysis: Awaited<
    ReturnType<typeof loadStudentDocumentContext>
  >["selfAnalysis"];
  activities: Awaited<
    ReturnType<typeof loadStudentDocumentContext>
  >["activities"];
}

export async function loadTemplateMaterial(
  uid: string,
  universityId: string,
  facultyId: string,
  activityIds: string[] | null,
  fallback?: { universityName?: string; facultyName?: string }
): Promise<TemplateMaterial> {
  /**
   * 生徒の材料。以前は活動実績しか読んでおらず、自己分析は見ていなかった。
   * 隣の generate-statement はその逆で、どちらのボタンを押しても材料が
   * 半分しか使われていなかったので、両方を同じローダーから読む。
   */
  const { selfAnalysis, activities } = await loadStudentDocumentContext(
    uid,
    activityIds
  );
  const uf = await loadUniversityFaculty(universityId, facultyId, fallback);
  return { ...uf, selfAnalysis, activities };
}

export async function writeTemplateDraft(
  client: Anthropic,
  material: TemplateMaterial,
  options: {
    framework: FrameworkDefinition;
    frameworkType: string;
    documentType: string;
    targetWordCount: number;
    emphasis: string;
    /** 生徒が調べて書いた、この大学・学部のこと（任意） */
    universityResearch?: string;
    alternative?: AlternativeRequest;
  }
): Promise<DraftGenerateResponse> {
  const { framework, emphasis } = options;
  const generationModel = selectDraftModel(options.documentType);
  const systemPrompt =
    buildTemplateDraftPrompt(
      framework,
      material.universityName,
      material.facultyName,
      material.admissionPolicy,
      options.documentType,
      options.targetWordCount || 800,
      material.activities,
      material.selfAnalysis,
      emphasis,
      options.universityResearch ?? "",
      material.facultyInfo
    ) +
    (options.alternative
      ? `\n\n${buildAlternativeRule(options.alternative)}`
      : "");

  const message = await client.messages.parse({
    model: generationModel,
    // 拡張思考が有効なモデルでは max_tokens を thinking と本文で分け合う。
    // 4096 だと思考だけで使い切って本文が0トークンになり生成が失敗する。
    max_tokens: 16384,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: "reference_dataに基づいて下書きを生成してください。",
      },
    ],
    output_config: {
      format: zodOutputFormat(TemplateDraftOutputSchema),
      // 拡張思考を使わせない。思考が max_tokens を食うと本文が途中で切れ、
      // 構造化出力のJSONパースに失敗して生成ごと落ちる。
      effort: "low",
    },
  });

  if (message.stop_reason === "max_tokens" || !message.parsed_output) {
    // usage には thinking の内訳も入る（max_tokens を思考で使い切ったかの判別用）
    console.error("[generate-draft] 構造化応答が不正", {
      stop_reason: message.stop_reason,
      usage: message.usage,
    });
    throw new DraftOutputError("AIからの応答を検証できませんでした");
  }

  const sectionsById = new Map(
    message.parsed_output.sections.map((section) => [section.id, section])
  );
  /**
   * 各段の本文を、生徒が設定した字数に合わせる。
   * 段ごとに目安（設定字数を段の数で割った字数）の90〜100%に収め、足りなければ
   * 事実を足さずに考えを展開して伸ばし、超えていれば縮める。
   * 以前は本文を返さず骨子（要素と問い）だけを返し、本人が書く形にしていた。
   */
  const target = options.targetWordCount || 800;
  const perSection = target / Math.max(1, framework.sections.length);
  const { min, max } = charRangeFor(perSection);
  const sections = await Promise.all(
    framework.sections.map(async (s) => {
      const generated = sectionsById.get(s.id);
      const raw = (generated?.text ?? "").trim();
      const content = raw
        ? await fitToCharRange(
            client,
            raw,
            min,
            max,
            emphasis
              ? `${s.title}（${s.description}）。生徒の希望（この方向で書く）: ${emphasis}`
              : `${s.title}（${s.description}）`,
            generationModel
          )
        : "";
      return {
        id: s.id,
        title: generated?.title || s.title,
        content,
        placeholder: `【${s.guidingQuestion}】\n${s.placeholder ?? "ここに記入してください。"}`,
      };
    })
  );
  const draft = sections
    .map((s) => s.content.trim())
    .filter(Boolean)
    .join("\n\n");

  return {
    draft,
    frameworkType: options.frameworkType,
    sections,
    wordCount: draft.length,
    aiMetadata: {
      ...AI_PROMPT_VERSIONS.templateDraft,
      model: generationModel,
    },
  } as DraftGenerateResponse;
}
