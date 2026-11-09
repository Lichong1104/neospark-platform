import { describe, expect, it } from "vitest";

import { calculateImageEstimatedCost } from "./pricing";
import { supportsGifOutput, type ModelsConfigMap } from "@/types/drawing";

const CONFIG: ModelsConfigMap = {
  "gpt-image-2": {
    name: "GPT Image 2",
    provider: "tengda",
    description: "",
    supported_resolutions: [{ value: "1K", label: "1K", price: 4 }],
    supported_aspect_ratios: [{ value: "1:1", label: "1:1" }],
    image_to_image_extra: 0,
  },
  "gpt-image-2.6-flare": {
    name: "GPT Image 2.6 Flare",
    provider: "tengda",
    description: "",
    supported_resolutions: [{ value: "1K", label: "1K", price: 4 }],
    supported_aspect_ratios: [{ value: "1:1", label: "1:1" }],
    image_to_image_extra: 0,
    supports_gif: true,
  },
};

describe("supportsGifOutput", () => {
  it("prefers the backend capability flag", () => {
    expect(supportsGifOutput("gpt-image-2", CONFIG["gpt-image-2"])).toBe(false);
    expect(
      supportsGifOutput("gpt-image-2.6-flare", CONFIG["gpt-image-2.6-flare"])
    ).toBe(true);
  });

  it("falls back to the model id when config lacks the flag", () => {
    expect(supportsGifOutput("gpt-image-2.6-sunburst", undefined)).toBe(true);
    expect(supportsGifOutput("gpt-image-2.5-flare", undefined)).toBe(false);
  });
});

describe("calculateImageEstimatedCost for gpt-image-2.6", () => {
  it("uses per-generation quality pricing at 1K", () => {
    expect(
      calculateImageEstimatedCost(CONFIG, "gpt-image-2.6-flare", "1K", "low")
    ).toBe(4);
    expect(
      calculateImageEstimatedCost(CONFIG, "gpt-image-2.6-flare", "1K", "medium")
    ).toBe(7);
    expect(
      calculateImageEstimatedCost(CONFIG, "gpt-image-2.6-flare", "1K", "high")
    ).toBe(12);
  });
});
