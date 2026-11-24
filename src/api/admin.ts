import http from "./request";
import type {
  AdminAssetPricingCreatePayload,
  AdminAssetPricingItem,
  AdminCheckResponse,
  AdminOverview,
  AdminUserListResponse,
  AdminUserDetail,
  AdminDrawingRecord,
  AdminVideoRecord,
  AdminPagedResponse,
  AdminPricingAuditItem,
  AdminPricingConfigItem,
  AdminPricingConfigUpdatePayload,
  AdminPricingConfigView,
  AdminPriceChangeRequest,
  AdminPayoutReviewPayload,
  AdminRefundPayload,
  AdminCreatorPayout,
  AdminSkillRefund,
  AdminStripePayment,
  AdminTokenPricingView,
  AdminTokenRate,
  AdminWechatPayment,
  AdminPointsSetParams,
  AdminPointsSetResponse,
  AdminPointsCheckExpiryResponse,
  AdminUpdateRestrictionsParams,
  AdminUpdateRestrictionsResponse,
  AdminSkillSubmissionItem,
  AdminSkillSubmissionDetail,
  AdminSkillSubmissionReviewResult,
  AdminInvocation,
  AdminInvocationDetail,
  AdminMarketplaceAbuse,
  AdminReconciliation,
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

export async function setPoints(
  payload: AdminPointsSetParams
): Promise<AdminPointsSetResponse> {
  const res = await http.post<AdminPointsSetResponse, AdminPointsSetParams>(
    "/admin/points/set",
    payload
  );
  return (res as unknown as AdminPointsSetResponse) ?? res.data;
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

/**
 * 查询 Skill 提交记录（审核列表）
 */
export async function getSkillSubmissions(params?: {
  status?: string;
  page?: number;
  page_size?: number;
}): Promise<AdminPagedResponse<AdminSkillSubmissionItem>> {
  const res = await http.get<AdminPagedResponse<AdminSkillSubmissionItem>>(
    "/admin/skill-submissions",
    params as Record<string, unknown>
  );
  return res.data;
}

/**
 * 查询 Skill 提交详情（含 SKILL.md 全文）
 */
export async function getSkillSubmission(
  submissionId: number
): Promise<AdminSkillSubmissionDetail> {
  const res = await http.get<AdminSkillSubmissionDetail>(
    `/admin/skill-submissions/${submissionId}`
  );
  return res.data;
}

/**
 * 通过 Skill 提交（注册上架）
 */
export async function approveSkillSubmission(
  submissionId: number
): Promise<AdminSkillSubmissionReviewResult> {
  const res = await http.post<AdminSkillSubmissionReviewResult>(
    `/admin/skill-submissions/${submissionId}/approve`
  );
  return (res as unknown as AdminSkillSubmissionReviewResult) ?? res.data;
}

/**
 * 驳回 Skill 提交
 */
export async function rejectSkillSubmission(
  submissionId: number,
  reason: string
): Promise<AdminSkillSubmissionReviewResult> {
  const res = await http.post<AdminSkillSubmissionReviewResult>(
    `/admin/skill-submissions/${submissionId}/reject`,
    { reason }
  );
  return (res as unknown as AdminSkillSubmissionReviewResult) ?? res.data;
}

/* ------------------------------------------------------------ pricing -- */

export async function getPricingConfigs(params?: {
  scope?: string;
  scope_key?: string;
}): Promise<AdminPricingConfigView> {
  const res = await http.get<AdminPricingConfigView>(
    "/admin/pricing-configs",
    params as Record<string, unknown>
  );
  return res.data;
}

export async function updatePricingConfigs(
  payload: AdminPricingConfigUpdatePayload
): Promise<{ items: AdminPricingConfigItem[]; config_version: number }> {
  const res = await http.put<
    { items: AdminPricingConfigItem[]; config_version: number },
    AdminPricingConfigUpdatePayload
  >("/admin/pricing-configs", payload);
  return res.data;
}

export async function getPricingConfigAudit(params?: {
  config_key?: string;
  scope?: string;
  page?: number;
  page_size?: number;
}): Promise<AdminPagedResponse<AdminPricingAuditItem>> {
  const res = await http.get<AdminPagedResponse<AdminPricingAuditItem>>(
    "/admin/pricing-configs/audit",
    params as Record<string, unknown>
  );
  return res.data;
}

export async function getTokenPricing(): Promise<AdminTokenPricingView> {
  const res = await http.get<AdminTokenPricingView>("/admin/token-pricing");
  return res.data;
}

export async function updateTokenPricing(payload: {
  pricing: Record<string, AdminTokenRate>;
  reason?: string;
}): Promise<AdminTokenPricingView> {
  const res = await http.put<AdminTokenPricingView, typeof payload>(
    "/admin/token-pricing",
    payload
  );
  return res.data;
}

export async function getAssetPricing(params?: {
  asset_type?: string;
  provider?: string;
  model?: string;
  is_active?: boolean;
}): Promise<{ items: AdminAssetPricingItem[] }> {
  const res = await http.get<{ items: AdminAssetPricingItem[] }>(
    "/admin/asset-pricing",
    params as Record<string, unknown>
  );
  return res.data;
}

export async function createAssetPricing(
  payload: AdminAssetPricingCreatePayload
): Promise<AdminAssetPricingItem> {
  const res = await http.post<AdminAssetPricingItem, AdminAssetPricingCreatePayload>(
    "/admin/asset-pricing",
    payload
  );
  return res.data;
}

export async function updateAssetPricing(
  configId: number,
  payload: Partial<AdminAssetPricingCreatePayload>
): Promise<AdminAssetPricingItem> {
  const res = await http.put<
    AdminAssetPricingItem,
    Partial<AdminAssetPricingCreatePayload>
  >(`/admin/asset-pricing/${configId}`, payload);
  return res.data;
}

export async function setAssetPricingStatus(
  configId: number,
  payload: { is_active: boolean; reason?: string }
): Promise<AdminAssetPricingItem> {
  const res = await http.patch<AdminAssetPricingItem, typeof payload>(
    `/admin/asset-pricing/${configId}/status`,
    payload
  );
  return res.data;
}

/* --------------------------------------------- creator operations (P3) -- */

export async function getCreatorPayouts(params?: {
  creator_user_id?: number;
  status?: string;
  offset?: number;
  limit?: number;
}): Promise<{ payouts: AdminCreatorPayout[]; total: number }> {
  const res = await http.get<{ payouts: AdminCreatorPayout[]; total: number }>(
    "/admin/creator-payouts",
    params as Record<string, unknown>
  );
  return res.data;
}

export async function reviewCreatorPayout(
  payoutId: number,
  action: "approve" | "reject" | "mark-paid",
  payload: AdminPayoutReviewPayload
): Promise<AdminCreatorPayout> {
  const res = await http.post<AdminCreatorPayout, AdminPayoutReviewPayload>(
    `/admin/creator-payouts/${payoutId}/${action}`,
    payload
  );
  return res.data;
}

export async function getSkillRefunds(params?: {
  invocation_id?: number;
  user_id?: number;
  offset?: number;
  limit?: number;
}): Promise<{ refunds: AdminSkillRefund[]; total: number }> {
  const res = await http.get<{ refunds: AdminSkillRefund[]; total: number }>(
    "/admin/skill-refunds",
    params as Record<string, unknown>
  );
  return res.data;
}

export async function refundSkillInvocation(
  invocationId: number,
  payload: AdminRefundPayload
): Promise<AdminSkillRefund> {
  const res = await http.post<AdminSkillRefund, AdminRefundPayload>(
    `/admin/skill-invocations/${invocationId}/refund`,
    payload
  );
  return res.data;
}

export async function getPriceChangeRequests(params?: {
  creator_user_id?: number;
  skill_id?: string;
  status?: string;
  offset?: number;
  limit?: number;
}): Promise<{ requests: AdminPriceChangeRequest[]; total: number }> {
  const res = await http.get<{ requests: AdminPriceChangeRequest[]; total: number }>(
    "/admin/price-change-requests",
    params as Record<string, unknown>
  );
  return res.data;
}

export async function reviewPriceChangeRequest(
  requestId: number,
  action: "approve" | "reject",
  note?: string
): Promise<AdminPriceChangeRequest> {
  const res = await http.post<AdminPriceChangeRequest>(
    `/admin/price-change-requests/${requestId}/${action}`,
    { note }
  );
  return res.data;
}

/* ------------------------------------------ marketplace ledger / risk -- */

export async function getSkillInvocations(params?: {
  user_id?: number;
  skill_id?: string;
  status?: string;
  offset?: number;
  limit?: number;
}): Promise<{ invocations: AdminInvocation[]; total: number }> {
  const res = await http.get<{ invocations: AdminInvocation[]; total: number }>(
    "/admin/skill-invocations",
    params as Record<string, unknown>
  );
  return res.data;
}

export async function getSkillInvocation(
  invocationId: number
): Promise<AdminInvocationDetail> {
  const res = await http.get<AdminInvocationDetail>(
    `/admin/skill-invocations/${invocationId}`
  );
  return res.data;
}

export async function getMarketplaceReconciliation(params?: {
  since?: string;
  until?: string;
}): Promise<AdminReconciliation> {
  const res = await http.get<AdminReconciliation>(
    "/admin/marketplace/reconciliation",
    params as Record<string, unknown>
  );
  return res.data;
}

export async function getMarketplaceAbuse(params?: {
  limit?: number;
}): Promise<AdminMarketplaceAbuse> {
  const res = await http.get<AdminMarketplaceAbuse>(
    "/admin/marketplace/abuse",
    params as Record<string, unknown>
  );
  return res.data;
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
  setPoints,
  checkPointsExpiry,
  updateRestrictions,
  getSkillSubmissions,
  getSkillSubmission,
  approveSkillSubmission,
  rejectSkillSubmission,
  getPricingConfigs,
  updatePricingConfigs,
  getPricingConfigAudit,
  getTokenPricing,
  updateTokenPricing,
  getAssetPricing,
  createAssetPricing,
  updateAssetPricing,
  setAssetPricingStatus,
  getCreatorPayouts,
  reviewCreatorPayout,
  getSkillRefunds,
  refundSkillInvocation,
  getPriceChangeRequests,
  reviewPriceChangeRequest,
  getSkillInvocations,
  getSkillInvocation,
  getMarketplaceReconciliation,
  getMarketplaceAbuse,
};

export default adminApi;

