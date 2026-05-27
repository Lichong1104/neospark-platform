import React, { useState, useEffect, useCallback } from "react";
import { ProfileHeader } from "@/components/user-center/ProfileHeader";
import { PlanCard } from "@/components/user-center/PlanCard";
import { CreditVault } from "@/components/user-center/CreditVault";
import { UsageMonitor } from "@/components/user-center/UsageMonitor";
import type { UsageLog } from "@/components/user-center/UsageMonitor";
import { QuickActions } from "@/components/user-center/QuickActions";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import drawingApi from "@/api/drawing";
import billingApi, { type BillingSubscriptionSummary } from "@/api/billing";

type BillingHistoryTransaction = {
  id: number;
  type: string;
  type_name?: string;
  points?: number;
  description?: string;
  created_at: string;
  biz_type?: string;
  biz_id?: string;
  total_points_after?: number;
  frozen_points_after?: number;
  idempotency_key?: string;
};

const UserCenter = () => {
  const { t } = useTranslation();
  const { userEmail, userInfo, refreshUser } = useAuth();
  const [credits, setCredits] = useState(0);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [billingMeta, setBillingMeta] = useState({
    total: 0,
    limit: 0,
    offset: 0,
    fetchedCount: 0,
  });
  const [subscription, setSubscription] =
    useState<BillingSubscriptionSummary | null>(null);
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
      .getBillingHistory({ limit: 100 })
      .then((data) => {
        const logs = data.transactions.map((tx: BillingHistoryTransaction) => ({
          id: tx.id,
          type: tx.type,
          typeName: tx.type_name || tx.type || "Unknown",
          points: tx.points ?? 0,
          date: tx.created_at,
          description: tx.description || "",
          bizType: tx.biz_type || "",
          bizId: tx.biz_id || "",
          totalPointsAfter: tx.total_points_after ?? 0,
          frozenPointsAfter: tx.frozen_points_after ?? 0,
          idempotencyKey: tx.idempotency_key || "",
        }));
        setUsageLogs(logs);
        setBillingMeta({
          total: data.total,
          limit: data.limit,
          offset: data.offset,
          fetchedCount: data.transactions.length,
        });

        // 从最新的交易中获取当前余额
        if (
          typeof userInfo?.balance !== "number" &&
          data.transactions.length > 0
        ) {
          const firstTx = data.transactions[0] as BillingHistoryTransaction;
          if (typeof firstTx.total_points_after === "number") {
            setCredits(firstTx.total_points_after);
          }
        }
      })
      .catch(() => {
        // 接口不可用时使用默认数据
        setUsageLogs([
          {
            id: 1,
            type: "consume",
            typeName: "Consume",
            points: 10,
            date: new Date().toISOString(),
            description: "text_to_image consumed points",
            bizType: "text_to_image",
            bizId: "dm_fallback_assistant",
            totalPointsAfter: 850,
            frozenPointsAfter: 0,
            idempotencyKey: "draw_dm_fallback_assistant:consume",
          },
          {
            id: 2,
            type: "consume",
            typeName: "Consume",
            points: 15,
            date: new Date().toISOString(),
            description: "agent consumed points",
            bizType: "text_to_image",
            bizId: "dm_fallback_agent",
            totalPointsAfter: 860,
            frozenPointsAfter: 0,
            idempotencyKey: "draw_dm_fallback_agent:consume",
          },
          {
            id: 3,
            type: "consume",
            typeName: "Consume",
            points: 20,
            date: new Date().toISOString(),
            description: "bg_remove consumed points",
            bizType: "background_remove",
            bizId: "dm_fallback_bg_remove",
            totalPointsAfter: 875,
            frozenPointsAfter: 0,
            idempotencyKey: "draw_dm_fallback_bg_remove:consume",
          },
        ]);
        setBillingMeta({
          total: 3,
          limit: 100,
          offset: 0,
          fetchedCount: 3,
        });
        if (typeof userInfo?.balance === "number") {
          setCredits(userInfo.balance);
        } else {
          setCredits(850);
        }
      });
  }, [t, userInfo?.balance]);

  return (
    <div className="h-screen overflow-hidden">
      <main className="h-full p-6 md:p-8 bg-background overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Profile Header */}
          <ProfileHeader
            email={userEmail}
            credits={credits}
            subscription={subscription}
          />

          {/* Main Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Plan Card */}
            <div className="md:col-span-7">
              <PlanCard
                subscription={subscription}
                loading={subscriptionLoading}
              />
            </div>

            {/* Credit Vault */}
            <div className="md:col-span-5">
              <CreditVault credits={credits} />
            </div>

            {/* Usage Monitor */}
            <div className="md:col-span-8">
              <UsageMonitor
                logs={usageLogs}
                total={billingMeta.total}
                fetchedCount={billingMeta.fetchedCount}
                offset={billingMeta.offset}
              />
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
