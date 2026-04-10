"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}

export function CopyButton({ text, label, className, size = "sm" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(label ? `${label}をコピーしました` : "コピーしました");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("コピーに失敗しました");
    }
  };

  const iconSize = size === "sm" ? "size-3.5" : "size-4";

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
        className,
      )}
      aria-label={label ?? "コピー"}
    >
      {copied ? <Check className={iconSize} /> : <Copy className={iconSize} />}
      {label && <span>{label}</span>}
    </button>
  );
}
