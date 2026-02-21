/**
 * sigma-dynamics.ts — 6属性動的相互作用エンジン
 * 
 * sigma-reactive.ts の拡張。従来の一方向線形カスケードを
 * 「全結合ネットワーク」に拡張し、場(field)をカスケードに参加させ、
 * 星座(constellation)の時間発展を追跡する。
 * 
 * ■ 拡張ポイント:
 *   1. 場(field)のカスケード参加
 *      field → flow:  場の変化が流れを生む
 *      field → relation: 場の構造が関係を規定する
 *      layer → field:  層の変化が場の見え方を変える
 * 
 *   2. 逆方向・交差カスケード
 *      memory → will:  記憶が意志を形成する（経験→意志）
 *      flow → field:   流れが場を変形する
 *      will → relation: 意志が関係を求める
 *
 *   3. 星座ライフサイクル
 *      萌芽 → 成長 → 成熟 → 変容 → 再生
 *
 *   4. 共鳴増幅
 *      属性間の共鳴が検出されると、カスケードが増幅される
 * 
 * カスケードネットワーク（完全版）:
 *       ┌─────────────────────────────┐
 *       ↓                             │
 *   field ←→ flow ←→ memory ←→ layer
 *       ↕         ↕         ↕       ↕
 *   relation ←→ will ───────────────┘
 *       └─────────────────────────────┘
 * 
 * @author Nobuki Fujimoto (D-FUMT)
 * @version Phase 5.5b — 6属性動的相互作用
 */

import {
  type DeepSigmaMeta,
  type FlowPhase,
  type MemoryTrajectory,
  type LayerStructure,
  type SigmaMemoryEntry,
  createDeepSigmaMeta,
} from './sigma-deep';

import {
  type AttributeReaction,
  type CascadeResult,
  reactRelationToWill,
  reactWillToFlow,
  reactFlowToMemory,
  reactMemoryToLayer,
  reactLayerToRelation,
} from './sigma-reactive';

import {
  type AttributeConstellation,
  computeConstellation,
  extractFieldInfo,
  extractFlowInfo,
} from './sigma-attributes';

// ============================================================
// 型定義
// ============================================================

/** 属性名 */
export type AttrName = 'field' | 'flow' | 'memory' | 'layer' | 'relation' | 'will';

/** 動的カスケード結果（拡張版） */
export interface DynamicCascadeResult {
  reiType: 'DynamicCascadeResult';
  reactions: AttributeReaction[];
  depth: number;
  paths: [AttrName, AttrName][];    // 発火したカスケードパス
  amplified: boolean;                // 共鳴による増幅があったか
  amplificationFactor: number;       // 増幅係数
  stable: boolean;
  constellation: {
    before: AttributeConstellation;
    after: AttributeConstellation;
    patternChanged: boolean;
    transition: string;              // "萌芽→成長" など
  };
}

/** 星座の時間発展記録 */
export interface ConstellationHistory {
  reiType: 'ConstellationHistory';
  snapshots: {
    step: number;
    constellation: AttributeConstellation;
    trigger: string;
  }[];
  lifecycle: ConstellationLifecycle;
  transitions: string[];
}

/** 星座ライフサイクル段階 */
export type ConstellationLifecycle = 
  '萌芽' | '成長' | '成熟' | '変容' | '再生' | '調和';

/** 共鳴増幅結果 */
export interface ResonanceAmplification {
  reiType: 'ResonanceAmplification';
  resonantPairs: [AttrName, AttrName, number][];
  amplificationFactor: number;
  feedbackLoops: AttrName[][];
  emergentProperty: string | null;
}

// ============================================================
// 1. 新規カスケードパス: field の参加
// ============================================================

/** field → flow: 場の変化が流れを生む */
export function reactFieldToFlow(
  meta: DeepSigmaMeta,
  fieldChange: 'expand' | 'contract' | 'restructure' | 'merge',
): AttributeReaction | null {
  const beforeVelocity = meta.velocityHistory.length > 0
    ? meta.velocityHistory[meta.velocityHistory.length - 1]
    : 0;

  let velocityDelta = 0;
  let reason = '';

  switch (fieldChange) {
    case 'expand':
      velocityDelta = 0.2;
      reason = '場の拡張が流れを加速';
      break;
    case 'contract':
      velocityDelta = -0.15;
      reason = '場の収縮が流れを減速';
      break;
    case 'restructure':
      velocityDelta = 0.1;
      reason = '場の再構成が新たな流れを生成';
      break;
    case 'merge':
      velocityDelta = 0.3;
      reason = '場の融合が急流を発生';
      break;
  }

  const newVelocity = beforeVelocity + velocityDelta;
  meta.velocityHistory.push(newVelocity);

  return {
    attribute: 'flow',
    trigger: `field:${fieldChange}`,
    before: { velocity: beforeVelocity },
    after: { velocity: newVelocity },
    reason,
  };
}

/** field → relation: 場の構造が関係を規定する */
export function reactFieldToRelation(
  meta: DeepSigmaMeta,
  fieldTopology: string,
  fieldDensity: number,
): AttributeReaction | null {
  const beforeRefs = meta.refs.size;
  
  // 密度が高い場は多くの関係を生む
  if (fieldDensity > 0.5) {
    const newRelations = Math.ceil(fieldDensity * 3);
    return {
      attribute: 'relation',
      trigger: `field:topology=${fieldTopology}`,
      before: { refs: beforeRefs },
      after: { refs: beforeRefs + newRelations, topology: fieldTopology },
      reason: `場の密度(${fieldDensity.toFixed(2)})が関係を誘発`,
    };
  }
  
  return null;
}

/** layer → field: 層の変化が場の見え方を変える */
export function reactLayerToField(
  meta: DeepSigmaMeta,
  beforeDepth: number,
  afterDepth: number,
): AttributeReaction | null {
  if (beforeDepth === afterDepth) return null;

  const deepened = afterDepth > beforeDepth;
  return {
    attribute: 'field',
    trigger: `layer:depth ${beforeDepth}→${afterDepth}`,
    before: { scope: deepened ? 'wide' : 'narrow' },
    after: { scope: deepened ? 'narrow' : 'wide', depth: afterDepth },
    reason: deepened ? '層の深化が場の焦点を狭める' : '層の浅化が場の視野を広げる',
  };
}

// ============================================================
// 2. 逆方向・交差カスケード
// ============================================================

/** memory → will: 記憶が意志を形成する */
export function reactMemoryToWill(
  meta: DeepSigmaMeta,
): AttributeReaction | null {
  const memoryCount = meta.structured.length;
  if (memoryCount < 2) return null;

  // 記憶パターンから意志の方向性を推定
  const recentOps = meta.operations.slice(-5);
  const expandCount = recentOps.filter(o => 
    o.includes('add') || o.includes('extend') || o.includes('bind') || o.includes('grow')
  ).length;
  const contractCount = recentOps.filter(o => 
    o.includes('remove') || o.includes('filter') || o.includes('unbind') || o.includes('forget')
  ).length;

  const beforeTendency = meta.tendency;
  let newTendency = beforeTendency;
  let reason = '';

  if (expandCount > contractCount + 1) {
    newTendency = 'expand';
    reason = `拡張操作の記憶(${expandCount}回)が拡大の意志を形成`;
  } else if (contractCount > expandCount + 1) {
    newTendency = 'contract';
    reason = `縮小操作の記憶(${contractCount}回)が収縮の意志を形成`;
  } else if (memoryCount > 8) {
    newTendency = 'stabilize';
    reason = `豊富な記憶(${memoryCount}件)が安定化の意志を形成`;
  } else {
    return null;
  }

  if (newTendency !== beforeTendency) {
    meta.tendency = newTendency;
    return {
      attribute: 'will',
      trigger: `memory:count=${memoryCount}`,
      before: { tendency: beforeTendency },
      after: { tendency: newTendency },
      reason,
    };
  }
  return null;
}

/** flow → field: 流れが場を変形する */
export function reactFlowToField(
  meta: DeepSigmaMeta,
  velocity: number,
): AttributeReaction | null {
  if (Math.abs(velocity) < 0.1) return null;

  const deformation = velocity > 0 ? 'stretching' : 'compressing';
  return {
    attribute: 'field',
    trigger: `flow:velocity=${velocity.toFixed(2)}`,
    before: { shape: 'original' },
    after: { shape: deformation, intensity: Math.abs(velocity) },
    reason: velocity > 0 ? '流れの勢いが場を引き伸ばす' : '逆流が場を圧縮する',
  };
}

/** will → relation: 意志が関係を求める */
export function reactWillToRelation(
  meta: DeepSigmaMeta,
  tendency: string,
  strength: number,
): AttributeReaction | null {
  if (strength < 0.3) return null;

  let relationEffect = '';
  let reason = '';

  switch (tendency) {
    case 'expand':
      relationEffect = 'seeking_new';
      reason = '拡大の意志が新たな関係を求める';
      break;
    case 'contract':
      relationEffect = 'consolidating';
      reason = '収縮の意志が関係を整理する';
      break;
    case 'harmonize':
    case 'stabilize':
      relationEffect = 'deepening';
      reason = '調和の意志が既存の関係を深める';
      break;
    default:
      return null;
  }

  return {
    attribute: 'relation',
    trigger: `will:${tendency}(${strength.toFixed(2)})`,
    before: { state: 'current' },
    after: { state: relationEffect },
    reason,
  };
}

// ============================================================
// 3. 共鳴増幅
// ============================================================

/** 共鳴の検出と増幅 */
export function detectResonanceAmplification(
  constellation: AttributeConstellation,
): ResonanceAmplification {
  const resonantPairs = constellation.resonances as [AttrName, AttrName, number][];
  
  // 増幅係数: 共鳴ペアが多いほど全体が増幅される
  const baseAmplification = 1.0;
  const pairBonus = resonantPairs.length * 0.15;
  const harmonyBonus = constellation.harmony * 0.3;
  const amplificationFactor = baseAmplification + pairBonus + harmonyBonus;

  // フィードバックループの検出（3属性以上が互いに共鳴するリング）
  const feedbackLoops: AttrName[][] = [];
  for (const [a1, a2] of resonantPairs) {
    for (const [b1, b2] of resonantPairs) {
      if (a2 === b1 && a1 !== b2) {
        // a1 → a2(=b1) → b2 のチェーン
        const closing = resonantPairs.find(([c1, c2]) => c1 === b2 && c2 === a1);
        if (closing) {
          const loop = [a1, a2, b2] as AttrName[];
          // 重複チェック
          const key = [...loop].sort().join(',');
          if (!feedbackLoops.some(l => [...l].sort().join(',') === key)) {
            feedbackLoops.push(loop);
          }
        }
      }
    }
  }

  // 創発的性質の検出
  let emergentProperty: string | null = null;
  if (feedbackLoops.length >= 2) {
    emergentProperty = '自己組織化';
  } else if (resonantPairs.length >= 4) {
    emergentProperty = '場の共振';
  } else if (constellation.balance > 0.8 && constellation.harmony > 0.5) {
    emergentProperty = '動的平衡';
  }

  return {
    reiType: 'ResonanceAmplification',
    resonantPairs,
    amplificationFactor,
    feedbackLoops,
    emergentProperty,
  };
}

// ============================================================
// 4. 動的カスケード（全結合版）
// ============================================================

/** 任意の属性変化から全結合カスケードを実行 */
export function dynamicCascade(
  value: any,
  meta: DeepSigmaMeta,
  trigger: AttrName,
  event: string,
  maxDepth: number = 8,
): DynamicCascadeResult {
  const beforeConstellation = computeConstellation(value, meta);
  const reactions: AttributeReaction[] = [];
  const paths: [AttrName, AttrName][] = [];
  const visited = new Set<string>();
  
  // カスケードキュー: [source属性, イベント名, 強度]
  const queue: [AttrName, string, number][] = [[trigger, event, 1.0]];
  let depth = 0;
  
  while (queue.length > 0 && depth < maxDepth) {
    const [src, evt, intensity] = queue.shift()!;
    const key = `${src}:${evt}`;
    if (visited.has(key)) continue;
    visited.add(key);
    
    // ソース属性に応じた反応を実行
    const newReactions = executeReaction(meta, src, evt, intensity, value);
    
    for (const reaction of newReactions) {
      reactions.push(reaction);
      paths.push([src, reaction.attribute]);
      depth++;
      
      // 連鎖: 反応が起きた属性を次のトリガーにする
      const nextEvent = deriveNextEvent(reaction);
      if (nextEvent && intensity * 0.7 > 0.1) {
        queue.push([reaction.attribute, nextEvent, intensity * 0.7]);
      }
    }
  }
  
  // 共鳴増幅チェック
  const afterConstellation = computeConstellation(value, meta);
  const resonance = detectResonanceAmplification(afterConstellation);
  const amplified = resonance.amplificationFactor > 1.2;
  
  // 星座パターンの変化
  const patternChanged = beforeConstellation.pattern !== afterConstellation.pattern;
  const transition = patternChanged 
    ? `${beforeConstellation.pattern}→${afterConstellation.pattern}`
    : beforeConstellation.pattern;
  
  return {
    reiType: 'DynamicCascadeResult',
    reactions,
    depth,
    paths,
    amplified,
    amplificationFactor: resonance.amplificationFactor,
    stable: depth < maxDepth && queue.length === 0,
    constellation: {
      before: beforeConstellation,
      after: afterConstellation,
      patternChanged,
      transition,
    },
  };
}

function executeReaction(
  meta: DeepSigmaMeta,
  source: AttrName,
  event: string,
  intensity: number,
  value: any,
): AttributeReaction[] {
  const results: AttributeReaction[] = [];

  switch (source) {
    case 'field': {
      const fieldChange = event as 'expand' | 'contract' | 'restructure' | 'merge';
      const r1 = reactFieldToFlow(meta, fieldChange);
      if (r1) results.push(r1);
      const fInfo = extractFieldInfo(value, meta);
      const r2 = reactFieldToRelation(meta, fInfo.topology, fInfo.density);
      if (r2) results.push(r2);
      break;
    }
    case 'flow': {
      const velocity = meta.velocityHistory.length > 0
        ? meta.velocityHistory[meta.velocityHistory.length - 1]
        : 0;
      const r1 = reactFlowToField(meta, velocity);
      if (r1) results.push(r1);
      const phaseTransition = {
        from: 'steady' as FlowPhase,
        to: (velocity > 0.5 ? 'accelerating' : 'decelerating') as FlowPhase,
        velocity,
      };
      const r2 = reactFlowToMemory(meta, phaseTransition, `flow:${event}`);
      if (r2) results.push(r2);
      break;
    }
    case 'memory': {
      const r1 = reactMemoryToLayer(meta);
      if (r1) results.push(r1);
      const r2 = reactMemoryToWill(meta);
      if (r2) results.push(r2);
      break;
    }
    case 'layer': {
      const beforeDepth = meta.nestDepth;
      const afterDepth = beforeDepth + (event === 'deepen' ? 1 : event === 'flatten' ? -1 : 0);
      meta.nestDepth = Math.max(0, afterDepth);
      const r1 = reactLayerToRelation(meta, beforeDepth, meta.nestDepth);
      if (r1) results.push(r1);
      const r2 = reactLayerToField(meta, beforeDepth, meta.nestDepth);
      if (r2) results.push(r2);
      break;
    }
    case 'relation': {
      const relEvent = event as 'bind' | 'entangle' | 'unbind';
      const r1 = reactRelationToWill(meta, relEvent);
      if (r1) results.push(r1);
      break;
    }
    case 'will': {
      const r1 = reactWillToFlow(meta, event as any, intensity);
      if (r1) results.push(r1);
      const r2 = reactWillToRelation(meta, meta.tendency, intensity);
      if (r2) results.push(r2);
      break;
    }
  }

  return results;
}

function deriveNextEvent(reaction: AttributeReaction): string | null {
  switch (reaction.attribute) {
    case 'field': return 'restructure';
    case 'flow': return 'shift';
    case 'memory': return 'accumulate';
    case 'layer': return 'adjust';
    case 'relation': return 'bind';
    case 'will': return 'evolve';
    default: return null;
  }
}

// ============================================================
// 5. 星座ライフサイクル
// ============================================================

/** 星座の現在のライフサイクル段階を判定 */
export function classifyLifecycle(
  constellation: AttributeConstellation,
  history?: AttributeConstellation[],
): ConstellationLifecycle {
  const avg = Object.values(constellation.attributes).reduce((a, b) => a + b, 0) / 6;
  const balance = constellation.balance;
  const resonanceCount = constellation.resonances.length;
  
  // 履歴がある場合はトレンドも考慮
  if (history && history.length >= 2) {
    const prevAvg = Object.values(history[history.length - 1].attributes).reduce((a, b) => a + b, 0) / 6;
    const trend = avg - prevAvg;
    
    if (trend > 0.1 && avg < 0.5) return '成長';
    if (trend < -0.05 && avg > 0.3) return '変容';
    if (Math.abs(trend) < 0.02 && balance > 0.7) return '調和';
  }
  
  if (avg < 0.2) return '萌芽';
  if (avg < 0.4 && balance < 0.5) return '成長';
  if (avg >= 0.5 && balance >= 0.6) return '成熟';
  if (balance > 0.8 && resonanceCount >= 3) return '調和';
  if (avg > 0.3 && balance < 0.4) return '変容';
  return '再生';
}

/** 星座の時間発展を追跡 */
export function evolveConstellation(
  value: any,
  meta: DeepSigmaMeta,
  steps: number,
  perturbations?: { step: number; attr: AttrName; event: string }[],
): ConstellationHistory {
  const snapshots: ConstellationHistory['snapshots'] = [];
  const transitions: string[] = [];
  let currentMeta = { ...meta, refs: new Set(meta.refs), velocityHistory: [...meta.velocityHistory], structured: [...meta.structured], operations: [...meta.operations] };
  
  // 初期スナップショット
  const initial = computeConstellation(value, currentMeta);
  snapshots.push({ step: 0, constellation: initial, trigger: 'initial' });
  
  let prevPattern = initial.pattern;
  
  for (let step = 1; step <= steps; step++) {
    // 外部摂動があれば適用
    const perturbation = perturbations?.find(p => p.step === step);
    if (perturbation) {
      const cascade = dynamicCascade(value, currentMeta, perturbation.attr, perturbation.event, 5);
      const current = cascade.constellation.after;
      snapshots.push({ step, constellation: current, trigger: `${perturbation.attr}:${perturbation.event}` });
      
      if (current.pattern !== prevPattern) {
        transitions.push(`step${step}: ${prevPattern}→${current.pattern}`);
        prevPattern = current.pattern;
      }
    } else {
      // 自発的な微小変動（パルス）
      // 意志がrest以外なら小さな変化を生む
      if (currentMeta.tendency !== 'rest') {
        currentMeta.pipeCount++;
        const v = currentMeta.velocityHistory.length > 0 ? currentMeta.velocityHistory[currentMeta.velocityHistory.length - 1] : 0;
        currentMeta.velocityHistory.push(v * 0.95); // 減衰
      }
      
      const current = computeConstellation(value, currentMeta);
      if (step % Math.max(1, Math.floor(steps / 10)) === 0 || step === steps) {
        snapshots.push({ step, constellation: current, trigger: 'autonomous' });
      }
      
      if (current.pattern !== prevPattern) {
        transitions.push(`step${step}: ${prevPattern}→${current.pattern}`);
        prevPattern = current.pattern;
      }
    }
  }
  
  const finalConstellation = snapshots[snapshots.length - 1].constellation;
  const constellationHistory = snapshots.map(s => s.constellation);
  
  return {
    reiType: 'ConstellationHistory',
    snapshots,
    lifecycle: classifyLifecycle(finalConstellation, constellationHistory),
    transitions,
  };
}

// ============================================================
// 6. σ（シグマ）
// ============================================================

/** 動的カスケード結果のσ */
export function getDynamicCascadeSigma(result: DynamicCascadeResult): any {
  return {
    reiType: 'SigmaResult',
    domain: 'meta',
    subtype: 'dynamic_cascade',
    field: {
      center: result.constellation.after.dominantAttribute,
      patternChanged: result.constellation.patternChanged,
      transition: result.constellation.transition,
    },
    flow: {
      direction: result.stable ? 'stable' : 'cascading',
      momentum: result.depth,
      velocity: result.amplificationFactor,
      phase: result.stable ? 'steady' : 'accelerating',
    },
    memory: result.reactions.map(r => ({
      attribute: r.attribute,
      trigger: r.trigger,
      reason: r.reason,
    })),
    layer: {
      depth: result.depth,
      paths: result.paths.length,
    },
    relation: result.paths.map(([from, to]) => ({
      from, to, type: 'cascade',
    })),
    will: {
      tendency: result.constellation.after.pattern,
      strength: result.constellation.after.harmony,
      amplified: result.amplified,
    },
    cascade: {
      depth: result.depth,
      pathCount: result.paths.length,
      amplified: result.amplified,
      amplificationFactor: result.amplificationFactor,
      stable: result.stable,
    },
    constellationTransition: result.constellation.transition,
  };
}

/** 星座履歴のσ */
export function getConstellationHistorySigma(history: ConstellationHistory): any {
  const first = history.snapshots[0]?.constellation;
  const last = history.snapshots[history.snapshots.length - 1]?.constellation;
  
  return {
    reiType: 'SigmaResult',
    domain: 'meta',
    subtype: 'constellation_history',
    field: {
      center: last?.dominantAttribute ?? 'none',
      snapshots: history.snapshots.length,
    },
    flow: {
      direction: history.transitions.length > 0 ? 'evolving' : 'stable',
      momentum: history.transitions.length,
      velocity: 0,
      phase: history.lifecycle,
    },
    memory: history.snapshots.map(s => ({
      step: s.step,
      pattern: s.constellation.pattern,
      trigger: s.trigger,
    })),
    layer: {
      depth: history.snapshots.length,
      lifecycle: history.lifecycle,
    },
    relation: history.transitions.map(t => ({
      type: 'transition',
      description: t,
    })),
    will: {
      tendency: last?.pattern ?? '萌芽（芽）',
      strength: last?.harmony ?? 0,
    },
    lifecycle: history.lifecycle,
    transitions: history.transitions,
    patternStart: first?.pattern ?? 'unknown',
    patternEnd: last?.pattern ?? 'unknown',
  };
}
