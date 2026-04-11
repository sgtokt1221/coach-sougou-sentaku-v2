"use client";

import { useEffect, useRef, useCallback } from "react";
import type { VoiceAnalysis } from "@/lib/types/interview";

interface VoiceAnalyzerProps {
  mediaStream: MediaStream | null;
  isRecording: boolean;
  onAnalysisComplete: (analysis: VoiceAnalysis) => void;
}

const SILENCE_THRESHOLD = 0.02;
const LONG_PAUSE_THRESHOLD = 3; // seconds
const RECOMMENDED_SPEECH_RATE = 300; // chars/min

const FILLER_PATTERNS = [
  "えーと", "えっと", "えー", "あのー", "あの", "まあ", "まぁ",
  "なんか", "そのー", "その", "うーん", "うん", "ええと",
];

/** 面接での相槌(面接官の発言を受けた応答) */
const BACKCHANNEL_PATTERNS = [
  "はい", "そうですね", "そうです", "なるほど", "ええ",
  "確かに", "おっしゃる通り", "わかります", "分かります",
];

function detectFillers(text: string): Array<{ word: string; count: number; timestamps: number[] }> {
  const results: Map<string, number> = new Map();
  for (const pattern of FILLER_PATTERNS) {
    const regex = new RegExp(pattern, "g");
    const matches = text.match(regex);
    if (matches && matches.length > 0) {
      results.set(pattern, matches.length);
    }
  }
  return Array.from(results.entries()).map(([word, count]) => ({
    word,
    count,
    timestamps: Array.from({ length: count }, (_, i) => i * 30),
  }));
}

/**
 * 相槌の検出。
 * ユーザー発話テキスト内での「はい」「そうですね」等の使用回数を数える。
 * 頻度が高すぎる(内容より相槌が多い)・低すぎる(機械的)のバランスを評価する材料。
 */
function detectBackchannels(text: string): Array<{ word: string; count: number }> {
  const results: Array<{ word: string; count: number }> = [];
  for (const pattern of BACKCHANNEL_PATTERNS) {
    // 単独発話や文頭での使用をカウント
    const regex = new RegExp(
      `(^|[、。\\s])${pattern}([、。\\s!?！？]|$)`,
      "g",
    );
    const matches = text.match(regex);
    if (matches && matches.length > 0) {
      results.push({ word: pattern, count: matches.length });
    }
  }
  return results;
}

function generateFeedback(
  speechRate: number,
  fillerCount: number,
  fillerRate: number,
  pauseAnalysis: { avgPauseDuration: number; longPauses: number },
  volumeVariation: number
): VoiceAnalysis["feedback"] {
  let speechRateAdvice: string;
  if (speechRate < 200) {
    speechRateAdvice = "話速がやや遅めです。もう少しテンポよく話すと、聞き手の集中力を保てます。";
  } else if (speechRate > 400) {
    speechRateAdvice = "話速が速すぎます。落ち着いてゆっくり話すことで、内容が伝わりやすくなります。";
  } else {
    speechRateAdvice = "話速は適切な範囲内です。明確さを保てています。";
  }

  let fillerAdvice: string;
  if (fillerRate > 5) {
    fillerAdvice = `フィラーが多く検出されました（${fillerCount}回、${fillerRate.toFixed(1)}/分）。意識的に間を置くことで改善できます。`;
  } else if (fillerRate > 2) {
    fillerAdvice = `フィラーが${fillerCount}回検出されました（${fillerRate.toFixed(1)}/分）。間を意識的に活用しましょう。`;
  } else {
    fillerAdvice = "フィラーは少なく、スムーズに話せています。";
  }

  let deliveryAdvice: string;
  const parts: string[] = [];
  if (volumeVariation > 0.4) {
    parts.push("声の抑揚が豊かで、聞き手を引きつける話し方です");
  } else if (volumeVariation < 0.15) {
    parts.push("声の抑揚が少なめです。強調したい部分で声量を変えてみましょう");
  } else {
    parts.push("声の抑揚は良好です");
  }
  if (pauseAnalysis.longPauses > 3) {
    parts.push(`長い沈黙が${pauseAnalysis.longPauses}回あり、やや多い印象です`);
  } else if (pauseAnalysis.longPauses > 0) {
    parts.push(`長い沈黙が${pauseAnalysis.longPauses}回ありましたが、考えをまとめる時間として自然です`);
  }
  deliveryAdvice = parts.join("。") + "。";

  return { speechRateAdvice, fillerAdvice, deliveryAdvice };
}

export default function VoiceAnalyzer({
  mediaStream,
  isRecording,
  onAnalysisComplete,
}: VoiceAnalyzerProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const rmsHistoryRef = useRef<number[]>([]);
  const startTimeRef = useRef<number>(0);
  const silenceStartRef = useRef<number | null>(null);
  const pauseDurationsRef = useRef<number[]>([]);
  const wasRecordingRef = useRef(false);

  const stopAnalysis = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  // Start analysis when recording begins
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isRecording && mediaStream) {
      // Reset state
      rmsHistoryRef.current = [];
      pauseDurationsRef.current = [];
      silenceStartRef.current = null;
      startTimeRef.current = Date.now();

      try {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(mediaStream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        const dataArray = new Float32Array(analyser.fftSize);

        function analyze() {
          if (!analyserRef.current) return;
          analyserRef.current.getFloatTimeDomainData(dataArray);

          // Calculate RMS
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sum / dataArray.length);
          rmsHistoryRef.current.push(rms);

          // Silence detection
          const now = Date.now();
          if (rms < SILENCE_THRESHOLD) {
            if (silenceStartRef.current === null) {
              silenceStartRef.current = now;
            }
          } else {
            if (silenceStartRef.current !== null) {
              const silenceDuration = (now - silenceStartRef.current) / 1000;
              if (silenceDuration > 0.5) {
                pauseDurationsRef.current.push(silenceDuration);
              }
              silenceStartRef.current = null;
            }
          }

          animFrameRef.current = requestAnimationFrame(analyze);
        }

        animFrameRef.current = requestAnimationFrame(analyze);
      } catch {
        // AudioContext not available
      }
    }

    return () => {
      if (!isRecording) {
        stopAnalysis();
      }
    };
  }, [isRecording, mediaStream, stopAnalysis]);

  // When recording stops, compute and emit results
  useEffect(() => {
    if (wasRecordingRef.current && !isRecording) {
      const durationSeconds = (Date.now() - startTimeRef.current) / 1000;
      const durationMinutes = durationSeconds / 60;

      // Finalize any open silence
      if (silenceStartRef.current !== null) {
        const silenceDuration = (Date.now() - silenceStartRef.current) / 1000;
        if (silenceDuration > 0.5) {
          pauseDurationsRef.current.push(silenceDuration);
        }
        silenceStartRef.current = null;
      }

      const rmsValues = rmsHistoryRef.current;

      // Volume variation (std dev of RMS)
      let volumeVariation = 0;
      if (rmsValues.length > 0) {
        const mean = rmsValues.reduce((a, b) => a + b, 0) / rmsValues.length;
        const variance = rmsValues.reduce((a, b) => a + (b - mean) ** 2, 0) / rmsValues.length;
        volumeVariation = Math.min(1, Math.sqrt(variance));
      }

      // Pause analysis
      const pauses = pauseDurationsRef.current;
      const longPauses = pauses.filter((p) => p >= LONG_PAUSE_THRESHOLD).length;
      const avgPauseDuration =
        pauses.length > 0
          ? pauses.reduce((a, b) => a + b, 0) / pauses.length
          : 0;

      // Estimate speech rate from duration (actual text analysis done externally)
      // Use a placeholder; the session page can refine with actual transcription
      const estimatedChars = Math.round(durationMinutes * RECOMMENDED_SPEECH_RATE * 0.9);
      const speechRate = durationMinutes > 0 ? Math.round(estimatedChars / durationMinutes) : 0;

      // Filler detection placeholder (needs transcribed text)
      const fillerWords: Array<{ word: string; count: number; timestamps: number[] }> = [];
      const fillerCount = 0;
      const fillerRate = 0;

      // Overall score calculation
      const speechRateScore = speechRate >= 200 && speechRate <= 400 ? 8 : speechRate >= 150 && speechRate <= 450 ? 6 : 4;
      const fillerScore = fillerRate < 2 ? 9 : fillerRate < 5 ? 6 : 3;
      const pauseScore = longPauses <= 2 ? 8 : longPauses <= 5 ? 5 : 3;
      const volumeScore = volumeVariation >= 0.1 && volumeVariation <= 0.5 ? 8 : 5;
      const overallVoiceScore = Math.round(
        (speechRateScore * 0.3 + fillerScore * 0.25 + pauseScore * 0.2 + volumeScore * 0.25) * 10
      ) / 10;

      const feedback = generateFeedback(speechRate, fillerCount, fillerRate, { avgPauseDuration, longPauses }, volumeVariation);

      const analysis: VoiceAnalysis = {
        speechRate,
        recommendedRate: RECOMMENDED_SPEECH_RATE,
        fillerCount,
        fillerRate,
        fillerWords,
        pauseAnalysis: { avgPauseDuration: Math.round(avgPauseDuration * 10) / 10, longPauses },
        volumeVariation: Math.round(volumeVariation * 100) / 100,
        overallVoiceScore: Math.min(10, Math.max(0, overallVoiceScore)),
        feedback,
      };

      onAnalysisComplete(analysis);
      stopAnalysis();
    }
    wasRecordingRef.current = isRecording;
  }, [isRecording, onAnalysisComplete, stopAnalysis]);

  // This component renders nothing — it's an analysis engine only
  return null;
}

// Utility to refine analysis with transcribed text
export function refineWithTranscription(
  base: VoiceAnalysis,
  text: string,
  durationSeconds: number
): VoiceAnalysis {
  const durationMinutes = durationSeconds / 60;
  const charCount = text.replace(/\s/g, "").length;
  const speechRate = durationMinutes > 0 ? Math.round(charCount / durationMinutes) : 0;

  const fillerWords = detectFillers(text);
  const fillerCount = fillerWords.reduce((sum, f) => sum + f.count, 0);
  const fillerRate = durationMinutes > 0 ? Math.round((fillerCount / durationMinutes) * 10) / 10 : 0;

  const backchannelWords = detectBackchannels(text);
  const backchannelCount = backchannelWords.reduce((sum, b) => sum + b.count, 0);

  const speechRateScore = speechRate >= 200 && speechRate <= 400 ? 8 : speechRate >= 150 && speechRate <= 450 ? 6 : 4;
  const fillerScore = fillerRate < 2 ? 9 : fillerRate < 5 ? 6 : 3;
  const pauseScore = base.pauseAnalysis.longPauses <= 2 ? 8 : base.pauseAnalysis.longPauses <= 5 ? 5 : 3;
  const volumeScore = base.volumeVariation >= 0.1 && base.volumeVariation <= 0.5 ? 8 : 5;
  const overallVoiceScore = Math.round(
    (speechRateScore * 0.3 + fillerScore * 0.25 + pauseScore * 0.2 + volumeScore * 0.25) * 10
  ) / 10;

  const feedback = generateFeedback(speechRate, fillerCount, fillerRate, base.pauseAnalysis, base.volumeVariation);

  // 相槌アドバイスの生成
  let backchannelAdvice: string;
  if (backchannelCount === 0) {
    backchannelAdvice = "相槌がほとんど検出されませんでした。面接官の発言には適度に「はい」「なるほど」などで反応すると、聞いている姿勢が伝わります。";
  } else if (backchannelCount > charCount * 0.1) {
    backchannelAdvice = `相槌が${backchannelCount}回検出されました。やや多めなので、実質的な回答のボリュームを増やしましょう。`;
  } else {
    backchannelAdvice = `相槌が${backchannelCount}回検出されました。自然なコミュニケーションができています。`;
  }

  return {
    ...base,
    speechRate,
    fillerCount,
    fillerRate,
    fillerWords,
    backchannelCount,
    backchannelWords,
    overallVoiceScore: Math.min(10, Math.max(0, overallVoiceScore)),
    feedback: { ...feedback, backchannelAdvice },
  };
}
