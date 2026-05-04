import http from "./request";
import type {
  AffiliateInfo,
  ConvertPointsParams,
  ConvertPointsResponse,
  ReferralsListResponse,
} from "@/types/affiliate";

/**
 * 获取当前用户的推广信息
 */
export function getAffiliateInfo(): Promise<AffiliateInfo> {
  return http.get("/affiliate") as unknown as Promise<AffiliateInfo>;
}

/**
 * 将推广积分转换为普通积分
 */
export function convertAffiliatePoints(
  params: ConvertPointsParams
): Promise<ConvertPointsResponse> {
  return http.post("/affiliate/convert", params) as unknown as Promise<ConvertPointsResponse>;
}

/**
 * 获取被推荐人列表
 */
export function getReferrals(
  page: number = 1,
  pageSize: number = 20
): Promise<ReferralsListResponse> {
  return http.get("/affiliate/referrals", { page, page_size: pageSize }) as unknown as Promise<ReferralsListResponse>;
}

const affiliateApi = { getAffiliateInfo, convertAffiliatePoints, getReferrals };
export default affiliateApi;
