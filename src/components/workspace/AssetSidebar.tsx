import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Image, Video, Sparkles, Palette, Upload, Loader2, Download, Trash2, Plus, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import storageApi from "@/api/storage";
import { STATIC_BASE_URL } from "@/api/request";
import type { UserImageItem, FileItem } from "@/types/storage";

interface AssetSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCanvas?: (item: { src: string; name: string; type: "image" | "video" }) => void;
}

type AssetTab = "images" | "videos";

const AssetSidebar: React.FC<AssetSidebarProps> = ({ isOpen, onClose, onAddToCanvas }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<AssetTab>("images");

  const [userImages, setUserImages] = useState<UserImageItem[]>([]);
  const [imageSource, setImageSource] = useState<"all" | "upload" | "generation">("all");
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  const [videoFiles, setVideoFiles] = useState<FileItem[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<UserImageItem | null>(null);

  const getImageUrl = useCallback((url: string) => {
    if (!url) return "";
    return url.startsWith("http") ? url : `${STATIC_BASE_URL}${url}`;
  }, []);

  const loadImages = useCallback(async () => {
    setIsLoadingImages(true);
    try {
      const params = imageSource === "all" ? {} : { source: imageSource };
      const data = await storageApi.listUserImages(params);
      setUserImages(data.images || []);
    } catch {
      setUserImages([]);
    } finally {
      setIsLoadingImages(false);
    }
  }, [imageSource]);

  const loadVideos = useCallback(async () => {
    setIsLoadingVideos(true);
    try {
      const data = await storageApi.listFiles({ file_type: "video" });
      setVideoFiles(data.files || []);
    } catch {
      setVideoFiles([]);
    } finally {
      setIsLoadingVideos(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === "images") loadImages();
    if (activeTab === "videos") loadVideos();
  }, [isOpen, activeTab, loadImages, loadVideos]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const fileType = file.type.startsWith("video") ? "video" : "image";
      await storageApi.uploadFile(file, fileType);
      toast.success(t("assetSidebar.uploadSuccess") || "上传成功");
      if (activeTab === "images") loadImages();
      else if (activeTab === "videos") loadVideos();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "上传失败");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (path: string, id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    try {
      await storageApi.deleteFile(path);
      toast.success(t("assetSidebar.deleted") || "已删除");
      setUserImages(prev => prev.filter(img => img.id !== id));
      setVideoFiles(prev => prev.filter(f => f.upload_id !== id));
      setConfirmDeleteId(null);
      if (previewItem?.id === id) setPreviewItem(null);
    } catch {
      toast.error("删除失败");
    }
  };

  const handleClickImage = (img: UserImageItem) => {
    onAddToCanvas?.({
      src: getImageUrl(img.url),
      name: img.filename,
      type: "image",
    });
    toast.success(t("assetSidebar.addedToCanvas") || "已添加到画布");
  };

  const handleClickVideo = (file: FileItem) => {
    const url = file.path ? `${STATIC_BASE_URL}/storage/file/${file.path}` : "";
    onAddToCanvas?.({
      src: url,
      name: file.filename,
      type: "video",
    });
    toast.success(t("assetSidebar.addedToCanvas") || "已添加到画布");
  };

  const tabs: { id: AssetTab; label: string; icon: React.ReactNode }[] = [
    { id: "images", label: t("assetSidebar.images"), icon: <Image className="w-4 h-4" /> },
    { id: "videos", label: t("assetSidebar.videos"), icon: <Video className="w-4 h-4" /> },
  ];

  if (!isOpen) return null;

  // Preview overlay
  if (previewItem) {
    return (
      <div className="absolute left-16 top-0 bottom-0 w-80 bg-card border-r-brutal border-foreground z-40 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b-brutal border-foreground">
          <h2 className="text-xs font-bold uppercase tracking-wider">{t("assetSidebar.fileDetail") || "文件详情"}</h2>
          <button onClick={() => setPreviewItem(null)} className="p-1 hover:bg-secondary transition-none">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className="border-brutal border-foreground overflow-hidden bg-muted">
            <img src={getImageUrl(previewItem.url)} alt={previewItem.filename} className="w-full h-auto object-contain" />
          </div>
          <div className="space-y-1.5 text-[11px] font-mono">
            <div className="flex justify-between py-1 border-b border-foreground/10">
              <span className="text-muted-foreground uppercase">文件名</span>
              <span className="font-bold truncate ml-2 max-w-[150px]">{previewItem.filename}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-foreground/10">
              <span className="text-muted-foreground uppercase">来源</span>
              <span className={cn("font-bold", previewItem.type === "generation" ? "text-accent-purple" : "text-accent-cyan")}>
                {previewItem.type === "generation" ? "🎨 AI生成" : "📤 上传"}
              </span>
            </div>
            {previewItem.size && (
              <div className="flex justify-between py-1 border-b border-foreground/10">
                <span className="text-muted-foreground uppercase">大小</span>
                <span className="font-bold">{(previewItem.size / 1024).toFixed(1)} KB</span>
              </div>
            )}
            {previewItem.model && (
              <div className="flex justify-between py-1 border-b border-foreground/10">
                <span className="text-muted-foreground uppercase">模型</span>
                <span className="font-bold">{previewItem.model}</span>
              </div>
            )}
            {previewItem.prompt && (
              <div className="py-1 border-b border-foreground/10">
                <span className="text-muted-foreground uppercase block mb-1">提示词</span>
                <p className="text-[10px] leading-relaxed">{previewItem.prompt}</p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { handleClickImage(previewItem); setPreviewItem(null); }}
              className="flex-1 py-2 border-brutal border-foreground bg-accent-cyan font-bold text-xs uppercase flex items-center justify-center gap-1 brutal-press"
            >
              <Plus className="w-3 h-3" /> 添加到画布
            </button>
            <button
              onClick={() => { handleDelete(previewItem.path, previewItem.id); }}
              className="py-2 px-3 border-brutal border-foreground bg-accent-red text-card font-bold text-xs uppercase flex items-center justify-center brutal-press"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute left-16 top-0 bottom-0 w-80 bg-card border-r-brutal border-foreground z-40 flex flex-col">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={activeTab === "videos" ? "video/*" : "image/*"}
        onChange={handleUpload}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b-brutal border-foreground">
        <h2 className="text-xs font-bold uppercase tracking-wider">{t("assetSidebar.assetManagement")}</h2>
        <button onClick={onClose} className="p-1 hover:bg-secondary transition-none">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b-brutal border-foreground">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold uppercase transition-none",
              activeTab === tab.id
                ? "bg-foreground text-card"
                : "bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Upload + filter row */}
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex-1 py-2 bg-accent-cyan border-brutal border-foreground font-bold uppercase text-[11px] flex items-center justify-center gap-1.5 brutal-press hover:brightness-95 disabled:opacity-50"
          >
            {isUploading ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 上传中</>
            ) : (
              <><Upload className="w-3.5 h-3.5" /> 上传</>
            )}
          </button>
        </div>

        {/* Source filter for images */}
        {activeTab === "images" && (
          <div className="flex border-brutal border-foreground overflow-hidden">
            {(["all", "upload", "generation"] as const).map((src) => (
              <button
                key={src}
                onClick={() => setImageSource(src)}
                className={cn(
                  "flex-1 py-1.5 text-[10px] font-bold uppercase border-r border-foreground/20 last:border-r-0 transition-none",
                  imageSource === src ? "bg-foreground text-card" : "bg-card hover:bg-secondary"
                )}
              >
                {src === "all" ? "全部" : src === "upload" ? "上传" : "AI生成"}
              </button>
            ))}
          </div>
        )}

        {/* Image grid — flat, no groups */}
        {activeTab === "images" && (
          <>
            {isLoadingImages ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-accent-cyan" />
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                  {t("assetSidebar.loading") || "加载中..."}
                </span>
              </div>
            ) : userImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Image className="w-10 h-10 text-muted-foreground/30" />
                <span className="text-xs text-muted-foreground">暂无素材</span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[10px] font-bold uppercase text-accent-cyan underline"
                >
                  点击上传
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {userImages.map((img) => (
                  <div
                    key={img.id}
                    className={cn(
                      "group relative aspect-square overflow-hidden border border-foreground/20 hover:border-accent-cyan",
                      confirmDeleteId === img.id && "border-accent-red"
                    )}
                  >
                    <img
                      src={getImageUrl(img.url)}
                      alt={img.filename}
                      className="w-full h-full object-cover cursor-pointer"
                      loading="lazy"
                      onClick={() => handleClickImage(img)}
                    />
                    {/* Source badge */}
                    <div className={cn(
                      "absolute top-0 left-0 px-1 py-px text-[7px] font-bold uppercase leading-tight",
                      img.type === "generation" ? "bg-accent-purple text-card" : "bg-accent-cyan/80 text-foreground"
                    )}>
                      {img.type === "generation" ? "AI" : "UP"}
                    </div>

                    {/* Bottom action bar — always visible on hover */}
                    <div className="absolute bottom-0 left-0 right-0 flex opacity-0 group-hover:opacity-100 bg-foreground/80 backdrop-blur-sm">
                      <button
                        onClick={() => handleClickImage(img)}
                        className="flex-1 py-1.5 flex items-center justify-center gap-1 text-card hover:bg-accent-cyan hover:text-foreground transition-none"
                        title="添加到画布"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setPreviewItem(img)}
                        className="flex-1 py-1.5 flex items-center justify-center text-card hover:bg-accent-cyan hover:text-foreground transition-none border-l border-card/20"
                        title="查看详情"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(img.path, img.id)}
                        className={cn(
                          "flex-1 py-1.5 flex items-center justify-center transition-none border-l border-card/20",
                          confirmDeleteId === img.id ? "bg-accent-red text-card" : "text-card hover:bg-accent-red"
                        )}
                        title={confirmDeleteId === img.id ? "再次点击确认" : "删除"}
                      >
                        {confirmDeleteId === img.id
                          ? <span className="text-[8px] font-bold uppercase">确认?</span>
                          : <Trash2 className="w-3 h-3" />
                        }
                      </button>
                    </div>

                    {/* Delete confirm state — keep bar visible */}
                    {confirmDeleteId === img.id && (
                      <div className="absolute bottom-0 left-0 right-0 flex bg-foreground/80 backdrop-blur-sm">
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="flex-1 py-1.5 text-[9px] font-bold uppercase text-card hover:bg-secondary hover:text-foreground transition-none"
                        >
                          取消
                        </button>
                        <button
                          onClick={() => handleDelete(img.path, img.id)}
                          className="flex-1 py-1.5 text-[9px] font-bold uppercase bg-accent-red text-card hover:brightness-110 transition-none border-l border-card/20"
                        >
                          确认删除
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Video list */}
        {activeTab === "videos" && (
          <>
            {isLoadingVideos ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-accent-purple" />
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                  {t("assetSidebar.loading") || "加载中..."}
                </span>
              </div>
            ) : videoFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Video className="w-10 h-10 text-muted-foreground/30" />
                <span className="text-xs text-muted-foreground">暂无视频</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {videoFiles.map((file) => (
                  <div
                    key={file.upload_id}
                    onClick={() => handleClickVideo(file)}
                    className="flex items-center gap-2 p-2 border border-foreground/20 hover:border-accent-purple cursor-pointer group transition-colors"
                  >
                    <div className="w-8 h-8 bg-accent-purple/10 flex items-center justify-center flex-shrink-0">
                      <Video className="w-4 h-4 text-accent-purple" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold truncate">{file.filename}</div>
                      <div className="text-[9px] text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDelete(file.path, file.upload_id)}
                        className={cn(
                          "p-1 transition-none",
                          confirmDeleteId === file.upload_id ? "bg-accent-red text-card" : "hover:bg-accent-red hover:text-card"
                        )}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer count */}
      <div className="px-3 py-2 border-t border-foreground/10 text-[10px] font-mono text-muted-foreground text-center">
        {activeTab === "images"
          ? `${userImages.length} 张图片`
          : `${videoFiles.length} 个视频`
        } · 点击素材添加到画布
      </div>
    </div>
  );
};

export { AssetSidebar };
