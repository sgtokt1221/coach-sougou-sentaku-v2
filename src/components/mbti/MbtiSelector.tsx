"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { MbtiDimension } from "@/lib/types/mbti";

interface DimensionOption {
  label: string;
  description: string;
  left: { letter: MbtiDimension; name: string };
  right: { letter: MbtiDimension; name: string };
}

const DIMENSIONS: DimensionOption[] = [
  {
    label: "エネルギーの方向",
    description: "外の世界と内の世界、どちらからエネルギーを得る?",
    left: { letter: "E", name: "外向型 (E)" },
    right: { letter: "I", name: "内向型 (I)" },
  },
  {
    label: "情報の受け取り方",
    description: "具体的な事実と全体的なパターン、どちらを重視する?",
    left: { letter: "S", name: "感覚型 (S)" },
    right: { letter: "N", name: "直観型 (N)" },
  },
  {
    label: "判断の仕方",
    description: "論理と感情、どちらに基づいて決断する?",
    left: { letter: "T", name: "思考型 (T)" },
    right: { letter: "F", name: "感情型 (F)" },
  },
  {
    label: "生活のスタイル",
    description: "計画的に進めるか、柔軟に対応するか?",
    left: { letter: "J", name: "判断型 (J)" },
    right: { letter: "P", name: "知覚型 (P)" },
  },
];

interface MbtiSelectorProps {
  initialType?: string;
  onSelect: (type: string) => void;
}

export function MbtiSelector({ initialType, onSelect }: MbtiSelectorProps) {
  const [selections, setSelections] = useState<
    Record<number, MbtiDimension | null>
  >(() => {
    if (!initialType || initialType.length !== 4) {
      return { 0: null, 1: null, 2: null, 3: null };
    }
    return {
      0: initialType[0] as MbtiDimension,
      1: initialType[1] as MbtiDimension,
      2: initialType[2] as MbtiDimension,
      3: initialType[3] as MbtiDimension,
    };
  });

  const handleSelect = useCallback(
    (dimensionIndex: number, letter: MbtiDimension) => {
      const newSelections = { ...selections, [dimensionIndex]: letter };
      setSelections(newSelections);

      const allSelected = Object.values(newSelections).every((v) => v !== null);
      if (allSelected) {
        const type = Object.values(newSelections).join("");
        onSelect(type);
      }
    },
    [selections, onSelect]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">タイプを選択</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {DIMENSIONS.map((dim, index) => (
          <div key={dim.label} className="space-y-2">
            <div>
              <p className="text-sm font-medium">{dim.label}</p>
              <p className="text-xs text-muted-foreground">{dim.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={
                  selections[index] === dim.left.letter ? "default" : "outline"
                }
                className="h-auto py-3"
                onClick={() => handleSelect(index, dim.left.letter)}
              >
                {dim.left.name}
              </Button>
              <Button
                variant={
                  selections[index] === dim.right.letter ? "default" : "outline"
                }
                className="h-auto py-3"
                onClick={() => handleSelect(index, dim.right.letter)}
              >
                {dim.right.name}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
