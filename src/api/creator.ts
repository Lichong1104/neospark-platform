import http from "./request";

export type CreatorAccount = {
  user_id: number;
  available_credits: number;
  pending_credits: number;
  frozen_credits: number;
  total_earned_credits: number;
  total_paid_credits: number;
  daily_earn_cap: number | null;
  monthly_earn_cap: number | null;
  payout_profile: Record<string, unknown>;
  status: string;
};

export type CreatorSkillSummary = {
  skill_id: string;
  calls: number;
  skill_fee_credits: number;
  creator_credits: number;
  compute_creator_credits: number;
  refunded_credits: number;
};

export type CreatorLedgerEntry = {
  id: number;
  creator_user_id: number;
  invocation_id: number | null;
  skill_id: string | null;
  entry_type: string;
  source: "skill_fee" | "compute" | "payout" | "adjustment" | string;
  credits: number;
  balance_after: number;
  status: string;
  available_at: string | null;
  credit_face_value_cny: number;
  settlement_coefficient: number;
  settlement_rate: number;
  note: string | null;
  created_at: string | null;
};

export type CreatorInvocation = {
  invocation_id: number;
  user_id: number;
  skill_id: string | null;
  channel: string;
  status: string;
  skill_count: number;
  skill_fee_credits: number;
  token_credits: number;
  asset_credits: number;
  asset_item_count: number;
  total_credits: number;
  refunded_credits: number;
  creator_credits: number;
  platform_credits: number;
  charged_credits: number | null;
  free_quota_applied: boolean;
  partial_success: boolean;
};

export type CreatorPayout = {
  id: number;
  creator_user_id: number;
  credits: number;
  amount_cny: number;
  settlement_rate: number;
  rate_detail: {
    ledger_id: number;
    credits: number;
    credit_face_value_cny: number;
    settlement_coefficient: number;
    settlement_rate: number;
    amount_cny: number;
  }[];
  method: string | null;
  status: string;
  requested_at: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  paid_at: string | null;
  external_ref: string | null;
  note: string | null;
};

export type CreatorStatement = {
  creator_user_id: number;
  month: string;
  confirmed_credits: number;
  confirmed_cny: number;
  locked_credits: number;
  locked_cny: number;
  available_credits: number;
  pending_credits: number;
  frozen_credits: number;
  total_earned_credits: number;
  total_paid_credits: number;
};

export type CreatorPriceChange = {
  id: number;
  skill_id: string;
  creator_user_id: number;
  current_price_credits: number;
  requested_price_credits: number;
  requested_mode: string | null;
  reason: string | null;
  status: string;
  reviewer_id: number | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string | null;
};

export async function getAccount(): Promise<CreatorAccount> {
  const res = await http.get<CreatorAccount>("/creator/account");
  return res.data;
}

export async function getSummary(): Promise<{ skills: CreatorSkillSummary[] }> {
  const res = await http.get<{ skills: CreatorSkillSummary[] }>("/creator/summary");
  return res.data;
}

export async function getEarnings(params?: {
  skill_id?: string;
  entry_type?: string;
  offset?: number;
  limit?: number;
}): Promise<{ earnings: CreatorLedgerEntry[]; total: number }> {
  const res = await http.get<{ earnings: CreatorLedgerEntry[]; total: number }>(
    "/creator/earnings",
    params as Record<string, unknown>
  );
  return res.data;
}

export async function getInvocations(params?: {
  offset?: number;
  limit?: number;
}): Promise<{ invocations: CreatorInvocation[]; total: number }> {
  const res = await http.get<{ invocations: CreatorInvocation[]; total: number }>(
    "/creator/invocations",
    params as Record<string, unknown>
  );
  return res.data;
}

export async function getStatement(month?: string): Promise<CreatorStatement> {
  const res = await http.get<CreatorStatement>(
    "/creator/settlement",
    month ? { month } : undefined
  );
  return res.data;
}

export async function requestPayout(payload: {
  credits: number;
  method: string;
  note?: string;
}): Promise<CreatorPayout> {
  const res = await http.post<CreatorPayout, typeof payload>("/creator/payouts", payload);
  return res.data;
}

export async function getPayouts(params?: {
  status?: string;
  offset?: number;
  limit?: number;
}): Promise<{ payouts: CreatorPayout[]; total: number }> {
  const res = await http.get<{ payouts: CreatorPayout[]; total: number }>(
    "/creator/payouts",
    params as Record<string, unknown>
  );
  return res.data;
}

export async function submitPriceChange(
  skillId: string,
  payload: { price_credits: number; pricing_mode: string; reason?: string }
): Promise<CreatorPriceChange> {
  const res = await http.post<CreatorPriceChange, typeof payload>(
    `/creator/skills/${encodeURIComponent(skillId)}/price-change`,
    payload
  );
  return res.data;
}

export async function getPriceChanges(
  skillId: string,
  params?: { offset?: number; limit?: number }
): Promise<{ requests: CreatorPriceChange[]; total: number }> {
  const res = await http.get<{ requests: CreatorPriceChange[]; total: number }>(
    `/creator/skills/${encodeURIComponent(skillId)}/price-changes`,
    params as Record<string, unknown>
  );
  return res.data;
}

const creatorApi = {
  getAccount,
  getSummary,
  getEarnings,
  getInvocations,
  getStatement,
  requestPayout,
  getPayouts,
  submitPriceChange,
  getPriceChanges,
};

export default creatorApi;
