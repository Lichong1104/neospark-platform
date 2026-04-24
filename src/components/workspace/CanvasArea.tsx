import React, { useRef, useCallback, useEffect, useState } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Trash2,
  Copy,
  Download,
  PenTool,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ImageAnnotator } from "./ImageAnnotator";
import { toFetchableAssetUrl } from "@/lib/assetFetchUrl";

export interface CanvasImage {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  selected: boolean;
  src: string;
  name: string;
  type?: "image" | "video";
  loading?: boolean;
}

interface CanvasAreaProps {
  onImageSelect?: (imageId: string | null) => void;
  onSelectionChange?: (imageIds: string[]) => void;
  canvasImages: CanvasImage[];
  onCanvasImagesChange: React.Dispatch<React.SetStateAction<CanvasImage[]>>;
  onFileDrop?: (files: File[], position: { x: number; y: number }) => void;
  isFileDropLoading?: boolean;
}

const CANVAS_IMAGE_MAX_SIZE = 256;

const toCanvasSize = (
  width: number,
  height: number
): { width: number; height: number } => {
  if (width <= 0 || height <= 0) {
    return { width: CANVAS_IMAGE_MAX_SIZE, height: CANVAS_IMAGE_MAX_SIZE };
  }
  const scale = Math.min(
    CANVAS_IMAGE_MAX_SIZE / width,
    CANVAS_IMAGE_MAX_SIZE / height
  );
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
};

const CanvasArea: React.FC<CanvasAreaProps> = ({
  onImageSelect,
  onSelectionChange,
  canvasImages,
  onCanvasImagesChange,
  onFileDrop,
  isFileDropLoading = false,
}) => {
  const { t } = useTranslation();
  const images = canvasImages;
  const setImages = onCanvasImagesChange;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const primarySelectedId =
    selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null;
  const [annotatingImage, setAnnotatingImage] = useState<CanvasImage | null>(
    null
  );
  const [previewImage, setPreviewImage] = useState<CanvasImage | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const ZOOM_MIN = 25;
  const ZOOM_MAX = 300;
  const ZOOM_STEP = 10;

  const [zoom, setZoom] = useState(100);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const [isPanning, setIsPanning] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageDragStart, setImageDragStart] = useState({ x: 0, y: 0 });
  const activePointerIdRef = useRef<number | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  const setSelection = useCallback(
    (nextSelectedIds: string[]) => {
      setSelectedIds(nextSelectedIds);
      onSelectionChange?.(nextSelectedIds);
      setImages((prev) =>
        prev.map((img) => ({
          ...img,
          selected: nextSelectedIds.includes(img.id),
        }))
      );
      onImageSelect?.(
        nextSelectedIds.length > 0
          ? nextSelectedIds[nextSelectedIds.length - 1]
          : null
      );
    },
    [onImageSelect, onSelectionChange, setImages]
  );

  const isMultiSelectGesture = (e: React.MouseEvent) =>
    !!(e.ctrlKey || e.metaKey || e.shiftKey);

  const handleImageClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const multi = isMultiSelectGesture(e);

    if (!multi) {
      // Single-select: always keep this item selected.
      // (Deselect via clicking empty canvas.)
      setSelection([id]);
      return;
    }

    // Multi-select: toggle membership; last clicked becomes primary.
    // Use functional update so this stays correct even if mousedown/click batch oddly.
    setSelectedIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
      setImages((imgs) =>
        imgs.map((img) => ({ ...img, selected: next.includes(img.id) }))
      );
      onImageSelect?.(next.length > 0 ? next[next.length - 1] : null);
      onSelectionChange?.(next);
      return next;
    });
  };

  const handleImageMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const img = images.find((i) => i.id === id);
    if (!img) return;

    const multi = isMultiSelectGesture(e);
    // Ctrl/Shift: selection is handled in onClick only (avoids double-toggle with mousedown+click).
    if (!multi) {
      if (!selectedIds.includes(id)) {
        setSelection([id]);
      } else if (selectedIds.length === 0) {
        setSelection([id]);
      }
    }

    setIsDraggingImage(true);
    setDraggedImageId(id);
    setDragStart({ x: e.clientX, y: e.clientY });
    setImageDragStart({ x: img.x, y: img.y });
  };

  const handleImagePointerDown = (e: React.PointerEvent, id: string) => {
    // Only left click / primary pointer
    if (e.button !== 0) return;
    e.stopPropagation();
    // Keep focus / selection behaviors consistent
    // (Selection itself is still handled by click for multi-select.)
    const img = images.find((i) => i.id === id);
    if (!img) return;

    const multi = isMultiSelectGesture(e as unknown as React.MouseEvent);
    if (!multi) {
      if (!selectedIds.includes(id)) {
        setSelection([id]);
      } else if (selectedIds.length === 0) {
        setSelection([id]);
      }
    }

    activePointerIdRef.current = e.pointerId;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    setIsDraggingImage(true);
    setDraggedImageId(id);
    setDragStart({ x: e.clientX, y: e.clientY });
    setImageDragStart({ x: img.x, y: img.y });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (
      e.target === canvasRef.current ||
      (e.target as HTMLElement).classList.contains("canvas-background")
    ) {
      setIsPanning(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      setSelection([]);
    }
  };

  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target === canvasRef.current || target.classList.contains("canvas-background")) {
      activePointerIdRef.current = e.pointerId;
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      setIsPanning(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      setSelection([]);
    }
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setPanOffset({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      } else if (isDraggingImage && draggedImageId) {
        const scale = zoom / 100;
        const deltaX = (e.clientX - dragStart.x) / scale;
        const deltaY = (e.clientY - dragStart.y) / scale;
        setImages(
          images.map((img) =>
            img.id === draggedImageId
              ? {
                  ...img,
                  x: imageDragStart.x + deltaX,
                  y: imageDragStart.y + deltaY,
                }
              : img
          )
        );
      }
    },
    [
      isPanning,
      isDraggingImage,
      draggedImageId,
      dragStart,
      imageDragStart,
      zoom,
    ]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (activePointerIdRef.current != null && e.pointerId !== activePointerIdRef.current) return;
      if (isPanning) {
        setPanOffset({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      } else if (isDraggingImage && draggedImageId) {
        const scale = zoom / 100;
        const deltaX = (e.clientX - dragStart.x) / scale;
        const deltaY = (e.clientY - dragStart.y) / scale;
        setImages(
          images.map((img) =>
            img.id === draggedImageId
              ? {
                  ...img,
                  x: imageDragStart.x + deltaX,
                  y: imageDragStart.y + deltaY,
                }
              : img
          )
        );
      }
    },
    [
      isPanning,
      isDraggingImage,
      draggedImageId,
      dragStart,
      imageDragStart,
      zoom,
    ]
  );

  const handleMouseUp = () => {
    setIsPanning(false);
    setIsDraggingImage(false);
    setDraggedImageId(null);
  };

  useEffect(() => {
    const stopDragging = () => {
      setIsPanning(false);
      setIsDraggingImage(false);
      setDraggedImageId(null);
      activePointerIdRef.current = null;
    };

    window.addEventListener("mouseup", stopDragging);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
    window.addEventListener("lostpointercapture", stopDragging as any);
    window.addEventListener("blur", stopDragging);

    return () => {
      window.removeEventListener("mouseup", stopDragging);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
      window.removeEventListener("lostpointercapture", stopDragging as any);
      window.removeEventListener("blur", stopDragging);
    };
  }, []);

  useEffect(() => {
    if (!previewImage) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewImage(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewImage]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + ZOOM_STEP, ZOOM_MAX));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - ZOOM_STEP, ZOOM_MIN));
  const handleResetView = () => {
    setZoom(100);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    const selectedSet = new Set(selectedIds);
    const deletedPrimary = primarySelectedId
      ? images.find((img) => img.id === primarySelectedId)
      : undefined;
    setImages(images.filter((img) => !selectedSet.has(img.id)));
    setSelection([]);
    toast.success(
      t("canvas.deleted", {
        name:
          selectedIds.length === 1
            ? deletedPrimary?.name
            : `${selectedIds.length} items`,
      })
    );
  };

  const handleDuplicateSelected = () => {
    if (selectedIds.length === 0) return;
    const selectedSet = new Set(selectedIds);
    const originals = images.filter((img) => selectedSet.has(img.id));
    if (originals.length === 0) return;

    const duplicates: CanvasImage[] = originals.map((original, idx) => ({
      ...original,
      id: Math.random().toString(36).substr(2, 8).toUpperCase(),
      x: original.x + 30 + idx * 10,
      y: original.y + 30 + idx * 10,
      selected: false,
      name: `${original.name}_copy`,
    }));
    setImages([...images, ...duplicates]);
    toast.success(
      t("canvas.duplicated", {
        name:
          originals.length === 1
            ? originals[0].name
            : `${originals.length} items`,
      })
    );
  };

  const handleDownloadSelected = async () => {
    if (selectedIds.length === 0) return;
    const selectedSet = new Set(selectedIds);
    const items = images.filter((i) => selectedSet.has(i.id));
    if (items.length === 0) return;

    const downloadOne = async (img: CanvasImage) => {
      const fileName = `${img.name}.${img.type === "video" ? "mp4" : "jpg"}`;
      const url = toFetchableAssetUrl(img.src);
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    };

    try {
      for (const img of items) {
        await downloadOne(img);
      }
      toast.success(
        t("canvas.downloading", {
          name: items.length === 1 ? items[0].name : `${items.length} items`,
        })
      );
    } catch {
      toast.error(t("assetSidebar.downloadFailed"));
    }
  };

  const handleAnnotateSelected = () => {
    if (selectedIds.length !== 1) return;
    const img = images.find((i) => i.id === selectedIds[0]);
    if (!img || img.type === "video") return;
    setAnnotatingImage(img);
  };

  const handleAnnotationComplete = (dataUrl: string, name: string) => {
    const newImage: CanvasImage = {
      id: Math.random().toString(36).substr(2, 8).toUpperCase(),
      x: (annotatingImage?.x ?? 200) + 40,
      y: (annotatingImage?.y ?? 200) + 40,
      width: annotatingImage?.width ?? 200,
      height: annotatingImage?.height ?? 200,
      selected: false,
      src: dataUrl,
      name,
    };
    setImages([...images, newImage]);
    setAnnotatingImage(null);
    toast.success(t("canvas.annotationExported", { name }));
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -5 : 5;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) {
        setZoom((prev) => Math.min(Math.max(prev + delta, ZOOM_MIN), ZOOM_MAX));
        return;
      }

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setZoom((prevZoom) => {
        const nextZoom = Math.min(Math.max(prevZoom + delta, ZOOM_MIN), ZOOM_MAX);
        const prevScale = prevZoom / 100;
        const nextScale = nextZoom / 100;

        // Keep the canvas point under cursor stationary while zooming.
        setPanOffset((prevPan) => {
          const worldX = (mouseX - prevPan.x) / prevScale;
          const worldY = (mouseY - prevPan.y) / prevScale;
          return {
            x: mouseX - worldX * nextScale,
            y: mouseY - worldY * nextScale,
          };
        });

        return nextZoom;
      });
    },
    [ZOOM_MAX, ZOOM_MIN]
  );

  const selectedItem = primarySelectedId
    ? images.find((i) => i.id === primarySelectedId)
    : null;

  // ===== Drag & Drop file support =====
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files).filter(
        (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
      );
      if (files.length === 0) return;

      // Calculate canvas-space position from drop point
      const rect = canvasRef.current?.getBoundingClientRect();
      const scale = zoom / 100;
      const dropX = rect ? (e.clientX - rect.left - panOffset.x) / scale : 120;
      const dropY = rect
        ? (e.clientY - rect.top - 40 - panOffset.y) / scale
        : 60; // 40 = header height

      // Upload first, then add to canvas from persisted URL (no base64 local preview).
      onFileDrop?.(files, { x: dropX, y: dropY });
    },
    [zoom, panOffset, onFileDrop]
  );

  return (
    <div
      className={cn(
        "relative w-full h-full bg-background overflow-hidden",
        isDragOver && "ring-4 ring-inset ring-accent-cyan/50"
      )}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onPointerMove={handlePointerMove}
      onPointerUp={handleMouseUp}
      onPointerCancel={handleMouseUp}
      onWheel={handleWheel}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="absolute inset-0 bg-grid-lines pointer-events-none" />

      {/* Drop overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-accent-cyan/10 flex items-center justify-center pointer-events-none">
          <div className="border-2 border-dashed border-accent-cyan px-8 py-6 bg-card/90 backdrop-blur-sm">
            <p className="text-sm font-bold uppercase tracking-wider text-accent-cyan">
              {t("canvas.dropToAdd")}
            </p>
          </div>
        </div>
      )}

      {/* Uploading overlay */}
      {isFileDropLoading && (
        <div className="absolute inset-0 z-40 bg-card/35 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2 border-brutal border-foreground bg-card px-4 py-3 text-xs font-bold uppercase tracking-wider">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t("workspace.uploading")}
          </div>
        </div>
      )}

      {/* Canvas Header Bar */}
      <div
        id="onboarding-canvas-toolbar"
        className="absolute top-0 left-0 right-0 h-11 bg-card/95 backdrop-blur-sm border-b border-foreground/20 flex items-center justify-between px-3 z-10"
      >
        <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
          <span className="px-2.5 py-1 bg-secondary/50 border border-foreground/10">
            {t("canvas.objects")}: {images.length}
          </span>
          <span className="px-2.5 py-1 bg-secondary/50 border border-foreground/10">
            {zoom}%
          </span>
          <span className="px-2.5 py-1 bg-secondary/50 border border-foreground/10">
            {Math.round(panOffset.x)}, {Math.round(panOffset.y)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 flex items-center justify-center hover:bg-secondary transition-none"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 flex items-center justify-center hover:bg-secondary transition-none"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetView}
            className="w-8 h-8 flex items-center justify-center hover:bg-secondary transition-none"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleFullscreen}
            className="w-8 h-8 flex items-center justify-center hover:bg-secondary transition-none"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {selectedIds.length > 0 && (
            <>
              <div className="w-px h-5 bg-foreground/15 mx-1" />
              {selectedIds.length === 1 && selectedItem?.type !== "video" && (
                <button
                  onClick={handleAnnotateSelected}
                  className="w-7 h-7 flex items-center justify-center bg-accent-yellow/20 hover:bg-accent-yellow/40 transition-none"
                  title={t("canvas.annotate")}
                >
                  <PenTool className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={handleDuplicateSelected}
                className="w-7 h-7 flex items-center justify-center hover:bg-accent-cyan/20 transition-none"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDownloadSelected}
                className="w-7 h-7 flex items-center justify-center hover:bg-accent-green/20 transition-none"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDeleteSelected}
                className="w-7 h-7 flex items-center justify-center hover:bg-accent-red/20 text-accent-red transition-none"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Canvas Area */}
      <div
        id="onboarding-canvas-stage"
        ref={canvasRef}
        className={cn(
          "absolute inset-0 top-10 canvas-background",
          isPanning ? "cursor-grabbing" : "cursor-grab"
        )}
        onMouseDown={handleCanvasMouseDown}
        onPointerDown={handleCanvasPointerDown}
        style={{ backgroundPosition: `${panOffset.x}px ${panOffset.y}px` }}
      >
        <div
          className="absolute origin-center pointer-events-none"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${
              zoom / 100
            })`,
            transformOrigin: "0 0",
          }}
        >
          {images.map((img) => (
            <div
              key={img.id}
              onClick={(e) => handleImageClick(e, img.id)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (!img.loading && img.type !== "video") {
                  setPreviewImage(img);
                }
              }}
              onMouseDown={(e) => handleImageMouseDown(e, img.id)}
              onPointerDown={(e) => handleImagePointerDown(e, img.id)}
              className={cn(
                "absolute pointer-events-auto",
                img.selected
                  ? "ring-2 ring-accent-cyan ring-offset-1 ring-offset-background"
                  : "",
                isDraggingImage && draggedImageId === img.id
                  ? "cursor-grabbing"
                  : "cursor-pointer"
              )}
              style={{
                left: img.x,
                top: img.y,
                width: img.width,
                height: img.height,
              }}
            >
              <div className="w-full h-full overflow-hidden relative group shadow-lg">
                {img.loading ? (
                  <div className="w-full h-full bg-secondary flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {t("common.loading")}
                    </span>
                  </div>
                ) : img.type === "video" ? (
                  <video
                    src={img.src}
                    className="w-full h-full object-cover"
                    muted
                    loop
                    autoPlay
                    draggable={false}
                    controls={img.selected}
                  />
                ) : (
                  <img
                    src={img.src}
                    alt={img.name}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                )}
                {!img.loading && img.type !== "video" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewImage(img);
                    }}
                    className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center bg-foreground/80 text-card opacity-0 group-hover:opacity-100 transition-opacity"
                    title={t("canvas.preview")}
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                )}
                {/* Name label on hover */}
                <div className="absolute bottom-0 left-0 right-0 bg-foreground/80 text-card px-2 py-0.5 text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity truncate">
                  {img.type === "video" && (
                    <span className="text-accent-purple mr-1">▶</span>
                  )}
                  {img.name}
                </div>
              </div>
              {img.selected && (
                <>
                  <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-accent-cyan border border-card" />
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-accent-cyan border border-card" />
                  <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-accent-cyan border border-card" />
                  <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-accent-cyan border border-card" />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {images.length === 0 && !isDragOver && (
        <div className="absolute inset-0 top-10 flex items-center justify-center pointer-events-none">
          <div className="text-center space-y-2 opacity-40">
            <div className="w-16 h-16 border-2 border-dashed border-foreground/20 flex items-center justify-center mx-auto">
              <PenTool className="w-6 h-6 text-foreground/30" />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-foreground/30">
              {t("canvas.emptyHint")}
            </p>
          </div>
        </div>
      )}

      {/* Help Hint */}
      <div className="absolute bottom-3 left-3 text-[9px] font-mono text-muted-foreground/50 bg-card/50 backdrop-blur-sm px-2 py-1 border border-foreground/5">
        {t("canvas.helpHint")}
      </div>

      {/* Annotation Modal */}
      {annotatingImage && (
        <ImageAnnotator
          imageSrc={annotatingImage.src}
          imageName={annotatingImage.name}
          onComplete={handleAnnotationComplete}
          onCancel={() => setAnnotatingImage(null)}
        />
      )}

      {/* Image Preview (Antd-like lightbox) */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-foreground/85 flex items-center justify-center p-6"
          onClick={() => setPreviewImage(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 w-9 h-9 border border-card/30 text-card hover:bg-card/20"
            onClick={(e) => {
              e.stopPropagation();
              setPreviewImage(null);
            }}
            aria-label="Close preview"
          >
            ×
          </button>
          <img
            src={previewImage.src}
            alt={previewImage.name}
            className="max-w-[92vw] max-h-[88vh] object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
        </div>
      )}
    </div>
  );
};

export { CanvasArea };
