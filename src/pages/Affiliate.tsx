import React from "react";
import { Header } from "@/components/layout/Header";
import AffiliatePanel from "@/components/affiliate/AffiliatePanel";

const Affiliate = () => {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 p-6 md:p-8 bg-background overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <AffiliatePanel />
        </div>
      </main>
    </div>
  );
};

export default Affiliate;
