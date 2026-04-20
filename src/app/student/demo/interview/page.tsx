"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle } from "lucide-react";
import { INTERVIEW_MOCK } from "@/components/tutorial/mockData";
import { TutorialDriver } from "@/components/tutorial/TutorialDriver";
import { DEMO_STEPS } from "@/lib/tutorial/demo-steps";

export default function DemoInterviewPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">模擬面接</h1>
        <p className="text-sm text-muted-foreground">
          AI面接官との本番形式対話 — 音声/テキスト両対応
        </p>
      </div>

      <Card data-tour="interview-chat" className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="size-4 text-indigo-500" />
            {INTERVIEW_MOCK.universityName} {INTERVIEW_MOCK.facultyName}{" "}
            ({INTERVIEW_MOCK.mode})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {INTERVIEW_MOCK.messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${
                m.role === "student" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                  m.role === "student"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {m.role === "interviewer" && (
                  <Badge variant="outline" className="mb-1 text-[10px]">
                    面接官
                  </Badge>
                )}
                <p>{m.content}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card data-tour="interview-score" className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">評価</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="shrink-0">
              <p className="text-4xl font-bold">
                {INTERVIEW_MOCK.totalScore}
                <span className="text-base font-normal text-muted-foreground">
                  /{INTERVIEW_MOCK.totalMax}
                </span>
              </p>
            </div>
            <div className="flex-1 space-y-2">
              {INTERVIEW_MOCK.scores.map((s) => (
                <div key={s.label}>
                  <div className="flex justify-between text-xs">
                    <span>{s.label}</span>
                    <span className="font-medium">
                      {s.score}/{s.max}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-indigo-500"
                      style={{ width: `${(s.score / s.max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <TutorialDriver step={DEMO_STEPS.interview} />
    </div>
  );
}
