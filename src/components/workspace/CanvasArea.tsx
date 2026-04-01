import React, { useRef, useCallback, useState } from "react";
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Trash2, Copy, Download, PenTool } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ImageAnnotator } from "./ImageAnnotator";
import { STATIC_BASE_URL } from "@/api/request";

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
}

interface CanvasAreaProps {
  onImageSelect?: (imageId: string | null) => void;
  canvasImages: CanvasImage[];
  onCanvasImagesChange: (images: CanvasImage[]) => void;
  onFileDrop?: (files: File[], position: { x: number; y: number }) => void;
}

const CanvasArea: React.FC<CanvasAreaProps> = ({ onImageSelect, canvasImages, onCanvasImagesChange, onFileDrop }) => {
  const { t } = useTranslation();
  const images = canvasImages;
  const setImages = onCanvasImagesChange;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [annotatingImage, setAnnotatingImage] = useState<CanvasImage | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const [zoom, setZoom] = useState(100);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  
  const [isPanning, setIsPanning] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageDragStart, setImageDragStart] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleImageClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSelectedId = selectedId === id ? null : id;
    setSelectedId(newSelectedId);
    setImages(images.map((img) => ({ ...img, selected: img.id === newSelectedId })));
    onImageSelect?.(newSelectedId);
  };

  const handleImageMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const img = images.find(i => i.id === id);
    if (!img) return;
    setIsDraggingImage(true);
    setDraggedImageId(id);
    setDragStart({ x: e.clientX, y: e.clientY });
    setImageDragStart({ x: img.x, y: img.y });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-background')) {
      setIsPanning(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      setSelectedId(null);
      setImages(images.map(img => ({ ...img, selected: false })));
      onImageSelect?.(null);
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPanOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    } else if (isDraggingImage && draggedImageId) {
      const scale = zoom / 100;
      const deltaX = (e.clientX - dragStart.x) / scale;
      const deltaY = (e.clientY - dragStart.y) / scale;
      setImages(images.map(img =>
        img.id === draggedImageId
          ? { ...img, x: imageDragStart.x + deltaX, y: imageDragStart.y + deltaY }
          : img
      ));
    }
  }, [isPanning, isDraggingImage, draggedImageId, dragStart, imageDragStart, zoom]);

  const handleMouseUp = () => {
    setIsPanning(false);
    setIsDraggingImage(false);
    setDraggedImageId(null);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 25));
  const handleResetView = () => { setZoom(100); setPanOffset({ x: 0, y: 0 }); };

  const handleDeleteSelected = () => {
    if (!selectedId) return;
    const deletedImage = images.find(img => img.id === selectedId);
    setImages(images.filter(img => img.id !== selectedId));
    setSelectedId(null);
    onImageSelect?.(null);
    toast.success(t("canvas.deleted", { name: deletedImage?.name }));
  };

  const handleDuplicateSelected = () => {
    if (!selectedId) return;
    const original = images.find(img => img.id === selectedId);
    if (!original) return;
    const duplicate: CanvasImage = {
      ...original,
      id: Math.random().toString(36).substr(2, 8).toUpperCase(),
      x: original.x + 30,
      y: original.y + 30,
      selected: false,
      name: `${original.name}_copy`,
    };
    setImages([...images, duplicate]);
    toast.success(t("canvas.duplicated", { name: original.name }));
  };

  const handleDownloadSelected = async () => {
    if (!selectedId) return;
    const img = images.find(i => i.id === selectedId);
    if (!img) return;

    const buildDirectUrl = (src: string) => {
      if (!src || src.startsWith("data:")) return src;
      if (/^https?:\/\//i.test(src)) return src;
      return src.startsWith("/") ? `${STATIC_BASE_URL}${src}` : `${STATIC_BASE_URL}/${src}`;
    };

    try {
      const url = buildDirectUrl(img.src);
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${img.name}.${img.type === "video" ? "mp4" : "jpg"}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
      toast.success(t("canvas.downloading", { name: img.name }));
    } catch {
      // Fallback for resources that cannot be fetched (e.g. strict CORS).
      const link = document.createElement("a");
      link.href = buildDirectUrl(img.src);
      link.download = `${img.name}.${img.type === "video" ? "mp4" : "jpg"}`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(t("canvas.downloading", { name: img.name }));
    }
  };

  const handleAnnotateSelected = () => {
    if (!selectedId) return;
    const img = images.find(i => i.id === selectedId);
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

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -5 : 5;
    setZoom(prev => Math.min(Math.max(prev + delta, 25), 200));
  }, []);

  const selectedItem = selectedId ? images.find(i => i.id === selectedId) : null;

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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files).filter(
      f => f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    if (files.length === 0) return;

    // Calculate canvas-space position from drop point
    const rect = canvasRef.current?.getBoundingClientRect();
    const scale = zoom / 100;
    const dropX = rect ? (e.clientX - rect.left - panOffset.x) / scale : 120;
    const dropY = rect ? (e.clientY - rect.top - 40 - panOffset.y) / scale : 60; // 40 = header height

    // For immediate preview: read files as data URLs and add to canvas
    files.forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const isVideo = file.type.startsWith("video/");
        const newItem: CanvasImage = {
          id: Math.random().toString(36).substr(2, 8).toUpperCase(),
          x: dropX + idx * 30,
          y: dropY + idx * 30,
          width: isVideo ? 320 : 256,
          height: isVideo ? 180 : 256,
          selected: false,
          src: dataUrl,
          name: file.name,
          type: isVideo ? "video" : "image",
        };
        onCanvasImagesChange([...canvasImages, newItem]);
      };
      reader.readAsDataURL(file);
    });

    // Also trigger upload callback so files get persisted to backend
    onFileDrop?.(files, { x: dropX, y: dropY });
  }, [zoom, panOffset, canvasImages, onCanvasImagesChange, onFileDrop]);

  return (
    <div
      className={cn(
        "relative w-full h-full bg-background overflow-hidden",
        isDragOver && "ring-4 ring-inset ring-accent-cyan/50"
      )}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
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

      {/* Canvas Header Bar */}
      <div className="absolute top-0 left-0 right-0 h-11 bg-card/95 backdrop-blur-sm border-b border-foreground/20 flex items-center justify-between px-3 z-10">
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
          <button onClick={handleZoomOut} className="w-8 h-8 flex items-center justify-center hover:bg-secondary transition-none">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={handleZoomIn} className="w-8 h-8 flex items-center justify-center hover:bg-secondary transition-none">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={handleResetView} className="w-8 h-8 flex items-center justify-center hover:bg-secondary transition-none">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={handleFullscreen} className="w-8 h-8 flex items-center justify-center hover:bg-secondary transition-none">
            <Maximize2 className="w-4 h-4" />
          </button>

          {selectedId && (
            <>
              <div className="w-px h-5 bg-foreground/15 mx-1" />
              {selectedItem?.type !== "video" && (
                <button onClick={handleAnnotateSelected} className="w-7 h-7 flex items-center justify-center bg-accent-yellow/20 hover:bg-accent-yellow/40 transition-none" title={t("canvas.annotate")}>
                  <PenTool className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={handleDuplicateSelected} className="w-7 h-7 flex items-center justify-center hover:bg-accent-cyan/20 transition-none">
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleDownloadSelected} className="w-7 h-7 flex items-center justify-center hover:bg-accent-green/20 transition-none">
                <Download className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleDeleteSelected} className="w-7 h-7 flex items-center justify-center hover:bg-accent-red/20 text-accent-red transition-none">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Canvas Area */}
      <div
        ref={canvasRef}
        className={cn(
          "absolute inset-0 top-10 canvas-background",
          isPanning ? "cursor-grabbing" : "cursor-grab"
        )}
        onMouseDown={handleCanvasMouseDown}
        style={{ backgroundPosition: `${panOffset.x}px ${panOffset.y}px` }}
      >
        <div
          className="absolute origin-center pointer-events-none"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom / 100})`,
            transformOrigin: "0 0",
          }}
        >
          {images.map((img) => (
            <div
              key={img.id}
              onClick={(e) => handleImageClick(e, img.id)}
              onMouseDown={(e) => handleImageMouseDown(e, img.id)}
              className={cn(
                "absolute pointer-events-auto",
                img.selected ? "ring-2 ring-accent-cyan ring-offset-1 ring-offset-background" : "",
                isDraggingImage && draggedImageId === img.id ? "cursor-grabbing" : "cursor-pointer"
              )}
              style={{ left: img.x, top: img.y, width: img.width, height: img.height }}
            >
              <div className="w-full h-full overflow-hidden relative group shadow-lg">
                {img.type === "video" ? (
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
                  <img src={img.src} alt={img.name} className="w-full h-full object-cover" draggable={false} />
                )}
                {/* Name label on hover */}
                <div className="absolute bottom-0 left-0 right-0 bg-foreground/80 text-card px-2 py-0.5 text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity truncate">
                  {img.type === "video" && <span className="text-accent-purple mr-1">▶</span>}
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
    </div>
  );
};

export { CanvasArea };
