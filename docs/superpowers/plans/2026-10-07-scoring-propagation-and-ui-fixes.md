# 採点変更の波及対応と書類画面の手直し Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 10/4〜10/7 に変えた採点（書類 v9・面接 v4・ランク境目の一本化・小論文 v27）を、管理者の生徒詳細・成長レポート・セッション画面・BigQuery・生徒側の履歴まで同じ数字で見られるようにする。あわせて、画面を開いて見つかった壊れ（書類一覧で学部が消える等）と、分かりにくい表示を直す。

**Architecture:** 満点と軸はレコードごとに違う（面接 40/50、小論文 50/60、書類 40/33）。比較・平均・グラフに使う値は必ず換算関数を通し（小論文 `normalizedEssayTotal`、面接は新設 `normalizedInterviewTotal`）、1件を見せる場所だけ実際の点と満点を出す。面接の「どの軸が合計に入るか」は新設 `interviewAxisLayout(mode, totalMax)` を正本にし、生徒の結果画面・管理者の詳細・セッション画面・レポートがそれを使う。ランクは `rankFromTotal` だけを使う。

**Tech Stack:** Next.js 16 (App Router) / TypeScript / Firestore (firebase-admin) / BigQuery / 検証は `npx tsx scripts/verify-*.ts`（node:assert。テストランナーは無い）

**調査メモ:** 2026-10-07 に生徒画面をスマホ幅・PC幅で撮影し、管理者側・レポート・BQ はコードを追った。根拠の行番号は本文の各タスクに書く（実装時に再確認すること）。

**守ること（CLAUDE.md より）**
- 満点を読む側は `normalizedEssayTotal()` / `interviewTotalMax()` を通す。画面で 50・40 を直書きしない
- 本番データの書き換え（再採点・移行スクリプトの `--apply`、BQ の再送）は実行前にユーザーの確認を取る
- 作業が終わったら `npm run build` を通して main へ push してよい。UI 変更は画面を開いて確認してから出す
- BigQuery のスキーマ変更は列の追加だけ（既存列の型変更・削除はしない）

---

## 全体の順番

| Phase | 内容 | 規模 | 本番データ |
|---|---|---|---|
| P0 | 黙って壊れているもの（書類一覧の学部消え・移行スクリプトの合計破壊・履歴の満点） | 小 | なし |
| P1 | 面接の軸と満点の正本を作り、全画面をそれに寄せる | 中 | なし |
| P2 | 成長レポートと生徒詳細の集計を換算値にそろえる | 中 | なし |
| P3 | 書類画面の手直し（説明文の入れ替え・履歴へのジャンプ・古い添削の案内・セッション画面） | 小〜中 | なし |
| P4 | BigQuery の列追加と割合集計 | 中 | 再送は確認を取る |
| P5 | 検査の追加（validate:data）とスクリプトの退避名 | 小 | なし |
| P6 | 残課題（講師採点との照合・ドリルの採点目安・未使用の音声API） | 別途判断 | — |

P0→P1→P2 の順に依存する。P3・P4・P5 は P1 の後なら並行できる（git worktree 3本）。

---

## ファイル構成

| ファイル | 役割 | 変更 |
|---|---|---|
| `src/lib/interview/axis-layout.ts` | 面接の軸・合計に入る軸・ラベル・40点換算の正本 | 新規 |
| `src/lib/types/interview.ts` | `normalizedInterviewTotal` を置く。旧コメント（口頭試問は50）の修正 | 修正 |
| `src/lib/skill-check/aggregate.ts` | `isPracticed` を export して他の集計が同じ条件を使う | 修正 |
| `src/app/student/interview/[id]/result/page.tsx` | 軸の並びとラベルを axis-layout から取る | 修正 |
| `src/app/student/interview/history/page.tsx` | totalMax を落とさない。グラフは40点換算 | 修正 |
| `src/components/admin/InterviewsSection.tsx` | 軸をモード別に。平均を換算値・isPracticed で | 修正 |
| `src/components/sessions/InterviewDetailDialog.tsx` | 満点・色の境目の直書きをやめ axis-layout を使う | 修正 |
| `src/components/sessions/DocumentDetailDialog.tsx` | `DocumentTotalScoreCard` に置き換え | 修正 |
| `src/app/api/admin/students/[id]/route.ts` | 面接推移・直近サマリ・軸平均を換算値・isPracticed で | 修正 |
| `src/lib/admin/axis-averages.ts` | 口頭試問の AP・熱意を軸平均から外す。測っていない軸は入れない | 修正 |
| `src/lib/growth/report.ts` / `src/lib/types/growth-report.ts` | InterviewData に totalMax・mode・答えの数。40点換算で平均。推奨アクションの文言 | 修正 |
| `src/app/api/admin/reports/generate/route.ts` / `batch/route.ts` | 上の項目を詰めて渡す | 修正 |
| `src/components/admin/ReportDetailCard.tsx` / 生徒側 `StudentGrowthReportView` | `max={40}` 決め打ちをやめる。ランクは rankFromTotal | 修正 |
| `src/app/student/dashboard/page.tsx` | 「最新 N点」の色を満点で換算 | 修正 |
| `src/app/api/admin/analytics/monthly-trends/route.ts` | `/50`・`/40` の直書きを換算に | 修正 |
| `src/lib/history-rank.ts` / `src/lib/essay/next-step.ts` | 境目を `rankFromTotal` に寄せる | 修正 |
| `src/app/student/documents/page.tsx` | グループの key を学部IDに。文字数の空を 0 に | 修正 |
| `src/app/student/documents/[id]/page.tsx` | 説明文の入れ替え・履歴へのジャンプ・古い添削の案内・スマホのボタン名 | 修正 |
| `src/components/admin/DocumentsSection.tsx` | 「要具体化:20（個別性あり）」のラベル | 修正 |
| `scripts/migrate-interview-scores.ts` | 口頭試問・totalMax ありの記録を飛ばす | 修正 |
| `scripts/rescore-documents.ts` | 退避名を版ごとに | 修正 |
| `src/lib/bigquery/schema.ts` / `logger.ts` / `anonymize.ts` / `queries.ts` / `types/analytics.ts` | 列追加・割合集計・書類の送信 | 修正 |
| `scripts/verify-scoring-invariants.ts` | 新しい検査（validate:data に連結） | 新規 |
| `src/app/api/interview/voice-message/route.ts` | 未使用。削除か注記（P6 で判断） | 判断待ち |

---

## P0: 黙って壊れているもの

### Task 0.1: 書類一覧で同じ学部名の書類が消える ✅ 2026-10-09
`src/app/student/documents/page.tsx:88-104, 164`

グループは `universityId-facultyId` で作るのに、React の key は `universityId-facultyName`。同じ学部名で学部IDが違う書類があると key が重なり、片方のグループが落ちる（コンソールに「two children with the same key」。本番でも学部IDが揃っていない書類で起こりうる）。

- [ ] `UniversityGroup` に `facultyId` を持たせ、key を `${universityId}-${facultyId}` にする
- [ ] `collapsedGroups` の key も同じものにする（開閉の状態がずれないように）
- [ ] 文字数表示 `{doc.wordCount}` を `{doc.wordCount ?? 0}` にする（欄が無い旧書類で「/800 文字」と分子が空になる）
- [ ] エミュレータで学部IDの違う2書類を作り、両方のグループが出ること・コンソールに key の警告が無いことを確認

### Task 0.2: 面接の移行スクリプトが口頭試問 v4 の合計を壊す ✅ 2026-10-07（コミット「面接採点 v5」で対応）
`scripts/migrate-interview-scores.ts:42-69`

mode を見ずに `total = 4軸の和` で書き直す。`scoresBeforeSplit` が無い 9/19 以降の口頭試問がすべて対象になり、v4 の合計（明確さ＋具体性＋専門知識＋応用思考力）が上書きされる。

- [ ] `mode === "oral_exam"` と `scores.totalMax` が既にある記録は飛ばす（ログに件数を出す）
- [ ] `--dry-run` で本番に対して対象 0 件になることを確認（読み取りのみ）。実行はしない

### Task 0.3: 生徒側の面接履歴が満点を落としている ✅ 2026-10-07
`src/app/student/interview/history/page.tsx:74-92, 184, 249, 258`

API は totalMax を返しているが画面の map で捨てていて、常に「/40」。旧口頭試問の 38/50（A）が「38/40」S と出る。グラフも 0〜50 の軸に満点の違う点を並べている。

- [ ] map に `totalMax` を残し、表示は `interviewTotalMax(scores)` を使う
- [ ] グラフは `normalizedInterviewTotal`（P1 で作る。先にここだけ `total/totalMax*40` でも可）で40点換算し、軸を 0〜40 にする
- [ ] エミュレータに totalMax 50 と 40 の面接を1件ずつ置き、表示と線を確認

---

## P1: 面接の軸と満点の正本 ✅ 2026-10-07（面接採点 v5 と同時に実施。1.3 の isPracticed 絞り込みと DocumentDetailDialog の置き換えは未）

> 追加で、採点の軸そのものを変えた（v5）: 「熱意」→「一貫性（書類との整合・深掘りで崩れないか・自分の言葉か）」。
> 面接官（文字・音声）にも志望理由書を渡し、開始時の写し `interviews/{id}.statementSnapshot` を各ターンと採点で使う。

### Task 1.1: `src/lib/interview/axis-layout.ts` を作る
今は `student/interview/[id]/result/page.tsx:204-239` に「どの軸を出すか」「どれが合計外か」が書かれていて、管理者側は4軸固定（`InterviewsSection.tsx:69-74`）。

- [ ] `interviewAxisLayout(mode, totalMax)` → `{ key, label, inTotal }[]` を返す。
  - 共通: clarity / apAlignment / enthusiasm / specificity
  - oral_exam かつ totalMax 40（v4）: inTotal は clarity・specificity・knowledgeAccuracy・criticalThinking。AP・熱意は参考値
  - oral_exam かつ totalMax 50（9/19〜10/4）: inTotal は共通4軸＋knowledgeAccuracy。criticalThinking は参考値
  - presentation / group_discussion: 共通4軸が inTotal、モード別は参考値
  - bodyLanguage は常に別枠（null なら出さない）
- [ ] `normalizedInterviewTotal(scores)` を `src/lib/types/interview.ts` に置く（`total / interviewTotalMax(scores) * 40`）
- [ ] `types/interview.ts` の total/totalMax のコメントと `InterviewsSection.tsx:97` の「口頭試問は50」を直す
- [ ] `scripts/verify-interview-axis-layout.ts`: 上の4パターンで inTotal の合計が total と一致することを node:assert で確認

### Task 1.2: 生徒の結果画面を正本に寄せる
- [ ] `result/page.tsx` の `allScoreKeys`・`scoreLabel` を `interviewAxisLayout` に置き換える（見た目は変えない）
- [ ] エミュレータで totalMax 40 と 50 の口頭試問、個人面接の3件を確認

### Task 1.3: 管理者の面接詳細・セッション画面
- [ ] `InterviewsSection.tsx:316-350` の軸を `interviewAxisLayout` で出し、参考値には「（合計外）」を付ける
- [ ] `InterviewsSection.tsx:142-151, 226` の平均を `normalizedInterviewTotal` で40点換算し、`isPracticed`（aggregate.ts から export）と同じ条件で絞る。件数表示も同じ母数にする
- [ ] `sessions/InterviewDetailDialog.tsx:44-53, 120-130`: 「/40」と色の境目（32/24）の直書きをやめ、`interviewTotalMax` と `rankFromTotal` を使う
- [ ] `sessions/DocumentDetailDialog.tsx:28-39`: 3軸の自前描画をやめて `DocumentTotalScoreCard` に置き換える（AP null で `val*10` が壊れる問題も消える）
- [ ] 管理者の生徒詳細（活動・書類タブ、面接タブ）とセッション画面で見た目を確認

---

## P2: 成長レポートと生徒詳細の集計

### Task 2.1: 生徒詳細 API の面接集計
`src/app/api/admin/students/[id]/route.ts:310-337, 377-503`、`src/lib/admin/axis-averages.ts:69-79`

- [ ] `interviewScoreTrend` の点を `normalizedInterviewTotal` にし、tooltip には実際の点と満点を出す
- [ ] `interviewStatsSummary.avgScore` も換算値。対象は `isPracticed`
- [ ] `axis-averages.ts`: 口頭試問の apAlignment・enthusiasm は平均に入れない（`interviewAxisLayout` の inTotal を見る）。測っていない軸（bodyLanguage null、モード別の欠落）は分母に入れない
- [ ] 概要タブのレーダー・SessionStudentDossier・superadmin の同じ部品で崩れないことを確認

### Task 2.2: 成長レポート
`src/lib/growth/report.ts:22-33, 188-249, 341-344`、`reports/generate/route.ts:530-550`、`batch/route.ts:219-240`、`ReportDetailCard.tsx:294`、`StudentGrowthReportView:52`

- [ ] `InterviewData` に `totalMax`・`mode`・`studentAnswerCount` を足し、generate/batch で詰める
- [ ] 平均は40点換算、対象は答え3つ以上。軸平均は inTotal の軸だけ、bodyLanguage は null を 0 にしない（`avgOf` の修正）
- [ ] 表示側の `max={40}` と `scoreToSkillRank(avg,40)` を、換算済み平均＋`rankFromTotal(avg, 40)` に
- [ ] 推奨アクション（341-344 行）: 口頭試問が主の生徒には「知識の正確さ／考えの進め方」の文言に分ける（mode の割合で判定）
- [ ] 書類の点を `documentSummary` に足す（直近の総合点・ランク・学びの計画の有無）。表示は ReportDetailCard に1行
- [ ] エミュレータで週次レポートを生成し、口頭試問と個人面接が混ざった生徒で平均が40を超えないことを確認

### Task 2.3: 残っている直書き
- [ ] `student/dashboard/page.tsx:143-160, 44`: 「最新 N点」の色を満点で換算して決める（面接 36/40 が黄色になっている）
- [ ] `admin/analytics/monthly-trends/route.ts:107, 131`: `/50`・`/40` を `normalizedEssayTotal` / `normalizedInterviewTotal` に
- [ ] `history-rank.ts:21` と `essay/next-step.ts` の境目を `rankFromTotal` に寄せる（今は値が同じでも二重定義）
- [ ] `RANK_META.minScore` は未使用。消すか、`rankFromTotal` から導出する

---

## P3: 書類画面の手直し

### Task 3.1: 説明文と導線
`src/app/student/documents/[id]/page.tsx`

- [ ] 1054 行の「本人固有の経験や判断が伝わるかを確認します。AI利用の有無や不正を判定する機能ではありません」は個別性チェックの断り書き。個別性チェックのカード（1198 行〜）へ移し、AI添削には「AP・構成・独自性・学びの計画・表現の5軸で採点し、直し方を示します」を置く
- [ ] 本文上の「バージョン履歴」ボタンで引き出しを開いたら、履歴カードまでスクロールする（`showVersions` を立てた後に `scrollIntoView`）
- [ ] v9 より前に添削した書類（`feedback.learningPlanScore` が undefined）には「もう一度AI添削を実行すると、学びの計画を含む5軸で採点されます」を1行出す
- [ ] スマホ幅の道具ボタン（アイコンのみ4つ）に短い文字ラベルを付ける（横幅が足りなければ2段）
- [ ] AIコーチの引き出し「中」のとき本文が数文字ずつ折れる。「中」の幅を狭めるか、本文側を隠す
- [ ] 作成画面（`new/page.tsx`）の活動実績ステップ: 冒頭の「活動実績を選択すると…」を活動実績の一覧の直前へ移す

### Task 3.2: 管理者の書類一覧のラベル
- [ ] `DocumentsSection.tsx:550` 「要具体化:20（個別性あり）」→ 頭のラベルを「個別性」に（レベル名と矛盾しない）

---

## P4: BigQuery

### Task 4.1: 列の追加
`src/lib/bigquery/schema.ts:89-95`、`logger.ts:125-160`、`anonymize.ts:131-160`、`types/analytics.ts`

- [ ] interview_sessions に `score_knowledge_accuracy`・`score_critical_thinking`・`score_total_max` を足す
- [ ] essay_submissions に `score_reasoning_maturity` を足す（review route は渡しているが logger が捨てている）。`score_maximum` が無ければ足す
- [ ] 書類の添削結果を送る `document_reviews`（軸5つ・満点・版・書類種別・大学/学部の匿名化キー）。review-core の保存後に await で送る
- [ ] スキーマは `firebase`/`bq` の追加列だけ。既存列は触らない。適用コマンドと手順を `docs/` に1段落で書く

### Task 4.2: 割合での集計
`queries.ts:191-195, 291-363`

- [ ] `AVG(score_total)` → `AVG(score_total / score_maximum)`（面接は `score_total_max`）。旧行で NULL のものは 50/40 で埋めて集計する
- [ ] `AVG(score_ap_alignment)` は口頭試問（mode）を除く
- [ ] 管理者の分析画面で数字が出ることを確認（本番の BQ への再送はしない。列追加だけ。再送が要るなら別途確認）

---

## P5: 検査とスクリプト

### Task 5.1: `scripts/verify-scoring-invariants.ts`（validate:data に連結）
- [ ] `rankFromTotal`: 50点で 45→S / 44→A / 37→B / 29→C / 22→D、40点で 36→S / 35→A / 29→B / 23→C / 17→D
- [ ] `isPracticed`: 答え2つ→false、3つ→true、status が completed 以外→false
- [ ] 口頭試問 v4 の合計が `interviewAxisLayout` の inTotal の和と一致
- [ ] `calculateDocumentTotal`: 5軸→max 40、学びの計画 null→33、AP も null→22
- [ ] 小論文の字数上限: fillRate 29→内容4軸 cap 3、79→構成・論理 cap 6、101→構成 cap 4、oral_exam は無効（review-core の cap 計算を関数に切り出して検査する）

### Task 5.2: 書類の再採点スクリプトの退避
`scripts/rescore-documents.ts:99-107`
- [ ] 退避名を `feedbackBefore_${旧版}`（例 `feedbackBefore_v8`）にし、版ごとに残す。ログに学びの計画の点を出す
- [ ] `--dry-run` で本番の対象件数だけ出す（実行は確認を取ってから）

---

## P6: 残課題（この計画では着手しない。判断が要る）

| 課題 | 何が要るか |
|---|---|
| 講師の採点との照合 | 小論文・書類それぞれ20件ほどを講師が採点した表。あれば `scripts/eval-essay-review.ts` に `--only=production` で突き合わせる仕組みを足す |
| 要約ドリル・論理ドリルの採点目安 | 段ごとのアンカーを書く。合計点と正誤はサーバーで計算し直す（AIの申告を保存しない） |
| `/api/interview/voice-message` | どの画面からも呼ばれていない。口頭試問の分野を渡さず終了判定の文言も古い。消してよいか確認 |
| 面接の採点に書類を渡す範囲 | 今は志望理由書・自己推薦書だけ。活動報告書も渡すか |

---

## 検証（Phase ごと）

- 各 Phase の最後に `npm run build` と `npm run validate:data`、`npx tsx scripts/verify-ai-prompt-safety.ts`
- 画面の確認はエミュレータ（`npm run emu` / `seed:emu` / `dev:emu -- -p 3007`）。シードに「totalMax 50 の口頭試問」「v4 の口頭試問」「学部IDの違う書類」「v8 の添削が付いた書類」を足す（`scripts/seed-emulator.ts`）
- 本番データの書き換えは、どの Phase でも `--dry-run` の結果を見せてから確認を取る
