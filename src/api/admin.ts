import http from "./request";
import type {
  AdminCheckResponse,
  AdminOverview,
  AdminUserListResponse,
  AdminUserDetail,
  AdminDrawingRecord,
  AdminVideoRecord,
  AdminPagedResponse,
  AdminStripePayment,
  AdminWechatPayment,
  AdminPointsAddParams,
  AdminPointsAddResponse,
  AdminPointsCheckExpiryResponse,
  AdminUpdateRestrictionsParams,
  AdminUpdateRestrictionsResponse,
} from "@/types/admin";

export async function checkAdmin(): Promise<AdminCheckResponse> {
  const res = await http.get<AdminCheckResponse>("/admin/check");
  return res.data;
}

export async function getOverview(): Promise<AdminOverview> {
  const res = await http.get<AdminOverview>("/admin/overview");
  return res.data;
}

export async function getUsers(params?: {
  page?: number;
  page_size?: number;
  search?: string;
}): Promise<AdminUserListResponse> {
  const res = await http.get<AdminUserListResponse>("/admin/users", params);
  return res.data;
}

export async function getUserDetail(userId: number): Promise<AdminUserDetail> {
  const res = await http.get<AdminUserDetail>(`/admin/users/${userId}`);
  return res.data;
}

export async function getUserDrawingRecords(
  userId: number,
  params?: { page?: number; page_size?: number }
): Promise<AdminPagedResponse<AdminDrawingRecord>> {
  const res = await http.get<AdminPagedResponse<AdminDrawingRecord>>(
    `/admin/users/${userId}/drawing-records`,
    params
  );
  return res.data;
}

export async function getUserVideoRecords(
  userId: number,
  params?: { page?: number; page_size?: number }
): Promise<AdminPagedResponse<AdminVideoRecord>> {
  const res = await http.get<AdminPagedResponse<AdminVideoRecord>>(
    `/admin/users/${userId}/video-records`,
    params
  );
  return res.data;
}

export async function getStripePayments(params?: {
  page?: number;
  page_size?: number;
}): Promise<AdminPagedResponse<AdminStripePayment>> {
  const res = await http.get<AdminPagedResponse<AdminStripePayment>>(
    "/admin/payments/stripe",
    params
  );
  return res.data;
}

export async function getWechatPayments(params?: {
  page?: number;
  page_size?: number;
}): Promise<AdminPagedResponse<AdminWechatPayment>> {
  const res = await http.get<AdminPagedResponse<AdminWechatPayment>>(
    "/admin/payments/wechat",
    params
  );
  return res.data;
}

export async function addPoints(
  payload: AdminPointsAddParams
): Promise<AdminPointsAddResponse> {
  const res = await http.post<AdminPointsAddResponse, AdminPointsAddParams>(
    "/admin/points/add",
    payload
  );
  return (res as unknown as AdminPointsAddResponse) ?? res.data;
}

export async function checkPointsExpiry(params?: {
  dry_run?: boolean;
}): Promise<AdminPointsCheckExpiryResponse> {
  const dryRun = params?.dry_run ?? false;
  const res = await http.post<AdminPointsCheckExpiryResponse>(
    `/admin/points/check-expiry?dry_run=${dryRun ? "true" : "false"}`
  );
  return (res as unknown as AdminPointsCheckExpiryResponse) ?? res.data;
}

export async function updateRestrictions(
  userId: number,
  payload: AdminUpdateRestrictionsParams
): Promise<AdminUpdateRestrictionsResponse> {
  const res = await http.post<
    AdminUpdateRestrictionsResponse,
    AdminUpdateRestrictionsParams
  >(`/admin/users/${userId}/restrictions`, payload);
  return (res as unknown as AdminUpdateRestrictionsResponse) ?? res.data;
}

const adminApi = {
  checkAdmin,
  getOverview,
  getUsers,
  getUserDetail,
  getUserDrawingRecords,
  getUserVideoRecords,
  getStripePayments,
  getWechatPayments,
  addPoints,
  checkPointsExpiry,
  updateRestrictions,
};

export default adminApi;

