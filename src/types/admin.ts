export type AdminCheckResponse = {
  is_admin: boolean;
};

export type AdminOverview = {
  total_users: number;
  today_new_users: number;
  total_stripe_subscriptions: number;
  total_wechat_paid_orders: number;
  today_drawing_count: number;
  today_video_count: number;
};

export type AdminUserListItem = {
  id: number;
  email: string;
  name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  can_generate_image: boolean;
  can_generate_video: boolean;
  created_at: string;
  total_points: number;
  available_points: number;
  frozen_points: number;
};

export type AdminUserListResponse = {
  items: AdminUserListItem[];
  total: number;
  page: number;
  page_size: number;
};

export type AdminUserDetail = {
  id: number;
  email: string;
  name: string | null;
  avatar_url: string | null;
  google_sub: string | null;
  stripe_customer_id: string | null;
  is_admin: boolean;
  can_generate_image: boolean;
  can_generate_video: boolean;
  created_at: string;
  updated_at: string;
  points: {
    total_points: number;
    available_points: number;
    frozen_points: number;
    expires_at: string | null;
  };
};

export type AdminUpdateRestrictionsParams = {
  can_generate_image?: boolean;
  can_generate_video?: boolean;
};

export type AdminUpdateRestrictionsResponse = {
  success: boolean;
  user_id: number;
  can_generate_image: boolean;
  can_generate_video: boolean;
};

export type AdminDrawingRecord = {
  message_id: string;
  session_id: string;
  content: string;
  model: string;
  provider: string;
  resolution: string | null;
  aspect_ratio: string | null;
  width: number | null;
  height: number | null;
  num_images: number | null;
  status: string;
  progress: number | null;
  images: { url: string; local_path: string }[];
  generation_time: number | null;
  error_msg: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  created_at: string;
  completed_at: string | null;
};

export type AdminVideoRecord = {
  task_id: string;
  task_type: string;
  provider: string;
  model: string;
  prompt: string;
  negative_prompt: string | null;
  status: string;
  progress: number | null;
  video_url: string | null;
  duration: number | null;
  resolution: string | null;
  ratio: string | null;
  width: number | null;
  height: number | null;
  generate_audio: boolean | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  error_msg: string | null;
  submitted_at: string;
  started_at: string | null;
  completed_at: string | null;
};

export type AdminPagedResponse<TItem> = {
  items: TItem[];
  total: number;
  page: number;
  page_size: number;
};

export type AdminStripePayment = {
  id: number;
  user_id: number;
  email: string;
  name: string | null;
  stripe_subscription_id: string;
  stripe_price_id: string;
  plan_key: string;
  billing_interval: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  created_at: string;
};

export type AdminWechatPayment = {
  id: number;
  order_id: string;
  user_id: number;
  email: string;
  name: string | null;
  plan_key: string;
  amount_fen: number;
  points: number;
  wechat_transaction_id: string;
  paid_at: string | null;
  created_at: string;
};

export type AdminPointsSetParams = {
  user_id: number;
  target_total_points: number;
  note?: string;
};

export type AdminPointsSetResponse = {
  success: boolean;
  user_id: number;
  previous_total_points: number;
  target_total_points: number;
  points_changed: number;
  total_points: number;
  frozen_points: number;
  available_points: number;
};

export type AdminPointsCheckExpiryResponse = {
  success: boolean;
  dry_run: boolean;
  processed_users: number;
  total_cleared_points: number;
  total_flagged_holds: number;
};


export type AdminSkillSubmissionItem = {
  id: number;
  skill_id: string;
  name: string;
  description: string;
  version: string;
  execution_mode: string;
  status: "pending" | "approved" | "rejected";
  reject_reason: string | null;
  filename: string;
  user_id: number;
  user_email: string | null;
  user_name: string | null;
  created_at: string | null;
  reviewed_at: string | null;
};

export type AdminSkillSubmissionDetail = AdminSkillSubmissionItem & {
  content: string;
  package_files: string[];
};

export type AdminSkillSubmissionReviewResult = {
  success: boolean;
  skill_id?: string;
  name?: string;
  version?: string;
  id?: number;
};

/* ------------------------------------------------------------ pricing -- */

export type AdminConfigValue = number | boolean | string;

export type AdminPricingConfigItem = {
  id: number | null;
  scope: string;
  scope_key: string;
  config_key: string;
  config_value: string;
  value: AdminConfigValue;
  value_type: string;
  description: string | null;
  updated_by: number | null;
  updated_at: string | null;
};

export type AdminPricingConfigDefault = {
  value: AdminConfigValue;
  value_type: string;
  description: string;
};

export type AdminPricingConfigView = {
  items: AdminPricingConfigItem[];
  defaults: Record<string, AdminPricingConfigDefault>;
  config_version: number;
};

export type AdminPricingConfigUpdatePayload = {
  scope: string;
  scope_key: string;
  items: { config_key: string; value: AdminConfigValue }[];
  reason?: string;
};

export type AdminPricingAuditItem = {
  id: number;
  config_id: number | null;
  scope: string;
  scope_key: string;
  config_key: string;
  old_value: string | null;
  new_value: string | null;
  operator_id: number | null;
  reason: string | null;
  created_at: string | null;
};

export type AdminTokenRate = {
  input: number;
  output: number;
  cost_per_million?: { input: number; output: number };
};

export type AdminTokenMarginSide = {
  retail_credits: number;
  revenue_fen: number;
  cost_fen: number | null;
  margin_fen: number | null;
  margin_rate: number | null;
};

export type AdminTokenMarginPreview = {
  model: string;
  input: AdminTokenMarginSide;
  output: AdminTokenMarginSide;
};

export type AdminTokenPricingView = {
  pricing: Record<string, AdminTokenRate>;
  config_version: number;
  margin_preview: Record<string, AdminTokenMarginPreview>;
};

export type AdminAssetMargin = {
  revenue_cny: number;
  cost_cny: number | null;
  margin_cny: number | null;
  margin_rate: number | null;
};

export type AdminAssetPricingItem = {
  id: number;
  asset_type: string;
  provider: string;
  model: string;
  resolution: string;
  duration: number;
  unit_credits: number;
  cost_fen: number | null;
  is_active: boolean;
  effective_from: string | null;
  updated_by: number | null;
  created_at: string | null;
  updated_at: string | null;
  margin?: AdminAssetMargin;
};

export type AdminAssetPricingCreatePayload = {
  asset_type: string;
  model: string;
  unit_credits: number;
  provider?: string;
  resolution?: string;
  duration?: number;
  cost_fen?: number | null;
  is_active?: boolean;
  reason?: string;
};

/* --------------------------------------------------- creator operations -- */

export type AdminCreatorPayout = {
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

export type AdminPayoutReviewPayload = {
  note?: string;
  external_ref?: string;
};

export type AdminSkillRefund = {
  id: number;
  invocation_id: number;
  user_id: number;
  refund_credits: number;
  refund_type: string;
  refund_scope: string;
  reason: string | null;
  status: string;
  over_window: boolean;
  operator_id: number | null;
  creator_reversal_credits: number;
  external_ref: string | null;
  note: string | null;
  created_at: string | null;
  executed_at: string | null;
};

export type AdminRefundPayload = {
  refund_credits?: number;
  refund_scope: string;
  reason: string;
  confirm_over_window?: boolean;
  note?: string;
};

export type AdminPriceChangeRequest = {
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

/* -------------------------------------------------- invocation ledger -- */

export type AdminInvocation = {
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

export type AdminInvocationSkillSplit = {
  skill_id: string;
  owner_id: number | null;
  skill_fee_credits: number;
  creator_credits: number;
  platform_credits: number;
  refunded_credits: number;
  free_quota_applied: boolean;
};

export type AdminInvocationAsset = {
  id: number;
  skill_id: string | null;
  asset_type: string;
  task_table: string | null;
  task_id: string | null;
  provider: string | null;
  model: string | null;
  quantity: number;
  unit_credits: number;
  credits: number;
  upstream_cost_fen: number;
  status: string;
  error_code: string | null;
  created_at: string | null;
  completed_at: string | null;
};

export type AdminInvocationDetail = AdminInvocation & {
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  error_code: string | null;
  created_at: string | null;
  settled_at: string | null;
  pricing_snapshot: Record<string, unknown>;
  skills: AdminInvocationSkillSplit[];
  assets: AdminInvocationAsset[];
};

export type AdminReconciliationViolationRow = {
  invocation_id: number;
  expected: number;
  actual: number;
};

export type AdminReconciliationAccountRow = {
  user_id: number;
  ledger_sum: number;
  account_sum: number;
};

export type AdminReconciliation = {
  totals: {
    invocations: number;
    total_credits: number;
    refunded_credits: number;
    net_credits: number;
    creator_credits: number;
    platform_credits: number;
    token_credits: number;
    asset_credits: number;
    platform_retention_credits: number;
  };
  violations: {
    skill_fee_mismatch: AdminReconciliationViolationRow[];
    creator_credits_mismatch: AdminReconciliationViolationRow[];
    asset_credits_mismatch: AdminReconciliationViolationRow[];
    creator_account_mismatch: AdminReconciliationAccountRow[];
  };
  ok: boolean;
};

export type AdminMarketplaceAbuse = {
  self_dealing: {
    user_id: number;
    skill_id: string;
    calls: number;
    skill_fee_credits: number;
    blocked_creator_credits: number;
  }[];
  shared_payout_profiles: {
    user_ids: number[];
    account_count: number;
  }[];
};
