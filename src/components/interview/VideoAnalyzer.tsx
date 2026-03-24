"use client";

import { useEffect, useRef, useCallback } from "react";
import type { VideoAnalysis } from "@/lib/types/interview";
import type { FaceLandmarkerInstance } from "@mediapipe/tasks-vision";

interface VideoAnalyzerProps {
  mediaStream: MediaStream | null;
  isRecording: boolean;
  onAnalysisComplete: (analysis: VideoAnalysis) => void;
}

// Landmark indices
const NOSE_TIP = 1;
const LEFT_MOUTH_CORNER = 61;
const RIGHT_MOUTH_CORNER = 291;
const UPPER_LIP = 13;
const LEFT_EYE_INNER = 133;
const RIGHT_EYE_INNER = 362;
// Iris landmarks start at 468
const LEFT_IRIS_CENTER = 468;
const RIGHT_IRIS_CENTER = 473;

const EYE_CONTACT_ANGLE_THRESHOLD = 15; // degrees
const SMILE_RATIO_THRESHOLD = 0.35;
const NOD_AMPLITUDE_THRESHOLD = 0.015; // normalized Y movement
const ANALYSIS_FPS = 10;
const FRAME_INTERVAL = 1000 / ANALYSIS_FPS;

interface FrameData {
  timestamp: number;
  noseY: number;
  noseX: number;
  isEyeContact: boolean;
  isSmiling: boolean;
  headTiltDeg: number;
}

function dist2d(
  x1: number, y1: number, x2: number, y2: number
): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function generateVideoFeedback(
  eyeContactRate: number,
  smileRate: number,
  positionStability: number,
  nodRate: number,
  avgHeadTilt: number
): VideoAnalysis["feedback"] {
  let eyeContactAdvice: string;
  if (eyeContactRate >= 70) {
    eyeContactAdvice = "アイコンタクトが十分に維持できています。面接官に信頼感を与える話し方です。";
  } else if (eyeContactRate >= 40) {
    eyeContactAdvice = "アイコンタクトがやや不足気味です。カメラ（面接官）をもう少し見るように意識しましょう。";
  } else {
    eyeContactAdvice = "視線がカメラから外れがちです。面接では面接官の目を見て話すことが大切です。";
  }

  let expressionAdvice: string;
  if (smileRate >= 30) {
    expressionAdvice = "適度な笑顔で好印象です。親しみやすい雰囲気が伝わります。";
  } else if (smileRate >= 10) {
    expressionAdvice = "もう少し笑顔を意識すると、より親しみやすい印象になります。";
  } else {
    expressionAdvice = "表情が硬い印象です。自然な笑顔を心がけると面接官への印象が良くなります。";
  }

  let postureAdvice: string;
  const parts: string[] = [];
  if (positionStability >= 0.8) {
    parts.push("姿勢が安定していて落ち着いた印象です");
  } else if (positionStability >= 0.5) {
    parts.push("やや体が動いている印象です。落ち着いた姿勢を意識しましょう");
  } else {
    parts.push("体の動きが大きいです。面接中は姿勢を安定させましょう");
  }
  if (avgHeadTilt > 10) {
    parts.push("首が傾きがちです。まっすぐ正面を向くように意識しましょう");
  }
  postureAdvice = parts.join("。") + "。";

  let overallBodyLanguageAdvice: string;
  if (eyeContactRate >= 60 && smileRate >= 20 && positionStability >= 0.7) {
    overallBodyLanguageAdvice = "非言語コミュニケーションは全体的に良好です。自信を持って本番に臨みましょう。";
  } else {
    const tips: string[] = [];
    if (eyeContactRate < 60) tips.push("アイコンタクト");
    if (smileRate < 20) tips.push("笑顔");
    if (positionStability < 0.7) tips.push("姿勢の安定");
    overallBodyLanguageAdvice = `${tips.join("・")}を改善すると、面接の印象が大きく向上します。`;
  }

  return { eyeContactAdvice, expressionAdvice, postureAdvice, overallBodyLanguageAdvice };
}

export default function VideoAnalyzer({
  mediaStream,
  isRecording,
  onAnalysisComplete,
}: VideoAnalyzerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarkerInstance | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const frameDataRef = useRef<FrameData[]>([]);
  const eyeContactStreakRef = useRef<number[]>([]);
  const currentStreakRef = useRef<number>(0);
  const wasRecordingRef = useRef(false);
  const initializingRef = useRef(false);

  const cleanup = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (faceLandmarkerRef.current) {
      faceLandmarkerRef.current.close();
    }
    faceLandmarkerRef.current = null;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isRecording && mediaStream) {
      frameDataRef.current = [];
      eyeContactStreakRef.current = [];
      currentStreakRef.current = 0;
      lastFrameTimeRef.current = 0;

      // Create hidden video element
      if (!videoRef.current) {
        const video = document.createElement("video");
        video.style.display = "none";
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        document.body.appendChild(video);
        videoRef.current = video;
      }
      if (!canvasRef.current) {
        canvasRef.current = document.createElement("canvas");
      }

      videoRef.current.srcObject = mediaStream;
      videoRef.current.play().catch(() => {});

      // Initialize FaceLandmarker
      if (!faceLandmarkerRef.current && !initializingRef.current) {
        initializingRef.current = true;
        import("@mediapipe/tasks-vision").then(async ({ FaceLandmarker, FilesetResolver }) => {
          try {
            const vision = await FilesetResolver.forVisionTasks(
              "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
            );
            const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                delegate: "GPU",
              },
              runningMode: "VIDEO",
              numFaces: 1,
              outputFaceBlendshapes: false,
              outputFacialTransformationMatrixes: false,
            });
            faceLandmarkerRef.current = faceLandmarker;
            initializingRef.current = false;
            startAnalysis();
          } catch {
            // FaceLandmarker initialization failed (e.g., no WebGL)
            initializingRef.current = false;
          }
        }).catch(() => {
          initializingRef.current = false;
        });
      } else if (faceLandmarkerRef.current) {
        startAnalysis();
      }
    }

    function startAnalysis() {
      if (!videoRef.current || !faceLandmarkerRef.current) return;

      const fl = faceLandmarkerRef.current;

      function analyze() {
        const video = videoRef.current;
        if (!video || video.readyState < 2) {
          animFrameRef.current = requestAnimationFrame(analyze);
          return;
        }

        const now = performance.now();
        if (now - lastFrameTimeRef.current < FRAME_INTERVAL) {
          animFrameRef.current = requestAnimationFrame(analyze);
          return;
        }
        lastFrameTimeRef.current = now;

        try {
          const result = fl.detectForVideo(video, now);
          if (result.faceLandmarks && result.faceLandmarks.length > 0) {
            const landmarks = result.faceLandmarks[0];
            processLandmarks(landmarks, now);
          }
        } catch {
          // Frame processing error, continue
        }

        animFrameRef.current = requestAnimationFrame(analyze);
      }

      animFrameRef.current = requestAnimationFrame(analyze);
    }

    function processLandmarks(
      landmarks: Array<{ x: number; y: number; z: number }>,
      timestamp: number
    ) {
      const nose = landmarks[NOSE_TIP];

      // Eye contact detection using iris landmarks
      let isEyeContact = false;
      if (landmarks.length > RIGHT_IRIS_CENTER + 4) {
        const leftIris = landmarks[LEFT_IRIS_CENTER];
        const rightIris = landmarks[RIGHT_IRIS_CENTER];
        const leftEyeInner = landmarks[LEFT_EYE_INNER];
        const rightEyeInner = landmarks[RIGHT_EYE_INNER];
        const eyeCenter = {
          x: (leftEyeInner.x + rightEyeInner.x) / 2,
          y: (leftEyeInner.y + rightEyeInner.y) / 2,
        };
        const irisCenter = {
          x: (leftIris.x + rightIris.x) / 2,
          y: (leftIris.y + rightIris.y) / 2,
        };
        const dx = irisCenter.x - eyeCenter.x;
        const dy = irisCenter.y - eyeCenter.y;
        const angleDeg = Math.atan2(Math.sqrt(dx * dx + dy * dy), 1) * (180 / Math.PI);
        // Also check nose Z direction - facing camera
        const noseAngle = Math.abs(nose.x - 0.5) * 90; // rough horizontal angle
        isEyeContact = angleDeg < EYE_CONTACT_ANGLE_THRESHOLD && noseAngle < 20;
      }

      // Smile detection
      const leftMouth = landmarks[LEFT_MOUTH_CORNER];
      const rightMouth = landmarks[RIGHT_MOUTH_CORNER];
      const upperLip = landmarks[UPPER_LIP];
      const mouthWidth = dist2d(leftMouth.x, leftMouth.y, rightMouth.x, rightMouth.y);
      const mouthCornerMidY = (leftMouth.y + rightMouth.y) / 2;
      const smileRatio = (upperLip.y - mouthCornerMidY) / (mouthWidth || 1);
      const isSmiling = smileRatio > SMILE_RATIO_THRESHOLD;

      // Head tilt (using eye inner corners)
      const leftEye = landmarks[LEFT_EYE_INNER];
      const rightEye = landmarks[RIGHT_EYE_INNER];
      const headTiltRad = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
      const headTiltDeg = Math.abs(headTiltRad * (180 / Math.PI));

      // Track eye contact streaks
      if (isEyeContact) {
        currentStreakRef.current += FRAME_INTERVAL / 1000;
      } else {
        if (currentStreakRef.current > 0) {
          eyeContactStreakRef.current.push(currentStreakRef.current);
          currentStreakRef.current = 0;
        }
      }

      frameDataRef.current.push({
        timestamp,
        noseY: nose.y,
        noseX: nose.x,
        isEyeContact,
        isSmiling,
        headTiltDeg,
      });
    }

    return () => {
      if (!isRecording) {
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
      }
    };
  }, [isRecording, mediaStream, cleanup]);

  // When recording stops, compute and emit results
  useEffect(() => {
    if (wasRecordingRef.current && !isRecording) {
      const frames = frameDataRef.current;

      if (frames.length < 5) {
        // Not enough data, skip analysis
        wasRecordingRef.current = isRecording;
        cleanup();
        return;
      }

      const totalFrames = frames.length;
      const durationMs = frames[totalFrames - 1].timestamp - frames[0].timestamp;
      const durationMinutes = durationMs / 60000;

      // Eye contact rate
      const eyeContactFrames = frames.filter((f) => f.isEyeContact).length;
      const eyeContactRate = (eyeContactFrames / totalFrames) * 100;

      // Finalize current streak
      if (currentStreakRef.current > 0) {
        eyeContactStreakRef.current.push(currentStreakRef.current);
      }
      const streaks = eyeContactStreakRef.current;
      const eyeContactDuration =
        streaks.length > 0
          ? streaks.reduce((a, b) => a + b, 0) / streaks.length
          : 0;

      // Smile rate
      const smileFrames = frames.filter((f) => f.isSmiling).length;
      const smileRate = (smileFrames / totalFrames) * 100;

      // Expression variation (how often smile state changes)
      let expressionChanges = 0;
      for (let i = 1; i < totalFrames; i++) {
        if (frames[i].isSmiling !== frames[i - 1].isSmiling) {
          expressionChanges++;
        }
      }
      const expressionVariation = Math.min(1, expressionChanges / (totalFrames * 0.1));

      // Position stability (inverse of nose position standard deviation)
      const noseXValues = frames.map((f) => f.noseX);
      const noseYValues = frames.map((f) => f.noseY);
      const stdDevX = stdDev(noseXValues);
      const stdDevY = stdDev(noseYValues);
      const movementMagnitude = Math.sqrt(stdDevX ** 2 + stdDevY ** 2);
      const positionStability = Math.max(0, Math.min(1, 1 - movementMagnitude * 10));

      // Average head tilt
      const avgHeadTilt =
        frames.reduce((sum, f) => sum + f.headTiltDeg, 0) / totalFrames;

      // Nod detection (peak detection on nose Y)
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
      // Find peaks (local maxima in Y = downward movement)
      for (let i = 2; i < smoothedY.length - 2; i++) {
        if (
          smoothedY[i] > smoothedY[i - 1] &&
          smoothedY[i] > smoothedY[i - 2] &&
          smoothedY[i] > smoothedY[i + 1] &&
          smoothedY[i] > smoothedY[i + 2]
        ) {
          // Check amplitude
          const localMin = Math.min(smoothedY[i - 2], smoothedY[i + 2]);
          if (smoothedY[i] - localMin > NOD_AMPLITUDE_THRESHOLD) {
            nodCount++;
          }
        }
      }
      const nodRate = durationMinutes > 0 ? nodCount / durationMinutes : 0;

      // Score calculation
      const eyeContactScore = eyeContactRate >= 70 ? 9 : eyeContactRate >= 40 ? 6 : 3;
      const smileScore = smileRate >= 30 ? 9 : smileRate >= 10 ? 6 : 3;
      const stabilityScore = positionStability >= 0.8 ? 9 : positionStability >= 0.5 ? 6 : 3;
      const nodScore = nodRate >= 3 && nodRate <= 15 ? 9 : nodRate >= 1 ? 6 : 3;

      const overallVideoScore = Math.round(
        (eyeContactScore * 0.35 + smileScore * 0.2 + stabilityScore * 0.25 + nodScore * 0.2) * 10
      ) / 10;

      const feedback = generateVideoFeedback(
        eyeContactRate,
        smileRate,
        positionStability,
        nodRate,
        avgHeadTilt
      );

      const analysis: VideoAnalysis = {
        eyeContactRate: Math.round(eyeContactRate * 10) / 10,
        eyeContactDuration: Math.round(eyeContactDuration * 10) / 10,
        smileRate: Math.round(smileRate * 10) / 10,
        expressionVariation: Math.round(expressionVariation * 100) / 100,
        positionStability: Math.round(positionStability * 100) / 100,
        avgHeadTilt: Math.round(avgHeadTilt * 10) / 10,
        nodCount,
        nodRate: Math.round(nodRate * 10) / 10,
        overallVideoScore: Math.min(10, Math.max(0, overallVideoScore)),
        feedback,
      };

      onAnalysisComplete(analysis);
      cleanup();
    }
    wasRecordingRef.current = isRecording;
  }, [isRecording, onAnalysisComplete, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.remove();
        videoRef.current = null;
      }
    };
  }, [cleanup]);

  return null;
}

function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}
