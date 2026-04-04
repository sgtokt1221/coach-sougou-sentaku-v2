"use client";

interface CustomDotProps {
  cx?: number;
  cy?: number;
  stroke?: string;
}

export function CustomDot({ cx, cy, stroke }: CustomDotProps) {
  if (cx == null || cy == null) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill="white"
      stroke={stroke}
      strokeWidth={2}
    />
  );
}

export function CustomActiveDot({ cx, cy, stroke }: CustomDotProps) {
  if (cx == null || cy == null) return null;
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={8}
        fill={stroke}
        opacity={0.15}
      />
      <circle
        cx={cx}
        cy={cy}
        r={6}
        fill="white"
        stroke={stroke}
        strokeWidth={2}
        filter="url(#dot-shadow)"
      />
      <defs>
        <filter id="dot-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.2" />
        </filter>
      </defs>
    </g>
  );
}
