import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { LandingComposer } from "@/components/workspace/LandingComposer";
import type { PendingRequest } from "@/lib/landingRequest";

/**
 * 聊天优先过渡页（独立路由 `/`)。
 * 只负责采集 {mode, prompt, params} —— 提交后携带参数跳转到画布路由 `/canvas`,
 * 由画布页的右侧对应面板去生成（本页不发起任何生成请求）。
 */
const Landing = () => {
  const navigate = useNavigate();

  const handleSubmit = useCallback(
    (req: PendingRequest) => {
      navigate("/canvas", { state: { request: req } });
    },
    [navigate]
  );

  const handleSkipToCanvas = useCallback(() => {
    window.open("/canvas", "_blank", "noopener,noreferrer");
  }, []);

  return (
    <LandingComposer
      onSubmit={handleSubmit}
      onSkipToCanvas={handleSkipToCanvas}
    />
  );
};

export default Landing;
