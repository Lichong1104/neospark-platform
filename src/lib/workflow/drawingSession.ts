import drawingApi from "@/api/drawing";

let cachedSessionId: string | null = null;
let sessionPromise: Promise<string> | null = null;

/**
 * 懒创建并缓存一个 drawing session，供工作流内所有图片节点复用，
 * 避免每个图片节点各建一个会话。
 */
export function getOrCreateDrawingSession(): Promise<string> {
  if (cachedSessionId) return Promise.resolve(cachedSessionId);
  if (!sessionPromise) {
    sessionPromise = drawingApi
      .createSession({ title: "Workflow" })
      .then((res) => {
        cachedSessionId = res.session_id;
        return res.session_id;
      });
  }
  return sessionPromise;
}
