# 書類激詰めモード（面接）設計

2026-10-14

## 目的

本番の総合型選抜の面接では、面接官は志望理由書を読んだうえで、書かれた一文を取り上げて詰めてくる。
今の個人面接は「挨拶 → 自己紹介 → 承で書類を掘る」流れで、書類の食い違いも「責めず、事実を確認する調子で」確かめるため、
書類の甘さを突かれる練習にならない。冒頭から書類を冷静に詰めるモードを足す。

## 決めたこと

| 項目 | 決定 |
| --- | --- |
| 名前 | 書類激詰めモード（履歴・結果などの短い表示は「書類激詰め」） |
| 置き方 | 面接の種類を選ぶ画面の5枚目のカード |
| 内部の扱い | `mode: "individual"` ＋ `documentGrill: true`。新しい `InterviewMode` は作らない |
| 調子 | 冷静に詰める。丁寧語のまま、褒めない、相槌で流さない。圧迫（否定から入る・突き放す）はしない |
| 採点 | 個人面接と同じ（`interview-score-v5`、軸は `axis-layout.ts` の個人面接） |
| 書類 | 1通以上必須 |

新しい `InterviewMode` にしない理由: `mode` で分けている箇所が約40ファイル（採点軸・音声版プロンプト・管理者画面・集計・BigQuery）あり、
すべてに分岐を足すことになる。採点軸は個人面接と同じでよいので、目印1つで足りる。

## データ

- `interviews/{id}.documentGrill: true`（開始時に保存。通常の面接では書かない＝未設定）
- 型: `Interview.documentGrill?: boolean`、`InterviewStartRequest.documentGrill?: boolean`、`InProgressInterview.documentGrill?: boolean`
- 表示名は `interviewModeLabel(mode, documentGrill)`（`src/lib/types/interview.ts`）を正本にし、
  `INTERVIEW_MODE_LABELS[mode]` を直接引いている8箇所（生徒の履歴・結果・セッション・進行中一覧・InterviewHistory、管理者 InterviewsSection 2箇所）を置き換える。
  そのため次の API は `documentGrill` を返す: `/api/interview/history`、`/api/interview/[id]`、`/api/interview/in-progress`、
  `/api/admin/students/[id]/interviews`、`/api/admin/students/[id]/interviews/[interviewId]`、`/api/interview/start`（セッション画面の `sessionInfo` 用）。
- BigQuery への書き出しは変えない（`mode = individual` として集計に入る）。

## 開始画面（`/student/interview/new`）

- カード「書類激詰めモード」を選ぶと、内部では `selectedMode = "individual"` と `documentGrill = true` を設定する。
- 書類選択の欄は個人面接と同じものを出す。選んだ書類が0通なら開始ボタンを押せない。
- 書類の自動選択（`documentIds` 省略）は使わず、生徒が選んだ書類を必ず送る。

## API（`/api/interview/start`）

- `documentGrill === true` かつ `mode === "individual"` のときだけ有効。他のモードなら無視する。
- 読み込んだ書類（`statementSnapshot`）が空なら 400 を返す（書類なしで詰めることはできないため）。
  選んだ書類の本文が全部空のとき・`dev-user`（書類を読まない）のときもこれに当たる。画面は返ってきたエラー文を出す。
- 宿題・スキルチェック経由（`sourceType` が `homework` / `skill_check`、`customOpeningQuestion` あり）では `documentGrill` を無視する（決まったお題で始めるため）。
- 文字の面接で Claude の返答が文字でなかったときの予備の第一声は、激詰めでは「よろしくお願いします。提出書類の内容から伺います。志望理由書で一番伝えたいことは何ですか。」にする。
- セッションに `documentGrill: true` を保存する。
- 続きのターン（`message` / `voice-message`）と音声セッション（`gemini-live-session`）は、セッションの `documentGrill` を読んでプロンプトを切り替える。

## プロンプト

### 文字の面接（`src/lib/ai/prompts/interview.ts`）

`INTERVIEW_SYSTEM_PROMPTS` とは別に、個人面接の激詰め版の指示文 `DOCUMENT_GRILL_PROMPT` を置く。
`buildInterviewSystemPrompt` に `documentGrill` を足し、`mode === "individual" && documentGrill` のときこちらを使う。
書類のブロックは激詰め用の `buildGrillDocumentBlock` を使う（通常版の「責めず、事実を確認する調子で」を含めない）。

進め方:

1. 第一声は「よろしくお願いします」程度の一言だけ。自己紹介や高校生活は聞かない。
   同じ発言の中で書類の一文を「」で引用し、1問目を出す。
2. 詰める論点（順不同。書類の弱いところから）
   - 抽象語（「社会に貢献したい」「多様な視点」等）→ 具体的に何を指すか
   - 根拠の薄い主張 → それを裏づける経験・事実は何か
   - 因果の飛躍（経験 → 志望動機 → 将来像のつながり）
   - 本学・本学部でなければならない理由（AP と書類の対応）
   - 書類どうしの食い違い、書類と回答の食い違い（「書類では〜と書かれていますが」）
3. 1つの論点は2〜3段掘ってから次へ移る。同じ答えの繰り返しには、角度を変えずにもう一段だけ求めて次へ移る。
4. 目安8〜12往復。最後は「以上で面接を終了いたします」で締める（「最後に伝えたいこと」は聞いてよい）。

調子:

- 丁寧語。褒めない（「よい回答ですね」禁止）、相槌で流さない。
- 否定から入る・人格を否定する・「他の大学でもできますよね」と突き放す、は禁止（圧迫ではなく精査）。
- 書類に無いことを書類にあるかのように言わない（通常版と同じ）。

### 音声の面接（`src/lib/ai/prompts/interview-realtime.ts`）

`buildRealtimeIndividualInstructions` に `documentGrill` と書類を足し、`mode === "individual" && documentGrill` のとき:

- `openingScript`: 一言の挨拶の直後に、書類の一文を引用した1問目を出す指示（自己紹介を求めない）。
- `phaseGuide`: 上の論点と調子を短く書いた版。
- 呼んでいるのは `gemini-live-session` だけ。そこで後ろに付けている `buildSubmittedDocumentBlock` を、激詰めのときは `buildGrillDocumentBlock` に替える。

## 採点

変えない。個人面接の採点はすでに `<submitted_document>` との整合を見ている（`interview.ts` の評価プロンプト）。
`interview-score-v5` のまま。会話用の指示文は版管理していないので、版の更新は無い。

## 確かめ方

1. `scripts/verify-interview-document-grill.ts`（新規）
   - 激詰め版の指示文に書類本文が入っていること
   - 激詰め版に「自己紹介」を求める文が無いこと、「責めず」が無いこと
   - `documentGrill` なしの個人面接・他モードの指示文が変更前と同じであること（文字列一致）
   - Realtime 版も同様
   - `interviewModeLabel` が激詰めで「書類激詰め」、それ以外で従来のラベルを返すこと
2. `npm run build`
3. エミュレータ（`npm run emu` / `seed:emu` / `dev:emu`）で、書類を選んで文字の面接を開始し、
   1問目が書類の一文を引用していること、履歴・結果に「書類激詰め」と出ることを画面で見る。
   書類0通のとき開始できないことも見る。

## やらないこと

- 圧迫面接の調子
- 激詰め専用の採点軸・点数
- 集団討論・プレゼン・口頭試問への適用
