# BigQuery 分析パイプライン 運用ガイド

## 全体像

```
Firestore (essays / interviews / users / examResults)
     │
     │ ・リアルタイム: essay/interview 完了時にロガー fire-and-forget
     │ ・バックフィル: /admin/bigquery-status から手動実行
     │ ・日次スナップショット: /admin/bigquery-status から手動 (or Cloud Scheduler)
     │
     ▼
BigQuery: coach-sougou-sentaku.coach_analytics
  ├─ essay_submissions    (パーティション: submitted_at)
  ├─ interview_sessions   (パーティション: started_at)
  └─ student_snapshots    (パーティション: snapshot_date)
     │
     ▼
分析:
  ├─ Coach 管理画面 /admin/passed-data/explore  (= REST 経由動的集計)
  └─ Looker Studio                              (= SQL 自由集計)
```

## 初期セットアップ (= 一回だけ)

1. **Firebase Secret 設定** (`GOOGLE_CLOUD_PROJECT_ID` / `BIGQUERY_DATASET`)
   - 実施済み (改行混入のない値)
2. **BigQuery dataset + 3 テーブル作成**
   - `/admin/bigquery-status` → 「セットアップ」 ボタン
   - location: `asia-northeast1` (東京)
3. **過去データ移行** (= Firestore に既にある essay/interview を BQ に流す)
   - `/admin/bigquery-status` → 「移行 実行」 ボタン
   - 冪等。 何度押しても重複しない

## 日常運用

### リアルタイム反映 (= 自動)
- 生徒が essay 提出 → `/api/essay/review` 内で `logEssaySubmission()` が fire-and-forget
- interview 完了 → `/api/interview/end` 内で `logInterviewSession()`

### 日次スナップショット
- 全生徒の現状 (essay_count / avg_score / top_weaknesses / admission_results 等) を 1 日 1 行 student_snapshots に書き出す
- 手動: `/admin/bigquery-status` → 「日次スナップショット」 ボタン
- 自動化 (推奨): Cloud Scheduler + Cloud Functions
  - Secret `CRON_SECRET` を発行 (任意の長い文字列)
  - Cloud Scheduler から HTTPS POST `/api/admin/bigquery-snapshot` をヘッダー `x-cron-secret: <値>` 付きで叩く
  - schedule 例: `0 18 * * *` (毎日 18:00 JST、 = UTC 9:00)

## Looker Studio 連携 (= 無料の可視化ツール)

1. https://lookerstudio.google.com/ にアクセス (Google アカウント)
2. 「空のレポート」 を作成
3. データソース追加: 「BigQuery」 を選択
4. プロジェクト: `coach-sougou-sentaku` → データセット: `coach_analytics`
5. テーブルを選ぶ (例: `essay_submissions`)
6. 「接続」 → 「レポートに追加」

### ダッシュボード例

#### 1. 全体スコア推移
```sql
SELECT
  DATE(submitted_at) AS date,
  AVG(score_total) AS avg_score,
  COUNT(*) AS submissions
FROM `coach-sougou-sentaku.coach_analytics.essay_submissions`
WHERE submitted_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
GROUP BY date
ORDER BY date
```

#### 2. 大学別 essay 平均スコア
```sql
SELECT
  university_id,
  COUNT(DISTINCT user_id) AS students,
  AVG(score_total) AS avg_score,
  AVG(score_ap_alignment) AS avg_ap_alignment
FROM `coach-sougou-sentaku.coach_analytics.essay_submissions`
WHERE university_id IS NOT NULL
GROUP BY university_id
ORDER BY avg_score DESC
```

#### 3. 合格者 vs 不合格者の essay スコア推移
```sql
WITH passed_users AS (
  SELECT DISTINCT user_id
  FROM `coach-sougou-sentaku.coach_analytics.student_snapshots`,
       UNNEST(admission_results) AS r
  WHERE r.result = "passed"
)
SELECT
  CASE WHEN p.user_id IS NOT NULL THEN "合格者" ELSE "それ以外" END AS group,
  DATE_TRUNC(DATE(submitted_at), MONTH) AS month,
  AVG(score_total) AS avg_score,
  COUNT(*) AS submissions
FROM `coach-sougou-sentaku.coach_analytics.essay_submissions` e
LEFT JOIN passed_users p USING(user_id)
GROUP BY group, month
ORDER BY month, group
```

#### 4. 頻出弱点 Top 10 (全期間)
```sql
SELECT
  tag,
  COUNT(*) AS occurrences,
  COUNT(DISTINCT user_id) AS affected_students
FROM `coach-sougou-sentaku.coach_analytics.essay_submissions`,
     UNNEST(weakness_tags) AS tag
GROUP BY tag
ORDER BY occurrences DESC
LIMIT 10
```

## コスト

- ストレージ: 数 MB レベル → 無料枠 (10 GB/月) 内
- クエリ: 上記のような分析クエリで数 MB ずつスキャン → 無料枠 (1 TB/月) 内
- ストリーミング挿入: essay 1 件 ≈ 2 KB なので年間数千件で数円
- **想定月額: 0 円〜数百円**
- GCP 予算アラート設定推奨 (Cloud Billing → 予算 → 月額 1000 円通知等)

## トラブルシューティング

- **「dataset 存在しない」** → `/admin/bigquery-status` で「セットアップ」 押す
- **「BQ クライアント初期化失敗」** → `GOOGLE_CLOUD_PROJECT_ID` Secret に改行が入ってないか確認 (`cat -e` で `$` のみ正常)
- **insert エラー「Cannot find name in dataset」** → スキーマ不整合。 BQ コンソールでテーブルを削除 → 再セットアップ
- **「合格者データなし」 (passed-data)** → users/{uid}/examResults に `status: "passed"` が登録されている生徒が居るか確認

## API リファレンス

| パス | メソッド | 認証 | 用途 |
|---|---|---|---|
| `/api/admin/bigquery-status` | GET | admin/superadmin | 接続 + 件数確認 |
| `/api/admin/bigquery-setup` | POST | superadmin | dataset + テーブル作成 |
| `/api/admin/bigquery-backfill` | POST | superadmin | 過去データ移行 |
| `/api/admin/bigquery-snapshot` | POST | superadmin or `x-cron-secret` | 日次スナップショット |
| `/api/passed-data/[uniId]/[facId]` | GET | (誰でも) | 大学 × 学部 合格者統計 |
