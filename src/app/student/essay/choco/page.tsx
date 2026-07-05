"use client";

import { useMemo, useState } from "react";
import { authFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { ManuscriptEditor } from "@/components/essay/ManuscriptEditor";
import { ChocoPassagePanel } from "@/components/essay/ChocoPassagePanel";
import { ChocoResultView } from "@/components/essay/ChocoResultView";
import { CHOCO_FACULTIES, getChocoPassagesByFaculty, ALL_CHOCO_PASSAGES } from "@/data/choco-passages";
import type { ChocoPassage, ChocoScores, ChocoFeedback, ChocoRole } from "@/lib/types/choco";

type Result = {
  scores: ChocoScores;
  feedback: ChocoFeedback;
  modelText: string;
  keyPoints: string[];
  role: ChocoRole;
  blankIndex: number;
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function ChocoPage() {
  const [facultyKey, setFacultyKey] = useState(CHOCO_FACULTIES[0].key);
  const [passage, setPassage] = useState<ChocoPassage | null>(null);
  const [blankIndex, setBlankIndex] = useState(0);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const candidates = useMemo(() => {
    const byFaculty = getChocoPassagesByFaculty(facultyKey);
    return byFaculty.length > 0 ? byFaculty : ALL_CHOCO_PASSAGES;
  }, [facultyKey]);

  function startNew() {
    const p = pickRandom(candidates);
    setPassage(p);
    setBlankIndex(Math.floor(Math.random() * p.paragraphs.length));
    setText("");
    setResult(null);
    setError(null);
  }

  async function submit() {
    if (!passage) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/essay/choco-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passageId: passage.id, blankIndex, studentText: text }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "添削に失敗しました");
      }
      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "添削に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  if (result && passage) {
    return (
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <h1 className="text-lg font-bold">ちょこ添削の結果</h1>
        <ChocoResultView {...result} />
        <div className="flex gap-2"><Button onClick={startNew}>もう一問やる</Button></div>
      </div>
    );
  }

  if (passage) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="lg:grid lg:grid-cols-[minmax(22rem,28rem)_minmax(0,1fr)] lg:gap-6 lg:items-start">
          <ChocoPassagePanel paragraphs={passage.paragraphs} blankIndex={blankIndex} sticky />
          <div className="lg:min-w-0 space-y-3 mt-4 lg:mt-0">
            <p className="text-sm text-muted-foreground">
              左の本文の空欄（{passage.paragraphs.length}段落中 {blankIndex + 1}段落目）を書いてみよう。
            </p>
            <ManuscriptEditor value={text} onChange={setText} maxLength={300} placeholder="この段落を書いてみよう..." />
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={submit} disabled={loading || text.trim().length < 20}>
                {loading ? "添削中..." : "添削してもらう"}
              </Button>
              <Button variant="outline" onClick={startNew} disabled={loading}>別の本文にする</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <h1 className="text-lg font-bold">ちょこ添削</h1>
      <p className="text-sm text-muted-foreground">
        完成した小論文のうち、1段落だけを書いてみる練習です。前後の文章がお手本になります。
      </p>
      <div>
        <label className="text-sm font-medium">分野</label>
        <select className="mt-1 w-full rounded-lg border p-2 text-sm bg-background" value={facultyKey} onChange={(e) => setFacultyKey(e.target.value)}>
          {CHOCO_FACULTIES.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
      </div>
      <Button onClick={startNew}>はじめる</Button>
    </div>
  );
}
