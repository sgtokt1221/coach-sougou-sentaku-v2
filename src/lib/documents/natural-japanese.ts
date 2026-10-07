/**
 * 出願書類を「自然な日本語に整える」ための機械検出と、直した前後の突き合わせ。
 *
 * 出典（どちらも MIT License）:
 * - nanaism/yomiyasu（Copyright (c) 2026 nanaism, https://github.com/nanaism/yomiyasu）
 *   … 比喩的な動詞・大げさな名詞の一覧、「足したもの・削ったもの」の差分検査の考え方
 * - coji/natural-japanese（Copyright (c) 2026 coji, https://github.com/coji/natural-japanese）
 *   … 決まり文句・翻訳調・対比の繰り返し・段落の書き出し・文の長さの単調さの観点
 * 元のスキルは Python のスクリプトで検出するが、本番の環境では動かせないため、
 * 文字列の一致と数え上げで近似して TypeScript に移した。
 *
 * 「検出は機械、判断はAI」。ここで見つけた箇所は直せという命令ではなく、AIが
 * 文脈を見て直すかどうか決める材料にする。直したあとにもう一度数えて画面に出す。
 */

export type DocumentProseStyle = "dearu" | "desumasu";

export const DOCUMENT_PROSE_STYLE_LABELS: Record<DocumentProseStyle, string> = {
  dearu: "だ・である",
  desumasu: "です・ます",
};

export interface NaturalJapaneseFinding {
  id: string;
  label: string;
  /** なぜ読みにくい・不自然に読めるか。AIへの指示と画面の説明に使う */
  why: string;
  count: number;
  /** 本文から拾った例（最大3件） */
  samples: string[];
}

/** 結論の押し付け・空疎な強調・定型の橋渡し（natural-japanese） */
const STOCK_PHRASES = [
  "と言えるでしょう",
  "と言えるだろう",
  "と言えます",
  "ということになるでしょう",
  "のではないでしょうか",
  "結論から言うと",
  "まとめると",
  "総じて",
  "非常に重要",
  "極めて重要",
  "重要なのは",
  "大切なのは",
  "ポイントは",
  "言うまでもなく",
  "このように",
  "このような中",
  "ここで注目したいのは",
  "驚くべきことに",
  "興味深いことに",
];

/** 英語を直訳したような言い回し（natural-japanese / yomiyasu） */
const TRANSLATIONESE = [
  "することができる",
  "することができます",
  "することが可能",
  "という観点から",
  "にとって重要",
  "にとって不可欠",
  "した瞬間",
  "を示唆している",
  "深掘り",
];

/** 比喩的に使われる語・大げさな名詞（yomiyasu）。AIで書いた志望理由書によく出る */
const FIGURATIVE = [
  "解像度",
  "手触り",
  "土台",
  "溶かす",
  "溶かし",
  "潰す",
  "潰し",
  "倒す",
  "効いてくる",
  "地味に効",
  "踏み込",
  "収斂",
  "本質",
  "真髄",
  "原点",
  "羅針盤",
  "架け橋",
  "唯一無二",
];

/** 話し言葉（どちらの文体でも書類では使わない） */
const SPOKEN = ["けど", "すごく", "じゃない", "いろんな", "やっぱり", "しちゃ", "ちゃんと", "みたいな", "っていう"];
const SPOKEN_SENTENCE_HEAD = ["なので", "だから", "でも"];

const PARAGRAPH_HEAD_CONNECTIVES = ["しかし", "また", "そして", "そのため", "さらに", "一方", "このように"];

const DESUMASU_END = /(です|ます|でした|ました|でしょう|ません|ください)[。！？!?」]?$/;
const DEARU_END = /(だ|である|であった|だった|ない|た|る|う|い)[。！？!?」]?$/;

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[。！？!?])|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** 語の前後を少し付けて、本文のどこかが分かる形で拾う */
function samplesOf(text: string, words: string[]): { count: number; samples: string[] } {
  let count = 0;
  const samples: string[] = [];
  for (const w of words) {
    let from = 0;
    for (;;) {
      const i = text.indexOf(w, from);
      if (i < 0) break;
      count++;
      if (samples.length < 3) {
        samples.push(text.slice(Math.max(0, i - 12), i + w.length + 8).replace(/\n/g, " "));
      }
      from = i + w.length;
    }
  }
  return { count, samples };
}

/** 本文のおおよその文体（です・ます調の文が半分以上なら です・ます） */
export function guessProseStyle(text: string): DocumentProseStyle {
  const sentences = splitSentences(text).filter((s) => s.length >= 8);
  if (sentences.length === 0) return "dearu";
  const desu = sentences.filter((s) => DESUMASU_END.test(s)).length;
  return desu / sentences.length >= 0.5 ? "desumasu" : "dearu";
}

export function detectUnnaturalJapanese(
  text: string,
  style: DocumentProseStyle
): NaturalJapaneseFinding[] {
  const findings: NaturalJapaneseFinding[] = [];
  const sentences = splitSentences(text);
  const paragraphs = splitParagraphs(text);

  const stock = samplesOf(text, STOCK_PHRASES);
  if (stock.count > 0) {
    findings.push({
      id: "stock",
      label: "決まり文句・空疎な強調",
      why: "「重要なのは」「このように」「と言えるだろう」は中身を運ばず、重なると生成された文章に読める。強調したいなら語ではなく、その一文を短く言い切る",
      ...stock,
    });
  }

  const tr = samplesOf(text, TRANSLATIONESE);
  if (tr.count > 0) {
    findings.push({
      id: "translationese",
      label: "翻訳調の言い回し",
      why: "「することができる」「という観点から」は英語の直訳で、説明書のように無機質になる。「できる」「〜で見ると」のように直接言う",
      ...tr,
    });
  }

  const fig = samplesOf(text, FIGURATIVE);
  if (fig.count > 0) {
    findings.push({
      id: "figurative",
      label: "比喩・大げさな言葉",
      why: "「解像度が上がる」「土台」「本質」のような比喩や大げさな名詞は、何が起きたのかを読み手に補わせる。意味が同じになる普通の言葉で言えるときだけ言い換える",
      ...fig,
    });
  }

  const contrast = samplesOf(text, ["ではなく", "だけでなく"]);
  if (contrast.count >= 3) {
    findings.push({
      id: "contrast",
      label: "「〜ではなく」の繰り返し",
      why: "否定→肯定の対比を何度も使うと、内容より構文のリズムが目立つ。誤解を正す必要がある1か所だけ残す",
      ...contrast,
    });
  }

  if (paragraphs.length >= 3) {
    const heads = paragraphs.filter((p) => PARAGRAPH_HEAD_CONNECTIVES.some((c) => p.startsWith(c)));
    if (heads.length / paragraphs.length >= 0.3) {
      findings.push({
        id: "paragraph-head",
        label: "段落の書き出しが接続詞ばかり",
        why: "「また」「さらに」「そのため」で段落を始め続けると、内容でつながっていない印象になる",
        count: heads.length,
        samples: heads.slice(0, 3).map((p) => p.slice(0, 20)),
      });
    }
  }

  const bodyLengths = sentences.filter((s) => s.length >= 8).map((s) => s.length);
  if (bodyLengths.length >= 6) {
    const mean = bodyLengths.reduce((a, b) => a + b, 0) / bodyLengths.length;
    const sd = Math.sqrt(bodyLengths.reduce((a, b) => a + (b - mean) ** 2, 0) / bodyLengths.length);
    if (sd / mean < 0.25) {
      findings.push({
        id: "uniform-length",
        label: "文の長さがそろいすぎ",
        why: `どの文も${Math.round(mean)}字前後で単調になっている。短く言い切る文と、理由を述べる長めの文を混ぜる`,
        count: 1,
        samples: [],
      });
    }
  }

  const longOnes = sentences.filter((s) => s.length > 80);
  if (longOnes.length > 0) {
    findings.push({
      id: "long-sentence",
      label: "長すぎる文",
      why: "80字を超える文は主語と述語が離れ、ねじれやすい。1文に1つのことを書き、2文に分ける",
      count: longOnes.length,
      samples: longOnes.slice(0, 3).map((s) => `${s.slice(0, 24)}…（${s.length}字）`),
    });
  }

  const wrongStyle = sentences.filter((s) =>
    style === "dearu" ? DESUMASU_END.test(s) : s.length >= 8 && !DESUMASU_END.test(s) && DEARU_END.test(s)
  );
  if (wrongStyle.length > 0) {
    findings.push({
      id: "style",
      label: style === "dearu" ? "です・ます調の文" : "だ・である調の文",
      why: `選んだ文体（${DOCUMENT_PROSE_STYLE_LABELS[style]}）にそろえる`,
      count: wrongStyle.length,
      samples: wrongStyle.slice(0, 3).map((s) => s.slice(-24)),
    });
  }

  const spoken = samplesOf(text, SPOKEN);
  const headSpoken = sentences.filter((s) => SPOKEN_SENTENCE_HEAD.some((h) => s.startsWith(h)));
  if (spoken.count + headSpoken.length > 0) {
    findings.push({
      id: "spoken",
      label: "話し言葉",
      why: "「けど」「すごく」、文頭の「なので」「でも」などは書き言葉にする（「が」「非常に」「そのため」「しかし」）",
      count: spoken.count + headSpoken.length,
      samples: [...spoken.samples, ...headSpoken.map((s) => s.slice(0, 20))].slice(0, 3),
    });
  }

  return findings;
}

export function totalFindingCount(findings: NaturalJapaneseFinding[]): number {
  return findings.reduce((sum, f) => sum + f.count, 0);
}

/**
 * 直した文に、元の本文に無い事実が入っていないかを見る（yomiyasu の差分検査の考え方）。
 * 志望理由書で一番まずいのは、整える過程で人数・回数・名前が足されること。
 * 数字（全角・漢数字＋単位を含む）、「」で囲んだ語、英字の語を比べる。
 */
export function introducedFacts(before: string, after: string): string[] {
  const norm = (s: string) =>
    s.replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0)).replace(/\s+/g, "");
  const b = norm(before);
  const a = norm(after);
  const tokens = new Set<string>();
  for (const m of a.matchAll(/\d+(?:[.,]\d+)?/g)) tokens.add(m[0]);
  for (const m of a.matchAll(/[一二三四五六七八九十百千万]+(?=[人回年月日件校名社か所カ所割%％倍])/g)) tokens.add(m[0]);
  for (const m of a.matchAll(/「([^」]{2,30})」/g)) tokens.add(m[1]);
  for (const m of a.matchAll(/[A-Za-z][A-Za-z0-9-]{2,}/g)) tokens.add(m[0]);
  return [...tokens].filter((t) => !b.includes(t));
}
