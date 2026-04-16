import http from "./request";

export type BillingPlanKey = "starter" | "growth" | "pro" | "ultimate";
export type BillingInterval = "monthly" | "yearly";

export interface BillingUserSummary {
  id: number;
  email: string;
}

export interface BillingSubscriptionSummary {
  stripeSubscriptionId: string;
  stripePriceId: string;
  planKey: BillingPlanKey;
  billingInterval: BillingInterval;
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  updatedAt: string;
}

export interface BillingState {
  user: BillingUserSummary | null;
  subscription: BillingSubscriptionSummary | null;
}

interface BillingRedirectResponse {
  url: string;
}

function unwrap<T>(res: unknown): T {
  if (res && typeof res === "object" && "data" in res) {
    return (res as { data: T }).data;
  }
  return res as T;
}

async function getState(): Promise<BillingState> {
  const res = await http.get<BillingState>("/billing/state");
  return unwrap<BillingState>(res);
}

async function createCheckoutSession(
  plan: BillingPlanKey,
  interval: BillingInterval
): Promise<BillingRedirectResponse> {
  const res = await http.post<
    BillingRedirectResponse,
    { plan: BillingPlanKey; interval: BillingInterval }
  >("/billing/checkout", { plan, interval });
  return unwrap<BillingRedirectResponse>(res);
}

async function createPortalSession(): Promise<BillingRedirectResponse> {
  const res = await http.post<BillingRedirectResponse>("/billing/portal");
  return unwrap<BillingRedirectResponse>(res);
}

const billingApi = {
  getState,
  createCheckoutSession,
  createPortalSession,
};

export default billingApi;
