# CoachFor総合型選抜 - 設計書 v1.2

## 1. プロジェクト概要

### 1.1 プロダクトビジョン
総合型選抜（旧AO入試）に特化したAI学習支援プラットフォーム。
小論文の画像認識添削、大学別アドミッションポリシーに基づく面接対策、
生徒の成長トラッキングとビッグデータ分析を統合する。

#### 独占的差別化4機能（Phase 5）
ニッチ市場での独占的ポジションを確立するため、以下4機能を実装する。
いずれも後発の参入障壁となるネットワーク効果・データ蓄積型の機能である。

| # | 機能 | 概要 | 課金 |
|---|------|------|------|
| 1 | 合格者データネットワーク効果 | 合格者の匿名化統計データを蓄積し、「合格者の同時期スコア」との比較を提供。データ量がそのまま参入障壁になる | スタンダードに含む |
| 2 | 出願書類パッケージ完成支援 | 志望理由書・活動報告書・研究計画書等の大学別AI支援。バージョン管理・AP合致度リアルタイム分析 | **+50,000円（一括追加課金）** |
| 3 | 活動実績AI構造化 + 自動ポートフォリオ生成 | AIヒアリングで活動実績を深掘り→構造化し、AP別に最適化された表現を自動生成 | スタンダードに含む |
| 4 | マルチモーダル面接分析 | 話速・フィラー・抑揚の定量フィードバック。Web Audio APIによるクライアント側音声分析 | スタンダードに含む |

### 1.2 ターゲットユーザー
- **生徒**: 総合型選抜での大学受験を目指す高校2-3年生
- **管理者（塾講師・運営）**: 生徒の進捗管理、大学データ管理、分析

### 1.3 対応大学（初期20校）
| グループ | 大学 |
|---------|------|
| 旧帝大 | 東大、京大、北大、東北大、名大、阪大、九大 |
| 関関同立 | 関西大、関西学院大、同志社大、立命館大 |
| MARCH | 明治大、青山学院大、立教大、中央大、法政大 |
| 産近甲龍 | 京都産業大、近畿大、甲南大、龍谷大 |

---

## 2. システムアーキテクチャ

### 2.1 全体構成図

```
┌──────────────────────────────────────────────────────────┐
│                    クライアント (PWA)                       │
│  ┌─────────────────┐    ┌──────────────────────────┐     │
│  │  生徒ポータル     │    │  管理者ポータル            │     │
│  │  - 小論文添削     │    │  - 大学データ管理          │     │
│  │  - 面接練習       │    │  - 生徒管理・進捗閲覧      │     │
│  │  - 進捗ダッシュ   │    │  - ビッグデータ分析        │     │
│  │  - 志望校管理     │    │  - システム設定            │     │
│  │  - 出願書類管理   │    │  - 合格者データ管理        │     │
│  │  - 活動実績管理   │    │                           │     │
│  │  - 合格者データ   │    │                           │     │
│  └────────┬────────┘    └─────────────┬──────────────┘     │
│           │                           │                   │
└───────────┼───────────────────────────┼───────────────────┘
            │                           │
┌───────────▼───────────────────────────▼───────────────────┐
│                   API Layer (Next.js API Routes)           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ Essay API │ │Interview │ │ Matching │ │ Analytics API│ │
│  │(添削)     │ │API(面接) │ │API(志望校)│ │(分析)        │ │
│  └─────┬────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │Document  │ │Activity  │ │PassedData│  ← Phase 5 追加   │
│  │API(書類) │ │API(活動) │ │API(合格者)│                   │
│  └─────┬────┘ └────┬─────┘ └────┬─────┘                   │
│        │           │            │                          │
│  ┌─────▼───────────▼────────────▼───────────────────────┐ │
│  │              AI Engine Layer                          │ │
│  │  ┌────────────┐ ┌──────────┐ ┌─────────────────────┐ │ │
│  │  │Claude Vision│ │Claude API│ │Growth Tracker Engine│ │ │
│  │  │(OCR+添削)   │ │(面接AI)  │ │(成長分析エンジン)    │ │ │
│  │  └────────────┘ └──────────┘ └─────────────────────┘ │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │ Session Recorder (面談録画/音声 → 文字起こし)      │ │ │
│  │  │  Whisper API + Claude (サマリー/指導報告書生成)     │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │ Phase 5 追加エンジン                               │ │ │
│  │  │  ┌───────────────────┐ ┌──────────────────────┐  │ │ │
│  │  │  │Document Composer  │ │Activity Structuring  │  │ │ │
│  │  │  │Engine (出願書類AI) │ │Engine (活動実績構造化)│  │ │ │
│  │  │  └───────────────────┘ └──────────────────────┘  │ │ │
│  │  │  ┌───────────────────┐ ┌──────────────────────┐  │ │ │
│  │  │  │Multimodal Interview│ │Passed Student       │  │ │ │
│  │  │  │Analyzer (音声定量) │ │Analytics Engine     │  │ │ │
│  │  │  └───────────────────┘ └──────────────────────┘  │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────┘ │
└───────────────────────────┬───────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────┐
│                    データ層                                 │
│  ┌──────────────┐ ┌────────────────┐ ┌─────────────────┐ │
│  │  Firestore    │ │ Cloud Storage  │ │ BigQuery        │ │
│  │  (メインDB)   │ │ (画像/音声)    │ │ (ビッグデータ)   │ │
│  └──────────────┘ └────────────────┘ └─────────────────┘ │
│  ┌──────────────┐                                         │
│  │ Vector DB     │  ← Phase 5 追加                        │
│  │ (Pinecone)   │                                         │
│  └──────────────┘                                         │
└───────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────┐
│                    外部連携                                 │
│  ┌──────────────────┐ ┌──────────────────────────────┐   │
│  │ Google Meet API   │ │ Google Drive API              │   │
│  │ (面談リンク生成)   │ │ (録画ファイル取得)             │   │
│  └──────────────────┘ └──────────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

### 2.2 技術スタック

| レイヤー | 技術 | 選定理由 |
|---------|------|---------|
| フロントエンド | Next.js 15 + React 19 + TypeScript | SSR/SSG対応、APIルート統合 |
| スタイリング | Tailwind CSS v4 + shadcn/ui | 高速開発、一貫したUI |
| アニメーション | Framer Motion | ページ遷移・レイアウトアニメーション |
| グラフ | Recharts | アニメーション付きデータビジュアライゼーション |
| 認証 | Firebase Authentication | Google/メール認証、ロールベース |
| メインDB | Firestore | リアルタイム同期、柔軟なスキーマ |
| Vector DB | Pinecone | APベクトル検索（Phase 5） |
| ファイルストレージ | Cloud Storage for Firebase | 小論文画像、音声データ |
| ビッグデータ | BigQuery | 大規模分析、集計クエリ |
| AI (添削/面接) | Claude API (Opus/Sonnet) | 日本語性能、Vision対応 |
| AI (音声) | OpenAI TTS/Whisper | 面接音声の生成・認識・文字起こし |
| 音声分析 | Web Audio API + カスタム分析エンジン | 話速・フィラー・抑揚の定量分析（Phase 5）。クライアント側で分析し結果をAPI送信 |
| 面談連携 | Google Meet API / Google Drive API | 面談リンク生成・録画取得 |
| ホスティング | Vercel or Firebase Hosting | Next.js最適化 |
| PWA | next-pwa | オフライン対応、プッシュ通知 |

---

## 3. データベース設計

### 3.1 Firestore コレクション構造

```
firestore/
├── universities/                    # 大学マスタ
│   └── {universityId}/
│       ├── name: "京都大学"
│       ├── group: "kyutei"
│       ├── officialUrl: "https://..."
│       ├── updatedAt: timestamp
│       └── faculties/               # 学部サブコレクション
│           └── {facultyId}/
│               ├── name: "文学部"
│               ├── admissionPolicy: "高等学校における幅広い学習に..."
│               ├── capacity: 10
│               ├── requirements: {
│               │     gpa: 4.3,
│               │     englishCert: "TOEFL iBT 72点以上",
│               │     otherReqs: ["現役または1浪"]
│               │   }
│               ├── selectionMethods: [
│               │     {
│               │       stage: 1,
│               │       type: "documents",
│               │       details: "学業活動報告書、学びの設計書..."
│               │     },
│               │     {
│               │       stage: 2,
│               │       type: "essay",
│               │       details: "論述試験 120分"
│               │     }
│               │   ]
│               ├── schedule: {
│               │     applicationStart: "2025-09-02",
│               │     applicationEnd: "2025-09-06",
│               │     examDate: "2025-11-09",
│               │     resultDate: "2026-02-12"
│               │   }
│               └── senryaku/        # 方式別の詳細
│                   └── {methodId}/
│                       ├── methodName: "特色入試"
│                       ├── type: "sougou" | "suisen"
│                       └── details: "..."
│
├── users/                           # ユーザー
│   └── {userId}/
│       ├── role: "student" | "teacher" | "admin"
│       ├── displayName: "田中太郎"
│       ├── email: "..."
│       ├── createdAt: timestamp
│       │
│       │  # --- 生徒専用フィールド ---
│       ├── profile: {
│       │     school: "〇〇高校",
│       │     grade: 3,
│       │     gpa: 4.2,
│       │     englishCerts: ["英検準1級"],
│       │     activities: ["生徒会長", "ボランティア2年"],
│       │     interests: ["国際関係", "社会問題"]
│       │   }
│       ├── targetUniversities: [     # 志望校リスト
│       │     {
│       │       universityId: "kyoto-u",
│       │       facultyId: "letters",
│       │       methodId: "tokushoku",
│       │       priority: 1
│       │     }
│       │   ]
│       │
│       │  # --- 成長トラッキング ---
│       ├── growthProfile: {
│       │     strengths: ["論理構成力", "具体例の豊富さ"],
│       │     weaknesses: [
│       │       {
│       │         area: "結論の曖昧さ",
│       │         count: 5,              # 指摘回数
│       │         lastOccurred: timestamp,
│       │         improving: false,       # 改善傾向
│       │         resolved: false,        # 3回連続で指摘なし → 解決済み
│       │         source: "essay",        # "essay" | "interview" | "both"
│       │         reminderDismissedAt: timestamp | null  # 確認済み日時（次回提出/練習時にリセット）
│       │       },
│       │       {
│       │         area: "AP未参照",
│       │         count: 3,
│       │         lastOccurred: timestamp,
│       │         improving: true,
│       │         resolved: false,
│       │         source: "essay",
│       │         reminderDismissedAt: null
│       │       }
│       │     ],
│       │     overallTrend: "improving" | "stagnant" | "declining",
│       │     lastAnalyzedAt: timestamp
│       │   }
│       │
│       ├── essays/                   # 小論文履歴
│       │   └── {essayId}/
│       │       ├── imageUrl: "gs://..."
│       │       ├── ocrText: "認識されたテキスト..."
│       │       ├── targetUniversity: "kyoto-u"
│       │       ├── targetFaculty: "letters"
│       │       ├── topic: "学びの設計書"
│       │       ├── submittedAt: timestamp
│       │       ├── scores: {
│       │       │     structure: 7,       # 構成 /10
│       │       │     logic: 6,           # 論理性 /10
│       │       │     expression: 8,      # 表現力 /10
│       │       │     apAlignment: 5,     # AP合致度 /10
│       │       │     originality: 7,     # 独自性 /10
│       │       │     total: 33           # 合計 /50
│       │       │   }
│       │       ├── feedback: {
│       │       │     overall: "全体的な講評...",
│       │       │     goodPoints: ["...", "..."],
│       │       │     improvements: ["...", "..."],
│       │       │     repeatedIssues: [    # 繰り返しの問題点
│       │       │       {
│       │       │         issue: "結論の曖昧さ",
│       │       │         occurrenceNumber: 5,
│       │       │         severity: "high",
│       │       │         message: "これで5回目の指摘です。..."
│       │       │       }
│       │       │     ],
│       │       │     improvements_since_last: [  # 前回からの改善点
│       │       │       {
│       │       │         area: "具体例の使い方",
│       │       │         message: "前回と比べて具体例が的確に..."
│       │       │       }
│       │       │     ]
│       │       │   }
│       │       └── aiModel: "claude-sonnet-4-6"
│       │
│       ├── interviews/              # 面接練習履歴
│       │   └── {interviewId}/
│       │       ├── targetUniversity: "kyoto-u"
│       │       ├── targetFaculty: "letters"
│       │       ├── mode: "individual" | "group" | "presentation"
│       │       ├── startedAt: timestamp
│       │       ├── duration: 1200       # 秒
│       │       ├── messages: [          # 会話ログ
│       │       │     { role: "ai", content: "..." },
│       │       │     { role: "student", content: "..." }
│       │       │   ]
│       │       ├── scores: {
│       │       │     clarity: 7,         # 明確さ /10
│       │       │     apAlignment: 6,     # AP合致度 /10
│       │       │     enthusiasm: 8,      # 熱意 /10
│       │       │     specificity: 5,     # 具体性 /10
│       │       │     total: 26           # 合計 /40
│       │       │   }
│       │       ├── feedback: {
│       │       │     overall: "...",
│       │       │     goodPoints: ["..."],
│       │       │     improvements: ["..."],
│       │       │     repeatedIssues: [],
│       │       │     improvements_since_last: []
│       │       │   }
│       │       ├── aiModel: "claude-opus-4-6"
│       │       │
│       │       │  # --- 音声録音フィールド（Phase 4 追加） ---
│       │       ├── audioRecording: {            # 音声モード時のみ
│       │       │     url: "gs://bucket/interviews/audio-{id}.webm",
│       │       │     duration: 1200,            # 秒
│       │       │     format: "webm",
│       │       │     recordedAt: timestamp
│       │       │   } | null
│       │       ├── transcription: {             # 音声モード時のみ
│       │       │     fullText: "...",
│       │       │     segments: [
│       │       │       { timestamp: 30, speaker: "student", text: "..." }
│       │       │     ],
│       │       │     confidence: 0.92
│       │       │   } | null
│       │       ├── summary: {                   # 音声モード時のみ
│       │       │     overview: "...",
│       │       │     keyStrengths: ["..."],
│       │       │     improvements: ["..."],
│       │       │     actionItems: ["..."],
│       │       │     generatedAt: timestamp
│       │       │   } | null
│       │       │
│       │       │  # --- マルチモーダル音声分析（Phase 5 追加） ---
│       │       └── voiceAnalysis: {             # 音声モード時のみ
│       │             speechRate: 245,                 # 話速（字/分）
│       │             recommendedRate: 200,            # 推奨話速
│       │             fillerCount: 12,                 # フィラー回数
│       │             fillerRate: 0.15,                # フィラー率
│       │             fillerWords: [                   # フィラー詳細
│       │               { word: "えーと", count: 5, timestamps: [30, 85, ...] },
│       │               { word: "あのー", count: 4, timestamps: [...] }
│       │             ],
│       │             pauseAnalysis: {
│       │               avgPauseDuration: 1.2,         # 平均間の長さ（秒）
│       │               longPauses: 3,                 # 3秒以上の沈黙回数
│       │             },
│       │             volumeVariation: 0.35,           # 声量変動（0=一定、1=変動大）
│       │             overallVoiceScore: 7,            # 話し方総合スコア /10
│       │             feedback: {
│       │               speechRateAdvice: "少し速いです。200字/分を目安に...",
│       │               fillerAdvice: "「えーと」が多いです。間を取る練習を...",
│       │               deliveryAdvice: "声の抑揚は良好です。自信を持って..."
│       │             }
│       │           } | null
│       │
│       ├── documents/               # 出願書類（Phase 5 追加）
│       │   └── {documentId}/
│       │       ├── type: "志望理由書"|"学業活動報告書"|"研究計画書"|"自己推薦書"|"学びの設計書"
│       │       ├── universityId: "kyoto-u"
│       │       ├── facultyId: "letters"
│       │       ├── methodId: "tokushoku"
│       │       ├── status: "draft"|"in_review"|"revised"|"finalized"
│       │       ├── versions: [
│       │       │     {
│       │       │       versionNumber: 1,
│       │       │       content: "テキスト全文...",
│       │       │       wordCount: 800,
│       │       │       createdAt: timestamp,
│       │       │       aiReview: {
│       │       │         apAlignmentScore: 8,        # AP合致度 /10
│       │       │         structureScore: 7,           # 構成 /10
│       │       │         originalityScore: 6,         # 独自性 /10
│       │       │         overallFeedback: "...",
│       │       │         improvements: ["..."],
│       │       │         apSpecificNotes: "..."       # AP別の具体的改善提案
│       │       │       }
│       │       │     }
│       │       │   ]
│       │       ├── currentVersion: 3
│       │       ├── targetWordCount: 800               # 大学指定の文字数
│       │       ├── deadline: timestamp                 # 提出期限
│       │       ├── completionRate: 85                  # 完成度（%）
│       │       ├── linkedActivities: ["activityId1"]   # 参照している活動実績
│       │       └── createdAt: timestamp
│       │
│       ├── activities/              # 活動実績（Phase 5 追加）
│       │   └── {activityId}/
│       │       ├── title: "生徒会長として文化祭を企画運営"
│       │       ├── category: "leadership"|"volunteer"|"research"|"club"|"internship"|"competition"|"other"
│       │       ├── period: { start: "2024-04", end: "2025-03" }
│       │       ├── description: "生徒の自由記述..."
│       │       ├── structuredData: {              # AIが構造化
│       │       │     motivation: "なぜ始めたか",
│       │       │     actions: ["具体的に何をしたか"],
│       │       │     results: ["成果・数値"],
│       │       │     learnings: ["学んだこと"],
│       │       │     connection: "大学での学びとの接続"
│       │       │   }
│       │       ├── apOptimizedVersions: {         # 大学AP別の最適化表現
│       │       │     "kyoto-u_letters_tokushoku": {
│       │       │       optimizedText: "APに合わせた表現...",
│       │       │       alignmentScore: 8,
│       │       │       keyApKeywords: ["探究", "主体的学び"],
│       │       │       generatedAt: timestamp
│       │       │     }
│       │       │   }
│       │       ├── aiInterviewLog: [              # AIヒアリングの会話ログ
│       │       │     { role: "ai", content: "その活動で一番困難だったことは？" },
│       │       │     { role: "student", content: "..." }
│       │       │   ]
│       │       └── createdAt: timestamp
│       │
│       └── sessions/                # 講師×生徒リアル面談記録（Phase 4 追加）
│           └── {sessionId}/
│               ├── status: "scheduled"|"in_progress"|"completed"|"cancelled"
│               ├── type: "google_meet"
│               ├── teacherId: "講師のuserId"
│               ├── studentId: "生徒のuserId"
│               ├── meetLink: "https://meet.google.com/xxx"
│               ├── scheduledAt: timestamp
│               ├── startedAt: timestamp
│               ├── endedAt: timestamp
│               ├── duration: 1800               # 秒
│               ├── recordingUrl: "gs://bucket/sessions/..."  # Cloud Storageコピー
│               ├── transcription: {
│               │     fullText: "完全なトランスクリプト",
│               │     segments: [
│               │       { timestamp: 120, speaker: "teacher"|"student", text: "..." }
│               │     ],
│               │     confidence: 0.92
│               │   }
│               ├── summary: {                   # Claude自動生成の指導報告書
│               │     overview: "今回の面談の概要...",
│               │     topicsDiscussed: ["志望理由の深掘り", "AP合致度の確認"],
│               │     keyStrengths: ["具体的な活動実績の説明が上達"],
│               │     improvements: ["結論を先に述べる練習が必要"],
│               │     actionItems: ["次回までに志望理由書を800字で再提出"],
│               │     apAlignmentNotes: "京大特色入試のAP「学びの設計書」との関連性を...",
│               │     teacherNotes: "講師の手動追記メモ（任意）",
│               │     generatedAt: timestamp
│               │   }
│               ├── sharedWithStudent: true       # 生徒に共有済みフラグ
│               ├── studentViewedAt: timestamp | null
│               └── relatedWeaknesses: ["結論の曖昧さ", "AP未参照"]  # growthProfile連携
│
├── passedStudentData/               # 合格者匿名化統計データ（Phase 5 追加）
│   └── {universityId_facultyId}/
│       ├── universityId: "kyoto-u"
│       ├── facultyId: "letters"
│       ├── sampleSize: 45                     # データ件数
│       ├── statistics: {
│       │     avgEssaySubmissions: 23,         # 平均添削回数
│       │     avgInterviewPractices: 15,       # 平均模擬面接回数
│       │     avgFinalEssayScore: 42,          # 最終添削スコア平均
│       │     avgFinalInterviewScore: 34,
│       │     avgWeaknessResolutionDays: 21,   # 弱点克服の平均日数
│       │     topInitialWeaknesses: [          # 最初に多い弱点TOP5
│       │       { area: "結論の曖昧さ", frequency: 0.72 },
│       │       { area: "AP未参照", frequency: 0.65 }
│       │     ],
│       │     topResolvedBeforePass: [         # 合格前に克服した弱点TOP5
│       │       { area: "AP未参照", avgDaysToResolve: 14 }
│       │     ],
│       │     scoreProgressionPattern: [       # スコア推移パターン（出願N週前）
│       │       { weeksBeforeExam: 12, avgScore: 28 },
│       │       { weeksBeforeExam: 8, avgScore: 35 },
│       │       { weeksBeforeExam: 4, avgScore: 40 }
│       │     ]
│       │   }
│       ├── lastUpdatedAt: timestamp
│       └── minSampleThreshold: 5             # 表示最低件数（プライバシー）
│
├── analytics/                       # 集計データ（BigQueryからの同期）
│   └── {reportId}/
│       ├── type: "monthly" | "weekly"
│       ├── period: "2026-03"
│       ├── totalEssays: 1523
│       ├── totalInterviews: 892
│       ├── avgScores: { ... }
│       ├── topWeaknesses: [...]      # 全生徒共通の弱点TOP10
│       ├── universityPopularity: [...] # 志望校人気ランキング
│       └── generatedAt: timestamp
│
└── systemConfig/                    # システム設定
    └── global/
        ├── aiSettings: {
        │     essayModel: "claude-sonnet-4-6",
        │     interviewModel: "claude-opus-4-6",
        │     maxTokens: 4096
        │   }
        ├── scoringRubric: {         # 共通採点基準
        │     essay: { ... },
        │     interview: { ... }
        │   }
        └── updatedAt: timestamp
```

### 3.2 BigQuery スキーマ（ビッグデータ分析用）

```sql
-- 小論文提出ログ（全生徒分を蓄積）
CREATE TABLE essay_submissions (
  essay_id STRING NOT NULL,
  user_id STRING NOT NULL,
  university_id STRING,
  faculty_id STRING,
  submitted_at TIMESTAMP,

  -- スコア
  score_structure INT64,
  score_logic INT64,
  score_expression INT64,
  score_ap_alignment INT64,
  score_originality INT64,
  score_total INT64,

  -- メタデータ
  word_count INT64,
  topic STRING,
  ocr_confidence FLOAT64,
  ai_model STRING,

  -- 弱点タグ（配列）
  weakness_tags ARRAY<STRING>,
  -- 改善タグ
  improvement_tags ARRAY<STRING>
);

-- 面接練習ログ
CREATE TABLE interview_sessions (
  interview_id STRING NOT NULL,
  user_id STRING NOT NULL,
  university_id STRING,
  faculty_id STRING,
  started_at TIMESTAMP,
  duration_seconds INT64,
  mode STRING,  -- individual / group / presentation

  score_clarity INT64,
  score_ap_alignment INT64,
  score_enthusiasm INT64,
  score_specificity INT64,
  score_total INT64,

  weakness_tags ARRAY<STRING>,
  improvement_tags ARRAY<STRING>,
  question_count INT64,
  ai_model STRING
);

-- 生徒プロファイルスナップショット（定期バッチ）
CREATE TABLE student_snapshots (
  user_id STRING NOT NULL,
  snapshot_date DATE,
  gpa FLOAT64,
  target_university_ids ARRAY<STRING>,
  essay_count INT64,
  interview_count INT64,
  avg_essay_score FLOAT64,
  avg_interview_score FLOAT64,
  top_weaknesses ARRAY<STRING>,
  overall_trend STRING,  -- improving / stagnant / declining

  -- 最終的な合否結果（受験後に記録）
  admission_results ARRAY<STRUCT<
    university_id STRING,
    faculty_id STRING,
    result STRING  -- passed / failed / pending
  >>
);

-- 面談セッションログ（Phase 4 追加）
CREATE TABLE session_logs (
  session_id STRING NOT NULL,
  teacher_id STRING NOT NULL,
  student_id STRING NOT NULL,
  scheduled_at TIMESTAMP,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  duration_seconds INT64,
  type STRING,                -- google_meet
  transcription_confidence FLOAT64,
  summary_generated BOOL,
  shared_with_student BOOL,
  topics_discussed ARRAY<STRING>,
  weakness_tags ARRAY<STRING>,
  action_items ARRAY<STRING>
);

-- AI模擬面接の音声ログ（Phase 4 追加）
-- interview_sessions テーブルに以下カラムを追加
-- has_audio_recording BOOL,
-- audio_duration_seconds INT64,
-- transcription_confidence FLOAT64,
-- summary_generated BOOL

-- 出願書類ログ（Phase 5 追加）
CREATE TABLE document_submissions (
  document_id STRING NOT NULL,
  user_id STRING NOT NULL,
  university_id STRING,
  faculty_id STRING,
  document_type STRING,
  version_number INT64,
  word_count INT64,
  ap_alignment_score INT64,
  structure_score INT64,
  originality_score INT64,
  completion_rate INT64,
  submitted_at TIMESTAMP
);

-- 活動実績ログ（Phase 5 追加）
CREATE TABLE activity_logs (
  activity_id STRING NOT NULL,
  user_id STRING NOT NULL,
  category STRING,
  has_structured_data BOOL,
  optimization_count INT64,       -- AP最適化生成回数
  linked_document_count INT64,    -- 紐付けされた書類数
  ai_interview_turns INT64,       -- AIヒアリングのターン数
  created_at TIMESTAMP,
  last_optimized_at TIMESTAMP
);

-- 合格者データ集計パイプライン（Phase 5 追加・定期バッチ）
-- student_snapshots テーブルの admission_results から
-- passedStudentData コレクションを自動更新

-- ビッグデータ分析用ビュー例
-- 「合格者の共通パターン」を抽出
CREATE VIEW passed_student_patterns AS
SELECT
  sr.university_id,
  sr.faculty_id,
  AVG(ss.avg_essay_score) as avg_essay_of_passed,
  AVG(ss.avg_interview_score) as avg_interview_of_passed,
  APPROX_TOP_COUNT(w, 10) as common_initial_weaknesses
FROM student_snapshots ss,
  UNNEST(ss.admission_results) sr,
  UNNEST(ss.top_weaknesses) w
WHERE sr.result = 'passed'
GROUP BY sr.university_id, sr.faculty_id;
```

---

## 4. 生徒ポータル設計

### 4.1 画面構成

```
生徒ポータル
├── ダッシュボード (/)
│   ├── **弱点リマインドカード（最上部・大きめ表示・sticky）**
│   │   ├── 未解決の弱点を severity 順に表示
│   │   ├── 5回以上: 赤バナー「最重要改善ポイント」+ 指摘回数バッジ（大）
│   │   ├── 3-4回: 黄バナー「要注意」+ 指摘回数バッジ
│   │   ├── 改善済み（resolved=true）: 緑バナー「克服おめでとう！」+ チェックマーク
│   │   ├── 改善傾向（improving=true）: 青バナー「いい調子！」+ 上昇矢印
│   │   └── 「確認済み」ボタン（一時非表示、次回提出/練習時にリセット）
│   ├── 成長グラフ（スコア推移）
│   ├── 今週のタスク
│   ├── AI からのメッセージ（褒め/指摘）
│   └── 志望校までのスケジュール
│
├── 小論文添削 (/essay)
│   ├── 新規提出 (/essay/new)
│   │   ├── **【書く前にチェック】あなたの弱点リマインド**
│   │   │   ├── critical（5回以上）の弱点 → 赤枠で強調表示
│   │   │   ├── warning（3-4回）の弱点 → 黄枠で表示
│   │   │   ├── resolved=true の弱点 → 緑背景 + 取り消し線「改善済み」
│   │   │   └── 「今回はこの点を意識して書きましょう」メッセージ
│   │   ├── カメラ撮影 / 画像アップロード
│   │   ├── 大学・学部・テーマ選択
│   │   └── OCR確認 → 添削実行
│   ├── 添削結果 (/essay/[id])
│   │   ├── スコア表示（5項目レーダーチャート）
│   │   ├── **繰り返し弱点セクション（ページ上部・大型カード）**
│   │   │   ├── 赤カード: 5回以上の弱点 → 「本番で致命的」警告
│   │   │   ├── 黄カード: 3-4回の弱点 → 「要改善」
│   │   │   ├── 指摘回数の推移グラフ（この弱点が何回目か視覚化）
│   │   │   └── 具体的な改善アクション提案
│   │   ├── **改善おめでとうセクション（緑背景・大型カード）**
│   │   │   ├── 前回指摘 → 今回克服した弱点
│   │   │   ├── 「前回: ○○ → 今回: △△ と改善！」のbefore/after表示
│   │   │   └── 連続克服数（ストリーク）表示
│   │   ├── 全体講評
│   │   ├── 良い点（緑ハイライト）
│   │   ├── その他の改善点（黄ハイライト）
│   │   └── 前回比較（改善点は褒めコメント付き）
│   └── 履歴一覧 (/essay/history)
│       ├── スコア推移グラフ
│       └── 弱点の改善状況一覧
│
├── 面接練習 (/interview)
│   ├── 練習開始 (/interview/new)
│   │   ├── 大学・学部選択
│   │   ├── モード選択（個人面接/GD/プレゼン/口頭試問）
│   │   ├── **【練習前にチェック】面接での弱点リマインド**
│   │   │   ├── 面接モードに関連する弱点のみフィルタ表示
│   │   │   ├── critical の弱点 → 赤枠「重点改善ポイント」
│   │   │   ├── warning の弱点 → 黄枠「意識するポイント」
│   │   │   └── resolved=true の弱点 → 緑背景「克服済み」
│   │   └── テキスト or 音声 選択
│   ├── 練習中 (/interview/session/[id])
│   │   ├── AIとの対話画面
│   │   ├── タイマー表示
│   │   └── メモエリア
│   ├── 結果 (/interview/[id]/result)
│   │   ├── スコア表示
│   │   ├── **繰り返し弱点セクション（大型カード、添削結果と同様の構成）**
│   │   ├── **改善おめでとうセクション（緑背景・大型カード）**
│   │   ├── 回答ごとのフィードバック
│   │   ├── 前回比較
│   │   ├── **音声録音セクション（Phase 4 追加・音声モード時のみ）**
│   │   │   ├── 録音再生プレイヤー
│   │   │   ├── トランスクリプション表示（タイムスタンプ付き）
│   │   │   └── 「自分の回答を聞き直す」ボタン
│   │   ├── **自動サマリーセクション（Phase 4 追加・音声モード時のみ）**
│   │   │   ├── 概要
│   │   │   ├── 良かった点 / 改善点
│   │   │   └── 次回の練習で意識するポイント
│   │   └── **話し方分析セクション（Phase 5 追加・音声モード時のみ）**
│   │       ├── 話速メーター（245字/分 → 推奨200字/分、赤/黄/緑表示）
│   │       ├── フィラー分析
│   │       │   ├── フィラー率: 15% → 目標5%以下
│   │       │   ├── フィラー別カウント（「えーと」5回、「あのー」4回）
│   │       │   └── タイムライン上のフィラー位置マーカー
│   │       ├── 間の取り方（平均1.2秒、3秒以上の沈黙: 3回）
│   │       ├── 声の抑揚グラフ（時系列の音量変動）
│   │       └── 話し方総合スコア: 7/10
│   │           └── 前回比較（前回6/10 → 今回7/10 +1）
│   └── 履歴一覧 (/interview/history)
│
├── 出願書類管理 (/documents)          # Phase 5 追加
│   ├── 書類ダッシュボード
│   │   ├── 大学別の書類完成度（プログレスバー）
│   │   ├── 提出期限カウントダウン
│   │   └── 全書類の完成度サマリー（「京大 85% / 同志社 60%」）
│   ├── 書類作成 (/documents/[universityId]/[type])
│   │   ├── テキストエディタ（文字数カウント付き）
│   │   ├── AIリアルタイムフィードバック（サイドパネル）
│   │   │   ├── AP合致度リアルタイムスコア
│   │   │   ├── 「この段落でAPの〇〇に触れると効果的」提案
│   │   │   └── 活動実績の引用候補サジェスト
│   │   ├── バージョン履歴（diff表示）
│   │   ├── AI添削実行ボタン（詳細フィードバック生成）
│   │   └── 「活動実績から引用」ボタン → activities連携
│   └── 書類チェックリスト (/documents/checklist)
│       ├── 大学別の必要書類リスト
│       ├── 各書類のステータス（未着手/作成中/レビュー中/完成）
│       └── 提出期限アラート
│
├── 活動実績管理 (/activities)          # Phase 5 追加
│   ├── 活動一覧
│   │   ├── カテゴリ別表示（リーダーシップ/ボランティア/研究...）
│   │   ├── 各活動のAP最適化状態（「3大学分生成済み」）
│   │   └── 新規活動追加ボタン
│   ├── 活動登録 (/activities/new)
│   │   ├── AIヒアリングモード（チャット形式で深掘り）
│   │   │   ├── 「その活動を始めたきっかけは？」
│   │   │   ├── 「最も困難だった場面は？」
│   │   │   ├── 「定量的な成果はありますか？」
│   │   │   └── ヒアリング完了後に自動構造化
│   │   └── 手動入力モード（フォーム形式）
│   └── 活動詳細 (/activities/[id])
│       ├── 構造化データ表示（動機→行動→成果→学び→接続）
│       ├── AP別最適化表現の生成・確認
│       │   ├── 「京大向けに最適化」ボタン → AP連動で表現変換
│       │   ├── 最適化前/後の比較表示
│       │   └── AP合致度スコア
│       └── 引用先の出願書類リスト
│
├── 合格者データ (/passed-data)         # Phase 5 追加
│   ├── 大学別合格者統計
│   │   ├── 「京大文学部合格者の平均」カード
│   │   │   ├── 平均添削回数: 23回
│   │   │   ├── 平均模擬面接回数: 15回
│   │   │   ├── 最終添削スコア平均: 42/50
│   │   │   └── スコア推移グラフ（出願N週前からの推移パターン）
│   │   ├── 「あなた vs 合格者平均」比較グラフ
│   │   │   ├── 現在のスコアと合格者の同時期スコアを重ねて表示
│   │   │   └── 「合格者は今の時期に平均35点でした。あなたは33点。あと少し！」
│   │   └── よくある弱点と克服パターン
│   │       ├── 「合格者の72%が最初に『結論の曖昧さ』を指摘されています」
│   │       └── 「平均21日で克服しています」
│   └── データ不足時の表示
│       └── 「この大学・学部のデータはまだ十分ではありません（最低5件必要）」
│
├── 志望校管理 (/target)
│   ├── マッチング (/target/matching)
│   │   ├── プロフィール入力（評定、資格、活動実績）
│   │   ├── 条件マッチ結果一覧
│   │   └── 併願戦略シミュレーション
│   ├── 志望校詳細 (/target/[universityId]/[facultyId])
│   │   ├── AP全文
│   │   ├── 選考フロー・日程
│   │   ├── 出願要件チェックリスト
│   │   └── この大学に合格した先輩のデータ（匿名）
│   └── スケジュール (/target/schedule)
│       └── タイムライン形式で出願〜合格発表
│
├── 面談記録 (/sessions)                    # Phase 4 追加
│   ├── 面談一覧（講師とのリアル面談履歴）
│   │   ├── 日付・講師名・所要時間
│   │   ├── サマリー（指導報告書）プレビュー
│   │   └── 未読バッジ（sharedWithStudent=true かつ studentViewedAt=null）
│   └── 面談詳細 (/sessions/[id])
│       ├── 指導報告書（サマリー）全文表示
│       │   ├── 概要
│       │   ├── 議題一覧
│       │   ├── 良かった点（緑ハイライト）
│       │   ├── 改善点（黄ハイライト）
│       │   ├── 次回までのアクションアイテム（赤枠・チェックリスト形式）
│       │   └── 講師メモ（手動追記がある場合）
│       ├── トランスクリプション（折りたたみ表示）
│       └── 録画再生（署名付きURL、有効期限24時間）
│
├── 成長レポート (/growth)
│   ├── 総合スコア推移
│   ├── 項目別推移（構成力、論理性、AP合致度...）
│   ├── 弱点マップ（改善済み / 継続中 / 新規）
│   ├── AIからの総評メッセージ
│   └── 目標設定・達成状況
│
└── 設定 (/settings)
    ├── プロフィール編集
    ├── 通知設定（弱点リマインド通知含む）
    └── テーマ設定
```

### 4.1.1 弱点リマインドUI仕様

```
■ 表示ルール

【severity判定】
- critical (赤): count >= 5 かつ resolved=false
- warning (黄): count >= 3 かつ resolved=false
- improving (青): improving=true かつ resolved=false
- resolved (緑): resolved=true

【表示優先順位】（上から順に表示）
1. critical → 赤背景 + 太字 + 指摘回数バッジ（数字を大きく表示）
2. warning → 黄背景 + 指摘回数バッジ
3. improving → 青背景 + 上昇矢印アイコン
4. resolved → 緑背景 + チェックマーク + 「克服！」ラベル

【配置ルール】
- ダッシュボード: 画面最上部に sticky 固定、スクロールしても常に視界に入る
- 新規提出/練習開始: コンテンツエリア上部に大きめカードで表示（非sticky）
- 添削結果/面接結果: スコア表示直下に大型カードで表示

【確認済み（dismiss）動作】
- 生徒が「確認済み」ボタンを押すと reminderDismissedAt に現在時刻を記録
- ダッシュボードでは確認済みの弱点は折りたたみ表示（完全非表示にはならない）
- 次回の小論文提出または面接練習を行うと reminderDismissedAt を null にリセット
- 永久非表示にはできない仕様（必ず毎回目に入る設計）

■ 弱点0件時の表示（空状態）
- 未提出（弱点データなし）: 「まだ弱点データがありません。小論文を提出して添削を受けましょう！」
- 全弱点が resolved: 「全ての弱点を克服しました！ この調子で本番に備えましょう」（緑背景）
- ダッシュボードのstickyバナーは弱点0件時は非表示（高さ0）

■ リマインドカードの表示件数制限
- ダッシュボード: 最大5件表示 + 「他N件の弱点を見る」リンク → /growth へ遷移
- 新規提出/練習開始: 最大3件（critical/warningのみ）
- 添削結果/面接結果: 件数制限なし（該当回の弱点全て表示）

■ モバイル時のstickyバナー配慮
- スマホ表示（幅768px以下）: stickyバナーの高さは最大120px
- 弱点が多い場合は横スクロール（カルーセル形式）で表示
- 折りたたみボタン付き（タップで展開/縮小）

■ 弱点リマインドの画面別フィルタ

- ダッシュボード: 全ての未解決弱点 + 直近3回以内に解決した弱点
- 小論文新規提出: 小論文で指摘された弱点のみ（面接固有の弱点は非表示）
- 面接練習開始: 面接で指摘された弱点のみ（小論文固有の弱点は非表示）
- 添削結果: 今回の添削で検出された弱点 + 今回改善された弱点
- 面接結果: 今回の練習で検出された弱点 + 今回改善された弱点
- 成長レポート: 全弱点の時系列マップ（既存機能）
```

### 4.1.2 プッシュ通知による弱点リマインド

```
■ 通知トリガー

1. 無活動リマインド
   - 条件: 3日以上小論文提出も面接練習もしていない生徒
   - 内容: 「『{最もcountが多い未解決弱点}』がまだ未解決です。
            練習して克服しましょう！」
   - 頻度: 最大週2回（月・木の18:00）

2. 弱点悪化アラート
   - 条件: count が5を超えた弱点が新たに発生した場合
   - 内容: 「【要注意】『{弱点名}』が{count}回目の指摘です。
            このままでは本番で致命的です。重点的に対策しましょう。」
   - 頻度: 発生時即座に1回のみ

3. 克服おめでとう通知
   - 条件: resolved=true に変わった弱点が発生した場合
   - 内容: 「『{弱点名}』を克服しました！ 素晴らしい成長です。
            この調子で他の弱点も改善していきましょう。」
   - 頻度: 発生時即座に1回

■ 通知設定
- 生徒は /settings で通知のON/OFF切り替え可能
- デフォルト: 全通知ON
- 管理者は個別生徒の通知を強制ONにはできない（プライバシー配慮）

■ 実装基盤
- 通知方式: Firebase Cloud Messaging (FCM) + PWA Web Push
- 無活動リマインド: Cloud Functions (Scheduled) で月・木 18:00 JST にバッチ実行
  → Firestoreから3日以上未活動の生徒をクエリ → FCM送信
- 弱点悪化/克服通知: 添削・面接結果保存時にCloud Functions (onWrite) でトリガー
- FCMトークン: ユーザー初回ログイン時に取得し users/{userId}/fcmTokens に保存
```

### 4.2 小論文添削フロー（詳細）

```
[生徒] 小論文を撮影 / 画像アップロード
        │
        ▼
[フロント] 画像をCloud Storageにアップロード
        │
        ▼
[API] Claude Vision APIに画像送信
      プロンプト: 「この手書き文章をOCRしてください。
                  段落構成も保持してください。」
        │
        ▼
[フロント] OCR結果を生徒に確認させる
          （誤認識があれば手動修正）
        │
        ▼
[API] 添削リクエスト送信
      入力:
        - OCRテキスト（確認済み）
        - 志望大学のAP
        - 志望学部の選考基準
        - 過去の添削履歴サマリー（growthProfile）
        - 過去の弱点リスト + 指摘回数
        │
        ▼
[AI Engine] Claude API で添削実行
      システムプロンプト:
        """
        あなたは総合型選抜の小論文添削の専門家です。

        ## 採点基準（各10点満点）
        1. 構成: 序論→本論→結論の流れ、段落構成
        2. 論理性: 根拠の明確さ、因果関係の正確性
        3. 表現力: 語彙の適切さ、文章の読みやすさ
        4. AP合致度: アドミッションポリシーとの整合性
        5. 独自性: 独自の視点、具体的な経験の活用

        ## 志望大学のアドミッションポリシー
        {admissionPolicy}

        ## この生徒の過去の弱点
        {weaknessList}

        ## 重要ルール
        - 過去に指摘済みの弱点が改善されていたら、
          具体的に「前回は〇〇でしたが、今回は△△と
          改善されています。素晴らしい成長です！」と褒める
        - 同じ弱点が繰り返されている場合（特に3回以上）、
          はっきりと「これは{count}回目の指摘です。
          {weakness}は{university}の選考で致命的な弱点に
          なります。具体的に〇〇を意識してください」と
          厳しく指摘する
        - 新しい弱点は普通のトーンで指摘する
        """
        │
        ▼
[API] 結果をパース
      → Firestoreに保存（essays/{essayId}）
      → growthProfile を更新
        → weaknesses[].source を "essay" or "both" に設定
        → 全弱点の reminderDismissedAt を null にリセット（次回表示のため）
      → BigQueryにログ送信（非同期）
      → 弱点悪化時/克服時: プッシュ通知トリガー（非同期）
        │
        ▼
[フロント] 添削結果を表示
```

### 4.3 成長トラッキングエンジン（Growth Tracker）

```typescript
// 成長トラッキングの核心ロジック

interface WeaknessRecord {
  area: string;           // "結論の曖昧さ"
  count: number;          // 指摘回数
  firstOccurred: Date;
  lastOccurred: Date;
  improving: boolean;     // 直近3回で改善傾向か
  resolved: boolean;      // 3回連続で指摘なし → 解決済み
  source: "essay" | "interview" | "both";  // 弱点の検出元
  reminderDismissedAt: Date | null;        // 確認済み日時（次回提出/練習でリセット）
}

// 弱点リマインドの表示レベル判定
type WeaknessReminderLevel = "critical" | "warning" | "improving" | "resolved";

function getWeaknessReminderLevel(w: WeaknessRecord): WeaknessReminderLevel | null {
  if (w.resolved) return "resolved";
  if (w.count >= 5) return "critical";
  if (w.count >= 3) return "warning";
  if (w.improving) return "improving";
  return null; // count < 3 かつ未解決・非改善傾向 → リマインド対象外
}

// リマインド表示対象の弱点を取得（nullは除外）
function getRemindableWeaknesses(
  weaknesses: WeaknessRecord[],
  context: "dashboard" | "essay_new" | "interview_new" | "essay_result" | "interview_result"
): WeaknessRecord[] {
  return weaknesses
    .filter(w => {
      // レベル判定: リマインド対象外はスキップ
      if (getWeaknessReminderLevel(w) === null) return false;
      // 画面別ソースフィルタ
      if (context === "essay_new" || context === "essay_result") {
        return w.source === "essay" || w.source === "both";
      }
      if (context === "interview_new" || context === "interview_result") {
        return w.source === "interview" || w.source === "both";
      }
      return true; // dashboard: 全表示
    })
    .sort((a, b) => {
      // severity順ソート: critical > warning > improving > resolved
      const order = { critical: 0, warning: 1, improving: 2, resolved: 3 };
      const la = getWeaknessReminderLevel(a)!;
      const lb = getWeaknessReminderLevel(b)!;
      return (order[la] - order[lb]) || (b.count - a.count);
    });
}

interface GrowthEvent {
  type: "praise" | "warning" | "critical";
  message: string;
  relatedArea: string;
}

// 添削結果から成長イベントを生成
function analyzeGrowth(
  currentResult: EssayResult,
  history: EssayResult[],
  weaknesses: WeaknessRecord[]
): GrowthEvent[] {
  const events: GrowthEvent[] = [];

  // 1. 改善検出 → 褒める
  for (const weakness of weaknesses) {
    const wasInCurrent = currentResult.weaknessTags.includes(weakness.area);
    if (!wasInCurrent && weakness.count >= 2) {
      events.push({
        type: "praise",
        message: `「${weakness.area}」が改善されています！` +
                 `過去${weakness.count}回指摘されていましたが、` +
                 `今回はクリアできました。この調子で続けましょう！`,
        relatedArea: weakness.area
      });
    }
  }

  // 2. 繰り返し検出 → 厳しく指摘
  for (const tag of currentResult.weaknessTags) {
    const record = weaknesses.find(w => w.area === tag);
    if (record) {
      const newCount = record.count + 1;
      if (newCount >= 5) {
        events.push({
          type: "critical",
          message: `【重要】「${tag}」は今回で${newCount}回目の指摘です。` +
                   `このままでは本番で確実に減点されます。` +
                   `次回提出前に、必ずこの点を意識して書き直してください。`,
          relatedArea: tag
        });
      } else if (newCount >= 3) {
        events.push({
          type: "warning",
          message: `「${tag}」が${newCount}回目の指摘です。` +
                   `意識的に改善に取り組みましょう。`,
          relatedArea: tag
        });
      }
    }
  }

  // 3. スコア推移から全体トレンド判定
  const recentScores = history.slice(-5).map(h => h.scores.total);
  const trend = detectTrend(recentScores);
  if (trend === "improving") {
    events.push({
      type: "praise",
      message: "直近5回のスコアが上昇傾向です！着実に成長しています。",
      relatedArea: "overall"
    });
  } else if (trend === "declining") {
    events.push({
      type: "warning",
      message: "直近のスコアが下降傾向です。" +
               "基本に立ち返って、構成から見直してみましょう。",
      relatedArea: "overall"
    });
  }

  return events;
}
```

### 4.4 面接AI の動作仕様

```
■ モード別の動作

1. 個人面接モード
   - APに基づく質問を生成
   - 志望理由 → 深掘り → 将来ビジョン → 逆質問の流れ
   - 回答に対してリアルタイムで追加質問（深掘り）

2. グループディスカッションモード
   - AIが3-4人の他の受験生役を演じる
   - テーマを提示し、生徒が議論に参加
   - リーダーシップ、協調性、論理性を評価

3. プレゼンテーションモード
   - 生徒がテーマに沿ってプレゼン（テキスト入力）
   - AIが質疑応答で深掘り
   - 構成力、説得力、質疑対応力を評価

4. 口頭試問モード（理系向け）
   - 専門知識に関する質問
   - 思考プロセスの説明を求める
   - 正確性と説明力を評価

■ 大学別カスタマイズ例

- 京大特色入試: 「学びの設計書」に基づく質問中心
- 東北大AO: 基礎学力を確認する口頭試問を含む
- 関学探究評価型: 探究活動の成果について深掘り
- 同志社商学部: 英語プレゼンテーション形式
- 中央法学部: 模擬講義後の理解度確認形式
- 龍谷政策学部: PCスライドプレゼン+質疑応答形式
```

### 4.5 自動サマリー生成パイプライン（Phase 4 追加）

```
■ リアル面談（講師×生徒）のパイプライン

[Google Meet終了]
    │
    ▼
[Cloud Functions onSchedule] 面談終了15分後にトリガー
    ├── Google Drive API で録画ファイル取得
    ├── Cloud Storage にコピー
    │
    ▼
[API] /api/sessions/[id]/process
    ├── Whisper API で全文字起こし（language: "ja"）
    ├── 話者分離（speaker diarization）
    │
    ▼
[Claude Opus] 指導報告書生成
    プロンプト:
    """
    あなたは総合型選抜の指導報告書を作成する専門家です。
    以下の面談トランスクリプトから指導報告書を生成してください。

    ## 生徒情報
    {studentProfile}
    ## 志望校
    {targetUniversities}
    ## 現在の弱点
    {currentWeaknesses}
    ## トランスクリプト
    {transcription}

    ## 出力形式（JSON）
    - overview: 面談の概要（200字以内）
    - topicsDiscussed: 議題リスト
    - keyStrengths: 良かった点
    - improvements: 改善点
    - actionItems: 次回までの具体的アクション
    - apAlignmentNotes: AP合致度に関するメモ
    """
    │
    ▼
[API] Firestore に保存
    → sessions/{id}/summary, transcription を更新
    → growthProfile.weaknesses を更新（新しい弱点の検出）
    → 講師に「サマリー生成完了」通知
    │
    ▼
[講師] サマリー確認・編集 → 「生徒に共有」ボタン
    → 生徒にプッシュ通知


■ AI模擬面接の音声パイプライン

[面接終了]
    │
    ▼
[フロント] MediaRecorder API で録音データを取得
    ├── Blob → Cloud Storage にアップロード
    │
    ▼
[API] /api/interview/end（拡張）
    ├── 音声URL を interviews/{id}/audioRecording に保存
    ├── Whisper API で文字起こし
    ├── Claude でサマリー生成（既存のfeedback生成と統合）
    └── growthProfile 更新

■ マルチモーダル音声分析パイプライン（Phase 5 追加）

[面接中（クライアント側）]
    ├── Web Audio API で音声ストリームをリアルタイム分析
    │   ├── 話速計算（文字数/分）※文字起こし結果と照合して算出
    │   ├── フィラー検出（「えーと」「あのー」「まあ」等、パターンマッチ）
    │   ├── 間の分析（沈黙の長さ・頻度、AudioContext.analyserNode）
    │   └── 音量変動分析（抑揚の定量化、RMS値の時系列記録）
    │
[面接終了時]
    ├── クライアントが分析結果をJSON形式でAPIに送信
    └── /api/interview/end の voiceAnalysis フィールドとして保存

■ エラーハンドリング

- Whisper文字起こし失敗時:
  → sessions/{id}/transcription を null のまま保持
  → 講師に「文字起こし失敗」通知を送信
  → 講師は手動でトランスクリプトを入力するか、再処理を実行可能
  → サマリーはトランスクリプト無しでは生成しない
- Claude サマリー生成失敗時:
  → トランスクリプトは保存済みなので再試行可能
  → 講師に「サマリー生成失敗・再試行可能」通知
- 録画ファイル取得失敗時:
  → Google Drive APIのレート制限等を考慮し、最大3回リトライ（5分間隔）
  → 3回失敗後、講師に「録画取得失敗」通知
```

---

## 5. 管理者ポータル設計

### 5.1 画面構成

```
管理者ポータル
├── ダッシュボード (/admin)
│   ├── 生徒数・アクティブ率
│   ├── 今週の添削数・面接練習数
│   ├── 全体平均スコア推移
│   └── アラート（停滞生徒、期限接近）
│
├── 生徒管理 (/admin/students)
│   ├── 生徒一覧（検索・フィルタ）
│   ├── 生徒詳細 (/admin/students/[id])
│   │   ├── プロフィール・志望校
│   │   ├── 成長グラフ
│   │   ├── 弱点一覧（指摘回数・改善状況）
│   │   ├── 添削履歴
│   │   ├── 面接練習履歴
│   │   ├── 講師メモ追加
│   │   ├── **面談記録タブ（Phase 4 追加）**
│   │   │   ├── 全面談の時系列リスト
│   │   │   ├── 各面談のサマリー（指導報告書）即時表示
│   │   │   ├── 講師メモの追記・編集
│   │   │   ├── トランスクリプション全文
│   │   │   ├── 録画再生
│   │   │   └── アクションアイテムの達成状況チェック
│   │   ├── **AI模擬面接の音声記録タブ（Phase 4 追加）**
│   │   │   ├── 音声録音の再生
│   │   │   ├── トランスクリプション確認
│   │   │   └── 自動サマリー確認
│   │   ├── **出願書類タブ（Phase 5 追加）**
│   │   │   ├── 全書類の完成度一覧
│   │   │   ├── 各書類の最新バージョン閲覧
│   │   │   ├── 講師コメント追記
│   │   │   └── 提出期限アラート管理
│   │   └── **活動実績タブ（Phase 5 追加）**
│   │       ├── 構造化された活動一覧
│   │       ├── AP最適化表現の確認・編集
│   │       └── 活動と書類の紐付け確認
│   └── 要注意生徒リスト
│       ├── スコア下降中
│       ├── 長期未活動
│       └── 同じ弱点を5回以上繰り返し
│
├── 大学データ管理 (/admin/universities)
│   ├── 大学一覧
│   ├── 大学詳細・編集 (/admin/universities/[id])
│   │   ├── 基本情報
│   │   ├── 学部・AP編集
│   │   ├── 選考方法・日程編集
│   │   └── 出願要件編集
│   └── 一括インポート（Excel/CSV）
│
├── 面談管理 (/admin/sessions)              # Phase 4 追加
│   ├── カレンダービュー（講師別・生徒別フィルタ）
│   ├── 新規面談作成
│   │   ├── 生徒選択
│   │   ├── 日時選択
│   │   ├── Google Meetリンク自動生成
│   │   └── 生徒への通知送信
│   └── 面談後のサマリー確認・編集・共有ワークフロー
│       ├── 自動生成サマリーの確認
│       ├── 講師による編集・メモ追記
│       ├── 「生徒に共有」ボタン → sharedWithStudent=true
│       └── 共有時にプッシュ通知送信
│
├── 合格者データ管理 (/admin/passed-data)    # Phase 5 追加
│   ├── データ収集ダッシュボード
│   │   ├── 大学別のデータ件数・カバレッジ
│   │   ├── データ提供依頼の送信管理
│   │   └── データ品質チェック（外れ値検出）
│   └── 統計データ確認・編集
│       ├── 自動集計結果の確認
│       ├── 手動補正（必要な場合）
│       └── 公開/非公開の切り替え
│
├── ビッグデータ分析 (/admin/analytics)
│   ├── 概況レポート
│   │   ├── 全生徒のスコア分布
│   │   ├── 大学別・学部別の志望者数
│   │   └── 月次推移
│   ├── 弱点分析
│   │   ├── 全生徒に共通する弱点TOP10
│   │   ├── 大学別に求められるスキルと生徒の乖離
│   │   └── 改善に成功した生徒のパターン
│   ├── 合格予測（将来機能）
│   │   ├── スコア推移 × 過去の合格者データ → 合格確率
│   │   └── 「あと何点伸ばせば合格ゾーン」の可視化
│   └── レポートエクスポート（PDF/Excel）
│
└── システム設定 (/admin/settings)
    ├── AI設定（モデル選択、温度パラメータ）
    ├── 採点基準カスタマイズ
    ├── 通知設定
    └── ユーザー権限管理
```

### 5.2 ビッグデータ分析ダッシュボード詳細

```
■ 収集するデータポイント

【小論文関連】
- 提出数 / 日・週・月
- 項目別平均スコア（構成、論理性、表現力、AP合致度、独自性）
- 弱点タグの出現頻度
- 弱点の改善率（指摘後に改善された割合）
- OCR精度（手動修正率）
- 大学別・テーマ別のスコア傾向

【面接関連】
- 練習回数 / 日・週・月
- モード別の利用率
- 項目別平均スコア
- よく聞かれる質問パターン
- 回答の平均文字数・応答時間

【ユーザー行動】
- 機能別利用率
- セッション時間
- 継続率（日次/週次/月次）
- 志望校変更の推移

【合否データ（受験後に収集）】
- 大学×学部×方式ごとの合格率
- 合格者の平均スコア推移パターン
- 合格者に共通する弱点克服のタイミング

■ 分析クエリ例

-- 「結論の曖昧さ」を克服した生徒の平均所要期間
SELECT
  AVG(DATE_DIFF(resolved_date, first_occurred_date, DAY)) as avg_days_to_resolve
FROM weakness_resolution_log
WHERE weakness_area = '結論の曖昧さ'
AND resolved = true;

-- 京大文学部合格者のスコア推移パターン
SELECT
  weeks_before_exam,
  AVG(score_total) as avg_score
FROM essay_submissions_with_timeline
WHERE university_id = 'kyoto-u'
AND faculty_id = 'letters'
AND user_id IN (SELECT user_id FROM admission_results WHERE result = 'passed')
GROUP BY weeks_before_exam
ORDER BY weeks_before_exam;
```

---

## 6. API設計

### 6.1 エンドポイント一覧

```
# 認証
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/logout

# 小論文
POST   /api/essay/upload          # 画像アップロード + OCR
POST   /api/essay/confirm-ocr     # OCR結果確認・修正
POST   /api/essay/review          # AI添削実行
GET    /api/essay/[id]            # 添削結果取得
GET    /api/essay/history         # 履歴一覧
GET    /api/essay/stats           # スコア推移統計

# 面接
POST   /api/interview/start       # セッション開始
POST   /api/interview/message     # メッセージ送信（AI応答取得）
POST   /api/interview/end         # セッション終了 + 評価取得（Phase 5: voiceAnalysis追加）
GET    /api/interview/[id]        # 結果取得
GET    /api/interview/history     # 履歴一覧

# 志望校
GET    /api/universities          # 大学一覧
GET    /api/universities/[id]     # 大学詳細
GET    /api/matching              # マッチング実行
POST   /api/target                # 志望校登録

# 成長
GET    /api/growth/profile        # 成長プロフィール
GET    /api/growth/report         # 成長レポート
GET    /api/growth/weaknesses     # 弱点一覧
POST   /api/growth/weaknesses/dismiss  # 弱点リマインド確認済み
GET    /api/growth/weaknesses/reminder # 弱点リマインドデータ取得（画面別フィルタ対応）

# 面談セッション（講師×生徒） Phase 4 追加
POST   /api/sessions/create        # 面談作成 + Google Meetリンク生成
GET    /api/sessions                # 面談一覧（講師用/生徒用フィルタ）
GET    /api/sessions/[id]           # 面談詳細
POST   /api/sessions/[id]/process   # 録画取得→文字起こし→サマリー生成（非同期）
PUT    /api/sessions/[id]/summary   # サマリー編集（講師のみ）
POST   /api/sessions/[id]/share     # 生徒への共有 + 通知
GET    /api/sessions/[id]/recording  # 録画の署名付きURL取得

# AI模擬面接の音声（既存API拡張） Phase 4 追加
# 注: POST /api/interview/end は上記「面接」セクションの既存APIを拡張（audioRecordingUrlフィールド追加）
GET    /api/interview/[id]/audio    # 音声の署名付きURL取得

# 出願書類（Phase 5 追加）
POST   /api/documents/create          # 書類作成
GET    /api/documents                  # 書類一覧
GET    /api/documents/[id]             # 書類詳細
PUT    /api/documents/[id]             # 書類更新（新バージョン追加）
POST   /api/documents/[id]/review      # AI添削実行
GET    /api/documents/checklist        # 大学別チェックリスト

# 活動実績（Phase 5 追加）
POST   /api/activities/create          # 活動登録
GET    /api/activities                  # 活動一覧
GET    /api/activities/[id]            # 活動詳細
PUT    /api/activities/[id]            # 活動更新
POST   /api/activities/[id]/interview   # AIヒアリング開始
POST   /api/activities/[id]/optimize    # AP別最適化表現生成

# 合格者データ（Phase 5 追加）
GET    /api/passed-data/[universityId]/[facultyId]  # 合格者統計
GET    /api/passed-data/compare         # 自分vs合格者比較

# 書類・活動の削除（Phase 5 追加）
DELETE /api/documents/[id]             # 書類削除
DELETE /api/activities/[id]            # 活動削除

# 管理者
GET    /api/admin/students        # 生徒一覧
GET    /api/admin/students/[id]   # 生徒詳細
PUT    /api/admin/universities/[id] # 大学情報更新
POST   /api/admin/universities/import # 一括インポート
GET    /api/admin/analytics/overview  # 分析概況
GET    /api/admin/analytics/weaknesses # 弱点分析
GET    /api/admin/analytics/export    # レポートエクスポート
```

### 6.2 主要APIの詳細

```typescript
// POST /api/essay/review
interface EssayReviewRequest {
  essayId: string;
  ocrText: string;              // 確認済みOCRテキスト
  universityId: string;
  facultyId: string;
  topic?: string;               // テーマ（任意）
}

interface EssayReviewResponse {
  essayId: string;
  scores: {
    structure: number;          // 0-10
    logic: number;
    expression: number;
    apAlignment: number;
    originality: number;
    total: number;              // 0-50
  };
  feedback: {
    overall: string;
    goodPoints: string[];
    improvements: string[];
    repeatedIssues: RepeatedIssue[];
    improvementsSinceLast: Improvement[];
  };
  growthEvents: GrowthEvent[];  // 褒め/警告イベント
}

// GET /api/growth/weaknesses/reminder?context=dashboard|essay_new|interview_new|essay_result|interview_result
interface WeaknessReminderResponse {
  weaknesses: {
    area: string;
    count: number;
    level: "critical" | "warning" | "improving" | "resolved";
    source: "essay" | "interview" | "both";
    improving: boolean;
    resolved: boolean;
    lastOccurred: string;       // ISO date
    dismissed: boolean;         // reminderDismissedAt != null
    improvementMessage?: string; // 改善時の before/after メッセージ
    actionSuggestion?: string;   // 改善アクション提案
    streak?: number;             // 連続克服数
  }[];
  lastActivityAt: string | null; // 最終活動日時
  daysSinceLastActivity: number; // 無活動日数
}

// POST /api/growth/weaknesses/dismiss
interface WeaknessDismissRequest {
  areas: string[];  // 確認済みにする弱点の area リスト
}

// POST /api/interview/start
interface InterviewStartRequest {
  universityId: string;
  facultyId: string;
  mode: "individual" | "group_discussion" | "presentation" | "oral_exam";
  inputMode: "text" | "voice";
}

interface InterviewStartResponse {
  sessionId: string;
  openingMessage: string;       // AIの最初の発言
  estimatedDuration: number;    // 推奨練習時間（秒）
  universityContext: {
    admissionPolicy: string;
    selectionDetails: string;
  };
}

// --- Phase 4 追加: 面談セッション系API ---

// POST /api/sessions/create
interface SessionCreateRequest {
  studentId: string;
  scheduledAt: string;          // ISO datetime
  notes?: string;               // 事前メモ（任意）
}

interface SessionCreateResponse {
  sessionId: string;
  meetLink: string;             // 自動生成されたGoogle Meetリンク
  scheduledAt: string;
  studentName: string;
}

// POST /api/sessions/[id]/process
interface SessionProcessResponse {
  sessionId: string;
  status: "processing" | "completed" | "failed";
  transcription?: {
    fullText: string;
    segments: { timestamp: number; speaker: "teacher" | "student"; text: string }[];
    confidence: number;
  };
  summary?: {
    overview: string;
    topicsDiscussed: string[];
    keyStrengths: string[];
    improvements: string[];
    actionItems: string[];
    apAlignmentNotes: string;
  };
  error?: string;               // 失敗時のエラーメッセージ
}

// PUT /api/sessions/[id]/summary
interface SessionSummaryUpdateRequest {
  teacherNotes?: string;        // 講師の手動メモ追記
  actionItems?: string[];       // アクションアイテムの編集
}

// POST /api/interview/end（Phase 4/5 拡張フィールド）
interface InterviewEndRequest {
  sessionId: string;
  audioRecordingUrl?: string;   // 音声録音のCloud Storage URL（音声モード時のみ）
}

interface InterviewEndResponse {
  // ... 既存フィールド ...
  voiceAnalysis?: {             // Phase 5 追加（音声モード時のみ）
    speechRate: number;
    recommendedRate: number;
    fillerCount: number;
    fillerRate: number;
    fillerWords: { word: string; count: number; timestamps: number[] }[];
    pauseAnalysis: {
      avgPauseDuration: number;
      longPauses: number;
    };
    volumeVariation: number;
    overallVoiceScore: number;
    feedback: {
      speechRateAdvice: string;
      fillerAdvice: string;
      deliveryAdvice: string;
    };
  };
}

// --- Phase 5 追加: 出願書類系API ---

// POST /api/documents/create
interface DocumentCreateRequest {
  type: "志望理由書" | "学業活動報告書" | "研究計画書" | "自己推薦書" | "学びの設計書";
  universityId: string;
  facultyId: string;
  methodId: string;
  targetWordCount?: number;
  deadline?: string;            // ISO datetime
}

// PUT /api/documents/[id]
interface DocumentUpdateRequest {
  content: string;              // 新バージョンのテキスト全文
  linkedActivities?: string[];  // 参照する活動実績ID
}

// POST /api/documents/[id]/review
interface DocumentReviewResponse {
  apAlignmentScore: number;
  structureScore: number;
  originalityScore: number;
  overallFeedback: string;
  improvements: string[];
  apSpecificNotes: string;
}

// --- Phase 5 追加: 活動実績系API ---

// POST /api/activities/create
interface ActivityCreateRequest {
  title: string;
  category: "leadership" | "volunteer" | "research" | "club" | "internship" | "competition" | "other";
  period: { start: string; end: string };
  description: string;
}

// POST /api/activities/[id]/interview
interface ActivityInterviewRequest {
  message: string;              // 生徒の回答
}

interface ActivityInterviewResponse {
  aiQuestion: string;           // 次の深掘り質問
  isComplete: boolean;          // ヒアリング完了フラグ
  structuredData?: {            // 完了時に生成
    motivation: string;
    actions: string[];
    results: string[];
    learnings: string[];
    connection: string;
  };
}

// POST /api/activities/[id]/optimize
interface ActivityOptimizeRequest {
  universityId: string;
  facultyId: string;
  methodId: string;
}

interface ActivityOptimizeResponse {
  optimizedText: string;
  alignmentScore: number;
  keyApKeywords: string[];
}

// --- Phase 5 追加: 合格者データAPI ---

// GET /api/passed-data/[universityId]/[facultyId]
interface PassedDataResponse {
  universityId: string;
  facultyId: string;
  sampleSize: number;
  statistics: {
    avgEssaySubmissions: number;
    avgInterviewPractices: number;
    avgFinalEssayScore: number;
    avgFinalInterviewScore: number;
    avgWeaknessResolutionDays: number;
    topInitialWeaknesses: { area: string; frequency: number }[];
    topResolvedBeforePass: { area: string; avgDaysToResolve: number }[];
    scoreProgressionPattern: { weeksBeforeExam: number; avgScore: number }[];
  };
  insufficient: boolean;        // sampleSize < minSampleThreshold
}

// GET /api/passed-data/compare
interface PassedDataCompareResponse {
  universityId: string;
  facultyId: string;
  studentCurrentScore: number;
  passedAvgAtSameWeek: number;
  scoreDiff: number;
  message: string;              // 「合格者は今の時期に平均35点でした。あなたは33点。」
}
```

---

## 7. セキュリティ設計

### 7.1 認証・認可

```
■ ロールベースアクセス制御

student:
  - 自分のデータのみ読み書き可能
  - 大学データは読み取りのみ
  - 他の生徒のデータにアクセス不可
  - 講師が共有した面談セッションのみ閲覧可能
  - 合格者データ（匿名化済み）は閲覧可能

teacher（講師）:
  - 担当生徒のデータ閲覧可能
  - 自分が担当する面談セッションの作成・編集・共有が可能
  - 大学データは読み取りのみ
  - 分析データの閲覧不可（admin権限が必要）

admin:
  - 全生徒のデータ閲覧可能
  - 大学データの編集可能
  - 分析データの閲覧・エクスポート可能
  - システム設定の変更可能
  - 全面談セッションの閲覧可能
  - 合格者データの管理・編集可能

■ Firestore セキュリティルール（抜粋）

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ユーザーは自分のデータのみ
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;

      // サブコレクション（essays, interviews, documents, activities）
      // 注: documents, activities は Phase 5 追加。
      // Firestoreは最も具体的なルールを優先するため、sessions以外の
      // サブコレクション（essays, interviews, documents, activities）はこのルールで処理される。
      match /{subcollection}/{docId} {
        allow read, write: if request.auth.uid == userId
          && subcollection != 'sessions';  // sessionsは別途定義
      }

      // 面談セッション（Phase 4 追加）
      match /sessions/{sessionId} {
        // 生徒: sharedWithStudent=true の自分のセッションのみ読み取り可
        allow read: if request.auth.uid == userId
          && resource.data.sharedWithStudent == true;
        // 講師: 自分が担当したセッションのみ読み書き可
        allow read, write: if request.auth.uid == resource.data.teacherId;
        // 管理者: 全セッション閲覧可
        allow read: if isAdmin();
      }
    }

    // 大学データは全員読み取り可、管理者のみ書き込み可
    match /universities/{universityId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();

      match /{subcollection}/{docId} {
        allow read: if request.auth != null;
        allow write: if isAdmin();
      }
    }

    // 合格者データ（匿名化済み・全認証ユーザー閲覧可）（Phase 5 追加）
    match /passedStudentData/{dataId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }

    // 管理者のみ分析データにアクセス
    match /analytics/{reportId} {
      allow read: if isAdmin();
    }

    function isAdmin() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    function isTeacher() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
    }
  }
}
```

### 7.2 データプライバシー

```
■ 個人情報の取り扱い

- 小論文の画像・テキストは暗号化して保存
- BigQueryへの送信時は個人を特定できない形に匿名化
  （user_idをハッシュ化、氏名・学校名は送信しない）
- 「合格した先輩のデータ」表示時は完全匿名化
- 生徒の退会時はFirestore上の個人データを削除
  （BigQuery上の匿名化済みデータは統計目的で保持）
- AI APIへの送信時に個人名・学校名をマスキング

■ 合格者データのプライバシー保護（Phase 5 追加）

- 合格者データは最低5件以上でのみ公開（k-匿名性）
- 個人を特定可能な情報は一切含まない
- 生徒の同意なしにデータを統計に使用しない（利用規約で明記）
- passedStudentData コレクションには匿名化済みの統計データのみ格納
- 5件未満の場合は「データ不足」と表示し、統計を非公開にする

■ Cloud Storage 署名付きURL（Phase 4 追加）

- 録画・音声ファイルへの直接アクセスは不可
- API経由で署名付きURL（有効期限24時間）を発行
- 生成済みURLのキャッシュは不可（毎回API呼び出し）
- 面談録画は講師が「共有」するまで生徒からアクセス不可

■ 録画・音声ファイルの保持期間ポリシー（Phase 4 追加）

- 面談録画: 作成日から12ヶ月間保持、以降自動削除（Cloud Storage Lifecycle設定）
- AI模擬面接音声: 作成日から6ヶ月間保持、以降自動削除
- トランスクリプト・サマリー（テキスト）: Firestoreに永続保存（削除不要）
- 生徒退会時: 全録画・音声ファイルを即時削除（テキストは匿名化してBigQueryに保持）
```

---

## 8. 開発ロードマップ

### Phase 1: MVP（4-6週間）
- [ ] プロジェクトセットアップ（Next.js + Firebase）
- [ ] 認証（メール/Google ログイン）
- [ ] 大学データベース構築（20大学分のJSON投入）
- [ ] 小論文画像添削（撮影→OCR→AI添削→結果表示）
- [ ] 基本的な成長トラッキング（スコア履歴保存）
- [ ] 生徒ダッシュボード
- [ ] 管理者: 生徒一覧・詳細閲覧

### Phase 2: 面接 + マッチング（3-4週間）
- [ ] AI模擬面接（テキストチャット）
- [ ] 大学別面接モードのカスタマイズ
- [ ] 志望校マッチング機能
- [ ] スケジュール管理
- [ ] 管理者: 大学データ編集UI

### Phase 3: ビッグデータ + 高度分析（3-4週間）
- [ ] BigQuery連携（ログ送信パイプライン）
- [ ] 管理者分析ダッシュボード
- [ ] 弱点パターン分析
- [ ] 成長レポート自動生成
- [ ] 要注意生徒アラート

### Phase 4: 音声・ビデオ面談 + 拡張（4-5週間）
- [ ] AI模擬面接の音声録音（MediaRecorder API）
- [ ] Whisper文字起こしパイプライン
- [ ] Claude自動サマリー生成（指導報告書）
- [ ] Google Meet連携（リンク生成・録画取得）
- [ ] 面談セッション管理（スケジュール・CRUD）
- [ ] 指導報告書の確認・編集・共有ワークフロー
- [ ] 生徒ポータル: 面談記録ページ
- [ ] 管理者ポータル: 面談管理・音声記録タブ
- [ ] Cloud Storage署名付きURL生成
- [ ] BigQueryログ拡張
- [ ] 音声面接（TTS/STT統合）
- [ ] グループディスカッション練習
- [ ] 合格予測モデル
- [ ] 対応大学拡大（50校+）
- [ ] レポートエクスポート（PDF）

### Phase 5: 独占的差別化機能（5-6週間）

**コールドスタート戦略**: 合格者データは初年度はサンプル数不足が予想される。
対策として (1) 塾の既存卒業生にアンケート依頼（Googleフォーム → BigQuery投入）、
(2) 5件未満の大学は「データ収集中」表示 + 全大学平均データを参考表示、
(3) 2年目以降はアプリ利用者の合格実績が自動蓄積されネットワーク効果が発動する。

- [ ] 出願書類エディタ（テキスト入力・文字数カウント・バージョン管理）
- [ ] 出願書類AI添削（AP合致度・構成・独自性）
- [ ] 大学別書類チェックリスト・期限管理
- [ ] 活動実績AIヒアリング（チャット形式で深掘り→構造化）
- [ ] 活動実績のAP別最適化表現生成（ベクトルDB連携）
- [ ] 合格者データ集計パイプライン（BigQuery→Firestore）
- [ ] 合格者データ閲覧画面（統計・比較グラフ）
- [ ] マルチモーダル面接分析（話速・フィラー・抑揚）
- [ ] Web Audio API音声解析エンジン
- [ ] 出願書類×活動実績の連携UI

---

## 9. コスト試算・料金体系

### 9.1 料金プラン

| プラン | 料金 | 内容 |
|-------|------|------|
| スタンダード | 10,000円/月 | 小論文添削・面接練習・成長トラッキング・合格者データ閲覧・音声分析 |
| 出願書類パッケージ（オプション） | +50,000円（一括追加課金） | 出願書類AI支援 + 活動実績構造化 + AP別最適化（スタンダード契約者のみ購入可） |

**決済連携**: Stripe Checkout を使用。スタンダードは月額サブスクリプション（Stripe Billing）、
出願書類パッケージは一括課金（Payment Intent）。購入後に `users/{userId}/subscriptions` に記録し、
APIミドルウェアで書類・活動系APIのアクセスを制御する。

### 9.2 月間運用コスト（生徒100人想定）

| 項目 | 単価 | 月間使用量 | 月額 |
|-----|------|-----------|------|
| Claude API (Sonnet) 添削 | ~15円/回 | 500回 | 7,500円 |
| Claude API (Opus) 面接 | ~50円/セッション | 300回 | 15,000円 |
| Claude Vision (OCR) | ~5円/回 | 500回 | 2,500円 |
| OpenAI TTS (Phase4) | ~3円/回 | 200回 | 600円 |
| Firebase (Firestore+Auth+Storage) | - | - | 3,000円 |
| BigQuery | - | - | 1,000円 |
| Vercel Pro | - | - | 2,400円 |
| **基本合計** | | | **約32,000円/月** |

### 9.3 Phase 4 追加コスト（面談・音声機能）

| 項目 | 単価 | 月間使用量 | 月額 |
|-----|------|-----------|------|
| Google Workspace Business Standard (講師5人) | 1,360円/人 | 5人 | 6,800円 |
| Whisper API (文字起こし) | 0.9円/分 | 12,500分 | 11,250円 |
| Claude Opus (サマリー生成) | ~15円/回 | 500回 | 7,500円 |
| Cloud Storage (録画・音声保存) | - | - | 2,000円 |
| **追加合計** | | | **約27,550円/月** |

### 9.4 Phase 5 追加コスト（独占的差別化機能、うちプレミアム30人想定）

| 項目 | 単価 | 月間使用量 | 月額 |
|-----|------|-----------|------|
| Claude API（書類添削） | ~15円/回 | 600回 | 9,000円 |
| Claude API（活動ヒアリング） | ~30円/セッション | 150回 | 4,500円 |
| Claude API（AP最適化生成） | ~10円/回 | 300回 | 3,000円 |
| Pinecone（ベクトルDB） | - | - | 0円（無料枠） |
| Web Audio処理 | - | - | 0円（クライアント側） |
| **追加合計** | | | **約16,500円/月** |

### 9.5 損益分岐（Phase 5 込み）

```
総コスト:
  基本 32,000円 + Phase 4 追加 27,550円 + Phase 5 追加 16,500円 = 月額約76,050円

収入:
  スタンダード 100人 × 10,000円 = 1,000,000円
  出願書類パッケージ 30人 × 50,000円 ÷ 6ヶ月 = 250,000円/月（6ヶ月按分）
  合計: 1,250,000円/月

粗利: 1,173,950円（粗利率 94%） ← 極めて健全
```

---

## 10. UIデザイン方針

### 10.1 カラーパレット（ブルー基調）

| 用途 | カラー | コード |
|------|--------|--------|
| Primary | Blue-600 | #2563EB |
| Primary Dark | Blue-700 | #1D4ED8 |
| Primary Light | Blue-500 | #3B82F6 |
| Accent | Cyan-500 | #06B6D4 |
| Background | Slate-50 | #F8FAFC |
| Surface | White | #FFFFFF |
| Text Primary | Slate-900 | #0F172A |
| Text Secondary | Slate-500 | #64748B |
| Success | Emerald-500 | #10B981 |
| Warning | Amber-500 | #F59E0B |
| Error | Red-500 | #EF4444 |

### 10.2 アニメーション・トランジション

```
■ ページ遷移
- Framer Motion でスムーズトランジション（fade + slide、300ms ease-out）

■ リスト表示
- staggered animation（各アイテムが順次フェードイン、50msディレイ）

■ スコアカウントアップ
- 数値がカウントアップアニメーションで表示（spring physics）

■ カード展開
- layout animation（高さ変化がスムーズに補間）

■ グラフ描画
- Recharts + アニメーション付き描画（左から右へスウィープ）

■ ダッシュボード
- skeleton loading（コンテンツ読み込み中のシマー効果）

■ ボタンホバー
- scale(1.02) + shadow拡大（150ms ease）

■ モーダル
- backdrop-blur + scale-in（200ms）

■ プログレスバー
- 幅のトランジション（500ms ease-in-out）

■ タブ切り替え
- underline indicator がスムーズにスライド
```

### 10.3 Glass Morphism アクセント

```
■ ダッシュボードのメインカード
- backdrop-blur-xl + bg-white/80

■ ナビゲーションバー
- backdrop-blur-md + bg-blue-600/90

■ フローティングアクションボタン
- backdrop-blur-sm + shadow-2xl
```

### 10.4 使用ライブラリ

| ライブラリ | 用途 |
|-----------|------|
| Framer Motion | ページ遷移・レイアウトアニメーション |
| Recharts | グラフ描画（アニメーション付き） |
| shadcn/ui | コンポーネントベース |
| Tailwind CSS v4 | スタイリング |
