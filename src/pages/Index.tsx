import React, { useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { LeftToolbar } from "@/components/workspace/LeftToolbar";
import { AssetSidebar } from "@/components/workspace/AssetSidebar";
import { CanvasArea, type CanvasImage } from "@/components/workspace/CanvasArea";
import { WorkflowCanvas } from "@/components/workspace/WorkflowCanvas";
import { IntelligenceHub } from "@/components/workspace/IntelligenceHub";
import { STATIC_BASE_URL } from "@/api/request";
import { toast } from "sonner";
import storageApi from "@/api/storage";
import { useImageProcessing } from "@/hooks/useImageProcessing";
import { useTranslation } from "react-i18next";

const Index = () => {
  const { t } = useTranslation();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"canvas" | "workflow">("canvas");
  const [isAssetSidebarOpen, setIsAssetSidebarOpen] = useState(false);
  const [canvasImages, setCanvasImages] = useState<CanvasImage[]>([]);

  // Get selected canvas image info
  const selectedCanvasImage = canvasImages.find(img => img.id === selectedImage);

  const addResultsToCanvas = useCallback((result: { type: string | null; images: { src: string; name: string }[] }) => {
    const newItems: CanvasImage[] = result.images.map((img, idx) => ({
      id: Math.random().toString(36).substr(2, 8).toUpperCase(),
      x: (selectedCanvasImage?.x ?? 120) + 40 + idx * 30,
      y: (selectedCanvasImage?.y ?? 60) + 40 + idx * 30,
      width: 256,
      height: 256,
      selected: false,
      src: img.src,
      name: img.name,
      type: "image" as const,
    }));
    setCanvasImages(prev => [...prev, ...newItems]);
  }, [selectedCanvasImage]);

  const { state: processingState, startBgRemoval, startLayerSplit, startUpscale } = useImageProcessing(addResultsToCanvas);

  const handleBgRemove = useCallback(() => {
    if (!selectedCanvasImage || selectedCanvasImage.type === "video") {
      toast.error(t("workspace.selectImageFirst"));
      return;
    }
    startBgRemoval(selectedCanvasImage.src, selectedCanvasImage.name);
  }, [selectedCanvasImage, startBgRemoval, t]);

  const handleLayerSplit = useCallback(() => {
    if (!selectedCanvasImage || selectedCanvasImage.type === "video") {
      toast.error(t("workspace.selectImageFirst"));
      return;
    }
    startLayerSplit(selectedCanvasImage.src, selectedCanvasImage.name, 4);
  }, [selectedCanvasImage, startLayerSplit, t]);

  const handleUpscale = useCallback((resolution: "2K" | "4K" | "8K") => {
    if (!selectedCanvasImage || selectedCanvasImage.type === "video") {
      toast.error(t("workspace.selectImageFirst"));
      return;
    }
    startUpscale(selectedCanvasImage.src, selectedCanvasImage.name, resolution);
  }, [selectedCanvasImage, startUpscale, t]);

  const handleImagesGenerated = useCallback((images: { url: string; local_path: string }[]) => {
    const newCanvasImages: CanvasImage[] = images.map((img, idx) => ({
      id: Math.random().toString(36).substr(2, 8).toUpperCase(),
      x: 120 + idx * 40,
      y: 60 + idx * 40,
      width: 256,
      height: 256,
      selected: false,
      src: img.url.startsWith("http") ? img.url : `${STATIC_BASE_URL}${img.url}`,
      name: `Generated_${Date.now()}_${idx + 1}`,
      type: "image" as const,
    }));
    setCanvasImages(prev => [...prev, ...newCanvasImages]);
  }, []);

  const handleVideoGenerated = useCallback((videoUrl: string) => {
    const newItem: CanvasImage = {
      id: Math.random().toString(36).substr(2, 8).toUpperCase(),
      x: 120 + Math.random() * 100,
      y: 60 + Math.random() * 100,
      width: 320,
      height: 180,
      selected: false,
      src: videoUrl,
      name: `Video_${Date.now()}`,
      type: "video",
    };
    setCanvasImages(prev => [...prev, newItem]);
  }, []);

  const handleAddToCanvas = useCallback((item: { src: string; name: string; type: "image" | "video" }) => {
    const newItem: CanvasImage = {
      id: Math.random().toString(36).substr(2, 8).toUpperCase(),
      x: 120 + Math.random() * 100,
      y: 60 + Math.random() * 100,
      width: item.type === "video" ? 320 : 256,
      height: item.type === "video" ? 180 : 256,
      selected: false,
      src: item.src,
      name: item.name,
      type: item.type,
    };
    setCanvasImages(prev => [...prev, newItem]);
  }, []);

  const handleFileDrop = useCallback(async (files: File[]) => {
    for (const file of files) {
      try {
        const fileType = file.type.startsWith("video") ? "video" : "image";
        await storageApi.uploadFile(file, fileType);
      } catch {
        toast.error(t("workspace.uploadFailedWithName", { name: file.name }));
      }
    }
    if (files.length > 0) {
      toast.success(t("workspace.uploadedFiles", { count: files.length }));
    }
  }, [t]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />
      
      <main className="flex-1 flex overflow-hidden">
        <div className="relative flex-shrink-0">
          <LeftToolbar 
            isActive={selectedImage !== null} 
            onToolSelect={(toolId) => console.log("Tool selected:", toolId)}
            onAssetClick={() => setIsAssetSidebarOpen(!isAssetSidebarOpen)}
            processingState={processingState}
            onBgRemove={handleBgRemove}
            onLayerSplit={handleLayerSplit}
            onUpscale={handleUpscale}
          />
          <AssetSidebar 
            isOpen={isAssetSidebarOpen} 
            onClose={() => setIsAssetSidebarOpen(false)}
            onAddToCanvas={handleAddToCanvas}
          />
        </div>

        <div className="flex-1 relative">
          {activeView === "canvas" ? (
            <CanvasArea
              onImageSelect={setSelectedImage}
              canvasImages={canvasImages}
              onCanvasImagesChange={setCanvasImages}
              onFileDrop={handleFileDrop}
            />
          ) : (
            <WorkflowCanvas />
          )}
        </div>

        <aside className="w-[400px] flex-shrink-0">
          <IntelligenceHub
            onImagesGenerated={handleImagesGenerated}
            onVideoGenerated={handleVideoGenerated}
            selectedCanvasImage={selectedCanvasImage ?? null}
          />
        </aside>
      </main>
    </div>
  );
};

export default Index;
