"use client";

import Link from "next/link";
import { Video } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSessionCall } from "@/lib/hooks/useSessionCall";

/**
 * そのセッションで通話が始まっていたら「参加」を出す。
 *
 * 生徒は通話を発信できない（管理者・講師だけ）。着信モーダルは出るが、
 * あとから画面を開いた場合は消えているので、ここからも入れるようにする。
 * 通話が無いときは何も出さない。
 */
export function JoinSessionCallButton({ sessionId }: { sessionId: string }) {
  const { user } = useAuth();
  const call = useSessionCall(user?.uid, sessionId);

  if (!call) return null;

  return (
    <Link
      href={`/call/${call.id}`}
      className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium hover:opacity-90"
    >
      <Video className="size-4" />
      通話に参加
    </Link>
  );
}
