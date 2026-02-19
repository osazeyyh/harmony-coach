"use client";

import { useCallback, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileMusic, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SheetUploaderProps {
  onFileSelected: (file: File, type: "musicxml" | "midi") => void;
}

export function SheetUploader({ onFileSelected }: SheetUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  function getFileType(file: File): "musicxml" | "midi" | null {
    const name = file.name.toLowerCase();
    if (name.endsWith(".musicxml") || name.endsWith(".xml") || name.endsWith(".mxl")) {
      return "musicxml";
    }
    if (name.endsWith(".mid") || name.endsWith(".midi")) {
      return "midi";
    }
    // Try by MIME type
    if (file.type.includes("midi")) return "midi";
    if (file.type.includes("xml")) return "musicxml";
    return null;
  }

  const handleFile = useCallback(
    (file: File) => {
      const type = getFileType(file);
      if (!type) {
        alert("Please upload a MusicXML (.musicxml, .xml) or MIDI (.mid, .midi) file.");
        return;
      }
      setSelectedFile(file);
      onFileSelected(file, type);
    },
    [onFileSelected]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <Card>
      <CardContent className="pt-6">
        {!selectedFile ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById("sheet-file-input")?.click()}
          >
            <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium mb-1">Upload sheet music</p>
            <p className="text-sm text-muted-foreground">
              Drag and drop or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports MusicXML (.musicxml, .xml) and MIDI (.mid, .midi)
            </p>
            <input
              id="sheet-file-input"
              type="file"
              accept=".musicxml,.xml,.mxl,.mid,.midi"
              className="hidden"
              onChange={handleInput}
            />
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 border rounded-lg">
            <FileMusic className="h-8 w-8 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedFile(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
