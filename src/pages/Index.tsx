import React, { useState, useCallback, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
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
import {
  getCanvasImageMaxSize,
  toCanvasSize,
} from "@/lib/canvasImageSize";
import { WorkspaceOnboarding } from "@/components/onboarding/WorkspaceOnboarding";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  isWorkspaceOnboardingDone,
  setWorkspaceOnboardingDone,
} from "@/lib/workspaceOnboarding";

const FIRST_LOGIN_VIDEO_URL =
  "https://quantrisk.oss-cn-shenzhen.aliyuncs.com/demo_canva_chinese.mp4";
const getFirstLoginVideoShownKey = (userId: string | number) =>
  `first_login_video_shown_${String(userId)}`;

const getImageSize = (
  src: string
): Promise<{ width: number; height: number }> =>
  new Promise((resolve) => {
    const fallback = getCanvasImageMaxSize();
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth || fallback,
        height: img.naturalHeight || fallback,
      });
    };
    img.onerror = () => {
      resolve({ width: fallback, height: fallback });
    };
    img.src = src;
  });

const getVideoSize = (
  src: string
): Promise<{ width: number; height: number }> =>
  new Promise((resolve) => {
    const fallback = getCanvasImageMaxSize();
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth || fallback,
        height: video.videoHeight || fallback,
      });
    };
    video.onerror = () => {
      resolve({ width: fallback, height: fallback });
    };
    video.src = src;
  });

const toStorageUrl = (url: string): string =>
  url.startsWith("http") ? url : `${STATIC_BASE_URL}${url}`;

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
  const { t, i18n } = useTranslation();
  const { userInfo, isLoading: authLoading } = useAuth();
  const [showWorkspaceOnboarding, setShowWorkspaceOnboarding] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<"canvas" | "workflow">("canvas");
  const [isAssetSidebarOpen, setIsAssetSidebarOpen] = useState(false);
  const [canvasImages, setCanvasImages] = useState<CanvasImage[]>([]);
  const [isFileDropUploading, setIsFileDropUploading] = useState(false);
  const [showFirstLoginVideo, setShowFirstLoginVideo] = useState(false);
  const [hubPanelExpanded, setHubPanelExpanded] = useState(true);
  const [hasResolvedOnboardingState, setHasResolvedOnboardingState] =
    useState(false);
  const isChineseLanguage = (i18n.resolvedLanguage || i18n.language || "en")
    .split("-")[0]
    .toLowerCase() === "zh";

  // 全局批次偏移：确保多次生成的图片不会堆叠在同一个位置
  const generationBatchRef = useRef(0);

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
    startMultipleAngles,
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

  const handleMultipleAngles = useCallback(
    (params: {
      horizontalAngle: number;
      verticalAngle: number;
      distance: number;
      prompt?: string;
      negativePrompt?: string;
      seed?: number;
    }) => {
      if (!selectedCanvasImage || selectedCanvasImage.type === "video") {
        toast.error(t("workspace.selectImageFirst"));
        return;
      }
      startMultipleAngles(selectedCanvasImage.src, selectedCanvasImage.name, params);
    },
    [selectedCanvasImage, startMultipleAngles, t]
  );

  const handleAddToCanvas = useCallback(
    (
      item: { src: string; name: string; type: "image" | "video" },
      placementOffset = 0
    ) => {
      (async () => {
        const id = Math.random().toString(36).substr(2, 8).toUpperCase();
        const maxSize = getCanvasImageMaxSize();
        const tempPos = getCanvasCenterPlacement(
          maxSize,
          maxSize,
          placementOffset
        );
        const tempItem: CanvasImage = {
          id,
          x: tempPos.x,
          y: tempPos.y,
          width: maxSize,
          height: maxSize,
          selected: false,
          src: item.src,
          name: item.name,
          type: item.type,
          loading: true,
        };
        setCanvasImages((prev) => [...prev, tempItem]);

        const base = {
          id,
          selected: false,
          src: item.src,
          name: item.name,
          type: item.type,
        } as const;

        if (item.type === "video") {
          const natural = await getVideoSize(item.src);
          const size = toCanvasSize(natural.width, natural.height);
          const pos = getCanvasCenterPlacement(
            size.width,
            size.height,
            placementOffset
          );
          setCanvasImages((prev) =>
            prev.map((img) =>
              img.id === id
                ? {
                    ...img,
                    ...base,
                    x: pos.x,
                    y: pos.y,
                    width: size.width,
                    height: size.height,
                    loading: false,
                  }
                : img
            )
          );
          return;
        }

        const natural = await getImageSize(item.src);
        const size = toCanvasSize(natural.width, natural.height);
        const pos = getCanvasCenterPlacement(
          size.width,
          size.height,
          placementOffset
        );
        setCanvasImages((prev) =>
          prev.map((img) =>
            img.id === id
              ? {
                  ...img,
                  ...base,
                  x: pos.x,
                  y: pos.y,
                  width: size.width,
                  height: size.height,
                  loading: false,
                }
              : img
          )
        );
      })();
    },
    []
  );

  const handleImagesGenerated = useCallback(
    (images: { url: string; local_path: string }[]) => {
      (async () => {
        if (images.length === 0) return;
        const now = Date.now();
        const batchIndex = generationBatchRef.current++;
        const baseX = (selectedCanvasImage?.x ?? 120) + 40 + batchIndex * 80;
        const baseY = (selectedCanvasImage?.y ?? 60) + 40 + batchIndex * 80;

        const newItems: CanvasImage[] = await Promise.all(
          images.map(async (img, idx) => {
            const src = img.url.startsWith("http")
              ? img.url
              : `${STATIC_BASE_URL}${img.url}`;
            const natural = await getImageSize(src);
            const size = toCanvasSize(natural.width, natural.height);
            // 网格布局：每行最多3张，间距40px
            const cols = Math.min(images.length, 3);
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const gap = 40;
            return {
              id: Math.random().toString(36).substr(2, 8).toUpperCase(),
              x: baseX + col * (size.width + gap),
              y: baseY + row * (size.height + gap),
              width: size.width,
              height: size.height,
              selected: false,
              src,
              name: `Generated_${now}_${idx + 1}`,
              type: "image" as const,
            };
          })
        );

        setCanvasImages((prev) => [...prev, ...newItems]);
      })();
    },
    [selectedCanvasImage]
  );

  const handleVideoGenerated = useCallback(
    (videoUrl: string) => {
      if (!videoUrl) return;
      handleAddToCanvas({
        src: videoUrl,
        name: `GeneratedVideo_${Date.now()}`,
        type: "video",
      });
    },
    [handleAddToCanvas]
  );

  useEffect(() => {
    if (authLoading || !userInfo?.id) return;
    if (!isWorkspaceOnboardingDone(userInfo.id)) {
      setShowWorkspaceOnboarding(true);
    } else {
      setShowWorkspaceOnboarding(false);
    }
    setHasResolvedOnboardingState(true);
  }, [authLoading, userInfo?.id]);

  useEffect(() => {
    if (authLoading || !userInfo?.id || !hasResolvedOnboardingState) return;
    if (showWorkspaceOnboarding) return;
    if (!isChineseLanguage) return;
    const storageKey = getFirstLoginVideoShownKey(userInfo.id);
    const hasShown = localStorage.getItem(storageKey) === "1";
    if (!hasShown) {
      setShowFirstLoginVideo(true);
      localStorage.setItem(storageKey, "1");
    }
  }, [
    authLoading,
    userInfo?.id,
    hasResolvedOnboardingState,
    showWorkspaceOnboarding,
    isChineseLanguage,
  ]);

  const completeWorkspaceOnboarding = useCallback(() => {
    if (userInfo?.id) setWorkspaceOnboardingDone(userInfo.id);
    setShowWorkspaceOnboarding(false);
  }, [userInfo?.id]);

  useEffect(() => {
    const onOpenVideoGuide = () => {
      if (isChineseLanguage) setShowFirstLoginVideo(true);
    };
    window.addEventListener("neospark:open-video-guide", onOpenVideoGuide);
    return () =>
      window.removeEventListener("neospark:open-video-guide", onOpenVideoGuide);
  }, [isChineseLanguage]);

  const handleFileDrop = useCallback(
    async (files: File[], position?: { x: number; y: number }) => {
      setIsFileDropUploading(true);
      try {
        for (const [index, file] of files.entries()) {
          const id = Math.random().toString(36).substr(2, 8).toUpperCase();
          const maxSize = getCanvasImageMaxSize();
          const initialPos = position
            ? {
                x: Math.max(0, Math.round(position.x + index * 30)),
                y: Math.max(0, Math.round(position.y + index * 30)),
              }
            : getCanvasCenterPlacement(
                maxSize,
                maxSize,
                index
              );
          const tempItem: CanvasImage = {
            id,
            x: initialPos.x,
            y: initialPos.y,
            width: maxSize,
            height: maxSize,
            selected: false,
            src: "",
            name: file.name,
            type: file.type.startsWith("video/") ? "video" : "image",
            loading: true,
          };
          setCanvasImages((prev) => [...prev, tempItem]);

          try {
            const fileType = file.type.startsWith("video") ? "video" : "image";
            const uploaded = await storageApi.uploadFile(file, fileType);
            const src = toStorageUrl(uploaded.url);
            const itemType: "image" | "video" =
              fileType === "video" ? "video" : "image";
            const natural =
              itemType === "video"
                ? await getVideoSize(src)
                : await getImageSize(src);
            const size = toCanvasSize(natural.width, natural.height);

            setCanvasImages((prev) =>
              prev.map((img) =>
                img.id === id
                  ? {
                      ...img,
                      src,
                      name: uploaded.filename || file.name,
                      type: itemType,
                      width: size.width,
                      height: size.height,
                      loading: false,
                    }
                  : img
              )
            );
          } catch {
            setCanvasImages((prev) => prev.filter((img) => img.id !== id));
            toast.error(t("workspace.uploadFailedWithName", { name: file.name }));
          }
        }
        if (files.length > 0) {
          toast.success(t("workspace.uploadedFiles", { count: files.length }));
        }
      } finally {
        setIsFileDropUploading(false);
      }
    },
    [t]
  );

  return (
    <>
      <div className="h-screen flex flex-col overflow-hidden">
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
              onMultipleAngles={handleMultipleAngles}
            />
            <AssetSidebar
              isOpen={isAssetSidebarOpen}
              onClose={() => setIsAssetSidebarOpen(false)}
              onAddToCanvas={handleAddToCanvas}
            />
          </div>

          <div className="flex-1 relative min-w-0">
            {activeView === "canvas" ? (
              <CanvasArea
                onImageSelect={setSelectedImage}
                onSelectionChange={setSelectedImageIds}
                canvasImages={canvasImages}
                onCanvasImagesChange={setCanvasImages}
                onFileDrop={handleFileDrop}
                isFileDropLoading={isFileDropUploading}
              />
            ) : (
              <WorkflowCanvas />
            )}
          </div>

          <aside
            id="onboarding-hub-panel"
            className={cn(
              "relative flex shrink-0 flex-col border-l-4 border-foreground bg-card transition-[width] duration-200 ease-out",
              hubPanelExpanded
                ? "w-[400px] overflow-visible"
                : "w-11 overflow-hidden"
            )}
          >
            {hubPanelExpanded && (
              <button
                type="button"
                onClick={() => setHubPanelExpanded(false)}
                className="absolute left-0 top-1/2 z-30 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-foreground/10 bg-card text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20"
                title={t("intelligenceHub.collapsePanel")}
                aria-label={t("intelligenceHub.collapsePanel")}
              >
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            )}
            {hubPanelExpanded ? (
              <IntelligenceHub
                className="h-full min-h-0 overflow-hidden"
                onImagesGenerated={handleImagesGenerated}
                onVideoGenerated={handleVideoGenerated}
                selectedCanvasImage={selectedCanvasImage ?? null}
                selectedCanvasImages={selectedCanvasImages}
                canvasImages={canvasImages}
              />
            ) : (
              <button
                type="button"
                onClick={() => setHubPanelExpanded(true)}
                className="flex h-full w-full items-center justify-center transition-none hover:bg-accent-cyan/10"
                title={t("intelligenceHub.expandPanel")}
                aria-label={t("intelligenceHub.expandPanel")}
              >
                <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            )}
          </aside>
        </main>
      </div>
      {showWorkspaceOnboarding && (
        <WorkspaceOnboarding onComplete={completeWorkspaceOnboarding} />
      )}
      <Dialog open={showFirstLoginVideo} onOpenChange={setShowFirstLoginVideo}>
        <DialogContent className="max-w-4xl p-4">
          <DialogHeader>
            <DialogTitle>
              {t("intelligenceHub.firstLoginVideoTitle", {
                defaultValue: "Welcome to Neospark Canvas",
              })}
            </DialogTitle>
            <DialogDescription>
              {t("intelligenceHub.firstLoginVideoDesc", {
                defaultValue:
                  "First-login onboarding video. A quick 1-2 minute watch is recommended.",
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="w-full overflow-hidden rounded-md border">
            <video
              className="h-auto w-full"
              src={FIRST_LOGIN_VIDEO_URL}
              controls
              autoPlay
              playsInline
              preload="metadata"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Index;
