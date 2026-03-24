"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface CameraPreviewProps {
  mediaStream: MediaStream | null;
}

export default function CameraPreview({ mediaStream }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

  if (!visible || !mediaStream) return null;

  return (
    <div className="fixed bottom-24 right-4 z-50">
      <div className="relative w-[120px] h-[90px] rounded-lg overflow-hidden border-2 border-white/50 shadow-lg bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />
        {/* Green dot indicator */}
        <div className="absolute top-1.5 left-1.5 size-2 rounded-full bg-green-500 animate-pulse" />
        {/* Close button */}
        <button
          onClick={() => setVisible(false)}
          className="absolute top-1 right-1 size-5 flex items-center justify-center rounded-full bg-black/50 text-white/80 hover:text-white transition-colors"
          aria-label="プレビューを閉じる"
        >
          <X className="size-3" />
        </button>
      </div>
    </div>
  );
}
