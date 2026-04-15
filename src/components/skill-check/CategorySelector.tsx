"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { ChevronDownIcon } from "lucide-react";
import {
  ACADEMIC_CATEGORIES,
  ACADEMIC_CATEGORY_LABELS,
  type AcademicCategory,
} from "@/lib/types/skill-check";

interface Props {
  value: AcademicCategory | null;
  onChange: (v: AcademicCategory) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * 系統セレクタ。base-ui の SelectValue が value 文字列を表示してしまう問題を回避するため、
 * SelectTrigger 内で直接日本語ラベルを描画する。
 */
export function CategorySelector({
  value,
  onChange,
  disabled,
  placeholder = "系統を選択",
}: Props) {
  return (
    <Select
      value={value ?? undefined}
      onValueChange={(v) => onChange(v as AcademicCategory)}
      disabled={disabled}
    >
      <SelectTrigger className="w-[220px] [&_svg.icon-chev]:hidden">
        <span className="flex-1 text-left truncate">
          {value ? (
            ACADEMIC_CATEGORY_LABELS[value]
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronDownIcon className="size-4 text-muted-foreground" />
      </SelectTrigger>
      <SelectContent>
        {ACADEMIC_CATEGORIES.map((c) => (
          <SelectItem key={c} value={c}>
            {ACADEMIC_CATEGORY_LABELS[c]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
