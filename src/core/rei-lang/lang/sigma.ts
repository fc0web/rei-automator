// ============================================================
// Rei v0.6 — Sigma Metadata System (公理C1: 全値型の自己参照)
// sigma-deep.ts への薄いラッパー（後方互換維持）
// ============================================================

// ── 深化モジュールから全てを再エクスポート ──
export {
  // 深化型
  type DeepSigmaMeta,
  type DeepSigmaResult,
  type SigmaMemoryEntry,
  type MemoryTrajectory,
  type FlowPhase,
  type LayerStructure,
  type RelationRole,
  type RelationDependency,
  // 深化関数
  createDeepSigmaMeta,
  wrapWithDeepSigma,
  buildDeepSigmaResult,
} from './sigma-deep';

import {
  createDeepSigmaMeta,
  wrapWithDeepSigma,
  buildDeepSigmaResult,
  type DeepSigmaMeta,
} from './sigma-deep';

// ============================================================
// 後方互換: 既存のAPIを維持
// ============================================================

/** 後方互換の型エイリアス — DeepSigmaMeta を拡張 */
export type SigmaMetadata = DeepSigmaMeta;

/** 全値型のσラッパー — 値にσメタデータを付与 */
export interface ReiVal {
  reiType: 'ReiVal';
  value: any;
  __sigma__: SigmaMetadata;
}

/**
 * 既存互換: createSigmaMeta → createDeepSigmaMeta
 */
export function createSigmaMeta(): SigmaMetadata {
  return createDeepSigmaMeta();
}

/**
 * 既存互換: wrapWithSigma → wrapWithDeepSigma
 * operation と sourceRefs を追加パラメータとして受け取れるように拡張
 */
export function wrapWithSigma(
  value: any,
  prevValue: any,
  prevMeta?: SigmaMetadata,
  operation?: string,
  sourceRefs?: string[],
): any {
  return wrapWithDeepSigma(value, prevValue, prevMeta ?? null, operation, sourceRefs);
}

/**
 * 既存互換: buildSigmaResult → buildDeepSigmaResult
 */
export function buildSigmaResult(rawVal: any, meta: SigmaMetadata): any {
  return buildDeepSigmaResult(rawVal, meta);
}

/**
 * 傾向性を計算（C2: τ — 値の変換方向から判定）
 * 後方互換のために維持
 */
export function computeTendency(memory: any[], currentValue: any): string {
  if (memory.length < 2) return 'rest';
  const recent = memory.slice(-5).map(toNumSafe);
  const current = toNumSafe(currentValue);
  
  let expandCount = 0, contractCount = 0, alternating = 0;
  
  for (let i = 0; i < recent.length; i++) {
    const prev = i === 0 ? recent[0] : recent[i - 1];
    const cur = i === recent.length - 1 ? current : recent[i + 1];
    if (cur > prev) expandCount++;
    else if (cur < prev) contractCount++;
    if (i > 0 && ((cur > prev) !== (recent[i] > recent[i - 1]))) alternating++;
  }

  if (alternating >= recent.length - 1) return 'spiral';
  if (expandCount > contractCount) return 'expand';
  if (contractCount > expandCount) return 'contract';
  return 'rest';
}

export function toNumSafe(v: any): number {
  if (typeof v === 'number') return v;
  if (v === null || v === undefined) return 0;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'object' && v.reiType === 'ReiVal') return toNumSafe(v.value);
  if (typeof v === 'object' && v.reiType === 'Ext') return v.valStar?.() ?? 0;
  if (typeof v === 'object' && v.reiType === 'MDim') {
    const { center, neighbors, mode } = v;
    const weights = v.weights ?? neighbors.map(() => 1);
    const n = neighbors.length;
    if (n === 0) return center;
    const wSum = weights.reduce((a: number, b: number) => a + b, 0);
    const wAvg = neighbors.reduce((sum: number, vi: number, i: number) => sum + (weights[i] ?? 1) * vi, 0) / (wSum || 1);
    return center + wAvg;
  }
  return 0;
}

/** ReiValを透過的にアンラップ */
export function unwrapReiVal(v: any): any {
  if (v !== null && typeof v === 'object' && v.reiType === 'ReiVal') return v.value;
  return v;
}

/** 値からSigmaMetadataを取得 */
export function getSigmaOf(v: any): SigmaMetadata {
  if (v !== null && typeof v === 'object') {
    if (v.reiType === 'ReiVal') return v.__sigma__;
    if (v.__sigma__) return v.__sigma__;
  }
  return createSigmaMeta();
}
