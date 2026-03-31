import React, { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { BrutalCard, BrutalCardHeader, BrutalCardTitle, BrutalCardContent } from "@/components/ui/brutal-card";
import { BrutalButton } from "@/components/ui/brutal-button";
import { BrutalInput } from "@/components/ui/brutal-input";
import { Folder, File, Image, Trash2, Plus, ChevronRight, Upload, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import storageApi from "@/api/storage";
import { BASE_URL } from "@/api/request";
import type { UserImageItem } from "@/types/storage";

const Assets = () => {
  const { t } = useTranslation();
  const [images, setImages] = useState<UserImageItem[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadImages = async () => {
    setIsLoading(true);
    try {
      const data = await storageApi.listUserImages({ limit: 100 });
      setImages(data.images || []);
    } catch {
      // 接口不可用时使用空列表
      setImages([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        await storageApi.uploadFile(file, "image");
      }
      toast.success(t("assetsPage.uploadSuccess") || "上传成功");
      await loadImages();
    } catch (err: any) {
      toast.error(err?.message || "上传失败");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    if (confirmDelete === id) {
      // 执行删除
      const img = images.find(i => i.id === id);
      if (img) {
        try {
          await storageApi.deleteFile(img.path);
          toast.success(t("assetsPage.deleted") || "已删除");
          setImages(prev => prev.filter(i => i.id !== id));
        } catch {
          toast.error("删除失败");
        }
      }
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
    }
  };

  const getImageUrl = (url: string) => {
    if (url.startsWith("http")) return url;
    return `${BASE_URL}${url}`;
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleUpload}
      />
      
      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar - grouped by source */}
        <aside className="w-80 p-4 border-r-brutal border-foreground bg-background overflow-y-auto">
          <BrutalCard shadow="default" className="h-full">
            <BrutalCardHeader>
              <BrutalCardTitle className="flex items-center justify-between">
                <span>{t("assetsPage.directory")}</span>
                <span className="text-xs text-muted-foreground font-mono">{images.length} files</span>
              </BrutalCardTitle>
            </BrutalCardHeader>
            <BrutalCardContent className="font-mono text-sm space-y-1">
              {/* Upload group */}
              <div className="mb-2">
                <div className="flex items-center gap-1 py-1 px-2 text-xs font-bold uppercase text-accent-cyan">
                  <Upload className="w-3 h-3" />
                  {t("assetsPage.uploaded") || "UPLOADED"}
                  <span className="text-muted-foreground ml-auto">{images.filter(i => i.type === "upload").length}</span>
                </div>
                {images.filter(i => i.type === "upload").map(img => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedAsset(img.id)}
                    className={`w-full text-left py-1 px-4 transition-none flex items-center gap-1 text-xs ${selectedAsset === img.id ? "bg-accent-cyan text-foreground" : "hover:bg-secondary"}`}
                  >
                    <File className="w-3 h-3 ml-2" />
                    <span className="truncate">{img.filename}</span>
                  </button>
                ))}
              </div>
              {/* Generated group */}
              <div>
                <div className="flex items-center gap-1 py-1 px-2 text-xs font-bold uppercase text-accent-purple">
                  <Image className="w-3 h-3" />
                  {t("assetsPage.generated") || "GENERATED"}
                  <span className="text-muted-foreground ml-auto">{images.filter(i => i.type === "generation").length}</span>
                </div>
                {images.filter(i => i.type === "generation").map(img => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedAsset(img.id)}
                    className={`w-full text-left py-1 px-4 transition-none flex items-center gap-1 text-xs ${selectedAsset === img.id ? "bg-accent-cyan text-foreground" : "hover:bg-secondary"}`}
                  >
                    <File className="w-3 h-3 ml-2" />
                    <span className="truncate">{img.filename}</span>
                  </button>
                ))}
              </div>
            </BrutalCardContent>
          </BrutalCard>
        </aside>

        <div className="flex-1 p-6 bg-background-grid bg-grid overflow-y-auto">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold uppercase tracking-wider">
              {t("assetsPage.allAssets")}
              <span className="text-sm text-muted-foreground font-mono ml-2">({images.length})</span>
            </h2>
            <BrutalButton
              variant="primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {t("assetsPage.upload")}
            </BrutalButton>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Image className="w-12 h-12 mb-2" />
              <p className="text-sm font-mono">{t("assetsPage.noAssets") || "No assets yet"}</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {images.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => setSelectedAsset(asset.id)}
                  className={`group cursor-pointer transition-none ${confirmDelete === asset.id ? "animate-pulse-glow" : ""}`}
                >
                  <BrutalCard shadow={selectedAsset === asset.id ? "cyan" : "default"} className={`overflow-hidden ${confirmDelete === asset.id ? "bg-accent-red" : ""}`}>
                    <div className="aspect-square bg-muted flex items-center justify-center border-b-brutal border-foreground overflow-hidden">
                      <img
                        src={getImageUrl(asset.url)}
                        alt={asset.filename}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                          (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="flex items-center justify-center w-full h-full"><svg class="w-12 h-12 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></div>';
                        }}
                      />
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-mono truncate block">{asset.filename}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {asset.type === "generation" ? "🎨 AI" : "📤 Upload"}
                          {asset.size ? ` · ${(asset.size / 1024).toFixed(0)}KB` : ""}
                        </span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(asset.id); }}
                        className={`p-1 transition-none flex-shrink-0 ${confirmDelete === asset.id ? "text-foreground" : "text-muted-foreground hover:text-accent-red"}`}
                      >
                        {confirmDelete === asset.id ? <span className="text-xs font-bold">{t("assetsPage.confirmDelete")}</span> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </BrutalCard>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Assets;
