import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { ProfileHeader } from "@/components/user-center/ProfileHeader";
import { PlanCard } from "@/components/user-center/PlanCard";
import { CreditVault } from "@/components/user-center/CreditVault";
import { UsageMonitor } from "@/components/user-center/UsageMonitor";
import { QuickActions } from "@/components/user-center/QuickActions";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import drawingApi from "@/api/drawing";
import billingApi, { type BillingSubscriptionSummary } from "@/api/billing";
import type { BillingTransaction } from "@/types/drawing";

const UserCenter = () => {
  const { t } = useTranslation();
  const { userEmail, userInfo, refreshUser } = useAuth();
  const [credits, setCredits] = useState(0);
  const [usageLogs, setUsageLogs] = useState<{ action: string; amount: number; time: string }[]>([]);
  const [subscription, setSubscription] = useState<BillingSubscriptionSummary | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  const loadBillingState = useCallback(async () => {
    setSubscriptionLoading(true);
    try {
      const state = await billingApi.getState();
      setSubscription(state.subscription);
    } catch {
      setSubscription(null);
    } finally {
      setSubscriptionLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof userInfo?.balance === "number") {
      setCredits(userInfo.balance);
    }
  }, [userInfo?.balance]);

  useEffect(() => {
    void loadBillingState();
  }, [loadBillingState]);

  useEffect(() => {
    const onFocus = () => {
      void refreshUser();
      void loadBillingState();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadBillingState, refreshUser]);

  useEffect(() => {
    // 获取扣费历史
    drawingApi
      .getBillingHistory({ limit: 10 })
      .then((data) => {
        const logs = data.transactions.map((tx: BillingTransaction) => ({
          action: tx.description || tx.type_name,
          amount: tx.amount_sign === "-" ? -tx.amount : tx.amount,
          time: new Date(tx.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        }));
        setUsageLogs(logs);

        // 从最新的交易中获取当前余额
        if (typeof userInfo?.balance !== "number" && data.transactions.length > 0) {
          setCredits(data.transactions[0].balance_after);
        }
      })
      .catch(() => {
        // 接口不可用时使用默认数据
        setUsageLogs([
          { action: "[GEN]", amount: -10, time: "12:45:32" },
          { action: "[AGENT_GEN]", amount: -15, time: "12:44:18" },
          { action: "[BG_REMOVE]", amount: -20, time: "12:43:01" },
        ]);
        if (typeof userInfo?.balance === "number") {
          setCredits(userInfo.balance);
        } else {
          setCredits(850);
        }
      });
  }, [t, userInfo?.balance]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />

      <main className="flex-1 p-6 md:p-8 bg-background overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Profile Header */}
          <ProfileHeader email={userEmail} credits={credits} subscription={subscription} />

          {/* Main Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Plan Card */}
            <div className="md:col-span-7">
              <PlanCard subscription={subscription} loading={subscriptionLoading} />
            </div>

            {/* Credit Vault */}
            <div className="md:col-span-5">
              <CreditVault credits={credits} />
            </div>

            {/* Usage Monitor */}
            <div className="md:col-span-8">
              <UsageMonitor logs={usageLogs} />
            </div>

            {/* Quick Actions */}
            <div className="md:col-span-4">
              <QuickActions onSubscriptionChanged={loadBillingState} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserCenter;
