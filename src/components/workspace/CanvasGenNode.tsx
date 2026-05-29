import React from "react";
import { Film, GripHorizontal, ImageIcon, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { CanvasImage } from "./CanvasArea";
import { CANVAS_GEN_COMPOSE_HEIGHT, CANVAS_GEN_NODE_WIDTH, getGenNodeTotalHeight, getGenPreviewHeight } from "@/lib/canvasGenNode";
import { CanvasImageGenCompose } from "./CanvasImageGenCompose";
import { CanvasVideoGenCompose } from "./CanvasVideoGenCompose";

export const CanvasGenNode: React.FC<{
  image: CanvasImage;
  canvasImages: CanvasImage[];
  selected: boolean;
  isDragging: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onDragStart: (e: React.PointerEvent) => void;
  onFulfilled: (nodeId: string, result: { src: string; name: string }) => void;
}> = ({
  image,
  canvasImages,
  selected,
  isDragging,
  onSelect,
  onDragStart,
  onFulfilled,
}) => {
  const { t } = useTranslation();
  const genType = image.genType ?? "image";
  const isGenerating = image.loading;
  const previewHeight = getGenPreviewHeight(genType);
  const accentClass =
    genType === "video" ? "text-accent-purple" : "text-accent-cyan";

  const handleFulfilled = (result: { src: string; name: string }) => {
    onFulfilled(image.id, result);
  };

  return (
    <div
      className={cn(
        "absolute pointer-events-auto flex flex-col overflow-hidden bg-card/95 backdrop-blur-[2px]",
        "border border-foreground/25 shadow-[3px_3px_0_0_hsl(var(--foreground)/0.08)]",
        selected && "border-accent-cyan/60 shadow-[0_0_0_1px_hsl(var(--accent-cyan)/0.35)]",
        isDragging ? "cursor-grabbing opacity-95" : "cursor-default"
      )}
      style={{
        left: image.x,
        top: image.y,
        width: CANVAS_GEN_NODE_WIDTH,
        height: getGenNodeTotalHeight(genType),
      }}
      onClick={onSelect}
    >
      <div
        className={cn(
          "group/preview shrink-0 px-2 pt-2",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
        onPointerDown={onDragStart}
      >
        <div className="mb-1.5 flex items-center justify-center gap-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70 opacity-0 transition-opacity group-hover/preview:opacity-100">
          <GripHorizontal className="h-3 w-3" />
          {t("canvas.dragToMove")}
        </div>
        <div
          className={cn(
            "relative flex flex-col items-center justify-center overflow-hidden",
            "rounded-sm border border-dashed border-foreground/18 bg-gradient-to-b from-secondary/25 to-secondary/5"
          )}
          style={{ height: previewHeight }}
        >
          {isGenerating ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className={cn("h-6 w-6 animate-spin", accentClass)} />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {t("intelligenceHub.generating")}
              </span>
            </div>
          ) : genType === "video" ? (
            <>
              <div
                className={cn(
                  "mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-accent-purple/10",
                  accentClass
                )}
              >
                <Film className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("canvas.genVideoPlaceholder")}
              </span>
            </>
          ) : (
            <>
              <div
                className={cn(
                  "mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-accent-cyan/10",
                  accentClass
                )}
              >
                <ImageIcon className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("canvas.genImagePlaceholder")}
              </span>
            </>
          )}
        </div>
      </div>

      <div
        className="min-h-0 flex-1 px-2 pb-2 pt-1"
        style={{ height: CANVAS_GEN_COMPOSE_HEIGHT }}
      >
        {genType === "video" ? (
          <CanvasVideoGenCompose
            canvasImages={canvasImages}
            onFulfilled={handleFulfilled}
          />
        ) : (
          <CanvasImageGenCompose
            canvasImages={canvasImages}
            onFulfilled={handleFulfilled}
          />
        )}
      </div>
    </div>
  );
};
