import { memo, useEffect, useMemo, useRef, useState } from "react";
import { type NodeProps, useReactFlow } from "@xyflow/react";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import drawingApi from "@/api/drawing";
import { useGenerationPolling } from "@/hooks/useGenerationPolling";
import { getErrorMessage } from "@/lib/errorMessage";
import { getOrCreateDrawingSession } from "@/lib/workflow/drawingSession";
import { resolveInputs } from "@/lib/workflow/executor";
import { toFullUrl, toServerPath } from "@/lib/workflow/url";
import {
  DEFAULT_DRAWING_MODEL,
  type GenerateImageParams,
  type ModelsConfigMap,
} from "@/types/drawing";
import type { WorkflowNode } from "@/lib/workflow/types";
import { NodeCard, NodeSelect } from "./common";

const DEFAULT_RESOLUTIONS = ["1K", "2K", "4K"];
const DEFAULT_RATIOS = ["1:1", "16:9", "9:16"];

function ImageGenNodeImpl({ id, data }: NodeProps<WorkflowNode>) {
  const { t } = useTranslation();
  const { updateNodeData, getNodes, getEdges } = useReactFlow();

  const [modelsConfig, setModelsConfig] = useState<ModelsConfigMap | null>(null);
  const [model, setModel] = useState(DEFAULT_DRAWING_MODEL);
  const [resolution, setResolution] = useState("1K");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [inlinePrompt, setInlinePrompt] = useState("");

  const polling = useGenerationPolling();

  // 供生成 effect 读取的最新参数快照（避免闭包过期）
  const paramsRef = useRef({
    model,
    resolution,
    aspectRatio,
    inlinePrompt,
    provider: "gemini" as "gemini" | "tengda",
  });
  paramsRef.current = { ...paramsRef.current, model, resolution, aspectRatio, inlinePrompt };

  useEffect(() => {
    drawingApi
      .getModelsConfig()
      .then(setModelsConfig)
      .catch(() => {});
  }, []);

  const currentCfg = modelsConfig?.[model];

  // 模型配置加载后补齐默认值
  useEffect(() => {
    if (!modelsConfig) return;
    const ids = Object.keys(modelsConfig);
    if (!ids.length) return;
    if (!modelsConfig[model]) {
      const fallbackId = modelsConfig[DEFAULT_DRAWING_MODEL] ? DEFAULT_DRAWING_MODEL : ids[0];
      setModel(fallbackId);
      const cfg = modelsConfig[fallbackId];
      setResolution(cfg.supported_resolutions[0]?.value ?? "1K");
      setAspectRatio(cfg.supported_aspect_ratios[0]?.value ?? "1:1");
    }
    paramsRef.current.provider = modelsConfig[model]?.provider ?? "gemini";
  }, [modelsConfig, model]);

  // 当前模型不支持所选分辨率/比例时回退
  useEffect(() => {
    if (!currentCfg) return;
    if (!currentCfg.supported_resolutions.some((r) => r.value === resolution)) {
      setResolution(currentCfg.supported_resolutions[0]?.value ?? "1K");
    }
    if (!currentCfg.supported_aspect_ratios.some((a) => a.value === aspectRatio)) {
      setAspectRatio(currentCfg.supported_aspect_ratios[0]?.value ?? "1:1");
    }
  }, [currentCfg, resolution, aspectRatio]);

  const modelOptions = useMemo(() => {
    if (!modelsConfig) return [{ value: model, label: model }];
    return Object.entries(modelsConfig).map(([mid, cfg]) => ({
      value: mid,
      label: cfg.name.replace(/\s*\(Tengda\)/i, "").trim() || mid,
    }));
  }, [modelsConfig, model]);

  const resolutionOptions = useMemo(() => {
    const rs = currentCfg?.supported_resolutions ?? [];
    const values = rs.length ? rs.map((r) => r.value) : DEFAULT_RESOLUTIONS;
    return values.map((v) => ({ value: v, label: v }));
  }, [currentCfg]);

  const ratioOptions = useMemo(() => {
    const ars = currentCfg?.supported_aspect_ratios ?? [];
    const values = ars.length ? ars.map((a) => a.value) : DEFAULT_RATIOS;
    return values.map((v) => ({ value: v, label: v }));
  }, [currentCfg]);

  // 生成触发
  const startedRef = useRef(false);
  useEffect(() => {
    if (data.pendingGenerate && !startedRef.current) {
      startedRef.current = true;
      void runGenerate();
    }
    if (!data.pendingGenerate) startedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.pendingGenerate]);

  const runGenerate = async () => {
    const params = paramsRef.current;
    const { prompt, images } = resolveInputs(
      id,
      getNodes() as WorkflowNode[],
      getEdges()
    );
    const finalPrompt = (prompt || params.inlinePrompt).trim();
    if (!finalPrompt) {
      updateNodeData(id, { status: "error", error: t("workflow.noPrompt") });
      return;
    }
    updateNodeData(id, { status: "running" });
    try {
      const sid = await getOrCreateDrawingSession();
      const refPaths = images.map(toServerPath).filter(Boolean).slice(0, 14);
      const gParams: GenerateImageParams = {
        prompt: finalPrompt,
        model: params.model,
        resolution: params.resolution,
        aspect_ratio: params.aspectRatio,
        num_images: 1,
        provider: params.provider,
        optimize_prompt: true,
        ...(params.model === "gpt-image-2" ? { quality: "low" as const } : {}),
      };
      if (refPaths.length > 1) gParams.ref_image_paths = refPaths;
      else if (refPaths.length === 1) gParams.ref_image_path = refPaths[0];

      const res = await drawingApi.generateImage(sid, gParams);
      polling.startPolling(res.message_id);
    } catch (err) {
      updateNodeData(id, {
        status: "error",
        error: getErrorMessage(err, t("workflow.generateFailed")),
      });
    }
  };

  useEffect(() => {
    if (polling.status === "completed" && polling.images.length) {
      updateNodeData(id, {
        status: "done",
        outputImages: polling.images.map((img) => toFullUrl(img.url)),
      });
      polling.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polling.status, polling.images]);

  useEffect(() => {
    if (polling.status === "failed") {
      updateNodeData(id, { status: "error", error: polling.error });
      polling.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polling.status, polling.error]);

  const status = data.status ?? "idle";
  const preview = data.outputImages?.[0];

  return (
    <NodeCard
      label={t("workflow.nodeImage")}
      status={status}
      icon={<ImageIcon className="h-3 w-3" />}
      accent="bg-accent-cyan"
      hasTarget
      hasSource
    >
      <div className="space-y-2">
        <textarea
          value={inlinePrompt}
          onChange={(e) => setInlinePrompt(e.target.value)}
          placeholder={t("workflow.promptPlaceholder")}
          className="h-14 w-full resize-none rounded border border-foreground/20 bg-background p-1.5 text-xs text-foreground outline-none focus:border-foreground/50"
        />
        <div className="flex gap-1.5">
          <NodeSelect
            label={t("workflow.model")}
            value={model}
            onChange={setModel}
            options={modelOptions}
          />
          <NodeSelect
            label={t("workflow.resolution")}
            value={resolution}
            onChange={setResolution}
            options={resolutionOptions}
          />
          <NodeSelect
            label={t("workflow.ratio")}
            value={aspectRatio}
            onChange={setAspectRatio}
            options={ratioOptions}
          />
        </div>
        {preview ? (
          <img
            src={preview}
            alt=""
            className="h-24 w-full rounded border border-foreground/20 object-cover"
          />
        ) : status === "running" ? (
          <div className="flex h-12 items-center justify-center gap-2 text-[10px] text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t("workflow.generating")}
          </div>
        ) : null}
        {data.error ? (
          <p className="text-[10px] text-accent-pink">{data.error}</p>
        ) : null}
      </div>
    </NodeCard>
  );
}

export const ImageGenNode = memo(ImageGenNodeImpl);
