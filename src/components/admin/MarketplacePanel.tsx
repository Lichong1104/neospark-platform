import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { BrutalCard } from "@/components/ui/brutal-card";
import { BrutalTabs } from "@/components/ui/brutal-tabs";
import InvocationLedgerPanel from "@/components/admin/InvocationLedgerPanel";
import ReconciliationPanel from "@/components/admin/ReconciliationPanel";
import AbusePanel from "@/components/admin/AbusePanel";

type MarketplaceTab = "invocations" | "reconciliation" | "risk";

const TABS: MarketplaceTab[] = ["invocations", "reconciliation", "risk"];

const MarketplacePanel: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<MarketplaceTab>("invocations");

  const labels: Record<MarketplaceTab, string> = {
    invocations: t("admin.marketplace.tabs.invocations"),
    reconciliation: t("admin.marketplace.tabs.reconciliation"),
    risk: t("admin.marketplace.tabs.risk"),
  };

  return (
    <section className="space-y-4">
      <BrutalCard shadow="default" className="overflow-hidden">
        <BrutalTabs
          className="[&>button]:px-4 [&>button]:py-2.5 [&>button]:text-sm [&>button]:tracking-wider"
          tabs={TABS.map((key) => labels[key])}
          activeTab={labels[activeTab]}
          onTabChange={(label) => {
            const key = TABS.find((k) => labels[k] === label);
            if (key) setActiveTab(key);
          }}
        />
      </BrutalCard>

      {activeTab === "invocations" ? <InvocationLedgerPanel /> : null}
      {activeTab === "reconciliation" ? <ReconciliationPanel /> : null}
      {activeTab === "risk" ? <AbusePanel /> : null}
    </section>
  );
};

export default MarketplacePanel;
