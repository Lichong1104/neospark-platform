import React from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type DrawingModelBrand = "openai" | "gemini" | "midjourney" | "unknown";

export function resolveDrawingModelBrand(
  modelId: string,
  modelName?: string,
  provider?: string
): DrawingModelBrand {
  const id = modelId.toLowerCase();
  const name = (modelName ?? "").toLowerCase();

  if (
    id.includes("gpt") ||
    id.includes("openai") ||
    name.includes("gpt") ||
    name.includes("openai")
  ) {
    return "openai";
  }
  if (
    id.includes("gemini") ||
    name.includes("gemini") ||
    provider === "gemini"
  ) {
    return "gemini";
  }
  if (id.includes("midjourney") || name.includes("midjourney")) {
    return "midjourney";
  }
  if (provider === "tengda") {
    if (name.includes("gpt") || name.includes("openai")) return "openai";
    if (name.includes("midjourney")) return "midjourney";
  }
  return "unknown";
}

const iconClass = "h-3 w-3 shrink-0";

/** OpenAI blossom mark (Bootstrap Icons, viewBox 0 0 16 16) */
const OpenAIIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 16 16"
    aria-hidden
    className={cn(iconClass, className)}
    fill="currentColor"
  >
    <path d="M14.949 6.547a3.94 3.94 0 0 0-.348-3.273 4.11 4.11 0 0 0-4.4-1.934A4.1 4.1 0 0 0 8.423.2 4.15 4.15 0 0 0 6.305.086a4.1 4.1 0 0 0-1.891.948 4.04 4.04 0 0 0-1.158 1.753 4.1 4.1 0 0 0-1.563.679A4 4 0 0 0 .554 4.72a3.99 3.99 0 0 0 .502 4.731 3.94 3.94 0 0 0 .346 3.274 4.11 4.11 0 0 0 4.402 1.933c.382.425.852.764 1.377.995.526.231 1.095.35 1.67.346 1.78.002 3.358-1.132 3.901-2.804a4.1 4.1 0 0 0 1.563-.68 4 4 0 0 0 1.14-1.253 3.99 3.99 0 0 0-.506-4.716m-6.097 8.406a3.05 3.05 0 0 1-1.945-.694l.096-.054 3.23-1.838a.53.53 0 0 0 .265-.455v-4.49l1.366.778q.02.011.025.035v3.722c-.003 1.653-1.361 2.992-3.037 2.996m-6.53-2.75a2.95 2.95 0 0 1-.36-2.01l.095.057L5.29 12.09a.53.53 0 0 0 .527 0l3.949-2.246v1.555a.05.05 0 0 1-.022.041L6.473 13.3c-1.454.826-3.311.335-4.15-1.098m-.85-6.94A3.02 3.02 0 0 1 3.07 3.949v3.785a.51.51 0 0 0 .262.451l3.93 2.237-1.366.779a.05.05 0 0 1-.048 0L2.585 9.342a2.98 2.98 0 0 1-1.113-4.094zm11.216 2.571L8.747 5.576l1.362-.776a.05.05 0 0 1 .048 0l3.265 1.86a3 3 0 0 1 1.173 1.207 2.96 2.96 0 0 1-.27 3.2 3.05 3.05 0 0 1-1.36.997V8.279a.52.52 0 0 0-.276-.445m1.36-2.015-.097-.057-3.226-1.855a.53.53 0 0 0-.53 0L6.249 6.153V4.598a.04.04 0 0 1 .019-.04L9.533 2.7a3.07 3.07 0 0 1 3.257.139c.474.325.843.778 1.066 1.303.223.526.289 1.103.191 1.664zM5.503 8.575 4.139 7.8a.05.05 0 0 1-.026-.037V4.049c0-.57.166-1.127.476-1.607s.752-.864 1.275-1.105a3.08 3.08 0 0 1 3.234.41l-.096.054-3.23 1.838a.53.53 0 0 0-.265.455zm.742-1.577 1.758-1 1.762 1v2l-1.755 1-1.762-1z" />
  </svg>
);

/** Gemini image models — Nano Banana */
const BananaIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" aria-hidden className={cn(iconClass, className)}>
    <path
      d="M17.2 4.8C14.2 3.2 10.5 4.5 8.2 7.5C5.9 10.5 5.2 14.8 6.5 18.2"
      fill="none"
      stroke="#FFB300"
      strokeWidth="4.8"
      strokeLinecap="round"
    />
    <path
      d="M15.8 6.2C13.8 5.2 11.5 6.2 10 8.2"
      fill="none"
      stroke="#FFFDE7"
      strokeWidth="1.4"
      strokeLinecap="round"
      opacity="0.85"
    />
    <circle cx="6.8" cy="18.4" r="1.9" fill="#6D4C41" />
  </svg>
);

/** Midjourney sailboat emblem */
const MidjourneyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden
    className={cn(iconClass, className)}
    fill="currentColor"
  >
    <path d="M12 3.2C8.8 8.6 6.4 12.2 4 16.8c2.9 1.3 5.9 1.9 8 1.9s5.1-.6 8-1.9C17.6 12.2 15.2 8.6 12 3.2zm0 4.8c1.5 2.4 2.8 4.6 3.8 6.8H8.2c1-2.2 2.3-4.4 3.8-6.8z" />
  </svg>
);

export const DrawingModelIcon: React.FC<{
  modelId: string;
  modelName?: string;
  provider?: string;
  className?: string;
}> = ({ modelId, modelName, provider, className }) => {
  const brand = resolveDrawingModelBrand(modelId, modelName, provider);

  switch (brand) {
    case "openai":
      return <OpenAIIcon className={className} />;
    case "gemini":
      return <BananaIcon className={className} />;
    case "midjourney":
      return <MidjourneyIcon className={className} />;
    default:
      return <Sparkles className={cn(iconClass, className)} strokeWidth={2} />;
  }
};

export function drawingModelOptionIcon(
  modelId: string,
  modelName?: string,
  provider?: string
): React.ReactNode {
  return (
    <DrawingModelIcon
      modelId={modelId}
      modelName={modelName}
      provider={provider}
    />
  );
}
