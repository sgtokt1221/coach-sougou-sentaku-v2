# セッション種別の統合（探究授業を種別へ・レガシー非表示）設計書

作成日: 2026-07-13
対象: セッション（面談/模擬面接/探究授業）のスケジュール・作成・詳細（`admin/sessions/*`, `src/lib/types/session.ts`）

## 1. 目的とゴール

セッションの「種別」と「探究授業（isResearch）」が別軸（セレクト＋別チェックボックス）になっていて分かりにくい。**探究授業を種別セレクトに統合**し、レガシー種別を選択肢から隠し、各種別に補足を付けて違いを明確化する。**データ構造（`type` + `isResearch`）は変更しない**（UIのみ統合、後方互換維持）。

### スコープ（ユーザー合意）
1. **探究授業を種別に統合**: 各画面の「種別」を1つのセレクトにし、選択肢に「探究授業」を追加。**別の探究チェックボックスは廃止**。
2. **レガシー種別を選択肢から隠す**: コーチング(coaching)・小論文レビュー(essay_review) は面談に統合済み。選択肢から除外（古い記録の表示ラベルとしては `SESSION_TYPE_LABELS` に残す＝後方互換）。
3. **補足で違いを明示**: 面談＝1対1全般 / 模擬面接＝要約が面接特化 / 探究授業＝生徒が講師に教える回。

### スコープ外
- データモデル変更（`SessionType` enum や `isResearch` フラグの構造は不変）。
- 探究授業の中身（専用レイアウト・AI講評・録音等）の変更。
- グループ添削（group_review）フローの変更（新規作成の別経路のまま）。
- **表示系の変更なし**: スケジュールのセル・履歴一覧・ダッシュボード等の**表示**は不変（本設計は「作成・編集UIの種別選択」のみ統合する）。探究セッションのセル上の見え方（黄色ハイライト等）は現状維持。
- **他の作成導線**（定期授業マスタ `RecurringMasterPanel` 等）は本スコープ外。ただし §4 の整合注意を参照。

### 現状（コードベース確認済み）
- 型 `src/lib/types/session.ts`:
  - `SessionType = "coaching" | "mock_interview" | "essay_review" | "general" | "group_review"`。
  - `SESSION_TYPE_LABELS`: coaching=コーチング / mock_interview=模擬面接 / essay_review=小論文レビュー / general=面談 / group_review=グループ添削。
  - `SESSION_TYPE_CREATE_OPTIONS = ["general","mock_interview","group_review"]`（coaching/essay_review は面談に統合済みのレガシー）。
  - `isResearch?: boolean`（探究授業。type と別軸）。
- **セル追加モーダル**（`admin/sessions/page.tsx` L487-514）: 種別 select（CREATE_OPTIONS から group_review 除外＝面談/模擬面接）＋ 探究チェックボックス（`formIsResearch`）。作成は `createSessionAt(..., formType, formIsResearch)`。
- **新規作成**（`sessions/new/page.tsx`）: `type` state ＋ `isResearch` state。種別 select（L251-）＋ 探究チェックボックス。送信で type/isResearch を渡す。group_review は別経路（締切ベース）。
- **詳細**（`sessions/[id]/page.tsx`）: タイプ表示＋編集 select（L324-336, **`Object.entries(SESSION_TYPE_LABELS)` 全5種を列挙＝レガシーも表示**）。探究チェックボックス（L374-386, `patchSession({isResearch})`）。`isResearchSession = !!session.isResearch && type!=="group_review"`（L287）で専用レイアウト分岐。

## 2. 設計: UI用の「種別（SessionKind）」抽象

`type` + `isResearch` の2軸を、UI では**1つの種別 `SessionKind`** に射影する。データは従来どおり `type`/`isResearch` で保存。

`src/lib/types/session.ts` に追加:
```ts
/** UI上の種別（type + isResearch を1軸に射影）。データは従来の type/isResearch で保存。 */
export type SessionKind = "general" | "mock_interview" | "research" | "group_review";

export const SESSION_KIND_LABELS: Record<SessionKind, string> = {
  general: "面談",
  mock_interview: "模擬面接",
  research: "探究授業",
  group_review: "グループ添削",
};

/** 各種別の1行補足（違いの明示）。 */
export const SESSION_KIND_DESCRIPTIONS: Record<SessionKind, string> = {
  general: "1対1の全般セッション",
  mock_interview: "面接練習（要約・振り返りが面接特化）",
  research: "生徒が講師に教える回（探究授業）",
  group_review: "グループ添削（別フロー）",
};

/** カレンダー/1対1作成で選べる種別（group_review は別経路）。 */
export const SESSION_KIND_CREATE_OPTIONS: SessionKind[] = ["general", "mock_interview", "research"];

/** SessionKind → 保存用の { type, isResearch }。 */
export function kindToTypeResearch(kind: SessionKind): { type: SessionType; isResearch: boolean } {
  if (kind === "research") return { type: "general", isResearch: true };
  return { type: kind as SessionType, isResearch: false };
}

/** 保存済み { type, isResearch } → UI種別。isResearch 優先、レガシー(coaching/essay_review)は面談へ寄せる。 */
export function typeResearchToKind(type: SessionType, isResearch?: boolean): SessionKind {
  if (isResearch) return "research";
  if (type === "mock_interview") return "mock_interview";
  if (type === "group_review") return "group_review";
  return "general"; // general + レガシー(coaching/essay_review) はすべて面談
}
```

- `SESSION_TYPE_LABELS`（全5種）は**表示専用として残す**（既存の履歴・一覧の表示に使用）。選択肢だけ SessionKind に切り替える。

## 3. 各画面の変更

### (A) セル追加モーダル `admin/sessions/page.tsx`
- 種別 select を **`SESSION_KIND_CREATE_OPTIONS`（面談/模擬面接/探究授業）** に置換。option ラベルは `SESSION_KIND_LABELS`、各 option の下 or セレクト下に `SESSION_KIND_DESCRIPTIONS` の補足を1行表示（選択中の種別の説明）。
- **探究チェックボックス（L505-514）を削除**。
- state を `formKind: SessionKind`（既定 "general"）に。作成時 `const { type, isResearch } = kindToTypeResearch(formKind)` に変換して `createSessionAt(..., type, isResearch)` を呼ぶ（`createSessionAt` の引数は不変）。

### (B) 新規作成 `sessions/new/page.tsx`
- 「セッションタイプ」select を `SESSION_KIND_CREATE_OPTIONS` ＋ group_review を含む形に（新規作成は group_review も選べる＝`["general","mock_interview","research","group_review"]` を使うか、既存の group_review 特別扱いを維持しつつ kind に group_review を足す）。補足文言を表示。
- **探究チェックボックス削除**、`isResearch` state を `kind` に統合。送信時 `kindToTypeResearch(kind)` で `type`/`isResearch` を決定。group_review 選択時の締切ベース別経路（`type==="group_review"` 分岐）は維持。
- `canSubmit` 等の `type` 参照は `kind`→`type` 変換後の値 or `kind` で判定（group_review 判定は `kind === "group_review"`）。
- **group_review と research は排他**（グループ添削は探究にならない）。`kindToTypeResearch("group_review")` は `{type:"group_review", isResearch:false}` を返すため自然に排他になる（kind が単一選択なので併存不可）。

### (C) 詳細 `sessions/[id]/page.tsx`
- タイプ編集 select を **`Object.entries(SESSION_TYPE_LABELS)` 全列挙から `SESSION_KIND_CREATE_OPTIONS` に変更**（レガシー非表示）。**ただし現在のセッションが `type==="group_review"` の場合は選択肢に `group_review` を含める**（既存のグループ添削セッションを開いたときに種別を強制変更させないため）。具体的には `options = currentKind === "group_review" ? [...SESSION_KIND_CREATE_OPTIONS, "group_review"] : SESSION_KIND_CREATE_OPTIONS`。現在値は `typeResearchToKind(session.type, session.isResearch)` で初期化。
- 変更時 `kindToTypeResearch(kind)` → `patchSession({ type, isResearch })`（type と isResearch を同時更新）。
- **探究チェックボックス（L374-386）を削除**（種別で選べるため）。
- 表示（読み取り時）の「タイプ:」は、`isResearch` なら「探究授業」、それ以外は `SESSION_TYPE_LABELS[type]`（レガシーも正しく表示）。`isResearchSession` の分岐（L287）は不変。

## 4. 非機能・エッジケース
- **後方互換**: 既存セッションの `type`（coaching/essay_review 含む）と `isResearch` はそのまま。表示は `SESSION_TYPE_LABELS`/`typeResearchToKind` で正しく面談/探究に寄る。編集で保存すると general/mock_interview/research/group_review に正規化される（レガシー値は保存時に一般化＝許容）。
- **research × 他 type の併存**: 旧データで `isResearch=true && type==="mock_interview"` があっても、UIでは「探究授業」に寄せる（研究は専用レイアウトのため mock_interview 観点は不要）。再保存で type=general,isResearch=true に正規化。仕様として許容。
- **group_review**: セル追加モーダルでは従来どおり非表示（別経路）。新規作成では従来どおり選択可（kind に含める）。
- **セキュリティ/権限・作成API**: 変更なし（`createSessionAt`/`patchSession`/新規作成APIの引数・保存形式は不変。UIが渡す値の決め方だけ変更）。
- **他の作成導線との整合**: 定期授業マスタ `RecurringMasterPanel` 等、本スコープ外の作成面が `type`/`isResearch` をどう扱うか実装時に軽く確認する。定期授業は 1対1 の面談/模擬面接が主で探究授業は想定しない見込み（探究チェックが無ければ現状のまま整合）。もし探究チェックを持つ別導線があれば、統一のため別タスクで同様に統合する（本設計では触らない）。

## 5. ファイル構成（変更）
| ファイル | 役割 | 種別 |
|----------|------|------|
| `src/lib/types/session.ts` | `SessionKind`・ラベル・補足・変換関数を追加（既存型は不変） | 変更 |
| `src/app/admin/sessions/page.tsx` | セル追加モーダルの種別統一・探究チェック廃止 | 変更 |
| `src/app/admin/sessions/new/page.tsx` | 新規作成の種別統一・探究チェック廃止 | 変更 |
| `src/app/admin/sessions/[id]/page.tsx` | 詳細の種別セレクトをレガシー非表示・統一、探究チェック廃止 | 変更 |

## 6. 検証
- `npx tsc --noEmit` PASS、`npx eslint`（各ファイル）新規エラー増分ゼロ。
- 機能保全: 面談/模擬面接/探究授業/グループ添削の作成、詳細での種別変更、探究の専用レイアウト表示、既存(レガシー含む)セッションの表示——いずれも従来どおり。
- 実機目視: セル追加→種別3択（面談/模擬面接/探究授業）＋補足、探究チェックが消えたこと、詳細の種別セレクトにレガシーが出ないこと。

## 7. 未解決点（実装時確認）
- 新規作成 `sessions/new` の group_review 特別扱い（締切・生徒無し）と kind 統合の噛み合わせ（`kind==="group_review"` で既存の group_review 分岐に流す）。
- 補足文言の表示位置（select 下の1行 or option 内）。既存UIに馴染む形で。
- 詳細の読み取り表示「タイプ:」を `isResearch` 優先で「探究授業」と出すか（推奨）。
