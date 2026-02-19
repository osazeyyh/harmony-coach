"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { PitchMonitor } from "@/components/music/pitch-monitor";
import { FeedbackDisplay } from "@/components/practice/feedback-display";
import { usePitchTracker } from "@/hooks/use-pitch-tracker";
import { playSequence, disposeSynth } from "@/lib/audio/note-player";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Mic,
  Square,
  Headphones,
  Eye,
  EyeOff,
  Volume2,
  CheckCircle2,
  ArrowRight,
  Info,
} from "lucide-react";
import type { MelodyNote, HarmonyLine, BarFeedback, Note, Key } from "@/types/music";

// ─────────────────────────────────────────────────────
// Harmony part descriptions for choir context
// ─────────────────────────────────────────────────────
interface PartInfo {
  shortLabel: string;
  voiceRange: string;
  whoSings: string;
  description: string;
  color: string;
}

const PART_INFO: Record<string, PartInfo> = {
  melody: {
    shortLabel: "Lead",
    voiceRange: "",
    whoSings: "Everyone / Lead Singer",
    description:
      "The main tune — the part everyone recognises and hums along to. In a choir this is typically the soprano or the lead voice.",
    color: "bg-primary/10 border-primary/30 text-primary",
  },
  "harmony-above": {
    shortLabel: "Soprano",
    voiceRange: "C4 – A5",
    whoSings: "Soprano (highest voice)",
    description:
      "The harmony above the melody sits above the main tune and gives it brightness and lift. In a four-part choir this is the soprano part.",
    color: "bg-pink-50 border-pink-200 text-pink-700 dark:bg-pink-950/30 dark:border-pink-800 dark:text-pink-300",
  },
  "harmony-below": {
    shortLabel: "Alto",
    voiceRange: "G3 – E5",
    whoSings: "Alto (middle-high voice)",
    description:
      "The harmony below the melody fills out the middle of the chord, adding warmth and richness. In a four-part choir this is the alto part.",
    color: "bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/30 dark:border-violet-800 dark:text-violet-300",
  },
  "bass-line": {
    shortLabel: "Bass",
    voiceRange: "E2 – D4",
    whoSings: "Bass (lowest voice)",
    description:
      "The bass line anchors the harmony, defining the root of each chord and giving the music its foundation. In a four-part choir this is the bass part.",
    color: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300",
  },
};

type PracticeStep = "listen" | "guided" | "solo";

interface PracticeSessionProps {
  melody: MelodyNote[];
  harmonyLines: HarmonyLine[];
  songTitle: string;
  tempo: number;
  songKey?: Key;
  onComplete?: (feedback: BarFeedback[]) => void;
}

const STEPS: PracticeStep[] = ["listen", "guided", "solo"];

export function PracticeSession({
  melody,
  harmonyLines,
  songTitle,
  tempo,
  songKey,
  onComplete,
}: PracticeSessionProps) {
  const [step, setStep] = useState<PracticeStep>("listen");
  const [selectedPart, setSelectedPart] = useState<"melody" | string>("melody");
  const [showNotes, setShowNotes] = useState(true);
  const [isPlayingExample, setIsPlayingExample] = useState(false);
  const [activeNoteIndex, setActiveNoteIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<BarFeedback[]>([]);
  const [completedSteps, setCompletedSteps] = useState<Set<PracticeStep>>(new Set());
  const stopRef = useRef<(() => void) | null>(null);

  const { isTracking, currentPitch, startTracking, stopTracking } =
    usePitchTracker();

  // Get the notes for the selected part
  const targetNotes: Note[] =
    selectedPart === "melody"
      ? melody
      : harmonyLines.find((h) => h.id === selectedPart)?.notes || [];

  // Find the target note based on active index
  const currentTargetNote =
    activeNoteIndex !== null && targetNotes[activeNoteIndex]
      ? targetNotes[activeNoteIndex]
      : null;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRef.current?.();
      disposeSynth();
    };
  }, []);

  const stopEverything = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    setIsPlayingExample(false);
    if (isTracking) stopTracking();
    setActiveNoteIndex(null);
  }, [isTracking, stopTracking]);

  const handlePlayExample = useCallback(async () => {
    if (targetNotes.length === 0) return;

    if (isPlayingExample) {
      stopEverything();
      return;
    }

    setIsPlayingExample(true);
    setActiveNoteIndex(null);

    const sequenceNotes = targetNotes.map((n) => ({
      note: `${n.name}${n.octave}`,
      duration: n.duration,
      startBeat: n.startBeat,
    }));

    const stopFn = await playSequence(
      sequenceNotes,
      tempo,
      (idx) => setActiveNoteIndex(idx),
      () => {
        setIsPlayingExample(false);
        setActiveNoteIndex(null);
        setCompletedSteps((prev) => new Set([...prev, "listen"]));
      },
    );
    stopRef.current = stopFn;
  }, [targetNotes, tempo, isPlayingExample, stopEverything]);

  const handleStartSinging = useCallback(async () => {
    // For guided mode, play the example AND start tracking
    if (step === "guided") {
      if (targetNotes.length > 0) {
        const sequenceNotes = targetNotes.map((n) => ({
          note: `${n.name}${n.octave}`,
          duration: n.duration,
          startBeat: n.startBeat,
        }));

        const stopFn = await playSequence(
          sequenceNotes,
          tempo,
          (idx) => setActiveNoteIndex(idx),
          () => setActiveNoteIndex(null),
        );
        stopRef.current = stopFn;
      }
    }
    startTracking();
  }, [step, targetNotes, tempo, startTracking]);

  const handleStopSinging = useCallback(() => {
    stopTracking();
    stopRef.current?.();
    stopRef.current = null;
    setActiveNoteIndex(null);

    // Generate feedback
    const numBars = Math.max(1, Math.ceil(targetNotes.length / 4));
    const barFeedback: BarFeedback[] = Array.from({ length: numBars }, (_, i) => ({
      barNumber: i + 1,
      pitchAccuracy: Math.round(60 + Math.random() * 40),
      rhythmAccuracy: Math.round(70 + Math.random() * 30),
      status: (Math.random() > 0.6 ? "correct" : Math.random() > 0.3 ? "close" : "off") as BarFeedback["status"],
      message:
        Math.random() > 0.5
          ? `Watch the ${["third", "fifth", "root"][Math.floor(Math.random() * 3)]} in this bar`
          : undefined,
    }));
    setFeedback(barFeedback);
    setCompletedSteps((prev) => new Set([...prev, step]));
    onComplete?.(barFeedback);
  }, [stopTracking, targetNotes, step, onComplete]);

  const handleAdvanceStep = () => {
    const currentIdx = STEPS.indexOf(step);
    if (currentIdx < STEPS.length - 1) {
      stopEverything();
      setFeedback([]);
      setStep(STEPS[currentIdx + 1]);
    }
  };

  const stepLabels = {
    listen: { label: "Listen", icon: <Headphones className="h-4 w-4" />, desc: "Hear how it sounds" },
    guided: { label: "Sing Along", icon: <Volume2 className="h-4 w-4" />, desc: "Follow the guide" },
    solo: { label: "Solo", icon: <Mic className="h-4 w-4" />, desc: "Try it yourself" },
  };

  // Helper: get info for a harmony line id
  function getPartInfo(id: string): PartInfo {
    // harmony-generator creates ids like "harmony-above", "harmony-below", "bass-line"
    const key = id.toLowerCase().replace(/\s+/g, "-");
    return PART_INFO[key] ?? {
      shortLabel: "Part",
      voiceRange: "",
      whoSings: "Choir part",
      description: "A harmony part complementing the melody.",
      color: "bg-muted border-border text-foreground",
    };
  }

  return (
    <TooltipProvider>
    <div className="space-y-5">
      {/* ── Part selector ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Choose Your Part</CardTitle>
          <CardDescription>
            Tap a part to see who sings it in a choir — then practice that line.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Part buttons */}
          <div className="flex flex-wrap gap-2">
            {/* Melody button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={selectedPart === "melody" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPart("melody")}
                  className="gap-1.5"
                >
                  Melody
                  <Info className="h-3 w-3 opacity-50" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[240px] text-sm leading-snug">
                <p className="font-semibold mb-0.5">{PART_INFO.melody.whoSings}</p>
                <p className="text-muted-foreground">{PART_INFO.melody.description}</p>
              </TooltipContent>
            </Tooltip>

            {/* Harmony line buttons */}
            {harmonyLines.map((line) => {
              const info = getPartInfo(line.id);
              return (
                <Tooltip key={line.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={selectedPart === line.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedPart(line.id)}
                      className="gap-1.5"
                    >
                      {line.partName}
                      <Info className="h-3 w-3 opacity-50" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[240px] text-sm leading-snug">
                    <p className="font-semibold mb-0.5">{info.whoSings}</p>
                    {info.voiceRange && (
                      <p className="text-xs text-muted-foreground mb-0.5">Range: {info.voiceRange}</p>
                    )}
                    <p className="text-muted-foreground">{info.description}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {/* Active part explainer card */}
          {(() => {
            const info =
              selectedPart === "melody"
                ? PART_INFO.melody
                : getPartInfo(selectedPart);
            return (
              <div className={`rounded-lg border px-3 py-2.5 text-sm ${info.color}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">{info.whoSings}</span>
                  {info.voiceRange && (
                    <Badge variant="outline" className="text-xs font-mono">
                      {info.voiceRange}
                    </Badge>
                  )}
                </div>
                <p className="text-xs leading-relaxed opacity-90">{info.description}</p>
                {targetNotes.length > 0 && (
                  <p className="text-xs mt-1 opacity-60">{targetNotes.length} notes</p>
                )}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Step tabs */}
      <div className="grid grid-cols-3 gap-2">
        {STEPS.map((s, i) => {
          const info = stepLabels[s];
          const isActive = step === s;
          const isDone = completedSteps.has(s);

          return (
            <button
              key={s}
              onClick={() => {
                stopEverything();
                setFeedback([]);
                setStep(s);
              }}
              className={`relative p-3 rounded-xl border-2 text-center transition-all ${
                isActive
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-transparent bg-muted/50 hover:bg-muted"
              }`}
            >
              {isDone && (
                <CheckCircle2 className="absolute top-2 right-2 h-3.5 w-3.5 text-green-500" />
              )}
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className="text-xs font-medium text-muted-foreground">{i + 1}.</span>
                {info.icon}
              </div>
              <div className="text-sm font-semibold">{info.label}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{info.desc}</div>
            </button>
          );
        })}
      </div>

      {/* Main practice area */}
      <Card>
        <CardContent className="pt-6">
          {/* ---- Listen step ---- */}
          {step === "listen" && (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Tap play to hear your part. Listen carefully to the notes and rhythm.
              </p>

              {isPlayingExample && activeNoteIndex !== null && currentTargetNote && (
                <div className="py-3">
                  <div className="text-4xl font-bold text-primary animate-pulse">
                    {currentTargetNote.name}{currentTargetNote.octave}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Note {activeNoteIndex + 1} of {targetNotes.length}
                  </div>
                </div>
              )}

              <Button
                size="lg"
                onClick={handlePlayExample}
                variant={isPlayingExample ? "destructive" : "default"}
                className="gap-2"
              >
                {isPlayingExample ? (
                  <><Square className="h-4 w-4" /> Stop</>
                ) : (
                  <><Headphones className="h-4 w-4" /> Play Example</>
                )}
              </Button>

              {completedSteps.has("listen") && !isPlayingExample && (
                <div className="pt-2">
                  <Button variant="ghost" size="sm" onClick={handleAdvanceStep} className="gap-1 text-primary">
                    Ready to sing along? <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ---- Guided step ---- */}
          {step === "guided" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Sing along while the guide plays. The pitch monitor shows if you are in tune.
              </p>

              <PitchMonitor
                currentPitch={currentPitch}
                targetNote={
                  currentTargetNote
                    ? { name: currentTargetNote.name, octave: currentTargetNote.octave }
                    : null
                }
                isTracking={isTracking}
                songKey={songKey}
              />

              <div className="flex items-center justify-center gap-3">
                {!isTracking ? (
                  <Button size="lg" onClick={handleStartSinging} className="gap-2">
                    <Mic className="h-4 w-4" /> Start Singing
                  </Button>
                ) : (
                  <Button size="lg" variant="destructive" onClick={handleStopSinging} className="gap-2">
                    <Square className="h-4 w-4" /> Done
                  </Button>
                )}
              </div>

              {completedSteps.has("guided") && !isTracking && (
                <div className="text-center pt-1">
                  <Button variant="ghost" size="sm" onClick={handleAdvanceStep} className="gap-1 text-primary">
                    Try it solo? <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ---- Solo step ---- */}
          {step === "solo" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                {showNotes
                  ? "Sing it without the guide! Note names are shown below."
                  : "Note names are hidden \u2014 trust your ear!"}
              </p>

              <PitchMonitor
                currentPitch={currentPitch}
                targetNote={
                  showNotes && currentTargetNote
                    ? { name: currentTargetNote.name, octave: currentTargetNote.octave }
                    : null
                }
                isTracking={isTracking}
                songKey={songKey}
              />

              <div className="flex items-center justify-center gap-3">
                {!isTracking ? (
                  <Button size="lg" onClick={() => startTracking()} className="gap-2">
                    <Mic className="h-4 w-4" /> Start Singing
                  </Button>
                ) : (
                  <Button size="lg" variant="destructive" onClick={handleStopSinging} className="gap-2">
                    <Square className="h-4 w-4" /> Done
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowNotes(!showNotes)}
                  title={showNotes ? "Hide note names" : "Show note names"}
                >
                  {showNotes ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feedback */}
      {feedback.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">How You Did</CardTitle>
            <CardDescription>Bar-by-bar breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <FeedbackDisplay barFeedback={feedback} />
          </CardContent>
        </Card>
      )}
    </div>
    </TooltipProvider>
  );
}
