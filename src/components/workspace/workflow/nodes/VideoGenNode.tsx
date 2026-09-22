import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type NodeProps, useReactFlow } from "@xyflow/react";
import { Film, Loader2, Mic, FileUp, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { createVideoTask, getVideoModels } from "@/api/video";
import storageApi from "@/api/storage";
import { useVideoTaskPolling } from "@/hooks/useVideoTaskPolling";
import { getErrorMessage } from "@/lib/errorMessage";
import { resolveInputs } from "@/lib/workflow/executor";
import { toServerPath } from "@/lib/workflow/url";
import {
  mergeDurationOptionsFromApi,
  normalizeVideoRatio,
  pickDurationInOptions,
  resolveResolutionList,
  supportsDocumentInput,
  supportsReferenceAudio,
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
  // 参考语音 / 参考文件上传（按模型能力显示）
  const [refAudioPaths, setRefAudioPaths] = useState<string[]>([]);
  const [refFilePath, setRefFilePath] = useState("");
  const audioInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const polling = useVideoTaskPolling();

  const paramsRef = useRef({ model, ratio, duration, resolution, inlinePrompt });
  paramsRef.current = { model, ratio, duration, resolution, inlinePrompt };
  const showRefAudio = supportsReferenceAudio(model);
  const showRefFile = supportsDocumentInput(model);

  const handleUploadAudio = useCallback(
    async (file: File) => {
      try {
        const uploaded = await storageApi.uploadFile(file, "audio");
        const p = uploaded.url || uploaded.path || "";
        const path = p ? (p.startsWith("/") ? p : `/${p}`) : "";
        if (!path) return;
        setRefAudioPaths((prev) =>
          prev.includes(path) ? prev : [...prev, path]
        );
        toast.success(t("video.refUploaded"));
      } catch (err) {
        toast.error(getErrorMessage(err, t("video.uploadFailed")));
      }
    },
    [t]
  );

  const handleUploadFile = useCallback(
    async (file: File) => {
      try {
        const uploaded = await storageApi.uploadFile(file, "other");
        const p = uploaded.url || uploaded.path || "";
        const path = p ? (p.startsWith("/") ? p : `/${p}`) : "";
        if (!path) return;
        setRefFilePath(path);
        toast.success(t("video.refUploaded"));
      } catch (err) {
        toast.error(getErrorMessage(err, t("video.uploadFailed")));
      }
    },
    [t]
  );

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
        ...(showRefAudio && refAudioPaths.length
          ? { reference_audio_urls: refAudioPaths }
          : {}),
        ...(showRefFile && refFilePath
          ? { reference_file_url: refFilePath }
          : {}),
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
      icon={<Film className="h-3.5 w-3.5" />}
      accent="bg-accent-purple"
      hasTarget
      hasSource
      action={
        <button
          type="button"
          onClick={handleRun}
          disabled={status === "running"}
          className="nodrag flex h-5 w-5 items-center justify-center rounded border border-foreground/30 text-muted-foreground transition-colors hover:border-accent-purple hover:bg-accent-purple hover:text-foreground disabled:opacity-50"
          title={t("workflow.runNode")}
        >
          {status === "running" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Play className="h-3 w-3" />
          )}
        </button>
      }
    >
      <div className="space-y-2.5">
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-bold uppercase text-muted-foreground">
            {t("workflow.prompt")}
          </span>
          <textarea
            value={inlinePrompt}
            onChange={(e) => setInlinePrompt(e.target.value)}
            placeholder={t("workflow.promptPlaceholder")}
            className="nodrag h-14 w-full resize-none rounded border border-foreground/20 bg-background p-2 text-xs leading-relaxed text-foreground outline-none transition-colors focus:border-foreground/50"
          />
        </div>

        <div className="grid grid-cols-2 gap-1.5">
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

        {(showRefAudio || showRefFile) && (
          <div className="flex items-center gap-1.5">
            {showRefAudio && (
              <button
                type="button"
                onClick={() => audioInputRef.current?.click()}
                title={t("video.uploadRefAudio")}
                className="nodrag inline-flex h-6 items-center gap-1 rounded border border-foreground/30 px-2 text-[10px] font-bold text-muted-foreground transition-colors hover:border-accent-cyan hover:text-foreground"
              >
                <Mic className="h-3 w-3" />
                {refAudioPaths.length > 0 ? `${refAudioPaths.length}` : t("video.referenceAudioUrls")}
              </button>
            )}
            {showRefFile && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title={t("video.uploadRefFile")}
                className="nodrag inline-flex h-6 items-center gap-1 rounded border border-foreground/30 px-2 text-[10px] font-bold text-muted-foreground transition-colors hover:border-accent-orange hover:text-foreground"
              >
                <FileUp className="h-3 w-3" />
                {refFilePath ? "✓" : t("video.referenceFileUrl")}
              </button>
            )}
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUploadAudio(file);
                e.currentTarget.value = "";
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,.txt,.md,.key,.pages,.numbers"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUploadFile(file);
                e.currentTarget.value = "";
              }}
            />
          </div>
        )}

        {output ? (
          <video
            src={output}
            controls
            className="h-28 w-full rounded border border-foreground/20 object-cover"
          />
        ) : status === "running" ? (
          <div className="flex h-14 items-center justify-center gap-2 rounded border border-dashed border-foreground/20 text-[10px] text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t("workflow.generating")}
          </div>
        ) : null}

        {data.error ? (
          <p className="text-[10px] leading-snug text-accent-pink">{data.error}</p>
        ) : null}
      </div>
    </NodeCard>
  );
}

export const VideoGenNode = memo(VideoGenNodeImpl);
