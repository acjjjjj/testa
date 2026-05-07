import type { RankedVuln, PatchHit } from "@/types";

/**
 * 把对象数组导出成 CSV 并触发浏览器下载。
 *
 * 仅前端 mock — 真实接入时应改为后端流式生成。
 */
export function downloadCsv(filename: string, rows: Record<string, unknown>[], headers?: string[]): void {
  if (typeof window === "undefined") return;
  if (rows.length === 0) return;

  const cols = headers ?? Object.keys(rows[0]);
  const escape = (v: unknown): string => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const lines = [
    cols.join(","),
    ...rows.map((r) => cols.map((c) => escape((r as Record<string, unknown>)[c])).join(",")),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Agent 1 排序结果 CSV 导出
// PRD v0.9 sec 3.2.2 step 7 锁前 5 列基线: cve / vpt 三维基线分 / 综合排序分 / 数据来源 / 补丁状态
// 后续扩展列 (rank/name/asset/scene_*/desc) 放在 5 列基线之后, 不破坏 PRD 锁定的顺序
// 补丁状态: A1 单跑默认填 "未查询" (PRD 明文); 仅当 session 经过 A2 补丁库匹配后才填真实状态
export function exportRankingCsv(rows: RankedVuln[]): void {
  const flat = rows.map((r) => ({
    cve: r.cve,
    vpt_a: r.vptA,
    vpt_v: r.vptV,
    vpt_i: r.vptI,
    final_score: r.score,
    source: "内部漏洞库",
    patch_status: "未查询",
    rank: r.rk,
    name: r.name,
    asset: r.asset,
    base_score: r.base,
    scene_tag: r.sceneTag,
    scene_weight: r.sceneWeight,
    desc: r.desc,
  }));
  downloadCsv("agent1-ranking.csv", flat);
}

export function exportPatchHitsCsv(rows: PatchHit[]): void {
  const flat = rows.map((r) => ({
    cve: r.cve,
    name: r.name,
    asset: r.asset,
    hit_dim: r.dim,
    hit_conf: r.conf,
    patch_status: r.patch,
    sources: r.src.join("|"),
  }));
  downloadCsv("agent2-compare.csv", flat);
}
