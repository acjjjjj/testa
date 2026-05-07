import type { MergeAction } from "@/types";

/**
 * 综合排序分 = min(VPT 基线分 × 场景权重, 10)
 *
 * 多场景命中时调用方应先取 max(weights), 再传进来。
 */
export function computeFinalScore(base: number, sceneWeight: number, cap = 10): number {
  return Math.min(base * sceneWeight, cap);
}

/**
 * 候选合并对的处置动作:
 *   conf ≥ 0.95 → 自动合并 (auto)
 *   0.90 ≤ conf < 0.95 → 触发 LUI 反问 (ask)
 *   conf < 0.90 → 不合并 (no)
 */
export function mergeActionFor(conf: number): MergeAction {
  if (conf >= 0.95) return "auto";
  if (conf >= 0.90) return "ask";
  return "no";
}

/** LUI 反问预算上限 — 超过后剩余中置信对进入待审核清单 */
export const LUI_FOLLOWUP_BUDGET = 5;

/** 反思校验重试上限 — 超过后输出 partial 结果 */
export const REFLECTION_RETRY_LIMIT = 3;
