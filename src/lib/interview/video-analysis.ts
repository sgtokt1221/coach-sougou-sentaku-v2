/**
 * 面接の映像分析の集計（VideoAnalyzer が貯めたフレームから VideoAnalysis を作る）。
 *
 * MediaPipe もブラウザも使わない純関数にしてあるので、合成フレームで検査できる
 * （scripts/verify-video-analysis.ts）。
 */
import type { VideoAnalysis } from "@/lib/types/interview";

/** 顔（FaceLandmarker）の1フレーム */
export interface FaceFrame {
  timestamp: number; // ms
  noseY: number;
  noseX: number;
  isEyeContact: boolean;
  isSmiling: boolean;
  headTiltDeg: number;
  // blendshapes 由来の表情係数 (0-1)。非対応端末では全て 0。
  smile: number; // mouthSmile L/R 平均
  cheek: number; // cheekSquint L/R 平均 (Duchenne 判定)
  browDown: number; // browDown L/R 平均 (眉間のしわ)
  lipPress: number; // mouthPress L/R 平均 (口の引き結び)
  noseSneer: number; // noseSneer L/R 平均
  browUp: number; // browInnerUp + browOuterUp L/R 平均 (眉の動き)
  jawOpen: number; // jawOpen (発話)
  blink: number; // eyeBlink L/R 平均
}

/**
 * 上半身（PoseLandmarker）の1フレーム。両肩が映っていないフレームは貯めない。
 * x は縦横比を掛けた値（x と y を同じ尺度で比べるため）。
 */
export interface PoseFrame {
  timestamp: number; // ms
  shoulderWidth: number;
  shoulderMidX: number;
  shoulderMidY: number;
  /** (肩の中点Y − 鼻Y) / 肩幅。前かがみ・猫背で小さくなる */
  neckRatio: number;
  shoulderTiltDeg: number;
  /** どちらかの手首が鼻から 0.6×肩幅以内にある */
  wristNearFace: boolean;
}

/** blink 立ち上がり判定の閾値 */
const BLINK_THRESHOLD = 0.5;
/** 0.5 秒窓の jawOpen の振れ幅がこれを超えたら話している */
const SPEAKING_JAW_RANGE = 0.08;
const SPEAKING_WINDOW_MS = 500;
/** この長さ未満の切れ目は同じ回答の息継ぎとみなしてつなぐ */
const ANSWER_GAP_MS = 1500;
/** これより短い区間は相づち・咳などとみなして回答に数えない */
const ANSWER_MIN_MS = 2000;
const TURN_SMILE_THRESHOLD = 0.3;
/** 肩が映っているフレームがこの割合未満なら姿勢は評価しない */
const POSE_MIN_COVERAGE = 0.5;
/** 本人の基準（上位10%点）に対してこの割合以上の首の長さなら「伸びている」 */
const UPRIGHT_RATIO = 0.85;
/** 顔を触った回数を数えるときの最小間隔（触り続けを1回にまとめる） */
const FACE_TOUCH_GAP_MS = 1000;

export function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function scale10(x: number): number {
  return Math.round(Math.max(0, Math.min(10, x)) * 10) / 10;
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx];
}

/** 表情係数が実質取れているか（全フレームほぼゼロなら非対応端末） */
function hasBlendshapes(frames: FaceFrame[]): boolean {
  return frames.some(
    (f) => f.smile > 0 || f.browUp > 0 || f.jawOpen > 0 || f.blink > 0
  );
}

/**
 * 顔の jawOpen から生徒が話していた区間（回答）を出す。
 * 音声セッションには生徒の発話開始イベントが無いので、口の動きで代用する。
 */
export function detectAnswers(
  frames: FaceFrame[]
): Array<{ start: number; end: number }> {
  const speaking: boolean[] = frames.map((f, i) => {
    let min = f.jawOpen;
    let max = f.jawOpen;
    for (let j = i - 1; j >= 0; j--) {
      if (f.timestamp - frames[j].timestamp > SPEAKING_WINDOW_MS / 2) break;
      min = Math.min(min, frames[j].jawOpen);
      max = Math.max(max, frames[j].jawOpen);
    }
    for (let j = i + 1; j < frames.length; j++) {
      if (frames[j].timestamp - f.timestamp > SPEAKING_WINDOW_MS / 2) break;
      min = Math.min(min, frames[j].jawOpen);
      max = Math.max(max, frames[j].jawOpen);
    }
    return max - min > SPEAKING_JAW_RANGE;
  });

  const runs: Array<{ start: number; end: number }> = [];
  for (let i = 0; i < frames.length; i++) {
    if (!speaking[i]) continue;
    const t = frames[i].timestamp;
    const last = runs[runs.length - 1];
    if (last && t - last.end < ANSWER_GAP_MS) last.end = t;
    else runs.push({ start: t, end: t });
  }
  return runs.filter((r) => r.end - r.start >= ANSWER_MIN_MS);
}

/** 話し始め・話し終わりの笑顔。回答が2回未満なら null */
function computeTurnSmile(
  frames: FaceFrame[]
): { turnSmileRate: number; answerCount: number } | null {
  if (!hasBlendshapes(frames)) return null;
  const answers = detectAnswers(frames);
  if (answers.length < 2) return null;
  const smiledIn = (from: number, to: number) =>
    frames.some(
      (f) =>
        f.timestamp >= from &&
        f.timestamp <= to &&
        f.smile >= TURN_SMILE_THRESHOLD
    );
  let hits = 0;
  for (const a of answers) {
    if (smiledIn(a.start - 1000, a.start + 2000)) hits++;
    if (smiledIn(a.end - 1500, a.end + 1500)) hits++;
  }
  return {
    turnSmileRate: round1((hits / (answers.length * 2)) * 100),
    answerCount: answers.length,
  };
}

/** 上半身の姿勢。肩が映っていたフレームが少なければ null */
export function computePosture(
  poseFrames: PoseFrame[],
  poseSampleCount: number,
  durationMinutes: number
): VideoAnalysis["posture"] | null {
  if (poseSampleCount === 0 || poseFrames.length < 5) return null;
  if (poseFrames.length / poseSampleCount < POSE_MIN_COVERAGE) return null;

  const baseline = percentile(
    poseFrames.map((p) => p.neckRatio),
    0.9
  );
  const uprightFrames = poseFrames.filter(
    (p) => p.neckRatio >= baseline * UPRIGHT_RATIO
  ).length;
  const uprightRate = (uprightFrames / poseFrames.length) * 100;

  const meanWidth =
    poseFrames.reduce((a, p) => a + p.shoulderWidth, 0) / poseFrames.length;
  const sway =
    Math.sqrt(
      stdDev(poseFrames.map((p) => p.shoulderMidX)) ** 2 +
        stdDev(poseFrames.map((p) => p.shoulderMidY)) ** 2
    ) / (meanWidth || 1);

  const shoulderTilt =
    poseFrames.reduce((a, p) => a + p.shoulderTiltDeg, 0) / poseFrames.length;

  let faceTouchCount = 0;
  let lastNear = -Infinity;
  for (const p of poseFrames) {
    if (!p.wristNearFace) continue;
    if (p.timestamp - lastNear > FACE_TOUCH_GAP_MS) faceTouchCount++;
    lastNear = p.timestamp;
  }
  const faceTouchRate =
    durationMinutes > 0 ? faceTouchCount / durationMinutes : 0;

  return {
    uprightRate: round1(uprightRate),
    bodySway: Math.round(sway * 1000) / 1000,
    shoulderTilt: round1(shoulderTilt),
    faceTouchCount,
    faceTouchRate: round1(faceTouchRate),
  };
}

function generateVideoFeedback(v: {
  eyeContactRate: number;
  smileRate: number;
  turnSmileRate: number | null;
  positionStability: number;
  avgHeadTilt: number;
  posture: VideoAnalysis["posture"] | null;
}): VideoAnalysis["feedback"] {
  let eyeContactAdvice: string;
  if (v.eyeContactRate >= 70) {
    eyeContactAdvice =
      "アイコンタクトが十分に維持できています。面接官に信頼感を与える話し方です。";
  } else if (v.eyeContactRate >= 40) {
    eyeContactAdvice =
      "アイコンタクトがやや不足気味です。カメラ（面接官）をもう少し見るように意識しましょう。";
  } else {
    eyeContactAdvice =
      "視線がカメラから外れがちです。面接では面接官の目を見て話すことが大切です。";
  }

  let expressionAdvice: string;
  if (v.turnSmileRate !== null) {
    if (v.turnSmileRate >= 50) {
      expressionAdvice =
        "話し始めと話し終わりに表情がやわらいでいて、感じの良い答え方です。";
    } else if (v.turnSmileRate >= 25) {
      expressionAdvice =
        "答えの最初と最後に少し口角を上げると、真剣さを保ったまま感じよく見えます。";
    } else {
      expressionAdvice =
        "答え始めと答え終わりの表情が硬めです。話している間は真剣でかまわないので、最初と最後だけ表情をゆるめましょう。";
    }
  } else if (v.smileRate >= 30) {
    expressionAdvice = "適度な笑顔で好印象です。親しみやすい雰囲気が伝わります。";
  } else if (v.smileRate >= 10) {
    expressionAdvice =
      "もう少し笑顔を意識すると、より親しみやすい印象になります。";
  } else {
    expressionAdvice =
      "表情が硬い印象です。自然な笑顔を心がけると面接官への印象が良くなります。";
  }

  const parts: string[] = [];
  if (v.posture) {
    if (v.posture.uprightRate >= 80) {
      parts.push("背筋が伸びた姿勢を保てています");
    } else if (v.posture.uprightRate >= 60) {
      parts.push("ときどき前かがみになっています。答えている間も背筋を意識しましょう");
    } else {
      parts.push("前かがみの時間が長めです。椅子に深く座り、背筋を伸ばして話しましょう");
    }
    if (v.posture.bodySway > 0.1) {
      parts.push("体が揺れがちです。両足を床につけて上半身を止めましょう");
    }
    if (v.posture.faceTouchRate >= 2) {
      parts.push("顔や髪を触る回数が多めです。手は膝の上に置きましょう");
    }
    if (v.posture.shoulderTilt > 8) {
      parts.push("肩が片側に傾いています");
    }
  } else {
    if (v.positionStability >= 0.8) {
      parts.push("姿勢が安定していて落ち着いた印象です");
    } else if (v.positionStability >= 0.5) {
      parts.push("やや体が動いている印象です。落ち着いた姿勢を意識しましょう");
    } else {
      parts.push("体の動きが大きいです。面接中は姿勢を安定させましょう");
    }
  }
  if (v.avgHeadTilt > 10) {
    parts.push("首が傾きがちです。まっすぐ正面を向くように意識しましょう");
  }
  const postureAdvice = parts.join("。") + "。";

  const smileOk =
    v.turnSmileRate !== null ? v.turnSmileRate >= 25 : v.smileRate >= 20;
  const postureOk = v.posture
    ? v.posture.uprightRate >= 70 && v.posture.faceTouchRate < 2
    : v.positionStability >= 0.7;
  let overallBodyLanguageAdvice: string;
  if (v.eyeContactRate >= 60 && smileOk && postureOk) {
    overallBodyLanguageAdvice =
      "非言語コミュニケーションは全体的に良好です。自信を持って本番に臨みましょう。";
  } else {
    const tips: string[] = [];
    if (v.eyeContactRate < 60) tips.push("アイコンタクト");
    if (!smileOk) tips.push("笑顔");
    if (!postureOk) tips.push("姿勢");
    overallBodyLanguageAdvice = `${tips.join("・")}を改善すると、面接の印象が大きく向上します。`;
  }

  return {
    eyeContactAdvice,
    expressionAdvice,
    postureAdvice,
    overallBodyLanguageAdvice,
  };
}

/** 傾向ベースの穏当なアドバイス (断定を避ける) */
function generateAffectFeedback(
  warmth: number,
  tension: number,
  composure: number,
  engagement: number
): NonNullable<VideoAnalysis["affect"]>["feedback"] {
  const warmthAdvice =
    warmth >= 6
      ? "やわらかい表情で、親しみやすい印象が出ています。"
      : warmth >= 3
        ? "もう少し口角を上げると、明るい印象になりやすいです。"
        : "表情がやや硬めの傾向です。自然な笑顔を少し意識してみましょう。";
  const tensionAdvice =
    tension >= 6
      ? "やや緊張が表情に出ている傾向です。深呼吸や間の取り方で和らげられます。"
      : tension >= 3
        ? "適度な緊張感です。落ち着いて話せています。"
        : "リラックスして臨めている印象です。";
  const composureAdvice =
    composure >= 6
      ? "落ち着いた佇まいで安定して見えます。"
      : composure >= 3
        ? "おおむね落ち着いていますが、間を意識するとより安定します。"
        : "やや余裕がなく見える傾向です。ゆっくり話すと落ち着いて見えます。";
  const engagementAdvice =
    engagement >= 6
      ? "表情に動きがあり、熱意が伝わりやすい話し方です。"
      : engagement >= 3
        ? "もう少し表情に変化をつけると、熱意がより伝わります。"
        : "表情の変化が少なめの傾向です。大事な箇所で表情を添えてみましょう。";
  return { warmthAdvice, tensionAdvice, composureAdvice, engagementAdvice };
}

/**
 * blendshapes 由来の「面接向け感情指標」を算出 (印象の傾向, 0-10)。
 * blendshapes が実質取得できていなければ undefined を返す (後方互換 degrade)。
 */
function buildAffect(
  frames: FaceFrame[],
  durationMinutes: number,
  positionStability: number
): VideoAnalysis["affect"] {
  const n = frames.length;
  if (n === 0) return undefined;
  if (!hasBlendshapes(frames)) return undefined;

  const mean = (sel: (f: FaceFrame) => number) =>
    frames.reduce((a, f) => a + sel(f), 0) / n;
  const smile = mean((f) => f.smile);
  const cheek = mean((f) => f.cheek);
  const browDown = mean((f) => f.browDown);
  const lipPress = mean((f) => f.lipPress);
  const noseSneer = mean((f) => f.noseSneer);

  // blink rate: 立ち上がり(>=閾値)回数 / 分
  let blinks = 0;
  let prevBlink = false;
  for (const f of frames) {
    const b = f.blink >= BLINK_THRESHOLD;
    if (b && !prevBlink) blinks++;
    prevBlink = b;
  }
  const blinkRate =
    durationMinutes > 0 ? Math.round(blinks / durationMinutes) : 0;

  // warmth: 笑顔 + Duchenne(頬も上がる本物の笑顔)ボーナス
  const duchenne = smile > 0.2 ? Math.min(1, cheek * 1.5) : 0;
  const warmth = scale10(smile * 12 + duchenne * 2);

  // tension: 眉間/口の引き結び/鼻のこわばり + まばたき過多
  const blinkTension =
    blinkRate > 25 ? Math.min(2, ((blinkRate - 25) / 15) * 2) : 0;
  const tension = scale10(
    (browDown * 0.5 + lipPress * 0.35 + noseSneer * 0.15) * 18 + blinkTension
  );

  // engagement: 眉/口の動きの大きさ(時間変動) + 笑顔の有無
  const browUpStd = stdDev(frames.map((f) => f.browUp));
  const jawStd = stdDev(frames.map((f) => f.jawOpen));
  const engagement = scale10(
    browUpStd * 30 + jawStd * 20 + (smile > 0.15 ? 2 : 0)
  );

  // composure: 低 tension + 姿勢安定
  const composure = scale10(
    (10 - tension) * 0.6 + positionStability * 10 * 0.4
  );

  return {
    warmth,
    tension,
    composure,
    engagement,
    blinkRate,
    feedback: generateAffectFeedback(warmth, tension, composure, engagement),
  };
}

/** 姿勢の点（0-10）。前かがみ・揺れを見て、顔を触る癖は減点する */
function postureScore(p: NonNullable<VideoAnalysis["posture"]>): number {
  const upright = p.uprightRate >= 80 ? 9 : p.uprightRate >= 60 ? 6 : 3;
  const sway = p.bodySway <= 0.05 ? 9 : p.bodySway <= 0.1 ? 6 : 3;
  const touchPenalty = p.faceTouchRate >= 2 ? 2 : 0;
  return Math.max(0, (upright + sway) / 2 - touchPenalty);
}

/**
 * 貯めたフレームから解析結果を出す。顔のフレームが足りなければ null。
 * poseSampleCount は姿勢推定を回したフレーム数（肩が映らなかった分も含む）。
 */
export function computeVideoAnalysis(
  frames: FaceFrame[],
  poseFrames: PoseFrame[] = [],
  poseSampleCount = 0
): VideoAnalysis | null {
  if (frames.length < 5) return null;

  const totalFrames = frames.length;
  const durationMs = frames[totalFrames - 1].timestamp - frames[0].timestamp;
  const durationMinutes = durationMs / 60000;

  // Eye contact rate
  const eyeContactFrames = frames.filter((f) => f.isEyeContact).length;
  const eyeContactRate = (eyeContactFrames / totalFrames) * 100;

  // 連続してカメラを見ていた時間の平均
  const streaks: number[] = [];
  let streakStart: number | null = null;
  for (let i = 0; i < totalFrames; i++) {
    const f = frames[i];
    if (f.isEyeContact && streakStart === null) streakStart = f.timestamp;
    if (!f.isEyeContact && streakStart !== null) {
      streaks.push((f.timestamp - streakStart) / 1000);
      streakStart = null;
    }
  }
  if (streakStart !== null) {
    streaks.push((frames[totalFrames - 1].timestamp - streakStart) / 1000);
  }
  const eyeContactDuration =
    streaks.length > 0 ? streaks.reduce((a, b) => a + b, 0) / streaks.length : 0;

  // Smile rate
  const smileFrames = frames.filter((f) => f.isSmiling).length;
  const smileRate = (smileFrames / totalFrames) * 100;

  // Expression variation (how often smile state changes)
  let expressionChanges = 0;
  for (let i = 1; i < totalFrames; i++) {
    if (frames[i].isSmiling !== frames[i - 1].isSmiling) expressionChanges++;
  }
  const expressionVariation = Math.min(
    1,
    expressionChanges / (totalFrames * 0.1)
  );

  // Position stability (inverse of nose position standard deviation)
  const stdDevX = stdDev(frames.map((f) => f.noseX));
  const stdDevY = stdDev(frames.map((f) => f.noseY));
  const movementMagnitude = Math.sqrt(stdDevX ** 2 + stdDevY ** 2);
  const positionStability = Math.max(
    0,
    Math.min(1, 1 - movementMagnitude * 10)
  );

  // Average head tilt
  const avgHeadTilt =
    frames.reduce((sum, f) => sum + f.headTiltDeg, 0) / totalFrames;

  // Nod detection (peak detection on nose Y)
  const NOD_AMPLITUDE_THRESHOLD = 0.015; // normalized Y movement
  let nodCount = 0;
  const smoothWindow = 3;
  const smoothedY: number[] = [];
  for (let i = 0; i < totalFrames; i++) {
    const start = Math.max(0, i - smoothWindow);
    const end = Math.min(totalFrames, i + smoothWindow + 1);
    let sum = 0;
    for (let j = start; j < end; j++) sum += frames[j].noseY;
    smoothedY.push(sum / (end - start));
  }
  for (let i = 2; i < smoothedY.length - 2; i++) {
    if (
      smoothedY[i] > smoothedY[i - 1] &&
      smoothedY[i] > smoothedY[i - 2] &&
      smoothedY[i] > smoothedY[i + 1] &&
      smoothedY[i] > smoothedY[i + 2]
    ) {
      const localMin = Math.min(smoothedY[i - 2], smoothedY[i + 2]);
      if (smoothedY[i] - localMin > NOD_AMPLITUDE_THRESHOLD) nodCount++;
    }
  }
  const nodRate = durationMinutes > 0 ? nodCount / durationMinutes : 0;

  const turnSmile = computeTurnSmile(frames);
  const posture = computePosture(poseFrames, poseSampleCount, durationMinutes);

  // Score calculation
  const eyeContactScore =
    eyeContactRate >= 70 ? 9 : eyeContactRate >= 40 ? 6 : 3;
  // 笑顔は答えの最初と最後で見る。話している最中の真剣な顔は減点しない
  const smileScore = turnSmile
    ? turnSmile.turnSmileRate >= 50
      ? 9
      : turnSmile.turnSmileRate >= 25
        ? 6
        : 3
    : smileRate >= 30
      ? 9
      : smileRate >= 10
        ? 6
        : 3;
  const stabilityScore = posture
    ? postureScore(posture)
    : positionStability >= 0.8
      ? 9
      : positionStability >= 0.5
        ? 6
        : 3;
  const nodScore = nodRate >= 3 && nodRate <= 15 ? 9 : nodRate >= 1 ? 6 : 3;

  const overallVideoScore =
    Math.round(
      (eyeContactScore * 0.35 +
        smileScore * 0.2 +
        stabilityScore * 0.25 +
        nodScore * 0.2) *
        10
    ) / 10;

  const feedback = generateVideoFeedback({
    eyeContactRate,
    smileRate,
    turnSmileRate: turnSmile?.turnSmileRate ?? null,
    positionStability,
    avgHeadTilt,
    posture,
  });

  const affect = buildAffect(frames, durationMinutes, positionStability);

  return {
    eyeContactRate: round1(eyeContactRate),
    eyeContactDuration: round1(eyeContactDuration),
    smileRate: round1(smileRate),
    expressionVariation: Math.round(expressionVariation * 100) / 100,
    positionStability: Math.round(positionStability * 100) / 100,
    avgHeadTilt: round1(avgHeadTilt),
    nodCount,
    nodRate: round1(nodRate),
    ...(turnSmile ? turnSmile : {}),
    ...(posture ? { posture } : {}),
    overallVideoScore: Math.min(10, Math.max(0, overallVideoScore)),
    feedback,
    ...(affect ? { affect } : {}),
  };
}
