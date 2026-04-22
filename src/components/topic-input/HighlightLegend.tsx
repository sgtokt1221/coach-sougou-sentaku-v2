import { Card, CardContent } from "@/components/ui/card";

const LEGEND = [
  {
    color:
      "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200 font-bold",
    label: "必修暗記",
    description: "条文・年号・判例・人名",
  },
  {
    color:
      "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200 font-semibold",
    label: "概念",
    description: "用語定義・キーワード",
  },
  {
    color: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
    label: "数値",
    description: "統計・重要数値",
  },
  {
    color:
      "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 italic",
    label: "学者",
    description: "学者名・著作名",
  },
  {
    color:
      "bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200",
    label: "海外",
    description: "国際比較・海外事例",
  },
];

export function HighlightLegend() {
  return (
    <Card className="bg-muted/30">
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground mb-2">ハイライト凡例</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className={`${item.color} px-1.5 py-0.5 rounded text-xs`}>
                {item.label}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {item.description}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
