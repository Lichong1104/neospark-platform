import { useCallback, useEffect, useRef, useState } from "react";
import { Image, Loader2, Upload, Video } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import storageApi from "@/api/storage";
import { toFullUrl } from "@/lib/workflow/url";
import type { UserImageItem, UserVideoItem } from "@/types/storage";

export interface WorkflowAsset {
  src: string;
  name: string;
  type: "image" | "video";
}

interface MaterialsPanelProps {
  onAddAsset: (asset: WorkflowAsset) => void;
}

type AssetTab = "images" | "videos";

const IMAGE_PAGE_SIZE = 30;

export function MaterialsPanel({ onAddAsset }: MaterialsPanelProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<AssetTab>("images");
  const [imageSource, setImageSource] = useState<"all" | "upload" | "generation">("all");

  const [images, setImages] = useState<UserImageItem[]>([]);
  const [imageTotal, setImageTotal] = useState(0);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [isLoadingMoreImages, setIsLoadingMoreImages] = useState(false);

  const [videos, setVideos] = useState<UserVideoItem[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const isLoadingMoreRef = useRef(false);

  const loadImages = useCallback(async () => {
    setIsLoadingImages(true);
    try {
      const data = await storageApi.listUserImages({
        ...(imageSource === "all" ? {} : { source: imageSource }),
        limit: IMAGE_PAGE_SIZE,
        offset: 0,
      });
      setImages(data.images || []);
      setImageTotal(data.total || 0);
    } catch {
      setImages([]);
      setImageTotal(0);
    } finally {
      setIsLoadingImages(false);
    }
  }, [imageSource]);

  const loadMoreImages = useCallback(async () => {
    if (isLoadingImages || isLoadingMoreRef.current || images.length >= imageTotal) return;
    isLoadingMoreRef.current = true;
    setIsLoadingMoreImages(true);
    try {
      const data = await storageApi.listUserImages({
        ...(imageSource === "all" ? {} : { source: imageSource }),
        limit: IMAGE_PAGE_SIZE,
        offset: images.length,
      });
      const next = data.images || [];
      if (next.length) {
        setImages((prev) => [...prev, ...next]);
      }
      setImageTotal(data.total || imageTotal);
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMoreImages(false);
    }
  }, [imageSource, imageTotal, images.length, isLoadingImages]);

  const loadVideos = useCallback(async () => {
    setIsLoadingVideos(true);
    try {
      const data = await storageApi.listAllUserVideos();
      setVideos(data.items || []);
    } catch {
      setVideos([]);
    } finally {
      setIsLoadingVideos(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "images") loadImages();
    else loadVideos();
  }, [activeTab, loadImages, loadVideos]);

  const handleScroll = useCallback(() => {
    if (activeTab !== "images") return;
    const container = listRef.current;
    if (!container) return;
    const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distance <= 200) loadMoreImages();
  }, [activeTab, loadMoreImages]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const fileType = file.type.startsWith("video") ? "video" : "image";
      await storageApi.uploadFile(file, fileType);
      toast.success(t("workflow.materialsUploadSuccess"));
      if (activeTab === "images") loadImages();
      else loadVideos();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || t("workflow.materialsUploadFailed"));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const displayImageUrl = useCallback((img: UserImageItem) => {
    const url = img.thumbnail_url || img.url;
    return toFullUrl(url);
  }, []);

  const addImage = (img: UserImageItem) => {
    onAddAsset({ src: toFullUrl(img.url), name: img.filename, type: "image" });
    toast.success(t("workflow.addedToWorkflow"));
  };

  const addVideo = (file: UserVideoItem) => {
    onAddAsset({ src: toFullUrl(file.url), name: file.filename, type: "video" });
    toast.success(t("workflow.addedToWorkflow"));
  };

  const tabs: { id: AssetTab; label: string; icon: React.ReactNode }[] = [
    { id: "images", label: t("workflow.images"), icon: <Image className="h-3.5 w-3.5" /> },
    { id: "videos", label: t("workflow.videos"), icon: <Video className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-r-brutal border-foreground bg-card">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={activeTab === "videos" ? "video/*" : "image/*"}
        onChange={handleUpload}
      />

      <div className="border-b-brutal border-foreground px-3 py-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-foreground">
            {t("workflow.materials")}
          </h2>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center gap-1 rounded border border-foreground/20 px-1.5 py-0.5 text-[10px] font-bold uppercase transition-colors hover:bg-secondary disabled:opacity-50"
            title={t("workflow.materialsUpload")}
          >
            {isUploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Upload className="h-3 w-3" />
            )}
            {t("workflow.materialsUpload")}
          </button>
        </div>
        <p className="mt-0.5 text-[9px] text-muted-foreground">{t("workflow.materialsHint")}</p>
      </div>

      <div className="flex border-b-brutal border-foreground">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase transition-none",
              activeTab === tab.id
                ? "bg-foreground text-card"
                : "bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "images" && (
        <div className="flex border-b border-foreground/10">
          {(["all", "upload", "generation"] as const).map((src) => (
            <button
              key={src}
              type="button"
              onClick={() => setImageSource(src)}
              className={cn(
                "flex-1 py-1.5 text-[9px] font-bold uppercase transition-none",
                imageSource === src
                  ? "bg-foreground text-card"
                  : "bg-card text-muted-foreground hover:bg-secondary"
              )}
            >
              {src === "all"
                ? t("workflow.materialsFilterAll")
                : src === "upload"
                  ? t("workflow.materialsFilterUpload")
                  : t("workflow.materialsFilterGenerated")}
            </button>
          ))}
        </div>
      )}

      <div
        ref={listRef}
        onScroll={handleScroll}
        className="scrollbar-brutal flex-1 overflow-y-auto p-2.5"
      >
        {activeTab === "images" && (
          <ImageList
            images={images}
            isLoading={isLoadingImages}
            displayUrl={displayImageUrl}
            onAdd={addImage}
            noMaterialsText={t("workflow.noMaterials")}
          />
        )}
        {activeTab === "videos" && (
          <VideoList
            videos={videos}
            isLoading={isLoadingVideos}
            onAdd={addVideo}
            noMaterialsText={t("workflow.noMaterials")}
          />
        )}

        {activeTab === "images" && images.length < imageTotal && (
          <div className="flex items-center justify-center py-3">
            {isLoadingMoreImages ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t("workflow.loading")}
              </span>
            ) : (
              <button
                type="button"
                onClick={loadMoreImages}
                className="rounded border border-foreground/20 bg-card px-3 py-1 text-[10px] font-bold uppercase text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
              >
                {t("workflow.loadMore")}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="border-t-brutal border-foreground px-3 py-1.5 text-[9px] font-mono text-muted-foreground">
        {activeTab === "images"
          ? t("workflow.imageCount", { count: images.length })
          : t("workflow.videoCount", { count: videos.length })}
      </div>
    </div>
  );
}

function ImageList({
  images,
  isLoading,
  displayUrl,
  onAdd,
  noMaterialsText,
}: {
  images: UserImageItem[];
  isLoading: boolean;
  displayUrl: (img: UserImageItem) => string;
  onAdd: (img: UserImageItem) => void;
  noMaterialsText: string;
}) {
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-accent-cyan" />
        <span className="text-[10px] font-bold uppercase text-muted-foreground">
          {t("workflow.loading")}
        </span>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
        <Image className="h-8 w-8 opacity-30" />
        <span className="text-[10px]">{noMaterialsText}</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1.5">
      {images.map((img) => (
        <button
          key={img.id}
          type="button"
          onClick={() => onAdd(img)}
          className="group relative aspect-square overflow-hidden border border-foreground/20 bg-muted transition-colors hover:border-accent-cyan"
          title={img.filename}
        >
          <img
            src={displayUrl(img)}
            alt={img.filename}
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <span
            className={cn(
              "absolute left-0 top-0 px-1 py-px text-[7px] font-bold uppercase leading-tight",
              img.type === "generation"
                ? "bg-accent-purple text-card"
                : "bg-accent-cyan text-foreground"
            )}
          >
            {img.type === "generation" ? "AI" : "UP"}
          </span>
          <span className="absolute bottom-0 left-0 right-0 truncate bg-foreground/80 px-1 py-px text-[7px] text-card opacity-0 transition-opacity group-hover:opacity-100">
            {img.filename}
          </span>
        </button>
      ))}
    </div>
  );
}

function VideoList({
  videos,
  isLoading,
  onAdd,
  noMaterialsText,
}: {
  videos: UserVideoItem[];
  isLoading: boolean;
  onAdd: (file: UserVideoItem) => void;
  noMaterialsText: string;
}) {
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-accent-purple" />
        <span className="text-[10px] font-bold uppercase text-muted-foreground">
          {t("workflow.loading")}
        </span>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
        <Video className="h-8 w-8 opacity-30" />
        <span className="text-[10px]">{noMaterialsText}</span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {videos.map((file) => (
        <button
          key={file.id}
          type="button"
          onClick={() => onAdd(file)}
          className="flex w-full items-center gap-2 border border-foreground/20 bg-card p-1.5 text-left transition-colors hover:border-accent-purple"
          title={file.filename}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-accent-purple/10">
            <Video className="h-4 w-4 text-accent-purple" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[10px] font-bold">{file.filename}</span>
            <span className="block text-[9px] text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(1)} MB ·{" "}
              {file.type === "generation" ? "AI" : "UP"}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
