/**
 * 面接の映像分析の集計（src/lib/interview/video-analysis.ts）の検査。
 * 合成フレームで、姿勢・話し始め/終わりの笑顔・旧方式への切り替えを確かめる。
 *   npx tsx scripts/verify-video-analysis.ts
 */
import assert from "node:assert/strict";
import {
  computeVideoAnalysis,
  detectAnswers,
  type FaceFrame,
  type PoseFrame,
} from "../src/lib/interview/video-analysis";

const FPS = 10;
const STEP = 1000 / FPS;

function face(t: number, over: Partial<FaceFrame> = {}): FaceFrame {
  return {
    timestamp: t,
    noseX: 0.5,
    noseY: 0.5,
    isEyeContact: true,
    isSmiling: false,
    headTiltDeg: 0,
    smile: 0.05,
    cheek: 0,
    browDown: 0,
    lipPress: 0,
    noseSneer: 0,
    browUp: 0.1,
    jawOpen: 0.02,
    blink: 0,
    ...over,
  };
}

function pose(t: number, over: Partial<PoseFrame> = {}): PoseFrame {
  return {
    timestamp: t,
    shoulderWidth: 0.5,
    shoulderMidX: 0.66,
    shoulderMidY: 0.8,
    neckRatio: 0.6,
    shoulderTiltDeg: 1,
    wristNearFace: false,
    ...over,
  };
}

/**
 * 60秒の面接。4回答える（各8秒、口が動く）。
 * smileAt: "edges" = 答えの最初と最後だけ笑う / "none" = 笑わない
 */
function interview(smileAt: "edges" | "none"): FaceFrame[] {
  const answers = [
    [5000, 13000],
    [20000, 28000],
    [35000, 43000],
    [50000, 58000],
  ];
  const frames: FaceFrame[] = [];
  for (let t = 0; t <= 60000; t += STEP) {
    const inAnswer = answers.find(([s, e]) => t >= s && t <= e);
    const jawOpen = inAnswer ? (Math.round(t / STEP) % 2 === 0 ? 0.3 : 0.05) : 0.02;
    const nearEdge =
      inAnswer && (t - inAnswer[0] < 1000 || inAnswer[1] - t < 1000);
    const smile = smileAt === "edges" && nearEdge ? 0.6 : 0.05;
    frames.push(face(t, { jawOpen, smile, isSmiling: smile > 0.3 }));
  }
  return frames;
}

// 1. 口の動きから回答を4回数える
{
  const answers = detectAnswers(interview("none"));
  assert.equal(answers.length, 4, `回答は4回: ${JSON.stringify(answers)}`);
}

// 2. 答えの最初と最後だけ笑う → 話し始め・終わりの笑顔は高く、全体の笑顔率は低い
{
  const r = computeVideoAnalysis(interview("edges"))!;
  assert.equal(r.answerCount, 4);
  assert.ok(r.turnSmileRate! >= 75, `turnSmileRate=${r.turnSmileRate}`);
  assert.ok(r.smileRate < 15, `smileRate=${r.smileRate}`);
  const none = computeVideoAnalysis(interview("none"))!;
  assert.equal(none.turnSmileRate, 0);
  assert.ok(r.overallVideoScore > none.overallVideoScore);
}

// 3. 表情係数が取れない端末 → 話し始め・終わりは出さず、従来の笑顔率で採点
{
  const frames = interview("edges").map((f) => ({
    ...f,
    smile: 0,
    browUp: 0,
    jawOpen: 0,
    blink: 0,
  }));
  const r = computeVideoAnalysis(frames)!;
  assert.equal(r.turnSmileRate, undefined);
  assert.equal(r.answerCount, undefined);
  assert.equal(r.affect, undefined);
}

const faces = interview("edges");
const poseTimes = faces.filter((_, i) => i % 2 === 0).map((f) => f.timestamp);

// 4. 背筋を伸ばしたまま → 伸びていた時間が長い
{
  const r = computeVideoAnalysis(faces, poseTimes.map((t) => pose(t)), poseTimes.length)!;
  assert.ok(r.posture, "姿勢が出る");
  assert.ok(r.posture!.uprightRate >= 95, `uprightRate=${r.posture!.uprightRate}`);
  assert.equal(r.posture!.faceTouchCount, 0);
}

// 5. 後半ずっと前かがみ → 伸びていた時間が下がり、点も下がる
{
  const upright = computeVideoAnalysis(faces, poseTimes.map((t) => pose(t)), poseTimes.length)!;
  const slouch = computeVideoAnalysis(
    faces,
    poseTimes.map((t) => pose(t, { neckRatio: t > 25000 ? 0.4 : 0.6 })),
    poseTimes.length
  )!;
  assert.ok(slouch.posture!.uprightRate < 50, `uprightRate=${slouch.posture!.uprightRate}`);
  assert.ok(slouch.overallVideoScore < upright.overallVideoScore);
}

// 6. 顔を3回触る（触り続けは1回）→ 3回
{
  const touchAt = (t: number) =>
    (t >= 10000 && t <= 11500) || (t >= 30000 && t <= 30400) || (t >= 45000 && t <= 46000);
  const r = computeVideoAnalysis(
    faces,
    poseTimes.map((t) => pose(t, { wristNearFace: touchAt(t) })),
    poseTimes.length
  )!;
  assert.equal(r.posture!.faceTouchCount, 3);
  assert.equal(r.posture!.faceTouchRate, 3);
}

// 7. 肩がほとんど映っていない → 姿勢は出さない（顔の位置で採点）
{
  const few = poseTimes.slice(0, Math.floor(poseTimes.length / 4)).map((t) => pose(t));
  const r = computeVideoAnalysis(faces, few, poseTimes.length)!;
  assert.equal(r.posture, undefined);
  const noPose = computeVideoAnalysis(faces)!;
  assert.equal(noPose.posture, undefined);
  assert.equal(r.overallVideoScore, noPose.overallVideoScore);
}

// 8. フレーム不足は null
assert.equal(computeVideoAnalysis(faces.slice(0, 3)), null);

console.log("verify-video-analysis: OK");
