"use client";

import type { BarFeedback } from "@/types/music";
import { Badge } from "@/components/ui/badge";

interface FeedbackDisplayProps {
  barFeedback: BarFeedback[];
}

const statusColors = {
  correct: "bg-green-500/10 border-green-500/30 text-green-700",
  close: "bg-yellow-500/10 border-yellow-500/30 text-yellow-700",
  off: "bg-red-500/10 border-red-500/30 text-red-700",
};

const statusLabels = {
  correct: "Great!",
  close: "Close",
  off: "Off",
};

/**
 * Displays bar-by-bar feedback after a practice session.
 */
export function FeedbackDisplay({ barFeedback }: FeedbackDisplayProps) {
  if (barFeedback.length === 0) {
    return (
      <p className="text-center text-muted-foreground text-sm py-4">
        No feedback yet. Complete a practice session to see results.
      </p>
    );
  }

  // Calculate overall stats
  const avgPitch = barFeedback.reduce((s, b) => s + b.pitchAccuracy, 0) / barFeedback.length;
  const avgRhythm = barFeedback.reduce((s, b) => s + b.rhythmAccuracy, 0) / barFeedback.length;

  return (
    <div className="space-y-4">
      {/* Overall summary */}
      <div className="flex gap-4">
        <div className="flex-1 text-center p-3 rounded-lg bg-muted">
          <p className="text-2xl font-bold">{Math.round(avgPitch)}%</p>
          <p className="text-xs text-muted-foreground">Pitch Accuracy</p>
        </div>
        <div className="flex-1 text-center p-3 rounded-lg bg-muted">
          <p className="text-2xl font-bold">{Math.round(avgRhythm)}%</p>
          <p className="text-xs text-muted-foreground">Rhythm Accuracy</p>
        </div>
      </div>

      {/* Bar-by-bar breakdown */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
        {barFeedback.map((bar) => (
          <div
            key={bar.barNumber}
            className={`text-center p-2 rounded-md border text-xs ${statusColors[bar.status]}`}
            title={bar.message || `Bar ${bar.barNumber}: ${bar.pitchAccuracy}% pitch`}
          >
            <p className="font-mono font-bold">Bar {bar.barNumber}</p>
            <p className="mt-0.5">{Math.round(bar.pitchAccuracy)}%</p>
          </div>
        ))}
      </div>

      {/* Textual feedback */}
      <div className="space-y-2">
        {barFeedback
          .filter((b) => b.status !== "correct" && b.message)
          .slice(0, 5)
          .map((bar) => (
            <div
              key={`msg-${bar.barNumber}`}
              className="flex items-center gap-2 text-sm"
            >
              <Badge
                variant="outline"
                className={
                  bar.status === "close"
                    ? "border-yellow-500 text-yellow-600"
                    : "border-red-500 text-red-600"
                }
              >
                Bar {bar.barNumber}
              </Badge>
              <span className="text-muted-foreground">{bar.message}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
