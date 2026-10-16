import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import skillsApi from "@/api/skills";

/**
 * 下载某个 Skill 的 MCP 使用包（zip 里自带当前用户对该技能的调用密钥）。
 *
 * 走 axios blob + createObjectURL 本地触发下载，不能直接用 <a href> 指向后端接口 ——
 * 前端与 API 跨站，需要显式带上 Authorization。下载会轮换密钥，所以每次都要现取。
 */
export function useMcpBundleDownload() {
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState(false);

  const download = useCallback(
    async (skillId: string) => {
      setDownloading(true);
      try {
        const blob = await skillsApi.downloadMcpBundle(skillId);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `neospark-${skillId}-mcp.zip`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        toast.success(t("skill.downloadMcpBundleSuccess"));
      } catch {
        toast.error(t("skill.downloadMcpBundleFailed"));
      } finally {
        setDownloading(false);
      }
    },
    [t]
  );

  return { downloading, download };
}