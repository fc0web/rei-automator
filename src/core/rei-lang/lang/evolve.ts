// ============================================================
// Rei v0.4 — Evolve Mode System
// Automatic computation mode selection
// Extracted from evaluator.ts for modular architecture
// ============================================================

import { toNumSafe, unwrapReiVal, type SigmaMetadata } from './sigma';
import { computeMDim, ALL_COMPUTE_MODES, computeAwareness, AWAKENING_THRESHOLD, projectToMDim } from './mdim-core';

export interface EvolveCandidate {
  mode: string;
  value: number;
}

export interface EvolveResult {
  reiType: 'EvolveResult';
  value: number;
  selectedMode: string;
  strategy: string;
  reason: string;
  candidates: EvolveCandidate[];
  awareness: number;
  tendency: string;
}

/**
 * evolve: σの来歴とτの傾向性から最適モードを自動選択
 *
 * 戦略:
 *   "auto"      ? 覚醒度と傾向性に基づく総合判定（デフォルト）
 *   "stable"    ? 過去の来歴との分散が最小のモード
 *   "divergent" ? 結果が最も広がるモード
 *   "creative"  ? 他のモードと最も異なる結果のモード
 *   "tendency"  ? τの傾向性（expand/contract/spiral）と整合するモード
 */
export function evolveMode(input: any, meta: SigmaMetadata, strategy: string = 'auto'): EvolveResult {
  const raw = unwrapReiVal(input);

  // ??でなければprojectしてから処理
  let md: any;
  if (raw?.reiType === 'MDim') {
    md = raw;
  } else if (Array.isArray(raw)) {
    md = projectToMDim(raw, 'first', []);
  } else if (typeof raw === 'number') {
    md = { reiType: 'MDim', center: raw, neighbors: [], mode: 'weighted' };
  } else {
    md = { reiType: 'MDim', center: 0, neighbors: [], mode: 'weighted' };
  }

  // 全モードで計算
  const candidates: EvolveCandidate[] = ALL_COMPUTE_MODES.map(mode => ({
    mode,
    value: computeMDim({ ...md, mode }),
  }));

  // 覚醒度
  const awareness = computeAwareness(input, meta);
  const tendency = meta.tendency;

  // 戦略に基づく選択
  let selected: EvolveCandidate;
  let reason: string;

  switch (strategy) {
    case 'stable':
      selected = selectStable(candidates, meta);
      reason = selectStableReason(selected, candidates, meta);
      break;
    case 'divergent':
      selected = selectDivergent(candidates);
      reason = `最も他のモードと異なる結果を出すモード（偏差: ${calcDeviation(selected.value, candidates).toFixed(4)}）`;
      break;
    case 'creative':
      selected = selectCreative(candidates);
      reason = `中央値から最も遠い結果（距離: ${calcMedianDistance(selected.value, candidates).toFixed(4)}）`;
      break;
    case 'tendency':
      selected = selectByTendency(candidates, tendency, md);
      reason = `τの傾向性「${tendency}」と整合するモード`;
      break;
    case 'auto':
    default:
      ({ selected, reason } = selectAuto(candidates, meta, awareness, md));
      strategy = 'auto';
      break;
  }

  return {
    reiType: 'EvolveResult',
    value: selected.value,
    selectedMode: selected.mode,
    strategy,
    reason,
    candidates,
    awareness,
    tendency,
  };
}

/** stable戦略: 過去の来歴との一貫性が最も高いモード */
export function selectStable(candidates: EvolveCandidate[], meta: SigmaMetadata): EvolveCandidate {
  if (meta.memory.length === 0) {
    // 来歴なし → 分散が最小のモード（他モードとの差が小さい）
    const mean = candidates.reduce((s, c) => s + c.value, 0) / candidates.length;
    return candidates.reduce((best, c) =>
      Math.abs(c.value - mean) < Math.abs(best.value - mean) ? c : best
    );
  }

  // 来歴あり → 来歴の数値トレンドとの整合性
  const recentValues = meta.memory.slice(-5).map(toNumSafe);
  const recentMean = recentValues.reduce((s, v) => s + v, 0) / recentValues.length;

  return candidates.reduce((best, c) =>
    Math.abs(c.value - recentMean) < Math.abs(best.value - recentMean) ? c : best
  );
}

export function selectStableReason(selected: EvolveCandidate, candidates: EvolveCandidate[], meta: SigmaMetadata): string {
  if (meta.memory.length === 0) {
    return `全モードの平均に最も近い結果（来歴なし、初回選択）`;
  }
  return `過去${meta.memory.length}回の来歴の傾向に最も整合（安定性優先）`;
}

/** divergent戦略: 他のモードと最も異なる結果のモード */
export function selectDivergent(candidates: EvolveCandidate[]): EvolveCandidate {
  return candidates.reduce((best, c) =>
    calcDeviation(c.value, candidates) > calcDeviation(best.value, candidates) ? c : best
  );
}

/** creative戦略: 中央値から最も遠い結果 */
export function selectCreative(candidates: EvolveCandidate[]): EvolveCandidate {
  return candidates.reduce((best, c) =>
    calcMedianDistance(c.value, candidates) > calcMedianDistance(best.value, candidates) ? c : best
  );
}

/** tendency戦略: τの傾向性と整合するモード */
export function selectByTendency(candidates: EvolveCandidate[], tendency: string, md: any): EvolveCandidate {
  const baseValue = computeMDim({ ...md, mode: 'weighted' });

  switch (tendency) {
    case 'expand': {
      // 拡張傾向 → 最も大きな値を出すモード
      return candidates.reduce((best, c) => c.value > best.value ? c : best);
    }
    case 'contract': {
      // 収縮傾向 → centerに最も近い値を出すモード
      return candidates.reduce((best, c) =>
        Math.abs(c.value - md.center) < Math.abs(best.value - md.center) ? c : best
      );
    }
    case 'spiral': {
      // 螺旋傾向 → baseValueと異なるが極端ではない値
      const sorted = [...candidates].sort((a, b) =>
        Math.abs(a.value - baseValue) - Math.abs(b.value - baseValue)
      );
      // 中間的な距離のモードを選択（極端でも平凡でもない）
      const midIdx = Math.floor(sorted.length / 2);
      return sorted[midIdx];
    }
    default: {
      // rest → weightedモード（デフォルト）
      return candidates.find(c => c.mode === 'weighted') ?? candidates[0];
    }
  }
}

/** auto戦略: 覚醒度と傾向性に基づく総合判定 */
export function selectAuto(
  candidates: EvolveCandidate[],
  meta: SigmaMetadata,
  awareness: number,
  md: any
): { selected: EvolveCandidate; reason: string } {
  // 覚醒度が低い（< 0.3）→ 安定モード
  if (awareness < 0.3) {
    const selected = selectStable(candidates, meta);
    return {
      selected,
      reason: `覚醒度が低い（${awareness.toFixed(2)}）ため安定モードを選択`,
    };
  }

  // 覚醒度が高い（>= 0.6）→ 傾向性に従う
  if (awareness >= AWAKENING_THRESHOLD) {
    const selected = selectByTendency(candidates, meta.tendency, md);
    return {
      selected,
      reason: `覚醒状態（${awareness.toFixed(2)}）: 傾向性「${meta.tendency}」に基づき選択`,
    };
  }

  // 中間覚醒度 → 来歴があればそれを活用、なければ情報エントロピーで
  if (meta.memory.length >= 3) {
    // 来歴パターンを分析: 値が増加傾向ならexpand系、減少ならcontract系
    const recentValues = meta.memory.slice(-3).map(toNumSafe);
    const trend = recentValues[recentValues.length - 1] - recentValues[0];

    if (trend > 0) {
      const selected = candidates.reduce((best, c) => c.value > best.value ? c : best);
      return { selected, reason: `来歴から増加傾向を検出 → 最大値モードを選択` };
    } else if (trend < 0) {
      const selected = candidates.reduce((best, c) =>
        Math.abs(c.value - md.center) < Math.abs(best.value - md.center) ? c : best
      );
      return { selected, reason: `来歴から減少傾向を検出 → 中心収束モードを選択` };
    }
  }

  // デフォルト: エントロピーモード（最も情報量の多い計算）
  const selected = candidates.find(c => c.mode === 'entropy') ?? candidates[0];
  return {
    selected,
    reason: `中間覚醒度（${awareness.toFixed(2)}）: 情報エントロピーモードで探索`,
  };
}

/** ヘルパー: 候補群内での偏差 */
export function calcDeviation(value: number, candidates: EvolveCandidate[]): number {
  const mean = candidates.reduce((s, c) => s + c.value, 0) / candidates.length;
  return Math.abs(value - mean);
}

/** ヘルパー: 中央値との距離 */
export function calcMedianDistance(value: number, candidates: EvolveCandidate[]): number {
  const sorted = [...candidates].map(c => c.value).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return Math.abs(value - median);
}

// ============================================================
// 柱②: 漢字/日本語の??表現 ? 自然言語と中心-周辺パターンの統合
//
// 漢字の構造 = ??: 「休」= ??{"休"; "人", "木"}
// 日本語文 = 述語中心??: ??{"食べた"; "猫が", "魚を"}
// 中国語声調 = モード多元性: ??{"ma"; "?(1声)", "麻(2声)", ...}
// ============================================================

/** 文字列?? ? center/neighborsが文字列の??構造 */