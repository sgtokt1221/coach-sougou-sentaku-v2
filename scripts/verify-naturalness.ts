import assert from "node:assert";
import { detectNaturalness } from "../src/lib/japanese/naturalness";
import { mergeNaturalness } from "../src/lib/japanese/naturalness-judge";

const hintsOf = (text: string, writer: "essay" | "document" = "essay") =>
  detectNaturalness(text, writer).sentences.map((s) => s.hints.join(" / "));

// 仕込んだ不自然さを拾う
{
  const [h1, h2, h3, h4, h5] = hintsOf(
    "一番最初に考えるべきことがある。授業中にSNSを見れる状態は良くない。なので、使い方を学ぶべきだ。この考えは的を得ていると言われる。スマートフォンはすごく便利だ。"
  );
  assert.match(h1, /重言「一番最初」/);
  assert.match(h2, /ら抜き「見れる」/);
  assert.match(h3, /文頭の話し言葉「なので」/);
  assert.match(h4, /語の組み合わせの誤り「的を得」/);
  assert.match(h5, /話し言葉「すごく」/);
}

// 「捨てる」「育てる」「建てる」はい抜きとして拾わない（機械では見ない）
{
  const hints = hintsOf("ごみを捨てる。子どもを育てる。家を建てる。");
  assert.deepEqual(hints, ["", "", ""]);
}

// 同じ文末が3文続くと、続いた文すべてに付く。2文では付かない
{
  const three = hintsOf(
    "Aは良いと思う。Bも良いと思う。Cも良いと思う。だから選ぶ。"
  );
  assert.deepEqual(
    three.map((h) => h.includes("同じ文末が続いている")),
    [true, true, true, false]
  );
  const two = hintsOf("Aは良いと思う。Bも良いと思う。Cを選ぶ。");
  assert.ok(two.every((h) => !h.includes("同じ文末")));
}

// 文体の混在。だ・である調の中のです・ます調の文だけに付く
{
  const hints = hintsOf(
    "私は賛成だ。理由は二つある。体験から学ぶことが大切です。以上の理由で賛成する。"
  );
  assert.deepEqual(
    hints.map((h) => h.includes("文体の混在")),
    [false, false, true, false]
  );
}

// 「御校」は書類だけで拾う
{
  assert.match(hintsOf("私は御校を志望します。", "document")[0], /御校/);
  assert.equal(hintsOf("私は御校を志望します。", "essay")[0], "");
}

// 合流：既存の赤ペンと同じ文に掛かるものは直し先を置き換え、重ならないものは後ろに足す
{
  const text =
    "私が反対する理由は、すごく費用がかかる。災害時に連絡ができない。";
  const merged = mergeNaturalness(
    [
      {
        location: "",
        original: "私が反対する理由は、すごく費用がかかる",
        suggestion: "私が反対する理由は、すごく費用がかかるからだ",
        type: "grammar",
        reason: "理由を受けていない。",
      },
    ],
    [
      {
        original: "私が反対する理由は、すごく費用がかかる。",
        location: "第1段落 1文目",
        kind: "spoken",
        problem: "「すごく」は話し言葉。",
        rewrite: "私が反対する理由は、非常に費用がかかるからだ。",
      },
      {
        original: "災害時に連絡ができない。",
        location: "第1段落 2文目",
        kind: "redundant",
        problem: "p",
        rewrite: "災害時に連絡できない。",
      },
    ],
    text,
    16
  );
  assert.equal(merged.length, 2);
  assert.equal(
    merged[0].suggestion,
    "私が反対する理由は、非常に費用がかかるからだ。"
  );
  assert.equal(merged[0].original, "私が反対する理由は、すごく費用がかかる。");
  assert.match(merged[0].reason, /理由を受けていない。.*すごく/);
  assert.equal(merged[1].type, "redundancy");
  // 判定に失敗（null）したら元の赤ペンのまま
  assert.equal(mergeNaturalness(merged, null, text, 16).length, 2);
  // 上限で切る
  assert.equal(mergeNaturalness(merged, null, text, 1).length, 1);
}

// 2文をまたぐ既存の赤ペンが、置き換え済みの文と重なるなら落とす（1文に直しは1つ）
{
  const text = "Aはすごく良い。Bも良い。";
  const merged = mergeNaturalness(
    [
      {
        location: "",
        original: "Aはすごく良い。",
        suggestion: "Aは良い。",
        type: "grammar",
        reason: "r",
      },
      {
        location: "",
        original: "Aはすごく良い。Bも良い。",
        suggestion: "AもBも良い。",
        type: "expression",
        reason: "r",
      },
    ],
    [
      {
        original: "Aはすごく良い。",
        location: "",
        kind: "spoken",
        problem: "p",
        rewrite: "Aは非常に良い。",
      },
    ],
    text,
    16
  );
  assert.deepEqual(
    merged.map((m) => m.suggestion),
    ["Aは非常に良い。"]
  );
}

console.log("verify-naturalness: ok");
