"use client";

import { useSessionStore } from "@/stores/session-store";
import { Button } from "@/components/ui/button";
import { Music, BookOpen } from "lucide-react";

/**
 * Toggle between Standard (C D E) and Solfege (Do Re Mi) notation display.
 * Reads/writes from the global session store.
 */
export function NotationSwitcher() {
  const { notationMode, setNotationMode } = useSessionStore();

  return (
    <div className="flex items-center gap-1 border rounded-lg p-0.5">
      <Button
        variant={notationMode === "solfege" ? "default" : "ghost"}
        size="sm"
        className="h-7 text-xs gap-1.5"
        onClick={() => setNotationMode("solfege")}
      >
        <BookOpen className="h-3 w-3" />
        Solfege
      </Button>
      <Button
        variant={notationMode === "standard" ? "default" : "ghost"}
        size="sm"
        className="h-7 text-xs gap-1.5"
        onClick={() => setNotationMode("standard")}
      >
        <Music className="h-3 w-3" />
        Standard
      </Button>
    </div>
  );
}
