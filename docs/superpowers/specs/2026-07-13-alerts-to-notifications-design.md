# アラート→通知 改称＋活動系通知の追加 設計書

作成日: 2026-07-13
対象: 管理者向けアラート機能（`src/app/admin/alerts`, `src/app/api/admin/alerts`, ナビ, `src/lib/types/admin.ts`）

## 1. 目的とゴール

管理者向けの「アラート」を「通知」に改称し、要注意警告に加えて**生徒の活動を知らせる通知**（添削提出・自己分析完了・書類提出/再提出・面接/スキルチェック完了）を追加する。各通知は**クリックで該当生徒の該当機能へ遷移**して確認できるようにする。

### スコープ（ユーザー決定）
1. **改称**: 「アラート」→「通知」（表示テキストのみ。URL `/admin/alerts` は維持）。宛先は管理者。
2. **活動系通知の追加**（4カテゴリすべて）: 添削を提出・完了 / 自己分析の進捗・完了 / 書類の提出・再提出 / 面接・スキルチェック完了。
3. **深リンク**: 通知クリックで該当生徒の該当タブへ遷移。

### スコープ外
- 生徒向け通知（今回は管理者向けのみ）。
- URL の変更・リダイレクト（表示名のみ改称）。
- プッシュ/メール通知の新規追加（既存 `/api/notifications/*` は変更しない）。

### 現状（コードベース確認済み）
- **既存アラートは都度算出**: `GET /api/admin/alerts` が生徒データ（`lastActivityAt`/`scoreHistory`/`apAlignmentScores`/`weaknesses`/`documents`/`essays`）から `AlertItem[]` を生成。
- **確認済み状態**: `users/{studentUid}/alertAcks/{alertKey}` に doc があれば acknowledged=true。`alertKey(type, discriminator)` で安定 id（`/` を `_` 置換, 300字切り）。
- **AlertItem 型**（`src/lib/types/admin.ts`）: `id, studentUid, studentName, type(8種), severity("critical"|"warning"|"high"), message, detectedAt, acknowledged, recommendedAction?`。
- **生徒詳細ページ** `admin/students/[id]/page.tsx`: `?tab=overview|performance|activity|reports|homework|messages`（`VALID_TABS`）のタブ構造。深リンク可能。
- **ナビの「アラート」表記**: `Header.tsx:50`（ページ名）, `Sidebar.tsx:135`, `BottomNav.tsx:150`（＋43コメント）, `MobileMenuContent.tsx:162`。アイコンは `Bell`。
- **Firestore コレクション**: `essays`（`submittedAt`）, `selfAnalysis`, `interviews`, documents は `documents`。スキルチェックのコレクション名は実装時に確認（`skillChecks` 等）。
- **alerts route の per-student 処理**は既に essays/weaknesses/documents/alertAcks を per-student でクエリ。活動系の追加クエリ（selfAnalysis/interviews/skillChecks）でリード増。

## 2. データモデル拡張（`src/lib/types/admin.ts` の `AlertItem`）

```ts
export interface AlertItem {
  id: string;
  studentUid: string;
  studentName: string;
  type:
    | "inactive" | "declining" | "repeated_weakness" | "document_deadline"
    | "ap_struggle" | "weakness_stuck" | "deadline_risk" | "score_plateau"
    // 追加（活動系）
    | "essay_reviewed"        // 添削を提出・完了
    | "self_analysis_done"    // 自己分析の進捗・完了
    | "document_submitted"    // 書類の提出・再提出
    | "interview_done"        // 模擬面接 完了
    | "skill_check_done";     // スキルチェック 完了
  severity: "critical" | "warning" | "high" | "info"; // info=活動系のお知らせ
  message: string;
  detectedAt: string;
  acknowledged: boolean;
  recommendedAction?: string;
  /** クリックで遷移する先。例 /admin/students/{uid}?tab=activity。省略時は非リンク。 */
  link?: string;
}
```
- `severity` に **`"info"`** を追加（活動系）。既存の severityOrder（並び順）に info を最下位（警告の後）で追加。
- `type` に活動系5種を追加。
- **`link?`** を追加（深リンク）。

## 3. 生成ロジック（`src/app/api/admin/alerts/route.ts`）

- 既存の警告系（inactive/declining/repeated_weakness/document_deadline/ap_struggle/weakness_stuck/deadline_risk/score_plateau）は**一切変更しない**。
- per-student データ収集に、直近の活動を追加取得する（**過去3日以内**を「新着」とみなす。閾値は定数化）:
  - `essays`: 既に最新を取得済み。直近提出があれば `essay_reviewed`。
  - `selfAnalysis`: 完了/更新の最新 `updatedAt`。
  - `documents`: 直近の提出（status 変化）・再提出（`review.state==="resubmitted"`）。
  - `interviews`: 直近の完了。
  - `skillChecks`（コレクション名は実装時確認）: 直近の完了。
- 各活動を `severity:"info"`, 対応する `type`, `message`（例「{生徒名}が添削を提出しました」）で `add()` する。
- **安定キー（discriminator）**: 活動アイテムの id または日付（例 `essay_reviewed__{essayId}` / `self_analysis_done__{yyyy-mm-dd}`）。これにより確認済みが復活せず、同じ活動で通知が重複しない。
- **link**: `/admin/students/{studentUid}?tab=<適切なタブ>`。
  - essay_reviewed → `?tab=activity`
  - self_analysis_done → `?tab=activity`
  - document_submitted → `?tab=reports`
  - interview_done → `?tab=activity`
  - skill_check_done → `?tab=performance`
  - （タブ対応が実装時に不確かなものは `?tab=overview` にフォールバック。生徒詳細に着地すれば確認可能。）
- **並び順**: `severityOrder` に info を追加。**具体マッピング: `{ critical: 0, high: 1, warning: 2, info: 3 }`**（数値小＝上位）。同 severity 内は detectedAt 降順（既存踏襲）。
- **パフォーマンス**: 追加クエリ（selfAnalysis/interviews/skillChecks/documents）は **生徒数 × 種類ぶんのリード増**になる。各クエリは `orderBy(更新日 desc).limit(3)` 程度で絞る。既存の per-student try/catch フォールバック（失敗してもその生徒だけ空扱い）に倣い、活動系クエリ失敗もその種別のみスキップ。大規模 org では BFF 化/キャッシュを将来検討（本リリースは limit で最小化）。

## 4. UI（通知ページ `src/app/admin/alerts/page.tsx`）

- 見出し・文言の「アラート」→「通知」（例「通知」「要注意生徒の通知を確認・管理できます」→活動系も含むので「生徒の状況と活動の通知を確認できます」等に微修正）。
- 各通知を**クリック可能なリンク**にする: `item.link` があれば `Link`（`next/link`）または `router.push(item.link)` で遷移。無ければ従来どおり非リンク。確認済みトグル等のボタンはリンク遷移と競合しないよう `stopPropagation`。
- 表示区分: 「**要注意**（critical/warning/high）」と「**お知らせ**（info）」をセクション or フィルタで分ける（既存の severity 表示・色分けに info を追加、控えめな色）。
- 確認済み（acknowledged）トグルは info にも適用（同じ `POST/DELETE alertAcks` 経路）。
- **既存カウント**（`alertStudentCount`/「要注意生徒数」）は**警告系のみで算出**し、info で水増ししない。`src/app/admin/dashboard/page.tsx` の件数カード等が `/api/admin/alerts` の結果を数えている場合、`severity !== "info"` で絞ってカウントする（活動系は件数バッジに含めない）。

## 5. ナビ・その他表記の改称

| ファイル | 変更 |
|----------|------|
| `src/components/layout/Header.tsx:50` | ページ名「アラート」→「通知」 |
| `src/components/layout/Sidebar.tsx:135` | ラベル「アラート」→「通知」 |
| `src/components/layout/BottomNav.tsx:150`（＋43コメント） | ラベル「アラート」→「通知」 |
| `src/components/layout/MobileMenuContent.tsx:162` | ラベル「アラート」→「通知」 |
| `src/app/admin/alerts/page.tsx` | 見出し・空表示・エラー文言 |
| `src/app/admin/dashboard/page.tsx` | 「アラート」表記（件数カード等） |
| `src/app/admin/settings/page.tsx` | 「アラート」表記 |
| `src/app/admin/students/page.tsx` | 「アラート」表記 |
| `src/lib/email/templates.ts` | 「アラート」表記（メール文面。必要な範囲で） |
| `src/app/api/notifications/alert-digest/route.ts` | ダイジェストメールの「アラート」表記→「通知」。**info（活動系）はダイジェストに含めず警告系のみ**（メールは要注意のみ通知する既存意図を維持） |

- `href="/admin/alerts"` は維持（URL 不変）。
- **alert-digest（メール）は警告系のみ**を対象とし、活動系 info は in-app 通知のみ（メールで活動報告を送らない）。

## 6. 非機能・エッジケース
- **セキュリティ**: 既存の `requireRole` ＋ `scopeByOrganization`（org 内の生徒のみ）を踏襲。活動系通知も同じ org スコープ内でのみ生成。
- **確認済みの復活防止**: 安定キーを活動 id ベースにする（日付バケットのみだと翌日再燃するため、可能な限り itemId を使う）。
- **重複防止**: 同一活動から複数通知を出さない（essay 提出と score 系警告は別 type なので併存は許容）。
- **パフォーマンス**: 追加クエリは `limit` で最小化。per-student 失敗は握りつぶしてその生徒のみスキップ（既存踏襲）。
- **後方互換**: `AlertItem` に追加したフィールド（link, info severity, 新 type）は既存の警告系に影響しない。UI は link 無しでも動く。
- **alertAcks の増加**: 活動系通知を確認済みにすると `users/{uid}/alertAcks/{type__itemId}` が活動ごとに1件残り、無期限に蓄積する（活動id毎のため）。機能上は無害だが、将来 TTL/バッチ削除で古い活動系 ack を掃除する余地あり（本リリースは対応せず注記のみ）。未確認の info は「新着3日」ウィンドウから外れれば自然に消える（ack不要で自己失効）。

## 7. ファイル構成（変更）
| ファイル | 役割 | 種別 |
|----------|------|------|
| `src/lib/types/admin.ts` | AlertItem に info severity・活動系 type・link 追加 | 変更 |
| `src/app/api/admin/alerts/route.ts` | 活動系通知の生成・link 付与・severity 並び | 変更 |
| `src/app/admin/alerts/page.tsx` | 通知への改称・リンク化・要注意/お知らせ区分 | 変更 |
| `src/components/layout/{Header,Sidebar,BottomNav,MobileMenuContent}.tsx` | ナビ改称 | 変更 |
| `src/app/admin/{dashboard,settings,students}/page.tsx` | 表記改称 | 変更 |
| `src/lib/email/templates.ts` | 表記改称（該当範囲） | 変更 |

## 8. 未解決点（実装計画で確定）
- `selfAnalysis`/`interviews`/`skillChecks` の正確なコレクション名・完了判定フィールド（実装時に既存コードで確認。`selfAnalysis`/`interviews` は既存クエリで確認済み、skillCheck 系のみ要特定）。
- 生徒詳細の各タブがどの活動を表示するか（§3 の link タブ割当は暫定。実装時に各タブ内容を確認して最終化。不明時は `?tab=overview` フォールバック）。
- 「新着」の日数閾値（暫定3日）と各活動の取得件数上限（暫定 limit 3）。
- （確定済み）severityOrder=`{critical:0,high:1,warning:2,info:3}`、ダッシュボード件数は info 除外、alert-digest は警告系のみ。
