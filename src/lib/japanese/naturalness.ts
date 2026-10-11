/**
 * 日本語の不自然さの機械検出（AIは呼ばない）。小論文と出願書類の添削で共用する。
 *
 * 添削の赤ペンは文法の誤り（主述のねじれ・助詞）しか確実に拾っておらず、
 * 話し言葉・重言・ら抜き・決まり文句・慣用句の取り違えなどが素通りしていた
 * （実測：不自然さ12件のうち小論文6件・志望理由書3件）。
 *
 * 「検出は機械、判断はAI」（natural-japanese.ts と同じ考え方）。ここで文ごとに
 * 当てはまった観点を付け、naturalness-judge.ts の AI が文脈を見て直すかを決める。
 * 一覧で決まらない「その場面でその語は使わない」は AI に任せる。
 */
import {
  SPOKEN,
  SPOKEN_SENTENCE_HEAD,
  STOCK_PHRASES,
  TRANSLATIONESE,
} from "@/lib/documents/natural-japanese";
import { detectJapaneseStyle } from "@/lib/ai/japanese-style";
import { splitSentences } from "@/lib/essay/sentence-check-judge";

export type NaturalnessWriter = "essay" | "document";

/** 重言（意味の重なり） */
const REDUNDANT_PAIRS = [
  "一番最初",
  "まず最初",
  "最後の最後",
  "後で後悔",
  "あとで後悔",
  "違和感を感じ",
  "必ず必要",
  "過半数を超え",
  "被害を被",
  "頭痛が痛",
  "今現在",
  "元旦の朝",
  "思いがけないハプニング",
  "返事を返",
  "犯罪を犯",
  "まだ未",
  "あらかじめ予",
];

/** ら抜き（一段動詞・カ変の可能形） */
const RA_NUKI = [
  "見れる",
  "見れな",
  "見れます",
  "来れる",
  "来れな",
  "来れます",
  "出れる",
  "出れな",
  "寝れる",
  "寝れな",
  "着れる",
  "食べれる",
  "食べれな",
  "考えれる",
  "決めれる",
  "決めれな",
  "受けれる",
  "受けれな",
  "居れる",
  "生きれる",
  "起きれる",
  "起きれな",
];

/**
 * 慣用句・決まった組み合わせの取り違え。誤りが一つに決まるものだけを置く
 * （「〜した方が良い」程度の好みは入れない。迷うものは AI に任せる）。
 */
const IDIOM_MISTAKES: { wrong: string; right: string }[] = [
  { wrong: "的を得", right: "的を射る" },
  { wrong: "汚名挽回", right: "汚名返上／名誉挽回" },
  { wrong: "足元をすくわれ", right: "足をすくわれる" },
  { wrong: "取り付く暇", right: "取り付く島もない" },
  { wrong: "采配を振るう", right: "采配を振る" },
  { wrong: "怒り心頭に達", right: "怒り心頭に発する" },
  { wrong: "雪辱を晴ら", right: "雪辱を果たす" },
  { wrong: "押しも押されぬ", right: "押しも押されもせぬ" },
  { wrong: "上や下への", right: "上を下への" },
  { wrong: "愛想を振りま", right: "愛嬌を振りまく" },
  { wrong: "口先三寸", right: "舌先三寸" },
  { wrong: "体調を壊", right: "体調を崩す" },
  { wrong: "感心がある", right: "関心がある" },
  { wrong: "感心を持", right: "関心を持つ" },
  { wrong: "以外と", right: "意外と" },
  { wrong: "夢を果た", right: "夢を叶える／実現する" },
];

/** 書き言葉の書類で使わないもの */
const DOCUMENT_ONLY = [
  { word: "御校", why: "話し言葉。書類では「貴校」（大学なら「貴学」）" },
  { word: "させていただ", why: "へりくだりすぎ。「〜しました」で足りる" },
];

/** 文末の言い回し。3文以上続くと単調になる */
const ENDINGS = [
  /と思(う|います|った|いました)。?$/,
  /と考え(る|ます|た|ました)。?$/,
  /と感じ(る|ます|た|ました)。?$/,
  /(したい|したいです)。?$/,
];

export interface NaturalnessSentence {
  /** 1始まりの番号（AIに渡す番号と同じ） */
  index: number;
  text: string;
  location: string;
  /** 機械が付けた観点（「話し言葉「すごく」」のように、AIと生徒が読める形） */
  hints: string[];
}

export function detectNaturalness(
  text: string,
  writer: NaturalnessWriter
): {
  sentences: NaturalnessSentence[];
  dominantStyle: "desumasu" | "dearu" | null;
} {
  const style = detectJapaneseStyle(text);
  const base = splitSentences(text);
  const sentences: NaturalnessSentence[] = base.map((s, i) => ({
    index: i + 1,
    text: s.text,
    location: s.location,
    hints: [],
  }));

  for (const s of sentences) {
    const t = s.text;
    for (const w of SPOKEN) if (t.includes(w)) s.hints.push(`話し言葉「${w}」`);
    for (const h of SPOKEN_SENTENCE_HEAD)
      if (t.startsWith(h)) s.hints.push(`文頭の話し言葉「${h}」`);
    for (const w of REDUNDANT_PAIRS)
      if (t.includes(w)) s.hints.push(`重言「${w}」`);
    for (const w of RA_NUKI) if (t.includes(w)) s.hints.push(`ら抜き「${w}」`);
    for (const w of TRANSLATIONESE)
      if (t.includes(w)) s.hints.push(`冗長・翻訳調「${w}」`);
    for (const w of STOCK_PHRASES)
      if (t.includes(w)) s.hints.push(`決まり文句「${w}」`);
    for (const m of IDIOM_MISTAKES)
      if (t.includes(m.wrong))
        s.hints.push(`語の組み合わせの誤り「${m.wrong}」→「${m.right}」`);
    if (writer === "document")
      for (const d of DOCUMENT_ONLY)
        if (t.includes(d.word)) s.hints.push(`「${d.word}」：${d.why}`);

    // 文体の混在。主の文体と違う文末の文だけ
    const end = t.replace(/[」』）)】]+$/, "").replace(/。$/, "");
    const one = detectJapaneseStyle(end);
    if (style.dominant && one.dominant && one.dominant !== style.dominant)
      s.hints.push(
        style.dominant === "dearu"
          ? "文体の混在（です・ます）"
          : "文体の混在（だ・である）"
      );
  }

  // 同じ文末が3文以上続く
  for (const re of ENDINGS) {
    let run: NaturalnessSentence[] = [];
    const flush = () => {
      if (run.length >= 3)
        for (const s of run) s.hints.push("同じ文末が続いている");
      run = [];
    };
    for (const s of sentences) {
      if (re.test(s.text)) run.push(s);
      else flush();
    }
    flush();
  }

  for (const s of sentences) s.hints = [...new Set(s.hints)];
  return { sentences, dominantStyle: style.dominant };
}
