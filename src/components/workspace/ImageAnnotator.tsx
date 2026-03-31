import React, { useRef, useState, useEffect, useCallback } from "react";
import { X, Undo2, Redo2, Eraser, Check, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface ImageAnnotatorProps {
  imageSrc: string;
  imageName: string;
  onComplete: (dataUrl: string, name: string) => void;
  onCancel: () => void;
}

const COLORS = [
  { name: "red", value: "#FF3B30" },
  { name: "green", value: "#34C759" },
  { name: "blue", value: "#007AFF" },
  { name: "yellow", value: "#FFCC00" },
  { name: "white", value: "#FFFFFF" },
  { name: "black", value: "#000000" },
];

const ImageAnnotator: React.FC<ImageAnnotatorProps> = ({
  imageSrc,
  imageName,
  onComplete,
  onCancel,
}) => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState("#FF3B30");
  const [brushSize, setBrushSize] = useState(4);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isErasing, setIsErasing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const displayScale = useRef(1);

  // Load image and initialize canvas
  useEffect(() => {
    const img = new Image();
    // Only set crossOrigin for external URLs, not for data:/blob:/same-origin
    const isExternal = imageSrc.startsWith("http") && !imageSrc.startsWith(window.location.origin);
    if (isExternal) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      // Fit image within container while maintaining aspect ratio
      const maxW = container.clientWidth - 48;
      const maxH = container.clientHeight - 160;
      const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
      displayScale.current = scale;

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.style.width = `${img.naturalWidth * scale}px`;
      canvas.style.height = `${img.naturalHeight * scale}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);

      // Save initial state
      const initialState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([initialState]);
      setHistoryIndex(0);
      setImageLoaded(true);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  const getCanvasCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scale = displayScale.current;
      return {
        x: (e.clientX - rect.left) / scale,
        y: (e.clientY - rect.top) / scale,
      };
    },
    []
  );

  const startDrawing = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;

      setIsDrawing(true);
      const { x, y } = getCanvasCoords(e);

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = brushSize / displayScale.current;

      if (isErasing) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = brushColor;
      }
    },
    [brushColor, brushSize, isErasing, getCanvasCoords]
  );

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;

      const { x, y } = getCanvasCoords(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    },
    [isDrawing, getCanvasCoords]
  );

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    ctx.globalCompositeOperation = "source-over";

    // Save to history
    const newState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, newState];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [isDrawing, historyIndex]);

  const handleUndo = () => {
    if (historyIndex <= 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    const newIndex = historyIndex - 1;
    ctx.putImageData(history[newIndex], 0, 0);
    setHistoryIndex(newIndex);
  };

  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    const newIndex = historyIndex + 1;
    ctx.putImageData(history[newIndex], 0, 0);
    setHistoryIndex(newIndex);
  };

  const handleComplete = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onComplete(dataUrl, `${imageName}_annotated`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/80 flex items-center justify-center">
      <div
        ref={containerRef}
        className="bg-card border-brutal border-foreground w-[90vw] h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="h-12 border-b-brutal border-foreground flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-sm uppercase">
              {t("canvas.annotate")}
            </span>
            <span className="text-xs font-mono text-muted-foreground">
              {imageName}
            </span>
          </div>
          <button
            onClick={onCancel}
            className="w-9 h-9 flex items-center justify-center border-brutal border-foreground bg-card hover:bg-secondary brutal-press"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex items-center justify-center overflow-hidden bg-muted/30 p-6">
          {imageLoaded && (
            <canvas
              ref={canvasRef}
              className={cn(
                "border-brutal border-foreground shadow-[4px_4px_0px_0px_hsl(var(--foreground))]",
                isErasing ? "cursor-cell" : "cursor-crosshair"
              )}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
          )}
        </div>

        {/* Toolbar */}
        <div className="h-14 border-t-brutal border-foreground flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            {/* Colors */}
            {COLORS.map((c) => (
              <button
                key={c.name}
                onClick={() => {
                  setBrushColor(c.value);
                  setIsErasing(false);
                }}
                className={cn(
                  "w-7 h-7 border-brutal border-foreground brutal-press",
                  !isErasing && brushColor === c.value
                    ? "ring-2 ring-accent-yellow ring-offset-2 ring-offset-card"
                    : ""
                )}
                style={{ backgroundColor: c.value }}
              />
            ))}

            <div className="w-px h-7 bg-foreground mx-1" />

            {/* Eraser */}
            <button
              onClick={() => setIsErasing(!isErasing)}
              className={cn(
                "w-9 h-9 flex items-center justify-center border-brutal border-foreground brutal-press",
                isErasing
                  ? "bg-accent-yellow"
                  : "bg-card hover:bg-secondary"
              )}
            >
              <Eraser className="w-4 h-4" />
            </button>

            <div className="w-px h-7 bg-foreground mx-1" />

            {/* Brush size */}
            <button
              onClick={() => setBrushSize((s) => Math.max(s - 2, 2))}
              className="w-9 h-9 flex items-center justify-center border-brutal border-foreground bg-card hover:bg-secondary brutal-press"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs font-bold w-8 text-center">
              {brushSize}px
            </span>
            <button
              onClick={() => setBrushSize((s) => Math.min(s + 2, 32))}
              className="w-9 h-9 flex items-center justify-center border-brutal border-foreground bg-card hover:bg-secondary brutal-press"
            >
              <Plus className="w-4 h-4" />
            </button>

            <div className="w-px h-7 bg-foreground mx-1" />

            {/* Undo/Redo */}
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="w-9 h-9 flex items-center justify-center border-brutal border-foreground bg-card hover:bg-secondary brutal-press disabled:opacity-30"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="w-9 h-9 flex items-center justify-center border-brutal border-foreground bg-card hover:bg-secondary brutal-press disabled:opacity-30"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="h-9 px-5 flex items-center gap-2 border-brutal border-foreground bg-card font-bold text-sm uppercase brutal-press hover:bg-secondary"
            >
              {t("canvas.annotateCancel")}
            </button>
            <button
              onClick={handleComplete}
              className="h-9 px-5 flex items-center gap-2 border-brutal border-foreground bg-accent-green font-bold text-sm uppercase brutal-press hover:brightness-110"
            >
              <Check className="w-4 h-4" />
              {t("canvas.annotateExport")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export { ImageAnnotator };
