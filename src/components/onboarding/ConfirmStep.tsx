"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, User } from "lucide-react";
import type { ProfileData } from "./ProfileStep";
import type { University } from "@/lib/types/university";
import { useEffect, useState } from "react";

const CERT_LABELS: Record<string, string> = {
  EIKEN: "英検",
  TOEIC: "TOEIC",
  TOEFL: "TOEFL",
  IELTS: "IELTS",
  TEAP: "TEAP",
  GTEC: "GTEC",
  OTHER: "その他",
};

interface Props {
  selectedUniversities: string[];
  profileData: ProfileData;
}

interface ResolvedItem {
  universityName: string;
  facultyName: string;
}

export function ConfirmStep({ selectedUniversities, profileData }: Props) {
  const [resolved, setResolved] = useState<ResolvedItem[]>([]);

  useEffect(() => {
    if (selectedUniversities.length === 0) return;
    async function resolve() {
      try {
        const res = await fetch(
          `/api/universities/resolve?ids=${selectedUniversities.join(",")}`
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        setResolved(
          (data.resolved ?? []).map((r: ResolvedItem) => ({
            universityName: r.universityName,
            facultyName: r.facultyName,
          }))
        );
      } catch {
        setResolved(
          selectedUniversities.map((id) => ({
            universityName: id.split(":")[0],
            facultyName: id.split(":")[1] ?? "",
          }))
        );
      }
    }
    resolve();
  }, [selectedUniversities]);

  return (
    <div className="space-y-6">
      {/* Universities */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className="size-5 text-primary" />
            <h3 className="font-medium">志望校</h3>
          </div>
          <div className="space-y-2">
            {resolved.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg border px-3 py-2"
              >
                <span className="text-sm font-medium">
                  {item.universityName}
                </span>
                <Badge variant="outline" className="text-xs">
                  {item.facultyName}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Profile */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="size-5 text-primary" />
            <h3 className="font-medium">基礎情報</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">学年</p>
              <p className="font-medium">
                {profileData.grade ? `高校${profileData.grade}年` : "未設定"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">高校名</p>
              <p className="font-medium">
                {profileData.school || "未設定"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">評定平均</p>
              <p className="font-medium">
                {profileData.gpa != null ? profileData.gpa.toFixed(1) : "未設定"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">英語資格</p>
              {profileData.englishCerts.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {profileData.englishCerts.map((cert, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">
                      {CERT_LABELS[cert.type]} {cert.score}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="font-medium">未設定</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
