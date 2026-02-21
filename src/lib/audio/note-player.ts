/**
 * Simple note playback utility using Tone.js.
 * Provides a singleton synth for playing individual notes
 * and sequences of notes on demand.
 *
 * Tone.js is browser-only. It is loaded lazily via dynamic import()
 * so it never runs during SSR and Turbopack never pre-chunks it for the server.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let toneModule: any = null;
let synth: unknown = null;

async function ensureTone() {
  if (!toneModule) {
    toneModule = await import("tone");
  }
  await toneModule.start();
  return toneModule;
}

async function ensureSynth() {
  const Tone = await ensureTone();
  if (!synth) {
    synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.02, decay: 0.15, sustain: 0.3, release: 0.8 },
      volume: -8,
    }).toDestination();
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return synth as any;
}

/**
 * Play a single note immediately.
 */
export async function playNote(noteName: string, duration: string = "8n") {
  const s = await ensureSynth();
  s.triggerAttackRelease(noteName, duration);
}

/**
 * Play a chord (multiple notes simultaneously).
 */
export async function playChord(noteNames: string[], duration: string = "4n") {
  const s = await ensureSynth();
  s.triggerAttackRelease(noteNames, duration);
}

interface SequenceNote {
  note: string;
  duration: number; // beats
  startBeat: number;
}

/**
 * Play a sequence of notes at a given tempo.
 * Uses setTimeout for reliable UI callbacks (not Tone.Draw).
 * Returns a stop function.
 */
export async function playSequence(
  notes: SequenceNote[],
  tempo: number,
  onNote?: (index: number) => void,
  onDone?: () => void,
): Promise<() => void> {
  const Tone = await ensureTone();
  const s = await ensureSynth();

  Tone.getTransport().stop();
  Tone.getTransport().cancel();
  Tone.getTransport().bpm.value = tempo;
  Tone.getTransport().position = 0;

  let stopped = false;
  const timers: ReturnType<typeof setTimeout>[] = [];

  const secPerBeat = 60 / tempo;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const part = new (Tone.Part as any)(
    (time: number, event: { note: string; duration: string }) => {
      s.triggerAttackRelease(event.note, event.duration, time);
    },
    notes.map((n) => [
      n.startBeat * secPerBeat,
      {
        note: n.note,
        duration: `${Math.max(n.duration, 0.25) * secPerBeat}`,
      },
    ]),
  );

  part.start(0);
  Tone.getTransport().start();

  notes.forEach((n, idx) => {
    const delayMs = n.startBeat * secPerBeat * 1000;
    const t = setTimeout(() => {
      if (!stopped) onNote?.(idx);
    }, delayMs);
    timers.push(t);
  });

  if (notes.length > 0) {
    const lastNote = notes[notes.length - 1];
    const endMs = (lastNote.startBeat + lastNote.duration + 0.3) * secPerBeat * 1000;
    const endTimer = setTimeout(() => {
      if (!stopped) onDone?.();
    }, endMs);
    timers.push(endTimer);
  }

  return () => {
    stopped = true;
    timers.forEach(clearTimeout);
    try { part.stop(); part.dispose(); } catch { /* ignore */ }
    try { Tone.getTransport().stop(); Tone.getTransport().cancel(); } catch { /* ignore */ }
  };
}

/**
 * Dispose of the synth on cleanup.
 */
export async function disposeSynth() {
  if (synth) {
    try { (synth as { dispose: () => void }).dispose(); } catch { /* ignore */ }
    synth = null;
  }
}
