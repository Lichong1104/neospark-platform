import React, { useState, useLayoutEffect, useCallback, useMemo, useId } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

const HIGHLIGHT_PAD = 8;
const TOOLTIP_MIN_W = 300;
const TOOLTIP_MAX_W = 400;
const VIEW_MARGIN = 16;

type StepPlacement = "center" | "auto";

type StepConfig = {
  targetId: string | null;
  /** If the primary target is missing (e.g. another sub-tab), highlight this instead */
  fallbackTargetId?: string | null;
  titleKey: string;
  bodyKey: string;
  /** Where to prefer the card when target is on screen edges */
  placement: StepPlacement;
  /** Extra highlight padding for small controls */
  pad?: number;
};

function getTargetRect(targetId: string | null): DOMRect | null {
  if (!targetId || typeof document === "undefined") return null;
  const el = document.getElementById(targetId);
  if (!el) return null;
  return el.getBoundingClientRect();
}

function resolveHighlightRect(step: StepConfig): DOMRect | null {
  const primary = step.targetId ? getTargetRect(step.targetId) : null;
  if (primary && primary.width > 0 && primary.height > 0) return primary;
  if (step.fallbackTargetId) {
    const fb = getTargetRect(step.fallbackTargetId);
    if (fb && fb.width > 0 && fb.height > 0) return fb;
  }
  return null;
}

function computeTooltipStyle(
  rect: DOMRect | null,
  placement: StepPlacement,
  tooltipW: number,
  tooltipHEstimate: number
): React.CSSProperties {
  const maxW = Math.min(TOOLTIP_MAX_W, window.innerWidth - VIEW_MARGIN * 2);
  const w = Math.max(TOOLTIP_MIN_W, Math.min(tooltipW, maxW));

  if (!rect || placement === "center") {
    return {
      position: "fixed",
      top: "50%",
      left: "50%",
      width: w,
      maxWidth: maxW,
      transform: "translate(-50%, -50%)",
    };
  }

  const pad = HIGHLIGHT_PAD;
  const hole = {
    left: rect.left - pad,
    top: rect.top - pad,
    right: rect.right + pad,
    bottom: rect.bottom + pad,
    w: rect.width + pad * 2,
    h: rect.height + pad * 2,
  };

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const gap = 16;

  const spaceRight = vw - hole.right - VIEW_MARGIN;
  const spaceLeft = hole.left - VIEW_MARGIN;
  const spaceBelow = vh - hole.bottom - VIEW_MARGIN;
  const spaceAbove = hole.top - VIEW_MARGIN;

  let top = hole.bottom + gap;
  let left = hole.left + hole.w / 2 - w / 2;
  let transform = "none" as const;

  const tryRightOfToolbar = spaceRight >= w + gap;
  const tryLeftOfPanel = spaceLeft >= w + gap;

  if (hole.left < vw * 0.22 && tryRightOfToolbar) {
    left = hole.right + gap;
    top = hole.top + hole.h / 2 - tooltipHEstimate / 2;
    top = Math.max(VIEW_MARGIN, Math.min(top, vh - tooltipHEstimate - VIEW_MARGIN));
  } else if (hole.right > vw * 0.78 && tryLeftOfPanel) {
    left = hole.left - w - gap;
    top = hole.top + hole.h / 2 - tooltipHEstimate / 2;
    top = Math.max(VIEW_MARGIN, Math.min(top, vh - tooltipHEstimate - VIEW_MARGIN));
  } else {
    if (spaceBelow < tooltipHEstimate && spaceAbove > spaceBelow) {
      top = hole.top - tooltipHEstimate - gap;
    }
    left = Math.max(VIEW_MARGIN, Math.min(left, vw - w - VIEW_MARGIN));
    top = Math.max(VIEW_MARGIN, Math.min(top, vh - tooltipHEstimate - VIEW_MARGIN));
  }

  return {
    position: "fixed",
    top,
    left,
    width: w,
    maxWidth: maxW,
    transform,
  };
}

interface WorkspaceOnboardingProps {
  onComplete: () => void;
}

const SpotlightSvg: React.FC<{
  rect: DOMRect | null;
  pad: number;
  maskId: string;
}> = ({ rect, pad, maskId }) => {
  if (!rect || rect.width <= 0 || rect.height <= 0) return null;

  const x = rect.left - pad;
  const y = rect.top - pad;
  const w = rect.width + pad * 2;
  const h = rect.height + pad * 2;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const r = 6;

  return (
    <svg
      className="pointer-events-none fixed inset-0 z-[1000] h-[100vh] w-[100vw]"
      aria-hidden
    >
      <defs>
        <mask id={maskId}>
          <rect width="100%" height="100%" fill="white" />
          <rect x={x} y={y} width={w} height={h} rx={r} ry={r} fill="black" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="rgba(15, 23, 42, 0.78)" mask={`url(#${maskId})`} />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={r}
        ry={r}
        fill="none"
        stroke="hsl(var(--accent-cyan))"
        strokeWidth={2}
        className="drop-shadow-[0_0_12px_hsl(var(--accent-cyan)/0.45)]"
      />
    </svg>
  );
};

const WorkspaceOnboarding: React.FC<WorkspaceOnboardingProps> = ({ onComplete }) => {
  const { t } = useTranslation();
  const rawId = useId().replace(/:/g, "");
  const maskId = `onb-mask-${rawId}`;

  const [step, setStep] = useState(0);
  const [layoutVersion, setLayoutVersion] = useState(0);

  const steps: StepConfig[] = useMemo(
    () => [
      {
        targetId: null,
        titleKey: "onboarding.welcomeTitle",
        bodyKey: "onboarding.welcomeBody",
        placement: "center",
      },
      {
        targetId: "onboarding-user-menu-trigger",
        titleKey: "onboarding.userMenuTitle",
        bodyKey: "onboarding.userMenuBody",
        placement: "auto",
        pad: 6,
      },
      {
        targetId: "onboarding-toolbar-assets",
        titleKey: "onboarding.toolbarAssetsTitle",
        bodyKey: "onboarding.toolbarAssetsBody",
        placement: "auto",
        pad: 4,
      },
      {
        targetId: "onboarding-toolbar-process",
        titleKey: "onboarding.toolbarProcessTitle",
        bodyKey: "onboarding.toolbarProcessBody",
        placement: "auto",
      },
      {
        targetId: "onboarding-toolbar-enhance",
        titleKey: "onboarding.toolbarEnhanceTitle",
        bodyKey: "onboarding.toolbarEnhanceBody",
        placement: "auto",
      },
      {
        targetId: "onboarding-toolbar-quality",
        titleKey: "onboarding.toolbarQualityTitle",
        bodyKey: "onboarding.toolbarQualityBody",
        placement: "auto",
      },
      {
        targetId: "onboarding-canvas-toolbar",
        titleKey: "onboarding.canvasToolbarTitle",
        bodyKey: "onboarding.canvasToolbarBody",
        placement: "auto",
      },
      {
        targetId: "onboarding-canvas-stage",
        titleKey: "onboarding.canvasStageTitle",
        bodyKey: "onboarding.canvasStageBody",
        placement: "auto",
      },
      {
        targetId: "onboarding-hub-tabs",
        titleKey: "onboarding.hubTabsTitle",
        bodyKey: "onboarding.hubTabsBody",
        placement: "auto",
      },
      {
        targetId: "onboarding-hub-mode",
        fallbackTargetId: "onboarding-hub-panel",
        titleKey: "onboarding.hubModeTitle",
        bodyKey: "onboarding.hubModeBody",
        placement: "auto",
      },
      {
        targetId: "onboarding-hub-compose",
        fallbackTargetId: "onboarding-hub-tabs",
        titleKey: "onboarding.hubComposeTitle",
        bodyKey: "onboarding.hubComposeBody",
        placement: "auto",
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

  void layoutVersion;

  const isLast = step >= steps.length - 1;
  const isFirst = step === 0;
  const current = steps[step];
  if (!current) return null;

  const pad = current.pad ?? HIGHLIGHT_PAD;
  const rect = resolveHighlightRect(current);
  const ttStyle = computeTooltipStyle(rect, current.placement, 360, 260);

  const node = (
    <>
      {/* Blocks interaction with the workspace until the user finishes or skips */}
      <div className="pointer-events-auto fixed inset-0 z-[998] cursor-default bg-transparent" aria-hidden />

      {rect ? (
        <SpotlightSvg rect={rect} pad={pad} maskId={maskId} />
      ) : (
        <div
          className="fixed inset-0 z-[999] bg-[rgba(15,23,42,0.82)] backdrop-blur-[3px] dark:bg-black/80"
          aria-hidden
        />
      )}

      <div
        className={cn(
          "fixed z-[1003] overflow-hidden border-2 border-foreground bg-card/95 shadow-[6px_6px_0_0_hsl(var(--foreground))]",
          "backdrop-blur-md motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-200"
        )}
        style={ttStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-onboarding-title"
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-accent-cyan via-accent-purple to-accent-yellow" />
        <div className="flex items-start justify-between gap-2 border-b border-foreground/10 px-4 pb-3 pt-3">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-accent-cyan" />
            {t("onboarding.progress", { current: step + 1, total: steps.length })}
          </div>
          <button
            type="button"
            onClick={onComplete}
            className="flex h-8 w-8 shrink-0 items-center justify-center border border-foreground/20 bg-background/80 text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
            aria-label={t("onboarding.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 pt-3">
          <div className="mb-3 flex gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 flex-1 transition-colors",
                  i === step
                    ? "bg-accent-cyan"
                    : i < step
                      ? "bg-accent-cyan/35"
                      : "bg-muted-foreground/20"
                )}
              />
            ))}
          </div>

          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center border border-accent-cyan/50 bg-accent-cyan/10 text-accent-cyan">
              <Sparkles className="h-4 w-4" />
            </span>
            <h2
              id="workspace-onboarding-title"
              className="text-sm font-bold uppercase leading-snug tracking-wide text-foreground"
            >
              {t(current.titleKey)}
            </h2>
          </div>
          <p className="text-[13px] leading-relaxed text-muted-foreground">{t(current.bodyKey)}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-foreground/10 bg-secondary/20 px-4 py-3">
          <button
            type="button"
            onClick={onComplete}
            className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            {t("onboarding.skip")}
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isFirst}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className={cn(
                "flex h-9 items-center gap-1 border-2 border-foreground px-3 text-[10px] font-bold uppercase tracking-wider transition-none",
                isFirst
                  ? "cursor-not-allowed opacity-40"
                  : "bg-card hover:bg-secondary brutal-press"
              )}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {t("onboarding.back")}
            </button>
            <button
              type="button"
              onClick={() => (isLast ? onComplete() : setStep((s) => s + 1))}
              className="flex h-9 items-center gap-1 border-2 border-foreground bg-accent-cyan px-4 text-[10px] font-bold uppercase tracking-wider text-foreground brutal-press hover:brightness-110"
            >
              {isLast ? t("onboarding.done") : t("onboarding.next")}
              {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return typeof document !== "undefined" ? createPortal(node, document.body) : null;
};

export { WorkspaceOnboarding };
