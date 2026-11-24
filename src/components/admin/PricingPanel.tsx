import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { BrutalCard } from "@/components/ui/brutal-card";
import { BrutalTabs } from "@/components/ui/brutal-tabs";
import PricingConfigPanel from "@/components/admin/PricingConfigPanel";
import TokenPricingPanel from "@/components/admin/TokenPricingPanel";
import AssetPricingPanel from "@/components/admin/AssetPricingPanel";

type PricingTab = "config" | "token" | "asset";

const TABS: PricingTab[] = ["config", "token", "asset"];

const PricingPanel: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<PricingTab>("config");

  const labels: Record<PricingTab, string> = {
    config: t("admin.pricing.tabs.config"),
    token: t("admin.pricing.tabs.token"),
    asset: t("admin.pricing.tabs.asset"),
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

      {activeTab === "config" ? <PricingConfigPanel /> : null}
      {activeTab === "token" ? <TokenPricingPanel /> : null}
      {activeTab === "asset" ? <AssetPricingPanel /> : null}
    </section>
  );
};

export default PricingPanel;
