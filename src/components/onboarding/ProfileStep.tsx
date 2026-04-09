"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import type { EnglishCert } from "@/lib/types/user";

const CERT_TYPES: { value: EnglishCert["type"]; label: string }[] = [
  { value: "EIKEN", label: "英検" },
  { value: "TOEIC", label: "TOEIC" },
  { value: "TOEFL", label: "TOEFL" },
  { value: "IELTS", label: "IELTS" },
  { value: "TEAP", label: "TEAP" },
  { value: "GTEC", label: "GTEC" },
  { value: "OTHER", label: "その他" },
];

const EIKEN_GRADES = [
  "1級",
  "準1級",
  "2級",
  "準2級",
  "3級",
  "4級",
  "5級",
];

const SCORE_PLACEHOLDERS: Partial<Record<EnglishCert["type"], string>> = {
  TOEIC: "例: 730",
  TOEFL: "例: 80",
  IELTS: "例: 6.5",
  TEAP: "例: 300",
  GTEC: "例: 1100",
  OTHER: "資格名とスコア",
};

export interface ProfileData {
  gpa: number | null;
  englishCerts: EnglishCert[];
  grade: number | null;
  school: string;
}

interface Props {
  data: ProfileData;
  onChange: (data: ProfileData) => void;
}

export function ProfileStep({ data, onChange }: Props) {
  const [certType, setCertType] = useState<EnglishCert["type"]>("EIKEN");
  const [certScore, setCertScore] = useState("");

  const addCert = () => {
    if (!certScore.trim()) return;
    const newCert: EnglishCert = {
      type: certType,
      score: certScore.trim(),
    };
    onChange({ ...data, englishCerts: [...data.englishCerts, newCert] });
    setCertScore("");
  };

  const removeCert = (index: number) => {
    onChange({
      ...data,
      englishCerts: data.englishCerts.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      {/* Grade */}
      <div className="space-y-2">
        <Label>学年</Label>
        <Select
          value={data.grade ? String(data.grade) : ""}
          onValueChange={(v) =>
            onChange({ ...data, grade: v ? Number(v) : null })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="学年を選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">高校1年</SelectItem>
            <SelectItem value="2">高校2年</SelectItem>
            <SelectItem value="3">高校3年</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* School */}
      <div className="space-y-2">
        <Label>高校名</Label>
        <Input
          placeholder="例: 開成高等学校"
          value={data.school}
          onChange={(e) => onChange({ ...data, school: e.target.value })}
        />
      </div>

      {/* GPA */}
      <div className="space-y-2">
        <Label>評定平均（GPA）</Label>
        <Input
          type="number"
          min={0}
          max={5}
          step={0.1}
          placeholder="例: 4.2"
          value={data.gpa ?? ""}
          onChange={(e) =>
            onChange({
              ...data,
              gpa: e.target.value ? Number(e.target.value) : null,
            })
          }
        />
        <p className="text-xs text-muted-foreground">0.0〜5.0（任意）</p>
      </div>

      {/* English Certs */}
      <div className="space-y-2">
        <Label>英語資格</Label>

        {data.englishCerts.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {data.englishCerts.map((cert, i) => (
              <Badge key={i} variant="secondary" className="gap-1 pl-2.5 pr-1.5 py-1">
                {CERT_TYPES.find((t) => t.value === cert.type)?.label}{" "}
                {cert.score}
                <button
                  type="button"
                  onClick={() => removeCert(i)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Select
            value={certType}
            onValueChange={(v) => {
              setCertType(v as EnglishCert["type"]);
              setCertScore("");
            }}
          >
            <SelectTrigger className="w-28">
              <SelectValue>{CERT_TYPES.find((t) => t.value === certType)?.label ?? certType}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {CERT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {certType === "EIKEN" ? (
            <Select
              value={certScore}
              onValueChange={(v) => {
                if (!v) return;
                const newCert: EnglishCert = { type: "EIKEN", score: v };
                onChange({ ...data, englishCerts: [...data.englishCerts, newCert] });
              }}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="級を選択" />
              </SelectTrigger>
              <SelectContent>
                {EIKEN_GRADES.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <>
              <Input
                placeholder={SCORE_PLACEHOLDERS[certType] ?? "スコア / 級"}
                value={certScore}
                onChange={(e) => setCertScore(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCert();
                  }
                }}
              />
              <Button type="button" variant="outline" size="icon" onClick={addCert}>
                <Plus className="size-4" />
              </Button>
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground">任意・複数追加可</p>
      </div>
    </div>
  );
}
