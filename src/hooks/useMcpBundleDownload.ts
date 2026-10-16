import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import skillsApi from "@/api/skills";

/** 一次下载产出的接入信息，用于事后在界面上给出可复制的命令。 */
export interface McpBundleInfo {
  skillId: string;
  /** 该技能专属的 MCP 端点 */
  endpoint: string;
  /** 包里那把 nsk_ 密钥；明文只在下载这次拿得到 */
  apiKey: string;
}

const BUNDLE_DOWNLOAD_NAME = (skillId: string) => `neospark-${skillId}-mcp.zip`;

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * 从下载到的 zip 里解出密钥与端点。
 *
 * 后端只在下载这一刻返回明文密钥，之后再查不到，所以要当场把 zip 读出来，
 * 否则用户只能自己去解压看文件。读取失败不影响下载本身，返回 null 即可。
 */
async function readBundleInfo(blob: Blob, skillId: string): Promise<McpBundleInfo | null> {
  try {
    const [{ default: JSZip }, { STATIC_BASE_URL }] = await Promise.all([
      import("jszip"),
      import("@/api/request"),
    ]);
    const entry = (await JSZip.loadAsync(blob)).file(`neospark-${skillId}/.mcp.json`);
    if (!entry) return null;

    const config = JSON.parse(await entry.async("string"));
    const authorization: unknown = config?.mcpServers?.[skillId]?.headers?.Authorization;
    if (typeof authorization !== "string") return null;

    const apiKey = authorization.replace(/^Bearer\s+/i, "").trim();
    if (!apiKey) return null;

    return { skillId, endpoint: `${STATIC_BASE_URL}/mcp/${skillId}`, apiKey };
  } catch {
    return null;
  }
}

/**
 * 下载某个 Skill 的 MCP 使用包（zip 里自带当前用户对该技能的调用密钥）。
 *
 * 走 axios blob + createObjectURL 本地触发下载，不能直接用 <a href> 指向后端接口 ——
 * 前端与 API 跨站，需要显式带上 Authorization。下载会轮换密钥，所以每次都要现取。
 */
export function useMcpBundleDownload() {
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState(false);
  const [bundle, setBundle] = useState<McpBundleInfo | null>(null);

  const download = useCallback(
    async (skillId: string) => {
      setDownloading(true);
      try {
        const blob = await skillsApi.downloadMcpBundle(skillId);
        saveBlob(blob, BUNDLE_DOWNLOAD_NAME(skillId));
        toast.success(t("skill.downloadMcpBundleSuccess"));

        // 下载已经完成，后面的解析失败不该报「下载失败」，只是不给引导弹窗
        setBundle(await readBundleInfo(blob, skillId));
      } catch {
        toast.error(t("skill.downloadMcpBundleFailed"));
      } finally {
        setDownloading(false);
      }
    },
    [t]
  );

  const closeBundle = useCallback(() => setBundle(null), []);

  return { downloading, download, bundle, closeBundle };
}