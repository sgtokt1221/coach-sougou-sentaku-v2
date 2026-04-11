"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";

interface ContinuousVoiceRecorderProps {
  onRecordingComplete: (audioBase64: string, mimeType: string) => void;
  onStreamReady?: (stream: MediaStream) => void;
  onInterrupt?: () => void;
  disabled?: boolean;
  aiSpeaking?: boolean;
  autoStart?: boolean;
}

const MIN_BLOB_SIZE = 3000;

export default function ContinuousVoiceRecorder({
  onRecordingComplete,
  onStreamReady,
  onInterrupt,
  disabled,
  aiSpeaking,
  autoStart,
}: ContinuousVoiceRecorderProps) {
  const [micReady, setMicReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [supported, setSupported] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [status, setStatus] = useState<"idle" | "ready" | "recording" | "processing" | "ai">("idle");

  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const allChunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number | null>(null);
  const isSendingRef = useRef(false);
  const selectedDeviceIdRef = useRef<string | undefined>(undefined);
  const onRecordingCompleteRef = useRef(onRecordingComplete);
  const onStreamReadyRef = useRef(onStreamReady);
  const onInterruptRef = useRef(onInterrupt);
  const aiSpeakingRef = useRef(aiSpeaking);
  const mimeTypeRef = useRef("audio/webm");

  useEffect(() => { onRecordingCompleteRef.current = onRecordingComplete; }, [onRecordingComplete]);
  useEffect(() => { onStreamReadyRef.current = onStreamReady; }, [onStreamReady]);
  useEffect(() => { onInterruptRef.current = onInterrupt; }, [onInterrupt]);
  useEffect(() => { aiSpeakingRef.current = aiSpeaking; }, [aiSpeaking]);

  useEffect(() => {
    if (!navigator.mediaDevices || !window.MediaRecorder) setSupported(false);
  }, []);

  function sendAudio() {
    if (isSendingRef.current) return;
    const chunks = [...allChunksRef.current];
    allChunksRef.current = [];
    if (chunks.length === 0) return;

    const blob = new Blob(chunks, { type: mimeTypeRef.current });
    if (blob.size < MIN_BLOB_SIZE) return;

    isSendingRef.current = true;
    setStatus("processing");
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(",")[1];
      onRecordingCompleteRef.current(base64, mimeTypeRef.current);
      isSendingRef.current = false;
      setStatus("ready");
    };
    reader.readAsDataURL(blob);
  }

  // Audio level monitoring (visual only, no VAD trigger)
  function startMonitoring() {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const dataArray = new Float32Array(analyser.fftSize);

    function check() {
      if (!analyserRef.current) return;
      analyserRef.current.getFloatTimeDomainData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i];
      const rms = Math.sqrt(sum / dataArray.length);
      setAudioLevel(Math.min(1, rms * 15));

      rafRef.current = requestAnimationFrame(check);
    }
    rafRef.current = requestAnimationFrame(check);
  }

  async function acquireMic() {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: selectedDeviceIdRef.current ? { exact: selectedDeviceIdRef.current } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    streamRef.current = stream;
    onStreamReadyRef.current?.(stream);

    const track = stream.getAudioTracks()[0];
    if (track) selectedDeviceIdRef.current = track.getSettings()?.deviceId;

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
    }
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    mimeTypeRef.current = mimeType;
  }

  // Initialize mic on first load
  const initMic = useCallback(async () => {
    try {
      await acquireMic();
      setMicReady(true);
      setStatus("ready");
      startMonitoring();
    } catch {
      // Permission denied
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // PTT: Start recording on press
  const startRecording = useCallback(() => {
    if (!micReady || disabled || isSendingRef.current) return;
    const stream = streamRef.current;
    if (!stream) return;

    // AI 発話中にボタンを押したら割り込んで発言開始
    if (aiSpeaking) {
      onInterruptRef.current?.();
    }

    allChunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: mimeTypeRef.current });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) allChunksRef.current.push(e.data);
    };
    mediaRecorderRef.current = recorder;
    recorder.start(250);
    setIsRecording(true);
    setStatus("recording");
  }, [micReady, disabled, aiSpeaking]);

  // PTT: Stop recording on release and send
  const stopRecording = useCallback(() => {
    if (!isRecording) return;
    setIsRecording(false);

    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
    // Small delay to ensure last chunk is collected
    setTimeout(() => sendAudio(), 100);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  // Handle AI speaking state
  useEffect(() => {
    if (aiSpeaking) {
      setStatus("ai");
    } else if (micReady && !isSendingRef.current) {
      setStatus("ready");
    }
  }, [aiSpeaking, micReady]);

  // Auto-start mic on mount
  useEffect(() => {
    if (autoStart && !micReady && supported) {
      initMic();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (mediaRecorderRef.current?.state !== "inactive") {
        try { mediaRecorderRef.current?.stop(); } catch { /* */ }
      }
      if (audioContextRef.current?.state !== "closed") {
        audioContextRef.current?.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  if (!supported) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        お使いのブラウザは音声録音に対応していません。
      </p>
    );
  }

  const buttonDisabled = disabled || status === "processing";
  const isAiTurn = status === "ai";

  return (
    <div className="flex flex-col items-center gap-2 py-3">
      {!micReady ? (
        <>
          <button
            onClick={initMic}
            disabled={disabled}
            className="flex items-center justify-center w-16 h-16 rounded-full bg-muted text-muted-foreground shadow transition-transform hover:scale-105 hover:bg-primary hover:text-primary-foreground"
          >
            <MicOff className="size-6" />
          </button>
          <p className="text-xs text-muted-foreground">タップしてマイクを有効化</p>
        </>
      ) : (
        <>
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={isRecording ? stopRecording : undefined}
            onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
            onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
            disabled={buttonDisabled}
            className={`relative flex items-center justify-center w-20 h-20 rounded-full shadow-lg transition-all select-none touch-none ${
              isRecording
                ? "bg-red-500 text-white scale-110"
                : isAiTurn
                  ? "bg-muted text-muted-foreground"
                  : status === "processing"
                    ? "bg-amber-500 text-white"
                    : "bg-primary text-primary-foreground hover:scale-105"
            }`}
          >
            {isRecording && (
              <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
            )}
            {status === "processing" && (
              <span className="absolute inset-0 rounded-full bg-amber-500/30 animate-pulse" />
            )}
            <Mic className="size-7 relative z-10" />
          </button>

          {/* Audio level bar */}
          <div className="w-36 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                isRecording ? "bg-red-500" : status === "processing" ? "bg-amber-500" : "bg-primary"
              }`}
              style={{ width: `${audioLevel * 100}%` }}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {isAiTurn
              ? "面接官が話しています(長押しで割り込み可)"
              : status === "processing"
                ? "認識中..."
                : isRecording
                  ? "話してください..."
                  : "長押しで発言"}
          </p>
        </>
      )}
    </div>
  );
}
