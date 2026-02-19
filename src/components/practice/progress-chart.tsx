"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { PracticeResult } from "@/types/music";

interface ProgressChartProps {
  sessions: PracticeResult[];
}

/**
 * Simple progress chart showing accuracy trends over time.
 * Uses a basic SVG line chart (avoids recharts bundle size for now).
 */
export function ProgressChart({ sessions }: ProgressChartProps) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Complete some practice sessions to see your progress.
      </div>
    );
  }

  const maxSessions = 20;
  const recent = sessions.slice(-maxSessions);
  const width = 400;
  const height = 150;
  const padding = { top: 10, right: 10, bottom: 25, left: 35 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const xStep = chartWidth / Math.max(recent.length - 1, 1);

  function yScale(value: number): number {
    return padding.top + chartHeight - (value / 100) * chartHeight;
  }

  // Build path for pitch accuracy
  const pitchPath = recent
    .map((s, i) => {
      const x = padding.left + i * xStep;
      const y = yScale(s.pitchAccuracy);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  // Build path for rhythm accuracy
  const rhythmPath = recent
    .map((s, i) => {
      const x = padding.left + i * xStep;
      const y = yScale(s.rhythmAccuracy);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-md"
        style={{ minWidth: 300 }}
      >
        {/* Y-axis gridlines */}
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line
              x1={padding.left}
              y1={yScale(v)}
              x2={width - padding.right}
              y2={yScale(v)}
              stroke="hsl(var(--border))"
              strokeWidth={0.5}
              strokeDasharray={v === 0 || v === 100 ? "0" : "3,3"}
            />
            <text
              x={padding.left - 5}
              y={yScale(v) + 3}
              textAnchor="end"
              className="text-[8px] fill-muted-foreground"
            >
              {v}%
            </text>
          </g>
        ))}

        {/* Pitch accuracy line */}
        <path
          d={pitchPath}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Rhythm accuracy line */}
        <path
          d={rhythmPath}
          fill="none"
          stroke="hsl(var(--chart-2))"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="4,4"
        />

        {/* Data points */}
        {recent.map((s, i) => (
          <circle
            key={`p-${i}`}
            cx={padding.left + i * xStep}
            cy={yScale(s.pitchAccuracy)}
            r={3}
            fill="hsl(var(--primary))"
          />
        ))}

        {/* Legend */}
        <g transform={`translate(${padding.left}, ${height - 5})`}>
          <line x1={0} y1={0} x2={15} y2={0} stroke="hsl(var(--primary))" strokeWidth={2} />
          <text x={20} y={3} className="text-[8px] fill-muted-foreground">
            Pitch
          </text>
          <line x1={60} y1={0} x2={75} y2={0} stroke="hsl(var(--chart-2))" strokeWidth={2} strokeDasharray="4,4" />
          <text x={80} y={3} className="text-[8px] fill-muted-foreground">
            Rhythm
          </text>
        </g>
      </svg>
    </div>
  );
}
