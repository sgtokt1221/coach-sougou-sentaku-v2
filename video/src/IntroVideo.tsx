import React from "react";
import { AbsoluteFill, Sequence, Audio, staticFile } from "remotion";
import {
  SelfAnalysisScene,
  SelfAnalysisResultScene,
  InterviewNewScene,
  EssayNewScene,
  UniversitiesScene,
  DocumentsScene,
  GrowthScene,
  AdminDashboardScene,
  AdminStudentsScene,
} from "./scenes/MockUI";
import {
  HookScene,
  SolutionScene,
  NumbersScene,
  PricingScene,
  ClosingScene,
  SectionDivider,
} from "./scenes/TextScenes";

// Timings calculated from actual audio durations + 30f (1s) gap
export const IntroVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ fontFamily: "Arial, sans-serif" }}>

      {/* Scene 1: Hook — 課題提起 */}
      <Sequence from={0} durationInFrames={366}>
        <HookScene />
      </Sequence>

      {/* Scene 2: Solution — AI専属コーチ */}
      <Sequence from={366} durationInFrames={310}>
        <SolutionScene />
      </Sequence>

      {/* Scene 3: 自己分析 */}
      <Sequence from={676} durationInFrames={122}>
        <SelfAnalysisScene />
      </Sequence>
      <Sequence from={798} durationInFrames={152}>
        <SelfAnalysisResultScene />
      </Sequence>

      {/* Scene 4: AI模擬面接 */}
      <Sequence from={950} durationInFrames={321}>
        <InterviewNewScene />
      </Sequence>

      {/* Scene 5: 小論文添削 */}
      <Sequence from={1271} durationInFrames={263}>
        <EssayNewScene />
      </Sequence>

      {/* Scene 6: 志望校→書類→成長 */}
      <Sequence from={1534} durationInFrames={82}>
        <UniversitiesScene />
      </Sequence>
      <Sequence from={1616} durationInFrames={82}>
        <DocumentsScene />
      </Sequence>
      <Sequence from={1698} durationInFrames={112}>
        <GrowthScene />
      </Sequence>

      {/* Scene 7: 管理者ポータル + BigQuery */}
      <Sequence from={1808} durationInFrames={50}>
        <SectionDivider title="塾・教室向け管理機能" subtitle="ADMIN PORTAL" />
      </Sequence>
      <Sequence from={1858} durationInFrames={140}>
        <AdminDashboardScene />
      </Sequence>
      <Sequence from={1998} durationInFrames={170}>
        <AdminStudentsScene />
      </Sequence>

      {/* Scene 8: 数字 + ビッグデータ */}
      <Sequence from={2167} durationInFrames={296}>
        <NumbersScene />
      </Sequence>

      {/* Scene 9: 価格 */}
      <Sequence from={2463} durationInFrames={283}>
        <PricingScene />
      </Sequence>

      {/* Scene 10: クロージング */}
      <Sequence from={2746} durationInFrames={210}>
        <ClosingScene />
      </Sequence>

      {/* ===== NARRATION ===== */}
      <Sequence from={0}>
        <Audio src={staticFile("audio/01-hook.mp3")} />
      </Sequence>
      <Sequence from={366}>
        <Audio src={staticFile("audio/02-solution.mp3")} />
      </Sequence>
      <Sequence from={676}>
        <Audio src={staticFile("audio/03-self-analysis.mp3")} />
      </Sequence>
      <Sequence from={950}>
        <Audio src={staticFile("audio/04-interview.mp3")} />
      </Sequence>
      <Sequence from={1271}>
        <Audio src={staticFile("audio/05-essay.mp3")} />
      </Sequence>
      <Sequence from={1534}>
        <Audio src={staticFile("audio/06-matching.mp3")} />
      </Sequence>
      <Sequence from={1808}>
        <Audio src={staticFile("audio/07-admin.mp3")} />
      </Sequence>
      <Sequence from={2167}>
        <Audio src={staticFile("audio/08-numbers.mp3")} />
      </Sequence>
      <Sequence from={2463}>
        <Audio src={staticFile("audio/09-pricing.mp3")} />
      </Sequence>
      <Sequence from={2746}>
        <Audio src={staticFile("audio/10-closing.mp3")} />
      </Sequence>
    </AbsoluteFill>
  );
};
