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
  created_at: string;
  updated_at: string;
  points: {
    total_points: number;
    available_points: number;
    frozen_points: number;
    expires_at: string | null;
  };
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

export type AdminPointsAddParams = {
  user_id: number;
  points: number;
  note?: string;
};

export type AdminPointsAddResponse = {
  success: boolean;
  user_id: number;
  points_added: number;
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

