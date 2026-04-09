import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
  spring,
  useVideoConfig,
  staticFile,
} from "remotion";

const TEAL = "#0D9488";
const NAVY = "#1E3A5F";
const WHITE = "#FFFFFF";

// ---- Feature bullet that appears one by one ----
const FeatureBullets: React.FC<{ items: string[]; startFrame?: number }> = ({
  items,
  startFrame = 30,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        position: "absolute",
        right: 50,
        top: "50%",
        transform: "translateY(-50%)",
        maxWidth: 520,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {items.map((text, i) => {
        const p = spring({
          frame: frame - startFrame - i * 10,
          fps,
          config: { damping: 12 },
        });
        return (
          <div
            key={i}
            style={{
              opacity: p,
              transform: `translateX(${(1 - p) * 40}px)`,
              background: "rgba(0,0,0,0.85)",
              backdropFilter: "blur(12px)",
              borderRadius: 10,
              padding: "18px 24px",
              borderLeft: `5px solid ${TEAL}`,
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: TEAL,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <p
                style={{
                  color: WHITE,
                  fontSize: 14,
                  fontFamily: "Arial",
                  fontWeight: 700,
                  margin: 0,
                }}
              >
                {i + 1}
              </p>
            </div>
            <p
              style={{
                color: WHITE,
                fontSize: 20,
                fontFamily: "Arial",
                fontWeight: 500,
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {text}
            </p>
          </div>
        );
      })}
    </div>
  );
};

// ---- Screen with left screenshot + right feature bullets ----
const ScreenWithFeatures: React.FC<{
  src: string;
  label: string;
  features: string[];
}> = ({ src, label, features }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const imgProgress = spring({ frame: frame - 3, fps, config: { damping: 12 } });
  const labelOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, #0F172A 0%, ${NAVY} 100%)`,
      }}
    >
      {/* Screenshot on left side */}
      <div
        style={{
          position: "absolute",
          left: 40,
          top: "50%",
          transform: `translateY(-50%) scale(${interpolate(imgProgress, [0, 1], [0.9, 0.52])})`,
          opacity: imgProgress,
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 25px 80px rgba(0,0,0,0.5)",
          transformOrigin: "left center",
        }}
      >
        <Img src={staticFile(src)} style={{ display: "block" }} />
      </div>

      {/* Label top-left */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 50,
          opacity: labelOpacity,
        }}
      >
        <h2
          style={{
            color: WHITE,
            fontSize: 36,
            fontFamily: "Arial",
            fontWeight: 700,
            margin: 0,
            textShadow: "0 2px 8px rgba(0,0,0,0.5)",
          }}
        >
          {label}
        </h2>
      </div>

      {/* Feature bullets on right */}
      <FeatureBullets items={features} startFrame={20} />
    </AbsoluteFill>
  );
};

// ---- Simple screen reveal (for screens without feature list) ----
const ScreenReveal: React.FC<{
  src: string;
  label: string;
  sublabel?: string;
}> = ({ src, label, sublabel }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const imgScale = spring({ frame: frame - 5, fps, config: { damping: 12 } });
  const labelOpacity = interpolate(frame, [20, 35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, #0F172A 0%, ${NAVY} 100%)`,
        justifyContent: "center",
        alignItems: "center",
        gap: 30,
      }}
    >
      <div style={{ opacity: labelOpacity, textAlign: "center" }}>
        <h2
          style={{
            color: WHITE,
            fontSize: 40,
            fontFamily: "Arial",
            fontWeight: 700,
            margin: 0,
          }}
        >
          {label}
        </h2>
        {sublabel && (
          <p
            style={{
              color: "#94A3B8",
              fontSize: 20,
              fontFamily: "Arial",
              marginTop: 10,
            }}
          >
            {sublabel}
          </p>
        )}
      </div>
      <div
        style={{
          transform: `scale(${interpolate(imgScale, [0, 1], [0.85, 0.72])})`,
          opacity: imgScale,
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 25px 80px rgba(0,0,0,0.5)",
        }}
      >
        <Img src={staticFile(src)} style={{ display: "block" }} />
      </div>
    </AbsoluteFill>
  );
};

// ---- Exported scenes ----

export const DashboardScene: React.FC = () => (
  <ScreenReveal
    src="screenshots/01-dashboard.png"
    label="ダッシュボード"
    sublabel="スコア推移・弱点リマインド・今日のタスクを一覧表示"
  />
);

export const SelfAnalysisScene: React.FC = () => (
  <ScreenWithFeatures
    src="screenshots/02-self-analysis.png"
    label="AI自己分析ワークショップ"
    features={[
      "AIと対話しながら7ステップで自分を深掘り",
      "価値観・強み・課題・関心・ビジョンを言語化",
      "面接・志望理由書の「自分の軸」が明確に",
      "結果は面接評価で個別アドバイスに反映",
    ]}
  />
);

export const SelfAnalysisResultScene: React.FC = () => (
  <ScreenReveal
    src="screenshots/03-self-analysis-result.png"
    label="自己分析結果"
    sublabel="面接・書類作成の土台となる自分の軸を可視化"
  />
);

export const InterviewNewScene: React.FC = () => (
  <ScreenWithFeatures
    src="screenshots/04-interview-new.png"
    label="AI模擬面接"
    features={[
      "音声で会話するだけ。無音検出で自動送信",
      "大学別AP・面接傾向を考慮した質問生成",
      "起承転結のある本格面接フロー（8〜10ターン）",
      "4項目スコア + 映像分析 + 個別アドバイス",
      "話速・フィラー・アイコンタクトを定量分析",
    ]}
  />
);

export const EssayNewScene: React.FC = () => (
  <ScreenWithFeatures
    src="screenshots/07-essay-new.png"
    label="小論文AI添削"
    features={[
      "手書き小論文を撮影 → Claude Vision OCR",
      "構成・論理性・表現力・AP合致度・独自性の5項目評価",
      "弱点の自動検出＆成長トラッキング",
      "ブラッシュアップ文の自動生成",
      "テーマの社会的背景・関連テーマも解説",
    ]}
  />
);

export const UniversitiesScene: React.FC = () => (
  <ScreenWithFeatures
    src="screenshots/09-universities.png"
    label="志望校マッチング"
    features={[
      "23大学189学部のデータベース",
      "GPA・資格・関心分野からAI自動マッチング",
      "大学別AP・選考方法・日程を一覧確認",
      "出願スケジュールをタイムライン表示",
    ]}
  />
);

export const DocumentsScene: React.FC = () => (
  <ScreenWithFeatures
    src="screenshots/10-documents.png"
    label="出願書類 & 活動実績"
    features={[
      "志望理由書をオンラインで作成・AI添削",
      "AP合致度・構成・独自性をリアルタイム分析",
      "バージョン履歴で推敲を管理",
      "AIヒアリングで活動実績を深掘り・構造化",
      "AP別に最適な表現を自動生成",
    ]}
  />
);

export const GrowthScene: React.FC = () => (
  <ScreenReveal
    src="screenshots/11-growth.png"
    label="成長トラッキング"
    sublabel="スコア推移・弱点の改善・合格者データとの比較を可視化"
  />
);

export const AdminDashboardScene: React.FC = () => (
  <ScreenReveal
    src="screenshots/12-admin-dashboard.png"
    label="管理者ダッシュボード"
    sublabel="全生徒の学習データをBigQueryで集約。合格者データの蓄積が参入障壁に"
  />
);

export const AdminStudentsScene: React.FC = () => (
  <ScreenReveal
    src="screenshots/13-admin-students.png"
    label="生徒管理"
    sublabel="検索・ソート・詳細表示で生徒を個別サポート"
  />
);

export const LoginScene: React.FC = () => (
  <ScreenReveal
    src="screenshots/15-login.png"
    label="ログイン"
    sublabel="Google / メールで簡単ログイン"
  />
);
