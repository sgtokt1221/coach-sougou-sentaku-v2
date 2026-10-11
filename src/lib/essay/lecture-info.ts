import { getThemeById, type EssayTheme } from "@/data/essay-themes";
import { getPastQuestionById } from "@/data/essay-past-questions";
import { getTedTranscript } from "@/data/ted-transcripts";

/*
 * サーバー専用。書き起こしを読み込むため、画面（クライアントコンポーネント）
 * から import しないこと。埋め込みURLだけが要るときは ted-embed.ts を使う。
 */

type TedTalk = NonNullable<EssayTheme["tedTalk"]>;

/**
 * 講義型（TED）の出題資料を、採点AIへ渡す1つの文字列に組み立てる。
 *
 * 採点AIに動画は見えない。タイトル・講演者・時間だけを渡していたころは、
 * 「講義の主張を踏まえたか」をモデルの記憶で判定するしかなかった。
 * 講演の中身は書き起こし（日本語字幕）の原文を渡す。要約を挟むと、
 * 「講演がそう言ったか」を要約の精度が決めてしまう。
 *
 * 書き起こしが無い講演では、講義情報だけを返す。採点側はそのとき
 * 「講演の中身は与えられていない」ものとして扱う（プロンプト側で規定）。
 */
export function buildTedLectureInfo(ted: TedTalk): string {
  const head = [
    `講義タイトル: ${ted.title}`,
    `講演者: ${ted.speaker}`,
    `講義時間: ${ted.durationMinutes}分`,
  ];
  const transcript = getTedTranscript(ted.talkId);
  if (!transcript) return head.join("\n");
  return [
    ...head,
    "",
    "以下はこの講演の書き起こし（日本語字幕）です。答案が講演を踏まえているかは、この本文だけを根拠に判断してください。",
    "<lecture_transcript>",
    transcript,
    "</lecture_transcript>",
  ].join("\n");
}

/** 出題元。答案の questionContext にも同じ名前で保存している */
export interface QuestionSourceIds {
  themeId?: string | null;
  pastQuestionId?: string | null;
}

/**
 * 出題元（テーマ・過去問）から、AI に渡す出題資料を引き直す。
 *
 * TED の書き起こしは答案に保存しない（1本5,000〜9,000字ある）。書き直し・再採点・
 * AIコーチのように提出画面を通らない経路では、保存してある出題元の ID からここで
 * 引き直さないと、講演の中身なしで採点・助言することになる。
 */
export function resolveQuestionSource(ids: QuestionSourceIds): {
  lectureInfo?: string;
  chartData?: unknown;
} {
  const source =
    (ids.themeId ? getThemeById(ids.themeId) : undefined) ??
    (ids.pastQuestionId ? getPastQuestionById(ids.pastQuestionId) : undefined);
  if (!source) return {};
  return {
    lectureInfo: source.tedTalk ? buildTedLectureInfo(source.tedTalk) : undefined,
    chartData: source.chartData,
  };
}
