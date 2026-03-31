import http, { BASE_URL } from "./request";
import type {
  UploadFileResponse,
  ListFilesParams,
  FileListData,
  ListUserImagesParams,
  UserImagesData,
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
  const res = await http.postForm<UploadFileResponse>("/storage/upload", formData);
  return res.data;
}

/**
 * 获取文件列表
 * GET /api/v1/storage/files
 */
export async function listFiles(params?: ListFilesParams): Promise<FileListData> {
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
export async function listUserImages(params?: ListUserImagesParams): Promise<UserImagesData> {
  const res = await http.get<UserImagesData>(
    "/storage/user-images",
    params as Record<string, unknown>
  );
  return res.data;
}

/**
 * 获取文件（下载/访问）
 * GET /api/v1/storage/file/{path}
 * 也可直接使用静态 URL: /uploads/{path}
 */
export function getFileAccessUrl(path: string): string {
  return `${BASE_URL}/storage/file/${path}`;
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
  getFileAccessUrl,
  deleteFile,
  getFileDetail,
  getFileUrl,
};
export default storageApi;
