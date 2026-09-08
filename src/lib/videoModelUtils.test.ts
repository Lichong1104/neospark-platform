import { describe, expect, it } from "vitest";

import {
  getModelMaxDuration,
  mergeDurationOptionsFromApi,
  resolveDurationRange,
} from "./videoModelUtils";
import type { VideoDurationRange, VideoModelsData } from "@/types/video";

const GLOBAL_RANGE: VideoDurationRange = { min: 4, max: 15, default: 5 };
const PER_MODEL: Record<string, VideoDurationRange> = {
  default: GLOBAL_RANGE,
  "seedance-2.5": { min: 4, max: 30, default: 5 },
  "wan3.0-video": { min: 4, max: 30, default: 5 },
};

describe("getModelMaxDuration", () => {
  it("Seedance 2.5 / Wan 3.0 最长 30 秒，其他模型 15 秒", () => {
    expect(getModelMaxDuration("seedance-2.5")).toBe(30);
    expect(getModelMaxDuration("wan3.0-video")).toBe(30);
    expect(getModelMaxDuration("kling-3.0")).toBe(15);
    expect(getModelMaxDuration(undefined)).toBe(15);
  });
});

describe("resolveDurationRange", () => {
  it("兼容旧的全局单条格式", () => {
    expect(resolveDurationRange(GLOBAL_RANGE, "wan3.0-video")).toBe(
      GLOBAL_RANGE
    );
  });

  it("按模型取 record 中的条目", () => {
    expect(resolveDurationRange(PER_MODEL, "wan3.0-video")?.max).toBe(30);
    expect(resolveDurationRange(PER_MODEL, "kling-3.0")).toBe(GLOBAL_RANGE);
  });

  it("未知模型回退 default 条目", () => {
    expect(resolveDurationRange(PER_MODEL, "unknown-model")).toBe(
      GLOBAL_RANGE
    );
    expect(resolveDurationRange(PER_MODEL, undefined)).toBe(GLOBAL_RANGE);
  });

  it("无数据时返回 undefined", () => {
    expect(resolveDurationRange(undefined, "wan3.0-video")).toBeUndefined();
  });
});

describe("mergeDurationOptionsFromApi", () => {
  const opts = (n: number) =>
    Array.from({ length: n }, (_, i) => String(4 + i));

  it("无 durations 数据时按前端模型上限生成", () => {
    expect(mergeDurationOptionsFromApi(undefined, "wan3.0-video")).toEqual(
      opts(27)
    );
    expect(mergeDurationOptionsFromApi(undefined, "kling-3.0")).toEqual(
      opts(12)
    );
  });

  it("旧全局格式 max=15 时 Wan 模型也被限制在 15 秒", () => {
    expect(mergeDurationOptionsFromApi(GLOBAL_RANGE, "wan3.0-video")).toEqual(
      opts(12)
    );
  });

  it("按模型 record 时 Wan 3.0 / Seedance 2.5 开放到 30 秒", () => {
    const durations = PER_MODEL as VideoModelsData["durations"];
    expect(mergeDurationOptionsFromApi(durations, "wan3.0-video")).toEqual(
      opts(27)
    );
    expect(mergeDurationOptionsFromApi(durations, "seedance-2.5")).toEqual(
      opts(27)
    );
    expect(mergeDurationOptionsFromApi(durations, "kling-3.0")).toEqual(
      opts(12)
    );
  });
});
