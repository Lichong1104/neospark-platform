import { http } from "./request";

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

export async function listPromptCategories(): Promise<PromptCategoriesResponse> {
  const res = await http.get<PromptCategoriesResponse>("/prompts/categories");
  return res.data!;
}
