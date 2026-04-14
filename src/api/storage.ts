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

/**
 * 上传文件
 * POST /api/v1/storage/upload (multipart/form-data)
 */
export async function uploadFile(
  file: File,
  fileType: "image" | "video" | "other" = "image"
): Promise<UploadFileResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("file_type", fileType);
  const res = await http.postForm<UploadFileResponse>(
    "/storage/upload",
    formData
  );
  return res.data;
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
