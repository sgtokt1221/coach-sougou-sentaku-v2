"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CUSTOM_DOCUMENT_TYPE,
  CUSTOM_NAME_MAX,
  QUESTION_MAX,
} from "@/lib/documents/kind";

/**
 * 書類の名前（独自の書類だけ）と募集要項の設問を直す欄。折りたたんで置く。
 * AIの下書き・添削・書き分けは、ここに入れた設問に沿って行う。
 */
export function DocumentBriefEditor({
  type,
  customName,
  question,
  onSave,
}: {
  type: string;
  customName?: string;
  question?: string;
  /** 保存できたら true */
  onSave: (patch: { customName?: string; question: string }) => Promise<boolean>;
}) {
  const isCustom = type === CUSTOM_DOCUMENT_TYPE;
  const [name, setName] = useState(customName ?? "");
  const [text, setText] = useState(question ?? "");
  const [saving, setSaving] = useState(false);
  const dirty =
    text.trim() !== (question ?? "").trim() ||
    (isCustom && name.trim() !== (customName ?? "").trim());
  const invalid = isCustom && (!name.trim() || !text.trim());

  async function save() {
    setSaving(true);
    const ok = await onSave({
      ...(isCustom ? { customName: name.trim() } : {}),
      question: text.trim(),
    });
    setSaving(false);
    if (!ok) {
      setName(customName ?? "");
      setText(question ?? "");
    }
  }

  return (
    <details className="bg-muted rounded-xl px-4 py-3 sm:px-6" open={isCustom && !question}>
      <summary className="min-h-11 cursor-pointer content-center text-sm font-bold">
        {isCustom ? "書類の名前と設問" : "募集要項の設問"}
        {question?.trim() && (
          <span className="text-muted-foreground ml-2 font-normal">
            {question.trim().slice(0, 40)}
            {question.trim().length > 40 ? "…" : ""}
          </span>
        )}
      </summary>
      <div className="space-y-3 pt-2 pb-1">
        {isCustom && (
          <div className="space-y-1.5">
            <Label htmlFor="brief-name">書類の名前</Label>
            <Input
              id="brief-name"
              value={name}
              maxLength={CUSTOM_NAME_MAX}
              onChange={(e) => setName(e.target.value)}
              className="bg-card h-11 text-base md:text-base"
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="brief-question">募集要項の設問</Label>
          <Textarea
            id="brief-question"
            value={text}
            maxLength={QUESTION_MAX}
            rows={3}
            onChange={(e) => setText(e.target.value)}
            className="bg-card text-base md:text-base"
          />
        </div>
        <Button
          type="button"
          className="min-h-11"
          disabled={!dirty || invalid || saving}
          onClick={() => void save()}
        >
          保存
        </Button>
      </div>
    </details>
  );
}
