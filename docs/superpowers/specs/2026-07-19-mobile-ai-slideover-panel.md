# モバイル用 段階スナップ式AIスライドパネル（見ながら書く） 設計書

作成日: 2026-07-19
対象: モバイルの執筆支援AIパネル（小論文執筆・出願書類エディタ・ちょこ添削 ほか）

## 背景・決定

現在、モバイルのAI支援は「背景暗転モーダル」で、開くと後ろで書けない:
- 出願書類エディタのAI添削カード（今回作成）: 左スワイプの**オーバーレイ＋背景暗転**。
- 小論文執筆(essay/new)のAIコーチ: ボタン→**左Sheet（背景暗転）**。

要望「スライド位置を任意指定して、見ながら書く」を満たすため、**背景を暗転させず位置/幅を段階指定できる**共通コンポーネントに作り替える。

決定（ユーザー承認済み）:
- 操作方式: **段階スナップ**（閉じ / 覗き / 全開）。
- 適用範囲: **広く（他のAIチャットにも）**。ただし下記スコープ整理を参照。

## スコープ整理（重要・要確認）

「見ながら書く」は**入力欄とAI支援が同一画面に併存する執筆系**で意味を持つ。純チャット画面（面談チャット等、画面全体がチャット）は"後ろで書く"対象がなく、この方式が合わない。よって:

- **今回適用（執筆＋AI併存）**: 小論文執筆 `essay/new`（EssayCoachPanel）／出願書類エディタ `documents/[id]`（AI添削。既存カードを本コンポーネントへ移行）／ちょこ添削 `essay/choco`（EssayCoachPanelBody）。
- **今回は対象外（純チャット・別レイアウト）**: 面談セッション／メッセージ(feedback)／自己分析ワークショップ。これらは画面主役がチャットのため、別途検討（本コンポーネントの適用は次段階）。

## コンポーネント設計: `MobileSlideOverPanel`

`src/components/shared/MobileSlideOverPanel.tsx`（"use client"）。モバイル専用（`lg:hidden`）。`createPortal(document.body)` で `PageTransition` の transform/filter 配下を回避（既存 `FloatingStudentChat` 準拠）。

### Props
```ts
interface MobileSlideOverPanelProps {
  /** 左端ハンドルのラベル（例「AI添削」「執筆サポート」） */
  label: string;
  /** パネル上部の見出し（任意） */
  title?: string;
  /** パネル内に描画する中身（AIコーチ本体・チャット等） */
  children: React.ReactNode;
  /** 覗き幅の初期値(vw)。既定 60。 */
  defaultPeekVw?: number;
}
```

### 状態と表示
- 内部 state: `snap: "closed" | "peek" | "full"`、`peekVw: number`（覗き幅、既定60）。
- **左端ハンドル**（closed/peek 時に表示、`fixed left-0 top-2/3 z-[60]`、縦長、`label`＋アイコン、`aria-label`）。タップで `closed→peek`。
- **パネル**（framer-motion `motion.div`、`fixed left-0 top-0 h-full z-[60]`、幅は snap で可変）:
  - closed: 画面外（`x: -100%`）。
  - peek: `x:0`、`width: {peekVw}vw`。**背景暗転なし**＝右側の入力欄がそのまま操作可能（見ながら書ける）。
  - full: `x:0`、`width: min(88vw, 26rem)`。**背景暗転あり**（読む用）。
  - safe-area padding（`--app-safe-top/bottom`）、下端は下部ナビ回避（`--app-bottom-nav-height`）、スクロール領域は `overscroll-contain`。
- **バックドロップ**（`full` のみ、`fixed inset-0 z-[59] bg-black/30`、タップで `full→peek`）。peek では出さない。
- **スワイプ/ドラッグ**（`drag="x"` `dragDirectionLock`）:
  - 右ドラッグ: `closed→peek→full`（段階的に開く）。
  - 左ドラッグ: `full→peek→closed`（段階的に閉じる）。
  - `onDragEnd` の offset/velocity で近い snap にスナップ。
- **覗き幅の指定**（"任意指定"）: パネル上部に幅プリセット（例「狭 45% / 中 60% / 広 75%」の小ボタン）。押すと `peekVw` を変更し、peek 表示幅が変わる。全開/閉じるボタン（× と ⤢）も上部に置く。
- **アニメ**: `AnimatePresence` は使わず、単一 `motion.div` の `animate`（x/width）で snap 遷移（バックドロップは条件付き `motion.div` を別 `AnimatePresence` で出し入れ）。

### 中身の高さ運用
`children` は縦フル・内部スクロール前提。パネルは flex-col で、上部バー（見出し＋幅プリセット＋閉じる）＋ `flex-1 min-h-0 overflow-y-auto overscroll-contain` の本体。

## 適用（各画面）
- `documents/[id]/page.tsx`: 既存の自前オーバーレイ（reviewOpen＋自前 motion）を撤去し、`<MobileSlideOverPanel label="AI添削">` で `ReviewPanel` を包む（モバイルのみ）。PC 2カラムは不変。
- `EssayCoachPanel.tsx`: モバイルの「ボタン→Sheet」を `<MobileSlideOverPanel label="執筆サポート">` に置換し、`EssayCoachPanelBody` を包む。PC 左列常設は不変。
- `essay/choco/page.tsx`: `EssayCoachPanelBody` を使うモバイル導線に同コンポーネントを適用（現状の出し方に合わせる）。

## スコープ外（今回）
- 純チャット画面（面談/メッセージ/自己分析）への適用。
- 自由ドラッグ任意位置・幅リサイズ式ドッキング（今回は段階スナップ）。
- PC（デスクトップ）レイアウトの変更。

## 検証基準
- モバイルで: 左ハンドル→覗き（背景暗転なし・後ろの入力欄が操作可能＝見ながら書ける）→全開（背景暗転・読む用）をスワイプ/タップで切替。覗き幅を狭/中/広で変更可。下部ナビ/ノッチに被らない。縦スクロール中に誤クローズしない。
- essay/new・documents/[id]・choco の3画面で同じ操作感。PCは各画面とも不変。
- `npm run build` パス、対象 eslint クリーン。実機（iOS Safari）の手触りはユーザー確認。
