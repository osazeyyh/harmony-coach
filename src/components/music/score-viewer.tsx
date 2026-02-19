"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface ScoreViewerProps {
  musicXml: string;
  onMeasureClick?: (measureNumber: number) => void;
}

/**
 * OpenSheetMusicDisplay wrapper component.
 * Renders MusicXML as interactive sheet music notation.
 * Dynamically imported (no SSR) since OSMD requires browser APIs.
 */
export function ScoreViewer({ musicXml, onMeasureClick }: ScoreViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !musicXml) return;

    let cancelled = false;

    async function loadOSMD() {
      try {
        setLoading(true);
        setError(null);

        // Dynamic import of OSMD (it's a large library)
        const { OpenSheetMusicDisplay } = await import("opensheetmusicdisplay");

        if (cancelled || !containerRef.current) return;

        // Clear previous render
        containerRef.current.innerHTML = "";

        const osmd = new OpenSheetMusicDisplay(containerRef.current, {
          autoResize: true,
          drawTitle: true,
          drawComposer: false,
          drawCredits: false,
          drawPartNames: false,
          drawMeasureNumbers: true,
          drawTimeSignatures: true,
        });

        await osmd.load(musicXml);

        if (cancelled) return;

        osmd.render();
        osmdRef.current = osmd;
        setLoading(false);
      } catch (err) {
        console.error("OSMD error:", err);
        if (!cancelled) {
          setError("Failed to render sheet music");
          setLoading(false);
        }
      }
    }

    loadOSMD();

    return () => {
      cancelled = true;
    };
  }, [musicXml]);

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-destructive">
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Rendering notation...</p>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className="w-full min-h-[200px] overflow-x-auto"
      />
    </div>
  );
}
