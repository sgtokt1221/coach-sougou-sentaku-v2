"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder={placeholder} />
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
