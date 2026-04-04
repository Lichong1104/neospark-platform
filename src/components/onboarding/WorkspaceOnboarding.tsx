import React, { useState, useLayoutEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const HIGHLIGHT_PAD = 10;
const TOOLTIP_W = 320;
const TOOLTIP_MARGIN = 16;

type StepConfig = {
  targetId: string | null;
  titleKey: string;
  bodyKey: string;
};

function getTargetRect(targetId: string | null): DOMRect | null {
  if (!targetId || typeof document === "undefined") return null;
  const el = document.getElementById(targetId);
  if (!el) return null;
  return el.getBoundingClientRect();
}

function tooltipStyle(rect: DOMRect | null): React.CSSProperties {
  if (!rect) {
    return {
      position: "fixed",
      top: "50%",
      left: "50%",
      width: TOOLTIP_W,
      maxWidth: `calc(100vw - ${TOOLTIP_MARGIN * 2}px)`,
      transform: "translate(-50%, -50%)",
    };
  }
  const estH = 240;
  let top = rect.bottom + TOOLTIP_MARGIN;
  if (top + estH > window.innerHeight - TOOLTIP_MARGIN) {
    top = Math.max(TOOLTIP_MARGIN, rect.top - estH - TOOLTIP_MARGIN);
  }
  let left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
  left = Math.max(
    TOOLTIP_MARGIN,
    Math.min(left, window.innerWidth - TOOLTIP_W - TOOLTIP_MARGIN)
  );
  return {
    position: "fixed",
    top,
    left,
    width: TOOLTIP_W,
    maxWidth: `calc(100vw - ${TOOLTIP_MARGIN * 2}px)`,
    transform: "none",
  };
}

interface WorkspaceOnboardingProps {
  onComplete: () => void;
}

const WorkspaceOnboarding: React.FC<WorkspaceOnboardingProps> = ({ onComplete }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [layoutVersion, setLayoutVersion] = useState(0);

  const steps: StepConfig[] = useMemo(
    () => [
      {
        targetId: null,
        titleKey: "onboarding.welcomeTitle",
        bodyKey: "onboarding.welcomeBody",
      },
      {
        targetId: "onboarding-header",
        titleKey: "onboarding.headerTitle",
        bodyKey: "onboarding.headerBody",
      },
      {
        targetId: "onboarding-toolbar",
        titleKey: "onboarding.toolbarTitle",
        bodyKey: "onboarding.toolbarBody",
      },
      {
        targetId: "onboarding-canvas",
        titleKey: "onboarding.canvasTitle",
        bodyKey: "onboarding.canvasBody",
      },
      {
        targetId: "onboarding-hub",
        titleKey: "onboarding.hubTitle",
        bodyKey: "onboarding.hubBody",
      },
    ],
    []
  );

  const relayout = useCallback(() => setLayoutVersion((v) => v + 1), []);

  useLayoutEffect(() => {
    relayout();
  }, [step, relayout]);

  useLayoutEffect(() => {
    const onResize = () => relayout();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [relayout]);

  // layoutVersion forces re-read of getBoundingClientRect after resize
  void layoutVersion;

  const isLast = step >= steps.length - 1;
  const current = steps[step];
  if (!current) return null;

  const rect = getTargetRect(current.targetId);
  const ttStyle = tooltipStyle(rect);

  const ring =
    rect &&
    rect.width > 0 &&
    rect.height > 0 && (
      <div
        className="pointer-events-none fixed z-[1001] rounded-sm border-2 border-accent-cyan shadow-[0_0_0_3px_rgba(34,211,238,0.25)]"
        style={{
          left: rect.left - HIGHLIGHT_PAD,
          top: rect.top - HIGHLIGHT_PAD,
          width: rect.width + HIGHLIGHT_PAD * 2,
          height: rect.height + HIGHLIGHT_PAD * 2,
        }}
        aria-hidden
      />
    );

  const node = (
    <>
      <div
        className="fixed inset-0 z-[1000] bg-black/58 pointer-events-auto"
        aria-hidden
      />
      {ring}
      <div
        className={cn(
          "pointer-events-auto fixed z-[1002] border-brutal border-foreground bg-card brutal-shadow p-4 flex flex-col gap-3"
        )}
        style={ttStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-onboarding-title"
      >
        <p className="text-[10px] font-mono uppercase text-muted-foreground">
          {t("onboarding.progress", { current: step + 1, total: steps.length })}
        </p>
        <h2 id="workspace-onboarding-title" className="text-sm font-bold uppercase tracking-wide">
          {t(current.titleKey)}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{t(current.bodyKey)}</p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => (isLast ? onComplete() : setStep((s) => s + 1))}
            className="px-4 py-2 text-xs font-bold uppercase border-brutal border-foreground bg-accent-cyan text-foreground brutal-press hover:brightness-110"
          >
            {isLast ? t("onboarding.done") : t("onboarding.next")}
          </button>
          <button
            type="button"
            onClick={onComplete}
            className="px-3 py-2 text-[10px] font-mono uppercase text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            {t("onboarding.skip")}
          </button>
        </div>
      </div>
    </>
  );

  return typeof document !== "undefined" ? createPortal(node, document.body) : null;
};

export { WorkspaceOnboarding };
