"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Mic, CheckCircle2, X } from "lucide-react";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useAnalysis } from "@/hooks/use-analysis";
import { useSessionStore } from "@/stores/session-store";
import type { AnalysisResult } from "@/types/music";

interface MicButtonProps {
  onResult: (result: AnalysisResult) => void;
}

type MicState = "idle" | "recording" | "analyzing" | "done";

export function MicButton({ onResult }: MicButtonProps) {
  const {
    isRecording,
    audioBuffer,
    duration,
    startRecording,
    stopRecording,
    resetRecording,
  } = useAudioRecorder();

  const { analyzeFromBuffer, result, isAnalyzing, progress } = useAnalysis();
  const { setAnalysis } = useSessionStore();

  const [micState, setMicState] = useState<MicState>("idle");
  const [showDone, setShowDone] = useState(false);

  // Container ref — used for click-outside detection
  const containerRef = useRef<HTMLDivElement>(null);

  // Canvas ref for Dolby On-style waveform visualiser
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  // Inner-orb canvas for audio-reactive blobs
  const orbCanvasRef = useRef<HTMLCanvasElement>(null);
  const orbFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ── Format duration ──────────────────────────────────────────
  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  }

  const stopWaveform = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    cancelAnimationFrame(orbFrameRef.current);
    try {
      sourceRef.current?.disconnect();
      analyserRef.current?.disconnect();
      audioCtxRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch { /* ignore */ }
    analyserRef.current = null;
    audioCtxRef.current = null;
    // Clear both canvases
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    const orb = orbCanvasRef.current;
    if (orb) {
      const ctx = orb.getContext("2d");
      ctx?.clearRect(0, 0, orb.width, orb.height);
    }
  }, []);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const barCount = Math.min(28, bufferLength);
      const gap = 3;
      const barW = (width - gap * (barCount - 1)) / barCount;

      for (let i = 0; i < barCount; i++) {
        const val = dataArray[i] / 255;
        const barH = Math.max(4, val * height * 0.9);

        // Gradient: violet → pink per bar
        const grad = ctx.createLinearGradient(0, height, 0, height - barH);
        grad.addColorStop(0, "rgba(139, 92, 246, 0.9)");   // violet
        grad.addColorStop(0.5, "rgba(168, 85, 247, 1.0)"); // purple
        grad.addColorStop(1, "rgba(236, 72, 153, 0.9)");   // pink

        ctx.fillStyle = grad;
        const x = i * (barW + gap);
        const y = height - barH;
        const r = barW / 2;
        // Rounded top bars
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + barW, y, x + barW, y + barH, r);
        ctx.arcTo(x + barW, y + barH, x, y + barH, 0);
        ctx.arcTo(x, y + barH, x, y, 0);
        ctx.arcTo(x, y, x + barW, y, r);
        ctx.closePath();
        ctx.fill();

        // Neon glow
        ctx.shadowBlur = 8;
        ctx.shadowColor = "rgba(168, 85, 247, 0.6)";
      }
      ctx.shadowBlur = 0;
    };

    draw();
  }, []);

  // ── Inner-orb audio-reactive lava blobs ──────────────────────
  // Three coloured blobs drift inside the orb and expand/contract
  // with the live audio volume — like lava lamp globs reacting to sound.
  const drawOrbInner = useCallback(() => {
    const orb = orbCanvasRef.current;
    const analyser = analyserRef.current;
    if (!orb || !analyser) return;

    const ctx = orb.getContext("2d");
    if (!ctx) return;

    const R = orb.width / 2; // radius of the orb canvas
    const cx = R;
    const cy = R;

    // Per-blob state: phase offsets for position drift & shape morph
    const blobs = [
      { color: [168, 85, 247],  px: 0.35, py: 0.38, phase: 0,    speed: 0.008 }, // violet
      { color: [236, 72,  153], px: 0.62, py: 0.55, phase: 2.1,  speed: 0.006 }, // pink
      { color: [99,  102, 241], px: 0.45, py: 0.65, phase: 4.3,  speed: 0.007 }, // indigo
    ];
    const blobPhases = blobs.map((b) => b.phase);

    const timeBuf = new Uint8Array(analyser.frequencyBinCount);
    let t = 0;

    const draw = () => {
      orbFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(timeBuf);

      // Average volume 0-1
      const vol = timeBuf.reduce((s, v) => s + v, 0) / timeBuf.length / 255;

      t += 1;
      ctx.clearRect(0, 0, orb.width, orb.height);

      // Clip everything inside a circle matching the orb button
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R - 2, 0, Math.PI * 2);
      ctx.clip();

      blobs.forEach((blob, i) => {
        blobPhases[i] += blob.speed + vol * 0.018;
        const ph = blobPhases[i];

        // Position drifts in a slow Lissajous pattern
        const driftX = Math.sin(ph * 0.9 + i * 1.3) * R * 0.28 * (1 + vol * 0.5);
        const driftY = Math.cos(ph * 0.7 + i * 0.9) * R * 0.28 * (1 + vol * 0.5);
        const bx = cx + (blob.px - 0.5) * R * 1.1 + driftX;
        const by = cy + (blob.py - 0.5) * R * 1.1 + driftY;

        // Blob radius breathes with volume
        const baseR = R * (0.38 + i * 0.06);
        const blobR = baseR * (1 + vol * 0.55 + Math.sin(ph * 1.4) * 0.12);

        // Radial gradient per blob — opaque centre, transparent edge
        const [r, g, b] = blob.color;
        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, blobR);
        grad.addColorStop(0,   `rgba(${r}, ${g}, ${b}, ${0.55 + vol * 0.35})`);
        grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${0.25 + vol * 0.15})`);
        grad.addColorStop(1,   `rgba(${r}, ${g}, ${b}, 0)`);

        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bx, by, blobR, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
    };

    draw();
  }, []);

  // ── Waveform: start capturing from mic ───────────────────────
  const startWaveform = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;
      drawWaveform();
      drawOrbInner();
    } catch {
      // Microphone permission denied — waveform won't show but recording still works
    }
  }, [drawWaveform, drawOrbInner]);

  // ── Handle click ─────────────────────────────────────────────
  const handleClick = useCallback(async () => {
    if (micState === "idle") {
      setMicState("recording");
      await startWaveform();
      await startRecording();
    } else if (micState === "recording") {
      stopWaveform();
      await stopRecording();
      setMicState("analyzing");
    }
  }, [micState, startRecording, stopRecording, startWaveform, stopWaveform]);

  // ── When audioBuffer is ready → analyze ──────────────────────
  useEffect(() => {
    if (audioBuffer && micState === "analyzing") {
      analyzeFromBuffer(audioBuffer, "Recording");
    }
  }, [audioBuffer, micState, analyzeFromBuffer]);

  // ── When analysis completes → show result ────────────────────
  useEffect(() => {
    if (result && !isAnalyzing && micState === "analyzing") {
      setAnalysis(result);
      setMicState("done");
      setShowDone(true);
      const t = setTimeout(() => {
        setShowDone(false);
        setMicState("idle");
        onResult(result);
      }, 800);
      return () => clearTimeout(t);
    }
  }, [result, isAnalyzing, micState, setAnalysis, onResult]);

  // ── Cleanup on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopWaveform();
    };
  }, [stopWaveform]);

  // ── Reset ─────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    stopWaveform();
    resetRecording();
    setMicState("idle");
    setShowDone(false);
  }, [stopWaveform, resetRecording]);

  // ── Cancel — abort recording or analyzing and return to idle ──
  const handleCancel = useCallback(() => {
    if (micState === "idle" || micState === "done") return;
    stopWaveform();
    resetRecording();
    setMicState("idle");
    setShowDone(false);
  }, [micState, stopWaveform, resetRecording]);

  // ── Escape key → cancel ───────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleCancel]);

  // ── Click outside → cancel ────────────────────────────────────
  useEffect(() => {
    if (micState === "idle" || micState === "done") return;
    const onPointerDown = (e: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        handleCancel();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [micState, handleCancel]);

  // ── Ring colours by state ─────────────────────────────────────
  const isActive = micState === "recording";
  const isProcessing = micState === "analyzing";

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-6 select-none">
      {/* Outer rings container */}
      <div className="relative flex items-center justify-center">

        {/* Shazam-style expanding rings — only while recording */}
        {isActive && (
          <>
            <div
              className="ping-ring absolute rounded-full border-2 border-violet-400/60"
              style={{ width: 220, height: 220, animationDelay: "0s" }}
            />
            <div
              className="ping-ring absolute rounded-full border-2 border-purple-400/40"
              style={{ width: 220, height: 220, animationDelay: "0.55s" }}
            />
            <div
              className="ping-ring absolute rounded-full border border-fuchsia-400/30"
              style={{ width: 220, height: 220, animationDelay: "1.1s" }}
            />
          </>
        )}

        {/* The mic circle */}
        <button
          onClick={handleClick}
          disabled={isProcessing || showDone}
          aria-label={
            isActive ? "Stop recording" : "Start recording"
          }
          className={[
            "relative z-10 flex items-center justify-center rounded-full transition-all duration-300",
            "focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-400/60",
            isActive
              ? "w-[180px] h-[180px] cursor-pointer"
              : isProcessing || showDone
              ? "w-[180px] h-[180px] cursor-default"
              : "w-[180px] h-[180px] cursor-pointer mic-breathe",
          ].join(" ")}
          style={{
            background: showDone
              ? "radial-gradient(circle at 35% 35%, #4ade80, #16a34a)"
              : isActive
              ? "radial-gradient(circle at 35% 35%, #c084fc, #7c3aed, #4f46e5)"
              : "radial-gradient(circle at 35% 35%, #a78bfa, #7c3aed, #4c1d95)",
            boxShadow: isActive
              ? "0 0 40px rgba(139,92,246,0.8), 0 0 80px rgba(139,92,246,0.3), inset 0 1px 0 rgba(255,255,255,0.15)"
              : "0 0 30px rgba(139,92,246,0.4), inset 0 1px 0 rgba(255,255,255,0.12)",
          }}
        >
          {/* Audio-reactive inner lava blobs — absolute, clipped by button's border-radius */}
          <canvas
            ref={orbCanvasRef}
            width={180}
            height={180}
            className={`absolute inset-0 rounded-full transition-opacity duration-500 ${isActive ? "opacity-100" : "opacity-0"}`}
            style={{ mixBlendMode: "screen" }}
          />

          {/* Inner shine ring */}
          <div className="absolute inset-3 rounded-full border border-white/10" />

          {/* Icon */}
          <div className="relative z-10">
            {showDone ? (
              <CheckCircle2 className="h-16 w-16 text-white" strokeWidth={1.5} />
            ) : isProcessing ? (
              /* Spinning arc */
              <svg className="h-16 w-16 animate-spin" viewBox="0 0 64 64">
                <circle
                  cx="32" cy="32" r="28"
                  fill="none"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="4"
                />
                <path
                  d="M32 4 A28 28 0 0 1 60 32"
                  fill="none"
                  stroke="white"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <Mic
                className={`h-16 w-16 text-white transition-transform duration-300 ${isActive ? "scale-90" : ""}`}
                strokeWidth={1.5}
              />
            )}
          </div>
        </button>
      </div>

      {/* Dolby On-style waveform canvas */}
      <canvas
        ref={canvasRef}
        width={260}
        height={56}
        className={`transition-opacity duration-300 ${isActive ? "opacity-100" : "opacity-0"}`}
        style={{ borderRadius: 8 }}
      />

      {/* Labels */}
      <div className="text-center space-y-1">
        {micState === "idle" && (
          <p className="text-white/60 text-sm font-medium tracking-wide">
            Tap to listen
          </p>
        )}
        {micState === "recording" && (
          <>
            <p className="text-violet-300 text-sm font-semibold tracking-widest uppercase">
              Listening
            </p>
            <p className="text-white/40 text-xs font-mono">
              {formatTime(duration)} · tap to stop
            </p>
          </>
        )}
        {micState === "analyzing" && (
          <p className="text-violet-300 text-sm font-medium">
            {progress || "Analysing…"}
          </p>
        )}
        {showDone && (
          <p className="text-emerald-400 text-sm font-semibold">Done!</p>
        )}
      </div>

      {/* Cancel button — visible while recording or analyzing */}
      {(micState === "recording" || micState === "analyzing") && (
        <button
          onClick={handleCancel}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/80 text-xs font-medium transition-all duration-200"
          aria-label="Cancel recording"
        >
          <X className="h-3 w-3" />
          Cancel  ·  or press Esc
        </button>
      )}

      {/* Reset link (after done or error) */}
      {micState === "done" && !showDone && (
        <button
          onClick={handleReset}
          className="text-xs text-white/30 hover:text-white/60 transition-colors underline underline-offset-2"
        >
          Record again
        </button>
      )}
    </div>
  );
}
