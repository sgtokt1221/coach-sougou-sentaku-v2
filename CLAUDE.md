# CLAUDE.md - CoachFor総合型選抜

## 1. Project Overview
- 総合型選抜（旧AO入試）に特化したAI学習支援Webアプリ
- 小論文の画像認識添削、大学別AP面接対策、成長トラッキング、ビッグデータ分析
- 管理者ポータル + 生徒ポータルの2ポータル構成
- 対応大学: 旧帝大7校、関関同立4校、MARCH5校、産近甲龍4校（初期20校）

## 2. Technical Stack
- フロントエンド: Next.js 15 + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui
- 認証: Firebase Authentication
- DB: Firestore (メイン) + BigQuery (ビッグデータ分析)
- ストレージ: Cloud Storage for Firebase (小論文画像、音声)
- AI: Claude API (添削・面接) + OpenAI TTS/Whisper (音声面接)
- ホスティング: Vercel or Firebase Hosting
- PWA対応

## 3. Key Files & Architecture
| File/Dir | Role |
|----------|------|
| docs/design.md | 設計書（DB設計、API設計、画面設計） |
| src/app/ | Next.js App Router ページ |
| src/app/(auth)/login/ | ログインページ |
| src/app/student/ | 生徒ポータル |
| src/app/admin/ | 管理者ポータル |
| src/components/ui/ | shadcn/ui コンポーネント |
| src/components/layout/ | レイアウトコンポーネント |
| src/components/shared/ | 共通コンポーネント |
| src/lib/firebase/config.ts | Firebase初期化（getApps重複防止） |
| src/lib/types/ | 型定義（user.ts, university.ts, essay.ts, interview.ts, matching.ts, growth.ts, admin.ts, session.ts, document.ts, activity.ts, passed-data.ts） |
| src/lib/utils.ts | cn() ユーティリティ（shadcn/ui用） |
| src/lib/growth/analyze.ts | 成長分析ロジック（弱点検出・更新・フィルタ） |
| src/lib/ai/prompts/ | AIプロンプト（essay.ts, interview.ts, summary.ts, document.ts, activity.ts） |
| src/components/interview/ | 面接UIコンポーネント（VoiceRecorder, AudioPlayback, TranscriptionView） |
| src/lib/matching/ | 志望校マッチングエンジン |
| src/components/growth/ | 成長トラッキングUIコンポーネント |
| src/contexts/ | React Context（AuthContext等） |
| src/data/ | 静的データ |

## 4. Database Schema
- Firestore: universities/, users/, users/{id}/essays/, users/{id}/interviews/, analytics/
- BigQuery: essay_submissions, interview_sessions, student_snapshots
- 詳細は docs/design.md 参照

## 5. Coding Conventions
- TypeScript strict mode
- コンポーネント: 関数コンポーネント + hooks
- 命名: camelCase (変数/関数), PascalCase (コンポーネント/型)
- AI関連の定数・プロンプトは src/lib/ai/prompts/ に集約

## 6. Development Commands
- `npm run dev` - ローカル開発サーバー（Turbopack）
- `npm run build` - ビルド
- `npm run lint` - ESLint
- `npm run format` - Prettier フォーマット
- `npm run format:check` - フォーマットチェック

## 7. Common Pitfalls
- Claude Vision APIのOCR精度: 手書きの崩し字は誤認識しやすい → 生徒に確認ステップ必須
- 大学データの鮮度: 毎年募集要項が変わるため、年次更新フローが必要
- BigQueryコスト: スキャン量に注意、パーティション設定必須

## 8. Current State / Known Issues
- Phase: Phase 1-5 全完了 + Superadmin/スコーピング実装完了
- 設計書: docs/design.md (v1.2) - 独占的差別化4機能追加済み
- **Superadmin + 管理者別生徒スコーピング（2026-03-22実装）**
  - ロール: student | teacher | admin | superadmin
  - 生徒に `managedBy: string`（担当admin/teacherのuid）追加
  - superadminは全データ閲覧可、admin/teacherは担当生徒のみ
  - src/lib/firebase/admin.ts: Firebase Admin SDK初期化 + verifyAuthToken()
  - src/lib/api/auth.ts: requireRole() — サーバーサイドロール検証
  - src/lib/api/client.ts: authFetch() — IDトークン自動付与fetchラッパー
  - 全Admin APIにrequireRole + managedByスコーピング適用済み
  - 全AdminページのfetchをauthFetchに置き換え済み
  - Firestoreルール: isSuperAdmin()追加、サブコレクションread権限拡張
  - /superadmin/dashboard, admins, admins/[id], admins/new, students — 5ページ
  - /api/superadmin/admins, admins/[id], students/assign, stats — 4APIルート
  - scripts/seed-superadmin.ts — superadmin作成スクリプト
  - devモードログインにsuperadminボタン追加
- Phase 0: Next.js 16 + Tailwind v4 + shadcn/ui セットアップ済み
- Phase 1A: Firebase Auth (Google+Email) + AuthContext + ロールベースルーティング + レイアウト完了
- Phase 1B: 大学データ20校JSON + 型定義 + Firestore投入スクリプト完了
- Phase 1C: 小論文添削（画像アップロード→OCR→AI添削→結果表示→履歴）完了
- Phase 1D: 成長トラッキング（弱点分析ロジック、弱点リマインドUI、ダッシュボード、成長レポート）完了
  - src/lib/growth/analyze.ts: analyzeGrowth, updateWeaknessRecords, getRemindableWeaknesses
  - /api/growth/weaknesses: GET(弱点リスト) + POST(dismiss)
  - /api/essay/review: 弱点DB自動更新統合済み
  - /student/dashboard: 弱点バナー + 直近添削 + スコア推移
  - /student/growth: スコア推移グラフ + 項目別推移 + 弱点マップ
  - /student/essay/new: Step1に提出前リマインドカード
  - /student/essay/[id]: 成長フィードバック（growthEvents）表示
- Phase 1F: 管理者ポータル（生徒一覧・詳細）完了
  - src/lib/types/admin.ts: StudentListItem, StudentDetail, EssayListItem, ScoreTrendPoint, AdminDashboardStats
  - /api/admin/students: GET(検索・ソート対応、アラートフラグ算出、モックfallback)
  - /api/admin/students/[id]: GET(プロフィール+添削履歴+弱点+スコア推移、モックfallback)
  - /admin/dashboard: 統計カード + 要注意生徒リスト + 最近の活動
  - /admin/students: 検索・ソート付き生徒一覧テーブル + ステータスBadge
  - /admin/students/[id]: プロフィール + スコア推移グラフ + 弱点テーブル + 添削履歴
- Phase 2A: AI模擬面接（型定義+API+プロンプト）完了
  - src/lib/types/interview.ts: Interview, InterviewScores, InterviewMessage, InterviewMode等
  - src/lib/types/matching.ts: MatchResult, MatchingRequest, MatchingResponse
  - src/lib/ai/prompts/interview.ts: 4モードシステムプロンプト + 評価プロンプト
  - /api/interview/start: セッション開始（AP取得、弱点取得、openingMessage生成）
  - /api/interview/message: Claude APIでチャット応答
  - /api/interview/end: スコア+フィードバック生成、弱点DB更新、Firestore保存
  - /api/interview/[id]: 面接結果取得
  - /api/interview/history: 履歴一覧
- Phase 2B: 面接UI完了
  - /student/interview/new: 大学/学部/モード選択 + 開始
  - /student/interview/session/[id]: チャットUI + タイマー + メモ
  - /student/interview/[id]/result: スコア4項目 + 弱点 + 改善 + 会話ログ
  - /student/interview/history: 履歴カード + スコア推移グラフ
- Phase 2C: 志望校マッチング完了
  - src/lib/matching/engine.ts: ルールベースマッチング（GPA/資格/要件比較）
  - /api/matching: プロフィール→全大学走査→スコアソート
  - /api/universities: 大学一覧 + /api/universities/[id]: 大学詳細
  - /student/universities: マッチング入力+結果一覧
  - /student/universities/[universityId]/[facultyId]: 志望校詳細（AP、選考フロー、要件チェック）
- Phase 2D: スケジュール管理完了
  - /api/schedule: 志望校日程イベントリスト
  - /student/universities/schedule: タイムライン表示、カウントダウン、月別グループ
- Phase 2E: 管理者大学データ編集完了
  - /api/admin/universities: GET(一覧) + /api/admin/universities/[id]: GET(詳細)+PUT(更新)
  - /admin/universities: 大学一覧テーブル（検索+グループフィルタ）
  - /admin/universities/[id]: 大学編集フォーム（基本情報+学部タブ+選考方法+日程）
- Phase 4A: 音声面接モード完了
  - src/lib/types/interview.ts: InterviewInputMode, Transcription, TranscriptionSegment型追加
  - src/components/interview/VoiceRecorder.tsx: MediaRecorder録音UI（波形アニメ+開始/停止）
  - src/components/interview/AudioPlayback.tsx: audio要素ベース再生UI
  - /api/interview/voice-message: 音声受信→文字起こし→AI応答（モック対応）
  - /api/interview/tts: テキスト→音声変換（モック: 無音WAV返却）
  - /student/interview/new: テキスト/音声モード選択トグル追加
  - /student/interview/session/[id]: 音声モード時VoiceRecorder表示
- Phase 4B: Whisper文字起こし完了
  - /api/transcribe: 汎用文字起こし（OpenAI Whisper REST直接呼び出し、モック対応）
  - /api/interview/[id]/transcription: トランスクリプション保存
  - src/components/interview/TranscriptionView.tsx: タイムスタンプ付きセグメント表示
  - /student/interview/[id]/result: トランスクリプション表示セクション追加
- Phase 4C: Claude自動サマリー完了
  - src/lib/ai/prompts/summary.ts: サマリー生成プロンプト（指導報告書テンプレート）
  - /api/summary/generate: 汎用サマリー生成API（モック対応）
  - /api/sessions/[id]/summary: セッション用サマリー生成
  - /admin/sessions/[id]: サマリー生成ボタン+表示接続済み
  - /student/interview/[id]/result: サマリーセクション追加
- Phase 4D: Google Meet UI完了（4Eのセッション管理UIに統合）
- Phase 4E: セッション管理完了
  - src/lib/types/session.ts: Session, SessionSummary, ActionItem, SessionCreateRequest等
  - /api/sessions: GET(一覧+フィルタ) + POST(作成) モック対応
  - /api/sessions/[id]: GET + PATCH + DELETE
  - /admin/sessions: セッション一覧（ステータス/タイプフィルタ）
  - /admin/sessions/new: セッション作成フォーム（Meetリンク手動入力含む）
  - /admin/sessions/[id]: 詳細+編集+Meetリンクコピー+参加ボタン+サマリー
  - /student/sessions: 共有セッション一覧
  - /student/sessions/[id]: セッション詳細（読み取り専用+サマリー表示）
  - Sidebar: 生徒「面談記録」、管理者「Sessions」追加
- Phase 5A: 出願書類エディタ + AI添削完了
  - src/lib/types/document.ts: Document, DocumentVersion, DocumentFeedback等
  - src/lib/ai/prompts/document.ts: AP合致度・構成・独自性3軸評価プロンプト
  - /api/documents: GET(一覧) + POST(作成) + /api/documents/[id]: GET+PUT+DELETE
  - /api/documents/[id]/review: AI添削実行
  - /api/documents/checklist: 大学別必要書類チェックリスト
  - /student/documents: 書類ダッシュボード（大学別完成度、期限カウントダウン）
  - /student/documents/[id]: 書類エディタ（文字数カウント+AI添削+バージョン履歴）
  - /student/documents/checklist: 必要書類チェックリスト
- Phase 5B: 活動実績AIヒアリング + 構造化完了
  - src/lib/types/activity.ts: Activity, StructuredActivityData, ActivityOptimization等
  - src/lib/ai/prompts/activity.ts: ヒアリング+AP最適化プロンプト
  - /api/activities: GET+POST + /api/activities/[id]: GET+PUT+DELETE
  - /api/activities/[id]/interview: AIヒアリング（チャット形式深掘り→自動構造化）
  - /api/activities/[id]/optimize: AP別最適化表現生成
  - /student/activities: 活動一覧（カテゴリフィルタ）
  - /student/activities/new: 活動登録（AIヒアリング/手動入力切替）
  - /student/activities/[id]: 活動詳細（構造化データ+AP最適化）
- Phase 5C: 合格者データ集計・閲覧完了
  - src/lib/types/passed-data.ts: PassedDataStatistics, PassedDataResponse, PassedDataCompareResponse
  - /api/passed-data/[universityId]/[facultyId]: 合格者統計
  - /api/passed-data/compare: 自分vs合格者比較
  - /student/passed-data: 合格者データ（平均カード、Rechartsスコア推移、弱点パターン）
  - /admin/passed-data: データ収集ダッシュボード
- Phase 5D: マルチモーダル面接分析完了
  - src/lib/types/interview.ts: VoiceAnalysis型追加
  - src/components/interview/VoiceAnalyzer.tsx: Web Audio APIリアルタイム音声分析
  - src/components/interview/VoiceAnalysisReport.tsx: 話速・フィラー・話し方分析レポート
  - /student/interview/session/[id]: VoiceAnalyzer統合
  - /student/interview/[id]/result: VoiceAnalysisReport表示
  - Sidebar: 生徒「出願書類」「活動実績」「合格者データ」、管理者「合格者データ」追加
- Phase D-2: 合否結果トラッキング完了
  - src/lib/types/exam-result.ts: ExamResult, ExamResultInput, ExamResultStats型定義
  - /api/admin/students/[id]/exam-results: GET(一覧) + POST(追加) managedByスコーピング適用
  - /api/admin/students/[id]/exam-results/[resultId]: PUT(更新) + DELETE(削除)
  - /api/admin/dashboard: GET(合格率集計)
  - src/components/admin/ExamResultsSection.tsx: 受験結果カード表示+追加モーダル+ステータス変更ドロップダウン+削除
  - /admin/students/[id]: ExamResultsSectionを埋め込み済み
  - /admin/dashboard: 合格率集計カード（出願中/合格/不合格/辞退/合格率）追加
  - Firestoreパス: users/{userId}/examResults/{resultId}
- Phase D-1: 書類期限アラート完了
  - AlertItem型に `document_deadline` タイプ + `high` severity追加
  - /api/admin/alerts: 書類期限検出ロジック追加（7日以内warning、3日以内high、当日/超過critical）
  - Firestore走査: users/{id}/documents の deadline + status をチェック
  - /admin/alerts: フィルタに「書類期限」追加、FileWarningアイコン、高/重要/注意の3段階表示
  - /admin/dashboard: 書類期限アラートカード追加（件数表示+アラートページへのリンク）
- Phase 3D: 成長レポート自動生成完了
  - src/lib/types/growth-report.ts: GrowthReport, WeaknessProgress, GrowthReportSummary, GenerateReportRequest, BatchReportRequest
  - src/lib/growth/report.ts: generateGrowthReport()（小論文/面接統計、弱点推移、推奨アクション、総合評価）
  - /api/admin/reports/generate: POST(個別レポート生成) requireRole+managedByスコーピング適用
  - /api/admin/reports/batch: POST(一括レポート生成) 全担当生徒のレポートを一括生成
  - /api/admin/reports/[studentId]: GET(レポート履歴) period/limitクエリ対応
  - /admin/reports: レポート生成ページ（週次/月次トグル、一括生成、展開式詳細表示）
  - Firestoreパス: users/{studentId}/growthReports/{reportId}
  - Sidebar: 管理者「レポート」追加
- Phase 3E: 予測型要注意アラート完了
  - AlertItem型に4つの新タイプ追加: ap_struggle, weakness_stuck, deadline_risk, score_plateau
  - AlertItem型にrecommendedAction（推奨アクション文）追加
  - /api/admin/alerts: 4つの新検出ロジック追加
    - ap_struggle: 直近5回のAP合致度スコア全て50%未満
    - weakness_stuck: 弱点3回以上指摘で改善なし
    - deadline_risk: 14日以内期限の未完成書類50%以上
    - score_plateau: 直近4回のスコア分散3点未満（成長停滞）
  - /admin/alerts: 8タイプフィルタ、各タイプ専用アイコン、推奨アクション表示（Lightbulbアイコン）
- Firebase SDK: .env.local 未設定（ビルドはnullセーフ、未設定でもSSG通過）
- npmキャッシュにroot所有ファイルあり → `--cache /tmp/npm-cache` で回避中

## 9. Implementation Roadmap

### Phase 0: プロジェクト初期セットアップ（1日）
- 0-1. Next.js 15 + TypeScript プロジェクト作成（create-next-app）
- 0-2. Tailwind CSS v4 + shadcn/ui セットアップ
- 0-3. Framer Motion + Recharts インストール
- 0-4. Firebase プロジェクト作成・SDK設定（.env.local）
- 0-5. ディレクトリ構造の作成（src/app, src/components, src/lib, data/）
- 0-6. ESLint + Prettier 設定
- 0-7. CLAUDE.md 更新（パス確定後）

### Phase 1: MVP（4-6週間）

#### 1A. 認証 + レイアウト（3-4日）← Phase 0 完了後
- 1A-1. Firebase Auth 設定（Google + メールログイン）
- 1A-2. AuthContext / useAuth フック
- 1A-3. ロールベースルーティング（student / teacher / admin）
- 1A-4. 共通レイアウト（ナビゲーション、サイドバー）
- 1A-5. UIデザインシステム（カラーパレット、Glass Morphism、アニメーション基盤）

#### 1B. 大学データベース構築（2-3日）← Phase 0 完了後（1Aと並行可能）
- 1B-1. 大学データJSON作成（20大学分）
  - 旧帝大7校 → 関関同立4校 → MARCH5校 → 産近甲龍4校
  - 各校: AP、選考方法、日程、出願要件
- 1B-2. Firestore投入スクリプト（data/ → universities/）
- 1B-3. 大学データ型定義（src/lib/types/university.ts）

#### 1C. 小論文添削機能（5-7日）← 1A + 1B 完了後
- 1C-1. 画像アップロードUI（カメラ撮影 / ファイル選択）
- 1C-2. Cloud Storage アップロード処理
- 1C-3. Claude Vision API OCR連携（/api/essay/upload）
- 1C-4. OCR確認・修正画面
- 1C-5. AI添削エンジン（/api/essay/review）
  - 添削プロンプト設計（src/lib/ai/prompts/essay.ts）
  - AP連動、弱点リスト連動
- 1C-6. 添削結果表示画面（スコア、フィードバック、レーダーチャート）
- 1C-7. 添削履歴一覧

#### 1D. 成長トラッキング（3-4日）← 1C 完了後
- 1D-1. growthProfile スキーマ実装（WeaknessRecord型）
- 1D-2. analyzeGrowth() ロジック（設計書4.3の実装）
- 1D-3. 弱点リマインドカードUI
- 1D-4. 弱点表示の画面別フィルタ

#### 1E. 生徒ダッシュボード（2-3日）← 1D 完了後
- 1E-1. ダッシュボードページ（/）
- 1E-2. 弱点リマインドカード（sticky、severity別色分け）
- 1E-3. 成長グラフ（Recharts）
- 1E-4. skeleton loading + アニメーション

#### 1F. 管理者: 生徒一覧・詳細（2-3日）← 1A + 1D 完了後
- 1F-1. 管理者ダッシュボード（/admin）
- 1F-2. 生徒一覧（検索・フィルタ）
- 1F-3. 生徒詳細（プロフィール、成長グラフ、弱点一覧、添削履歴）

### Phase 1 依存関係図
```
Phase 0（セットアップ）
  ├── 1A（認証+レイアウト）──┐
  └── 1B（大学DB）──────────┤
                            ├── 1C（小論文添削）
                            │     │
                            │     v
                            │   1D（成長トラッキング）
                            │     │
                            │     v
                            │   1E（生徒ダッシュボード）
                            │
                            └── 1F（管理者画面）← 1Dも必要
```

### Phase 2: 面接 + マッチング（3-4週間）← Phase 1 完了が前提
- 2A. AI模擬面接（テキストチャット）
  - 面接AIプロンプト設計（4モード: 個人/GD/プレゼン/口頭試問）
  - チャットUI + タイマー + 評価
- 2B. 大学別面接カスタマイズ
- 2C. 志望校マッチング
- 2D. スケジュール管理
- 2E. 管理者: 大学データ編集UI

### Phase 3: ビッグデータ + 高度分析（3-4週間）← Phase 1-2 完了が前提
- 3A. BigQuery連携パイプライン
- 3B. 管理者分析ダッシュボード
- 3C. 弱点パターン分析
- 3D. 成長レポート自動生成
- 3E. 要注意生徒アラート

### Phase 4: 音声・ビデオ面談 + 拡張（4-5週間）← Phase 2 完了が前提
- 4A. 音声面接（MediaRecorder + TTS/STT）
- 4B. Whisper文字起こしパイプライン
- 4C. Claude自動サマリー（指導報告書）
- 4D. Google Meet連携
- 4E. 面談セッション管理

### Phase 5: 独占的差別化機能（5-6週間）← Phase 1-2 完了が前提（Phase 3-4と並行可能）
- 5A. 出願書類エディタ + AI添削
- 5B. 活動実績AIヒアリング + 構造化
- 5C. 合格者データ集計・閲覧
- 5D. マルチモーダル面接分析（Web Audio API）
- 5E. Stripe決済連携

### Phase間の依存関係
```
Phase 0 → Phase 1 → Phase 2 → Phase 3
                  │           → Phase 4
                  └─────────→ Phase 5（3-4と並行可能）
```
