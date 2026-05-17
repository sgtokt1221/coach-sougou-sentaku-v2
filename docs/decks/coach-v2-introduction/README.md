# Coach v2 紹介資料 (塾向け) ビルド手順

成果物: `../coach-v2-introduction.pptx` (リポジトリ直下の `docs/decks/` 配下)

`~/.claude/skills/consulting-deck` (マッキンゼー風) + `~/.claude/skills/pptx` (html2pptx) ベースで構築。

## 構成

- `slides.html` — 16 枚分のスライド HTML (1 セクション = 1 スライド、720pt × 405pt)
- `build.js` — HTML を Playwright で開き各 section を PNG 化 → PptxGenJS で .pptx に貼り込み
- `generate-icons.js` — react-icons + sharp で青単色アイコン PNG 群を生成 (任意、今回は未使用)
- `.gitignore` — `node_modules/`, `shots/`, `thumbnails/`, `icons/`, `package*.json` を除外

## 再ビルド

```bash
cd docs/decks/coach-v2-introduction

# 依存 install (初回のみ)
npm init -y
npm install --no-save pptxgenjs react-icons
# sharp と playwright は親プロジェクトの node_modules を借用

# HTML 編集後にビルド
NODE_PATH="$PWD/node_modules:$(git rev-parse --show-toplevel)/node_modules" node build.js

# サムネ確認 (16 枚を 1 枚の JPG にまとめる)
python3 ~/.claude/skills/pptx/scripts/thumbnail.py \
  ../coach-v2-introduction.pptx ./thumbnails --cols 4
```

## スライド構成 (16 枚)

| # | タイトル |
|---|---|
| 1 | 表紙 |
| 2 | エグゼクティブサマリー |
| 3 | 総合型選抜の指導現場が抱える課題 |
| 4 | Coach v2 の全体像 |
| 5 | 機能① 小論文 AI 添削 |
| 6 | 機能② AI 模擬面接 (個人・プレゼン・口頭試問) |
| 7 | 機能③ AI 模擬面接 (集団討論) |
| 8 | 機能④ 志望校マッチング + 受験日程管理 |
| 9 | 機能⑤ 出願書類エディタ + 活動実績 AI ヒアリング |
| 10 | 機能⑥ 成長トラッキング + 合格者データ |
| 11 | 管理者ポータル — 塾講師の業務効率化 |
| 12 | 想定される懸念 → Coach の回答 |
| 13 | セキュリティ・運用体制 |
| 14 | 導入ステップ |
| 15 | 料金プラン (案) |
| 16 | まとめ |

## デザイン仕様

| Role | Hex |
|---|---|
| ダークネイビー (表紙・まとめ) | `#1e293b` |
| 白 (本文背景) | `#ffffff` |
| アクセント (ブルー丸・bar) | `#2563eb` |
| サブアクセント (Coach v2 ブランド Teal) | `#14b8a6` |
| 補助テキスト (グレー) | `#64748b` |
| カード背景 | `#f8fafc` |
| Positive (緑) | `#059669` |
| Negative (赤) | `#dc2626` |

- フォント: Arial のみ (web-safe)
- グラデーション・背景画像 不使用 (純色のみ)
- 機能スライドは 2 カラム統一テンプレ
