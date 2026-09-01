import { memo, useRef, useState } from "react";
import { type NodeProps, useReactFlow } from "@xyflow/react";
import { Image as ImageIcon, Upload } from "lucide-react";
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
      label={t("workflow.nodeImageInput")}
      status="idle"
      showStatus={false}
      icon={<ImageIcon className="h-3 w-3" />}
      accent="bg-accent-orange"
      hasSource
    >
      <div className="space-y-2">
        {data.imageUrl ? (
          <img
            src={data.imageUrl}
            alt=""
            className="h-20 w-full rounded border border-foreground/20 object-cover"
          />
        ) : (
          <div className="flex h-20 items-center justify-center rounded border border-dashed border-foreground/30 text-[10px] text-muted-foreground">
            {t("workflow.noImage")}
          </div>
        )}
        <div className="flex gap-1.5">
          <input
            value={data.imageUrl ?? ""}
            onChange={(e) => updateNodeData(id, { imageUrl: e.target.value })}
            placeholder={t("workflow.imageUrlPlaceholder")}
            className="min-w-0 flex-1 rounded border border-foreground/20 bg-background px-1.5 py-1 text-[10px] text-foreground outline-none focus:border-foreground/50"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex shrink-0 items-center rounded border border-foreground/20 px-1.5 text-[10px] hover:bg-secondary disabled:opacity-50"
            title={t("workflow.upload")}
          >
            <Upload className="h-3 w-3" />
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
