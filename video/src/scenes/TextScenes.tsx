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
const DARK_BG = "#0F172A";

// ---- Animated counter ----
const Counter: React.FC<{ value: string; label: string; delay: number; color?: string }> = ({
  value, label, delay, color = WHITE,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 12 } });
  return (
    <div style={{ textAlign: "center", opacity: p, transform: `scale(${interpolate(p, [0, 1], [0.8, 1])})` }}>
      <p style={{ color, fontSize: 56, fontFamily: "Arial", fontWeight: 800, margin: 0, lineHeight: 1.1 }}>{value}</p>
      <p style={{ color: "#94A3B8", fontSize: 18, fontFamily: "Arial", margin: "8px 0 0 0", lineHeight: 1.4, maxWidth: 220 }}>{label}</p>
    </div>
  );
};

// ---- Hook Scene ----
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const titleOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const quoteOp = interpolate(frame, [140, 160], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: DARK_BG, justifyContent: "center", alignItems: "center", gap: 50 }}>
      <div style={{ opacity: titleOp, textAlign: "center" }}>
        <p style={{ color: TEAL, fontSize: 16, fontFamily: "Arial", fontWeight: 600, letterSpacing: 4, margin: "0 0 12px 0" }}>PROBLEM</p>
        <h1 style={{ color: WHITE, fontSize: 40, fontFamily: "Arial", fontWeight: 700, margin: 0, maxWidth: 900, lineHeight: 1.3 }}>
          総合型選抜は「準備の格差」が合否を左右する
        </h1>
      </div>
      <div style={{ display: "flex", gap: 80 }}>
        <Counter value="72%" label="独学で挑む受験生" delay={30} color={TEAL} />
        <Counter value="50-100万" label="専門塾の年間費用" delay={50} />
        <Counter value="1:5" label="講師1人に生徒5人以上" delay={70} />
      </div>
      <div style={{ opacity: quoteOp, maxWidth: 700, textAlign: "center" }}>
        <p style={{ color: "#94A3B8", fontSize: 20, fontFamily: "Arial", fontStyle: "italic", lineHeight: 1.6, margin: 0 }}>
          「添削が返ってくるまで1週間。入試に間に合わない」 — 高3受験生
        </p>
      </div>
    </AbsoluteFill>
  );
};

// ---- Solution Scene ----
export const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoScale = spring({ frame, fps, config: { damping: 10 } });
  const tagDelay = [15, 30, 45];

  return (
    <AbsoluteFill style={{ background: `linear-gradient(135deg, ${TEAL} 0%, ${NAVY} 100%)`, justifyContent: "center", alignItems: "center", gap: 40 }}>
      <div style={{ textAlign: "center", transform: `scale(${logoScale})`, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontFamily: "Arial", letterSpacing: 3, margin: 0 }}>SOLUTION</p>
        <Img src={staticFile("logo-dark.png")} style={{ height: 70 }} />
        <p style={{ color: "#99F6E4", fontSize: 24, fontFamily: "Arial", margin: 0 }}>総合型選抜の「AI専属コーチ」</p>
      </div>
      <div style={{ display: "flex", gap: 24 }}>
        {["24時間対応", "プロ講師レベル", "月額4,980円から"].map((text, i) => {
          const p = spring({ frame: frame - tagDelay[i], fps, config: { damping: 12 } });
          return (
            <div key={text} style={{
              opacity: p, transform: `translateY(${(1 - p) * 20}px)`,
              background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)",
              borderRadius: 30, padding: "12px 28px", border: "1px solid rgba(255,255,255,0.2)",
            }}>
              <p style={{ color: WHITE, fontSize: 20, fontFamily: "Arial", fontWeight: 600, margin: 0 }}>{text}</p>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---- Numbers Scene ----
export const NumbersScene: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: DARK_BG, justifyContent: "center", alignItems: "center", gap: 50 }}>
      <p style={{ color: TEAL, fontSize: 16, fontFamily: "Arial", fontWeight: 600, letterSpacing: 4, margin: 0 }}>TRACTION</p>
      <div style={{ display: "flex", gap: 80 }}>
        <Counter value="23校" label="対応大学" delay={10} color={TEAL} />
        <Counter value="189" label="対応学部" delay={25} color={TEAL} />
        <Counter value="6" label="コア機能 全実装済み" delay={40} color={TEAL} />
      </div>
      <div style={{ display: "flex", gap: 80 }}>
        <Counter value="800億円" label="総合型選抜市場規模" delay={60} />
        <Counter value="15%" label="年率成長" delay={75} />
        <Counter value="0" label="直接競合" delay={90} />
      </div>
      <Counter value="BigQuery" label="合格者データの蓄積がそのまま参入障壁に" delay={110} color={TEAL} />
    </AbsoluteFill>
  );
};

// ---- Pricing Scene ----
const PriceCard: React.FC<{
  name: string; price: string; period: string; features: string[];
  highlight?: boolean; delay: number;
}> = ({ name, price, period, features, highlight, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 12 } });

  return (
    <div style={{
      opacity: p, transform: `translateY(${(1 - p) * 30}px)`,
      width: 280, background: highlight ? TEAL : "rgba(255,255,255,0.06)",
      borderRadius: 16, padding: "28px 24px", border: `1px solid ${highlight ? TEAL : "rgba(255,255,255,0.1)"}`,
      position: "relative",
    }}>
      {highlight && (
        <div style={{
          position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
          background: "#F59E0B", borderRadius: 20, padding: "4px 16px",
        }}>
          <p style={{ color: DARK_BG, fontSize: 11, fontFamily: "Arial", fontWeight: 700, margin: 0 }}>おすすめ</p>
        </div>
      )}
      <p style={{ color: highlight ? "rgba(255,255,255,0.8)" : "#94A3B8", fontSize: 14, fontFamily: "Arial", fontWeight: 600, margin: "0 0 8px 0" }}>{name}</p>
      <p style={{ color: WHITE, fontSize: 36, fontFamily: "Arial", fontWeight: 800, margin: "0 0 4px 0" }}>{price}</p>
      <p style={{ color: highlight ? "rgba(255,255,255,0.7)" : "#64748B", fontSize: 13, fontFamily: "Arial", margin: "0 0 16px 0" }}>{period}</p>
      {features.map((f, i) => (
        <p key={i} style={{ color: highlight ? "rgba(255,255,255,0.9)" : "#CBD5E1", fontSize: 15, fontFamily: "Arial", margin: "7px 0", lineHeight: 1.4 }}>
          {f}
        </p>
      ))}
    </div>
  );
};

export const PricingScene: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: DARK_BG, justifyContent: "center", alignItems: "center", gap: 30 }}>
      <p style={{ color: TEAL, fontSize: 16, fontFamily: "Arial", fontWeight: 600, letterSpacing: 4, margin: 0 }}>PRICING</p>
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        <PriceCard
          name="AI プラン" price="4,980円" period="/月"
          features={["小論文AI添削", "AI模擬面接", "志望校マッチング", "MBTI診断", "成長トラッキング"]}
          delay={10}
        />
        <PriceCard
          name="コーチ プラン" price="19,800円" period="/月" highlight
          features={["AIプラン全機能", "月1回オンライン面談(50分)", "大学生コーチ個別サポート"]}
          delay={20}
        />
        <PriceCard
          name="出願書類添削" price="9,900円" period="買い切り"
          features={["志望理由書添削", "活動報告書添削", "どのプランにも追加可能"]}
          delay={30}
        />
      </div>
      <p style={{ color: "#64748B", fontSize: 14, fontFamily: "Arial", margin: 0 }}>
        塾向けボリュームライセンスはお問い合わせください
      </p>
    </AbsoluteFill>
  );
};

// ---- Closing Scene ----
export const ClosingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 8 } });
  const sub = interpolate(frame, [15, 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cta = interpolate(frame, [40, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: `linear-gradient(135deg, ${TEAL} 0%, ${NAVY} 100%)`, justifyContent: "center", alignItems: "center" }}>
      <div style={{ textAlign: "center", transform: `scale(${scale})`, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Img src={staticFile("logo-dark.png")} style={{ height: 80, marginBottom: 20 }} />
        <div style={{ opacity: sub }}>
          <p style={{ color: "#99F6E4", fontSize: 26, fontFamily: "Arial", margin: "0 0 40px 0" }}>AIが変える、総合型選抜の未来</p>
        </div>
        <div style={{ opacity: cta }}>
          <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 12, padding: "16px 40px", border: "1px solid rgba(255,255,255,0.3)", display: "inline-block" }}>
            <p style={{ color: WHITE, fontSize: 20, fontFamily: "Arial", fontWeight: 600, margin: 0 }}>
              お問い合わせ・資料請求はこちら
            </p>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---- Section Divider ----
export const SectionDivider: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 10 } });
  return (
    <AbsoluteFill style={{ background: NAVY, justifyContent: "center", alignItems: "center" }}>
      <div style={{ textAlign: "center", opacity: p, transform: `scale(${interpolate(p, [0, 1], [0.9, 1])})` }}>
        <p style={{ color: TEAL, fontSize: 18, fontFamily: "Arial", fontWeight: 600, letterSpacing: 4, margin: "0 0 12px 0" }}>{subtitle}</p>
        <h2 style={{ color: WHITE, fontSize: 52, fontFamily: "Arial", fontWeight: 700, margin: 0 }}>{title}</h2>
      </div>
    </AbsoluteFill>
  );
};
