import type { VideoTaskStatus } from "./video";

/** 文件元信息 */
export interface FileMeta {
  width?: number;
  height?: number;
}

/** 关联会话信息 */
export interface SessionInfo {
  session_id: string;
  session_status: string;
  session_exists: boolean;
}

/** 上传文件响应 */
export interface UploadFileResponse {
  upload_id: string;
  filename: string;
  path: string;
  url: string;
  size: number;
  content_type: string;
  file_type: string;
  meta_info: FileMeta;
}

/** 文件列表查询参数 */
export interface ListFilesParams {
  file_type?: "image" | "video" | "other";
  limit?: number;
  include_deleted?: boolean;
  check_session?: boolean;
}

/** 文件列表项 */
export interface FileItem {
  upload_id: string;
  filename: string;
  path: string;
  url: string;
  size: number;
  content_type: string;
  file_type: string;
  use_count: number;
  meta_info: FileMeta;
  status: "active" | "deleted";
  created_at: string;
  session_info?: SessionInfo;
}

/** 文件列表响应 */
export interface FileListData {
  total: number;
  files: FileItem[];
}

/** 用户图片查询参数 */
export interface ListUserImagesParams {
  source?: "upload" | "generation";
  limit?: number;
  offset?: number;
}

/** 用户图片项 */
export interface UserImageItem {
  id: string;
  type: "upload" | "generation";
  filename: string;
  path: string;
  url: string;
  size?: number;
  prompt?: string;
  model?: string;
  created_at: string;
  session_info?: SessionInfo;
}

/** 用户图片列表响应 */
export interface UserImagesData {
  total: number;
  offset: number;
  limit: number;
  images: UserImageItem[];
}

/** GET /storage/user-videos 查询参数 */
export interface ListUserVideosParams {
  source?: "upload" | "generation";
  /** 生成视频状态筛选（仅对 type=generation 有意义） */
  status?: VideoTaskStatus;
  limit?: number;
  offset?: number;
}

/** 用户视频列表项 — 生成视频 */
export interface UserVideoGenerationItem {
  id: string;
  type: "generation";
  filename: string;
  path: string;
  url: string;
  size: number;
  prompt?: string;
  model?: string;
  duration?: number;
  resolution?: string;
  ratio?: string;
  task_type?: "text_to_video" | "image_to_video";
  task_status: VideoTaskStatus;
  progress: number;
  created_at: string;
  completed_at?: string;
}

/** 用户视频列表项 — 上传视频 */
export interface UserVideoUploadItem {
  id: string;
  type: "upload";
  filename: string;
  path: string;
  url: string;
  size: number;
  content_type: string;
  status: string;
  created_at: string;
}

export type UserVideoItem = UserVideoGenerationItem | UserVideoUploadItem;

/** GET /storage/user-videos 响应 data */
export interface UserVideosData {
  total: number;
  offset: number;
  limit: number;
  items: UserVideoItem[];
}

/** 文件使用记录 */
export interface UsageRecord {
  usage_type: "image_to_image" | "video_generation" | "other";
  message_id: string;
  usage_params: Record<string, unknown>;
  created_at: string;
}

/** 文件详情 */
export interface FileDetail extends FileItem {
  usage_history: UsageRecord[];
}

/** 文件 URL 响应 */
export interface FileUrlData {
  url: string;
}
