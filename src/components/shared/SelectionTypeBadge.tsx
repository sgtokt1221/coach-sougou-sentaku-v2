import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type SelectionType = "comprehensive" | "school_recommendation" | string;

const LABELS: Record<string, string> = {
  comprehensive: "総合型選抜",
  school_recommendation: "学校推薦型選抜",
};

const STYLES: Record<string, string> = {
  comprehensive: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-900",
  school_recommendation: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900",
};

interface Props {
  type?: SelectionType | null;
  size?: "sm" | "md";
  className?: string;
}

export function SelectionTypeBadge({ type, size = "md", className }: Props) {
  if (!type || !LABELS[type]) return null;
  return (
    <Badge
      variant="outline"
      className={cn(
        STYLES[type],
        size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs",
        className,
      )}
    >
      {LABELS[type]}
    </Badge>
  );
}
