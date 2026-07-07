import { http } from "./request";

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
  example_prompts: AiDesignToolExampleGroup[];
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
 * 清洗前端展示的 AI Design Tools 数据
 * 用于在不修改后端的情况下，控制 Prompt Arsenal 中展示的内容。
 */
function cleanAiDesignTools(tools: AiDesignTool[]): AiDesignTool[] {
  return tools.map((tool) => {
    if (tool.title !== "Advertising Poster Generator") {
      return tool;
    }

    return {
      ...tool,
      default_prompt:
        "Create a print-ready advertising poster for a fitness gym grand opening. Include 'Grand Opening Special - First Month Free'. Bold, energetic design with action imagery. Size: 18x24 inches.",
      example_prompts: [
        {
          icon: "🏋️",
          label: "Gym Opening",
          prompts: [
            "Create a print-ready advertising poster for a fitness gym grand opening. Include 'Grand Opening Special - First Month Free'. Bold, energetic design with action imagery. Size: 18x24 inches.",
            "Design a yoga studio grand opening poster with calming colors and zen imagery. Include free first class offer. Size: 11x17 inches.",
            "Create a CrossFit gym promotional poster featuring intense workout imagery and 'No Limits' tagline. Industrial, gritty design. Size: A2.",
          ],
        },
        {
          icon: "🎸",
          label: "Concert Poster",
          prompts: [
            "Design a concert poster for a local band's album release. Include date, venue, and ticket info. Vintage rock style with distressed textures. Size: 11x17 inches.",
            "Create a jazz festival poster with elegant typography and trumpet imagery. Include multiple artist lineup. Art deco style. Size: 18x24 inches.",
            "Design an EDM concert poster with neon colors and abstract geometric patterns. Include DJ names and venue details. Size: A1.",
          ],
        },
        {
          icon: "🍝",
          label: "Restaurant Promo",
          prompts: [
            "Create a promotional poster for a restaurant's new menu. Feature appetizing food imagery and special discount code. Elegant, modern design. Size: A2.",
          ],
        },
      ],
    };
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
