import http from "./request";

export type WeChatPayPlanKey = "light" | "creator" | "team" | "enterprise" | "black";

export interface WeChatPayPlan {
  planKey: WeChatPayPlanKey;
  amountFen: number;
  originalAmountFen: number;
  validDays: number;
  points: number;
  isActive: boolean;
}

export const WECHAT_PAY_PLANS: WeChatPayPlan[] = [
  {
    planKey: "light",
    amountFen: 7200,
    originalAmountFen: 7200,
    validDays: 90,
    points: 1000,
    isActive: true,
  },
  {
    planKey: "creator",
    amountFen: 19800,
    originalAmountFen: 25200,
    validDays: 90,
    points: 3500,
    isActive: true,
  },
  {
    planKey: "team",
    amountFen: 49800,
    originalAmountFen: 72000,
    validDays: 90,
    points: 10000,
    isActive: true,
  },
  {
    planKey: "enterprise",
    amountFen: 117000,
    originalAmountFen: 180000,
    validDays: 90,
    points: 25000,
    isActive: true,
  },
  {
    planKey: "black",
    amountFen: 432000,
    originalAmountFen: 720000,
    validDays: 365,
    points: 100000,
    isActive: true,
  },
];

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

const wechatPayApi = { createNativeOrder, getOrder, closeOrder };

export default wechatPayApi;

