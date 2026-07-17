import { http } from "./request";
import aiDesignToolExamples from "@/data/aiDesignToolExamples.json";

// ============== 旧 Prompt Lib 类型（保留以兼容可能的外部引用）=============

export interface PromptItem {
  id: string;
  title: string;
  description: string;
  prompt: string;
  tags: string[];
  category: string;
  categoryName: string;
  model: string;
  promptType: string;
  author: string;
  imageUrl: string;
  pubDate: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  count: number;
}

export interface PromptListResponse {
  items: PromptItem[];
  total: number;
  page: number;
  page_size: number;
  categories: CategoryItem[];
}

export interface PromptCategoriesResponse {
  categories: CategoryItem[];
  total_prompts: number;
}

// ============== AI Design Tools 类型 ==============

export interface AiDesignToolSize {
  width: number;
  height: number;
  label: string;
}

export interface AiDesignToolStylePreset {
  label: string;
  value: string;
}

export interface AiDesignToolExampleGroup {
  icon: string;
  label: string;
  prompts: string[];
}

export interface AiDesignTool {
  id: string;
  title: string;
  description: string;
  slug: string;
  path: string;
  h1: string;
  subtitle: string;
  default_prompt: string;
  sizes: AiDesignToolSize[];
  style_presets: AiDesignToolStylePreset[];
  example_prompts?: AiDesignToolExampleGroup[];
}

export interface AiDesignToolListResponse {
  items: AiDesignTool[];
  total: number;
}

// ============== 请求参数 / 响应类型 ==============

export interface OptimizePromptParams {
  prompt: string;
  style?: string;
}

export interface OptimizePromptData {
  original_prompt: string;
  optimized_prompt: string;
  style: string | null;
}

// ============== API 函数 ==============

/**
 * 获取旧版 Prompt Lib 列表（已弃用，保留用于兼容）
 */
export async function listPrompts(params?: {
  category?: string;
  model?: string;
  promptType?: string;
  search?: string;
  page?: number;
  page_size?: number;
}): Promise<PromptListResponse> {
  const res = await http.get<PromptListResponse>("/prompts", params);
  return res.data!;
}

/**
 * 获取旧版 Prompt Lib 分类（已弃用，保留用于兼容）
 */
export async function listPromptCategories(): Promise<PromptCategoriesResponse> {
  const res = await http.get<PromptCategoriesResponse>("/prompts/categories");
  return res.data!;
}

/**
 * 获取 AI Design Tools 配置列表（替代 Prompt Lib）
 */
export async function listAiDesignTools(params?: {
  search?: string;
}): Promise<AiDesignToolListResponse> {
  const res = await http.get<AiDesignToolListResponse>("/ai-design-tools-config", params);
  const data = res.data!;
  return {
    ...data,
    items: cleanAiDesignTools(data.items),
  };
}

/**
 * 清洗并合并 AI Design Tools 数据。
 * 1. 将本地抓取的 example_prompts 按 slug 合并到对应工具上（后端暂时没配全时做兜底）。
 * 2. 保留对特定工具的前端覆盖能力。
 */
function cleanAiDesignTools(tools: AiDesignTool[]): AiDesignTool[] {
  const exampleMap = aiDesignToolExamples as Record<string, AiDesignToolExampleGroup[]>;

  const deriveSlugFromTitle = (title: string): string =>
    title
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

  return tools.map((tool) => {
    const slugKey = tool.slug || deriveSlugFromTitle(tool.title);
    const scrapedExamples = exampleMap[slugKey] ?? exampleMap[deriveSlugFromTitle(tool.title)];
    const merged: AiDesignTool =
      scrapedExamples && scrapedExamples.length > 0
        ? { ...tool, example_prompts: scrapedExamples }
        : tool;

    // 保留对 Advertising Poster 的前端覆盖（使用更完整的本地示例）
    if (merged.title === "Advertising Poster Generator") {
      return {
        ...merged,
        default_prompt:
          "Create a print-ready advertising poster for a fitness gym grand opening. Include 'Grand Opening Special - First Month Free'. Bold, energetic design with action imagery. Size: 18x24 inches.",
      };
    }

    return merged;
  });
}

/**
 * 调用 Gemini 优化提示词
 */
export async function optimizePrompt(
  params: OptimizePromptParams
): Promise<OptimizePromptData> {
  const res = await http.post<OptimizePromptData, OptimizePromptParams>(
    "/prompts/optimize",
    params
  );
  return res.data!;
}
