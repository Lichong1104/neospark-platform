import http from "./request";
import type {
  AffiliateInfo,
  ApplyFullTimeParams,
  ApplyFullTimeResponse,
  ConvertPointsParams,
  ConvertPointsResponse,
  ReferralsListResponse,
} from "@/types/affiliate";

type AnyApiResponse<T> = {
  code?: string | number;
  message?: string;
  msg?: string;
  data?: T;
};

function unwrap<T>(res: unknown): T {
  const r = res as AnyApiResponse<T>;
  if (r && typeof r === "object" && "data" in r && r.data !== undefined) return r.data as T;
  return res as T;
}

/**
 * 获取当前用户的推广信息
 */
export async function getAffiliateInfo(): Promise<AffiliateInfo> {
  const res = await http.get<AffiliateInfo>("/affiliate");
  return unwrap<AffiliateInfo>(res);
}

/**
 * 将推广积分转换为普通积分
 */
export async function convertAffiliatePoints(
  params: ConvertPointsParams
): Promise<ConvertPointsResponse> {
  const res = await http.post<ConvertPointsResponse>("/affiliate/convert", params);
  return unwrap<ConvertPointsResponse>(res);
}

/**
 * 获取被推荐人列表
 */
export async function getReferrals(
  page: number = 1,
  pageSize: number = 20
): Promise<ReferralsListResponse> {
  const res = await http.get<ReferralsListResponse>("/affiliate/referrals", {
    page,
    page_size: pageSize,
  });
  return unwrap<ReferralsListResponse>(res);
}

/**
 * 申请成为专职分销
 */
export async function applyFullTimeAffiliate(
  params: ApplyFullTimeParams
): Promise<ApplyFullTimeResponse> {
  const res = await http.post<ApplyFullTimeResponse>("/affiliate/apply-full-time", params);
  return unwrap<ApplyFullTimeResponse>(res);
}

const affiliateApi = {
  getAffiliateInfo,
  convertAffiliatePoints,
  getReferrals,
  applyFullTimeAffiliate,
};
export default affiliateApi;
