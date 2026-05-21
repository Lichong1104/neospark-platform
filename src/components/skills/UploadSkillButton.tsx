import React, { useRef, useState } from "react";
import { Upload, Loader2, X, FileArchive } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import skillsApi from "@/api/skills";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UploadSkillButtonProps {
  onUploaded?: () => void;
}

const UploadSkillButton: React.FC<UploadSkillButtonProps> = ({ onUploaded }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [skillId, setSkillId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!skillId) {
        const name = file.name.replace(/\.zip$/i, "").replace(/[^a-zA-Z0-9_-]/g, "_");
        setSkillId(name.slice(0, 32));
      }
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
      toast.success(t("skill.uploadSuccess", { name: result.name }));
      setIsOpen(false);
      setSelectedFile(null);
      setSkillId("");
      onUploaded?.();
    } catch (err: unknown) {
      toast.error(t("skill.uploadFailed"));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="h-9 px-3 flex items-center gap-2 border-brutal border-foreground brutal-press bg-accent-pink text-foreground text-xs font-bold uppercase hover:brightness-110 transition-none"
      >
        <Upload className="w-4 h-4" />
        {t("skill.upload")}
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md border-brutal border-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-bold uppercase tracking-wider">
              {t("skill.uploadTitle")}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t("skill.uploadDesc")}
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
                className={cn(
                  "w-full p-4 border-2 border-dashed border-foreground/30 bg-background cursor-pointer hover:border-foreground/60 transition-none flex flex-col items-center gap-2",
                  selectedFile && "border-accent-pink/40 bg-accent-pink/5"
                )}
              >
                {selectedFile ? (
                  <>
                    <FileArchive className="w-8 h-8 text-accent-pink" />
                    <span className="text-xs font-mono text-foreground">{selectedFile.name}</span>
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
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {t("skill.clickOrDrop")}
                    </span>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
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
                {t("skill.confirmUpload")}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UploadSkillButton;
