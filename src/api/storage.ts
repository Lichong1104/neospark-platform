import http, { STATIC_BASE_URL } from "./request";
import type {
  UploadFileResponse,
  ListFilesParams,
  FileListData,
  ListUserImagesParams,
  UserImagesData,
  ListUserVideosParams,
  UserVideosData,
  FileDetail,
  FileUrlData,
} from "@/types/storage";
import type { ApiResponse } from "@/types/common";

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export type UploadProgressCallback = (progress: UploadProgress) => void;

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
const CHUNK_UPLOAD_THRESHOLD = 5 * 1024 * 1024; // 5MB
const MAX_CHUNK_RETRIES = 3;

/**
 * 上传文件
 * POST /api/v1/storage/upload (multipart/form-data)
 *
 * 小文件走单接口，大文件自动走分片上传。
 */
export async function uploadFile(
  file: File,
  fileType: "image" | "video" | "other" = "image",
  onProgress?: UploadProgressCallback
): Promise<UploadFileResponse> {
  if (file.size <= CHUNK_UPLOAD_THRESHOLD) {
    return uploadSingleFile(file, fileType, onProgress);
  }
  return uploadChunkedFile(file, fileType, onProgress);
}

async function uploadSingleFile(
  file: File,
  fileType: "image" | "video" | "other",
  onProgress?: UploadProgressCallback
): Promise<UploadFileResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("file_type", fileType);
  const res = await http.postForm<UploadFileResponse>("/storage/upload", formData, {
    onUploadProgress: (e) => {
      if (!onProgress || !e.total) return;
      onProgress({
        loaded: e.loaded,
        total: e.total,
        percentage: Math.round((e.loaded / e.total) * 100),
      });
    },
  });
  return res.data;
}

async function uploadChunkedFile(
  file: File,
  fileType: "image" | "video" | "other",
  onProgress?: UploadProgressCallback
): Promise<UploadFileResponse> {
  const chunkSize = CHUNK_SIZE;
  const totalChunks = Math.ceil(file.size / chunkSize);

  const initRes = await http.post<ChunkInitData, ChunkInitPayload>("/storage/upload/chunk/init", {
    filename: file.name,
    content_type: file.type || "application/octet-stream",
    file_type: fileType,
    total_size: file.size,
    chunk_size: chunkSize,
  });

  const { session_id, total_chunks: serverTotalChunks } = initRes.data;
  const actualTotalChunks = serverTotalChunks || totalChunks;
  let uploadedBytes = 0;

  try {
    for (let i = 0; i < actualTotalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(file.size, start + chunkSize);
      const blob = file.slice(start, end);

      await uploadChunkWithRetry(session_id, i + 1, blob);

      uploadedBytes += end - start;
      onProgress?.({
        loaded: uploadedBytes,
        total: file.size,
        percentage: Math.round((uploadedBytes / file.size) * 100),
      });
    }

    const completeRes = await http.post<UploadFileResponse>(
      `/storage/upload/chunk/${session_id}/complete`
    );
    return completeRes.data;
  } catch (err) {
    // 尽最大努力通知后端清理
    http.del(`/storage/upload/chunk/${session_id}`).catch(() => {});
    throw err;
  }
}

async function uploadChunkWithRetry(
  sessionId: string,
  chunkNumber: number,
  blob: Blob,
  retries = MAX_CHUNK_RETRIES
): Promise<void> {
  let lastErr: unknown;

  for (let attempt = 0; attempt < retries; attempt++) {
    const formData = new FormData();
    formData.append("chunk_number", chunkNumber.toString());
    formData.append("chunk", blob, `chunk_${chunkNumber}`);

    try {
      await http.postForm(`/storage/upload/chunk/${sessionId}`, formData);
      return;
    } catch (err) {
      lastErr = err;
      await sleep(1000 * (attempt + 1));
    }
  }

  throw lastErr;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ChunkInitPayload {
  filename: string;
  content_type: string;
  file_type: string;
  total_size: number;
  chunk_size: number;
}

interface ChunkInitData {
  session_id: string;
  chunk_size: number;
  total_chunks: number;
  expires_at: string;
}

/**
 * 获取文件列表
 * GET /api/v1/storage/files
 */
export async function listFiles(
  params?: ListFilesParams
): Promise<FileListData> {
  const res = await http.get<FileListData>(
    "/storage/files",
    params as Record<string, unknown>
  );
  return res.data;
}

/**
 * 获取用户所有图片
 * GET /api/v1/storage/user-images
 */
export async function listUserImages(
  params?: ListUserImagesParams
): Promise<UserImagesData> {
  const res = await http.get<UserImagesData>(
    "/storage/user-images",
    params as Record<string, unknown>
  );
  return res.data;
}

export type ListAllUserImagesParams = Omit<
  ListUserImagesParams,
  "limit" | "offset"
> & {
  /**
   * Page size per request.
   * Use a reasonable value to avoid timeouts.
   */
  pageSize?: number;
  /**
   * Backend-enforced maximum page size (default: 20).
   */
  pageSizeMax?: number;
  /**
   * Safety cap to avoid infinite loops if backend behaves unexpectedly.
   */
  maxPages?: number;
};

/**
 * 获取用户所有图片（自动翻页拉取，避免后端默认 limit=20 导致只返回前 20 条）
 */
export async function listAllUserImages(
  params?: ListAllUserImagesParams
): Promise<UserImagesData> {
  const { pageSize = 20, pageSizeMax = 20, maxPages = 200, ...rest } = params ?? {};
  const effectivePageSize = Math.max(1, Math.min(pageSize, pageSizeMax));

  let offset = 0;
  let total: number | null = null;
  const images: UserImagesData["images"] = [];

  for (let page = 0; page < maxPages; page++) {
    const data = await listUserImages({
      ...(rest as Omit<ListUserImagesParams, "limit" | "offset">),
      limit: effectivePageSize,
      offset,
    });

    if (total === null) total = data.total ?? 0;

    const batch = data.images ?? [];
    if (batch.length === 0) break;

    images.push(...batch);
    offset += batch.length;

    if (images.length >= (total ?? 0)) break;
  }

  return {
    total: total ?? images.length,
    offset: 0,
    limit: images.length,
    images,
  };
}

/**
 * 获取用户所有视频（上传 + 生成）
 * GET /api/v1/storage/user-videos
 */
export async function listUserVideos(
  params?: ListUserVideosParams
): Promise<UserVideosData> {
  const res = await http.get<UserVideosData>(
    "/storage/user-videos",
    params as Record<string, unknown>
  );
  return res.data;
}

export type ListAllUserVideosParams = Omit<
  ListUserVideosParams,
  "limit" | "offset"
> & {
  pageSize?: number;
  pageSizeMax?: number;
  maxPages?: number;
};

/**
 * 获取用户全部视频（自动翻页，避免默认 limit=20 只返回一页）
 */
export async function listAllUserVideos(
  params?: ListAllUserVideosParams
): Promise<UserVideosData> {
  const { pageSize = 20, pageSizeMax = 100, maxPages = 200, ...rest } =
    params ?? {};
  const effectivePageSize = Math.max(1, Math.min(pageSize, pageSizeMax));

  let offset = 0;
  let total: number | null = null;
  const items: UserVideosData["items"] = [];

  for (let page = 0; page < maxPages; page++) {
    const data = await listUserVideos({
      ...(rest as Omit<ListUserVideosParams, "limit" | "offset">),
      limit: effectivePageSize,
      offset,
    });

    if (total === null) total = data.total ?? 0;

    const batch = data.items ?? [];
    if (batch.length === 0) break;

    items.push(...batch);
    offset += batch.length;

    if (items.length >= (total ?? 0)) break;
  }

  return {
    total: total ?? items.length,
    offset: 0,
    limit: items.length,
    items,
  };
}

/**
 * 获取文件（下载/访问）
 * GET /api/v1/storage/file/{path}
 * 也可直接使用静态 URL: /uploads/{path}
 */
export function getFileAccessUrl(path: string): string {
  return `${STATIC_BASE_URL}/storage/file/${path}`;
}

/**
 * 删除文件
 * DELETE /api/v1/storage/file/{path}
 */
export async function deleteFile(path: string): Promise<ApiResponse<unknown>> {
  return http.del(`/storage/file/${path}`);
}

/**
 * 获取上传文件详情（含使用记录）
 * GET /api/v1/storage/upload/{upload_id}
 */
export async function getFileDetail(uploadId: string): Promise<FileDetail> {
  const res = await http.get<FileDetail>(`/storage/upload/${uploadId}`);
  return res.data;
}

/**
 * 获取文件URL
 * GET /api/v1/storage/url/{path}
 */
export async function getFileUrl(path: string): Promise<FileUrlData> {
  const res = await http.get<FileUrlData>(`/storage/url/${path}`);
  return res.data;
}

const storageApi = {
  uploadFile,
  listFiles,
  listUserImages,
  listAllUserImages,
  listUserVideos,
  listAllUserVideos,
  getFileAccessUrl,
  deleteFile,
  getFileDetail,
  getFileUrl,
};
export default storageApi;
