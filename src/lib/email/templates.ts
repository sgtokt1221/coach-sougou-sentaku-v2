import type { AlertItem } from "@/lib/types/admin";

// ───────────────────────────────────────────────
// 共通スタイル
// ───────────────────────────────────────────────
const baseStyle = `
  font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif;
  color: #1a1a2e;
  background-color: #f8f9fa;
  margin: 0;
  padding: 0;
`;

const containerStyle = `
  max-width: 600px;
  margin: 0 auto;
  background-color: #ffffff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
`;

const headerStyle = `
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #ffffff;
  padding: 24px 32px;
`;

const contentStyle = `
  padding: 32px;
`;

const footerStyle = `
  padding: 16px 32px;
  background-color: #f1f5f9;
  color: #64748b;
  font-size: 12px;
  text-align: center;
`;

function severityLabel(severity: string): string {
  switch (severity) {
    case "critical":
      return "重要";
    case "high":
      return "高";
    case "warning":
      return "注意";
    default:
      return severity;
  }
}

function severityColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "#dc2626";
    case "high":
      return "#ea580c";
    case "warning":
      return "#ca8a04";
    default:
      return "#6b7280";
  }
}

function alertTypeLabel(type: string): string {
  switch (type) {
    case "inactive":
      return "未活動";
    case "declining":
      return "スコア低下";
    case "repeated_weakness":
      return "繰り返し弱点";
    case "document_deadline":
      return "書類期限";
    default:
      return type;
  }
}

function wrapHtml(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="${baseStyle}">
  <div style="padding: 20px;">
    <div style="${containerStyle}">
      <div style="${headerStyle}">
        <h1 style="margin: 0; font-size: 20px; font-weight: 600;">${title}</h1>
        <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.85;">CoachFor 総合型選抜</p>
      </div>
      <div style="${contentStyle}">
        ${bodyHtml}
      </div>
      <div style="${footerStyle}">
        <p style="margin: 0;">このメールは CoachFor 総合型選抜 から自動送信されています。</p>
        <p style="margin: 4px 0 0;">通知設定は設定ページから変更できます。</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ───────────────────────────────────────────────
// 1. アラートダイジェスト（管理者向け週次まとめ）
// ───────────────────────────────────────────────
export function alertDigestTemplate(alerts: AlertItem[]): string {
  const grouped: Record<string, AlertItem[]> = {};
  for (const alert of alerts) {
    const key = alert.severity;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(alert);
  }

  const severityOrder = ["critical", "high", "warning"];
  let alertsHtml = "";

  for (const severity of severityOrder) {
    const items = grouped[severity];
    if (!items || items.length === 0) continue;

    alertsHtml += `
      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px; font-size: 14px; color: ${severityColor(severity)}; border-bottom: 2px solid ${severityColor(severity)}; padding-bottom: 4px;">
          ${severityLabel(severity)}（${items.length}件）
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background-color: #f8fafc;">
              <th style="text-align: left; padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">生徒</th>
              <th style="text-align: left; padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">種類</th>
              <th style="text-align: left; padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">詳細</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (a) => `
              <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9;">${a.studentName}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9;">
                  <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background-color: ${severityColor(a.severity)}20; color: ${severityColor(a.severity)}; font-size: 11px; font-weight: 600;">
                    ${alertTypeLabel(a.type)}
                  </span>
                </td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9;">${a.message}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  if (!alertsHtml) {
    alertsHtml = `<p style="color: #16a34a; font-size: 14px;">現在、要注意のアラートはありません。</p>`;
  }

  const body = `
    <p style="margin: 0 0 16px; font-size: 14px; color: #475569;">
      現在のアラート状況をお知らせします。合計 <strong>${alerts.length}件</strong> のアラートがあります。
    </p>
    ${alertsHtml}
    <div style="margin-top: 24px; text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://app.coachfor.jp"}/admin/alerts"
         style="display: inline-block; padding: 10px 24px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
        アラート一覧を確認する
      </a>
    </div>
  `;

  return wrapHtml("アラートダイジェスト", body);
}

// ───────────────────────────────────────────────
// 2. 書類期限リマインダー（生徒向け）
// ───────────────────────────────────────────────
export interface DeadlineDocument {
  title: string;
  universityName: string;
  deadline: string;
  daysUntil: number;
  status: string;
}

export function documentDeadlineTemplate(
  studentName: string,
  documents: DeadlineDocument[]
): string {
  const sorted = [...documents].sort((a, b) => a.daysUntil - b.daysUntil);

  const docsHtml = sorted
    .map((doc) => {
      const urgencyColor =
        doc.daysUntil <= 1 ? "#dc2626" : doc.daysUntil <= 3 ? "#ea580c" : "#ca8a04";
      const urgencyText =
        doc.daysUntil <= 0
          ? "期限超過"
          : doc.daysUntil === 1
            ? "明日"
            : `あと${doc.daysUntil}日`;

      return `
        <div style="padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid ${urgencyColor};">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <p style="margin: 0; font-size: 15px; font-weight: 600; color: #1e293b;">${doc.title}</p>
              <p style="margin: 4px 0 0; font-size: 13px; color: #64748b;">${doc.universityName}</p>
            </div>
            <div style="text-align: right;">
              <span style="display: inline-block; padding: 4px 10px; border-radius: 4px; background-color: ${urgencyColor}15; color: ${urgencyColor}; font-size: 12px; font-weight: 700;">
                ${urgencyText}
              </span>
              <p style="margin: 4px 0 0; font-size: 12px; color: #94a3b8;">期限: ${doc.deadline}</p>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  const body = `
    <p style="margin: 0 0 8px; font-size: 16px; font-weight: 600;">${studentName} さん</p>
    <p style="margin: 0 0 20px; font-size: 14px; color: #475569;">
      提出期限が近づいている書類が <strong>${documents.length}件</strong> あります。計画的に準備を進めましょう。
    </p>
    ${docsHtml}
    <div style="margin-top: 24px; text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://app.coachfor.jp"}/student/documents"
         style="display: inline-block; padding: 10px 24px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
        書類を確認する
      </a>
    </div>
  `;

  return wrapHtml("書類提出期限のお知らせ", body);
}

// ───────────────────────────────────────────────
// 3. 成長レポート（生徒/保護者向け）
// ───────────────────────────────────────────────
export interface GrowthReportData {
  summary: string;
  comparisonToAvg: { area: string; myScore: number; avgScore: number }[];
  recommendations: string[];
  generatedAt: string;
}

export function growthReportTemplate(report: GrowthReportData): string {
  const comparisonHtml = report.comparisonToAvg
    .map((c) => {
      const diff = c.myScore - c.avgScore;
      const diffColor = diff >= 0 ? "#16a34a" : "#dc2626";
      const diffText = diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);

      return `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9;">${c.area}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; text-align: center;">${c.myScore.toFixed(1)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; text-align: center;">${c.avgScore.toFixed(1)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; text-align: center; color: ${diffColor}; font-weight: 600;">${diffText}</td>
        </tr>
      `;
    })
    .join("");

  const recommendationsHtml = report.recommendations
    .map(
      (r) =>
        `<li style="margin-bottom: 8px; font-size: 13px; color: #334155;">${r}</li>`
    )
    .join("");

  const body = `
    <p style="margin: 0 0 16px; font-size: 14px; color: #475569;">${report.summary}</p>

    <h3 style="margin: 24px 0 12px; font-size: 15px; color: #1e293b;">スコア比較</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <thead>
        <tr style="background-color: #f8fafc;">
          <th style="text-align: left; padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">項目</th>
          <th style="text-align: center; padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">あなた</th>
          <th style="text-align: center; padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">平均</th>
          <th style="text-align: center; padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">差分</th>
        </tr>
      </thead>
      <tbody>
        ${comparisonHtml}
      </tbody>
    </table>

    <h3 style="margin: 24px 0 12px; font-size: 15px; color: #1e293b;">改善のためのアドバイス</h3>
    <ul style="padding-left: 20px; margin: 0;">
      ${recommendationsHtml}
    </ul>

    <p style="margin: 24px 0 0; font-size: 12px; color: #94a3b8; text-align: right;">
      生成日時: ${new Date(report.generatedAt).toLocaleDateString("ja-JP")}
    </p>

    <div style="margin-top: 24px; text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://app.coachfor.jp"}/student/growth"
         style="display: inline-block; padding: 10px 24px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
        成長レポートを見る
      </a>
    </div>
  `;

  return wrapHtml("成長レポート", body);
}

// ───────────────────────────────────────────────
// 4. 週次進捗サマリー（生徒向け）
// ───────────────────────────────────────────────
export interface WeeklyProgressStats {
  essayCount: number;
  interviewCount: number;
  avgScore: number | null;
  scoreChange: number | null;
  completedDocuments: number;
  upcomingDeadlines: number;
  resolvedWeaknesses: number;
  activeWeaknesses: number;
}

export function weeklyProgressTemplate(
  studentName: string,
  stats: WeeklyProgressStats
): string {
  const scoreChangeHtml =
    stats.scoreChange !== null
      ? stats.scoreChange >= 0
        ? `<span style="color: #16a34a; font-weight: 600;">+${stats.scoreChange.toFixed(1)}</span>`
        : `<span style="color: #dc2626; font-weight: 600;">${stats.scoreChange.toFixed(1)}</span>`
      : `<span style="color: #94a3b8;">--</span>`;

  const statCards = [
    {
      label: "小論文添削",
      value: `${stats.essayCount}回`,
      color: "#6366f1",
    },
    {
      label: "模擬面接",
      value: `${stats.interviewCount}回`,
      color: "#8b5cf6",
    },
    {
      label: "平均スコア",
      value: stats.avgScore !== null ? stats.avgScore.toFixed(1) : "--",
      color: "#0ea5e9",
    },
    {
      label: "書類完成",
      value: `${stats.completedDocuments}件`,
      color: "#10b981",
    },
  ];

  const cardsHtml = statCards
    .map(
      (card) => `
      <td style="width: 25%; padding: 12px; text-align: center;">
        <div style="background-color: ${card.color}10; border-radius: 8px; padding: 16px 8px;">
          <p style="margin: 0; font-size: 24px; font-weight: 700; color: ${card.color};">${card.value}</p>
          <p style="margin: 4px 0 0; font-size: 11px; color: #64748b;">${card.label}</p>
        </div>
      </td>
    `
    )
    .join("");

  const body = `
    <p style="margin: 0 0 8px; font-size: 16px; font-weight: 600;">${studentName} さん</p>
    <p style="margin: 0 0 20px; font-size: 14px; color: #475569;">今週の学習状況をまとめました。</p>

    <table style="width: 100%; border-collapse: collapse;">
      <tr>${cardsHtml}</tr>
    </table>

    <div style="margin-top: 24px; padding: 16px; background-color: #f8fafc; border-radius: 8px;">
      <table style="width: 100%; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; color: #64748b;">スコア変動</td>
          <td style="padding: 6px 0; text-align: right;">${scoreChangeHtml}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">直近の期限</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 600; color: ${stats.upcomingDeadlines > 0 ? "#ea580c" : "#64748b"};">
            ${stats.upcomingDeadlines > 0 ? `${stats.upcomingDeadlines}件` : "なし"}
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">克服した弱点</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #16a34a;">${stats.resolvedWeaknesses}件</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">残りの弱点</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 600; color: ${stats.activeWeaknesses > 3 ? "#dc2626" : "#64748b"};">${stats.activeWeaknesses}件</td>
        </tr>
      </table>
    </div>

    <div style="margin-top: 24px; text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://app.coachfor.jp"}/student/dashboard"
         style="display: inline-block; padding: 10px 24px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
        ダッシュボードを開く
      </a>
    </div>
  `;

  return wrapHtml("今週の学習進捗レポート", body);
}
