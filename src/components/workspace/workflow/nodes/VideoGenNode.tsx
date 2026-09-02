import { memo, useEffect, useMemo, useRef, useState } from "react";
import { type NodeProps, useReactFlow } from "@xyflow/react";
import { Film, Loader2, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { createVideoTask, getVideoModels } from "@/api/video";
import { useVideoTaskPolling } from "@/hooks/useVideoTaskPolling";
import { getErrorMessage } from "@/lib/errorMessage";
import { resolveInputs } from "@/lib/workflow/executor";
import { toServerPath } from "@/lib/workflow/url";
import {
  mergeDurationOptionsFromApi,
  normalizeVideoRatio,
  pickDurationInOptions,
  resolveResolutionList,
} from "@/lib/videoModelUtils";
import type {
  CreateVideoParams,
  VideoModelsData,
  VideoResolution,
} from "@/types/video";
import type { WorkflowNode } from "@/lib/workflow/types";
import { NodeCard, NodeSelect } from "./common";

const DEFAULT_RATIOS = ["16:9", "9:16", "1:1"];
const DEFAULT_RESOLUTIONS = ["720p", "1080p"];
const DEFAULT_DURATIONS = ["4", "5", "8", "10"];

function VideoGenNodeImpl({ id, data }: NodeProps<WorkflowNode>) {
  const { t } = useTranslation();
  const { updateNodeData, getNodes, getEdges } = useReactFlow();

  const [videoModelsData, setVideoModelsData] = useState<VideoModelsData | null>(null);
  const [model, setModel] = useState("gemini-omni-flash-preview");
  const [ratio, setRatio] = useState("16:9");
  const [duration, setDuration] = useState("5");
  const [resolution, setResolution] = useState("720p");
  const [inlinePrompt, setInlinePrompt] = useState("");

  const polling = useVideoTaskPolling();

  const paramsRef = useRef({ model, ratio, duration, resolution, inlinePrompt });
  paramsRef.current = { model, ratio, duration, resolution, inlinePrompt };

  useEffect(() => {
    getVideoModels()
      .then((res) => {
        setVideoModelsData(res);
        if (res.models?.length) setModel(res.models[0].id);
        if (res.ratios?.length) {
          const rs = res.ratios.map(normalizeVideoRatio);
          setRatio(rs[0]);
        }
        const rl = resolveResolutionList(res.resolutions);
        if (rl.length) setResolution(rl[0] as VideoResolution);
      })
      .catch(() => {});
  }, []);

  const ratioOptions = useMemo(() => {
    const rs = videoModelsData?.ratios?.length ? videoModelsData.ratios : DEFAULT_RATIOS;
    return rs.map(normalizeVideoRatio).map((v) => ({ value: v, label: v }));
  }, [videoModelsData]);

  const durationOptions = useMemo(() => {
    const opts = mergeDurationOptionsFromApi(videoModelsData?.durations, model);
    return (opts.length ? opts : DEFAULT_DURATIONS).map((v) => ({ value: v, label: `${v}s` }));
  }, [videoModelsData, model]);

  const resolutionOptions = useMemo(() => {
    const r = videoModelsData?.resolutions;
    let list: string[] = DEFAULT_RESOLUTIONS;
    if (r && typeof r === "object" && !Array.isArray(r)) {
      const perModel = (r as Record<string, string[]>)[model];
      if (perModel?.length) list = perModel;
    } else {
      const resolved = resolveResolutionList(r);
      if (resolved.length) list = resolved;
    }
    return list.map((v) => ({ value: v, label: v }));
  }, [videoModelsData, model]);

  // 模型变化时校正 duration/resolution
  useEffect(() => {
    if (!videoModelsData) return;
    const opts = mergeDurationOptionsFromApi(videoModelsData.durations, model);
    if (opts.length) setDuration((prev) => pickDurationInOptions(prev, opts));
    const r = videoModelsData.resolutions;
    if (r && typeof r === "object" && !Array.isArray(r)) {
      const perModel = (r as Record<string, string[]>)[model];
      if (perModel?.length) {
        setResolution((prev) =>
          perModel.includes(prev) ? prev : (perModel[0] as VideoResolution)
        );
      }
    }
  }, [videoModelsData, model]);

  const handleRun = useCallback(() => {
    if (data.status === "running") return;
    updateNodeData(id, { outputVideo: undefined, error: undefined });
    void runGenerate();
  }, [data.status, id, updateNodeData]);

  const runGenerate = async () => {
    const params = paramsRef.current;
    const { prompt, images, videos } = resolveInputs(
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
      const firstFrame = images[0] ? toServerPath(images[0]) : undefined;
      const refImages = images.slice(1).map(toServerPath).filter(Boolean);
      const refVideos = videos.map(toServerPath).filter(Boolean);

      const vParams: CreateVideoParams = {
        prompt: finalPrompt,
        model: params.model,
        duration: Number(
          pickDurationInOptions(
            params.duration,
            durationOptions.map((o) => o.value)
          )
        ),
        ratio: normalizeVideoRatio(params.ratio),
        resolution: params.resolution as VideoResolution,
        generate_audio: false,
        watermark: false,
        ...(firstFrame ? { first_frame_url: firstFrame } : {}),
        ...(refImages.length ? { reference_image_urls: refImages } : {}),
        ...(refVideos.length ? { reference_video_urls: refVideos } : {}),
      };

      const res = await createVideoTask(vParams);
      polling.startPolling(res.task_id);
    } catch (err) {
      updateNodeData(id, {
        status: "error",
        error: getErrorMessage(err, t("workflow.generateFailed")),
      });
    }
  };

  useEffect(() => {
    if (polling.status === "completed" && polling.videoUrl) {
      updateNodeData(id, { status: "done", outputVideo: polling.videoUrl });
      polling.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polling.status, polling.videoUrl]);

  useEffect(() => {
    if (polling.status === "failed") {
      updateNodeData(id, { status: "error", error: polling.error });
      polling.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polling.status, polling.error]);

  const status = data.status ?? "idle";
  const output = data.outputVideo;

  return (
    <NodeCard
      id={id}
      label={t("workflow.nodeVideo")}
      status={status}
      icon={<Film className="h-3 w-3" />}
      accent="bg-accent-purple"
      hasTarget
      hasSource
      action={
        <button
          type="button"
          onClick={handleRun}
          disabled={status === "running"}
          className="nodrag flex h-4 w-4 items-center justify-center rounded border border-foreground/30 text-muted-foreground transition-colors hover:border-accent-purple hover:bg-accent-purple hover:text-foreground disabled:opacity-50"
          title={t("workflow.runNode")}
        >
          {status === "running" ? (
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
          ) : (
            <Play className="h-2.5 w-2.5" />
          )}
        </button>
      }
    >
      <div className="space-y-2">
        <textarea
          value={inlinePrompt}
          onChange={(e) => setInlinePrompt(e.target.value)}
          placeholder={t("workflow.promptPlaceholder")}
          className="nodrag h-14 w-full resize-none rounded border border-foreground/20 bg-background p-1.5 text-xs text-foreground outline-none focus:border-foreground/50"
        />
        <div className="flex gap-1.5">
          <NodeSelect
            label={t("workflow.model")}
            value={model}
            onChange={setModel}
            options={(videoModelsData?.models ?? []).map((m) => ({ value: m.id, label: m.name }))}
          />
          <NodeSelect
            label={t("workflow.ratio")}
            value={normalizeVideoRatio(ratio)}
            onChange={(v) => setRatio(v)}
            options={ratioOptions}
          />
          <NodeSelect
            label={t("workflow.duration")}
            value={duration}
            onChange={setDuration}
            options={durationOptions}
          />
          <NodeSelect
            label={t("workflow.resolution")}
            value={resolution}
            onChange={(v) => setResolution(v as VideoResolution)}
            options={resolutionOptions}
          />
        </div>
        {output ? (
          <video
            src={output}
            controls
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

export const VideoGenNode = memo(VideoGenNodeImpl);
