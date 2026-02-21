/**
 * sigma-interaction.ts — Phase 7a σ属性間相互作用エンジン
 *
 * 既存のsigma-reactive.tsの5ルール（循環チェーン）を補完し、
 * 12ルール完全相互作用系を構成する。
 *
 * 新規ルール（本ファイル）:
 *   σ-R02: will → field     「σ傾向性は場を選ぶ」
 *   σ-R03: will → relation  「σ傾向性は関係を形成する」
 *   σ-R04: memory → will    「記憶はσ傾向性を育てる」
 *   σ-R05: memory → flow    「記憶は流れを最適化する」
 *   σ-R06: memory → field   「記憶は場を記録する」
 *   σ-R08: relation → field 「関係は場を架橋する」
 *   σ-R10: field → layer    「場は層を決定する」
 *   σ-R12: field → flow     「場は流れの法則を与える」
 *
 * 既存ルール（sigma-reactive.ts）:
 *   σ-R01: will → flow      (reactWillToFlow)
 *   σ-R07: relation → will  (reactRelationToWill)
 *   σ-R09: flow → memory    (reactFlowToMemory)
 *   σ-R11: layer → relation (reactLayerToRelation)
 *   +      memory → layer   (reactMemoryToLayer)
 *
 * @axiom A3 (Sigma Accumulation) — 全ルールはA3から導出
 * @author Nobuki Fujimoto (D-FUMT)
 * @version 7.0.0-alpha
 */

import {
  type DeepSigmaMeta,
  type FlowPhase,
  type MemoryTrajectory,
  type LayerStructure,
} from './sigma-deep';

import { type AttributeReaction } from './sigma-reactive';

// ============================================================
// σ-R02: will → field  「σ傾向性は場を選ぶ」
// ============================================================

/**
 * σ傾向性が場の親和性を変更する。
 * - tendency='expand' → field に 'exploratory' マーカーを追加
 * - tendency='contract' → field に 'focused' マーカーを追加
 * - tendency='harmonize' → field に 'bridging' マーカーを追加
 * - tendency='rest' → field は変化しない
 */
export function reactWillToField(
  meta: DeepSigmaMeta,
  currentField: any,
): AttributeReaction | null {
  const tendency = meta.tendency;
  if (tendency === 'rest') return null;

  const before = typeof currentField === 'object' ? { ...currentField } : currentField;
  let fieldMarker: string;
  let reason: string;

  switch (tendency) {
    case 'expand':
    case 'expanding':
      fieldMarker = 'exploratory';
      reason = '拡大傾向 → 探索的な場へ移行';
      break;
    case 'contract':
    case 'contracting':
      fieldMarker = 'focused';
      reason = '縮小傾向 → 集中的な場へ移行';
      break;
    case 'harmonize':
      fieldMarker = 'bridging';
      reason = '調和傾向 → 架橋的な場へ移行';
      break;
    default:
      fieldMarker = 'active';
      reason = `σ傾向性(${tendency}) → 場の活性化`;
      break;
  }

  return {
    attribute: 'field',
    trigger: `will:${tendency}`,
    before,
    after: { base: currentField, marker: fieldMarker, tendency },
    reason,
  };
}

// ============================================================
// σ-R03: will → relation  「σ傾向性は関係を形成する」
// ============================================================

/**
 * σ傾向性が関係形成に影響する。
 * - tendency='expand' → 新規関係の形成を促進（affinity +0.3）
 * - tendency='contract' → 既存関係を強化、新規形成を抑制
 * - tendency='harmonize' → 全関係の均質化
 */
export function reactWillToRelation(
  meta: DeepSigmaMeta,
  currentRefs: string[],
): AttributeReaction | null {
  const tendency = meta.tendency;
  if (tendency === 'rest') return null;

  const before = { refs: [...currentRefs], count: currentRefs.length };
  let affinityDelta: number;
  let mode: string;
  let reason: string;

  switch (tendency) {
    case 'expand':
    case 'expanding':
      affinityDelta = 0.3;
      mode = 'open';
      reason = '拡大傾向 → 新規関係の形成を促進';
      break;
    case 'contract':
    case 'contracting':
      affinityDelta = -0.1;
      mode = 'selective';
      reason = '縮小傾向 → 関係の選択的維持';
      break;
    case 'harmonize':
      affinityDelta = 0.15;
      mode = 'balanced';
      reason = '調和傾向 → 関係の均質化';
      break;
    default:
      affinityDelta = 0.1;
      mode = 'neutral';
      reason = `σ傾向性(${tendency}) → 関係の微調整`;
      break;
  }

  return {
    attribute: 'relation',
    trigger: `will:${tendency}`,
    before,
    after: {
      refs: currentRefs,
      count: currentRefs.length,
      affinityDelta,
      formationMode: mode,
    },
    reason,
  };
}

// ============================================================
// σ-R04: memory → will  「記憶はσ傾向性を育てる」
// ============================================================

/**
 * 記憶の蓄積パターンがσ傾向性に影響する。
 * - 同パターンが3回以上 → 'mastery' 傾向
 * - 常に拡大 → 'expand' 傾向の強化
 * - 常に縮小 → 'contract' 傾向の強化
 * - 振動 → 'oscillating' 傾向
 */
export function reactMemoryToWill(
  meta: DeepSigmaMeta,
): AttributeReaction | null {
  const mem = meta.memory;
  if (mem.length < 3) return null;

  const before = { tendency: meta.tendency };
  let newTendency = meta.tendency;
  let reason: string;

  // パターン検出: 同じ値が3回以上繰り返されているか
  const valueCounts = new Map<string, number>();
  for (const v of mem) {
    const key = JSON.stringify(v);
    valueCounts.set(key, (valueCounts.get(key) || 0) + 1);
  }
  const maxRepeat = Math.max(...valueCounts.values());

  if (maxRepeat >= 3) {
    newTendency = 'mastery';
    reason = `同パターン${maxRepeat}回蓄積 → 習熟傾向の発生`;
  } else {
    // 方向性分析
    const nums = mem.filter((v: any) => typeof v === 'number') as number[];
    if (nums.length >= 3) {
      const diffs = [];
      for (let i = 1; i < nums.length; i++) {
        diffs.push(nums[i] - nums[i - 1]);
      }
      const allPositive = diffs.every(d => d > 0);
      const allNegative = diffs.every(d => d < 0);
      const alternating = diffs.length >= 2 && diffs.every((d, i) =>
        i === 0 || (d > 0) !== (diffs[i - 1] > 0)
      );

      if (allPositive) {
        newTendency = 'expand';
        reason = '記憶が一貫して増加 → 拡大傾向の強化';
      } else if (allNegative) {
        newTendency = 'contract';
        reason = '記憶が一貫して減少 → 縮小傾向の強化';
      } else if (alternating) {
        newTendency = 'oscillate';
        reason = '記憶が振動的 → 振動傾向の発生';
      } else {
        return null; // パターン不明確
      }
    } else {
      return null; // 数値データ不足
    }
  }

  if (newTendency === before.tendency) return null;

  meta.tendency = newTendency;

  return {
    attribute: 'will',
    trigger: `memory:pattern(repeat=${maxRepeat})`,
    before,
    after: { tendency: newTendency },
    reason,
  };
}

// ============================================================
// σ-R05: memory → flow  「記憶は流れを最適化する」
// ============================================================

/**
 * 過去の変換パスに基づき、流れの位相を調整する。
 * - 成功パスが多い → 'accelerating'（同じ道を加速）
 * - 失敗/停滞が多い → 'decelerating'（慎重に）
 * - 多様な経路 → 'steady'（安定的探索）
 */
export function reactMemoryToFlow(
  meta: DeepSigmaMeta,
): AttributeReaction | null {
  const ops = meta.operations;
  if (ops.length < 2) return null;

  const before = {
    phase: meta.velocityHistory.length > 1 ? 'active' : 'rest',
    operationCount: ops.length,
  };

  // 操作の多様性分析
  const uniqueOps = new Set(ops);
  const diversity = uniqueOps.size / ops.length; // 0-1

  let flowAdjustment: string;
  let velocity: number;
  let reason: string;

  if (diversity < 0.3) {
    // 同じ操作の繰り返し → 加速（習熟）
    flowAdjustment = 'accelerating';
    velocity = 0.8;
    reason = `操作の反復(多様性${(diversity * 100).toFixed(0)}%) → 流れの加速`;
  } else if (diversity > 0.8) {
    // 多様な操作 → 安定的探索
    flowAdjustment = 'steady';
    velocity = 0.5;
    reason = `操作の多様性(${(diversity * 100).toFixed(0)}%) → 安定的探索`;
  } else {
    // 中間 → 減速（適応中）
    flowAdjustment = 'decelerating';
    velocity = 0.3;
    reason = `操作パターン混在 → 流れの減速（適応中）`;
  }

  // velocityHistoryに追加
  meta.velocityHistory.push(velocity);

  return {
    attribute: 'flow',
    trigger: `memory:operations(n=${ops.length}, diversity=${diversity.toFixed(2)})`,
    before,
    after: { phase: flowAdjustment, velocity, diversity },
    reason,
  };
}

// ============================================================
// σ-R06: memory → field  「記憶は場を記録する」
// ============================================================

/**
 * 通過した場の履歴から親和性マップを生成する。
 * memoryに場の情報が蓄積され、fieldの親和性が変化する。
 */
export function reactMemoryToField(
  meta: DeepSigmaMeta,
  fieldHistory: string[],
): AttributeReaction | null {
  if (fieldHistory.length < 2) return null;

  const before = { visitedFields: [...new Set(fieldHistory)] };

  // 場の訪問頻度を計算
  const freq = new Map<string, number>();
  for (const f of fieldHistory) {
    freq.set(f, (freq.get(f) || 0) + 1);
  }

  // 親和性マップ: 頻度が高い場ほど親和性が高い
  const affinityMap: Record<string, number> = {};
  const total = fieldHistory.length;
  for (const [field, count] of freq) {
    affinityMap[field] = count / total;
  }

  // 最も親和性の高い場
  const dominant = [...freq.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    attribute: 'field',
    trigger: `memory:field_history(n=${fieldHistory.length})`,
    before,
    after: {
      affinityMap,
      dominantField: dominant[0],
      dominantAffinity: dominant[1] / total,
      uniqueFields: before.visitedFields.length,
    },
    reason: `${fieldHistory.length}回の場の通過記録 → 親和性マップ生成 (最大: ${dominant[0]})`,
  };
}

// ============================================================
// σ-R08: relation → field  「関係は場を架橋する」
// ============================================================

/**
 * 異なる場の値同士にrelationがあると、場間に弱い接続が生まれる。
 */
export function reactRelationToField(
  meta: DeepSigmaMeta,
  ownField: string,
  relatedFields: string[],
): AttributeReaction | null {
  // 自分と異なる場を持つ関連値を特定
  const foreignFields = relatedFields.filter(f => f !== ownField);
  if (foreignFields.length === 0) return null;

  const before = { field: ownField, connections: 0 };

  // 場間接続の生成
  const bridges = foreignFields.map(f => ({
    from: ownField,
    to: f,
    strength: 0.1 + (0.05 * foreignFields.filter(ff => ff === f).length),
  }));

  // 重複を除去
  const uniqueBridges = new Map<string, typeof bridges[0]>();
  for (const b of bridges) {
    const key = `${b.from}-${b.to}`;
    const existing = uniqueBridges.get(key);
    if (!existing || b.strength > existing.strength) {
      uniqueBridges.set(key, b);
    }
  }

  return {
    attribute: 'field',
    trigger: `relation:cross_field(n=${foreignFields.length})`,
    before,
    after: {
      field: ownField,
      bridges: [...uniqueBridges.values()],
      bridgeCount: uniqueBridges.size,
    },
    reason: `${foreignFields.length}件の異場関係 → ${uniqueBridges.size}本の場間ブリッジ生成`,
  };
}

// ============================================================
// σ-R10: field → layer  「場は層を決定する」
// ============================================================

/**
 * 場の抽象度に応じてlayerが自動調整される。
 */
export function reactFieldToLayer(
  currentField: any,
  currentLayerDepth: number,
): AttributeReaction | null {
  const fieldStr = typeof currentField === 'string'
    ? currentField
    : (currentField?.base || currentField?.marker || 'unknown');

  const before = { depth: currentLayerDepth, field: fieldStr };

  // 場の抽象度マッピング
  const abstractionLevels: Record<string, number> = {
    // 具体的（低層）
    'physics': 1, 'natural-science': 1,
    'info-engineering': 2, 'engineering': 2,
    'economics': 2, 'market': 2,
    // 中間
    'linguistics': 3, 'music': 3,
    'humanities': 3, 'art': 3,
    // 抽象的（高層）
    'focused': 4, 'exploratory': 4,
    'bridging': 5,
    'meta': 5, 'philosophy': 5,
  };

  const targetDepth = abstractionLevels[fieldStr] || currentLayerDepth;

  if (targetDepth === currentLayerDepth) return null;

  const structure: LayerStructure = targetDepth > 3 ? 'nested' : 'flat';

  return {
    attribute: 'layer',
    trigger: `field:${fieldStr}`,
    before,
    after: {
      depth: targetDepth,
      structure,
      adjustedBy: 'field-abstraction',
    },
    reason: `場(${fieldStr})の抽象度 → 層の深度を${currentLayerDepth}→${targetDepth}に調整`,
  };
}

// ============================================================
// σ-R12: field → flow  「場は流れの法則を与える」
// ============================================================

/**
 * 各ドメイン固有のflow規則を適用する。
 * - 物理場 → 慣性則（急激な変化を抑制）
 * - 音楽場 → リズム則（周期的変動を促進）
 * - 経済場 → 均衡則（中心回帰傾向）
 */
export function reactFieldToFlow(
  currentField: any,
  meta: DeepSigmaMeta,
): AttributeReaction | null {
  const fieldStr = typeof currentField === 'string'
    ? currentField
    : (currentField?.base || currentField?.marker || 'unknown');

  const before = {
    velocityCount: meta.velocityHistory.length,
    field: fieldStr,
  };

  let flowRule: string;
  let dampingFactor: number;
  let oscillationBias: number;
  let reason: string;

  switch (fieldStr) {
    case 'physics':
    case 'natural-science':
      flowRule = 'inertial';
      dampingFactor = 0.9; // 高い慣性（変化しにくい）
      oscillationBias = 0.0;
      reason = '物理場 → 慣性則を適用（急激な変化を抑制）';
      break;
    case 'music':
      flowRule = 'rhythmic';
      dampingFactor = 0.5;
      oscillationBias = 0.8; // 周期的変動を促進
      reason = '音楽場 → リズム則を適用（周期的変動を促進）';
      break;
    case 'economics':
    case 'market':
      flowRule = 'equilibrium';
      dampingFactor = 0.7;
      oscillationBias = 0.3; // 中心回帰傾向
      reason = '経済場 → 均衡則を適用（中心回帰傾向）';
      break;
    case 'art':
      flowRule = 'creative';
      dampingFactor = 0.3; // 低い慣性（変化しやすい）
      oscillationBias = 0.5;
      reason = '芸術場 → 創造則を適用（自由な変動）';
      break;
    case 'linguistics':
      flowRule = 'syntactic';
      dampingFactor = 0.6;
      oscillationBias = 0.2;
      reason = '言語学場 → 構文則を適用（規則的変動）';
      break;
    default:
      flowRule = 'neutral';
      dampingFactor = 0.5;
      oscillationBias = 0.0;
      reason = `場(${fieldStr}) → 中立的flow則を適用`;
      break;
  }

  return {
    attribute: 'flow',
    trigger: `field:${fieldStr}`,
    before,
    after: {
      rule: flowRule,
      dampingFactor,
      oscillationBias,
      appliedField: fieldStr,
    },
    reason,
  };
}

// ============================================================
// 完全相互作用マトリクス（12ルール統合API）
// ============================================================

export type InteractionRuleId =
  | 'σ-R02' | 'σ-R03' | 'σ-R04' | 'σ-R05'
  | 'σ-R06' | 'σ-R08' | 'σ-R10' | 'σ-R12';

export interface InteractionRule {
  id: InteractionRuleId;
  source: 'field' | 'flow' | 'memory' | 'layer' | 'relation' | 'will';
  target: 'field' | 'flow' | 'memory' | 'layer' | 'relation' | 'will';
  strength: 'weak' | 'medium' | 'strong';
  description: string;
}

/** Phase 7a で定義された8つの新規相互作用ルール */
export const INTERACTION_RULES: InteractionRule[] = [
  { id: 'σ-R02', source: 'will', target: 'field', strength: 'medium', description: 'σ傾向性は場を選ぶ' },
  { id: 'σ-R03', source: 'will', target: 'relation', strength: 'strong', description: 'σ傾向性は関係を形成する' },
  { id: 'σ-R04', source: 'memory', target: 'will', strength: 'strong', description: '記憶はσ傾向性を育てる' },
  { id: 'σ-R05', source: 'memory', target: 'flow', strength: 'medium', description: '記憶は流れを最適化する' },
  { id: 'σ-R06', source: 'memory', target: 'field', strength: 'weak', description: '記憶は場を記録する' },
  { id: 'σ-R08', source: 'relation', target: 'field', strength: 'medium', description: '関係は場を架橋する' },
  { id: 'σ-R10', source: 'field', target: 'layer', strength: 'medium', description: '場は層を決定する' },
  { id: 'σ-R12', source: 'field', target: 'flow', strength: 'medium', description: '場は流れの法則を与える' },
];

/**
 * 指定されたルールを適用し、反応結果を返す。
 * enableInteraction() の実装基盤。
 */
export function applyInteractionRule(
  ruleId: InteractionRuleId,
  meta: DeepSigmaMeta,
  context: {
    currentField?: any;
    currentRefs?: string[];
    currentLayerDepth?: number;
    fieldHistory?: string[];
    relatedFields?: string[];
    ownField?: string;
  } = {},
): AttributeReaction | null {
  switch (ruleId) {
    case 'σ-R02':
      return reactWillToField(meta, context.currentField ?? null);
    case 'σ-R03':
      return reactWillToRelation(meta, context.currentRefs ?? []);
    case 'σ-R04':
      return reactMemoryToWill(meta);
    case 'σ-R05':
      return reactMemoryToFlow(meta);
    case 'σ-R06':
      return reactMemoryToField(meta, context.fieldHistory ?? []);
    case 'σ-R08':
      return reactRelationToField(
        meta,
        context.ownField ?? 'default',
        context.relatedFields ?? [],
      );
    case 'σ-R10':
      return reactFieldToLayer(context.currentField ?? 'unknown', context.currentLayerDepth ?? 0);
    case 'σ-R12':
      return reactFieldToFlow(context.currentField ?? 'unknown', meta);
    default:
      return null;
  }
}

/**
 * 複数ルールを一括適用し、全反応結果を返す。
 */
export function applyInteractionRules(
  ruleIds: InteractionRuleId[],
  meta: DeepSigmaMeta,
  context: Parameters<typeof applyInteractionRule>[2] = {},
): AttributeReaction[] {
  const results: AttributeReaction[] = [];
  for (const id of ruleIds) {
    const reaction = applyInteractionRule(id, meta, context);
    if (reaction) results.push(reaction);
  }
  return results;
}
