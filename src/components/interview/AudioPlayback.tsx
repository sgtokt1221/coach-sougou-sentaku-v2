"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";

interface AudioPlaybackProps {
  src: string;
  label?: string;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function AudioPlayback({ src, label }: AudioPlaybackProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => setPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  }, [playing]);

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      if (!audio || !duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audio.currentTime = ratio * duration;
    },
    [duration]
  );

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-2 w-full">
      <audio ref={audioRef} src={src} preload="metadata" />
      <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={togglePlay}>
        {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
      </Button>
      {label && <span className="text-xs text-muted-foreground shrink-0">{label}</span>}
      <div
        className="flex-1 h-1.5 bg-muted rounded-full cursor-pointer relative"
        onClick={handleSeek}
      >
        <div
          className="absolute inset-y-0 left-0 bg-primary rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs font-mono tabular-nums text-muted-foreground shrink-0">
        {formatTime(currentTime)}/{formatTime(duration)}
      </span>
    </div>
  );
}
