"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/api/client";
import AppearanceReport from "@/components/interview/AppearanceReport";
import type { AppearanceAnalysis } from "@/lib/types/interview";
import { Camera, CameraOff, Loader2, RefreshCw, Play, ArrowRight } from "lucide-react";

interface InterviewPreflightProps {
  /** 面接を開始する（カメラあり/なし問わず最終的にここを呼ぶ） */
  onStart: () => void;
}

type CamStatus = "checking" | "ready" | "denied" | "unsupported";

/** 撮影フレームの最大幅（身だしなみ判定の精度確保のため従来の320pxより大きく） */
const CAPTURE_MAX_WIDTH = 900;

/**
 * 面接開始前の身だしなみチェック（プリフライト）。
 * 1) カメラが使えるか確認 → 2) 使えるならプレビュー＋静止画で身だしなみ判定 →
 * 3) 直して撮り直し可 → 「この身だしなみで面接を始める」。
 * カメラが使えない/拒否された場合は理由を示し「カメラなしで面接を始める」で続行。
 */
export default function InterviewPreflight({ onStart }: InterviewPreflightProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camStatus, setCamStatus] = useState<CamStatus>("checking");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<AppearanceAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  // マウント時にカメラ取得を試みる（プレビュー＆静止画チェック用の高解像度）
  useEffect(() => {
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamStatus("unsupported");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = s;
        // video 要素は camStatus==="ready" で初めて描画されるため、接続は下の effect で行う
        setCamStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setCamStatus("denied");
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // video 要素がマウントされたらストリームを接続して再生
  useEffect(() => {
    if (camStatus === "ready" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [camStatus]);

  const runCheck = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setChecking(true);
    setError(null);
    try {
      const scale = Math.min(1, CAPTURE_MAX_WIDTH / video.videoWidth);
      const w = Math.round(video.videoWidth * scale);
      const h = Math.round(video.videoHeight * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);
      const imageBase64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];

      const res = await authFetch("/api/interview/appearance-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType: "image/jpeg" }),
      });
      if (!res.ok) {
        setError("身だしなみチェックに失敗しました。そのまま面接を始めることもできます。");
        return;
      }
      const analysis: AppearanceAnalysis = await res.json();
      setResult(analysis);
    } catch {
      setError("身だしなみチェックに失敗しました。そのまま面接を始めることもできます。");
    } finally {
      setChecking(false);
    }
  }, []);

  const cameraUsable = camStatus === "ready";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-lg max-h-full overflow-y-auto">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Camera className="size-4" />
          面接前の身だしなみチェック
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          本番同様、面接前に身だしなみを整えましょう。カメラで一度確認できます。
        </p>

        {/* カメラ確認中 */}
        {camStatus === "checking" && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            カメラを確認しています...
          </div>
        )}

        {/* カメラ利用不可（未対応 or 拒否） */}
        {(camStatus === "denied" || camStatus === "unsupported") && (
          <div className="mt-4 space-y-3">
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 text-amber-700 dark:text-amber-300">
              <CameraOff className="size-4 mt-0.5 shrink-0" />
              <p className="text-sm">
                {camStatus === "unsupported"
                  ? "この端末・ブラウザではカメラを利用できません。"
                  : "カメラを利用できませんでした（未許可、または他アプリが使用中）。"}
                <br />
                身だしなみチェックはスキップして、音声のみで面接を始められます。
              </p>
            </div>
            <Button className="w-full gap-1" onClick={onStart}>
              カメラなしで面接を始める
              <ArrowRight className="size-4" />
            </Button>
          </div>
        )}

        {/* カメラ利用可 */}
        {cameraUsable && (
          <div className="mt-4 space-y-3">
            <div className="overflow-hidden rounded-lg border bg-black aspect-video">
              {/* 自分視点なので左右反転表示（鏡像）の方が直感的 */}
              <video
                ref={videoRef}
                muted
                playsInline
                className="h-full w-full object-cover -scale-x-100"
              />
            </div>

            {result ? (
              <>
                <AppearanceReport analysis={result} />
                {error && <p className="text-xs text-rose-600">{error}</p>}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 gap-1" onClick={runCheck} disabled={checking}>
                    {checking ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                    直して撮り直す
                  </Button>
                  <Button className="flex-1 gap-1" onClick={onStart}>
                    この身だしなみで始める
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                {error && <p className="text-xs text-rose-600">{error}</p>}
                <Button className="w-full gap-1" onClick={runCheck} disabled={checking}>
                  {checking ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                  {checking ? "チェック中..." : "身だしなみをチェック"}
                </Button>
                <button
                  type="button"
                  onClick={onStart}
                  className="flex w-full items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Play className="size-3" />
                  チェックせず面接を始める
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
