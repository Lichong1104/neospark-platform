import React, { useRef, useState } from "react";
import { Upload, Loader2, FileArchive } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import skillsApi from "@/api/skills";
import SkillAuthoringGuide from "@/components/skills/SkillAuthoringGuide";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UploadSkillButtonProps {
  onUploaded?: () => void;
  /** 自定义触发按钮（默认渲染「提交 Skill」按钮） */
  trigger?: React.ReactNode;
}

const ALLOWED_EXTENSIONS = /\.(zip|md)$/i;

const UploadSkillButton: React.FC<UploadSkillButtonProps> = ({ onUploaded, trigger }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [skillId, setSkillId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptFile = (file: File) => {
    if (!ALLOWED_EXTENSIONS.test(file.name)) {
      toast.error(t("skill.fileTypeInvalid"));
      return;
    }
    setSelectedFile(file);
    if (!skillId) {
      const name = file.name.replace(/\.(zip|md)$/i, "").replace(/[^a-zA-Z0-9_-]/g, "_");
      setSkillId(name.slice(0, 32).toLowerCase());
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      acceptFile(file);
    }
    // 允许再次选择同一文件
    e.target.value = "";
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current += 1;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) {
      e.dataTransfer.dropEffect = "copy";
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      acceptFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !skillId.trim()) {
      toast.error(t("skill.uploadValidation"));
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("skill_id", skillId.trim());

      const result = await skillsApi.uploadSkill(formData);
      toast.success(t("skill.submitSuccess", { name: result.name }));
      setIsOpen(false);
      setSelectedFile(null);
      setSkillId("");
      onUploaded?.();
    } catch (err: unknown) {
      toast.error(t("skill.submitFailed"));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      {trigger ? (
        <span onClick={() => setIsOpen(true)}>{trigger}</span>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="h-9 px-3 flex items-center gap-2 border-brutal border-foreground brutal-press bg-accent-pink text-foreground text-xs font-bold uppercase hover:brightness-110 transition-none"
        >
          <Upload className="w-4 h-4" />
          {t("skill.submit")}
        </button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md border-brutal border-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-bold uppercase tracking-wider">
              {t("skill.submitTitle")}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t("skill.submitDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Skill ID
              </label>
              <input
                type="text"
                value={skillId}
                onChange={(e) => setSkillId(e.target.value)}
                placeholder="my-skill"
                className="w-full px-3 py-2 bg-background border-brutal border-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent-pink/30"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                {t("skill.uploadFile")}
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "w-full p-4 border-2 border-dashed bg-background flex flex-col items-center gap-2 transition-none",
                  isDragging
                    ? "border-accent-pink bg-accent-pink/10 cursor-copy"
                    : "border-foreground/30 cursor-pointer hover:border-foreground/60",
                  selectedFile && !isDragging && "border-accent-pink/40 bg-accent-pink/5"
                )}
              >
                {selectedFile && !isDragging ? (
                  <>
                    <FileArchive className="w-8 h-8 text-accent-pink" />
                    <span className="text-xs font-mono text-foreground">{selectedFile.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="text-[10px] text-accent-red hover:underline"
                    >
                      {t("skill.removeFile")}
                    </button>
                  </>
                ) : (
                  <>
                    <Upload className={cn("w-8 h-8", isDragging ? "text-accent-pink" : "text-muted-foreground")} />
                    <span className={cn("text-xs", isDragging ? "text-accent-pink font-bold" : "text-muted-foreground")}>
                      {isDragging ? t("skill.dropHere") : t("skill.clickOrDrop")}
                    </span>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip,.md"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <SkillAuthoringGuide
                trigger={
                  <button className="text-[10px] font-bold uppercase tracking-wider text-accent-pink hover:underline">
                    {t("skill.guide.button")} →
                  </button>
                }
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-2 text-xs font-bold uppercase border-brutal border-foreground bg-card hover:bg-secondary transition-none"
                  disabled={isUploading}
                >
                  {t("skill.cancel")}
                </button>
                <button
                  onClick={handleUpload}
                  disabled={isUploading || !selectedFile || !skillId.trim()}
                  className={cn(
                    "px-3 py-2 text-xs font-bold uppercase border-brutal border-foreground brutal-press transition-none flex items-center gap-1.5",
                    isUploading || !selectedFile || !skillId.trim()
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-accent-pink text-foreground hover:brightness-110"
                  )}
                >
                  {isUploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {t("skill.confirmSubmit")}
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UploadSkillButton;
