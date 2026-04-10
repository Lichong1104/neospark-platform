import React, { useState, useCallback, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { LeftToolbar } from "@/components/workspace/LeftToolbar";
import { AssetSidebar } from "@/components/workspace/AssetSidebar";
import {
  CanvasArea,
  type CanvasImage,
} from "@/components/workspace/CanvasArea";
import { WorkflowCanvas } from "@/components/workspace/WorkflowCanvas";
import { IntelligenceHub } from "@/components/workspace/IntelligenceHub";
import { STATIC_BASE_URL } from "@/api/request";
import { toast } from "sonner";
import storageApi from "@/api/storage";
import { useImageProcessing } from "@/hooks/useImageProcessing";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { WorkspaceOnboarding } from "@/components/onboarding/WorkspaceOnboarding";
import {
  isWorkspaceOnboardingDone,
  setWorkspaceOnboardingDone,
} from "@/lib/workspaceOnboarding";

const CANVAS_IMAGE_MAX_SIZE = 256;

const getImageSize = (
  src: string
): Promise<{ width: number; height: number }> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth || CANVAS_IMAGE_MAX_SIZE,
        height: img.naturalHeight || CANVAS_IMAGE_MAX_SIZE,
      });
    };
    img.onerror = () => {
      resolve({ width: CANVAS_IMAGE_MAX_SIZE, height: CANVAS_IMAGE_MAX_SIZE });
    };
    img.src = src;
  });

const getVideoSize = (
  src: string
): Promise<{ width: number; height: number }> =>
  new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth || CANVAS_IMAGE_MAX_SIZE,
        height: video.videoHeight || CANVAS_IMAGE_MAX_SIZE,
      });
    };
    video.onerror = () => {
      resolve({ width: CANVAS_IMAGE_MAX_SIZE, height: CANVAS_IMAGE_MAX_SIZE });
    };
    video.src = src;
  });

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

const getCanvasCenterPlacement = (
  width: number,
  height: number,
  indexOffset = 0
): { x: number; y: number } => {
  const stage = document.getElementById("onboarding-canvas-stage");
  if (!stage) return { x: 120 + indexOffset * 40, y: 60 + indexOffset * 40 };
  const rect = stage.getBoundingClientRect();

  // Place in the visible center of the stage (in canvas coordinates at default zoom/pan).
  const x = Math.max(0, Math.round(rect.width / 2 - width / 2 + indexOffset * 24));
  const y = Math.max(0, Math.round(rect.height / 2 - height / 2 + indexOffset * 24));
  return { x, y };
};

const Index = () => {
  const { t } = useTranslation();
  const { userInfo, isLoading: authLoading } = useAuth();
  const [showWorkspaceOnboarding, setShowWorkspaceOnboarding] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<"canvas" | "workflow">("canvas");
  const [isAssetSidebarOpen, setIsAssetSidebarOpen] = useState(false);
  const [canvasImages, setCanvasImages] = useState<CanvasImage[]>([]);

  // Get selected canvas image info
  const selectedCanvasImage = canvasImages.find(
    (img) => img.id === selectedImage
  );
  const selectedCanvasImages = canvasImages.filter((img) =>
    selectedImageIds.includes(img.id)
  );

  const addResultsToCanvas = useCallback(
    (result: {
      type: string | null;
      images: { src: string; name: string }[];
    }) => {
      (async () => {
        const newItems: CanvasImage[] = await Promise.all(
          result.images.map(async (img, idx) => {
            const natural = await getImageSize(img.src);
            const size = toCanvasSize(natural.width, natural.height);
            return {
              id: Math.random().toString(36).substr(2, 8).toUpperCase(),
              x: (selectedCanvasImage?.x ?? 120) + 40 + idx * 30,
              y: (selectedCanvasImage?.y ?? 60) + 40 + idx * 30,
              width: size.width,
              height: size.height,
              selected: false,
              src: img.src,
              name: img.name,
              type: "image" as const,
            };
          })
        );
        setCanvasImages((prev) => [...prev, ...newItems]);
      })();
    },
    [selectedCanvasImage]
  );

  const {
    state: processingState,
    startBgRemoval,
    startLayerSplit,
    startUpscale,
  } = useImageProcessing(addResultsToCanvas);

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

  const handleUpscale = useCallback(
    (resolution: "2K" | "4K" | "8K") => {
      if (!selectedCanvasImage || selectedCanvasImage.type === "video") {
        toast.error(t("workspace.selectImageFirst"));
        return;
      }
      startUpscale(
        selectedCanvasImage.src,
        selectedCanvasImage.name,
        resolution
      );
    },
    [selectedCanvasImage, startUpscale, t]
  );

  const handleImagesGenerated = useCallback(
    (images: { url: string; local_path: string }[]) => {
      (async () => {
        const newCanvasImages: CanvasImage[] = await Promise.all(
          images.map(async (img, idx) => {
            const src = img.url.startsWith("http")
              ? img.url
              : `${STATIC_BASE_URL}${img.url}`;
            const natural = await getImageSize(src);
            const size = toCanvasSize(natural.width, natural.height);
            const pos = getCanvasCenterPlacement(size.width, size.height, idx);
            return {
              id: Math.random().toString(36).substr(2, 8).toUpperCase(),
              x: pos.x,
              y: pos.y,
              width: size.width,
              height: size.height,
              selected: false,
              src,
              name: `Generated_${Date.now()}_${idx + 1}`,
              type: "image" as const,
            };
          })
        );
        setCanvasImages((prev) => [...prev, ...newCanvasImages]);
      })();
    },
    []
  );

  const handleVideoGenerated = useCallback((videoUrl: string) => {
    (async () => {
      const natural = await getVideoSize(videoUrl);
      const size = toCanvasSize(natural.width, natural.height);
      const pos = getCanvasCenterPlacement(size.width, size.height, 0);
      const newItem: CanvasImage = {
        id: Math.random().toString(36).substr(2, 8).toUpperCase(),
        x: pos.x,
        y: pos.y,
        width: size.width,
        height: size.height,
        selected: false,
        src: videoUrl,
        name: `Video_${Date.now()}`,
        type: "video",
      };
      setCanvasImages((prev) => [...prev, newItem]);
    })();
  }, []);

  const handleAddToCanvas = useCallback(
    (item: { src: string; name: string; type: "image" | "video" }) => {
      (async () => {
        const base = {
          id: Math.random().toString(36).substr(2, 8).toUpperCase(),
          selected: false,
          src: item.src,
          name: item.name,
          type: item.type,
        } as const;

        if (item.type === "video") {
          const natural = await getVideoSize(item.src);
          const size = toCanvasSize(natural.width, natural.height);
          const pos = getCanvasCenterPlacement(size.width, size.height, 0);
          const newItem: CanvasImage = { ...base, x: pos.x, y: pos.y, width: size.width, height: size.height };
          setCanvasImages((prev) => [...prev, newItem]);
          return;
        }

        const natural = await getImageSize(item.src);
        const size = toCanvasSize(natural.width, natural.height);
        const pos = getCanvasCenterPlacement(size.width, size.height, 0);
        const newItem: CanvasImage = {
          ...base,
          x: pos.x,
          y: pos.y,
          width: size.width,
          height: size.height,
        };
        setCanvasImages((prev) => [...prev, newItem]);
      })();
    },
    []
  );

  useEffect(() => {
    if (authLoading || !userInfo?.id) return;
    if (!isWorkspaceOnboardingDone(userInfo.id)) {
      setShowWorkspaceOnboarding(true);
    }
  }, [authLoading, userInfo?.id]);

  const completeWorkspaceOnboarding = useCallback(() => {
    if (userInfo?.id) setWorkspaceOnboardingDone(userInfo.id);
    setShowWorkspaceOnboarding(false);
  }, [userInfo?.id]);

  const handleFileDrop = useCallback(
    async (files: File[]) => {
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
    },
    [t]
  );

  return (
    <>
      <div className="h-screen flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 flex overflow-hidden">
          <div className="relative flex-shrink-0">
            <LeftToolbar
              isActive={selectedImageIds.length === 1}
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
                onSelectionChange={setSelectedImageIds}
                canvasImages={canvasImages}
                onCanvasImagesChange={setCanvasImages}
                onFileDrop={handleFileDrop}
              />
            ) : (
              <WorkflowCanvas />
            )}
          </div>

          <aside id="onboarding-hub-panel" className="w-[400px] flex-shrink-0">
            <IntelligenceHub
              onImagesGenerated={handleImagesGenerated}
              onVideoGenerated={handleVideoGenerated}
              selectedCanvasImage={selectedCanvasImage ?? null}
              selectedCanvasImages={selectedCanvasImages}
            />
          </aside>
        </main>
      </div>
      {showWorkspaceOnboarding && (
        <WorkspaceOnboarding onComplete={completeWorkspaceOnboarding} />
      )}
    </>
  );
};

export default Index;
