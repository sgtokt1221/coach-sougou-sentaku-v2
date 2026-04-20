"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, AlertTriangle, ChevronRight } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

interface AiInterventionCardProps {
  items: Array<{
    studentUid: string;
    studentName: string;
    recommendation: string;
    reasoning: string;
    severity: "critical" | "high" | "warning";
  }>;
}

function getSeverityIcon(severity: "critical" | "high" | "warning") {
  switch (severity) {
    case "critical":
      return <AlertTriangle className="size-4 text-red-500" />;
    case "high":
      return <AlertTriangle className="size-4 text-orange-500" />;
    case "warning":
      return <AlertTriangle className="size-4 text-yellow-500" />;
  }
}

export function AiInterventionCard({ items }: AiInterventionCardProps) {
  if (items.length === 0) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4" />
            AIからの介入推薦
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground py-6">
            現在、介入が必要な生徒はいません
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4" />
          AIからの介入推薦
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 pb-6">
        <div className="space-y-0 divide-y">
          {items.map((item, index) => (
            <motion.div
              key={item.studentUid}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.3 }}
            >
              <Link
                href={`/admin/students/${item.studentUid}`}
                className="block px-6 py-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {getSeverityIcon(item.severity)}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">
                        {item.studentName}
                      </p>
                      <p className="text-sm text-foreground leading-5 mt-1">
                        {item.recommendation}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.reasoning}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <span className="text-xs text-muted-foreground">詳細</span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}