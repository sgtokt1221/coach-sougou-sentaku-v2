"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { PieChartIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

interface StudentStatusPieProps {
  students: Array<{ uid: string; displayName: string; alertFlags: string[] }>;
}

const COLORS = {
  critical: "#ef4444", // red
  warning: "#f59e0b", // amber
  caution: "#eab308", // yellow
  good: "#10b981", // emerald
} as const;

const STATUS_LABELS = {
  critical: "危機",
  warning: "要対応",
  caution: "要注意",
  good: "順調",
} as const;

function getCategorySeverity(alertFlags: string[]): keyof typeof COLORS {
  if (!alertFlags || alertFlags.length === 0) return "good";

  // 危機 (critical系)
  if (alertFlags.includes("inactive") || alertFlags.includes("document_deadline")) {
    return "critical";
  }

  // 要対応 (performance系)
  if (
    alertFlags.some(flag =>
      ["declining", "weakness_stuck", "ap_struggle", "deadline_risk"].includes(flag)
    )
  ) {
    return "warning";
  }

  // 要注意 (observation系のみ)
  if (
    alertFlags.every(flag =>
      ["repeated_weakness", "score_plateau"].includes(flag)
    )
  ) {
    return "caution";
  }

  // デフォルトは要対応
  return "warning";
}

export function StudentStatusPie({ students }: StudentStatusPieProps) {
  const router = useRouter();

  // 生徒をステータス別に分類
  const statusCounts = students.reduce((acc, student) => {
    const severity = getCategorySeverity(student.alertFlags);
    acc[severity] = (acc[severity] || 0) + 1;
    return acc;
  }, {} as Record<keyof typeof COLORS, number>);

  // Recharts用データ作成
  const chartData = Object.entries(COLORS).map(([key, color]) => ({
    name: STATUS_LABELS[key as keyof typeof STATUS_LABELS],
    value: statusCounts[key as keyof typeof COLORS] || 0,
    color,
    severity: key,
  })).filter(item => item.value > 0);

  const totalStudents = students.length;

  const handleSliceClick = (data: any) => {
    const severity = data.severity;
    router.push(`/admin/students?status=${severity}`);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = totalStudents > 0 ? ((data.value / totalStudents) * 100).toFixed(1) : "0";
      return (
        <div className="bg-white dark:bg-gray-800 p-2 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {data.value}人 ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => (
    <div className="flex flex-col gap-2 mt-4">
      {payload?.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {entry.value}: {chartData[index]?.value || 0}人
            ({totalStudents > 0 ? ((chartData[index]?.value || 0) / totalStudents * 100).toFixed(1) : "0"}%)
          </span>
        </div>
      ))}
    </div>
  );

  if (totalStudents === 0) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PieChartIcon className="size-4" />
            生徒ステータス分布
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">生徒が登録されていません</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", duration: 0.4 }}
    >
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PieChartIcon className="size-4" />
            生徒ステータス分布
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  paddingAngle={2}
                  dataKey="value"
                  onClick={handleSliceClick}
                  className="cursor-pointer"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend content={<CustomLegend />} />
              </PieChart>
            </ResponsiveContainer>

            {/* 中心の合計表示 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {totalStudents}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  総生徒数
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}