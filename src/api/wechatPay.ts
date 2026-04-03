import http from "./request";

export type WeChatPayPlanKey = "light" | "creator" | "team" | "enterprise" | "black";

export interface WeChatPayPlan {
  planKey: WeChatPayPlanKey;
  name: string;
  description: string;
  amountFen: number;
  originalAmountFen: number;
  discountLabel: string;
  validDays: number;
  points: number;
  isActive: boolean;
}

export type WeChatPayOrderStatus = "pending" | "paid" | "failed" | "closed";

export interface WeChatPayOrder {
  orderId: string;
  status: WeChatPayOrderStatus;
  planKey: WeChatPayPlanKey;
  amountFen: number;
  points: number;
  expiresAt: string;
  paidAt: string | null;
  codeUrl: string;
  qrCodeDataUrl: string;
  wechatTransactionId: string | null;
}

function unwrap<T>(res: unknown): T {
  if (res && typeof res === "object" && "data" in res) {
    return (res as { data: T }).data;
  }
  return res as T;
}

async function getPlans(): Promise<WeChatPayPlan[]> {
  const res = await http.get<WeChatPayPlan[]>("/wechat-pay/plans");
  return unwrap<WeChatPayPlan[]>(res);
}

async function createNativeOrder(planKey: WeChatPayPlanKey): Promise<WeChatPayOrder> {
  const res = await http.post<WeChatPayOrder, { planKey: WeChatPayPlanKey }>(
    "/wechat-pay/native/orders",
    { planKey },
  );
  return unwrap<WeChatPayOrder>(res);
}

async function getOrder(orderId: string): Promise<WeChatPayOrder> {
  const res = await http.get<WeChatPayOrder>(`/wechat-pay/orders/${encodeURIComponent(orderId)}`);
  return unwrap<WeChatPayOrder>(res);
}

async function closeOrder(orderId: string): Promise<WeChatPayOrder> {
  const res = await http.post<WeChatPayOrder>(`/wechat-pay/orders/${encodeURIComponent(orderId)}/close`);
  return unwrap<WeChatPayOrder>(res);
}

const wechatPayApi = { getPlans, createNativeOrder, getOrder, closeOrder };

export default wechatPayApi;

