"use client";

import { Undo2, Redo2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * 本文入力の「ひとつ戻る／進む」。
 * AIの書き換え後でも直前の状態へ戻せるようにするために置く。
 */
export function UndoRedoButtons({
  undo,
  redo,
  canUndo,
  canRedo,
}: {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1 px-2"
        onClick={undo}
        disabled={!canUndo}
        title="ひとつ戻る"
      >
        <Undo2 className="size-3.5" />
        戻る
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1 px-2"
        onClick={redo}
        disabled={!canRedo}
        title="ひとつ進む"
      >
        <Redo2 className="size-3.5" />
        進む
      </Button>
    </div>
  );
}
