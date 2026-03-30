"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square } from "lucide-react";

interface VoiceRecorderProps {
  onRecordingComplete: (audioBase64: string, mimeType: string) => void;
  onStreamReady?: (stream: MediaStream) => void;
  disabled?: boolean;
}

export default function VoiceRecorder({ onRecordingComplete, onStreamReady, disabled }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [supported, setSupported] = useState(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      setSupported(false);
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });
      onStreamReady?.(stream);
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1];
          onRecordingComplete(base64, mimeType);
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      // Permission denied or error
    }
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  if (!supported) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        お使いのブラウザは音声録音に対応していません。テキスト入力をご利用ください。
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      {isRecording && (
        <>
          <div className="flex items-end gap-1 h-8">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="w-1 rounded-full bg-primary animate-pulse"
                style={{
                  height: `${12 + Math.random() * 20}px`,
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: "0.6s",
                }}
              />
            ))}
          </div>
          <span className="text-sm font-mono tabular-nums text-muted-foreground">
            {mm}:{ss}
          </span>
        </>
      )}

      {isRecording ? (
        <Button variant="destructive" size="lg" onClick={stopRecording} disabled={disabled}>
          <Square className="size-4 mr-2" />
          録音停止
        </Button>
      ) : (
        <Button size="lg" onClick={startRecording} disabled={disabled}>
          <Mic className="size-4 mr-2" />
          録音開始
        </Button>
      )}
    </div>
  );
}
