"use client";

import { useEffect, useState } from "react";
import { BookOpen, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { authFetch } from "@/lib/api/client";
import {
  HomeworkFormFields,
  buildHomeworkBody,
  emptyHomeworkForm,
  type HomeworkFormValue,
} from "@/components/admin/HomeworkForm";
import type { ChatReference } from "@/lib/types/feedback";

const DRILL_CATEGORIES = [
  "志望理由",
  "自己PR",
  "学問関心",
  "将来ビジョン",
  "時事問題",
] as const;

type Tab = "theme" | "past" | "interview" | "summary" | "custom";

interface ThemeItem {
  id: string;
  title: string;
  fieldLabel?: string;
  difficulty?: number;
  description?: string;
}
interface PastItem {
  id: string;
  universityName: string;
  facultyName: string;
  theme: string;
  year?: number;
  description?: string;
}

/** 選択中の問題（href は確定時に組み立て） */
interface Selection {
  kind: ChatReference["kind"];
  label: string;
  href: string;
  description?: string;
  /** 宿題化時の種別 */
  homeworkType: "essay" | "interview";
  /** 宿題化時に snapshot へ保存する元問題ID（リッチ添削フロー誘導用） */
  essayThemeId?: string;
  pastQuestionId?: string;
}

export function ProblemPickerDialog({
  studentId,
  onPick,
}: {
  studentId: string;
  onPick: (ref: ChatReference) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("theme");
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [themes, setThemes] = useState<ThemeItem[]>([]);
  const [pasts, setPasts] = useState<PastItem[]>([]);
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [asHomework, setAsHomework] = useState(false);
  const [hwForm, setHwForm] = useState<HomeworkFormValue>(emptyHomeworkForm());
  const [submitting, setSubmitting] = useState(false);

  // 宿題モードで問題を選んだら、共通フォームに自動入力（種別/タイトル/目的）
  useEffect(() => {
    if (!asHomework || tab === "custom" || !selection) return;
    setHwForm((f) => ({
      ...f,
      type: selection.homeworkType,
      title: selection.label,
      objective: selection.description ?? "",
    }));
  }, [asHomework, selection, tab]);

  useEffect(() => {
    if (!open || loaded) return;
    setLoading(true);
    authFetch("/api/essay/themes")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const data = json?.data;
        if (data) {
          setThemes(Array.isArray(data.themes) ? data.themes : []);
          setPasts(Array.isArray(data.pastQuestions) ? data.pastQuestions : []);
        }
        setLoaded(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, loaded]);

  function reset() {
    setSelection(null);
    setCustomTitle("");
    setCustomBody("");
    setAsHomework(false);
    setHwForm(emptyHomeworkForm());
    setSearch("");
  }

  function selectTheme(t: ThemeItem) {
    setSelection({
      kind: "essay-theme",
      label: t.title,
      href: `/student/essay/new?theme=${encodeURIComponent(t.id)}`,
      description: t.description,
      homeworkType: "essay",
      essayThemeId: t.id,
    });
  }
  function selectPast(p: PastItem) {
    setSelection({
      kind: "past-question",
      label: `${p.universityName} ${p.facultyName}: ${p.theme}`,
      href: `/student/essay/new?pastQuestion=${encodeURIComponent(p.id)}`,
      description: p.description,
      homeworkType: "essay",
      pastQuestionId: p.id,
    });
  }
  function selectInterview(cat: string) {
    setSelection({
      kind: "interview-drill",
      label: `面接ドリル - ${cat}`,
      href: "/student/interview/drill",
      description: `カテゴリ: ${cat}`,
      homeworkType: "interview",
    });
  }
  function selectSummary() {
    setSelection({
      kind: "summary-drill",
      label: "要約ドリル",
      href: "/student/essay/summary-drill",
      homeworkType: "essay",
    });
  }

  function buildCustom(): Selection | null {
    if (!customTitle.trim()) return null;
    return {
      kind: "custom",
      label: customTitle.trim(),
      href: "/student/essay/new",
      description: customBody.trim() || undefined,
      homeworkType: "essay",
    };
  }

  async function handleConfirm() {
    setSubmitting(true);
    try {
      let ref: ChatReference;
      if (asHomework) {
        // 宿題として登録（共通フォームの内容で作成）→ そのIDを参照先に
        if (!hwForm.title.trim()) {
          toast.error("タイトルを入力してください");
          return;
        }
        const res = await authFetch(
          `/api/admin/students/${studentId}/homework`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...buildHomeworkBody(hwForm),
              ...(selection?.essayThemeId
                ? { essayThemeId: selection.essayThemeId }
                : {}),
              ...(selection?.pastQuestionId
                ? { pastQuestionId: selection.pastQuestionId }
                : {}),
            }),
          }
        );
        if (!res.ok) throw new Error("homework failed");
        const hw = await res.json();
        ref = {
          kind: "homework",
          label: hwForm.title.trim(),
          href: `/student/homework/${hw.id}`,
          description: hwForm.objective.trim() || undefined,
        };
      } else {
        const sel = tab === "custom" ? buildCustom() : selection;
        if (!sel) {
          toast.error("問題を選択してください");
          return;
        }
        ref = {
          kind: sel.kind,
          label: sel.label,
          href: sel.href,
          description: sel.description,
        };
      }
      onPick(ref);
      setOpen(false);
      reset();
    } catch {
      toast.error("問題の添付に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  const themeMatches = themes.filter(
    (t) =>
      !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.fieldLabel ?? "").includes(search)
  );
  const pastMatches = pasts.filter(
    (p) =>
      !search ||
      `${p.universityName}${p.facultyName}${p.theme}`
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  const TABS: { key: Tab; label: string }[] = [
    { key: "theme", label: "テーマ" },
    { key: "past", label: "過去問" },
    { key: "interview", label: "面接ドリル" },
    { key: "summary", label: "要約ドリル" },
    { key: "custom", label: "自作" },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button type="button" size="icon" variant="ghost" className="shrink-0" aria-label="問題を添付">
          <BookOpen className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="size-4" />
            問題を選んで送る
          </DialogTitle>
        </DialogHeader>

        {/* タブ */}
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <Button
              key={t.key}
              type="button"
              size="sm"
              variant={tab === t.key ? "default" : "outline"}
              onClick={() => {
                setTab(t.key);
                setSelection(null);
              }}
            >
              {t.label}
            </Button>
          ))}
        </div>

        <div className="min-h-[200px]">
          {(tab === "theme" || tab === "past") && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="検索..."
                  className="pl-9"
                />
              </div>
              {loading ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  読み込み中...
                </p>
              ) : (
                <div className="max-h-56 space-y-1 overflow-y-auto">
                  {tab === "theme" &&
                    themeMatches.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => selectTheme(t)}
                        className={`w-full rounded-lg border p-2 text-left text-sm ${
                          selection?.href.includes(t.id)
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted"
                        }`}
                      >
                        <span className="font-medium">{t.title}</span>
                        {t.fieldLabel && (
                          <span className="ml-2 text-[10px] text-muted-foreground">
                            {t.fieldLabel}
                          </span>
                        )}
                      </button>
                    ))}
                  {tab === "past" &&
                    pastMatches.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => selectPast(p)}
                        className={`w-full rounded-lg border p-2 text-left text-sm ${
                          selection?.href.includes(p.id)
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted"
                        }`}
                      >
                        <span className="font-medium">
                          {p.universityName} {p.facultyName}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {p.theme}
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

          {tab === "interview" && (
            <div className="flex flex-wrap gap-2">
              {DRILL_CATEGORIES.map((c) => (
                <Button
                  key={c}
                  type="button"
                  size="sm"
                  variant={
                    selection?.label === `面接ドリル - ${c}`
                      ? "default"
                      : "outline"
                  }
                  onClick={() => selectInterview(c)}
                >
                  {c}
                </Button>
              ))}
            </div>
          )}

          {tab === "summary" && (
            <Button
              type="button"
              size="sm"
              variant={selection?.kind === "summary-drill" ? "default" : "outline"}
              onClick={selectSummary}
            >
              要約ドリルを送る
            </Button>
          )}

          {tab === "custom" && !asHomework && (
            <div className="space-y-2">
              <Input
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="課題のタイトル"
              />
              <Textarea
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
                placeholder="問題文・指示（任意）"
                rows={4}
              />
            </div>
          )}
          {tab === "custom" && asHomework && (
            <p className="text-xs text-muted-foreground">
              下の宿題フォームに直接入力してください。
            </p>
          )}
        </div>

        {/* 送り方 */}
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={!asHomework ? "default" : "outline"}
              onClick={() => setAsHomework(false)}
            >
              リンクのみ
            </Button>
            <Button
              type="button"
              size="sm"
              variant={asHomework ? "default" : "outline"}
              onClick={() => setAsHomework(true)}
            >
              宿題として出す
            </Button>
          </div>
          {asHomework && (
            <div className="border-t pt-3">
              <HomeworkFormFields value={hwForm} onChange={setHwForm} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : (
              <BookOpen className="mr-1 size-4" />
            )}
            添付する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
