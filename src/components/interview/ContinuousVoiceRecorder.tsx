"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";

interface ContinuousVoiceRecorderProps {
  onRecordingComplete: (audioBase64: string, mimeType: string) => void;
  onStreamReady?: (stream: MediaStream) => void;
  onInterrupt?: () => void;
  disabled?: boolean;
  aiSpeaking?: boolean;
}

const SILENCE_THRESHOLD = 0.01;
const SILENCE_DURATION_MS = 2000;
const MIN_SPEECH_MS = 600;
const MIN_BLOB_SIZE = 5000;

export default function ContinuousVoiceRecorder({
  onRecordingComplete,
  onStreamReady,
  onInterrupt,
  disabled,
  aiSpeaking,
}: ContinuousVoiceRecorderProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [status, setStatus] = useState<"idle" | "listening" | "speaking" | "processing" | "ai">("idle");

  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const allChunksRef = useRef<Blob[]>([]);
  const silenceStartRef = useRef<number | null>(null);
  const speechStartRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const isListeningRef = useRef(false);
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
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);

  useEffect(() => {
    if (!navigator.mediaDevices || !window.MediaRecorder) setSupported(false);
  }, []);

  // Send collected audio to Whisper
  function sendAudio() {
    if (isSendingRef.current) return;
    const chunks = [...allChunksRef.current];
    allChunksRef.current = [];
    if (chunks.length === 0) return;

    const blob = new Blob(chunks, { type: mimeTypeRef.current });
    console.log("[VoiceRecorder] Sending audio:", blob.size, "bytes");
    if (blob.size < MIN_BLOB_SIZE) {
      console.log("[VoiceRecorder] Skipping small audio");
      return;
    }

    isSendingRef.current = true;
    setStatus("processing");
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(",")[1];
      onRecordingCompleteRef.current(base64, mimeTypeRef.current);
      isSendingRef.current = false;
      setStatus("listening");
    };
    reader.readAsDataURL(blob);
  }

  // Audio level monitoring + VAD
  function startMonitoring() {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const dataArray = new Float32Array(analyser.fftSize);

    function check() {
      if (!analyserRef.current || !isListeningRef.current) return;
      analyserRef.current.getFloatTimeDomainData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i];
      const rms = Math.sqrt(sum / dataArray.length);
      const now = Date.now();
      setAudioLevel(Math.min(1, rms * 15));

      // Interrupt detection during AI speech
      if (aiSpeakingRef.current) {
        if (rms > 0.02) {
          if (!speechStartRef.current) speechStartRef.current = now;
          if (now - speechStartRef.current > 300) {
            onInterruptRef.current?.();
            speechStartRef.current = null;
          }
        } else {
          speechStartRef.current = null;
        }
        rafRef.current = requestAnimationFrame(check);
        return;
      }

      if (rms > SILENCE_THRESHOLD) {
        silenceStartRef.current = null;
        if (!speechStartRef.current) speechStartRef.current = now;
        setIsSpeaking(true);
        if (!isSendingRef.current) setStatus("speaking");
      } else {
        if (speechStartRef.current && !silenceStartRef.current) {
          silenceStartRef.current = now;
        }
        if (
          silenceStartRef.current &&
          speechStartRef.current &&
          now - silenceStartRef.current >= SILENCE_DURATION_MS &&
          now - speechStartRef.current >= MIN_SPEECH_MS
        ) {
          // End of speech detected
          setIsSpeaking(false);
          speechStartRef.current = null;
          silenceStartRef.current = null;
          sendAudio();
        }
        if (!speechStartRef.current) {
          setIsSpeaking(false);
          if (!isSendingRef.current) setStatus("listening");
        }
      }
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
  }

  function startRecorder() {
    const stream = streamRef.current;
    if (!stream) return;

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    mimeTypeRef.current = mimeType;

    const recorder = new MediaRecorder(stream, { mimeType });
    allChunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) allChunksRef.current.push(e.data);
    };

    mediaRecorderRef.current = recorder;
    // Collect data every 250ms for smooth chunking
    recorder.start(250);
  }

  // Handle AI speaking state changes
  useEffect(() => {
    if (!isListening) return;
    if (aiSpeaking) {
      setStatus("ai");
      // Pause recorder but keep monitoring for interrupt
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.pause();
      }
    } else {
      setStatus("listening");
      // Resume after AI finishes
      if (mediaRecorderRef.current?.state === "paused") {
        // Discard any chunks from during AI speech
        allChunksRef.current = [];
        mediaRecorderRef.current.resume();
        speechStartRef.current = null;
        silenceStartRef.current = null;
      }
    }
  }, [aiSpeaking, isListening]);

  const startListening = useCallback(async () => {
    try {
      await acquireMic();
      setIsListening(true);
      setStatus("listening");
      startRecorder();
      startMonitoring();
    } catch {
      // Permission denied
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopListening = useCallback(() => {
    setIsListening(false);
    setIsSpeaking(false);
    setAudioLevel(0);

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (mediaRecorderRef.current?.state !== "inactive") {
      try { mediaRecorderRef.current?.stop(); } catch { /* */ }
    }
    // Send any remaining audio
    if (allChunksRef.current.length > 0) sendAudio();

    if (audioContextRef.current?.state !== "closed") {
      audioContextRef.current?.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => stopListening(), [stopListening]);

  if (!supported) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        お使いのブラウザは音声録音に対応していません。
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 py-3">
      {isListening ? (
        <>
          <button
            onClick={stopListening}
            disabled={disabled}
            className={`relative flex items-center justify-center w-16 h-16 rounded-full shadow-lg transition-transform hover:scale-105 ${
              status === "processing"
                ? "bg-amber-500 text-white"
                : status === "ai"
                  ? "bg-muted text-muted-foreground"
                  : "bg-primary text-primary-foreground"
            }`}
          >
            {status === "speaking" && (
              <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
            )}
            {status === "processing" && (
              <span className="absolute inset-0 rounded-full bg-amber-500/30 animate-pulse" />
            )}
            <Mic className="size-6 relative z-10" />
          </button>
          <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                status === "processing" ? "bg-amber-500" : "bg-primary"
              }`}
              style={{ width: `${audioLevel * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {status === "ai"
              ? "面接官が話しています..."
              : status === "processing"
                ? "認識中..."
                : status === "speaking"
                  ? "聞き取り中..."
                  : "話してください"}
          </p>
        </>
      ) : (
        <>
          <button
            onClick={startListening}
            disabled={disabled}
            className="flex items-center justify-center w-16 h-16 rounded-full bg-muted text-muted-foreground shadow transition-transform hover:scale-105 hover:bg-primary hover:text-primary-foreground"
          >
            <MicOff className="size-6" />
          </button>
          <p className="text-xs text-muted-foreground">タップして面接開始</p>
        </>
      )}
    </div>
  );
}
