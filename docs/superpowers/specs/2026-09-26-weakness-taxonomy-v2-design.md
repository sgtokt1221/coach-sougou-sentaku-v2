# 重点弱点の組み直し（弱点タクソノミー v2）設計

- 日付: 2026-09-26
- 対象: 弱点DB `users/*/weaknesses` の分類（正規タクソノミー）と、それを表示する画面
- 目的: 重点弱点を、生徒と講師が見て「文章のどこができていないか」が分かる、漏れと重なりのない一覧にする
- 範囲外: 弱点から講座・ドリルへの導線（講座・ドリルが未完成のため後回し。2026-09-26 のユーザー判断）

## 1. 背景（本番データの点検結果、2026-09-26）

本番の全指摘 225件（答案56本と面接）を現行の規則で分類し直した。

**重なり**

- 「根拠・データが不足している」33 / 「根拠が一般論で具体に乏しい」18 / 「抽象的で具体性に欠ける」7 が同じ中身。後の2つは ID が `originality.*`（廃止した独自性の軸）のまま
- 「設問・テーマから論点がずれている」10 と「設問が求めた要素に答えていない」0 が分かれている
- 「段落のつながり・論述の流れが弱い」26 が構成の指摘の受け皿になっている

**漏れ**（添削で見つけているのに重点弱点に届いていない）

- 語の選び違い・語の抜け: 文の点検で18文、赤ペンの「表現」104件。受け皿のラベルが無い
- 設問の要求の欠落（`taskFulfillment.requirements` の missing）: 15本。弱点につながっていない
- 課題文の読み違い（`reportInsights.misreadings`）: 5件。ラベルが無い
- 専門知識の誤り（`knowledgeInsights.errors`）: 6件。ラベルが無い
- 誤字: 文の点検で31文。弱点に積む条件から外している
- 一般化しすぎ、文末の単調: ラベルが無い
- 面接の弱点8件が正規ラベルに寄らない

**0件のラベル**: 飛躍・単純化・実行面・どの大学にも言える一般論

## 2. 方針

1. 小論文の重点弱点を、文章の層で組み直す。層は採点の軸（`EssayCategoryKey`）と一致させ、新しい分類軸は作らない
   - 文 = expression / 構成 = structure / 論証 = logic / 議論の成熟度 = reasoningMaturity / 設問対応 = responsiveness / AP = apAlignment
2. 名前を「何がどうなっている」の言い切りに揃え、各弱点に1行の説明を持たせる（生徒・講師のカードに出す）
3. 添削で既に出している機械的な判定を、AI の自由な言い方を経由せずに弱点へ積む
4. 面接の弱点は、小論文と別の見出しで表示する。分け方は正本の ID で決める（`iv.` で始まるものが面接）。
   source は小論文・面接の両方から指摘された弱点で both になり、置き場所が決まらないため使わない

## 3. 弱点の一覧

「AI」は添削の `repeatedIssues`、「判定」は添削結果の判定欄から直接積むもの。
「既存」は保存済みの canonicalId。複数あるものは先頭を正本の ID とし、残りを別名（alias）にする。

### 3.1 小論文

| 層       | 正本の ID                          | 弱点名                                   | 1行の説明                                                  | 判定の元                                               | 既存                                                                 |
| -------- | ---------------------------------- | ---------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------- |
| 文       | expression.twist                   | 主語と述語が噛み合わない文がある         | 文頭の「〜は」と文末が対応していない                       | 文の点検 twist 2文以上 ＋ AI                           | 同じ                                                                 |
| 文       | expression.grammar                 | 助詞や語の使い方が誤っている             | 助詞の選び違い、語の組み合わせ、語の抜けで意味が取りにくい | 文の点検 particle/collocation/unreadable 2文以上 ＋ AI | expression.grammar, expression.ambiguous                             |
| 文       | expression.typo                    | 誤字・脱字が多い                         | 漢字や送り仮名の誤り、字の重なりがある                     | 文の点検 typo 3文以上 ＋ AI                            | 新規                                                                 |
| 文       | expression.long_sentence           | 一文が長く読みにくい                     | 読点で節をつなぎ続け、80字を超える文がある                 | AI                                                     | 同じ                                                                 |
| 文       | expression.verbose                 | 同じ言葉や言い回しが重なっている         | 同じ語・同じ結論を繰り返す、回りくどい                     | AI                                                     | 同じ                                                                 |
| 文       | expression.tone                    | 文体・文末が整っていない                 | 常体と敬体の混在、「〜と考える」の連発、話し言葉           | AI                                                     | 同じ                                                                 |
| 構成     | structure.no_conclusion            | 結論で立場を言い切れていない             | 結論が無い、または「大切だ」で終わる                       | AI                                                     | 同じ                                                                 |
| 構成     | structure.conclusion_restates      | 結論が本論・序論の繰り返しにとどまる     | 結論で新しい到達点を示していない                           | AI                                                     | 同じ                                                                 |
| 構成     | structure.mixed_paragraph          | 1つの段落に複数の話題が混ざっている      | 段落の区切りと話題の切れ目が合っていない                   | AI                                                     | 新規                                                                 |
| 構成     | structure.weak_flow                | 段落どうしのつながりが示されていない     | 前の段落から次の段落へ移る理由が書かれていない             | AI                                                     | 同じ                                                                 |
| 構成     | structure.unbalanced               | 序論・本論・結論の配分が偏っている       | 序論や具体例に字数を取られ、論じる部分が薄い               | AI                                                     | 同じ                                                                 |
| 論証     | logic.weak_evidence                | 根拠が一般論で具体性がない               | 誰でも書ける理由にとどまり、事実・例・仕組みがない         | AI                                                     | logic.weak_evidence, originality.no_experience, originality.abstract |
| 論証     | logic.leap                         | 理由から主張への筋道が飛んでいる         | 間の説明が抜けている、因果を取り違えている                 | AI                                                     | logic.leap, logic.causal_error                                       |
| 論証     | logic.overgeneralize               | 一部の例から全体を言い切っている         | 違うものを一括りにして論じている                           | AI                                                     | 新規                                                                 |
| 論証     | logic.contradiction                | 主張どうしが食い違っている               | 前と後ろで逆の立場を取っている                             | 文の点検 contradictions ＋ AI                          | 同じ                                                                 |
| 成熟度   | logic.one_sided                    | 反対意見・別の立場を扱っていない         | 自分と違う見方に触れていない                               | AI                                                     | 同じ                                                                 |
| 成熟度   | reasoning.weak_rebuttal            | 反論への応答が弱い                       | 反論を挙げたが、なぜ退けられるかを示していない             | AI                                                     | 同じ                                                                 |
| 成熟度   | reasoning.oversimplified           | 問題を単一の原因で単純化している         | 原因や立場を1つに絞って片付けている                        | AI                                                     | 同じ                                                                 |
| 成熟度   | reasoning.no_constraints           | 解決策の実行面を考えていない             | 誰がやるか、制約、副作用に触れていない                     | AI                                                     | 同じ                                                                 |
| 設問対応 | structure.off_topic                | 設問の主題からずれている                 | 問われたことと別の話題が中心になっている                   | 判定 subjectMatch≠same ＋ AI                           | 同じ                                                                 |
| 設問対応 | responsiveness.missing_requirement | 設問が求めた要素が欠けている             | 「比較せよ」「二つ挙げよ」などの要求に答えていない         | 判定 requirements に missing                           | 同じ                                                                 |
| 設問対応 | responsiveness.misread             | 課題文・資料を読み違えている             | 筆者の主張や資料の数値を取り違えている                     | 判定 misreadings 1件以上 / claimChecks に contradicted | 新規                                                                 |
| 設問対応 | responsiveness.knowledge_error     | 専門用語・知識を取り違えている           | 基礎の定義や仕組みが誤っている（口頭試問型）               | 判定 knowledgeInsights.errors に critical              | 新規                                                                 |
| 設問対応 | responsiveness.too_short           | 字数が大きく足りない                     | 指定字数の7割に届いていない                                | 判定 quantitativeAnalysis.fillRate < 70                | 新規                                                                 |
| AP       | ap.weak_motivation                 | 志望理由・動機が浅い                     | なぜこの大学・学部かが言えていない                         | AI                                                     | 同じ（「でなければならない理由」等を keywords に追加）               |
| AP       | ap.no_link                         | アドミッションポリシーとの結びつきが弱い | AP が求める力と答案の論点が対応していない                  | AI                                                     | 同じ                                                                 |
| AP       | ap.generic                         | どの大学にも言える一般論にとどまる       | 志望先の特色に触れていない                                 | AI                                                     | 同じ                                                                 |

`originality.cliche`（視点がありきたりで独自性に欠ける）は旧データの表示用に残す。新しくは付かない。

### 3.2 面接（source=interview。小論文と別の見出し）

| 正本の ID                                             | 弱点名                           | 1行の説明                            | 既存 |
| ----------------------------------------------------- | -------------------------------- | ------------------------------------ | ---- |
| iv.clarity.unstructured                               | 結論から話せていない             | 答えの要点が最初に来ない             | 同じ |
| iv.answer_depth                                       | 質問に正面から答えていない       | 聞かれたことと別のことを話している   | 同じ |
| iv.no_episode                                         | 具体的なエピソードが出てこない   | いつ・どこで・何をしたかが語られない | 新規 |
| iv.enthusiasm.low                                     | 熱意・主体性が伝わらない         | 志望の強さや自分から動いた話が出ない | 同じ |
| iv.manner                                             | 面接中の言動・マナーに問題がある | 開始前後の発言や呼び間違いなど       | 新規 |
| iv.no_answer                                          | 面接が成立していない             | 回答がほとんど記録されていない       | 同じ |
| iv.body.eye_contact / expression / posture / delivery | （動画解析。現行どおり）         | 現行どおり                           | 同じ |

面接でも志望理由の弱点は ap.weak_motivation に寄せる（小論文と共通の AP 層）。

## 4. 仕組み

### 4.1 タクソノミーの定義（src/lib/growth/weakness-taxonomy.ts）

`TaxonomyEntry` に次を足す。

- `description: string` — 1行の説明（カードに出す）
- `aliases?: string[]` — まとめた旧 ID。`BY_ID` はこれも引けるようにし、`resolveCanonical` の `aiCanonicalId` と保存済みの canonicalId を正本へ寄せる

ラベルを変えた弱点も、旧ラベルを `BY_LABEL` で引けるようにする（保存済みの `area` が旧ラベルのため）。

### 4.2 判定から弱点を作る関数を1つにする

判定欄全体から弱点を足す関数を src/lib/essay/derive-weakness-issues.ts に置く。

```
deriveWeaknessIssues(feedback, check, opts) → repeatedIssues に判定分を足したもの
```

- 文の点検: twist / 助詞・語 / 誤字 / 矛盾（3.1 の閾値）
- feedback.taskFulfillment: subjectMatch≠same → off_topic、requirements に missing → missing_requirement
- feedback.reportInsights.misreadings、claimChecks の contradicted → misread
- feedback.knowledgeInsights.errors の critical → knowledge_error
- feedback.quantitativeAnalysis.fillRate < 70 → too_short

足す弱点の `area` は正規ラベルそのもの、`message` は根拠（引用した文や要求）にする。

- **重複の判定**: AI の repeatedIssues を1件ずつ `resolveCanonical`（カテゴリと説明文つき）で正本へ寄せ、同じ正本の ID が既にあれば足さない
- **講座のブロック課題**（`lecture.exercise.blockId` がある課題）は、字数不足（too_short）と要求の欠落（missing_requirement）を足さない。1ブロックだけ書く課題なので、答案全体を前提にした判定が当てはまらない。呼び出し側が `partial: true` を渡す
  - 主題ずれ（off_topic）は積むが、`subjectMatch === "different"`（別の話題）のときだけにする。`narrower`（主題の一部に限定）は1ブロックだけ書く課題では起きて当然なので積まない
- **面接**は判定欄を持たないので、この関数を通さない（repeatedIssues と動画解析のタグだけ）

この関数を次の全部が使う（材料と規則を1か所にする。ずれると弱点DB・レポート・添削結果で回数が食い違う）。

- 書き込み: /api/essay/review、講座の提出、宿題の提出（review-core の出力を組み立てるところ）
- 作り直し: scripts/rebuild-weaknesses.ts
- 集計: src/lib/growth/weakness-aggregate.ts の `weaknessKeysOf`（成長レポート・点検スクリプト）
- 表示: `feedbackWithDerivedIssues`（添削結果の API と、やり直し比較の親答案）

過去の答案は判定欄を既に持っているので、作り直しで判定分の弱点も積まれる（AI の再呼び出しは不要）。

**派生分の目印**: 足した弱点には `derived: true` を付けて保存する（`count` は常に1で意味を持たない）。関数は入力の repeatedIssues から `derived: true` のものを先に落としてから派生し直すので、閾値や規則を変えても作り直し・表示で新しい規則に追随でき、同じ入力に何度通しても結果が変わらない（冪等）。目印の無いもの（AI が挙げた弱点と、目印導入前に保存された派生分）は残し、正本 ID が同じなら重複として足さない。機械判定だけで積む弱点（too_short / missing_requirement / misread / knowledge_error / typo。`MACHINE_ONLY_ISSUE_IDS`）は、AI へ渡す過去の弱点一覧から外す（渡すと AI がなぞって書き、判定と無関係に回数が増える）。講座のブロック課題かどうかは提出時に答案へ `partial` を保存し、無い旧データだけ講座データの `blockId` で判定する（`isPartialEssay`）。

### 4.3 AI 指摘の振り分け

`resolveCanonical` の手順（場所の語の除去、見出し語は説明文を加味）は変えない。変えるのはキーワードだけ。

- 新規: mixed_paragraph（「話題が混在」「複数の話題」）、overgeneralize（「一括り」「一般化」「すべての」）、iv.no_episode、iv.manner
- ambiguous のキーワードを grammar へ、causal_error を leap へ、no_experience・abstract を weak_evidence へ移す
- weak_flow から「段落」単独のキーワードを外す（構成の指摘がすべて集まるため）。「つながり」「接続」「流れ」は残す
- mixed_paragraph に「段落構成」「段落分け」「段落の区切り」を入れ、外した「段落」の受け皿にする

## 5. 画面

- 重点弱点のグラフ（WeaknessTopChart）と生徒詳細の弱点一覧: 小論文と面接を分けて表示する。生徒詳細の一覧は層（＝採点の軸）の順。重点弱点のグラフは重点を見るものなので小論文の群を回数順に並べ、面接の群は常に最後に置く
- 生徒の弱点カード（WeaknessReminderCard / Banner、/student/growth）: 弱点名の下に `description` を出す
- /student/growth の「解決済み」とダッシュボードの「解決」件数: 解決済みも返す取得に直す（いまは getRemindableWeaknesses が除外するため常に0件）

説明（description）と群（group）は API がタクソノミーから付けて返す（画面ごとに文言を持たない）。対象は `/api/growth/weaknesses`（生徒の画面すべて）と `/api/admin/students/[id]`（生徒詳細・重点弱点のグラフ）。弱点名は保存済みの `area` をそのまま出すので、ラベルを変えた弱点が新しい名前になるのは作り直し（6. 移行）か、次の提出での統合（consolidateExisting）の後。

## 6. 移行

1. コードを入れて push する
2. `scripts/rebuild-weaknesses.ts`（確認モード）で差分を見る → `--apply`（本番の書き換え。実行前に確認を取る）
3. `scripts/audit-weaknesses.ts` で保存と数え直しが一致すること、重複0組を確認する

「もう見ない」（reminderDismissedAt）は作り直しが正規ラベル単位で引き継ぐ。別名にまとめた弱点は、まとめ先のラベルへ引き継ぐ。

保存済みの成長レポート（スナップショット）は作り直さない。次に生成する分から新しい分類になる。

## 7. 検証

- `scripts/verify-weakness-label.ts` に追加:
  - 旧 ID（originality.no_experience 等）と旧ラベルが正本へ寄ること
  - 各正規ラベルが自分自身へ戻ること
  - 3.1 の判定元ごとに `deriveWeaknessIssues` が期待どおりの弱点を足すこと（合成した feedback で）
- 本番225件の再分類で、漏れが面接の自由記述と「経験が無い」系（v23 で評価しないと決めたもの）だけになること
- rebuild 後の audit で倍率が 1.0 前後、重複0組
- 画面: 生徒の成長画面、ダッシュボード、管理者の生徒詳細、重点弱点のグラフを開いて確認する

## 8. やらないこと

- 講座・ドリルへの導線（後回し）
- 「直近10本中何本」の率表示（今回は現行の回数・段階のまま）
- 保存済み成長レポートの作り直し
- 採点・点数の上限・添削プロンプトの変更（AI が返すカテゴリの許可値は現行のまま。弱点の振り分けはサーバー側だけで行う）
