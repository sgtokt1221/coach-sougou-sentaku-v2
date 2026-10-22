"use client";

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, type ForwardedRef } from "react";
import type { VideoAnalysis } from "@/lib/types/interview";
import type { FaceLandmarkerInstance, PoseLandmarkerInstance } from "@mediapipe/tasks-vision";
import {
  computeVideoAnalysis,
  type FaceFrame,
  type PoseFrame,
} from "@/lib/interview/video-analysis";

interface VideoAnalyzerProps {
  mediaStream: MediaStream | null;
  isRecording: boolean;
  onAnalysisComplete: (analysis: VideoAnalysis) => void;
  /** 視線が一定時間外れた時にリアルタイム警告を出すコールバック */
  onGazeAlert?: (message: string) => void;
}

/** 親から flush() を呼ぶための ref ハンドル。終了時のレース回避に使う */
export interface VideoAnalyzerHandle {
  /** 現時点の蓄積フレームから解析結果を同期的に算出して返す (副作用なし。データ不足は null) */
  flush: () => VideoAnalysis | null;
}

/** 視線外れが続いたと見なす閾値(秒) */
const GAZE_LOSS_ALERT_SECONDS = 3.0;
/** 同じ警告を連発しないためのクールダウン(ミリ秒) */
const GAZE_ALERT_COOLDOWN_MS = 20 * 1000;

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
// Pose landmark indices
const POSE_NOSE = 0;
const POSE_LEFT_SHOULDER = 11;
const POSE_RIGHT_SHOULDER = 12;
const POSE_LEFT_WRIST = 15;
const POSE_RIGHT_WRIST = 16;
/** 肩・手首が映っているとみなす visibility */
const POSE_VISIBILITY_MIN = 0.5;
/** 手首が鼻からこの距離（肩幅比）以内なら顔や髪を触っている */
const FACE_TOUCH_DISTANCE = 0.6;
/** 姿勢推定は顔の何フレームに1回回すか（CPU 負荷を抑える） */
const POSE_EVERY_N_FRAMES = 2;

const EYE_CONTACT_ANGLE_THRESHOLD = 15; // degrees
const SMILE_RATIO_THRESHOLD = 0.35;
const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const ANALYSIS_FPS = isMobile ? 5 : 10;
const FRAME_INTERVAL = 1000 / ANALYSIS_FPS;

function dist2d(
  x1: number, y1: number, x2: number, y2: number
): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function VideoAnalyzerInner(
  { mediaStream, isRecording, onAnalysisComplete, onGazeAlert }: VideoAnalyzerProps,
  ref: ForwardedRef<VideoAnalyzerHandle>,
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarkerInstance | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const frameDataRef = useRef<FaceFrame[]>([]);
  const poseLandmarkerRef = useRef<PoseLandmarkerInstance | null>(null);
  const poseFrameDataRef = useRef<PoseFrame[]>([]);
  /** 姿勢推定を回したフレーム数（肩が映らなかった分も含む。映っていた割合の分母） */
  const poseSampleCountRef = useRef(0);
  const frameCounterRef = useRef(0);
  const wasRecordingRef = useRef(false);
  const blendshapeNamesLoggedRef = useRef(false);
  const initializingRef = useRef(false);
  const errorCountRef = useRef(0);
  const lastDetectTimeRef = useRef<number | null>(null);
  /** 視線が外れ始めた時刻(ms)。目線が戻ったら null にリセット */
  const gazeLossStartRef = useRef<number | null>(null);
  /** 最後に警告を発火した時刻(ms)。クールダウン判定用 */
  const lastGazeAlertAtRef = useRef<number>(0);
  /** onGazeAlert を最新値で参照するための ref */
  const onGazeAlertRef = useRef(onGazeAlert);
  useEffect(() => {
    onGazeAlertRef.current = onGazeAlert;
  }, [onGazeAlert]);

  const cleanup = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (faceLandmarkerRef.current) {
      faceLandmarkerRef.current.close();
    }
    faceLandmarkerRef.current = null;
    poseLandmarkerRef.current?.close();
    poseLandmarkerRef.current = null;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isRecording && mediaStream) {
      frameDataRef.current = [];
      poseFrameDataRef.current = [];
      poseSampleCountRef.current = 0;
      frameCounterRef.current = 0;
      lastFrameTimeRef.current = 0;
      gazeLossStartRef.current = null;
      lastGazeAlertAtRef.current = 0;

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
        import("@mediapipe/tasks-vision").then(async ({ FaceLandmarker, PoseLandmarker, FilesetResolver }) => {
          try {
            const vision = await FilesetResolver.forVisionTasks(
              "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
            );
            // Try GPU first, fall back to CPU (needed for mobile)
            let faceLandmarker: FaceLandmarkerInstance;
            try {
              faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
                baseOptions: {
                  modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                  delegate: "GPU",
                },
                runningMode: "VIDEO",
                numFaces: 1,
                outputFaceBlendshapes: true,
                outputFacialTransformationMatrixes: false,
              });
            } catch {
              // GPU delegate failed (common on mobile), retry with CPU
              faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
                baseOptions: {
                  modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                  delegate: "CPU",
                },
                runningMode: "VIDEO",
                numFaces: 1,
                outputFaceBlendshapes: true,
                outputFacialTransformationMatrixes: false,
              });
            }
            faceLandmarkerRef.current = faceLandmarker;
            // 上半身の姿勢。失敗しても顔の分析は続ける（姿勢は評価なしになる）
            const poseOptions = (delegate: "GPU" | "CPU") => ({
              baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
                delegate,
              },
              runningMode: "VIDEO" as const,
              numPoses: 1,
            });
            try {
              poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, poseOptions("GPU"))
                .catch(() => PoseLandmarker.createFromOptions(vision, poseOptions("CPU")));
            } catch {
              poseLandmarkerRef.current = null;
            }
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
          if (video.videoWidth === 0 || video.videoHeight === 0) {
            animFrameRef.current = requestAnimationFrame(analyze);
            return;
          }
          // Ensure monotonically increasing timestamp
          const ts = Math.max(Math.round(now), (lastDetectTimeRef.current ?? 0) + 1);
          lastDetectTimeRef.current = ts;
          const result = fl.detectForVideo(video, ts);
          if (result?.faceLandmarks && result.faceLandmarks.length > 0) {
            const landmarks = result.faceLandmarks[0];
            const blendshapes = (
              result as { faceBlendshapes?: Array<{ categories?: Array<{ categoryName: string; score: number }> }> }
            ).faceBlendshapes?.[0]?.categories;
            processLandmarks(landmarks, now, blendshapes);
          }
          frameCounterRef.current++;
          const pl = poseLandmarkerRef.current;
          if (pl && frameCounterRef.current % POSE_EVERY_N_FRAMES === 0) {
            try {
              const pose = pl.detectForVideo(video, ts);
              poseSampleCountRef.current++;
              const lm = pose?.landmarks?.[0];
              if (lm) processPose(lm, now, video.videoWidth / video.videoHeight);
            } catch {
              // 姿勢だけ落ちても顔の分析は止めない
              poseLandmarkerRef.current = null;
            }
          }
          errorCountRef.current = 0;
        } catch {
          errorCountRef.current++;
          if (errorCountRef.current > 3) {
            console.warn("[VideoAnalyzer] Too many errors, stopping analysis");
            return;
          }
        }

        animFrameRef.current = requestAnimationFrame(analyze);
      }

      animFrameRef.current = requestAnimationFrame(analyze);
    }

    function processPose(
      lm: Array<{ x: number; y: number; z: number; visibility?: number }>,
      timestamp: number,
      aspect: number,
    ) {
      const visible = (i: number) => (lm[i]?.visibility ?? 0) >= POSE_VISIBILITY_MIN;
      if (!visible(POSE_LEFT_SHOULDER) || !visible(POSE_RIGHT_SHOULDER)) return;
      // x に縦横比を掛け、x と y を同じ尺度にする
      const pt = (i: number) => ({ x: lm[i].x * aspect, y: lm[i].y });
      const ls = pt(POSE_LEFT_SHOULDER);
      const rs = pt(POSE_RIGHT_SHOULDER);
      const nose = pt(POSE_NOSE);
      const shoulderWidth = dist2d(ls.x, ls.y, rs.x, rs.y);
      if (shoulderWidth <= 0) return;
      const midX = (ls.x + rs.x) / 2;
      const midY = (ls.y + rs.y) / 2;
      const tilt = Math.abs(Math.atan2(rs.y - ls.y, rs.x - ls.x) * (180 / Math.PI));
      const wristNearFace = [POSE_LEFT_WRIST, POSE_RIGHT_WRIST].some((i) => {
        if (!visible(i)) return false;
        const w = pt(i);
        return dist2d(w.x, w.y, nose.x, nose.y) < shoulderWidth * FACE_TOUCH_DISTANCE;
      });
      poseFrameDataRef.current.push({
        timestamp,
        shoulderWidth,
        shoulderMidX: midX,
        shoulderMidY: midY,
        neckRatio: (midY - nose.y) / shoulderWidth,
        // atan2 は左右どちら向きでも 0 か 180 付近になるので、水平からのずれにする
        shoulderTiltDeg: Math.min(tilt, 180 - tilt),
        wristNearFace,
      });
    }

    function processLandmarks(
      landmarks: Array<{ x: number; y: number; z: number }>,
      timestamp: number,
      blendshapes?: Array<{ categoryName: string; score: number }>,
    ) {
      const nose = landmarks[NOSE_TIP];

      // blendshapes (ARKit 52種, categoryName->score) を辞書化して参照
      let bsMap: Record<string, number> | null = null;
      if (blendshapes && blendshapes.length > 0) {
        bsMap = {};
        for (const c of blendshapes) bsMap[c.categoryName] = c.score;
        // 初回のみ利用可能な categoryName を dev ログ (名前突合用)
        if (process.env.NODE_ENV === "development" && !blendshapeNamesLoggedRef.current) {
          blendshapeNamesLoggedRef.current = true;
          console.log("[VideoAnalyzer] blendshape categories:", blendshapes.map((c) => c.categoryName).join(","));
        }
      }
      const bs = (name: string) => (bsMap ? bsMap[name] ?? 0 : 0);
      const avg2 = (a: string, b: string) => (bs(a) + bs(b)) / 2;
      const frameSmile = avg2("mouthSmileLeft", "mouthSmileRight");
      const frameCheek = avg2("cheekSquintLeft", "cheekSquintRight");
      const frameBrowDown = avg2("browDownLeft", "browDownRight");
      const frameLipPress = avg2("mouthPressLeft", "mouthPressRight");
      const frameNoseSneer = avg2("noseSneerLeft", "noseSneerRight");
      const frameBrowUp = (bs("browInnerUp") + avg2("browOuterUpLeft", "browOuterUpRight")) / 2;
      const frameJawOpen = bs("jawOpen");
      const frameBlink = avg2("eyeBlinkLeft", "eyeBlinkRight");

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

      if (isEyeContact) {
        // 目線が戻ったので視線外れ計測をリセット
        gazeLossStartRef.current = null;
      } else {
        // リアルタイム視線警告: 視線外れが閾値を超えたらクールダウン付きで発火
        if (gazeLossStartRef.current === null) {
          gazeLossStartRef.current = timestamp;
        } else {
          const lossSeconds = (timestamp - gazeLossStartRef.current) / 1000;
          const sinceLastAlert = timestamp - lastGazeAlertAtRef.current;
          if (
            lossSeconds >= GAZE_LOSS_ALERT_SECONDS &&
            sinceLastAlert >= GAZE_ALERT_COOLDOWN_MS &&
            onGazeAlertRef.current
          ) {
            lastGazeAlertAtRef.current = timestamp;
            onGazeAlertRef.current("視線が外れています。面接官（カメラ）を見るよう意識しましょう");
          }
        }
      }

      frameDataRef.current.push({
        timestamp,
        noseY: nose.y,
        noseX: nose.x,
        isEyeContact,
        isSmiling,
        headTiltDeg,
        smile: frameSmile,
        cheek: frameCheek,
        browDown: frameBrowDown,
        lipPress: frameLipPress,
        noseSneer: frameNoseSneer,
        browUp: frameBrowUp,
        jawOpen: frameJawOpen,
        blink: frameBlink,
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

  // 蓄積フレームから解析結果を算出する (ref を破壊しない＝flush と stop-effect の
  // 二重呼びでも結果が変わらない。cleanup もしない)。フレーム不足は null。
  const computeAnalysis = useCallback(
    (): VideoAnalysis | null =>
      computeVideoAnalysis(
        frameDataRef.current,
        poseFrameDataRef.current,
        poseSampleCountRef.current,
      ),
    [],
  );

  // 親が終了時に flush() を呼んで確定値を同期取得できるようにする (state 反映待ちのレース回避)
  useImperativeHandle(ref, () => ({ flush: () => computeAnalysis() }), [computeAnalysis]);

  // When recording stops, compute and emit results
  useEffect(() => {
    if (wasRecordingRef.current && !isRecording) {
      const analysis = computeAnalysis();
      if (analysis) onAnalysisComplete(analysis);
      cleanup();
    }
    wasRecordingRef.current = isRecording;
  }, [isRecording, onAnalysisComplete, cleanup, computeAnalysis]);

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

const VideoAnalyzer = forwardRef(VideoAnalyzerInner);
export default VideoAnalyzer;
