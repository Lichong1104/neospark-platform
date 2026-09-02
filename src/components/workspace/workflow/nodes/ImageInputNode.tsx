import { memo, useRef, useState } from "react";
import { type NodeProps, useReactFlow } from "@xyflow/react";
import { Image as ImageIcon, Loader2, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { uploadFile } from "@/api/storage";
import { getErrorMessage } from "@/lib/errorMessage";
import { toFullUrl } from "@/lib/workflow/url";
import { NodeCard } from "./common";
import type { WorkflowNode } from "@/lib/workflow/types";

function ImageInputNodeImpl({ id, data }: NodeProps<WorkflowNode>) {
  const { t } = useTranslation();
  const { updateNodeData } = useReactFlow();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadFile(file, "image");
      updateNodeData(id, { imageUrl: toFullUrl(res.url) });
    } catch (err) {
      toast.error(getErrorMessage(err, t("workflow.uploadFailed")));
    } finally {
      setUploading(false);
    }
  };

  return (
    <NodeCard
      id={id}
      label={t("workflow.nodeImageInput")}
      status="idle"
      showStatus={false}
      icon={<ImageIcon className="h-3.5 w-3.5" />}
      accent="bg-accent-orange"
      hasSource
    >
      <div className="space-y-2">
        {data.imageUrl ? (
          <img
            src={data.imageUrl}
            alt=""
            className="h-24 w-full rounded border border-foreground/20 object-cover"
          />
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="nodrag flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded border border-dashed border-foreground/30 text-muted-foreground transition-colors hover:border-foreground/50 hover:bg-secondary"
          >
            <ImageIcon className="h-6 w-6 opacity-40" />
            <span className="text-[10px] font-bold uppercase">{t("workflow.noImage")}</span>
          </button>
        )}
        <div className="flex gap-1.5">
          <input
            value={data.imageUrl ?? ""}
            onChange={(e) => updateNodeData(id, { imageUrl: e.target.value })}
            placeholder={t("workflow.imageUrlPlaceholder")}
            className="nodrag min-w-0 flex-1 rounded border border-foreground/20 bg-background px-2 py-1 text-[10px] text-foreground outline-none transition-colors focus:border-foreground/50"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="nodrag inline-flex h-7 shrink-0 items-center rounded border border-foreground/20 bg-background px-2 text-[10px] font-bold uppercase transition-colors hover:bg-secondary disabled:opacity-50"
            title={t("workflow.upload")}
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onUpload}
        />
      </div>
    </NodeCard>
  );
}

export const ImageInputNode = memo(ImageInputNodeImpl);
