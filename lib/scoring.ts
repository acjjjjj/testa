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

/** 反思校验重试上限 — 超过后输出 partial 结果 (PRD v0.9 § 2.3) */
export const REFLECTION_RETRY_LIMIT = 3;

/**
 * 业务场景权重表 (PRD v0.9 § 3.1.2 锁定 5 类, 不要造其他)
 *
 * 用于:
 *   - extract-params 的 mock 兜底依据 businessTag 查权重
 *   - rank / compare-summary / abnormal-narrate prompt 的 ground truth
 *   - 配置中心 modal 的展示
 */
export const SCENE_WEIGHTS: Record<string, number> = {
  业务上线前: 1.15,
  夜间窗口: 1.05,
  合规审计前: 1.10,
  红蓝对抗前: 1.20,
  未识别特殊场景: 1.00,
};

/** PRD 锁定 5 类 business tag, 顺序按权重升序 (兜底用) */
export const BUSINESS_TAGS = [
  "未识别特殊场景",
  "夜间窗口",
  "合规审计前",
  "业务上线前",
  "红蓝对抗前",
] as const;
export type BusinessTag = (typeof BUSINESS_TAGS)[number];
