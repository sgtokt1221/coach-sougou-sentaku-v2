# UI監査 修正プラン（スマホ／タブレット含む） 2026-07-25

## 0. このドキュメントの位置づけ

Coach v2（CoachFor総合型選抜）のUIをスマホ・タブレット幅を含めて監査した結果と、その修正計画。
監査は 2026-07-25 実施。対象コミット時点の `src/` 全体（tsx 380ファイル）。

---

## 1. 監査方法（再現手順）

### 1-1. 静的解析
`src/` 全体に対して以下を走査した。

| 観点 | 結果 |
|---|---|
| 固定幅 `w-[NNNpx]` / `min-w-[NNNpx]` が 320px 以上 | 13件。うち実害のあるものは 0件（大半が `lg:` 前置または `max-w` / `vw` 併用） |
| `grid-cols-3` 以上でレスポンシブ前置なし | 19件。カレンダー(7列)・統計行(5列)など意図的なもののみ |
| `<table>` を持つファイルの `overflow-x` ラッパー有無 | 19ファイル全てにラッパーあり（欠落なし） |
| `fixed` 配置要素の重なり | 11件を目視確認。1件に実害（後述 B-1） |
| `sticky top-0` の多重定義 | 2件が同一スクロールコンテナに同居しうる（後述 B-3） |
| `100vh`(`h-screen`) と `dvh` の混在 | `h-screen` 15件 / `dvh` 5件。ログイン画面に実害（後述 A-3） |

### 1-2. 実描画による実測
Playwright（chromium）で以下を自動計測した。

- ルート: `/tour/dashboard`, `/tour/self-analysis`, `/tour/essay/new`, `/tour/interview/new`, `/tour/universities`, `/tour/documents`, `/tour/skill-check`, `/tour/complete`, `/`, `/login`
- ビューポート: 360×780 / 390×844 / 768×1024 / 1024×800（<768 は `isMobile` + `hasTouch`）
- 計測項目: `documentElement.scrollWidth - clientWidth`（横溢れ）、溢れ要素の特定、24px未満のタップ領域、ヘッダー内のロゴ×タイトルの矩形交差、コンソールエラー

`/tour/*` は認証不要かつ実際の生徒ページをモックデータで再利用しているため（`src/app/tour/layout.tsx`）、実画面の検証手段として使える。

### 1-3. 検証範囲の限界

- **実描画で確認できたのは `/tour/*` と `/login` のみ。** 管理者・講師・スーパー管理者ポータルは静的解析のみで、実画面は見ていない。
- ただし A-1（ヘッダー）と A-2（BottomNav）は共通コンポーネントのため、全ポータルに影響する。
- 実機（iOS Safari / Android Chrome）での確認は未実施。A-3 はアドレスバー由来のため、実機確認が必須。

---

## 2. 監査結果サマリ

### 問題なしを確認できた点
- **横スクロール溢れ: 全ルート・全ビューポートで 0px**
- テーブル19ファイル全てに `overflow-x` ラッパーあり
- 自己分析の `StepIndicator` の見切れは、横スクロール＋右端フェード＋現在ステップへの自動スクロールが実装済みで意図通り（`src/components/self-analysis/StepIndicator.tsx:22-39,104-105`）
- コンソールエラー 0件

### 検出した不具合
| ID | 内容 | 影響範囲 | 優先度 |
|---|---|---|---|
| A-1 | タブレット幅でヘッダーのロゴとページタイトルが重なる | 全ポータル / 768–1023px | 高 |
| A-2 | BottomNav の「Action!」ラベルだけ12px下にずれ下端に張り付く | 全生徒画面 / 常時 | 高 |
| A-3 | ログイン画面モバイルが `h-screen`(100vh) でアドレスバー分はみ出す | ログイン / iOS・Android実機 | 高 |
| A-4 | チュートリアルバナーの「終了」が「終／了」に縦割れ | `/tour/*` / 390px以下 | 中 |
| A-5 | ログイン画面スライダーのドットのタップ領域が16×16px | ログイン / モバイル | 中 |
| B-1 | `CameraPreview` が不要に60px浮く | 面接セッション画面 | 低 |
| B-2 | BottomNav 生徒版だけナビ高がハードコード | 潜在 | 低 |
| B-3 | `sticky top-0 z-40` バナー2種が重なりうる | 卒業生×録音セッション | 低 |
| B-4 | `tour/layout.tsx` に `min-w-0` 欠落 | `/tour/*` 潜在 | 低 |
| B-5 | ダークモードが到達不能なのに `dark:` クラスが全域に存在 | 潜在 | 要判断 |

---

## 3. 修正プラン

原則：`CLAUDE.md` の「Surgical Changes」に従い、触るのは該当箇所だけ。隣接コードのリファクタや「ついでの」整形はしない。

### A-1. ヘッダーのロゴ×タイトル重なり【優先度: 高】

**現象（実測値）**
768px 幅で、ロゴが x=314〜454、タイトル「ホーム」が x=317〜370 に描画され完全に重複する。`/tour` 全8ページで再現。

**原因**
`src/components/layout/Header.tsx`
- `:91` 中央ロゴ … `lg:hidden`（<1024px で表示）
- `:101` ページタイトル … `hidden md:flex`（≥768px で表示）

→ **768–1023px の帯域で両方が中央に描画される。**

**判断根拠**
サイドバー（`src/components/layout/Sidebar.tsx:358`）は `hidden … lg:flex` で <1024px では非表示。つまりこの帯域は「モバイル用クローム（ハンバーガー＋中央ロゴ＋BottomNav）」で運用する設計。ブレークポイントがずれているのはタイトル側。

**修正**
`Header.tsx:101` の `hidden md:flex` を `hidden lg:flex` に変更する。ロゴ側（`lg:hidden`）は触らない。

**検証基準**
- 768 / 844 / 926 / 1023px で、ロゴとタイトルの `getBoundingClientRect()` が交差しないこと
- 1024px 以上でタイトルが従来どおり表示され、ロゴが消えること

---

### A-2. BottomNav「Action!」のラベルずれ【優先度: 高】

**現象（実測値、390×844）**

| 要素 | ボタンbox | ラベル下端 |
|---|---|---|
| ホーム / 成長 / チャット / 宿題 | top 794, bottom 834（高さ40） | **830** |
| Action! | top 782, bottom 846（高さ64） | **842** |

ナビ行は top 784 / bottom 844（高さ60）。Action! だけ**上下に2pxずつはみ出し**、FABの円がナビ上境界線をまたぎ、ラベルが他タブより12px下・画面下端から2pxの位置に張り付く。

**原因**
`src/components/layout/BottomNav.tsx:276-297`
中央ボタンの内容高 = `py-1`(8) + `size-11`(44) + `gap-0.5`(2) + ラベル(10) = **64px** > ナビ行 60px。
他タブは `py-1`(8) + アイコン(20) + `gap-0.5`(2) + ラベル(10) = 40px。

44pxの円と20pxのアイコンを同じ行で中央揃えする限り、ラベルの縦位置は原理的に揃わない。

**修正方針（推奨）: 浮き上がりFABパターンにする**
円をナビ上端より上に突き出させ、ラベルだけを他タブと同じ行位置に揃える。
既に `ring-2 ring-background` が付いており「浮いたバッジ」の意匠なので、意図とも整合する。

具体的には中央ボタンを `justify-end` + 下パディング固定にし、円に負のマージンを与えて上へ逃がす。目標値：
- ラベル下端 = 830px（他タブと一致）
- ボタンboxがナビ行を**下方向に**はみ出さない（bottom ≤ 844）
- 円は上方向にのみ突出（意図的）

**代替案（変更を最小にしたい場合）**
円を `size-9`(36) に縮め `py-1` を外す → 内容高48px でナビ行に収まり、下端の張り付きは解消する。ただしラベルの縦位置は他タブと8px程度ずれたまま残る。

どちらを採るかは意匠の判断なので、着手前に確認する。

**検証基準**
- 5タブすべてのラベル下端の差が2px以内
- Action! ボタンの `getBoundingClientRect().bottom` ≤ ナビ行の bottom
- `env(safe-area-inset-bottom)` が0の端末想定（Playwright標準）でもラベルが画面端に接しないこと

---

### A-3. ログイン画面モバイルの `h-screen`【優先度: 高】

**現象**
アプリ本体は可視ビューポート追従（`--vvh` / `100dvh`、`src/components/layout/AppLayout.tsx:18-31`, `src/app/globals.css:64-91`）でアドレスバー問題を解決済み。**ログイン画面だけ 100vh を使っている。**

`src/app/(auth)/login/page.tsx`
- `:248` `lg:hidden h-screen overflow-y-auto snap-y snap-mandatory`
- `:251` 1枚目セクション `h-screen`
- `:294` 2枚目（ログインフォーム）セクション `h-screen`

iOS Safari / Android Chrome でアドレスバーが表示されている間は `100vh > 可視領域` になるため、
1. 1枚目最下部の「対応大学」「スワイプしてログイン」が画面外に押し出される
2. snap 位置と可視領域がずれ、スワイプが1画面ぴったりで止まらない

**修正**
`:248`, `:251`, `:294` の `h-screen` を `h-dvh` に置換する。
`:130`（ローディング）と `:302`（PC用 `min-h-screen`）は対象外。

**検証基準**
- 実機 iOS Safari（アドレスバー表示状態）で1枚目の「スワイプしてログイン」まで見えること
- スワイプ1回でフォーム画面がぴったり収まること
- PC（≥1024px）の表示が変わらないこと

**補足（別件・要判断）**
1枚目は `justify-between h-full`（`:253`）で3ブロックを縦に散らすため、768px（iPad縦）では中央に約500pxの空白ができる。390pxでも約350px。意匠として許容するか、`justify-between` をやめて中央寄せにするかは判断が必要。**本プランの修正対象には含めない。**

---

### A-4. チュートリアルバナーの「終了」縦割れ【優先度: 中】

**現象**
390px で右上の「終了」が「終／了」の2行に割れる。`/tour/*` 全ページ。

**原因**
`src/components/tutorial/TutorialBanner.tsx:23-35`
`flex items-center justify-between` の両子要素に `shrink-0` / `min-w-0` が無い。
左の長文「チュートリアル（サンプルデータで操作できます）」が伸び、右のボタンが文字幅以下まで潰される。

**修正**
- 右ボタン（`:28-35`）に `shrink-0 whitespace-nowrap` を付与
- 左ブロック（`:24-27`）に `min-w-0` を付与（テキストは折り返させる）

**検証基準**
- 320 / 360 / 390px で「終了」が1行に収まること
- 左テキストが溢れず折り返すこと

---

### A-5. スライダーのドットのタップ領域【優先度: 中】

**現象**
ログイン画面の機能スライダーのドットが実測 16×16px。WCAG 2.2 AA の最小 24×24px を下回り、iOS ヒューマンインターフェースガイドラインの推奨 44×44px を大きく下回る。

**原因**
`src/components/shared/FeatureSlider.tsx:96-113`
モバイルは `size-2`(8px) のドット + `max-lg:p-1`(4px) のみ。

**修正**
モバイル時のボタンのパディングを広げ、タップ領域を24px以上（できれば44px）にする。ドットの見た目（`size-2`）は変えない。`lg:` 側のアイコンタブ表示には手を入れない。

**検証基準**
- 390px で各ドットボタンの `getBoundingClientRect()` が 24px 以上（目標44px）
- 隣接ドットのタップ領域が重ならないこと
- デスクトップ（≥1024px）の見た目が変わらないこと

---

### B-1. `CameraPreview` が不要に60px浮く【優先度: 低】

`src/components/interview/CameraPreview.tsx:23` が `--app-bottom-nav-height`（常に60px）を直接参照している。
唯一の使用先は `src/app/student/interview/session/[id]/page.tsx:1238` で、このルートは `hideMobileBottomNav` 対象（`src/lib/ui/app-layout-mode.ts`）のため BottomNav は表示されない。
→ 存在しないナビの分だけ60px浮いている。

**修正**: `--app-bottom-nav-height` を `--app-bottom-nav-offset`（当該ルートでは 0px）に変更。

**検証基準**: 面接セッション画面のモバイル表示で、カメラプレビューが画面下端から16px + safe-area の位置に来ること。

---

### B-2. BottomNav 生徒版のナビ高ハードコード【優先度: 低】

`src/components/layout/BottomNav.tsx:271` は `h-[60px]`、同ファイル `:204`（管理者版）は `h-[var(--app-bottom-nav-height)]`。
現状は 3.75rem = 60px で一致しているが、変数を変えると生徒版だけ壊れる。

**修正**: `:271` を `h-[var(--app-bottom-nav-height)]` に統一。A-2 と同時に実施する。

---

### B-3. `sticky top-0 z-40` バナーの重なり【優先度: 低】

- `src/components/student/GraduationReminder.tsx:41` — `sticky top-0 z-40`。`src/app/student/layout.tsx:20` で全生徒ページの `<main>` 先頭に配置
- `src/components/student/StudentRecordingBanner.tsx:26,42,52,62` — `sticky top-0 z-40`。`/student/sessions/[id]` 内に配置

同一スクロールコンテナ内で両方が `top-0` に貼り付くため、**卒業済み×進学先未登録の生徒が録音セッション画面を開くと重なる。**
発生条件が限定的なため優先度は低いが、修正するなら GraduationReminder の高さ分だけ RecordingBanner の `top` をずらすか、どちらかを非 sticky にする。

---

### B-4. `tour/layout.tsx` の `min-w-0` 欠落【優先度: 低】

`src/app/tour/layout.tsx:64` の `<div className="flex flex-1 flex-col overflow-hidden">` に `min-w-0` が無い（`AppLayout.tsx:37` にはある）。
現時点で横溢れは実測0だが、本番レイアウトとの意図的でない差分。揃えておく。

---

### B-5. ダークモードの扱い【優先度: 要判断・コード変更は保留】

**事実**
- `src/components/Providers.tsx:11` … `<ThemeProvider attribute="class" defaultTheme="light">`
- `setTheme` を呼ぶテーマ切替UIはコードベース上に存在しない（`sonner.tsx` の `useTheme` 読み取りのみ）
- → **`.dark` が付与される経路が無く、ダークモードは到達不能**

**リスク**
にもかかわらず `dark:` クラスがコードベース全域に書かれ続けている。
さらに `src/components/layout/BottomNav.tsx:410,417` のアクティブタブは `bg-indigo-50 text-indigo-700` / `text-indigo-600` とライト固定でダーク版が無い（同ファイル内の `sheetSections` には `dark:` 変種がある）。
→ **将来テーマ切替を入れると、この不整合が顕在化する。**

**選択肢**
1. ダークモード対応を正式にやめる … `dark:` の新規記述を禁止し、`ThemeProvider` を `forcedTheme="light"` にする
2. ダークモード対応を正式にやる … 切替UIを追加し、`dark:` 欠落箇所（BottomNav含む）を洗い出して埋める

どちらもプロダクト判断なので、**本プランではコードを変更しない。** 方針が決まったら別タスクとして起票する。

---

## 4. 実施順序

| Step | 内容 | 変更ファイル数 | 検証 |
|---|---|---|---|
| 1 | A-1 ヘッダー重なり | 1 | 768/844/926/1023px で矩形非交差 |
| 2 | A-2 BottomNav Action! + B-2 ナビ高統一 | 1 | 5タブのラベル下端の差 ≤2px |
| 3 | A-4 チュートリアルバナー | 1 | 320/360/390px で「終了」1行 |
| 4 | A-5 タップ領域 | 1 | ドットのタップ領域 ≥24px |
| 5 | A-3 ログイン `h-dvh` | 1 | **実機 iOS Safari 必須** |
| 6 | B-1 CameraPreview / B-4 min-w-0 | 2 | 該当画面の目視 |

Step 1–4 は共通コンポーネント／単一ファイルの数行で、影響範囲の割にリスクが小さい。
Step 5 はヘッドレスでは検証しきれないため、実機確認まで完了しないと「完了」としない。
Step 6 は Step 1–5 の確認後にまとめて。

各 Step 完了ごとに `npm run build` でビルドエラーを確認する（`CLAUDE.md` 動作確認ルール）。

---

## 5. 回帰確認

修正後、監査に使った Playwright 計測を再実行し、以下が維持されていることを確認する。

- 全ルート・全ビューポートで横溢れ 0px
- コンソールエラー 0件
- 1024px 以上の表示に差分が無いこと（A-1 / A-5 は PC 表示を変えない前提）

計測スクリプトはセッションのスクラッチパッドに置いた。恒久化するなら `scripts/` 配下に `ui-audit.mjs` として追加し、`npm run` タスク化する余地がある（本プランの対象外）。

---

## 6. 実施結果（2026-07-25）

A-1〜A-5 / B-1〜B-5 をすべて実施した。検証は `npx next start` した本番ビルドに対する Playwright 実測（21項目 pass / 0 fail）。

| ID | 変更 | 実測 |
|---|---|---|
| A-1 | `Header.tsx` タイトルを `hidden md:flex` → `hidden lg:flex` | 768/844/926/1023px でタイトル非表示・ロゴのみ、1024/1280px は従来どおりタイトル表示・ロゴ非表示 |
| A-2 | `BottomNav.tsx` 中央ボタンの円に `-mt-6`。44pxの円を負マージンで上に逃がし、占有高を他タブのアイコン(20px)と一致させた | **5タブのラベル下端が全て830px（差0.00px）**。円は44pxのまま上に10px突出（top=774 / ナビ行 784–844）、ボタン下端834 ≤ ナビ下端844、画面下端まで14px |
| A-3 | `login/page.tsx` の `h-screen` 3箇所（`:248` `:251` `:294`）を `h-dvh` に。`:130` `:302` は対象外 | 各セクション844px（可視ビューポート一致）、モバイル側に `h-screen` 残存なし。**実機 iOS Safari 確認は未実施** |
| A-4 | `TutorialBanner.tsx` 右ボタンに `shrink-0 whitespace-nowrap`、左ブロックに `min-w-0`、アイコンに `shrink-0` | 320/360/390px で「終了」1行（高さ28px）、左テキストは折り返し |
| A-5 | `FeatureSlider.tsx` `max-lg:p-1` → `max-lg:p-2.5` | タップ領域 16px → **28px**（WCAG 2.2 AA の24px超）、隣接重なりなし、PC のタブ表示は `padding: 8px 12px` のまま不変 |
| B-1 | `CameraPreview.tsx` `--app-bottom-nav-height` → `--app-bottom-nav-offset` | 面接セッション（`hideMobileBottomNav`）では 0px に解決 |
| B-2 | `BottomNav.tsx:271` `h-[60px]` → `h-[var(--app-bottom-nav-height)]` | ナビ行 60.0px 維持 |
| B-3 | `GraduationReminder` が自身の高さを `--student-banner-height` として公開（ResizeObserver で折り返しに追従）、`StudentRecordingBanner` の4箇所を `sticky top-[var(--student-banner-height,0px)]` に | 生成CSS に `top:var(--student-banner-height,0px)` を確認。GraduationReminder 非表示時はフォールバック0pxで従来どおり。**卒業済み×録音中の実シナリオ目視は未実施** |
| B-4 | `tour/layout.tsx:66` に `min-w-0` 追加 | 本番 `AppLayout` と一致 |
| B-5 | **選択肢1（ダークモード非対応を明示）を採用**。`Providers.tsx` に `forcedTheme="light"` | OSダーク設定 + `localStorage.theme="dark"` の状態でも `html.class` に `dark` が付かないことを確認（変更前はこの経路でダークが適用され得た） |

### 回帰確認
- 10ルート × 4ビューポート = 40計測で **横スクロール溢れ 0px**
- **コンソールエラー 0件**
- 1024px以上の表示に差分なし（A-1 はタイトル表示、A-5 は padding 不変を個別に検証）
- `npm run build` 成功

### 残作業
1. **A-3 の実機確認**（iOS Safari / Android Chrome、アドレスバー表示状態）。ヘッドレスでは検証しきれないため、これが済むまで A-3 は完了扱いにしない。
2. **B-3 の実シナリオ目視**（卒業済み×進学先未登録の生徒で録音セッション画面を開く）。仕組みは検証済みだが実データでの再現は未実施。
3. B-5 で「ダークモードを正式にやる」に方針転換する場合は、切替UIの追加と `dark:` 欠落箇所（`BottomNav.tsx` のアクティブタブ等）の洗い出しをセットで別タスク化する。
4. A-3 の補足に書いた「1枚目の `justify-between` による中央の空白」は未着手（意匠判断）。
