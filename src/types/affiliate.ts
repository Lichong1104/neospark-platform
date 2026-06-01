/** 推广信息响应 */
export interface AffiliateInfo {
  referral_code: string;
  referral_link: string;
  balance: number;
  total_earned: number;
  total_converted: number;
  referral_count: number;
}

/** 转换积分请求 */
export interface ConvertPointsParams {
  points: number;
}

/** 转换积分响应 */
export interface ConvertPointsResponse {
  converted_points: number;
  affiliate_balance: number;
  regular_balance: number;
}

/** 被推荐人信息 */
export interface ReferralItem {
  referee_id: number;
  referee_email: string | null;
  referee_name: string | null;
  created_at: string;
}

/** 被推荐人列表响应 */
export interface ReferralsListResponse {
  items: ReferralItem[];
  total: number;
  page: number;
  page_size: number;
}

/** 专职分销申请请求 */
export interface ApplyFullTimeParams {
  name: string;
  contact: string;
  reason: string;
}

/** 专职分销申请响应 */
export interface ApplyFullTimeResponse {
  message: string;
  email_sent: boolean;
}
