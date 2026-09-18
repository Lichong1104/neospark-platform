/**
 * 资产组 API
 *
 * 用户可创建资产组，生成图片/视频时通过 asset_group_id 指定入组，
 * 画廊（AssetSidebar）展示时按组过滤。
 */
import { http } from "@/api/request";
import type { AssetGroup } from "@/types/storage";

interface AssetGroupsResponse {
  items: AssetGroup[];
}

interface AssetGroupResponse {
  group_id: string;
  name: string;
  item_count: number;
  created_at: string;
}

/** 获取当前用户的资产组列表（含成员数） */
export async function listAssetGroups(): Promise<AssetGroup[]> {
  const res = await http.get<AssetGroupsResponse>("/asset-groups");
  return res.data?.items ?? [];
}

/** 创建资产组，返回完整组信息 */
export async function createAssetGroup(name: string): Promise<AssetGroup> {
  const res = await http.post<AssetGroupResponse>("/asset-groups", { name });
  return {
    group_id: res.data.group_id,
    name: res.data.name,
    item_count: res.data.item_count ?? 0,
    created_at: res.data.created_at,
  };
}

/** 重命名资产组 */
export async function renameAssetGroup(
  groupId: string,
  name: string
): Promise<void> {
  await http.patch(`/asset-groups/${groupId}`, { name });
}

/** 删除资产组（级联移除组内资产引用） */
export async function deleteAssetGroup(groupId: string): Promise<void> {
  await http.del(`/asset-groups/${groupId}`);
}

const assetGroupsApi = {
  listAssetGroups,
  createAssetGroup,
  renameAssetGroup,
  deleteAssetGroup,
};

export default assetGroupsApi;
