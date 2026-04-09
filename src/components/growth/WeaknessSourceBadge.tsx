import { Badge } from "@/components/ui/badge";
import { FileEdit, Mic } from "lucide-react";

type WeaknessSource = "essay" | "interview" | "both";

const sourceConfig: Record<WeaknessSource, {
  label: string;
  className: string;
  icons: React.ReactNode;
}> = {
  essay: {
    label: "添削",
    className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
    icons: <FileEdit className="size-3" />,
  },
  interview: {
    label: "面接",
    className: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
    icons: <Mic className="size-3" />,
  },
  both: {
    label: "添削・面接",
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
    case "essay": return "border-l-blue-400 dark:border-l-blue-500";
    case "interview": return "border-l-violet-400 dark:border-l-violet-500";
    case "both": return "border-l-slate-400 dark:border-l-slate-500";
  }
}
