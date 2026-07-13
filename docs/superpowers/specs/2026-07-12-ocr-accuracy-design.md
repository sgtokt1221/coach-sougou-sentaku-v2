# 手書き答案OCR 精度改善 設計書

作成日: 2026-07-12
対象: 小論文添削の手書き写真アップロード（`src/app/api/essay/upload/route.ts` 系）

## 1. 目的とゴール

手書き答案写真のOCR精度を、モデルや印象ではなく **固定評価セットのCER（文字誤り率）・生徒の確認時間・コスト** で測りながら改善する。今回のスコープは以下の3点（案B: フル）:

1. **撮影QC＋幾何補正**: 撮影時の品質チェック（ブレ/暗さ/傾き）と、台形（射影）＋回転を除去する幾何補正を前処理に追加。
2. **修正データ＋画像保存**: OCR結果・生徒の修正箇所・原画像を同意付きで保存し、評価・改善のPDCA基盤にする。
3. **評価セット計測基盤**: 手書き答案＋正解テキストの固定セットでCER等を測るCLI。

### スコープ外（将来拡張）
- 生徒確認UIの「不確実箇所ハイライト」化（今回は**現行の全文確認のまま**）。
- P2セル単位照合（GCV×Claudeのセル一致で自動確定）。
- P3 Azure Document Intelligence 等の追加エンジン（IFの土台のみ用意）。

### 前提となる意思決定（ブレスト結果）
| 論点 | 決定 |
|------|------|
| 用紙形式 | 縦書き・横書き**両方あり得る** → 向き自動判定して分岐 |
| 画像/修正の保存 | **画像も含めて保存（同意付・保持期間あり）**、評価・改善に再利用 |
| 確認UI | **現行の全文確認のまま**（内部では構造化データを保存） |
| 実装のふところ | **案B（フル）**: 二段QC＋台形補正＋マルチエンジン土台 |
| 台形補正の実装 | **B-1: 自前ホモグラフィ（純JS・依存追加ゼロ）** |

## 2. アーキテクチャ / データフロー

```
[クライアント: React 撮影画面]
  カメラ/ファイル入力
   → ブラウザ内QC（ブレ=Laplacian分散 / 明るさ=平均輝度 / 解像度）
      ├ 閾値割れ → その場で「撮り直し」表示（アップロードしない）
      └ OK → アップロード

[サーバ: essay/upload/route.ts + 新規モジュール]
  1. 原画像を Storage 保存（同意付）＋ Firestore に ocrRecord 作成 (status: received)
  2. 権威的QCゲート（sharp stats で再判定：鮮鋭度/輝度/解像度）
       └ ハード閾値割れ → 422「品質不足・撮り直し」 (status: rejected_quality)
  3. テンプレート＋向き判定（Haiku, 1回のJSON応答）
       ├ 原稿用紙 → 向き(縦/横)＋四隅座標＋行列数＋skewAngle
       └ 普通紙  → skewAngle のみ
  4. 幾何補正 (lib/ocr/geometry.ts)
       ├ 原稿用紙 → 四隅からホモグラフィH算出 → 台形+回転を一括除去（正対化）
       └ 普通紙  → skewAngle で回転のみ deskew
  5. 前処理（既存 sharp: グレースケール/シャープ/2000pxリサイズ）→ normalized.jpg 保存
  6. OCR（オーケストレータがエンジンIFで実行、全結果を engines[] へ保存）
       ├ 原稿用紙 → claude-grid（構造化: row/col/char/uncertain/alt）＋ gcv 併走
       └ 普通紙  → claude-plain ＋ gcv 補助
  7. proposedText を primary から生成 → クライアントへ返す（確認UIは現行の全文確認）

[サーバ: confirm-ocr/route.ts]
  8. 生徒が確認/修正 → 差分(直した文字/マス)を算出
     → ocrRecord 更新 (finalText, correctedSpans, status: ocr_confirmed)  ← ③のPDCA燃料

[オフライン: scripts/eval-ocr.ts]
  画像フォルダ＋正解JSON → 同じエンジンIFで実行 → CER/修正文字数/レイテンシ/コスト レポート（①）
```

要点:
- **QCは二段**（ブラウザ=UXヒント、サーバ=権威判定）。無駄なAPI課金を減らしつつ低品質を確実に弾く。
- **エンジンは差し替え可能なIF**。原稿用紙では Claude＋GCV を併走保存（Azure/アンサンブル＝P3の土台）。
- **確認UIは現行のまま**。内部で構造化データ・候補・confidenceを保存する。
- **安全フォールバック**: 四隅検出失敗→回転のみ、テンプレ誤判定→普通紙経路、で現行挙動を割らない。

**既存フローとの統合方式**: 本設計は既存 `essay/upload/route.ts` の OCR 中核を**置換**する（新経路が現行の sharp前処理→Vision→Claude抽出→マス目OCRを内包し、フォールバックとして現行相当の平文経路を残す）。別経路の併存はしない。生徒への返却契約（`proposedText` を返し confirm-ocr で確定）は現行のまま維持し、外形的な後方互換を保つ。

**冪等性**: 同一提出の再アップロードは、既存の `ocrRecords` を新規作成せず既存 record を上書き更新する（`essaySubmissionId` をキーに検索、無ければ新規）。多重アップロードで record が増殖しないようにする。

## 3. データモデル（Firestore ＋ Storage）

### Storage（同意付・保持期間あり）
```
essayOcr/{orgId}/{studentId}/{recordId}/
  ├ original.jpg      アップロード原画像
  └ normalized.jpg    幾何補正+前処理後（OCR入力に使った画像）
```
- Storageルール: read は「本人 or 同一orgの管理者・講師」のみ。write はサーバ(admin SDK)のみ。

### Firestore: 新コレクション `ocrRecords/{recordId}`（トップレベル）
```ts
interface OcrCell {
  row: number; col: number; char: string;
  uncertain: boolean; alternatives: string[];
}

interface OcrEngineRecord {
  engineId: "claude-grid" | "gcv" | "claude-plain";
  model: string; promptVersion: string;
  text: string;                 // 平文化した結果
  cells?: OcrCell[];            // 原稿用紙のマス構造
  confidence: number | null;
  latencyMs: number; costUsd: number | null;
  error?: string;               // 併走エンジン失敗時
}

interface OcrRecord {
  id: string;
  orgId: string;
  studentId: string;
  essaySubmissionId: string | null;   // 既存の提出と紐付け
  status: "received" | "rejected_quality" | "ocr_proposed" | "ocr_confirmed";

  consent: { version: string; agreedAt: Timestamp };
  retentionExpiresAt: Timestamp;       // 保持期限（設定値から算出・必須）

  images: { originalPath: string; normalizedPath: string | null };

  qc: {
    sharpness: number; brightness: number;
    width: number; height: number;
    passed: boolean; reason?: string;
  };

  template: {
    kind: "genko" | "plain";
    orientation: "vertical" | "horizontal" | "unknown";
    rows: number | null; cols: number | null;
    corners: [number, number][] | null;  // 四隅（正規化前ピクセル）
    skewAngle: number | null;
    detectFailed: boolean;                // フォールバック発火フラグ
  };

  engines: OcrEngineRecord[];             // 全エンジン結果を保存

  proposedText: string;                   // 生徒に提示（primaryエンジン）
  finalText: string | null;               // 生徒確定後
  correctedSpans: Array<{ index: number; from: string; to: string }> | null;

  createdAt: Timestamp; updatedAt: Timestamp;
}
```

判断ポイント:
- **`ocrRecords` はトップレベル**（org横断で評価集計するため）。複合インデックス `orgId + status + createdAt` を `firebase deploy --only firestore:indexes` で**先に**デプロイ（欠落は沈黙失敗）。
- **`correctedSpans`** が①評価セットの正解データ源。`proposedText` vs `finalText` の差分。
- **`engines[]` に全エンジン結果**を残す（primaryだけでなく）→ 将来アンサンブル/Azure比較を再計算可能。
- **`retentionExpiresAt` は必須**（無期限を避ける）。

## 4. 前処理パイプライン詳細

### (1) ブラウザ内QC（`components/essay/CaptureQualityCheck` 想定）
- ブレ: 縮小canvasに drawImage → ImageData に3×3ラプラシアンkernel → 分散を算出。低分散=ボケ。
- 明るさ: グレースケール平均輝度。暗すぎ/白飛びを検知。
- 解像度: `naturalWidth/Height` が下限未満なら弾く。
- 閾値は定数化し①評価セットで較正。**暫定初期値**（較正前）: ラプラシアン分散 < 100 でボケ警告、平均輝度が 40 未満（暗すぎ）/ 230 超（白飛び）で警告、短辺 < 1000px で低解像度警告。判定はUXヒント（最終判定はサーバ）。

### (2) サーバ権威的QCゲート（`lib/ocr/quality.ts`）
- 鮮鋭度: sharp `.convolve(ラプラシアンkernel)` → `.stats()` の stdev² を指標に。
- 輝度: sharp `.stats()` の channel mean。
- 解像度: `metadata()` の width/height。
- **暫定初期値**（較正前・ハード閾値）: 短辺 < 800px、または平均輝度が 30 未満/240 超、または鮮鋭度指標がブラウザ閾値の半分未満 → 撮り直し要求。ソフト割れは通して `qc` に記録。
- ハード閾値割れ → 422 で撮り直し要求（status=rejected_quality）。

### (3) テンプレート＋向き＋四隅検出（既存Haiku呼び出しを拡張）
- 1回のJSON応答で `{ kind, orientation, rows, cols, corners[4], skewAngle }` を返させる（API呼び出しを増やさない）。

### (4) 幾何補正（`lib/ocr/geometry.ts`）
- 原稿用紙: 四隅→ホモグラフィ行列H算出→正対の矩形へワープ（台形＋回転を一括除去）。
- 普通紙: `skewAngle` で sharp `.rotate()` 回転のみ。
- **B-1 自前ホモグラフィ**: 4点対応から3×3行列Hを解き（8×8線形方程式をガウス消去でハンドロール）、sharp `.raw()` のピクセルバッファを逆写像＋バイリニア補間でワープ。純JS・依存ゼロ。2000pxで数百ms、App Hosting のコールドスタートに優しい。

### (5) 前処理仕上げ
補正後の画像に既存 sharp（グレースケール/シャープ/2000pxリサイズ）→ `normalized.jpg` として保存＆OCR入力。

## 5. エンジンIF ＋ 評価基盤

### (1) エンジン差し替え可能インターフェース（`lib/ocr/engines/`）
```ts
interface OcrEngineResult {
  text: string;
  cells?: OcrCell[];
  confidence: number | null;
  latencyMs: number; costUsd: number | null;
}
interface OcrEngine {
  id: "claude-grid" | "gcv" | "claude-plain";
  model: string; promptVersion: string;
  run(input: { base64: string; template: TemplateInfo }): Promise<OcrEngineResult>;
}
```
- `claude-grid`: マス目構造化OCR（現行マス目OCRを構造化して昇格）。プロンプトに「行列数と読み順／訂正しない／空白セルも座標付き／判読不能は■／訂正線・挿入・マス外の扱い／schema外の文を返さない」を明記。モデル申告confidenceは校正されていないため単独では信用せず、将来の不一致検出に使う。
- `gcv`: Google Cloud Vision。
- `claude-plain`: 普通紙抽出（現行 `extractEssayBody` 相当）。

### (2) オーケストレータ（`lib/ocr/orchestrator.ts`）
- `template.kind` で primary を決定（genko→claude-grid / plain→claude-plain）。
- secondary（gcv）を `Promise.all` で併走し、全結果を `engines[]` に保存。
- `proposedText` は primary から生成。エンジン追加はこの配列に足すだけ＝P3土台。

**構造化セル → proposedText の平文化規則**
- 原稿用紙（claude-grid）: `cells[]` を **向き別の読み順**で連結する。
  - 縦書き: 列（右→左）優先、各列内は行（上→下）。
  - 横書き: 行（上→下）優先、各行内は列（左→右）。
  - 空白セル（`char===""`）は改行/段落判定に用い、本文には空文字として扱う。判読不能（`■`）はそのまま残す（生徒が確認UIで修正）。
- 普通紙（claude-plain）: 抽出済みの平文をそのまま `proposedText` とする。

### (3) 評価CLI（`scripts/eval-ocr.ts`, 手動実行）
- 入力: `evalset/images/*.jpg` ＋ `evalset/groundtruth.json`（`{ "a.jpg": { "text": "正解本文", "expectedKind": "genko" }, ... }`）。
- 各画像に **本番と同じIF**（QC→検出→幾何補正→前処理→各エンジン）をオフライン実行。
- 指標:
  - **CER**（Levenshtein / 正解長）をエンジン別＋primaryで算出。
  - 修正文字数proxy（編集距離）、レイテンシ、概算コスト。
  - テンプレ誤判定率（`expectedKind` がある場合）。
- 出力: コンソール表＋JSONレポート（scratchpad）。固定評価セットでベースライン vs 新版を回帰比較。
- 注意: 実APIを叩く（課金）＋答案画像を扱うため **CIには載せず**、`.env.local` 前提の手動実行。正解データはユーザー用意（②③稼働後は `correctedSpans` から半自動で増やせる）。

## 6. 非機能要件

### (1) 同意・保持
- 利用規約に「答案画像とOCR結果を、精度改善・評価目的で保存・再利用する」旨の同意文言を追加。`consent.version` を record に記録。
- **非同意時の挙動**: 添削自体は現行どおり利用可能とする。ただし**再利用目的の保存を行わない**ため、原画像・OCR候補は**リクエスト処理中のみメモリ保持し、応答後に破棄**（Storage/`ocrRecords` に永続化しない）。この場合 record は作成せず、`correctedSpans` も蓄積されない（＝評価データにはならない）。同意/非同意は既存の添削フロー内で1回取得し、`consent` として渡す。
- 保持期間は設定値（既定365日）から `retentionExpiresAt` を算出。無期限は不可。Firestore TTL ＋ Storage は期限バッチで削除。
- 同意撤回時は当該 record／画像を削除するフローを想定（初期は管理者手動、UIは将来）。

### (2) セキュリティ（CLAUDE.md/OWASP準拠）
- Storageルール: 画像は「本人 or 同一orgの管理者・講師」のみ read、write はサーバ(admin SDK)のみ。
- APIは認証トークンから uid を特定、`scopeByOrganization` で org 越境を拒否（既存ヘルパー流用）。`studentId` を鵜呑みにしない（IDOR防止）。
- 評価CLIは `.env.local` 前提・手動実行。`evalset/` は `.gitignore` でリポジトリに含めない。
- **前提**: Google Cloud Vision の認証情報は現行 `essay/upload/route.ts` で使用中のものを流用。Firebase Storage は既存プロジェクトのバケットを使用（新規バケットは作らない）。

### (3) コスト・レイテンシ
- QCゲートで低品質を早期に弾き無駄なOCR課金を削減。
- 原稿用紙は Claude＋GCV 併走で1枚あたりコスト増 → `engines[].costUsd` を記録し、評価CLIでP95レイテンシ/枚コストを可視化。予算超過なら secondary を停止できるフラグを持たせる。
- 幾何補正は純JS（B-1）で数百ms/枚、同期処理内で許容。

### (4) フォールバック（現行挙動を割らない）
- 四隅検出失敗 → 回転のみ deskew。回転も不可 → 無補正。
- テンプレ誤判定 → 普通紙経路。
- 併走エンジン(GCV)失敗 → primary単独で継続（`engines[].error` に残す）。
- QCゲートは**ハード閾値のみ撮り直し要求**、ソフト割れは通して記録（過剰な撮り直しを防ぐ）。
- 幾何補正/構造化OCRで例外 → 現行の平文OCR経路へ縮退。**「精度が上がる」方向のみ追加し、失敗時は必ず現行品質に戻る**。

### (5) 受け入れ基準（評価CLIで測定）
- 原稿用紙CERを現状比30%以上削減／普通紙CERを悪化させない。
- 修正文字数30%以上削減／テンプレ誤判定率1%未満。
- マーカー/四隅検出失敗時も安全にフォールバック。

## 7. ファイル構成（新規/変更）

| ファイル | 役割 | 種別 |
|----------|------|------|
| `src/lib/ocr/quality.ts` | サーバ権威的QC（鮮鋭度/輝度/解像度） | 新規 |
| `src/lib/ocr/geometry.ts` | 自前ホモグラフィ＋回転deskew | 新規 |
| `src/lib/ocr/engines/` | エンジンIF＋claude-grid/gcv/claude-plain実装 | 新規 |
| `src/lib/ocr/orchestrator.ts` | primary/secondary併走・engines[]構築 | 新規 |
| `src/lib/types/ocr.ts` | `OcrRecord`/`OcrCell`/`TemplateInfo` 等の型 | 新規 |
| `src/components/essay/CaptureQualityCheck.tsx` | ブラウザ内QC（ブレ/明るさ/解像度） | 新規 |
| `src/app/api/essay/upload/route.ts` | 上記を束ねるよう改修（QCゲート→検出→幾何補正→前処理→OCR→保存） | 変更 |
| `src/app/api/essay/confirm-ocr/route.ts` | `finalText`/`correctedSpans` 算出・保存 | 変更 |
| `scripts/eval-ocr.ts` | 評価CLI（CER等） | 新規 |
| `firestore.indexes.json` | `ocrRecords` 複合インデックス | 変更 |
| `storage.rules` | `essayOcr/**` の read/write ルール | 変更 |
| `.gitignore` | `evalset/` 除外 | 変更 |

## 8. 未解決点（実装計画で確定させる）
- ブラウザ/サーバQCの閾値の**最終値**（§4に暫定初期値あり→評価セットで較正）。
- `claude-grid` の JSON schema 最終形（訂正線・挿入記号・マス外追記の最終テキストへの反映規則）。
- 保持期間の具体値と、期限切れ削除の実行方式（Firestore TTL vs バッチ関数）。
- コスト予算の具体値（secondary併走の on/off 判断ライン）。
- 既存 essay 提出フローの `essaySubmissionId` を渡す**呼び出し箇所の特定**（統合方式は§2で「置換」と確定済み。実装時に現行 upload 呼び出し元を確認）。
