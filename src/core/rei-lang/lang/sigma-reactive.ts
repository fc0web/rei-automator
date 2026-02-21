/**
 * sigma-reactive.ts — 6属性相互反応エンジン
 * 
 * 6属性が互いに影響し合う「生きた系」を実現する。
 * 
 * カスケード連鎖:
 *   relation → will:   関係の変化が意志を揺らす
 *   will → flow:       意志の変化がflowの位相を変える
 *   flow → memory:     位相遷移が記憶に自動記録される
 *   memory → layer:    記憶の蓄積が層の深度を変える
 *   layer → relation:  層の深化が関係の影響範囲を広げる
 * 
 * @author Nobuki Fujimoto (D-FUMT)
 * @version 0.5.3
 */

import {
  type DeepSigmaMeta,
  type FlowPhase,
  type MemoryTrajectory,
  type LayerStructure,
  type SigmaMemoryEntry,
  buildDeepSigmaResult,
} from './sigma-deep';

// ============================================================
// 反応結果の型定義
// ============================================================

/** 単一の属性変化 */
export interface AttributeReaction {
  attribute: 'field' | 'flow' | 'memory' | 'layer' | 'relation' | 'will';
  trigger: string;        // 何がトリガーになったか
  before: any;            // 変更前の状態
  after: any;             // 変更後の状態
  reason: string;         // 変化の理由（日本語）
}

/** カスケード全体の結果 */
export interface CascadeResult {
  reiType: 'CascadeResult';
  reactions: AttributeReaction[];
  depth: number;          // カスケードの深さ（何段連鎖したか）
  stable: boolean;        // 安定状態に到達したか
  pulse: number;          // 脈動回数
}

// ============================================================
// 1. relation → will: 関係が意志を揺らす
// ============================================================

/**
 * 関係の変化が意志に与える影響
 * - 新しいbindが生まれると、意志のstrengthが微増する（つながりが意志を強める）
 * - entangleが生まれると、tendencyが相手の方向に引き寄せられる
 * - 孤立(isolated)なら意志は弱まる
 */
export function reactRelationToWill(
  meta: DeepSigmaMeta,
  event: 'bind' | 'entangle' | 'unbind',
  partnerTendency?: string,
): AttributeReaction | null {
  const beforeStrength = parseFloat(String(meta.tendency === 'rest' ? 0 : 0.5));
  const willBefore = { tendency: meta.tendency, strength: beforeStrength };

  let newTendency = meta.tendency;
  let newStrength = beforeStrength;
  let reason = '';

  switch (event) {
    case 'bind':
      // 結合は意志を強化する
      newStrength = Math.min(1, beforeStrength + 0.15);
      reason = '新たな関係が意志を強化';
      break;
    case 'entangle':
      // 相互依存は相手の傾向に引き寄せる
      newStrength = Math.min(1, beforeStrength + 0.25);
      if (partnerTendency && partnerTendency !== meta.tendency) {
        newTendency = 'harmonize';
        reason = `相互依存による共鳴 → 調和への移行 (相手: ${partnerTendency})`;
      } else {
        reason = '相互依存による意志の共鳴強化';
      }
      break;
    case 'unbind':
      // 結合の解除は意志を弱める
      newStrength = Math.max(0, beforeStrength - 0.1);
      if (newStrength < 0.1) {
        newTendency = 'rest';
        reason = '関係消失 → 意志の静止';
      } else {
        reason = '関係の減少が意志を弱化';
      }
      break;
  }

  if (newTendency === willBefore.tendency && newStrength === willBefore.strength) {
    return null; // 変化なし
  }

  meta.tendency = newTendency;

  return {
    attribute: 'will',
    trigger: `relation:${event}`,
    before: willBefore,
    after: { tendency: newTendency, strength: newStrength },
    reason,
  };
}

// ============================================================
// 2. will → flow: 意志がflowの位相を変える
// ============================================================

/**
 * 意志の変化がflowに与える影響
 * - conflict(高tension) → flow.phase = 'reversing'
 * - align(高harmony) → flow.phase = 'steady'
 * - evolve(strength増) → flow.phase = 'accelerating'
 * - 意志の弱化 → flow.phase = 'decelerating'
 */
export function reactWillToFlow(
  meta: DeepSigmaMeta,
  event: 'evolve' | 'align' | 'conflict' | 'weaken',
  intensity: number = 0.5,
): AttributeReaction | null {
  const prevVelocity = meta.velocityHistory.length > 0
    ? meta.velocityHistory[meta.velocityHistory.length - 1]
    : 0;
  const beforePhase = getFlowPhase(meta);

  let newPhase: FlowPhase;
  let velocityDelta: number;
  let reason: string;

  switch (event) {
    case 'evolve':
      newPhase = 'accelerating';
      velocityDelta = intensity * 0.3;
      reason = '意志の進化 → 流れの加速';
      break;
    case 'align':
      newPhase = 'steady';
      velocityDelta = intensity * 0.1;
      reason = '意志の調律 → 流れの安定化';
      break;
    case 'conflict':
      newPhase = intensity > 0.7 ? 'reversing' : 'decelerating';
      velocityDelta = -intensity * 0.3;
      reason = intensity > 0.7
        ? '意志の激しい衝突 → 流れの逆転'
        : '意志の衝突 → 流れの減速';
      break;
    case 'weaken':
      newPhase = 'decelerating';
      velocityDelta = -intensity * 0.2;
      reason = '意志の弱化 → 流れの減速';
      break;
  }

  if (newPhase === beforePhase && velocityDelta === 0) {
    return null;
  }

  // velocityHistoryに記録
  const newVelocity = prevVelocity + velocityDelta;
  meta.velocityHistory.push(newVelocity);

  return {
    attribute: 'flow',
    trigger: `will:${event}`,
    before: { phase: beforePhase, velocity: prevVelocity },
    after: { phase: newPhase, velocity: newVelocity },
    reason,
  };
}

// ============================================================
// 3. flow → memory: 位相遷移が記憶に自動記録される
// ============================================================

/**
 * flowの位相変化を記憶に自動記録
 * - 位相遷移はSigmaMemoryEntryとして構造化記録される
 * - 記憶は「忘却不能」— 一度記録されたら消えない
 */
export function reactFlowToMemory(
  meta: DeepSigmaMeta,
  phaseTransition: { from: FlowPhase; to: FlowPhase; velocity: number },
  cause: string,
): AttributeReaction {
  const entryCount = meta.structured.length;

  const entry: SigmaMemoryEntry = {
    value: { phase: phaseTransition.to, velocity: phaseTransition.velocity },
    timestamp: Date.now() - meta.chainStart,
    cause: 'pipe',
    operation: `phase_transition:${phaseTransition.from}→${phaseTransition.to}`,
    sourceRefs: [cause],
  };

  meta.structured.push(entry);
  meta.memory.push(entry.value);
  meta.operations.push(`phase:${phaseTransition.from}→${phaseTransition.to}`);

  return {
    attribute: 'memory',
    trigger: `flow:phase_transition`,
    before: { entries: entryCount },
    after: { entries: meta.structured.length },
    reason: `位相遷移を記録: ${phaseTransition.from} → ${phaseTransition.to}`,
  };
}

// ============================================================
// 4. memory → layer: 記憶の蓄積が層の深度を変える
// ============================================================

/**
 * 記憶の蓄積が層構造に与える影響
 * - 記憶5件以上 → depth 2, structure 'nested'
 * - 記憶10件以上 → depth 3, structure 'recursive'
 * - 記憶20件以上 → depth 4, structure 'fractal'
 */
export function reactMemoryToLayer(
  meta: DeepSigmaMeta,
): AttributeReaction | null {
  const entryCount = meta.structured.length;
  const prevDepth = meta.nestDepth;
  const prevStructure = getLayerStructure(meta);

  let newDepth = prevDepth;
  let newStructure = prevStructure;

  if (entryCount >= 20 && prevDepth < 4) {
    newDepth = 4;
    newStructure = 'fractal';
  } else if (entryCount >= 10 && prevDepth < 3) {
    newDepth = 3;
    newStructure = 'recursive';
  } else if (entryCount >= 5 && prevDepth < 2) {
    newDepth = 2;
    newStructure = 'nested';
  }

  if (newDepth === prevDepth) {
    return null;
  }

  meta.nestDepth = newDepth;

  return {
    attribute: 'layer',
    trigger: 'memory:accumulation',
    before: { depth: prevDepth, structure: prevStructure },
    after: { depth: newDepth, structure: newStructure },
    reason: `記憶${entryCount}件の蓄積 → 層の深化 (${prevStructure} → ${newStructure})`,
  };
}

// ============================================================
// 5. layer → relation: 層の深化が関係の影響範囲を広げる
// ============================================================

/**
 * 層の深化が関係に与える影響
 * - 深い層は、より遠い依存関係を「見る」ことができる
 * - depth 2以上 → 影響範囲拡大
 * - depth 3以上 → entanglementの共鳴強化
 */
export function reactLayerToRelation(
  meta: DeepSigmaMeta,
  depthBefore: number,
  depthAfter: number,
): AttributeReaction | null {
  if (depthAfter <= depthBefore) return null;

  const reachBefore = depthBefore + 1;
  const reachAfter = depthAfter + 1;

  let reason: string;
  if (depthAfter >= 3) {
    reason = `層の深化(${depthBefore}→${depthAfter}) → 相互依存的影響範囲の拡大＋共鳴強化`;
  } else {
    reason = `層の深化(${depthBefore}→${depthAfter}) → 影響範囲の拡大`;
  }

  return {
    attribute: 'relation',
    trigger: 'layer:deepening',
    before: { maxReach: reachBefore, resonanceBoost: depthBefore >= 3 },
    after: { maxReach: reachAfter, resonanceBoost: depthAfter >= 3 },
    reason,
  };
}

// ============================================================
// カスケード実行エンジン
// ============================================================

/**
 * 関係変化からのフルカスケード
 * relation → will → flow → memory → layer → relation
 */
export function cascadeFromRelation(
  meta: DeepSigmaMeta,
  event: 'bind' | 'entangle' | 'unbind',
  partnerTendency?: string,
): CascadeResult {
  const reactions: AttributeReaction[] = [];
  let depth = 0;

  // 1. relation → will
  const r1 = reactRelationToWill(meta, event, partnerTendency);
  if (r1) {
    reactions.push(r1);
    depth++;

    // 2. will → flow
    const willEvent = event === 'unbind' ? 'weaken' : 'evolve';
    const intensity = event === 'entangle' ? 0.8 : 0.5;
    const r2 = reactWillToFlow(meta, willEvent, intensity);
    if (r2) {
      reactions.push(r2);
      depth++;

      // 3. flow → memory
      const beforePhase = r2.before.phase as FlowPhase;
      const afterPhase = r2.after.phase as FlowPhase;
      if (beforePhase !== afterPhase) {
        const r3 = reactFlowToMemory(meta, {
          from: beforePhase,
          to: afterPhase,
          velocity: r2.after.velocity,
        }, `relation:${event}`);
        reactions.push(r3);
        depth++;

        // 4. memory → layer
        const r4 = reactMemoryToLayer(meta);
        if (r4) {
          reactions.push(r4);
          depth++;

          // 5. layer → relation
          const r5 = reactLayerToRelation(
            meta,
            r4.before.depth,
            r4.after.depth,
          );
          if (r5) {
            reactions.push(r5);
            depth++;
          }
        }
      }
    }
  }

  return {
    reiType: 'CascadeResult',
    reactions,
    depth,
    stable: depth < 5, // 全5段連鎖しなかった = どこかで安定した
    pulse: 1,
  };
}

/**
 * 意志変化からのカスケード
 * will → flow → memory → layer → relation
 */
export function cascadeFromWill(
  meta: DeepSigmaMeta,
  event: 'evolve' | 'align' | 'conflict',
  intensity: number = 0.5,
): CascadeResult {
  const reactions: AttributeReaction[] = [];
  let depth = 0;

  // 1. will → flow
  const r1 = reactWillToFlow(meta, event, intensity);
  if (r1) {
    reactions.push(r1);
    depth++;

    // 2. flow → memory
    const beforePhase = r1.before.phase as FlowPhase;
    const afterPhase = r1.after.phase as FlowPhase;
    if (beforePhase !== afterPhase) {
      const r2 = reactFlowToMemory(meta, {
        from: beforePhase,
        to: afterPhase,
        velocity: r1.after.velocity,
      }, `will:${event}`);
      reactions.push(r2);
      depth++;

      // 3. memory → layer
      const r3 = reactMemoryToLayer(meta);
      if (r3) {
        reactions.push(r3);
        depth++;

        // 4. layer → relation
        const r4 = reactLayerToRelation(
          meta,
          r3.before.depth,
          r3.after.depth,
        );
        if (r4) {
          reactions.push(r4);
          depth++;
        }
      }
    }
  }

  return {
    reiType: 'CascadeResult',
    reactions,
    depth,
    stable: depth < 4,
    pulse: 1,
  };
}

/**
 * 脈動（pulse） — 明示的にフルカスケードを実行
 * 全属性の現在状態を基に、安定するまでカスケードを繰り返す
 */
export function pulse(
  meta: DeepSigmaMeta,
  maxPulses: number = 5,
): CascadeResult {
  const allReactions: AttributeReaction[] = [];
  let totalDepth = 0;
  let pulseCount = 0;

  for (let i = 0; i < maxPulses; i++) {
    pulseCount++;

    // 現在の記憶量から層反応を試みる
    const layerReaction = reactMemoryToLayer(meta);
    if (layerReaction) {
      allReactions.push(layerReaction);
      totalDepth++;

      const relReaction = reactLayerToRelation(
        meta,
        layerReaction.before.depth,
        layerReaction.after.depth,
      );
      if (relReaction) {
        allReactions.push(relReaction);
        totalDepth++;
      }
    }

    // 意志がrestでなければ、flowに影響
    if (meta.tendency !== 'rest') {
      const flowReaction = reactWillToFlow(meta, 'evolve', 0.3);
      if (flowReaction) {
        allReactions.push(flowReaction);
        totalDepth++;

        const memReaction = reactFlowToMemory(meta, {
          from: flowReaction.before.phase as FlowPhase,
          to: flowReaction.after.phase as FlowPhase,
          velocity: flowReaction.after.velocity,
        }, 'pulse');
        allReactions.push(memReaction);
        totalDepth++;
      }
    }

    // このパルスで反応がなければ安定
    if (allReactions.length === totalDepth - (pulseCount > 1 ? allReactions.length : 0)) {
      // No new reactions in this pulse → stable
      if (i > 0 && !layerReaction && (meta.tendency === 'rest')) {
        break;
      }
    }
  }

  return {
    reiType: 'CascadeResult',
    reactions: allReactions,
    depth: totalDepth,
    stable: pulseCount < maxPulses,
    pulse: pulseCount,
  };
}

// ============================================================
// ヘルパー関数
// ============================================================

function getFlowPhase(meta: DeepSigmaMeta): FlowPhase {
  const hist = meta.velocityHistory;
  if (hist.length < 2) return 'rest';
  const last = hist[hist.length - 1];
  const prev = hist[hist.length - 2];
  const delta = last - prev;
  if (Math.abs(delta) < 0.01) return 'steady';
  if (delta > 0 && last > 0) return 'accelerating';
  if (delta < 0 && last > 0) return 'decelerating';
  if (last < 0) return 'reversing';
  return 'rest';
}

function getLayerStructure(meta: DeepSigmaMeta): LayerStructure {
  if (meta.nestDepth >= 4) return 'fractal';
  if (meta.nestDepth >= 3) return 'recursive';
  if (meta.nestDepth >= 2) return 'nested';
  return 'flat';
}
