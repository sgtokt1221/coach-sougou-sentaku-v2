# モバイルAIスライドパネル Implementation Plan

> REQUIRED SUB-SKILL: superpowers:subagent-driven-development。1タスクずつ spec準拠→コード品質レビュー。

**Goal:** モバイルの執筆支援AIを、段階スナップ（閉じ/覗き〔背景暗転なし・見ながら書ける〕/全開〔背景暗転〕）の共通スライドパネルに統一し、小論文執筆・出願書類エディタ・ちょこ添削に適用。

**Tech:** Next.js 16 / React / framer-motion / createPortal。設計書: docs/superpowers/specs/2026-07-19-mobile-ai-slideover-panel.md。

**共通の注意（全タスク）:** 無関係な未コミット変更は `git add <path>` で絶対巻き込まない。検証は対象ファイル `npx eslint` ＋ `npm run build`。テスト基盤なし。絵文字不使用。既存の正解パターン `src/components/chat/FloatingStudentChat.tsx`（portal＋mounted＋z-[60]＋safe-area）と `src/components/ui/sheet.tsx`（overscroll-contain）に準拠。PC(デスクトップ)レイアウトは各画面とも不変。

---

### Task 1: 共通コンポーネント `MobileSlideOverPanel`
**Files:** Create `src/components/shared/MobileSlideOverPanel.tsx`

設計書の「コンポーネント設計」を実装。要点:
- Props: `label: string`, `title?: string`, `children: ReactNode`, `defaultPeekVw?: number(=60)`。
- モバイル専用（wrapper に `lg:hidden`）。`createPortal(document.body)`＋mountedガード。
- state: `snap: "closed"|"peek"|"full"`, `peekVw`。
- 左端ハンドル（closed/peek時表示、`fixed left-0 top-2/3 z-[60]`、label＋アイコン、aria-label、タップで closed→peek）。
- パネル `motion.div`（`fixed left-0 top-0 h-full z-[60]` flex-col）: closed=`x:-100%`、peek=`x:0,width:{peekVw}vw`（背景暗転なし）、full=`x:0,width:min(88vw,26rem)`（背景暗転あり）。`animate` で x/width 遷移。`drag="x" dragDirectionLock`、onDragEnd の offset/velocity で closed↔peek↔full にスナップ（右で開く/左で閉じる）。safe-area padding・下部ナビ回避・本体 `flex-1 min-h-0 overflow-y-auto overscroll-contain`。
- バックドロップ（fullのみ、`fixed inset-0 z-[59] bg-black/30`、タップで full→peek）を別 `AnimatePresence` で出し入れ。
- 上部バー: `title`、覗き幅プリセット（狭45/中60/広75）ボタン（peek時に有効、`peekVw`変更）、全開(⤢)・閉じる(×)ボタン。

- [ ] Step1: FloatingStudentChat.tsx / sheet.tsx を読み規約を把握。
- [ ] Step2: コンポーネント実装。
- [ ] Step3: `npx eslint` ＋ `npm run build` パス（単体で未使用でもエクスポートは通る）。
- [ ] Step4: commit `feat(ui): モバイル段階スナップ式AIスライドパネルを追加`（このファイルのみ）。

---

### Task 2: 出願書類エディタへ適用（既存カード移行）
**Files:** Modify `src/app/student/documents/[id]/page.tsx`

現状モバイルの自前オーバーレイ（`reviewOpen` state＋自前 `createPortal`/`motion.div`/ハンドル/バックドロップ）を撤去し、`<MobileSlideOverPanel label="AI添削">` で `ReviewPanel`（既存 props そのまま）を包む形に置換。エディタ常時全幅は維持。PC 2カラム(`hidden lg:grid`)・Task A(ステータス2択/提出ゲート)は不変。不要になった state/import(自前motion等)を削除。

- [ ] Step1: 現状のモバイルオーバーレイ実装箇所を把握。
- [ ] Step2: `MobileSlideOverPanel` に置換（ReviewPanelを子に）。
- [ ] Step3: eslint＋build パス、PC不変確認。
- [ ] Step4: commit `feat(documents): AI添削カードを共通スライドパネルに移行`（このファイルのみ）。

---

### Task 3: 小論文執筆(EssayCoachPanel)へ適用
**Files:** Modify `src/components/essay/EssayCoachPanel.tsx`

モバイルの「ボタン→`Sheet`」を `<MobileSlideOverPanel label="執筆サポート" title="執筆サポート">` に置換し、`EssayCoachPanelBody` を子に。PC 左列常設(`hidden lg:flex`)は不変。不要になった `mobileOpen` state・Sheet import を整理。essay/new は本コンポーネント経由で自動反映。

- [ ] Step1: EssayCoachPanel.tsx のモバイル Sheet 箇所を把握。
- [ ] Step2: 置換。
- [ ] Step3: eslint＋build パス、PC不変確認。
- [ ] Step4: commit `feat(essay): 執筆サポートを共通スライドパネルに移行`（このファイルのみ）。

---

### Task 4: ちょこ添削(choco)へ適用
**Files:** Modify `src/app/student/essay/choco/page.tsx`

choco は `EssayCoachPanelBody` を直接使用（モバイルの出し方を確認）。モバイルで `EssayCoachPanelBody` を `MobileSlideOverPanel` で包む（PCの出し方は不変）。既存のモバイル導線と重複しないよう整理。

- [ ] Step1: choco の EssayCoachPanelBody 利用箇所とモバイル/PC分岐を把握。
- [ ] Step2: モバイルのみ `MobileSlideOverPanel` 適用。
- [ ] Step3: eslint＋build パス、PC不変確認。
- [ ] Step4: commit `feat(essay): ちょこ添削の執筆サポートを共通スライドパネルに移行`（このファイルのみ）。

---

## Self-Review
- Task1 でコンポーネント、Task2-4 で3画面適用。各タスク単一ファイル・直列（巨大ファイル並列Edit禁止）。
- 実機(iOS Safari)の手触り（スナップ閾値・覗き幅・縦スクロール誤クローズ）は最終的にユーザー確認。
