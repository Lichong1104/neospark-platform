/** 创建视频生成任务请求 */
export interface CreateVideoParams {
  prompt: string;
  negative_prompt?: string;
  mode?: "text_to_video" | "image_to_video";
  model?: string;
  ref_image_path?: string;
  duration?: number;
  resolution?: "480p" | "720p" | "1080p";
  ratio?: string;
  generate_audio?: boolean;
  seed?: number;
}

/** 创建视频任务响应 */
export interface CreateVideoResponse {
  task_id: string;
  status: string;
  estimated_cost: number;
  ws_url: string;
  created_at: string;
}

/** 视频任务详情 */
export interface VideoTaskDetail {
  task_id: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  progress: number;
  video_url?: string;
  cover_image?: string;
  estimated_cost?: number;
  actual_cost?: number;
  created_at: string;
  completed_at?: string;
}

/** 视频任务列表查询参数 */
export interface ListVideoTasksParams {
  page?: number;
  page_size?: number;
  status?: "pending" | "processing" | "completed" | "failed" | "cancelled";
}

/** 视频任务列表响应 */
export interface VideoTaskListData {
  items: VideoTaskDetail[];
  total: number;
  page: number;
  page_size: number;
}

/** WebSocket 消息类型 */
export interface VideoWsMessage {
  type: "connected" | "status";
  task_id: string;
  status: string;
  progress: number;
  video_url?: string;
  error?: string;
}
