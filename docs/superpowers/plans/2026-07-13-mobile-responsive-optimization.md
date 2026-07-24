# スマホ画面最適化・レスポンシブ基盤改修 実装計画

> **For Claude Code:** この計画を上から順に実装すること。最初に `AGENTS.md` と本ファイルを最後まで読み、`git status --short` で既存変更を確認する。既存の未コミット変更・未追跡ファイルはユーザー所有物として扱い、本計画と無関係な差分を編集・削除・整形しない。

- 作成日: 2026-07-13
- 対象: Coach v2（CoachFor総合型選抜）
- リポジトリ: `~/Projects/coach-sougou-sentaku-v2/`
- ステータス: Implementation Ready
- 主対象: 生徒・管理者・講師・スーパー管理者ポータルのスマートフォン表示

---

## 1. Goal

スマートフォンで以下を満たすレスポンシブ基盤を作り、主要画面の見切れ・二重スクロール・押しにくい操作・横長UIを解消する。

1. 下部ナビ、ソフトキーボード、ブラウザのアドレスバー変動があっても、コンテンツと主要操作が隠れない。
2. 生徒は、小論文・面接・自己分析・出願書類・チャットの主要フローをスマホだけで完遂できる。
3. 管理者・講師は、閲覧・検索・絞り込み・簡単な更新をスマホで行える。
4. 週カレンダーのD&Dや大規模分析表など、スマホに不向きな操作は無理に縮小せず、日別リストやカード表示を代替として提供する。
5. ページごとの `100vh` 応急処置をやめ、共通の高さ・スクロール・セーフエリア契約に統一する。
6. 今後ページが増えても同種の不具合を再発させない、自動検証可能な構造にする。

### Product hypothesis

ページ単位の余白調整ではなく、共通の「アプリクローム高」「スクロール所有者」「タップ領域」「モバイル用データ表示」を先に定義すれば、現在のブランドとデスクトップ体験を維持したまま、115画面規模でも再発を抑えられる。

---

## 2. Product boundary

### 生徒ポータル

スマホを第一利用端末として扱う。以下はスマホで機能制限なく完遂できること。

- ダッシュボード確認
- 小論文の提出・OCR確認・添削結果確認
- AI面接の開始・実施・終了・結果確認
- 自己分析ワークショップ
- 出願書類の作成・編集・保存・AI添削
- 活動実績の登録
- 管理者・講師とのチャット
- 宿題、成長、面談記録の確認

### 管理者・講師ポータル

スマホでは「状況確認と軽い更新」を中心にする。

スマホ対応するもの:

- 生徒検索・絞り込み・詳細確認
- セッション一覧・日別予定・予定追加
- アラート確認
- メッセージ送受信
- レポート確認・生成
- 講師シフト・担当情報の確認

PC専用のまま残してよいもの:

- 週カレンダー上のD&D移動・リサイズ
- 7列の定期授業マスタ編集
- 多数列を同時比較する分析表
- 印刷専用レイアウト

ただし、PC専用機能を非表示にするだけではなく、スマホには日別リスト、曜日別カード、要点サマリーなどの代替UIを必ず用意する。

---

## 3. Non-goals

この改修では以下を行わない。

- ブランド、カラーパレット、ロゴ、フォントの全面刷新
- Firebase、Firestore、API、認証、課金ロジックの仕様変更
- 画面上の業務用語や既存フローの大幅な変更
- 管理者の週カレンダーD&Dをタッチ操作へ移植
- すべての表をカードへ変換すること
- PWAからネイティブアプリへの移行
- モバイル対応を理由にデスクトップ機能を削除すること
- 本計画と無関係な既存警告・デッドコード・型の整理

---

## 4. Audit findings

### 4.1 実測条件

- ローカル開発サーバー
- モバイルビューポート: 390 x 844
- 共通レイアウト、生徒チュートリアル画面、管理者主要画面を確認
- コード全体では `student` / `admin` / `teacher` / `superadmin` 配下に115個の `page.tsx` が存在

### 4.2 主要な実測結果

| 画面                  | 観測                                                                                                | 影響                                                             |
| --------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `/admin/sessions`     | 共通 `main` は `y=56, h=788`。ページ直下コンテナは `h=780, bottom=836`。下部ナビは `y=783` から開始 | ページコンテンツが下部ナビ背面に約53px入り込む                   |
| `/admin/sessions`     | `main.scrollHeight=860` に加え、ページ内にも `overflow-auto`                                        | 二重スクロールとスクロール位置の予測不能化                       |
| `/admin/sessions`     | タブ・検索・Selectが高さ32px                                                                        | タップしづらく誤操作しやすい                                     |
| `/admin/students`     | フィルター列が `clientWidth=338` に対し `scrollWidth=367`                                           | 横スクロール自体は封じ込められているが、存在が伝わりにくい       |
| `/admin/students`     | 並び替え・フィルターボタンが高さ28〜36px                                                            | タップ領域不足                                                   |
| `/tour/interview/new` | 戻る36px、タブ32px、開始ボタン32px                                                                  | 生徒の主要操作として小さすぎる                                   |
| `/tour/self-analysis` | ステップ表示が354px幅に対して564px                                                                  | 意図した横スクロールだが、残りステップが見えることを示すUIが必要 |

### 4.3 根本原因

1. 共通 `AppLayout` が可視ビューポートを管理している一方、各ページが再度 `100vh` / `100dvh` を引き算している。
2. 共通 `main` とページ内部の両方が縦スクロールを所有している。
3. 下部ナビ高が `60px`、ページ余白が `5rem`、面接画面が `76px` など、同じ意味の数値が複数箇所にハードコードされている。
4. UIプリミティブの既定高がデスクトップ密度を前提としている。
5. 表・週グリッド・操作バーに、モバイル用の情報構造がない。
6. ダイアログの高さ・本文スクロール・セーフエリア対応がページごとに分散している。

### 4.4 代表的な問題箇所

| ファイル                                          | 現状                                           |
| ------------------------------------------------- | ---------------------------------------------- |
| `src/components/layout/AppLayout.tsx`             | `--vvh` と下部余白を管理。基盤として活用可能   |
| `src/components/layout/KeyboardInsetManager.tsx`  | `visualViewport` と `--kb` を管理。維持する    |
| `src/app/admin/sessions/page.tsx`                 | `h-[calc(100vh-64px)]` と内部 `overflow-auto`  |
| `src/app/student/interview/session/[id]/page.tsx` | `h-[calc(var(--vvh,100dvh)-3.5rem-76px)]`      |
| `src/app/student/feedback/page.tsx`               | `h-[calc(var(--vvh,100dvh)-7rem)]`             |
| `src/app/admin/messages/[studentId]/page.tsx`     | `h-[calc(var(--vvh,100dvh)-7rem)]`             |
| `src/components/ui/button.tsx`                    | 既定32px、sm36px、icon32px                     |
| `src/components/ui/input.tsx`                     | 既定32px                                       |
| `src/components/ui/select.tsx`                    | Trigger既定32px                                |
| `src/components/ui/dialog.tsx`                    | 共通の可視領域最大高と本文スクロール契約がない |
| `src/app/student/documents/[id]/page.tsx`         | 保存状態・140px Select・保存ボタンが横一列     |
| `src/components/admin/RecurringMasterPanel.tsx`   | 7列、`min-w-[840px]`                           |
| `src/components/admin/ScheduleGrid.tsx`           | `min-w-[700px]`                                |

---

## 5. Responsive design contract

### 5.1 Test viewport matrix

最低限、以下の幅・高さを基準にする。

| 名前               |     サイズ | 目的                           |
| ------------------ | ---------: | ------------------------------ |
| Small Android      |  360 x 800 | 最小サポート幅                 |
| iPhone SE相当      |  375 x 667 | 高さが短い端末                 |
| Standard iPhone    |  390 x 844 | 主検証端末                     |
| Large phone        |  430 x 932 | 大型スマホ                     |
| Phone landscape    |  844 x 390 | 横向き・短い高さ               |
| Tablet portrait    | 768 x 1024 | タッチ端末とPCレイアウトの境界 |
| Desktop regression | 1280 x 800 | 既存PC表示の後方互換           |

### 5.2 Breakpoint usage

- 0〜639px: スマホ。1カラム、44pxタップ領域、下部ナビあり。
- 640〜1023px: 大型スマホ・タブレット。1〜2カラム、タップ領域は維持。
- 1024px以上: 現行デスクトップ密度。サイドバー、複数カラム、週グリッドを許可。

Tailwindの `lg` を「デスクトップ操作へ切り替える境界」として維持する。`sm` は単なる余白・小規模なカラム切替に使い、タッチ操作を `sm` で急に32pxへ戻さない。

### 5.3 Required layout rules

1. `html` / `body` / アプリルートで意図しない横スクロールを発生させない。
2. 横スクロールを許す場合は、そのコンテナに `data-allow-x-scroll` を付ける。
3. 横スクロールコンテナには、右端フェード、スナップ、説明文のいずれかで続きがあることを示す。
4. 通常ページの縦スクロール所有者は共通 `main` のみ。
5. チャット・面接などの没入画面は、共通 `main` を `overflow-hidden` にし、画面内部のメッセージ領域だけをスクロールさせる。
6. ページから `100vh` / `100dvh` の直接参照を原則排除する。
7. 固定要素は `env(safe-area-inset-*)` と共通クローム変数を参照する。
8. 主要ボタン・入力・Select・アイコンボタンのタップ領域は44 x 44px以上。
9. 本文入力はモバイルで16px以上にし、iOSのフォーカス時自動ズームを防ぐ。
10. 長い大学名・学部名・生徒名を含むflex子には `min-w-0` と適切な `truncate` / `break-words` を付ける。
11. モバイルでは `hover` だけに依存する操作を作らない。
12. 最後の操作要素は下部ナビの上までスクロールできる。

### 5.4 Content density rules

- ページ外側: `px-3` または `px-4`、大型スマホ以上で `sm:px-5`、PCで `lg:px-6`。
- カード内側: スマホ `p-3` または `p-4`、PC `lg:p-6`。
- セクション間: スマホ `space-y-4`、PC `lg:space-y-6`。
- H1: スマホ `text-xl`、PC `lg:text-2xl` を基本とする。
- 補助説明: `text-xs` を許可するが、主要情報は `text-sm` 未満にしない。
- アイコン単体操作は、アイコンが16〜20pxでもボタン外形を44pxにする。

---

## 6. Architecture decision

### 6.1 CSS variables

`src/app/globals.css` の `:root` に、意味のある共通変数を追加する。

```css
:root {
  --app-header-height: 3.5rem;
  --app-bottom-nav-height: 3.75rem;
  --app-safe-top: env(safe-area-inset-top, 0px);
  --app-safe-bottom: env(safe-area-inset-bottom, 0px);
  --app-mobile-bottom-inset: max(
    0px,
    calc(var(--app-bottom-nav-height) + var(--app-safe-bottom) - var(--kb, 0px))
  );
}

@media (min-width: 1024px) {
  :root {
    --app-mobile-bottom-inset: 0px;
  }
}
```

数値は実装時に既存Header・BottomNavの実寸と一致させる。以後、`60px`、`5rem`、`76px` を同じ意味で直書きしない。

### 6.2 App layout mode

新規 `src/lib/ui/app-layout-mode.ts` にルート別の表示モードを集約する。

```ts
export type AppLayoutMode = {
  scrollOwner: "main" | "page";
  hideMobileHeader?: boolean;
};

export function getAppLayoutMode(pathname: string): AppLayoutMode {
  // exact/prefix matchで判定。業務ロジックは置かない。
}
```

初期対象:

| Route                                  | scrollOwner | mobile header                  |
| -------------------------------------- | ----------- | ------------------------------ |
| `/student/interview/session/*`         | `page`      | 非表示。面接内部ヘッダーを使用 |
| `/student/feedback`                    | `page`      | 表示                           |
| `/admin/messages/*` の詳細             | `page`      | 表示                           |
| `/teacher/students/*` のメッセージ詳細 | `page`      | 表示                           |
| その他                                 | `main`      | 表示                           |

`AppLayout` は `usePathname()` でモードを取得し、次を切り替える。

- `main` モード: `min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto`
- `page` モード: `min-h-0 min-w-0 flex-1 overflow-hidden`
- 両モードともモバイル下部インセットを確保するが、スクロールは一方だけが所有する。
- `hideMobileHeader` の場合はHeaderをモバイルだけ非表示にし、PCでは維持してもよい。

### 6.3 New shared layout components

#### `PageContainer`

新規: `src/components/layout/PageContainer.tsx`

目的:

- ページ外側の最大幅、左右余白、上下余白、セクション間隔を統一する。
- `size: "sm" | "md" | "lg" | "xl" | "full"` を持つ。
- `className` を受け取る。
- `data-page-container` を付ける。

想定例:

```tsx
<PageContainer size="lg">
  <PageHeader ... />
  {children}
</PageContainer>
```

#### `FullHeightPage`

新規: `src/components/layout/FullHeightPage.tsx`

目的:

- チャット・面接など、ページ内部でスクロールする画面の共通骨格。
- `h-full min-h-0 min-w-0 overflow-hidden flex flex-col` を持つ。
- `data-full-height-page` を付ける。
- ビューポート計算は持たない。

#### `PageHeader`

新規: `src/components/shared/PageHeader.tsx`

Propsの目安:

```ts
interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  backAction?: () => void;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  compact?: boolean;
}
```

モバイルではタイトル行と操作行を縦積み、`sm` 以上で横並びへ戻す。タイトル領域には必ず `min-w-0` を設定する。

#### `DialogBody`

`src/components/ui/dialog.tsx` に追加する。

- `min-h-0 overflow-y-auto overscroll-contain`
- ダイアログ本文のスクロール所有者にする。
- `DialogHeader` と `DialogFooter` は `shrink-0`。
- ページ側の `max-h-[85vh] overflow-y-auto` を徐々に置換する。

### 6.4 Responsive data pattern

汎用化しすぎない。次の2パターンだけ共通化する。

1. `ResponsiveTableShell`: 横スクロールを許す分析表用。右端フェード、`data-allow-x-scroll`、スクロール説明、sticky headerの土台を持つ。
2. 一覧ページは同じデータから `MobileCardList` と `DesktopTable` をページ内で分岐する。列定義まで抽象化した巨大DataTableは今回作らない。

新規候補:

- `src/components/shared/ResponsiveTableShell.tsx`

---

## 7. File structure

### New files

| ファイル                                         | 責務                                       |
| ------------------------------------------------ | ------------------------------------------ |
| `src/lib/ui/app-layout-mode.ts`                  | ルート別スクロール・モバイルヘッダーモード |
| `src/components/layout/PageContainer.tsx`        | ページ余白・最大幅                         |
| `src/components/layout/FullHeightPage.tsx`       | 没入画面の高さ・overflow契約               |
| `src/components/shared/PageHeader.tsx`           | レスポンシブなページタイトル・操作領域     |
| `src/components/shared/ResponsiveTableShell.tsx` | 意図した横スクロール表の共通枠             |
| `playwright.config.ts`                           | モバイルE2E設定。既存が無い場合のみ新規    |
| `tests/e2e/mobile-layout.spec.ts`                | 横幅・クローム重なり・主要導線スモーク     |

### Foundation files to modify

| ファイル                                   | 変更                                                         |
| ------------------------------------------ | ------------------------------------------------------------ |
| `src/app/globals.css`                      | クローム変数、セーフエリア、横スクロール補助、reduced-motion |
| `src/components/layout/AppLayout.tsx`      | ルート別scroll owner、共通変数利用                           |
| `src/components/layout/Header.tsx`         | 共通高さ、mobile hide対応、長い表示名の収縮                  |
| `src/components/layout/BottomNav.tsx`      | 共通高さ変数、safe area、44px操作領域                        |
| `src/components/ui/button.tsx`             | モバイルタップ領域                                           |
| `src/components/ui/input.tsx`              | モバイル高さ・16px本文                                       |
| `src/components/ui/select.tsx`             | Trigger/Itemのタップ領域                                     |
| `src/components/ui/dialog.tsx`             | 可視領域最大高、DialogBody、sticky footer                    |
| `src/components/ui/sheet.tsx`              | `--vvh`、safe area、本文スクロール                           |
| `src/components/shared/SegmentControl.tsx` | 44px、横スクロール手掛かり、active可視化                     |

### Priority page files to modify

| 優先 | ファイル群                                                                                                                                                                                  |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0   | `admin/sessions`, `student/interview/session`, `student/feedback`, `admin/messages/[studentId]`, `teacher/students`, `student/documents/[id]`                                               |
| P1   | `student/essay/new`, `student/essay/[id]`, `student/self-analysis`, `student/onboarding`, `student/skill-check`, `admin/students`, `admin/students/[id]`, `admin/reports`, `admin/schedule` |
| P2   | admin/superadminの分析・大学・講師・組織一覧、passed-data、pricing、残りの表・モーダル                                                                                                      |

---

## 8. Implementation sequence

実装順は必ず Foundation → P0 → P1 → P2 → QA とする。画面側から先に `vh` を変更すると、共通レイアウト改修時に二度手間になる。

---

## Task 0: Baseline and change isolation

**Files:** 変更なし

- [ ] `AGENTS.md` を読み、Coach v2とノーマルCoachを混同していないことを確認する。
- [ ] `git status --short` を保存し、既存差分の一覧を作る。
- [ ] 本計画と無関係な変更ファイルを編集対象から除外する。
- [ ] `rg -n "100vh|100dvh|h-screen|overflow-x-auto|min-w-\\[" src/app src/components` を実行し、対象一覧を記録する。
- [ ] `npm run dev` を起動し、390 x 844で以下のbeforeスクリーンショットを取得する。
  - `/admin/sessions`
  - `/admin/students`
  - `/tour/dashboard`
  - `/tour/interview/new`
  - `/tour/self-analysis`
- [ ] 現在の `npx tsc --noEmit` と対象lint結果を記録する。既存エラーと新規エラーを区別する。

Expected:

- 既存差分を壊さず、before状態と既存エラーが記録されている。

---

## Task 1: App chrome tokens and layout mode

**Files:**

- Modify: `src/app/globals.css`
- Create: `src/lib/ui/app-layout-mode.ts`
- Modify: `src/components/layout/AppLayout.tsx`
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/components/layout/BottomNav.tsx`

- [ ] `--app-header-height`、`--app-bottom-nav-height`、safe area、`--app-mobile-bottom-inset` を追加する。
- [ ] HeaderとBottomNavの実寸を変数へ一致させる。
- [ ] `getAppLayoutMode(pathname)` を実装する。
- [ ] `AppLayout` を `min-h-0 min-w-0` が途切れないflex構造へ修正する。
- [ ] 通常ページでは `main` だけが縦スクロールするようにする。
- [ ] 没入ページでは `main` を `overflow-hidden` にする。
- [ ] `overflow-y-scroll` の常時スクロールバーはPCだけに限定し、スマホで不要な4px幅を確保しない。
- [ ] モバイル下部余白を共通変数へ置換する。
- [ ] 面接セッションでモバイル共通Headerを隠す場合、内部ヘッダーに戻る導線があることを確認する。
- [ ] `KeyboardInsetManager` は原則変更しない。変更する場合はiOS URLバーとキーボードを混同しないこと。

Validation:

```bash
npx tsc --noEmit
npx eslint src/components/layout/AppLayout.tsx src/components/layout/Header.tsx src/components/layout/BottomNav.tsx src/lib/ui/app-layout-mode.ts
```

Manual:

- 390 x 844でHeader 1つ、BottomNav 1つが表示される。
- mainの下端がBottomNavの上まで到達できる。
- ページ全体の横スクロールが0px。

Recommended commit:

```bash
git add src/app/globals.css src/lib/ui/app-layout-mode.ts src/components/layout/AppLayout.tsx src/components/layout/Header.tsx src/components/layout/BottomNav.tsx
git commit -m "refactor(ui): centralize mobile app viewport layout"
```

---

## Task 2: Shared page shells

**Files:**

- Create: `src/components/layout/PageContainer.tsx`
- Create: `src/components/layout/FullHeightPage.tsx`
- Create: `src/components/shared/PageHeader.tsx`

- [ ] `PageContainer` を実装する。
- [ ] `FullHeightPage` を実装する。`vh` は使わない。
- [ ] `PageHeader` を実装する。
- [ ] `PageHeader` の戻るボタン、タイトル、説明、メタ情報、actionsをモバイルで縦積みできるようにする。
- [ ] 長いタイトル時にactionsが画面外へ押し出されないことを確認する。
- [ ] Storybookは導入しない。既存ページ1つで動作確認する。

Validation:

```bash
npx tsc --noEmit
npx eslint src/components/layout/PageContainer.tsx src/components/layout/FullHeightPage.tsx src/components/shared/PageHeader.tsx
```

---

## Task 3: Mobile touch targets

**Files:**

- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/input.tsx`
- Modify: `src/components/ui/select.tsx`
- Modify: `src/components/ui/textarea.tsx` if required
- Modify: `src/components/shared/SegmentControl.tsx`

### Button decision

デスクトップの密度を維持しつつ、1023px以下では原則 `min-h-11` / `min-w-11` を確保する。視覚上のアイコンサイズは現行のままでよい。

例:

- default/sm/icon: モバイル `min-h-11`、デスクトップ `lg:min-h-0`
- iconはモバイル `min-w-11`
- 本当に44pxが不要な装飾的コントロールだけ明示的なcompact opt-outを許可する

compact opt-outを追加する場合は `touchTarget?: "default" | "compact"` のように型付けし、`className` による場当たり的な `h-6` 上書きを増やさない。

- [ ] Buttonの主要サイズをモバイル44pxへ変更する。
- [ ] Inputをモバイル44px・16px本文へ変更する。
- [ ] SelectTriggerをモバイル44pxへ変更する。
- [ ] SelectItemの上下paddingを増やし、選択肢も押しやすくする。
- [ ] SegmentControlの各tabをモバイル44pxへ変更する。
- [ ] SegmentControlに `data-allow-x-scroll` を付ける。
- [ ] optionsが3件以上で溢れる場合、active tabを `scrollIntoView({block:"nearest", inline:"nearest"})` する。
- [ ] `prefers-reduced-motion` 時はsmooth scrollを使わない。
- [ ] Header、BottomNav、チャット送信、ダイアログcloseでレイアウト崩れがないことを確認する。

Validation:

```bash
npx tsc --noEmit
npx eslint src/components/ui/button.tsx src/components/ui/input.tsx src/components/ui/select.tsx src/components/ui/textarea.tsx src/components/shared/SegmentControl.tsx
```

---

## Task 4: Dialog and Sheet contract

**Files:**

- Modify: `src/components/ui/dialog.tsx`
- Modify: `src/components/ui/sheet.tsx`
- Modify: 長いダイアログ利用コンポーネントは必要箇所のみ

- [ ] `DialogContent` に可視領域基準の最大高を設定する。
- [ ] 上下safe areaを差し引く。
- [ ] `DialogContent` 自体は `overflow-hidden` にする。
- [ ] `DialogBody` を追加し、本文だけ `overflow-y-auto` にする。
- [ ] Header/Footerを `shrink-0` にする。
- [ ] Footerはモバイルで縦積みし、主要ボタンを全幅にする。
- [ ] Closeボタンは44pxタップ領域を確保する。
- [ ] bottom Sheetは `max-height: calc(var(--vvh, 100dvh) - safe-area)` を使用する。
- [ ] `85vh` / `90vh` をページ側で持つ既存ダイアログを、P0対象から共通契約へ移行する。
- [ ] ネストしたスクロール領域が必要な場合、内側には明確な高さ上限とラベルを付ける。

Initial migration targets:

- `src/app/admin/sessions/page.tsx` の手製モーダル2つ
- `src/components/sessions/*DetailDialog.tsx`
- `src/components/self-analysis/StepEditModal.tsx`
- `src/components/student/AdmissionResultDialog.tsx`
- `src/components/admin/RecurringMasterPanel.tsx`

Validation:

- 375 x 667で開閉・本文スクロール・保存・キャンセルがすべて操作可能。
- キーボード表示後もフォーカス中のinputとFooterが到達可能。

---

## Task 5: Admin sessions P0 fix

**Files:**

- Modify: `src/app/admin/sessions/page.tsx`
- Modify: `src/components/admin/AdminSessionList.tsx`
- Modify: `src/components/admin/RecurringMasterPanel.tsx`
- Modify: `src/components/admin/SessionCalendar.tsx` only for desktop containment
- Modify: `src/components/admin/UnplacedStudentsSidebar.tsx` only for desktop containment

### Required changes

- [ ] ルートの `h-[calc(100vh-64px)]` を削除する。
- [ ] モバイルでは通常ページとして共通mainにスクロールさせる。
- [ ] PCのカレンダー領域だけ必要なら `lg:h-full lg:min-h-0` を使う。
- [ ] ページ内 `overflow-auto` を除去し、二重スクロールを解消する。
- [ ] タブを `SegmentControl` へ置換し、モバイルは `fullWidth` にする。
- [ ] 見出しと週操作を `PageHeader` へ移行する。
- [ ] スマホの「カレンダー編集はPCで」の説明を短くし、その直下に日付別セッション一覧を表示する。
- [ ] セッション一覧を「今日」「今後」「過去」に整理するか、少なくとも日付見出しでグループ化する。
- [ ] モバイル一覧に「予定を追加」ボタンを表示する。
- [ ] 予定追加・講師選択の手製 `fixed inset-0` モーダルを共通Dialogへ置換する。
- [ ] モーダル内フォームを1カラム、Footerボタンを全幅へする。
- [ ] `RecurringMasterPanel` の追加フォームをモバイル1カラムにする。
- [ ] 840px週グリッドは `lg:block` に限定する。
- [ ] モバイルでは曜日別セクションまたはアコーディオンで定期授業を表示する。
- [ ] モバイルから有効/無効切替・削除は可能にする。
- [ ] 「今月分を生成」「前月をコピー」「休校日設定」は2行折り返し可能にする。

Acceptance:

- 390 x 844でページ直下要素がBottomNav背面に入らない。
- `main` とページ内部の二重縦スクロールがない。
- 空状態・1件・20件の一覧でレイアウトが崩れない。
- 長い生徒名・講師名がボタンを押し出さない。
- PCの週カレンダーD&Dは既存どおり動く。

Recommended commit:

```bash
git add src/app/admin/sessions/page.tsx src/components/admin/AdminSessionList.tsx src/components/admin/RecurringMasterPanel.tsx src/components/admin/SessionCalendar.tsx src/components/admin/UnplacedStudentsSidebar.tsx
git commit -m "fix(admin): make session management mobile safe"
```

---

## Task 6: Interview session P0 fix

**Files:**

- Modify: `src/app/student/interview/session/[id]/page.tsx`
- Modify: `src/components/interview/InterviewPreflight.tsx`
- Modify: `src/components/interview/CameraPreview.tsx`
- Reuse: `src/components/layout/FullHeightPage.tsx`

### Required changes

- [ ] `h-[calc(var(--vvh,100dvh)-3.5rem-76px)]` を削除する。
- [ ] ルートを `FullHeightPage` で包む。
- [ ] モバイルで共通Headerを隠す場合、内部ヘッダー左端に44pxの戻るボタンを追加する。
- [ ] 内部ヘッダーをスマホで2段構成にする。
  - 1段目: 戻る、大学/学部名、タイマー、終了
  - 2段目: モード、カメラ、カンペ
- [ ] 大学/学部名に `min-w-0 truncate`、actionsに `shrink-0` を設定する。
- [ ] カメラ・カンペ・終了操作を44pxにする。
- [ ] モバイルカンペをチャット上部の `max-h-[38vh]` インライン領域からSheetへ変更する。
- [ ] メッセージ領域だけを `flex-1 min-h-0 overflow-y-auto` にする。
- [ ] 入力・メモ領域は `shrink-0` にし、BottomNav・キーボードより上に収める。
- [ ] テキスト送信ボタンを44pxにする。
- [ ] 発言編集ボタンを `group-hover` のみに依存させず、タッチ端末では常時表示または発言タップメニューから利用できるようにする。
- [ ] メモ展開時もメッセージ領域が0以下にならない。
- [ ] group discussionのstickyテーマとstickyターン表示が重ならないことを確認する。
- [ ] `CameraPreview` の `bottom-24` を共通BottomNav変数へ置換する。
- [ ] Preflightを短い端末高でスクロール可能にする。

Acceptance:

- 375 x 667でヘッダー、最新メッセージ、入力/音声状態が同時に到達可能。
- ソフトキーボード表示時に入力欄と送信ボタンが完全に見える。
- メッセージをスクロールしてもページ外側は動かない。
- カンペを開閉しても会話位置が不必要にジャンプしない。
- 終了ダイアログの主要操作が見切れない。
- PCの左カンペ＋右チャット2カラムは維持される。

---

## Task 7: Chat surfaces P0 fix

**Files:**

- Modify: `src/app/student/feedback/page.tsx`
- Modify: `src/app/admin/messages/[studentId]/page.tsx`
- Modify: `src/app/teacher/students/page.tsx`
- Modify: `src/app/teacher/students/[id]/page.tsx`
- Modify: `src/components/chat/ChatThread.tsx`
- Modify: `src/components/chat/FloatingStudentChat.tsx`

- [ ] 各ページの `h-[calc(...)]` を削除し、`FullHeightPage` へ統一する。
- [ ] チャットカードの外側を `min-h-0 flex-1 overflow-hidden` にする。
- [ ] `ChatThread` のメッセージ領域だけをスクロールさせる。
- [ ] 入力欄は16px以上を維持する。
- [ ] 添付、問題参照、送信ボタンを44pxにする。
- [ ] 添付ファイル名・参照ラベルを `min-w-0 truncate` で収める。
- [ ] 画像/PDF添付が横幅を広げないことを確認する。
- [ ] 講師切替SegmentControlが多い場合は横スクロール手掛かりを表示する。
- [ ] `FloatingStudentChat` のbottom位置を共通変数へ置換する。
- [ ] キーボード表示中はフローティングチャットの高さを `--vvh` 基準にする。

Acceptance:

- 360 x 800でテキスト入力、添付、送信が片手操作できる。
- キーボード開閉で画面が二重に縮まない。
- 最終メッセージが入力欄の背面に隠れない。
- 既読、送信者名、参照カードが長文でも横幅を超えない。

---

## Task 8: Document editor P0 fix

**Files:**

- Modify: `src/app/student/documents/[id]/page.tsx`
- Modify: `src/components/documents/DocumentSectionCoachPanel.tsx`

- [ ] 画面ヘッダーを `PageHeader` へ移行する。
- [ ] 大学名・学部名を折り返しまたは省略できるようにする。
- [ ] EditorPanelの下部操作をスマホで2段にする。
  - 情報行: 文字数、保存状態
  - 操作行: ステータスSelect、保存ボタン
- [ ] 操作行はスマホで全幅。Selectは `flex-1 w-auto`、保存ボタンは十分な幅を持つ。
- [ ] textareaの `min-h-[400px]` を短い端末で見直し、`min-h-[45dvh]` のような直接viewport依存ではなく `clamp()` または段階的固定高を使う。
- [ ] モバイルの保存操作をstickyにする場合、BottomNav変数を参照し、本文を隠さない。
- [ ] Coach panelのモバイルFABを `bottom-6` から共通BottomNav変数へ移行する。
- [ ] AI添削タブとEditorタブの切替後もスクロール位置が破綻しない。

Acceptance:

- 「保存済み 23:59」のような長い状態文でも横スクロールが起きない。
- 360px幅でステータス変更と保存が同時に操作できる。
- iOSでtextareaフォーカス時に自動ズームしない。
- 保存中・成功・失敗状態が見える。

---

## Task 9: Essay, self-analysis, onboarding P1

**Files:**

- Modify: `src/app/student/essay/new/page.tsx`
- Modify: `src/app/student/essay/[id]/page.tsx`
- Modify: `src/components/essay/EssayCoachPanel.tsx`
- Modify: `src/components/essay/ManuscriptEditor.tsx`
- Modify: `src/app/student/self-analysis/page.tsx`
- Modify: `src/app/student/self-analysis/result/page.tsx`
- Modify: `src/components/self-analysis/StepIndicator.tsx`
- Modify: `src/components/self-analysis/WorkshopChat.tsx`
- Modify: `src/app/student/onboarding/page.tsx`

### Essay

- [ ] `essay/new` のStep 1 UI整理設計書と競合する箇所を確認する。
- [ ] 既存未追跡設計 `docs/superpowers/specs/2026-07-13-essay-new-ui-cleanup-design.md` を上書きしない。
- [ ] 提出方法・AP参照先・テーマ・次へを360px幅で確認する。
- [ ] 3択SegmentControlが44pxを維持し、ラベルが切れないことを確認する。
- [ ] 画像アップロードの選択・プレビュー・削除を縦積みにする。
- [ ] OCR確認画面の前へ/次へ/修正をBottomNavに隠さない。
- [ ] 添削結果の5タブは横スクロール＋active可視化を使う。
- [ ] `EssayCoachPanel` のFABを共通BottomNav変数へ移行する。
- [ ] `ManuscriptEditor` のツールバーを折り返し可能にする。
- [ ] hoverでしか見えない赤ペン操作をタッチでも開けるようにする。

### Self-analysis

- [ ] StepIndicatorを `data-allow-x-scroll` 付きにする。
- [ ] 現在ステップが初期表示で必ず見えるようにする。
- [ ] 右端フェードまたは「横にスワイプ」の初回説明を追加する。
- [ ] 木の表示はモバイルで高さを取りすぎないようcompactを維持する。
- [ ] チャット入力・送信を44pxにする。
- [ ] 保存失敗バナーはスマホで縦積みにし、再試行ボタンを押しやすくする。
- [ ] StepEditModalを共通DialogBody契約へ移行する。

### Onboarding

- [ ] 大学カテゴリフィルターを横スクロールSegmentControlへ統一する。
- [ ] 数百大学を全件DOM表示している場合、検索時絞り込み・段階表示・仮想化の必要性を確認する。
- [ ] v1では少なくとも検索欄をstickyにし、選択済み件数と次へを到達しやすくする。
- [ ] 次へ/戻るの操作バーがBottomNavと重ならない。

---

## Task 10: Admin lists and filters P1

**Files:**

- Modify: `src/app/admin/students/page.tsx`
- Modify: `src/app/admin/students/[id]/page.tsx`
- Modify: `src/app/admin/teachers/page.tsx`
- Modify: `src/app/admin/alerts/page.tsx`
- Modify: `src/app/admin/reports/page.tsx`
- Modify: `src/app/admin/schedule/page.tsx`
- Modify: related admin components only as required

### List page pattern

- [ ] モバイル: カード一覧。
- [ ] `sm` または `lg` 以上: 既存table。
- [ ] 検索欄は全幅。
- [ ] 詳細フィルターは「絞り込み」ボタンからSheetへ移す。
- [ ] 選択中フィルターはSheet外にchipで表示し、1タップ解除可能にする。
- [ ] 並び替えはSelect 1つに集約し、高さ44pxにする。
- [ ] 件数・状態・最終活動など、スマホで重要な3〜4項目だけカードに表示する。
- [ ] カード全体をリンクにする場合、内部ボタンとのクリック競合を避ける。

### Student detail

- [ ] 横長TabsをSegmentControlまたはSelectへ置換する。
- [ ] 主要情報、アラート、次のアクションを先頭にする。
- [ ] 表形式の履歴はカードまたは折りたたみへする。
- [ ] stickyタブと共通Headerのtop offsetが競合しないようにする。
- [ ] 長いDialogを共通DialogBodyへ移行する。

### Reports and schedule

- [ ] 週次/月次、一括生成を折り返し可能にする。
- [ ] 生成中・空・失敗状態をモバイルでも表示する。
- [ ] ScheduleGridはPC専用表示とし、スマホは日別/講師別リストを使う。
- [ ] `min-w-[200px]` フィルターをモバイルで `w-full min-w-0` にする。

---

## Task 11: Tables and analytics P2

**Files:**

- Create: `src/components/shared/ResponsiveTableShell.tsx`
- Modify: `src/app/admin/analytics/page.tsx`
- Modify: `src/app/admin/passed-data/page.tsx`
- Modify: `src/app/superadmin/analytics/*`
- Modify: `src/app/superadmin/students/page.tsx`
- Modify: `src/app/superadmin/admins/page.tsx`
- Modify: `src/app/superadmin/teachers/page.tsx`
- Modify: `src/components/superadmin/*Table.tsx`
- Modify: `src/app/student/pricing/page.tsx`
- Modify: その他 `overflow-x-auto` table利用箇所

### Table policy

カードへ変換する表:

- 生徒、講師、管理者、組織などのエンティティ一覧
- セッション、アラート、期限などの行単位アクション一覧
- スマホで1行の主要情報が3〜4項目に収まるもの

横スクロールを維持する表:

- 大学別比較
- 弱点別集計
- BigQuery状態・生データ
- 多列の分析結果
- 料金プラン比較。ただしスマホではプラン別カードを優先表示してもよい

- [ ] 維持する表を `ResponsiveTableShell` で包む。
- [ ] `data-allow-x-scroll` を付ける。
- [ ] 「横にスクロールできます」をスクリーンリーダー向けにも示す。
- [ ] 可能な表は先頭列をstickyにする。
- [ ] ヘッダーはstickyまたはスクロール後も意味が分かるカード構造にする。
- [ ] Recharts親に `min-w-0` を付ける。
- [ ] グラフ凡例を折り返し可能にする。
- [ ] スマホでは軸ラベル数を減らし、Tooltipで詳細を補う。
- [ ] `height={350}` などを画面ごとに確認し、短い端末で初期表示を占有しすぎないようにする。

---

## Task 12: Sticky and floating element audit

**Files:** 検索結果に応じて必要箇所のみ

Search:

```bash
rg -n "sticky top|fixed bottom|bottom-\\[|bottom-[0-9]|top-\\[" src/app src/components
```

- [ ] `EssayCoachPanel`、`DocumentSectionCoachPanel`、`CameraPreview`、`FloatingStudentChat` を共通BottomNav変数へ移行する。
- [ ] `GraduationReminder`、録音バナー、TutorialBanner、ページ内sticky headerの積み重なりを確認する。
- [ ] 同一スクロール領域内に `top-0` が複数ある場合、順序付きoffsetか通常フローへ変更する。
- [ ] 横向き時に固定要素だけで画面高の50%以上を占めないことを確認する。
- [ ] `prefers-reduced-motion` で常時アニメーションを抑制する。

---

## Task 13: Automated mobile regression

**Files:**

- Create if absent: `playwright.config.ts`
- Create: `tests/e2e/mobile-layout.spec.ts`
- Modify: `package.json`

### Test environment

Playwrightは既に依存に含まれている。テスト時はFirebaseクライアント設定を無効化し、devRoleまたは `/tour/*` のモックを使う。

推奨script:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:mobile": "playwright test tests/e2e/mobile-layout.spec.ts"
  }
}
```

Config方針:

- `use.baseURL = http://127.0.0.1:3000`
- `use.reducedMotion = "reduce"`
- `use.locale = "ja-JP"`
- `use.timezoneId = "Asia/Tokyo"`
- 最初はChromium 3 project: 360 x 800、390 x 844、1280 x 800
- Web server起動時に `NEXT_PUBLIC_FIREBASE_API_KEY=''` を渡す
- 既存 `.env.local` を上書きしない

### Required structural assertions

- [ ] `document.documentElement.scrollWidth <= clientWidth + 1`
- [ ] BottomNavの上端と、表示中の主要固定操作が重ならない
- [ ] `data-full-height-page` が親mainのcontent box内に収まる
- [ ] `data-allow-x-scroll` 以外の主要コンテナで `scrollWidth > clientWidth + 1` がない
- [ ] ページ最下部までスクロールしたとき、最後の主要ボタンがBottomNavより上に表示できる
- [ ] Dialogを開き、CloseとPrimary actionがviewport内またはDialogBodyスクロールで到達可能
- [ ] チャット入力にfocus後、入力欄と送信ボタンがviewport内

### Initial route coverage

Student mock routes:

- `/tour/dashboard`
- `/tour/interview/new`
- `/tour/documents`
- `/tour/self-analysis`
- `/tour/universities`

Admin dev routes:

- `/admin/sessions`
- `/admin/students`
- `/admin/reports`
- `/admin/schedule`

スクリーンショット差分は、動的データ・現在日・アニメーションが安定した画面から段階的に追加する。最初から全ページのgoldenを作らない。

Validation:

```bash
npm run test:mobile
```

---

## Task 14: Manual real-device QA

### iPhone Safari

- [ ] 初回表示時のURLバーあり/なし
- [ ] 上へスクロールしてURLバーが展開した状態
- [ ] テキスト入力でキーボード表示
- [ ] 日本語変換候補表示中
- [ ] 画面回転 portrait → landscape → portrait
- [ ] Home indicatorのある端末でBottomNavが被らない
- [ ] PWA standalone表示

### Android Chrome

- [ ] 360px幅
- [ ] 戻るジェスチャー
- [ ] キーボード表示・閉じる
- [ ] ファイル/カメラ選択
- [ ] 長押しやタップでhover依存操作が欠落しない

### Content cases

- [ ] 日本語の長い大学名・学部名
- [ ] 長い生徒名・講師名
- [ ] 0件、1件、100件
- [ ] 長文チャット
- [ ] 添付画像/PDF
- [ ] 保存失敗・API失敗
- [ ] loading skeleton
- [ ] disabled状態
- [ ] ダークモード
- [ ] 文字サイズ拡大

---

## 9. Route priority matrix

### P0: 先にリリースする

| Route                             | 主問題                           | 完了条件                           |
| --------------------------------- | -------------------------------- | ---------------------------------- |
| `/admin/sessions`                 | vh、二重スクロール、週グリッド   | 日別リストと追加がスマホで完遂可能 |
| `/student/interview/session/[id]` | 独自高さ、二重Header、キーボード | 会話と入力が常時到達可能           |
| `/student/feedback`               | 独自高さ、キーボード             | 入力・添付・送信が見切れない       |
| `/admin/messages/[studentId]`     | 独自高さ、キーボード             | 同上                               |
| `/teacher/students/[id]`          | 独自高さ、キーボード             | 同上                               |
| `/student/documents/[id]`         | 横一列操作、FAB                  | 編集・保存・添削が完遂可能         |

### P1: 主要導線

| Route group               | 主問題                               |
| ------------------------- | ------------------------------------ |
| `student/essay/*`         | 複雑なStep、タブ、固定パネル、赤ペン |
| `student/self-analysis/*` | 横長Step、チャット、木の高さ         |
| `student/onboarding`      | 大量大学、操作バー                   |
| `student/skill-check/*`   | 5列指標、試験操作                    |
| `admin/students/*`        | フィルター、table、tabs、長いdetail  |
| `admin/reports`           | 操作列、詳細カード                   |
| `admin/schedule`          | min-widthグリッド                    |

### P2: ロングテール

- admin analytics / passed-data / universities / teachers
- superadmin dashboard / analytics / organizations / admins / teachers / students
- student pricing / passed-data / activity history / result history
- 残りのdialog、table、chart、floating controls

---

## 10. Acceptance criteria / Definition of Done

### Layout

- [ ] 360px幅で意図しないページ全体の横スクロールがない。
- [ ] BottomNavが最後のカード、ボタン、入力欄を隠さない。
- [ ] 通常ページに二重縦スクロールがない。
- [ ] 没入ページはメッセージ/本文領域だけがスクロールする。
- [ ] `100vh` / `100dvh` のページ直書きが、明確な例外を除き解消されている。
- [ ] safe areaがHeader、BottomNav、Dialog、Sheet、FABへ反映されている。

### Interaction

- [ ] 主要操作のタップ領域が44 x 44px以上。
- [ ] hover専用操作がタッチでも利用できる。
- [ ] フォーカス表示が残っている。
- [ ] disabled/loading/error/successが視覚的に判別できる。
- [ ] キーボード表示中も入力と送信/保存が操作可能。

### Content

- [ ] 長い日本語ラベルで横幅を超えない。
- [ ] 省略した情報には詳細を確認する手段がある。
- [ ] 空状態とエラー状態がスマホでも理解できる。
- [ ] 表をカードへ変換した場合、重要な情報と主要actionが欠落していない。

### Regression

- [ ] 1280px以上で既存サイドバー・複数カラム・週カレンダーが維持される。
- [ ] `npx tsc --noEmit` PASS。
- [ ] 変更ファイルのESLintで新規エラー0。
- [ ] `npm run format:check` で新規フォーマットエラー0。
- [ ] `npm run build` PASS。
- [ ] `npm run test:mobile` PASS。
- [ ] iPhone SafariとAndroid ChromeでP0画面を手動確認済み。

---

## 11. Risk management

### Risk 1: UI primitive変更の波及

Button/Input/Selectの高さ変更は全画面へ波及する。

Mitigation:

- モバイルだけ `min-height` を増やし、PCの既存heightは維持する。
- Task 3単独でコミットし、P0画面をすぐ回帰確認する。
- compact opt-outを乱用しない。

### Risk 2: AppLayout変更でスクロール不能

`min-h-0` や `overflow-hidden` の設定漏れで、画面がスクロールできなくなる可能性がある。

Mitigation:

- scroll ownerをルート設定で明示する。
- `FullHeightPage` を使用するページだけ `page` modeにする。
- 1画面ずつ追加し、ルート一覧をテストする。

### Risk 3: キーボード端末差

`visualViewport` の挙動はiOS Safari、PWA、Androidで異なる。

Mitigation:

- `KeyboardInsetManager` の既存設計を維持する。
- vhの再計算をページ側に追加しない。
- 実機QAを必須にする。

### Risk 4: 既存作業との競合

現在のworktreeには未コミット変更と未追跡設計書がある。

Mitigation:

- `git status` を毎タスク前に確認する。
- 無関係ファイルをformatしない。
- `git add` は明示ファイルだけにする。
- `git reset --hard`、`git checkout --` を使わない。

### Risk 5: すべてを一度に変更してレビュー不能

Mitigation:

- Foundation、P0、P1、P2を別コミット/別PRにする。
- 各PRにbefore/afterスクリーンショットを付ける。
- API/データ変更とレスポンシブ変更を同じコミットに混ぜない。

---

## 12. Recommended delivery slices

### PR 1: Responsive foundation

- AppLayout mode
- CSS variables
- PageContainer / FullHeightPage / PageHeader
- Button/Input/Select/SegmentControl
- Dialog/Sheet
- 基本Playwright mobile test

### PR 2: Critical student flows

- Interview session
- Student feedback
- Document editor
- Essay fixed/FAB areas

### PR 3: Admin mobile operations

- Admin sessions
- Admin messages
- Students list/detail
- Reports/schedule

### PR 4: Long-tail data views and QA

- Analytics/tables
- Superadmin
- Remaining modal/sticky/floating audit
- Real-device QA fixes

---

## 13. Rough estimate

単独実装者の目安。既存データや認証問題の調査時間は含めない。

| Slice                      |       目安 |
| -------------------------- | ---------: |
| Foundation                 |   3〜4人日 |
| P0 student/chat/document   |   3〜5人日 |
| Admin sessions/lists       |   3〜5人日 |
| P1/P2 long tail            |   4〜6人日 |
| Automated + real-device QA |   2〜3人日 |
| 合計                       | 15〜23人日 |

主要な見切れ解消だけを先行する場合、Foundation + P0で6〜9人日を最初のリリース目標にする。

---

## 14. Claude Code execution instructions

Claude Codeへは以下の指示と本ファイルパスを渡す。

```text
AGENTS.md と
docs/superpowers/plans/2026-07-13-mobile-responsive-optimization.md
を最後まで読んで、この計画を上から順に実装してください。

重要:
- このリポジトリは CoachFor総合型選抜 v2 です。study-quest は触らないでください。
- 最初に git status --short を確認し、既存の未コミット変更を保存してください。
- 無関係な変更を削除・整形・上書きしないでください。
- API、Firestore、認証、AIプロンプトの仕様は変更しないでください。
- Foundationを先に実装し、その後P0画面へ進んでください。
- 各Task完了ごとに tsc、対象eslint、該当viewportの画面確認を行ってください。
- 画面側に新しい100vh/100dvhのマジックナンバーを追加しないでください。
- PC専用の週カレンダーや分析表は削除せず、スマホに代替UIを追加してください。
- コミットは本計画のRecommended delivery slicesに沿って分けてください。
- 各PR/コミットの報告には、変更ファイル、検証結果、残課題、before/afterを含めてください。
```

最初の実装範囲を小さくする場合は、Claude Codeに次のように追加する。

```text
今回は Task 0〜Task 8（Foundation + P0）まで実装し、Task 9以降は着手せず、残作業として報告してください。
```

---

## 15. Final handoff checklist

- [ ] 既存差分を維持した
- [ ] Foundationが先に入った
- [ ] P0画面で見切れが解消した
- [ ] PC表示を回帰確認した
- [ ] mobile structural testsを追加した
- [ ] 実機QA結果を記録した
- [ ] 残りのP1/P2画面を一覧化した
- [ ] 新たなマジックナンバーを追加していない
- [ ] 仕様変更が必要になった場合は実装せず、判断点としてユーザーに戻した
