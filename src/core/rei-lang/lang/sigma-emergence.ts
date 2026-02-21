/**
 * sigma-emergence.ts — Phase 7d σ創発エンジン
 *
 * 複数値の集団から、個々の値の性質からは予測できない振る舞いが発現する。
 *
 * Emergence Patterns:
 *   E-1: 構造的創発 — relation自己組織化によるトポロジー出現
 *   E-2: 機能的創発 — クラスタとしての新しい変換能力の獲得
 *   E-3: 情報的創発 — 集合記憶（collective memory）の形成
 *   E-4: 意志的創発 — 集合意志（collective will）の発現
 *
 * Emergence Metrics:
 *   EM-1: 構造複雑度 (structural complexity)
 *   EM-2: 機能多様度 (functional diversity)
 *   EM-3: 情報超過量 (information excess)
 *   EM-4: 意志収束度 (will convergence)
 *
 * @axiom A3 + A4 — σ蓄積からの質的遷移
 * @author Nobuki Fujimoto (D-FUMT)
 * @version 7.3.0-alpha
 */

// ============================================================
// Types
// ============================================================

export type EmergencePattern = 'structural' | 'functional' | 'informational' | 'volitional';

export interface EmergenceConfig {
  patterns: EmergencePattern[];
  emergenceThreshold: number;          // 創発判定の閾値 (0-1)
  collectiveWillStrategy: 'majority' | 'consensus' | 'emergent';
  observationDepth: number;            // 観測の深度（1=表層, 3=深層）
}

export const DEFAULT_EMERGENCE_CONFIG: EmergenceConfig = {
  patterns: ['structural', 'functional', 'informational', 'volitional'],
  emergenceThreshold: 0.4,
  collectiveWillStrategy: 'emergent',
  observationDepth: 2,
};

export interface EcosystemValue {
  id: string;
  value: number;
  sigma: Record<string, any>;
}

export interface Ecosystem {
  values: EcosystemValue[];
  config: EmergenceConfig;
  observations: EmergenceObservation[];
}

export interface EmergenceObservation {
  timestamp: string;
  metrics: EmergenceMetrics;
  emergentProperties: EmergentProperty[];
  overallEmergence: number;  // 0-1
}

export interface EmergenceMetrics {
  structuralComplexity: number;     // EM-1
  functionalDiversity: number;      // EM-2
  informationExcess: number;        // EM-3
  willConvergence: number;          // EM-4
}

export interface EmergentProperty {
  pattern: EmergencePattern;
  description: string;
  strength: number;
  involvedValues: string[];
}

// ============================================================
// Ecosystem Creation
// ============================================================

export function createEcosystem(
  values: { id: string; value: number; sigma?: Record<string, any> }[],
  config: Partial<EmergenceConfig> = {},
): Ecosystem {
  const cfg = { ...DEFAULT_EMERGENCE_CONFIG, ...config };
  return {
    values: values.map(v => ({
      id: v.id,
      value: v.value,
      sigma: v.sigma || {
        field: { center: v.value, neighbors: [], dim: 0, domain: 'default' },
        flow: { velocity: 0, phase: 'rest' },
        memory: [],
        layer: { depth: 1, structure: 'flat' },
        relation: { refs: [], isolated: true },
        will: { tendency: 'rest', strength: 0 },
      },
    })),
    config: cfg,
    observations: [],
  };
}

// ============================================================
// EM-1: Structural Complexity (構造複雑度)
// ============================================================

/**
 * クラスタのrelationグラフの複雑度を測定。
 * 個々のrelation数の和を超える構造的パターンを検出。
 */
export function measureStructuralComplexity(values: EcosystemValue[]): {
  complexity: number;
  topology: string;
  connectionDensity: number;
  emergentStructures: string[];
} {
  const n = values.length;
  if (n < 2) return { complexity: 0, topology: 'isolated', connectionDensity: 0, emergentStructures: [] };

  // 接続マトリクスの構築
  const edges: [string, string][] = [];
  for (const v of values) {
    const refs = v.sigma.relation?.refs || [];
    for (const ref of refs) {
      if (values.some(x => x.id === ref)) {
        edges.push([v.id, ref]);
      }
    }
  }

  const connectionDensity = edges.length / (n * (n - 1) || 1);

  // トポロジー検出 (undirected degree)
  const degrees = new Map<string, Set<string>>();
  for (const v of values) degrees.set(v.id, new Set());
  for (const [from, to] of edges) {
    degrees.get(from)!.add(to);
    degrees.get(to)!.add(from);
  }
  const degreeValues = [...degrees.values()].map(s => s.size);
  const maxDeg = Math.max(...degreeValues, 0);
  const minDeg = Math.min(...degreeValues, 0);

  let topology: string;
  const emergentStructures: string[] = [];

  if (connectionDensity >= 0.8) {
    topology = 'complete';
    emergentStructures.push('fully-connected-cluster');
  } else if (maxDeg === n - 1 && minDeg <= 1) {
    topology = 'star';
    emergentStructures.push('hub-spoke-pattern');
    if (detectHierarchy(values)) emergentStructures.push('hierarchical-layers');
  } else if (degreeValues.every(d => d === 2) && edges.length >= n) {
    topology = 'ring';
    emergentStructures.push('circular-flow');
  } else if (edges.length >= n - 1) {
    topology = 'connected';
    if (detectHierarchy(values)) emergentStructures.push('hierarchical-layers');
  } else {
    topology = 'sparse';
  }

  // 複雑度: 接続密度 + トポロジー構造の非自明性
  const structureBonus = emergentStructures.length * 0.2;
  const complexity = Math.min(1, connectionDensity * 0.6 + structureBonus + (n > 5 ? 0.1 : 0));

  return { complexity, topology, connectionDensity, emergentStructures };
}

function detectHierarchy(values: EcosystemValue[]): boolean {
  const depths = values.map(v => v.sigma.layer?.depth || 1);
  const uniqueDepths = new Set(depths);
  return uniqueDepths.size >= 2;
}

// ============================================================
// EM-2: Functional Diversity (機能多様度)
// ============================================================

/**
 * クラスタが実行可能なドメイン変換の種類数を測定。
 */
export function measureFunctionalDiversity(values: EcosystemValue[]): {
  diversity: number;
  uniqueDomains: string[];
  bridgeCapabilities: string[];
  transformationPaths: number;
} {
  // 各値のドメインを抽出
  const domains = values.map(v => {
    const field = v.sigma.field;
    return typeof field === 'string' ? field : field?.domain || field?.base || 'default';
  });

  const uniqueDomains = [...new Set(domains)];

  // ブリッジ能力: 異なるドメインの値同士がrelationを持つ場合
  const bridgeCapabilities: string[] = [];
  for (let i = 0; i < values.length; i++) {
    const refs = values[i].sigma.relation?.refs || [];
    for (const ref of refs) {
      const target = values.find(v => v.id === ref);
      if (target && domains[i] !== domains[values.indexOf(target)]) {
        const bridge = `${domains[i]}→${domains[values.indexOf(target)]}`;
        if (!bridgeCapabilities.includes(bridge)) bridgeCapabilities.push(bridge);
      }
    }
  }

  // 変換パス: 到達可能なドメイン間の経路数
  const transformationPaths = bridgeCapabilities.length;

  // 多様度スコア
  const domainScore = uniqueDomains.length / 7; // 最大7ドメイン
  const bridgeScore = Math.min(1, bridgeCapabilities.length / 10);
  const diversity = domainScore * 0.5 + bridgeScore * 0.5;

  return { diversity: Math.round(diversity * 1000) / 1000, uniqueDomains, bridgeCapabilities, transformationPaths };
}

// ============================================================
// EM-3: Information Excess (情報超過量)
// ============================================================

/**
 * クラスタのmemory総体が、個々のmemoryの和を超える情報を保持しているか測定。
 */
export function measureInformationExcess(values: EcosystemValue[]): {
  excess: number;
  individualTotal: number;
  collectiveTotal: number;
  sharedPatterns: string[];
} {
  // 個々のmemory情報量
  const individualMemories = values.map(v => {
    const mem = v.sigma.memory;
    return Array.isArray(mem) ? mem.length : (mem?.entries?.length || 0);
  });
  const individualTotal = individualMemories.reduce((s, m) => s + m, 0);

  // 集合memory: 共有パターンの検出
  const allMemories: any[] = [];
  for (const v of values) {
    const mem = v.sigma.memory;
    if (Array.isArray(mem)) allMemories.push(...mem);
    else if (mem?.entries) allMemories.push(...mem.entries);
  }

  // 共有パターン検出（同じ構造のmemoryエントリ）
  const patternMap = new Map<string, number>();
  for (const m of allMemories) {
    const key = typeof m === 'object' ? (m.type || JSON.stringify(m).slice(0, 50)) : String(m);
    patternMap.set(key, (patternMap.get(key) || 0) + 1);
  }

  const sharedPatterns = [...patternMap.entries()]
    .filter(([_, count]) => count >= 2)
    .map(([pattern, count]) => `${pattern}(×${count})`);

  // 集合情報量 = 個別合計 + 共有パターンからのボーナス
  const sharedBonus = sharedPatterns.length * 2;
  const collectiveTotal = individualTotal + sharedBonus;

  // 超過量 = (集合 - 個別) / max(個別, 1)
  const excess = individualTotal > 0
    ? (collectiveTotal - individualTotal) / individualTotal
    : 0;

  return {
    excess: Math.round(excess * 1000) / 1000,
    individualTotal,
    collectiveTotal,
    sharedPatterns,
  };
}

// ============================================================
// EM-4: Will Convergence (意志収束度)
// ============================================================

/**
 * 個々のwillベクトルから集合意志の方向と強度を計算。
 */
export function measureWillConvergence(
  values: EcosystemValue[],
  strategy: 'majority' | 'consensus' | 'emergent' = 'emergent',
): {
  convergence: number;
  collectiveWill: string;
  individualWills: string[];
  agreement: number;
  emergentWill: string | null;
} {
  const wills = values.map(v => v.sigma.will?.tendency || 'rest');
  const strengths = values.map(v => v.sigma.will?.strength || 0);

  // 投票集計
  const counts = new Map<string, number>();
  const weightedCounts = new Map<string, number>();
  for (let i = 0; i < wills.length; i++) {
    counts.set(wills[i], (counts.get(wills[i]) || 0) + 1);
    weightedCounts.set(wills[i], (weightedCounts.get(wills[i]) || 0) + strengths[i]);
  }

  let collectiveWill: string;
  let emergentWill: string | null = null;

  if (strategy === 'majority') {
    collectiveWill = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'rest';
  } else if (strategy === 'consensus') {
    // 全員一致なら採用、そうでなければrest
    const unique = new Set(wills);
    collectiveWill = unique.size === 1 ? wills[0] : 'rest';
  } else {
    // emergent: 重み付き投票 + 非自明な創発
    const sorted = [...weightedCounts.entries()].sort((a, b) => b[1] - a[1]);
    collectiveWill = sorted[0]?.[0] || 'rest';

    // 創発意志: 個々にはない傾向が生まれるか
    if (sorted.length >= 2) {
      const top = sorted[0][0];
      const second = sorted[1][0];
      if (top === 'expand' && second === 'contract') {
        emergentWill = 'oscillate';
      } else if (top === 'explore' && second === 'harmonize') {
        emergentWill = 'optimize';
      }
    }
  }

  // 合意度: 多数派の割合
  const maxCount = Math.max(...counts.values(), 0);
  const agreement = values.length > 0 ? maxCount / values.length : 0;

  // 収束度: 合意度 × 平均強度
  const avgStrength = strengths.length > 0 ? strengths.reduce((s, v) => s + v, 0) / strengths.length : 0;
  const convergence = agreement * 0.6 + avgStrength * 0.4;

  return {
    convergence: Math.round(convergence * 1000) / 1000,
    collectiveWill: emergentWill || collectiveWill,
    individualWills: wills,
    agreement: Math.round(agreement * 1000) / 1000,
    emergentWill,
  };
}

// ============================================================
// Unified Observation
// ============================================================

/**
 * エコシステム全体の創発メトリクスを測定する。
 */
export function observe(ecosystem: Ecosystem): EmergenceObservation {
  const values = ecosystem.values;
  const cfg = ecosystem.config;

  const structural = measureStructuralComplexity(values);
  const functional = measureFunctionalDiversity(values);
  const informational = measureInformationExcess(values);
  const volitional = measureWillConvergence(values, cfg.collectiveWillStrategy);

  const metrics: EmergenceMetrics = {
    structuralComplexity: structural.complexity,
    functionalDiversity: functional.diversity,
    informationExcess: informational.excess,
    willConvergence: volitional.convergence,
  };

  // 創発プロパティの検出
  const emergentProperties: EmergentProperty[] = [];

  if (cfg.patterns.includes('structural') && structural.emergentStructures.length > 0) {
    emergentProperties.push({
      pattern: 'structural',
      description: `構造的創発: ${structural.emergentStructures.join(', ')}`,
      strength: structural.complexity,
      involvedValues: values.map(v => v.id),
    });
  }

  if (cfg.patterns.includes('functional') && functional.bridgeCapabilities.length > 0) {
    emergentProperties.push({
      pattern: 'functional',
      description: `機能的創発: ${functional.bridgeCapabilities.length}個のドメイン間ブリッジ`,
      strength: functional.diversity,
      involvedValues: values.map(v => v.id),
    });
  }

  if (cfg.patterns.includes('informational') && informational.sharedPatterns.length > 0) {
    emergentProperties.push({
      pattern: 'informational',
      description: `情報的創発: ${informational.sharedPatterns.length}個の共有パターン`,
      strength: Math.min(1, informational.excess),
      involvedValues: values.map(v => v.id),
    });
  }

  if (cfg.patterns.includes('volitional') && volitional.emergentWill) {
    emergentProperties.push({
      pattern: 'volitional',
      description: `意志的創発: ${volitional.emergentWill} (個々: ${[...new Set(volitional.individualWills)].join(', ')})`,
      strength: volitional.convergence,
      involvedValues: values.map(v => v.id),
    });
  }

  // 総合創発スコア
  const overallEmergence = (
    metrics.structuralComplexity * 0.25 +
    metrics.functionalDiversity * 0.25 +
    Math.min(1, metrics.informationExcess) * 0.25 +
    metrics.willConvergence * 0.25
  );

  const observation: EmergenceObservation = {
    timestamp: new Date().toISOString(),
    metrics,
    emergentProperties,
    overallEmergence: Math.round(overallEmergence * 1000) / 1000,
  };

  return observation;
}

/**
 * エコシステムを観測し、結果を記録する。
 */
export function observeAndRecord(ecosystem: Ecosystem): Ecosystem {
  const observation = observe(ecosystem);
  return {
    ...ecosystem,
    observations: [...ecosystem.observations, observation],
  };
}
