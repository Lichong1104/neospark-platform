import React, { useEffect, useImperativeHandle, useRef, forwardRef, useCallback } from "react";

/**
 * Cloudflare Turnstile 人机验证组件
 *
 * 用法:
 *   const turnstileRef = useRef<TurnstileWidgetHandle>(null);
 *   const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
 *   <TurnstileWidget ref={turnstileRef} onVerify={setTurnstileToken} onExpire={() => setTurnstileToken(null)} />
 *
 * 未配置 VITE_TURNSTILE_SITE_KEY 时渲染为空（后端同步放行）。
 */

const TURNSTILE_SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "invisible";
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export interface TurnstileWidgetHandle {
  /** 重置 widget，获取新的 token（token 一次性，每次提交后必须重置） */
  reset: () => void;
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

let scriptLoadPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoadPromise = null;
      reject(new Error("Failed to load Turnstile script"));
    };
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

const TurnstileWidget = forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>(
  ({ onVerify, onExpire, onError }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        }
      },
    }));

    const renderWidget = useCallback(async () => {
      if (!siteKey || !containerRef.current) return;
      try {
        await loadTurnstileScript();
      } catch {
        onError?.();
        return;
      }
      if (!window.turnstile || !containerRef.current || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => onVerify(token),
        "expired-callback": () => onExpire?.(),
        "error-callback": () => onError?.(),
      });
    }, [siteKey, onVerify, onExpire, onError]);

    useEffect(() => {
      renderWidget();
      return () => {
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // widget 已被移除时忽略
          }
          widgetIdRef.current = null;
        }
      };
    }, [renderWidget]);

    if (!siteKey) return null;

    return <div ref={containerRef} className="flex justify-center" />;
  }
);

TurnstileWidget.displayName = "TurnstileWidget";

export default TurnstileWidget;
