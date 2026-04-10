export type VideoTaskStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

/** Output resolution for video generation (API `resolution` field) */
export type VideoResolution = "480p" | "720p";

/** GET /video/models */
export interface VideoModelConfig {
  id: string;
  name: string;
  description?: string;
  price_per_5s: number;
}

export interface VideoModelsData {
  models: VideoModelConfig[];
  ratios: string[];
  durations: {
    min: number;
    max: number;
    default: number;
  };
}

/** POST /video/generations */
export interface CreateVideoParams {
  prompt: string;
  model?: string;
  duration?: number;
  ratio?: string;
  /** Defaults to 720p when omitted (server / client convention) */
  resolution?: VideoResolution;
  generate_audio?: boolean;
  first_frame_url?: string;
  last_frame_url?: string;
  reference_image_urls?: string[];
  reference_video_urls?: string[];
  reference_audio_url?: string;
  asset_group_name?: string;
}

export interface CreateVideoResponse {
  task_id: string;
  external_task_id?: string;
  status: VideoTaskStatus;
  progress: number;
  model: string;
  duration: number;
  ratio: string;
  resolution?: VideoResolution;
  pricing?: {
    estimated_cost: number;
    currency?: string;
  };
  available_points_after?: number;
  created_at: string;
}

/** GET /video/generations/{task_id} */
export interface VideoTaskDetail {
  task_id: string;
  external_task_id?: string;
  status: VideoTaskStatus;
  progress: number;
  prompt?: string;
  model?: string;
  duration?: number;
  ratio?: string;
  resolution?: VideoResolution;
  generate_audio?: boolean;
  video_url?: string;
  estimated_cost?: number;
  actual_cost?: number;
  error_msg?: string;
  created_at: string;
  completed_at?: string;
}

/** GET /video/generations */
export interface ListVideoTasksParams {
  page?: number;
  page_size?: number;
  status?: VideoTaskStatus;
}

export interface VideoTaskListItem {
  task_id: string;
  status: VideoTaskStatus;
  progress: number;
  prompt?: string;
  model?: string;
  preview_url?: string;
  estimated_cost?: number;
  created_at: string;
}

export interface VideoTaskListData {
  items: VideoTaskListItem[];
  total: number;
  page: number;
  page_size: number;
}
