"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderState =
  | "idle"
  | "requesting-permission"
  | "ready"
  | "recording"
  | "stopping"
  | "stopped"
  | "error-permission"
  | "error-unsupported";

interface UseSessionRecorderOptions {
  /** 画面マウント時に自動でマイク許可を取得するか (default: true) */
  acquireOnMount?: boolean;
  /** 録音ビットレート (default: 24000 = 24kbps) */
  audioBitsPerSecond?: number;
}

export interface UseSessionRecorderResult {
  state: RecorderState;
  durationSec: number;
  /** 直近の peak level 0-1 (波形アニメ用) */
  peakLevel: number;
  blob: Blob | null;
  sizeBytes: number;
  error: string | null;
  acquirePermission: () => Promise<boolean>;
  start: () => Promise<boolean>;
  stop: () => Promise<Blob | null>;
  reset: () => void;
}

export function useSessionRecorder(
  options: UseSessionRecorderOptions = {},
): UseSessionRecorderResult {
  const { acquireOnMount = true, audioBitsPerSecond = 24000 } = options;

  const [state, setState] = useState<RecorderState>("idle");
  const [durationSec, setDurationSec] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [sizeBytes, setSizeBytes] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [peakLevel, setPeakLevel] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startTimestampRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const analyserRafRef = useRef<number | null>(null);

  const stopMeter = useCallback(() => {
    if (analyserRafRef.current !== null) {
      cancelAnimationFrame(analyserRafRef.current);
      analyserRafRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setPeakLevel(0);
  }, []);

  const startMeter = useCallback((stream: MediaStream) => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (let i = 0; i < data.length; i++) {
          const v = Math.abs(data[i] - 128) / 128;
          if (v > peak) peak = v;
        }
        setPeakLevel(peak);
        analyserRafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (err) {
      console.warn("[recorder] meter init failed:", err);
    }
  }, []);

  const acquirePermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      setState("error-unsupported");
      setError("このブラウザは録音に対応していません");
      return false;
    }
    setState("requesting-permission");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      setState("ready");
      return true;
    } catch (err) {
      console.warn("[recorder] getUserMedia failed:", err);
      setState("error-permission");
      setError(
        err instanceof Error
          ? err.message
          : "マイクへのアクセスが拒否されました",
      );
      return false;
    }
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    if (state === "recording") return true;
    if (!streamRef.current) {
      const ok = await acquirePermission();
      if (!ok) return false;
    }
    const stream = streamRef.current;
    if (!stream) return false;

    chunksRef.current = [];
    setBlob(null);
    setSizeBytes(0);
    setDurationSec(0);

    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
        audioBitsPerSecond,
      });
    } catch {
      rec = new MediaRecorder(stream, { audioBitsPerSecond });
    }
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.start(1000);
    recorderRef.current = rec;
    startTimestampRef.current = Date.now();

    timerRef.current = window.setInterval(() => {
      setDurationSec(
        Math.floor((Date.now() - startTimestampRef.current) / 1000),
      );
    }, 500);

    startMeter(stream);
    setState("recording");
    return true;
  }, [state, audioBitsPerSecond, acquirePermission, startMeter]);

  const stop = useCallback(async (): Promise<Blob | null> => {
    const rec = recorderRef.current;
    if (!rec || state !== "recording") return null;
    setState("stopping");

    return new Promise<Blob | null>((resolve) => {
      rec.onstop = () => {
        if (timerRef.current !== null) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        stopMeter();
        const type = rec.mimeType || "audio/webm";
        const final = new Blob(chunksRef.current, { type });
        setBlob(final);
        setSizeBytes(final.size);
        setDurationSec(
          Math.floor((Date.now() - startTimestampRef.current) / 1000),
        );
        setState("stopped");
        resolve(final);
      };
      try {
        rec.stop();
      } catch {
        resolve(null);
      }
    });
  }, [state, stopMeter]);

  const reset = useCallback(() => {
    setBlob(null);
    setSizeBytes(0);
    setDurationSec(0);
    setError(null);
    chunksRef.current = [];
    if (streamRef.current) {
      setState("ready");
    } else {
      setState("idle");
    }
  }, []);

  // cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
      stopMeter();
      if (recorderRef.current && recorderRef.current.state === "recording") {
        try {
          recorderRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [stopMeter]);

  // auto-acquire on mount
  useEffect(() => {
    if (!acquireOnMount) return;
    acquirePermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // beforeunload 警告
  useEffect(() => {
    if (state !== "recording") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "録音中です。ページを閉じると録音が失われます。";
      return e.returnValue;
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [state]);

  return {
    state,
    durationSec,
    peakLevel,
    blob,
    sizeBytes,
    error,
    acquirePermission,
    start,
    stop,
    reset,
  };
}
