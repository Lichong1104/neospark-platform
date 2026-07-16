import type { GptImageQuality } from "@/components/workspace/ImageGenerationParams";
import type { VideoResolution } from "@/types/video";

/**
 * 聊天优先过渡页（Landing）→ 画布工作区（Workspace）之间的请求/种子类型单一来源。
 * 独立成文件以避免 CanvasArea ↔ LandingComposer 等之间的循环依赖。
 */

export type LandingMode = "IMAGE" | "VIDEO" | "AGENT";

/** 过渡页上传的参考素材：url 用于缩略展示，path 用于生成接口的参考路径。 */
export interface UploadedRef {
  url: string;
  path: string;
  name?: string;
}

/** 图片生成种子：过渡页采集、画布生成节点消费的参数。 */
export interface ImageGenSeed {
  prompt: string;
  model: string;
  aspectRatio: string;
  resolution: string;
  gptImageQuality: GptImageQuality;
  /** 上传的参考图（可选）。 */
  refImages?: UploadedRef[];
}

/** 视频生成种子。 */
export interface VideoGenSeed {
  prompt: string;
  model: string;
  ratio: string;
  duration: string;
  resolution: VideoResolution;
  /** 上传的参考图 / 参考视频（可选）。 */
  refImages?: UploadedRef[];
  refVideos?: UploadedRef[];
}

/** Agent 请求：自动发送给 AgentHubChatArea。 */
export interface AgentGenRequest {
  prompt: string;
  skills: string[];
}

/** 过渡页提交给工作区的完整请求。nonce 用于去重（相同文案重复提交也会重新触发）。 */
export type PendingRequest =
  | { mode: "IMAGE"; nonce: number; seed: ImageGenSeed }
  | { mode: "VIDEO"; nonce: number; seed: VideoGenSeed }
  | { mode: "AGENT"; nonce: number; seed: AgentGenRequest };
