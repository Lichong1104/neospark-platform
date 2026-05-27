import React from "react";
import AffiliatePanel from "@/components/affiliate/AffiliatePanel";

const Affiliate = () => {
  return (
    <div className="h-screen overflow-hidden">
      <main className="h-full p-6 md:p-8 bg-background overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <AffiliatePanel />
        </div>
      </main>
    </div>
  );
};

export default Affiliate;
