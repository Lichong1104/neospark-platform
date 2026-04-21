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

export interface BillingInvoice {
  id: string;
  amount_due: number;
  amount_paid: number;
  status: string;
  pdf_url: string | null;
  created_at: string;
  description: string | null;
}

interface BillingInvoicesResponse {
  invoices: BillingInvoice[];
}

interface CancelSubscriptionResponse {
  subscriptionId: string;
  status: string;
  cancelAtPeriodEnd: boolean;
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

async function getInvoices(): Promise<BillingInvoice[]> {
  const res = await http.get<BillingInvoicesResponse>("/billing/invoices");
  return unwrap<BillingInvoicesResponse>(res).invoices ?? [];
}

async function cancelSubscription(
  immediately = false
): Promise<CancelSubscriptionResponse> {
  const res = await http.post<
    CancelSubscriptionResponse,
    { immediately: boolean }
  >("/billing/cancel-subscription", { immediately });
  return unwrap<CancelSubscriptionResponse>(res);
}

const billingApi = {
  getState,
  createCheckoutSession,
  createPortalSession,
  getInvoices,
  cancelSubscription,
};

export default billingApi;
