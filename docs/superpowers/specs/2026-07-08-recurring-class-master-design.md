# 定期授業マスタ 設計書

- 日付: 2026-07-08
- 対象: Coach for 総合型選抜（v2 / `coach-sougou-sentaku-v2`）
- 位置づけ: コーチプランの「毎週同じ枠」で続く1:1授業を、テンプレ（マスタ）や前月コピーから月次一括生成する機能。個別作成の手間と割当ミス（担当ズレ）を削減する。

## 1. 目的とゴール

### 目的
同じ生徒×担当講師×曜日・時刻で毎週続く1:1授業を、1件ずつ手作成する運用をやめ、マスタ or 前月から月次一括生成する。担当・種別が固定され、割当ミス（今回の「テスト先生のまま録音→403/録音消失」の遠因）を防ぐ。

### 成功基準（検証可能）
- 管理者が定期授業テンプレを登録でき、対象月を選んで一括生成できる
- 「前月をそのままコピー」で前月の1:1授業パターンを当月に複写できる
- 生成時、**設定画面で登録した休校日**に該当する日は作成されない
- 同一生徒×同一日時の**重複は作られない**（再生成しても増殖しない）
- 一括生成で**生徒へのPush通知が飛ばない**
- マスタ一覧・週スケジュールに **生徒名／担当講師名／種別** が表示される

### 非ゴール（v1範囲外）
- グループ講座（group_review）のテンプレ化
- 祝日の自動スキップ（祝日も基本は授業ありのため考慮しない）
- 生徒/講師の個別都合による自動休講、iCal同期、他システム（つくばホーム）連携
- 生成済みインスタンスの一括編集（個別の削除/キャンセルは既存導線で可）

## 2. スコープ（v1）
- **1:1セッションのみ**（coaching / mock_interview / essay_review / general）
- 休校日は **Coach v2 独自**。**設定画面で登録した休校日のみ**を除外基準とする（祝日自動スキップなし）
- 生成方法は2系統（共通エンジン）: ①マスタから ②前月コピー

## 3. データモデル

### 定期授業テンプレ `recurringClassTemplates/{id}`
```ts
export interface RecurringClassTemplate {
  id: string;
  studentId: string;
  studentName: string;      // 表示用スナップショット
  teacherId: string;
  teacherName: string;      // 表示用スナップショット
  type: SessionType;        // 1:1系のみ（group_review不可）
  weekday: number;          // 0=日 .. 6=土
  startTime: string;        // "HH:MM"
  duration?: number | null; // 分（任意）
  format?: "online" | "offline";
  active: boolean;          // 生成対象か
  createdByAdminId: string;
  organizationId?: string;  // 組織スコープ
  createdAt: string;
  updatedAt: string;
}
```

### 休校日 `closureDays/{id}`
```ts
export interface ClosureDay {
  id: string;
  organizationId: string;   // 塾別
  date: string;             // "YYYY-MM-DD"
  note?: string;            // 任意（例: お盆・年末年始）
  createdByAdminId: string;
  createdAt: string;
}
```
- 組織別。1日1件（同一 org+date は重複作成しない）。
- 設定画面で登録・削除。生成時に「その org の該当日集合」を参照して除外。

## 4. 生成エンジン（1つ・2つの入力源）

「スロット集合 → 対象月の該当曜日に1:1セッションを作成」を共通化する。

### スロット
`{ studentId, studentName, teacherId, teacherName, type, weekday, startTime, duration?, format? }`

### 入力源
- **A: マスタから** — 対象 org の `active === true` テンプレをスロットに変換
- **B: 前月コピー** — **前月（対象月の1つ前のカレンダー月）**の対象 org の1:1セッション群からスロットを抽出（各セッションの `scheduledAt` から weekday/startTime、studentId/teacher/type を取得）。同一スロット（生徒×曜日×時刻×種別）は1つに集約。
  - **`status` が `cancelled`（欠席）のセッションは抽出対象外**（休講/欠席は複写しない）。それ以外（scheduled/in_progress/completed/ended）は枠として採用

### 生成手順（対象月 `YYYY-MM`）
1. 対象 org の休校日集合 `Set<YYYY-MM-DD>` を取得
2. 対象 org の当月既存セッションを取得（重複判定用）
3. 各スロットについて、当月内の該当 weekday の各日付 `d` で:
   - `d` が休校日 → **skippedClosure**（作らない）
   - `scheduledAt = ${d}T${startTime}:00`（個別作成 POST と同一フォーマット）。同一 studentId × 同一 scheduledAt の既存があれば → **skippedDuplicate**（重複判定はこの文字列一致）
   - それ以外 → 生成対象に追加
4. 生成対象を `sessions` に一括作成（`status: "scheduled"`, `createdByAdminId`, `sharedWithStudent: false`, `notes: null`）。**`notifyStudentOfSession` は呼ばない（通知なし）**
   - `sharedWithStudent: false` は**「指導報告書(summary)の共有可否」**の意味で、**セッション予定そのものの生徒表示とは無関係**。生徒は自分の studentId のセッションを常に見られる（既存の生徒側 GET は自分のセッションを sharedWithStudent に関わらず返す）ため、生成した予定は生徒のスケジュールに出る。
   - **Firestore バッチは1回500件上限**のため、生成件数が多い場合は500件ごとに分割コミットする。

### 2フェーズ（プレビュー→確定）
- `dryRun: true` … 生成対象・skippedClosure・skippedDuplicate の**件数と一覧**を返すだけ（書き込まない）
- `dryRun: false` … 上記結果で実際に作成

### 決定性 / タイムゾーン
- 日付はローカル日付（JST運用）。当月の日付列挙は `YYYY-MM` から純関数で生成（乱数・argless `new Date()` 不使用、`new Date("...")` は可）。

## 5. API（すべて `requireRole(["admin","teacher","superadmin"])` ＋ 組織スコープ）

- **テンプレCRUD** `/api/admin/recurring-templates`
  - `GET` 自 org のテンプレ一覧
  - `POST` 作成（1:1種別のみ許可）
  - `PATCH ?id=` 更新（active切替含む） / `DELETE ?id=` 削除
- **休校日CRUD** `/api/admin/closure-days`
  - `GET ?month=YYYY-MM`（or 全件）自 org の休校日
  - `POST` 追加（org+date 重複は無視 or 409） / `DELETE ?id=` 削除
- **生成** `POST /api/admin/sessions/generate`
  - body: `{ month: "YYYY-MM", source: "master" | "previous-month", dryRun: boolean }`
  - スコープ: 自 org のテンプレ/前月セッション/休校日のみ対象。作成する session の `createdByAdminId` は呼び出し元
  - 返却: `{ created?: number, toCreate: SessionPreview[], skippedClosure: SessionPreview[], skippedDuplicate: SessionPreview[] }`（dryRun時は created 無し）

`SessionPreview = { studentName, teacherName, type, scheduledAt }`

## 6. UI

### `/admin/sessions` に「マスタ」タブを追加
既存の週カレンダー（スケジュール）はそのまま。タブ切替でマスタ管理へ。
- **テンプレ一覧**: 行ごとに **生徒名 / 担当講師名 / 種別 / 曜日 / 時刻 / active**。追加・編集・削除。
- **アクション**: 「今月分を生成」「前月をコピー」→ **プレビュー・モーダル**（作成N件／休校でスキップM件／重複スキップK件＋一覧）→「確定して作成」
- 生成結果は既存の週カレンダーに反映（再取得）

### 休校日設定
- 設定画面（`/admin/settings/closure-days` 等、または「マスタ」タブ内の設定セクション）で休校日を**日付追加/削除**（メモ任意）。組織別。
- ここで登録した休校日が生成の除外基準になる。

### スケジュール表示の強化
- 週カレンダー（既存 `SessionCalendar` / `AdminSessionList`）の各セッション表記に **生徒名 / 担当講師名 / 種別** を出す（不足していれば追加）。

## 7. エラーハンドリング / エッジ
- テンプレの種別が group_review → 400（1:1のみ）
- 生成で対象スロット0 / 当月に該当曜日が無い → 作成0件（正常）
- 休校日で全滅 → 作成0件＋skippedClosure一覧で理由が分かる
- 重複は必ずスキップ（二重生成防止）。同月で再度「生成」しても増えない
- 組織越境不可（他塾のテンプレ/セッション/休校日は対象外）
- 通知は生成では一切送らない（個別の手動作成は従来どおり通知あり）
- `duration`/`format` 未設定テンプレは既定（duration=null, format=offline）で作成
- **名前スナップショット**（studentName/teacherName）は登録時点の値。改名時は古い表示になりうるが、テンプレ編集・再登録で更新される（v1は許容）
- **生成はテンプレの整合を再検証しない**（生徒のプラン=coach か、担当が有効か等はチェックしない）。生徒が退会・担当変更した場合は**管理者がテンプレを非active/削除して運用**する。将来（v2）で退会検知の非active化を検討

## 8. テスト / 検証
- 純ロジック（当月の weekday 日付列挙、休校日スキップ、重複判定、前月スロット抽出）は `tsx` 検証スクリプト（`scripts/validate-*` 方式）でユニット検証
  - 例: 2026-07 の水曜日一覧、休校日除外、既存重複除外、前月→当月のスロット変換
- `tsc --noEmit` / `eslint` クリーンを完了条件
- 実機（デプロイ後・ローカルFirebase未接続）: テンプレ登録→生成プレビュー→確定→週カレンダー反映→通知が飛ばない→休校日除外、を確認

## 9. 将来拡張（v2）
- グループ講座テンプレ、iCal購読、生徒/講師の都合による自動休講、生成インスタンスの一括編集、他システム（つくばホーム）連携インポート
