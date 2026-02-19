import { NextRequest, NextResponse } from "next/server";
import { generateHarmonyLines } from "@/lib/music/harmony-generator";
import type { MelodyNote, ChordWithFunction } from "@/types/music";

/**
 * POST /api/harmony
 * Generate harmony lines from a melody + chord progression.
 *
 * Body: { melody: MelodyNote[], chords: ChordWithFunction[] }
 * Returns: { harmonyLines: HarmonyLine[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { melody, chords } = body as {
      melody: MelodyNote[];
      chords: ChordWithFunction[];
    };

    if (!melody || !chords) {
      return NextResponse.json(
        { error: "Missing melody or chords in request body" },
        { status: 400 }
      );
    }

    const harmonyLines = generateHarmonyLines(melody, chords);

    return NextResponse.json({ harmonyLines });
  } catch (error) {
    console.error("Harmony generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate harmony" },
      { status: 500 }
    );
  }
}
