# ロジカルツアー 設計書

- 日付: 2026-07-08
- 対象: Coach for 総合型選抜（v2 / `coach-sougou-sentaku-v2`）
- 位置づけ: 「学習ツアー」構想のサブB（本体）。サブA=論理ドリルは実装済み（PR #10, `docs/superpowers/specs/2026-07-08-logic-drill-design.md`）。
- 前提合意: 毎日30-40分／ちょこ添削→要約ドリル→論理ドリルを順に巡回／サーバ記録／活動状況に各駅を別枠反映／タイトル「ロジカルツアー」／入口はダッシュボードにデカデカのモーション風ヒーロー／完了判定は実データ基準／「次の駅へ」チェーンを含める。

## 1. 目的とゴール

### 目的
3つの軽量ドリル（ちょこ添削・要約ドリル・論理ドリル）を「毎日30-40分の1本道」として束ね、継続と言語的論理能力の底上げを両立する。各駅は既存機能を流用し、ツアーは「順路・進捗・継続」を与える器に徹する。

### 成功基準（検証可能）
- ダッシュボード最上部に「ロジカルツアー」ヒーローが出て、今日の進捗（3駅）とストリークが分かる
- 「続きから」で未完了の次の駅へ直行し、駅をやり切ると結果画面から「次の駅へ」で次駅へ進める（`?tour=1`時）
- 3駅そろうとヒーローが「本日完走」表示になり、ストリークが加算される（サーバ保存）
- 各駅の完了が管理者の活動状況ヒートマップに**別枠**で出る（論理=既存 `logicDrill`、要約=既存 `drill`、**ちょこを新規追加**）

### 非ゴール
- ツアー専用の管理画面（管理者側は「活動状況にちょこ別枠が増える」だけ）
- 駅の中身の改修（各ドリルの機能自体は変更しない）
- 曜日ごとの出題テーマ最適化・AP連動（将来）

## 2. スコープ（v1）
フルセットを1本で実装する: ヒーロー＋派生進捗＋ストリーク＋`?tour=1`チェーン＋ちょこの活動状況別枠。専用ページは作らず、ヒーロー＋各駅の結果画面差し込みで完結させる。

## 3. 駅（ステーション）定義

| 順 | 駅 | key | 導線URL | 保存コレクション | 日時フィールド | 型 |
|---|---|---|---|---|---|---|
| 1 | ちょこ添削 | `choco` | `/student/essay/choco` | `users/{uid}/chokoReviews` | `createdAt`（ISO文字列） | 既存 |
| 2 | 要約ドリル | `summary` | `/student/essay/summary-drill` | `users/{uid}/summaryDrills` | `completedAt`（Timestamp） | 既存 |
| 3 | 論理ドリル | `logic` | `/student/essay/logic-drill` | `users/{uid}/logicDrills` | `completedAt`（Timestamp） | 既存 |

共通定義は `src/lib/logical-tour/stations.ts` に集約（key/label/href/collection/dateField/順序/**estMinutes**）。「次の駅」算出やヒーロー・API双方がこれを参照する。

各駅の想定所要時間 `estMinutes`（ヒーローの「残り約M分」表示に使用。合計30-40分の目安）: ちょこ=10 / 要約=10 / 論理=15。残り分＝未完了駅の `estMinutes` 合計。

### アクセス/プラン制限
各駅（ちょこ/要約/論理）が生徒にとって利用可能である前提。実装時に各ドリルがプレミアム機能ゲート（`requireFeature`）配下かを確認し、**ツアーは生徒がアクセスできる駅のみを順路に含める**（ゲートで入れない駅へ「続きから」で送らない）。現時点の想定は全生徒が3駅とも利用可。齟齬があれば各ドリルの現行アクセス方針を優先。

## 4. 完了判定・進捗モデル（実データ基準）

### 各駅の「今日の完了」
- その駅の保存コレクションに、**当日（JST）に作成/完了された記録が1件以上**あれば「その駅クリア」。
- 日付境界は **JST（+09:00）固定**。当日 `YYYY-MM-DD` に対し `[date 00:00 JST, 翌日 00:00 JST)` を範囲として各コレクションを問い合わせる。
  - `chokoReviews.createdAt` はISO文字列（choco保存は `new Date().toISOString()` ＝UTC ISO）→ JST日窓をUTC ISOの下限/上限に変換し、`createdAt` の文字列範囲クエリ（ISOは辞書順＝時系列）。
  - `summaryDrills.completedAt` / `logicDrills.completedAt` は Timestamp → 同JST日窓をTimestamp下限/上限に変換して範囲クエリ。
- ツアー・単体どちらで駅をやってもカウントする（同日にその駅を1回やれば良い）。ズル（訪問だけ）は不可。
- `date` はクライアント送信のローカル日付。**uidはトークンから解決**するが date 自体は検証しない＝ストリークは学習継続の可視化目的の best-effort（不正操作に対する厳密性は求めない）。

### ストリーク（継続日数）
- 軽量な単票 `users/{uid}/logicalTour`（単一ドキュメント）に保存: `{ lastCompletedDate: "YYYY-MM-DD", streak: number, longestStreak: number }`。
- **レイジー更新**（sessionの ended 遷移と同じ手口）: 進捗GET時、当日3駅すべて完了かつ `lastCompletedDate !== 今日` なら、
  - `lastCompletedDate === 昨日` → `streak += 1`、そうでなければ `streak = 1`
  - `lastCompletedDate = 今日`、`longestStreak = max(longestStreak, streak)` を保存
- 3駅未完の日は更新しない（＝翌日以降に前回が昨日でなければ自然に途切れる）。
- **同時実行対策**: ヒーローとTourNextButtonが同時にGETを叩くと二重加算しうるため、ストリーク更新は **Firestoreトランザクション**で行い、トランザクション内で `lastCompletedDate !== 今日` を再確認してから加算（同日重複加算を防ぐ＝冪等）。

## 5. API

### `GET /api/student/logical-tour?date=YYYY-MM-DD`
- 認証: `requireRole(["student", "admin", "teacher", "superadmin"])`（他ドリル履歴と同様、uidはトークンから解決。`date` はクライアントのローカル日付）。
- 処理:
  1. 3駅それぞれについて当日の記録有無を判定（§4）
  2. `users/{uid}/logicalTour` を読み、3駅完了なら §4 のレイジー更新
  3. 返却:
     ```ts
     {
       date: string,
       stations: { key: "choco"|"summary"|"logic", done: boolean }[], // 順路順
       completedCount: number,   // 0-3
       allDone: boolean,
       nextStationKey: string | null, // 未完の最初の駅（全完なら null）
       streak: number,
       longestStreak: number,
     }
     ```
- SWRでヒーローが購読。駅完了後にダッシュボードへ戻ると再検証されて進捗が反映される。

## 6. UI

### 6-1. ヒーロー `src/components/student/LogicalTourHero.tsx`（framer-motion）
- ダッシュボード最上部に配置。`GET /api/student/logical-tour` を購読。
- 3状態:
  - **未開始（0/3）**: 「今日のロジカルツアーを始めよう」＋「はじめる」→ 次の駅（`nextStationKey`）へ `?tour=1`
  - **途中（1-2/3）**: 「残り N 駅・約M分」＋進行バー＋「続きから」→ `nextStationKey` へ `?tour=1`
  - **完走（3/3）**: 「本日完走！ ◯日連続」＋きらめき演出。CTAは「今日はおしまい／履歴」
- モーション（framer-motion。追加依存なし＝導入済み）:
  - タイトルのフェード/スケールイン
  - **3駅ドットを結ぶ進行バーが伸びる**アニメ（`completedCount/3`）
  - 完了駅にチェックがポップ、完走時は紙吹雪/きらめき（CSS/motion）
- リンク先は `stations.ts` から解決（駅key→href＋`?tour=1`付与）。

### 6-2. 「次の駅へ」`src/components/student/TourNextButton.tsx`
- 各駅の結果画面に差し込む。`useSearchParams` で `tour=1` の時だけ表示。
- `GET /api/student/logical-tour` を叩き、`nextStationKey` があればその駅へ `?tour=1` で遷移する「次の駅へ →」ボタン、無ければ「ロジカルツアー完走！ ダッシュボードへ」。
- 差し込み先（3ファイル）: `student/essay/choco` 結果表示部、`student/essay/summary-drill`（result step）、`student/essay/logic-drill`（result step）。既存の「もう一度／履歴」ボタン群の並びに追加。

### 6-3. ダッシュボード
- `src/app/student/dashboard/page.tsx` の最上部（`UpcomingSessionCard` の上）に `<LogicalTourHero />` を配置。

## 7. 管理者・活動状況への別枠反映
- 論理ドリル=`logicDrill`（済）、要約=`drill`（既存）。**ちょこを新規追加**:
  - `src/lib/utils/activity-heatmap.ts`: `ActivityHeatmapData` に `choco: number` を追加、sources に `chocoReviews?: Array<{ createdAt?: string }>` を追加、`chokoReviews` を `createdAt` で日別集計（`drill`/`logicDrill` に倣う）。
  - `src/components/admin/ActivityHeatmap.tsx`: `typeLabels` に `choco: "ちょこ添削"` を追加、系列/凡例/合計に `choco` を反映（`logicDrill` 追加時と同じ箇所）。
  - `src/app/admin/students/[id]/page.tsx`: `users/{studentId}/chocoReviews` を取得して `buildActivityHeatmapData` に渡す（`summaryDrills`/`logicDrills` と同一方式）。
- ツアー自体の完了は別枠にしない（各駅で既に記録されるため）。

## 8. エラーハンドリング / エッジ
- 未認証: 401（ヒーローは非表示）。
- コレクション未存在/インデックス未作成: 範囲クエリ失敗時は「その駅は未完」扱いにフォールバック（ヒーローを壊さない）。ストリーク更新失敗はwarnのみで進捗返却は妨げない。
- 日付境界: JST固定。端末時計ズレは軽微として許容（`date` はクライアント送信、範囲はUTC正規化で判定）。
- 3駅の一部が未実装/無効になっても `stations.ts` の順路に従い残りで動く（駅の増減に強い構造）。
- `?tour=1` が無い通常導線では各駅は完全に従来通り（「次の駅へ」は出ない）。

## 9. テスト / 検証
- ローカルは Firebase 未接続のため保存/集計系はデプロイ後の実機確認を明記。
- 検証項目:
  1. 0/3・1/3・2/3・3/3 の各状態でヒーロー表示・CTA遷移先が正しい
  2. 駅を1つやると当日 done になり、`completedCount`/`nextStationKey` が更新される
  3. `?tour=1` で結果画面に「次の駅へ」が出て順路通り遷移、全完で「完走」表示
  4. 3駅完了日にストリークが加算、翌日途切れ/継続が正しい。同日に複数回GETしても二重加算されない（トランザクション冪等）
  5. 管理者の活動状況に「ちょこ添削」枠が別枠で日別表示される。ゲート配下の駅は順路から除外される（該当時）
  6. モバイル幅でヒーローが崩れない
  7. 型チェック・lint クリーン
- ストリーク境界（昨日/一昨日/初日）は純ロジックなので `tsx` 検証スクリプト（`scripts/validate-*` 方式）でユニット検証してもよい。

## 10. 将来拡張（範囲外）
- 曜日別テーマ・所要時間の個別調整、AP/弱点連動の駅内容出し分け
- ツアー完了通知（Push）や保護者共有
- 駅の追加/差し替え（面接ドリル等）を `stations.ts` に足すだけで拡張
