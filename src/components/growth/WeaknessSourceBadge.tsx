import { Badge } from "@/components/ui/badge";
import { FileEdit, Mic, Gauge } from "lucide-react";

type WeaknessSource = "essay" | "interview" | "skill_check" | "interview_skill_check" | "both";

const sourceConfig: Record<WeaknessSource, {
  label: string;
  className: string;
  icons: React.ReactNode;
}> = {
  essay: {
    label: "添削",
    className: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
    icons: <FileEdit className="size-3" />,
  },
  interview: {
    label: "面接",
    className: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
    icons: <Mic className="size-3" />,
  },
  skill_check: {
    label: "小論文SC",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    icons: <Gauge className="size-3" />,
  },
  interview_skill_check: {
    label: "面接SC",
    className: "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300",
    icons: <Gauge className="size-3" />,
  },
  both: {
    label: "複合",
    className: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300",
    icons: (
      <span className="flex items-center gap-0.5">
        <FileEdit className="size-3" />
        <Mic className="size-3" />
      </span>
    ),
  },
};

export function WeaknessSourceBadge({ source }: { source: WeaknessSource }) {
  const cfg = sourceConfig[source];
  return (
    <Badge variant="outline" className={`gap-1 text-xs ${cfg.className}`}>
      {cfg.icons}
      {cfg.label}
    </Badge>
  );
}

export function sourceLeftBorder(source: WeaknessSource): string {
  switch (source) {
    case "essay": return "border-l-sky-400 dark:border-l-sky-500";
    case "interview": return "border-l-violet-400 dark:border-l-violet-500";
    case "skill_check": return "border-l-emerald-400 dark:border-l-emerald-500";
    case "interview_skill_check": return "border-l-purple-400 dark:border-l-purple-500";
    case "both": return "border-l-slate-400 dark:border-l-slate-500";
  }
}
