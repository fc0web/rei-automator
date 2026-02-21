/**
 * sigma-selfrepair.ts — Phase 7b σ自己修復エンジン
 *
 * 値のσ属性の健全性を検知・診断・修復・記録する。
 *
 * 破損3類型:
 *   Type-1: 欠損 — 必須属性の未定義/null
 *   Type-2: 不整合 — 属性間の矛盾（例: field='physics' + flow='rhythmic'）
 *   Type-3: 劣化 — memory肥大化、古い記録の消失リスク
 *
 * 修復プロセス:
 *   1. detect  — 各属性の健全性チェック → integrity score
 *   2. diagnose — 破損タイプの特定と影響範囲の計算
 *   3. repair  — 類型に応じた修復
 *   4. log     — 修復イベントをmemoryに記録
 *
 * @axiom A3 (Sigma Accumulation) — σ蓄積の自己保全
 * @author Nobuki Fujimoto (D-FUMT)
 * @version 7.1.0-alpha
 */

import { type DeepSigmaMeta, type FlowPhase, type MemoryTrajectory, type LayerStructure } from './sigma-deep';

// ============================================================
// Types
// ============================================================

export type DamageType = 'missing' | 'inconsistent' | 'degraded';

export type RepairStrategy = 'conservative' | 'aggressive' | 'adaptive';

export interface SelfRepairConfig {
  integrityThreshold: number;      // 修復発動の閾値（0.0-1.0）
  maxMemoryEntries: number;        // memory保持上限
  repairStrategy: RepairStrategy;
  enableCascadeCheck: boolean;     // 隣接値への伝播チェック
  logRepairs: boolean;             // 修復イベントの記録
}

export const DEFAULT_REPAIR_CONFIG: SelfRepairConfig = {
  integrityThreshold: 0.7,
  maxMemoryEntries: 100,
  repairStrategy: 'adaptive',
  enableCascadeCheck: true,
  logRepairs: true,
};

export interface IntegrityReport {
  score: number;                    // 0.0 (完全破損) 〜 1.0 (健全)
  healthy: boolean;                 // score >= threshold
  checks: AttributeCheck[];
  damageCount: number;
  timestamp: string;
}

export interface AttributeCheck {
  attribute: string;
  status: 'ok' | 'warning' | 'damaged';
  score: number;
  damageType?: DamageType;
  detail: string;
}

export interface DiagnosisResult {
  damages: Damage[];
  cascadeRisk: number;             // 隣接値への伝播リスク (0-1)
  repairPlan: RepairAction[];
  estimatedRecovery: number;       // 修復後の予想integrity score
}

export interface Damage {
  attribute: string;
  type: DamageType;
  severity: number;                // 0.0-1.0
  description: string;
}

export interface RepairAction {
  target: string;
  action: 'restore' | 'reconcile' | 'prune' | 'reset';
  description: string;
  priority: number;
}

export interface RepairResult {
  success: boolean;
  actionsApplied: number;
  integrityBefore: number;
  integrityAfter: number;
  repairs: AppliedRepair[];
  log: RepairLog;
}

export interface AppliedRepair {
  action: RepairAction;
  result: 'fixed' | 'partial' | 'failed';
  detail: string;
}

export interface RepairLog {
  timestamp: string;
  damageTypes: DamageType[];
  strategy: RepairStrategy;
  actionsCount: number;
  integrityDelta: number;
}

// ============================================================
// 1. Detect — 健全性チェック
// ============================================================

/**
 * σ属性の健全性スコアを計算する。
 *
 * 各属性について:
 * - 存在チェック (Type-1 欠損)
 * - 整合性チェック (Type-2 不整合)
 * - 劣化チェック (Type-3 劣化)
 */
export function detectIntegrity(
  sigma: Record<string, any>,
  config: Partial<SelfRepairConfig> = {},
): IntegrityReport {
  const cfg = { ...DEFAULT_REPAIR_CONFIG, ...config };
  const checks: AttributeCheck[] = [];

  // field チェック
  checks.push(checkField(sigma.field));

  // flow チェック
  checks.push(checkFlow(sigma.flow));

  // memory チェック
  checks.push(checkMemory(sigma.memory, cfg.maxMemoryEntries));

  // layer チェック
  checks.push(checkLayer(sigma.layer));

  // relation チェック
  checks.push(checkRelation(sigma.relation));

  // will チェック
  checks.push(checkWill(sigma.will));

  // 属性間整合性チェック
  const crossChecks = checkCrossAttributeConsistency(sigma);
  checks.push(...crossChecks);

  // 総合スコア計算
  // damaged属性がある場合はペナルティを強くする
  const damagedPenalty = checks.filter(c => c.status === 'damaged').length * 0.2;
  const rawScore = checks.reduce((sum, c) => sum + c.score, 0) / checks.length;
  const totalScore = Math.max(0, rawScore - damagedPenalty);
  const damageCount = checks.filter(c => c.status === 'damaged').length;
  const hasCriticalDamage = checks.some(c =>
    c.status === 'damaged' && ['field', 'flow', 'memory', 'layer', 'relation', 'will'].includes(c.attribute)
  );
  const hasWarnings = checks.some(c => c.status === 'warning');

  return {
    score: Math.round(totalScore * 1000) / 1000,
    healthy: totalScore >= cfg.integrityThreshold && !hasCriticalDamage && !hasWarnings,
    checks,
    damageCount,
    timestamp: new Date().toISOString(),
  };
}

function checkField(field: any): AttributeCheck {
  if (field === undefined || field === null) {
    return { attribute: 'field', status: 'damaged', score: 0, damageType: 'missing', detail: 'field属性が未定義' };
  }
  if (typeof field === 'object' && field.center === undefined && field.neighbors === undefined) {
    return { attribute: 'field', status: 'warning', score: 0.5, detail: 'field構造が不完全（center/neighbors未定義）' };
  }
  return { attribute: 'field', status: 'ok', score: 1.0, detail: 'field健全' };
}

function checkFlow(flow: any): AttributeCheck {
  if (flow === undefined || flow === null) {
    return { attribute: 'flow', status: 'damaged', score: 0, damageType: 'missing', detail: 'flow属性が未定義' };
  }
  const validPhases = ['rest', 'accelerating', 'decelerating', 'steady', 'oscillating', 'active'];
  if (typeof flow === 'object' && flow.phase && !validPhases.includes(flow.phase)) {
    return { attribute: 'flow', status: 'warning', score: 0.6, damageType: 'inconsistent', detail: `不明なflow phase: ${flow.phase}` };
  }
  return { attribute: 'flow', status: 'ok', score: 1.0, detail: 'flow健全' };
}

function checkMemory(memory: any, maxEntries: number): AttributeCheck {
  if (memory === undefined || memory === null) {
    return { attribute: 'memory', status: 'damaged', score: 0, damageType: 'missing', detail: 'memory属性が未定義' };
  }
  if (Array.isArray(memory)) {
    if (memory.length > maxEntries) {
      return {
        attribute: 'memory', status: 'warning', score: 0.4,
        damageType: 'degraded',
        detail: `memory肥大化: ${memory.length}/${maxEntries}件`,
      };
    }
    if (memory.length > maxEntries * 0.8) {
      return {
        attribute: 'memory', status: 'warning', score: 0.7,
        detail: `memory警告: ${memory.length}/${maxEntries}件 (80%超過)`,
      };
    }
    return { attribute: 'memory', status: 'ok', score: 1.0, detail: `memory健全: ${memory.length}件` };
  }
  if (typeof memory === 'object' && memory.entries) {
    const entries = memory.entries;
    if (Array.isArray(entries) && entries.length > maxEntries) {
      return {
        attribute: 'memory', status: 'warning', score: 0.4,
        damageType: 'degraded',
        detail: `memory.entries肥大化: ${entries.length}/${maxEntries}件`,
      };
    }
  }
  return { attribute: 'memory', status: 'ok', score: 1.0, detail: 'memory健全' };
}

function checkLayer(layer: any): AttributeCheck {
  if (layer === undefined || layer === null) {
    return { attribute: 'layer', status: 'damaged', score: 0, damageType: 'missing', detail: 'layer属性が未定義' };
  }
  if (typeof layer === 'object' && typeof layer.depth === 'number') {
    if (layer.depth < 0) {
      return { attribute: 'layer', status: 'damaged', score: 0.2, damageType: 'inconsistent', detail: `不正なlayer depth: ${layer.depth}` };
    }
  }
  return { attribute: 'layer', status: 'ok', score: 1.0, detail: 'layer健全' };
}

function checkRelation(relation: any): AttributeCheck {
  if (relation === undefined || relation === null) {
    return { attribute: 'relation', status: 'damaged', score: 0, damageType: 'missing', detail: 'relation属性が未定義' };
  }
  if (typeof relation === 'object' && relation.refs) {
    if (!Array.isArray(relation.refs)) {
      return { attribute: 'relation', status: 'damaged', score: 0.3, damageType: 'inconsistent', detail: 'relation.refsが配列でない' };
    }
  }
  return { attribute: 'relation', status: 'ok', score: 1.0, detail: 'relation健全' };
}

function checkWill(will: any): AttributeCheck {
  if (will === undefined || will === null) {
    return { attribute: 'will', status: 'damaged', score: 0, damageType: 'missing', detail: 'will属性が未定義' };
  }
  const validTendencies = [
    'rest', 'expand', 'expanding', 'contract', 'contracting',
    'harmonize', 'persist', 'explore', 'optimize', 'oscillate',
    'mastery', 'maximize', 'minimize', 'propagate', 'seek-harmony',
  ];
  if (typeof will === 'object' && will.tendency) {
    if (!validTendencies.includes(will.tendency)) {
      return {
        attribute: 'will', status: 'warning', score: 0.6,
        damageType: 'inconsistent',
        detail: `不明なwill tendency: ${will.tendency}`,
      };
    }
  }
  return { attribute: 'will', status: 'ok', score: 1.0, detail: 'will健全' };
}

/** 属性間の整合性チェック */
function checkCrossAttributeConsistency(sigma: Record<string, any>): AttributeCheck[] {
  const results: AttributeCheck[] = [];

  // field-flow整合性: 物理場では非リズムflowが自然
  if (sigma.field && sigma.flow) {
    const fieldStr = typeof sigma.field === 'string' ? sigma.field
      : sigma.field?.domain || sigma.field?.base || '';
    const flowPhase = sigma.flow?.phase || '';

    if (fieldStr === 'physics' && flowPhase === 'rhythmic') {
      results.push({
        attribute: 'field-flow', status: 'warning', score: 0.5,
        damageType: 'inconsistent',
        detail: '物理場でリズムflow: 不整合の可能性',
      });
    } else {
      results.push({
        attribute: 'field-flow', status: 'ok', score: 1.0,
        detail: 'field-flow整合性OK',
      });
    }
  }

  // layer-relation整合性: 深いlayerなのにisolatedは不自然
  if (sigma.layer && sigma.relation) {
    const depth = sigma.layer?.depth || 0;
    const isolated = sigma.relation?.isolated;
    if (depth >= 3 && isolated === true) {
      results.push({
        attribute: 'layer-relation', status: 'warning', score: 0.6,
        damageType: 'inconsistent',
        detail: `深層(depth=${depth})で孤立: 不整合の可能性`,
      });
    } else {
      results.push({
        attribute: 'layer-relation', status: 'ok', score: 1.0,
        detail: 'layer-relation整合性OK',
      });
    }
  }

  return results;
}

// ============================================================
// 2. Diagnose — 破損診断
// ============================================================

export function diagnose(report: IntegrityReport): DiagnosisResult {
  const damages: Damage[] = [];
  const repairPlan: RepairAction[] = [];

  for (const check of report.checks) {
    if (check.status === 'damaged' || check.status === 'warning') {
      const damage: Damage = {
        attribute: check.attribute,
        type: check.damageType || 'inconsistent',
        severity: 1 - check.score,
        description: check.detail,
      };
      damages.push(damage);

      // 修復アクションの生成
      const action = planRepairAction(damage);
      repairPlan.push(action);
    }
  }

  // 優先順位でソート（高い方が優先）
  repairPlan.sort((a, b) => b.priority - a.priority);

  // カスケードリスク: damaged属性の数に比例
  const cascadeRisk = Math.min(1, damages.length * 0.2);

  // 修復後の予想スコア
  const repairableScore = damages
    .filter(d => d.type !== 'degraded')
    .reduce((sum, d) => sum + d.severity * 0.8, 0);
  const estimatedRecovery = Math.min(1, report.score + repairableScore / Math.max(1, report.checks.length));

  return {
    damages,
    cascadeRisk,
    repairPlan,
    estimatedRecovery,
  };
}

function planRepairAction(damage: Damage): RepairAction {
  switch (damage.type) {
    case 'missing':
      return {
        target: damage.attribute,
        action: 'restore',
        description: `${damage.attribute}のデフォルト値を復元`,
        priority: 3, // 最高優先（欠損は致命的）
      };
    case 'inconsistent':
      return {
        target: damage.attribute,
        action: 'reconcile',
        description: `${damage.attribute}の整合性を修復`,
        priority: 2,
      };
    case 'degraded':
      return {
        target: damage.attribute,
        action: 'prune',
        description: `${damage.attribute}の劣化を除去（古い記録の整理）`,
        priority: 1,
      };
    default:
      return {
        target: damage.attribute,
        action: 'reset',
        description: `${damage.attribute}をリセット`,
        priority: 0,
      };
  }
}

// ============================================================
// 3. Repair — 修復実行
// ============================================================

export function repair(
  sigma: Record<string, any>,
  diagnosis: DiagnosisResult,
  config: Partial<SelfRepairConfig> = {},
): RepairResult {
  const cfg = { ...DEFAULT_REPAIR_CONFIG, ...config };
  const integrityBefore = detectIntegrity(sigma, cfg).score;

  const repairs: AppliedRepair[] = [];

  for (const action of diagnosis.repairPlan) {
    const result = executeRepair(sigma, action, cfg);
    repairs.push(result);
  }

  const integrityAfter = detectIntegrity(sigma, cfg).score;

  const log: RepairLog = {
    timestamp: new Date().toISOString(),
    damageTypes: diagnosis.damages.map(d => d.type),
    strategy: cfg.repairStrategy,
    actionsCount: repairs.length,
    integrityDelta: integrityAfter - integrityBefore,
  };

  // 修復ログをmemoryに記録
  if (cfg.logRepairs && sigma.memory) {
    const logEntry = {
      type: 'self-repair',
      ...log,
    };
    if (Array.isArray(sigma.memory)) {
      sigma.memory.push(logEntry);
    } else if (sigma.memory.entries && Array.isArray(sigma.memory.entries)) {
      sigma.memory.entries.push(logEntry);
    }
  }

  return {
    success: integrityAfter > integrityBefore || integrityAfter >= cfg.integrityThreshold,
    actionsApplied: repairs.filter(r => r.result !== 'failed').length,
    integrityBefore,
    integrityAfter,
    repairs,
    log,
  };
}

function executeRepair(
  sigma: Record<string, any>,
  action: RepairAction,
  config: SelfRepairConfig,
): AppliedRepair {
  try {
    switch (action.action) {
      case 'restore':
        return restoreAttribute(sigma, action);
      case 'reconcile':
        return reconcileAttribute(sigma, action);
      case 'prune':
        return pruneAttribute(sigma, action, config);
      case 'reset':
        return resetAttribute(sigma, action);
      default:
        return { action, result: 'failed', detail: `不明な修復アクション: ${action.action}` };
    }
  } catch (e) {
    return { action, result: 'failed', detail: `修復エラー: ${(e as Error).message}` };
  }
}

/** Type-1修復: デフォルト値の復元 */
function restoreAttribute(sigma: Record<string, any>, action: RepairAction): AppliedRepair {
  const attr = action.target.split('-')[0]; // 'field-flow' → 'field'

  const defaults: Record<string, any> = {
    field: { center: 0, neighbors: [], dim: 0 },
    flow: { velocity: 0, acceleration: 0, phase: 'rest', momentum: 0 },
    memory: [],
    layer: { depth: 1, structure: 'flat', expandable: true },
    relation: { refs: [], dependencies: [], entanglements: [], isolated: true },
    will: { tendency: 'rest', strength: 0, intrinsic: 'centered' },
  };

  if (defaults[attr] && (sigma[attr] === undefined || sigma[attr] === null)) {
    sigma[attr] = JSON.parse(JSON.stringify(defaults[attr]));
    return { action, result: 'fixed', detail: `${attr}をデフォルト値で復元` };
  }

  return { action, result: 'partial', detail: `${attr}は部分的に存在 — デフォルト補完` };
}

/** Type-2修復: 整合性の修復 */
function reconcileAttribute(sigma: Record<string, any>, action: RepairAction): AppliedRepair {
  const attr = action.target;

  // field-flow整合性修復
  if (attr === 'field-flow' || attr === 'flow') {
    if (sigma.flow && typeof sigma.flow === 'object') {
      const fieldStr = typeof sigma.field === 'string' ? sigma.field
        : sigma.field?.domain || sigma.field?.base || '';

      // 場に合わせてflowを調整
      if (fieldStr === 'physics' && sigma.flow.phase === 'rhythmic') {
        sigma.flow.phase = 'steady';
        return { action, result: 'fixed', detail: '物理場のflowをsteadyに修正' };
      }
    }
  }

  // layer-relation整合性修復
  if (attr === 'layer-relation' || attr === 'relation') {
    if (sigma.relation && sigma.layer) {
      if (sigma.layer.depth >= 3 && sigma.relation.isolated === true) {
        sigma.relation.isolated = false;
        return { action, result: 'fixed', detail: '深層のrelation.isolatedをfalseに修正' };
      }
    }
  }

  // layer depth修復
  if (attr === 'layer' && sigma.layer && sigma.layer.depth < 0) {
    sigma.layer.depth = 1;
    return { action, result: 'fixed', detail: 'layer depthを1に修正' };
  }

  // relation.refs修復
  if (attr === 'relation' && sigma.relation && !Array.isArray(sigma.relation.refs)) {
    sigma.relation.refs = [];
    return { action, result: 'fixed', detail: 'relation.refsを空配列に修正' };
  }

  // will tendency修復
  if (attr === 'will' && sigma.will) {
    sigma.will.tendency = sigma.will.tendency || 'rest';
    return { action, result: 'fixed', detail: 'will tendencyをrestに修正' };
  }

  return { action, result: 'partial', detail: `${attr}の整合性を部分修復` };
}

/** Type-3修復: 劣化の除去（メモリプルーニング） */
function pruneAttribute(
  sigma: Record<string, any>,
  action: RepairAction,
  config: SelfRepairConfig,
): AppliedRepair {
  if (action.target === 'memory') {
    const maxEntries = config.maxMemoryEntries;

    if (Array.isArray(sigma.memory) && sigma.memory.length > maxEntries) {
      const strategy = config.repairStrategy;
      const before = sigma.memory.length;

      if (strategy === 'aggressive') {
        // 最新のmaxEntries件のみ保持
        sigma.memory = sigma.memory.slice(-maxEntries);
      } else if (strategy === 'conservative') {
        // 最新80%を保持
        const keep = Math.floor(maxEntries * 0.8);
        sigma.memory = sigma.memory.slice(-keep);
      } else {
        // adaptive: 重要度スコアに基づいて選択的保持
        sigma.memory = pruneAdaptive(sigma.memory, maxEntries);
      }

      return {
        action, result: 'fixed',
        detail: `memory pruned: ${before} → ${sigma.memory.length}件 (${strategy}戦略)`,
      };
    }

    // memory.entriesの場合
    if (sigma.memory?.entries && Array.isArray(sigma.memory.entries)) {
      if (sigma.memory.entries.length > maxEntries) {
        const before = sigma.memory.entries.length;
        sigma.memory.entries = sigma.memory.entries.slice(-maxEntries);
        return {
          action, result: 'fixed',
          detail: `memory.entries pruned: ${before} → ${sigma.memory.entries.length}件`,
        };
      }
    }
  }

  return { action, result: 'partial', detail: `${action.target}のpruneは限定的` };
}

/** 適応的プルーニング: self-repair ログを優先保持 */
function pruneAdaptive(memory: any[], maxEntries: number): any[] {
  // self-repairログは優先保持
  const repairLogs = memory.filter((m: any) => m?.type === 'self-repair');
  const others = memory.filter((m: any) => m?.type !== 'self-repair');

  const keepRepairs = repairLogs.slice(-Math.floor(maxEntries * 0.2));
  const keepOthers = others.slice(-Math.floor(maxEntries * 0.8));

  return [...keepOthers, ...keepRepairs];
}

/** フルリセット */
function resetAttribute(sigma: Record<string, any>, action: RepairAction): AppliedRepair {
  return restoreAttribute(sigma, { ...action, action: 'restore' });
}

// ============================================================
// 4. 統合API: selfRepair (detect → diagnose → repair)
// ============================================================

/**
 * ワンショット自己修復: 検知→診断→修復→ログの全工程を実行
 */
export function selfRepair(
  sigma: Record<string, any>,
  config: Partial<SelfRepairConfig> = {},
): RepairResult {
  const cfg = { ...DEFAULT_REPAIR_CONFIG, ...config };
  const report = detectIntegrity(sigma, cfg);

  if (report.healthy) {
    return {
      success: true,
      actionsApplied: 0,
      integrityBefore: report.score,
      integrityAfter: report.score,
      repairs: [],
      log: {
        timestamp: report.timestamp,
        damageTypes: [],
        strategy: cfg.repairStrategy,
        actionsCount: 0,
        integrityDelta: 0,
      },
    };
  }

  const diag = diagnose(report);
  return repair(sigma, diag, cfg);
}

// ============================================================
// 5. カスケード修復チェック
// ============================================================

export interface CascadeCheckResult {
  atRisk: boolean;
  riskLevel: number;                // 0.0-1.0
  affectedNeighbors: string[];
  recommendation: string;
}

/**
 * 隣接値への破損伝播リスクを評価する。
 * relation.refs にある隣接値のintegrityを仮想的に検査。
 */
export function checkCascadeRisk(
  sigma: Record<string, any>,
  neighborSigmas: Map<string, Record<string, any>>,
  config: Partial<SelfRepairConfig> = {},
): CascadeCheckResult {
  const cfg = { ...DEFAULT_REPAIR_CONFIG, ...config };
  const ownReport = detectIntegrity(sigma, cfg);

  if (ownReport.healthy) {
    return { atRisk: false, riskLevel: 0, affectedNeighbors: [], recommendation: '健全 — カスケードリスクなし' };
  }

  const affectedNeighbors: string[] = [];
  let totalRisk = 0;

  for (const [name, neighborSigma] of neighborSigmas) {
    const neighborReport = detectIntegrity(neighborSigma, cfg);
    if (!neighborReport.healthy) {
      affectedNeighbors.push(name);
      totalRisk += (1 - neighborReport.score);
    }
  }

  const riskLevel = neighborSigmas.size > 0
    ? totalRisk / neighborSigmas.size
    : 0;

  return {
    atRisk: affectedNeighbors.length > 0,
    riskLevel: Math.round(riskLevel * 1000) / 1000,
    affectedNeighbors,
    recommendation: affectedNeighbors.length > 0
      ? `${affectedNeighbors.length}件の隣接値に伝播リスク — 先にこれらを修復`
      : 'カスケードリスク低 — 自身の修復のみで十分',
  };
}
