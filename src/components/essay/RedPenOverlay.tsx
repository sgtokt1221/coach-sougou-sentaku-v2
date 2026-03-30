"use client";

import { useState } from "react";
import type { CharMap } from "@/lib/essay/alignment";

interface Annotation {
  text: string;
  type: "error" | "suggestion" | "praise";
  charMapIndices: number[]; // which charMaps this annotation refers to
}

interface RedPenOverlayProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  charMaps: CharMap[];
  annotations: Annotation[];
}

const COLORS = {
  error: { bg: "rgba(239, 68, 68, 0.15)", border: "#EF4444", text: "#DC2626" },
  suggestion: { bg: "rgba(245, 158, 11, 0.15)", border: "#F59E0B", text: "#D97706" },
  praise: { bg: "rgba(16, 185, 129, 0.15)", border: "#10B981", text: "#059669" },
};

export function RedPenOverlay({
  imageUrl,
  imageWidth,
  imageHeight,
  charMaps,
  annotations,
}: RedPenOverlayProps) {
  const [selectedAnnotation, setSelectedAnnotation] = useState<number | null>(null);

  // Calculate scale to fit container
  const containerWidth = 800;
  const scale = containerWidth / imageWidth;
  const containerHeight = imageHeight * scale;

  function getAnnotationBounds(ann: Annotation) {
    const relevantMaps = ann.charMapIndices
      .map((i) => charMaps[i])
      .filter(Boolean);

    if (relevantMaps.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    for (const cm of relevantMaps) {
      const poly = cm.polygon;
      for (let i = 0; i < poly.length; i += 2) {
        const x = poly[i] * scale;
        const y = poly[i + 1] * scale;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  return (
    <div className="space-y-3">
      {/* Image with overlay */}
      <div
        className="relative border rounded-lg overflow-hidden"
        style={{ width: containerWidth, maxWidth: "100%" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="提出した小論文"
          style={{ width: "100%", height: "auto" }}
        />

        {/* Annotation highlights */}
        <svg
          className="absolute inset-0 pointer-events-none"
          viewBox={`0 0 ${containerWidth} ${containerHeight}`}
          style={{ width: "100%", height: "100%" }}
        >
          {annotations.map((ann, i) => {
            const bounds = getAnnotationBounds(ann);
            if (!bounds) return null;
            const colors = COLORS[ann.type];
            const isSelected = selectedAnnotation === i;

            return (
              <g key={i}>
                <rect
                  x={bounds.x - 2}
                  y={bounds.y - 2}
                  width={bounds.width + 4}
                  height={bounds.height + 4}
                  fill={colors.bg}
                  stroke={colors.border}
                  strokeWidth={isSelected ? 3 : 1.5}
                  rx={3}
                  className="pointer-events-auto cursor-pointer"
                  onClick={() => setSelectedAnnotation(isSelected ? null : i)}
                />
                {/* Annotation number badge */}
                <circle
                  cx={bounds.x + bounds.width + 8}
                  cy={bounds.y}
                  r={10}
                  fill={colors.border}
                />
                <text
                  x={bounds.x + bounds.width + 8}
                  y={bounds.y + 4}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight="bold"
                  fill="white"
                >
                  {i + 1}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Annotation list */}
      <div className="space-y-2">
        {annotations.map((ann, i) => {
          const colors = COLORS[ann.type];
          const isSelected = selectedAnnotation === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedAnnotation(isSelected ? null : i)}
              className={`w-full text-left rounded-lg border p-3 transition-colors ${
                isSelected ? "ring-2 ring-primary" : ""
              }`}
              style={{ borderColor: colors.border, background: isSelected ? colors.bg : "transparent" }}
            >
              <div className="flex items-start gap-2">
                <span
                  className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: colors.border }}
                >
                  {i + 1}
                </span>
                <p className="text-sm" style={{ color: colors.text }}>
                  {ann.text}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
