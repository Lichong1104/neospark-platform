import React, { useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Wrench,
  ArrowLeft,
  Shield,
  User,
  Tag,
  Trash2,
  Loader2,
  Download,
  ImagePlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import skillsApi from "@/api/skills";
import { useAuth } from "@/contexts/AuthContext";
import { useMcpBundleDownload } from "@/hooks/useMcpBundleDownload";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import McpBundleDialog from "@/components/skills/McpBundleDialog";
const SkillDetail: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userInfo } = useAuth();
  const { skillId } = useParams<{ skillId: string }>();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [uploadingImages, setUploadingImages] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { downloading, download, bundle, closeBundle } = useMcpBundleDownload();

  const { data: skill, isLoading } = useQuery({
    queryKey: ["skill", skillId],
    queryFn: () => skillsApi.getSkill(skillId!),
    enabled: !!skillId,
  });

  const pricePoints = skill?.price_points ?? 0;
  const previews = skill?.previews?.length ? skill.previews : skill?.preview ? [skill.preview] : [];

  const handleImageUpload = async (files: FileList | null) => {
    if (!skillId || !files || files.length === 0) return;
    setUploadingImages(true);
    try {
      await skillsApi.updateSkillImages(skillId, Array.from(files));
      toast.success(t("skill.imagesUpdated"));
      setImageIndex(0);
      await queryClient.invalidateQueries({ queryKey: ["skill", skillId] });
      await queryClient.invalidateQueries({ queryKey: ["skills"] });
    } catch {
      toast.error(t("skill.imagesUpdateFailed"));
    } finally {
      setUploadingImages(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  // 删除由后端做管理员/所有者校验，前端也只对能管理的人露出入口，
  // 避免非所有者点出一个必然失败的按钮
  const canManage = !!(
    userInfo?.is_admin ||
    (userInfo?.id != null && skill?.owner_id != null && skill.owner_id === userInfo.id)
  );

  const handleDelete = async () => {
    if (!skillId) return;

    setIsDeleting(true);
    try {
      await skillsApi.deleteSkill(skillId);
      toast.success(t("skill.deleteSuccess"));
      setDeleteOpen(false);
      navigate("/skills");
    } catch {
      toast.error(t("skill.deleteFailed"));
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-accent-pink" />
        </div>
      </div>
    );
  }

  if (!skill) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-6 text-center py-20 text-muted-foreground">
          <Wrench className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-mono">{t("skill.notFound")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={() => navigate("/skills")}
          className="flex items-center gap-1.5 text-xs font-bold uppercase text-muted-foreground hover:text-foreground mb-4 transition-none"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("skill.backToMarket")}
        </button>

        <div className="border-brutal border-foreground bg-card brutal-shadow"
        >
          {previews.length > 0 && (
            <div className="relative border-b-brutal border-foreground bg-secondary/40 overflow-hidden">
              <img
                src={previews[imageIndex]}
                alt={`${skill.name} — ${imageIndex + 1}/${previews.length}`}
                className="w-full aspect-[4/3] object-cover object-top"
              />
              {previews.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setImageIndex((i) => (i - 1 + previews.length) % previews.length)}
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center border-brutal border-foreground bg-card/90 text-lg font-bold leading-none hover:bg-card"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageIndex((i) => (i + 1) % previews.length)}
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center border-brutal border-foreground bg-card/90 text-lg font-bold leading-none hover:bg-card"
                  >
                    ›
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 px-2 py-1 bg-foreground/40">
                    {previews.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setImageIndex(i)}
                        aria-label={`Show image ${i + 1}`}
                        className={cn(
                          "h-2 w-2 rounded-full",
                          i === imageIndex ? "bg-card" : "bg-card/50 hover:bg-card/80"
                        )}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-accent-pink/10 flex items-center justify-center border-brutal border-foreground"
                >
                  <Wrench className="w-7 h-7 text-accent-pink" />
                </div>
                <div>
                  <h1 className="text-xl font-bold uppercase tracking-wider"
                  >
                    {skill.name}
                  </h1>
                  <div className="flex items-center gap-2 mt-1"
                  >
                    {skill.skill_type === "system" ? (
                      <span className="flex items-center gap-1 text-[10px] text-accent-cyan"
                      >
                        <Shield className="w-3 h-3" />
                        {t("skill.system")}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-accent-yellow"
                      >
                        <User className="w-3 h-3" />
                        {t("skill.custom")}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground"
                    >
                      v{skill.version} · {skill.author}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => void download(skill.skill_id)}
                  disabled={downloading}
                  title={t("skill.downloadMcpBundleHint")}
                  className={cn(
                    "h-8 px-3 flex items-center gap-1.5 border-brutal border-foreground text-xs font-bold uppercase transition-none",
                    downloading
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-card text-foreground hover:bg-secondary"
                  )}
                >
                  {downloading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  {t("skill.downloadMcpBundle")}
                </button>

                {canManage && (
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploadingImages}
                    title={t("skill.editImagesHint")}
                    className={cn(
                      "h-8 px-3 flex items-center gap-1.5 border-brutal border-foreground text-xs font-bold uppercase transition-none",
                      uploadingImages
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : "bg-card text-foreground hover:bg-secondary"
                    )}
                  >
                    {uploadingImages ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ImagePlus className="w-3.5 h-3.5" />
                    )}
                    {t("skill.editImages")}
                  </button>
                )}

                {canManage && (
                  <button
                    onClick={() => setDeleteOpen(true)}
                    disabled={isDeleting}
                    className={cn(
                      "h-8 px-3 flex items-center gap-1.5 border-brutal border-foreground text-xs font-bold uppercase transition-none",
                      isDeleting
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : "bg-accent-red/10 text-accent-red hover:bg-accent-red/20"
                    )}
                  >
                    {isDeleting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    {t("skill.delete")}
                  </button>
                )}
              </div>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed mb-4"
            >
              {skill.description}
            </p>

            {skill.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-6"
              >
                {skill.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-[10px] font-bold uppercase border border-foreground/30 bg-background flex items-center gap-1"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 border-t border-foreground/10 pt-4"
            >
              <div
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1"
                >
                  {t("skill.cost")}
                </div>
                <div className="text-sm font-mono"
                >
                  {pricePoints > 0
                    ? t("skill.costPoints", { count: pricePoints })
                    : t("skill.metered")}
                </div>
              </div>
              <div
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1"
                >
                  {t("skill.status")}
                </div>
                <div className="text-sm font-mono"
                >
                  {skill.is_active ? (
                    <span className="text-accent-green"
                    >{t("skill.active")}</span>
                  ) : (
                    <span className="text-muted-foreground"
                    >{t("skill.inactive")}</span>
                  )}
                </div>
              </div>
              <div
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1"
                >
                  {t("skill.skillId")}
                </div>
                <div className="text-sm font-mono text-muted-foreground truncate"
                >
                  {skill.skill_id}
                </div>
              </div>
            </div>
          </div>

          {skill.instructions && (
            <div className="border-t border-foreground/10"
            >
              <div className="px-6 py-2 border-b border-foreground/10 bg-secondary/20"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                >
                  {t("skill.instructions")}
                </span>
              </div>
              <div className="p-6"
              >
                <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap text-foreground/80"
                >
                  {skill.instructions}
                </pre>
              </div>
            </div>
          )}

          {skill.scripts && skill.scripts.length > 0 && (
            <div className="border-t border-foreground/10"
            >
              <div className="px-6 py-2 border-b border-foreground/10 bg-secondary/20"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                >
                  {t("skill.scripts")}
                </span>
              </div>
              <div className="p-6 space-y-2"
              >
                {skill.scripts.map((script) => (
                  <div
                    key={script}
                    className="flex items-center gap-2 px-3 py-2 border border-foreground/20 bg-background font-mono text-xs"
                  >
                    <Wrench className="w-3 h-3 text-muted-foreground" />
                    {script}
                  </div>
                ))}
              </div>
            </div>
          )}

          {skill.references && skill.references.length > 0 && (
            <div className="border-t border-foreground/10"
            >
              <div className="px-6 py-2 border-b border-foreground/10 bg-secondary/20"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                >
                  {t("skill.references")}
                </span>
              </div>
              <div className="p-6 space-y-2"
              >
                {skill.references.map((ref) => (
                  <div
                    key={ref}
                    className="flex items-center gap-2 px-3 py-2 border border-foreground/20 bg-background font-mono text-xs"
                  >
                    <Tag className="w-3 h-3 text-muted-foreground" />
                    {ref}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void handleImageUpload(e.target.files)}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("skill.deleteTitle")}
        description={
          <>
            <span className="font-mono">
              {skill.skill_id} · {skill.name}
            </span>
            <br />
            {t("skill.deleteConfirm")}
          </>
        }
        confirmLabel={t("skill.confirmDelete")}
        cancelLabel={t("skill.cancel")}
        destructive
        loading={isDeleting}
        onConfirm={() => void handleDelete()}
      />

      <McpBundleDialog
        bundle={bundle}
        skillName={skill.name}
        onOpenChange={(open) => {
          if (!open) closeBundle();
        }}
      />
    </div>
  );
};

export default SkillDetail;
