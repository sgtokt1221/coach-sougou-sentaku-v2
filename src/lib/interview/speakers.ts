/**
 * 集団討論(group_discussion)モードの話者定義と解析ユーティリティ。
 *
 * Claude は本文の先頭に【司会】【佐藤教授】【受験生A(健太)】などの接頭辞を
 * 付けて返答するよう指示されている。ここではその接頭辞を
 * - 解析して話者を特定
 * - 話者ごとのTTS voice・UIカラー・アイコンを返す
 * 役割を担う。
 */

/** OpenAI TTS がサポートする voice */
export type TtsVoice =
  | "alloy"
  | "echo"
  | "fable"
  | "onyx"
  | "nova"
  | "shimmer";

export type SpeakerRole =
  | "moderator" // 司会
  | "professor_logic" // 論理派の面接官(佐藤教授)
  | "professor_practical" // 実践派の面接官(田中准教授)
  | "peer_bold" // 他受験生: 積極的・仕切り役(健太)
  | "peer_careful" // 他受験生: 慎重・データ派(美咲)
  | "peer_creative" // 他受験生: 独創的・発想豊か(翔太)
  | "unknown";

export interface SpeakerProfile {
  role: SpeakerRole;
  /** 表示名（チャットUIのアバター横） */
  displayName: string;
  /** 冒頭の接頭辞 (例: "司会", "佐藤教授") */
  prefix: string;
  /** OpenAI TTS voice */
  voice: TtsVoice;
  /** Tailwindカラー(背景・枠・テキスト) */
  colorClass: string;
  /** アバター1文字 */
  avatar: string;
  /** 簡潔な役割説明 */
  description: string;
}

/**
 * GD で登場する話者プロフィール一覧。
 * Claude プロンプト・チャットUI・TTS で共通参照する単一の真実の源 (SSOT)。
 */
export const GD_SPEAKERS: Record<Exclude<SpeakerRole, "unknown">, SpeakerProfile> = {
  moderator: {
    role: "moderator",
    displayName: "司会",
    prefix: "司会",
    voice: "nova",
    colorClass:
      "bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-900/40 dark:text-slate-200 dark:border-slate-700",
    avatar: "司",
    description: "討論を進行し、テーマの提示とまとめを担当",
  },
  professor_logic: {
    role: "professor_logic",
    displayName: "佐藤教授",
    prefix: "佐藤教授",
    voice: "onyx",
    colorClass:
      "bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-800",
    avatar: "佐",
    description: "論理性・厳密さを重視する面接官",
  },
  professor_practical: {
    role: "professor_practical",
    displayName: "田中准教授",
    prefix: "田中准教授",
    voice: "echo",
    colorClass:
      "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800",
    avatar: "田",
    description: "実践的・社会的視点を重視する面接官",
  },
  peer_bold: {
    role: "peer_bold",
    displayName: "健太",
    prefix: "受験生A",
    voice: "fable",
    colorClass:
      "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800",
    avatar: "健",
    description: "他受験生: 積極的でリーダーシップ型",
  },
  peer_careful: {
    role: "peer_careful",
    displayName: "美咲",
    prefix: "受験生B",
    voice: "shimmer",
    colorClass:
      "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800",
    avatar: "美",
    description: "他受験生: データや根拠を重視する慎重派",
  },
  peer_creative: {
    role: "peer_creative",
    displayName: "翔太",
    prefix: "受験生C",
    voice: "alloy",
    colorClass:
      "bg-violet-100 text-violet-900 border-violet-300 dark:bg-violet-950/40 dark:text-violet-200 dark:border-violet-800",
    avatar: "翔",
    description: "他受験生: 独創的で発想豊かな視点",
  },
};

/**
 * 個人面接など GD 以外のモードで使う単一の面接官プロフィール。
 */
export const DEFAULT_INTERVIEWER: SpeakerProfile = {
  role: "unknown",
  displayName: "面接官",
  prefix: "面接官",
  voice: "alloy",
  colorClass: "bg-muted text-foreground border-border",
  avatar: "官",
  description: "面接官",
};

/**
 * 発言の冒頭から話者を抽出する。
 *
 * 許容フォーマット:
 *   【司会】テーマは...
 *   【佐藤教授】それについて...
 *   【受験生A(健太)】私は...
 *   【受験生B・美咲】逆に...
 *   【健太】...         ← 受験生の通称のみ
 *
 * 認識できない場合は null を返す。
 */
export function parseSpeaker(content: string): {
  profile: SpeakerProfile;
  /** 接頭辞を取り除いた本文 */
  body: string;
} | null {
  // 全角/半角の【】どちらでも拾う
  const match = content.match(/^\s*[【\[]([^】\]]+)[】\]]\s*([\s\S]*)$/);
  if (!match) return null;

  const label = match[1].trim();
  const body = match[2].trim();

  for (const profile of Object.values(GD_SPEAKERS)) {
    // prefix or displayName のどちらかがラベルに含まれていれば採用
    if (
      label === profile.prefix ||
      label === profile.displayName ||
      label.includes(profile.displayName) ||
      label.includes(profile.prefix)
    ) {
      return { profile, body };
    }
  }

  return null;
}

/**
 * 発言を解析し、話者プロフィールと本文を返す。
 * GDモードでは話者を特定できる接頭辞を期待する。
 * 特定できない場合はフォールバックとして defaultProfile を返す。
 */
export function resolveSpeaker(
  content: string,
  defaultProfile: SpeakerProfile = DEFAULT_INTERVIEWER,
): { profile: SpeakerProfile; body: string } {
  const parsed = parseSpeaker(content);
  if (parsed) return parsed;
  return { profile: defaultProfile, body: content };
}

export interface Utterance {
  profile: SpeakerProfile;
  body: string;
}

/**
 * メッセージ内の 【話者名】本文 ブロックを話者ごとに分解する。
 * 導入フェーズでの連続自己紹介や教員の連続コメントなど、複数人の発話を含むケース向け。
 *
 * - 接頭辞が見つからない場合は 1 要素の配列 (defaultProfile) を返す
 * - 空 body は除外する
 */
export function splitIntoUtterances(
  content: string,
  defaultProfile: SpeakerProfile = DEFAULT_INTERVIEWER,
): Utterance[] {
  const bracketPattern = /[【\[]([^】\]]+)[】\]]/g;
  const marks: Array<{ start: number; labelEnd: number; label: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = bracketPattern.exec(content)) !== null) {
    marks.push({
      start: m.index,
      labelEnd: m.index + m[0].length,
      label: m[1].trim(),
    });
  }

  if (marks.length === 0) {
    const trimmed = content.trim();
    return trimmed.length > 0
      ? [{ profile: defaultProfile, body: trimmed }]
      : [];
  }

  const result: Utterance[] = [];

  // 先頭に接頭辞なしの地の文があれば default として先頭に追加
  if (marks[0].start > 0) {
    const preface = content.slice(0, marks[0].start).trim();
    if (preface) {
      result.push({ profile: defaultProfile, body: preface });
    }
  }

  for (let i = 0; i < marks.length; i++) {
    const current = marks[i];
    const nextStart = i + 1 < marks.length ? marks[i + 1].start : content.length;
    const body = content.slice(current.labelEnd, nextStart).trim();
    if (!body) continue;

    const profile =
      Object.values(GD_SPEAKERS).find(
        (p) =>
          current.label === p.prefix ||
          current.label === p.displayName ||
          current.label.includes(p.displayName) ||
          current.label.includes(p.prefix),
      ) ?? defaultProfile;

    result.push({ profile, body });
  }

  return result;
}
