import React from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

const WorkflowCanvas: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="relative w-full h-full bg-accent-yellow overflow-hidden">
      <div 
        className="absolute inset-0" 
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--foreground) / 0.06) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--foreground) / 0.06) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px'
        }}
      />

      <div className="absolute top-0 left-0 right-0 h-12 bg-card border-b-brutal border-foreground flex items-center px-4 gap-4 z-10">
        <div className="px-4 py-1.5 bg-accent-yellow border-brutal border-foreground font-bold text-sm uppercase">
          {t("workflowCanvas.workflowMode")}
        </div>
        <div className="px-4 py-1.5 bg-card border-brutal border-foreground font-mono text-sm">
          <span className="text-muted-foreground">{t("workflowCanvas.nodes")}:</span> <span className="font-bold">0</span>
        </div>
      </div>

      <div className="absolute inset-0 top-12 flex items-center justify-center">
        <div className="bg-card border-2 border-dashed border-foreground p-12 text-center max-w-lg">
          <div className="w-16 h-16 mx-auto mb-4 border-2 border-dashed border-foreground flex items-center justify-center">
            <Plus className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold uppercase mb-3">{t("workflowCanvas.title")}</h3>
          <p className="text-muted-foreground text-sm mb-4">
            {t("workflowCanvas.emptyHint")}
          </p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• {t("workflowCanvas.createConnections")}</li>
            <li>• {t("workflowCanvas.deleteNode")}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export { WorkflowCanvas };
