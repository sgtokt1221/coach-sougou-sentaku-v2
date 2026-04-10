import { Card, CardContent } from "@/components/ui/card";

const LEGEND = [
  {
    color:
      "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200 font-bold",
    label: "必修暗記",
    description: "条文・年号・判例・人名",
  },
  {
    color:
      "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200 font-semibold",
    label: "概念",
    description: "用語定義・キーワード",
  },
  {
    color: "bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200",
    label: "数値",
    description: "統計・重要数値",
  },
  {
    color:
      "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200 italic",
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
