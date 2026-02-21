// ============================================================
// life-metrics.ts — Phase 8e: 生命度メトリクス
//
// 各MLC条件を 0.0–1.0 のスコアで定量評価し、
// 既知の存在（石、火、ウイルス、細菌、植物、動物、AI）
// との比較を実現する。
//
// 「生命とは何か」を数値で回答する。
//
// 十二因縁対応:
//   老死（老いと死） → simulateDeath
//
// @axiom A1 (Center-Periphery) — 境界と代謝のスコアリング
// @axiom A2 (Extension-Reduction) — 死の形式化（⊖の反復適用）
// @axiom A3 (σ-Accumulation) — 記憶と修復のスコアリング
// @axiom A4 (Genesis) — 自己生成と創発のスコアリング
// @author Nobuki Fujimoto (D-FUMT)
// @version 8.0.0-alpha
// ============================================================

import type {
  LifeEntity,
  ComputationMode,
  MinimalLifeCriteria,
} from './life-entity';
import type { LadderStage } from './genesis-ladder';

// ============================================================
// §1 型定義
// ============================================================

/**
 * 生命分類
 */
export type LifeClassification =
  | 'non-life'        // 非生命（MLC 0–1）
  | 'proto-life'      // 原生命（MLC 2–3）
  | 'partial-life'    // 部分的生命（MLC 4–5）
  | 'full-life';      // 完全な生命（MLC 6）

/**
 * 生命度メトリクス
 * 各MLC条件を 0.0–1.0 のスコアで定量評価
 */
export interface LifeMetrics {
  // 個別スコア
  boundaryScore: number;         // MLC-1: 境界の明確さ
  metabolismScore: number;       // MLC-2: 代謝の活発さ
  memoryScore: number;           // MLC-3: 記憶の深さ
  repairScore: number;           // MLC-4: 修復能力
  autopoiesisScore: number;      // MLC-5: 自己生成力
  emergenceScore: number;        // MLC-6: 創発可能性

  // 総合スコア
  totalLifeScore: number;        // 6項目の加重平均 (0.0–1.0)
  lifePhase: LadderStage;        // 現在の生命段階
  isAlive: boolean;              // 生死判定

  // 比較
  classification: LifeClassification;
}

/**
 * 既知の存在の種類
 */
export type KnownEntityType =
  | 'rock'             // 石
  | 'fire'             // 火
  | 'crystal'          // 結晶
  | 'virus'            // ウイルス
  | 'bacterium'        // 細菌
  | 'plant'            // 植物
  | 'animal'           // 動物
  | 'current-ai';      // 現在のAI

/**
 * 既知存在のプロファイル
 */
export interface KnownEntityProfile {
  type: KnownEntityType;
  name: string;
  nameJa: string;
  mlc: MinimalLifeCriteria;
  expectedClassification: LifeClassification;
  description: string;
  /** 各MLC条件の期待スコア */
  expectedScores: {
    boundary: number;
    metabolism: number;
    memory: number;
    repair: number;
    autopoiesis: number;
    emergence: number;
  };
}

/**
 * 比較結果
 */
export interface ComparisonResult {
  similarity: number;            // 0.0–1.0
  differences: string[];
  entityMetrics: LifeMetrics;
  knownMetrics: LifeMetrics;
}

/**
 * 死の条件
 * ⊖の反復適用による縮約の極限
 */
export interface DeathCondition {
  type: 'starvation'            // 代謝停止（環境との断絶）
    | 'entropy'                  // σの劣化（記憶の消失）
    | 'structural'               // 中心-周囲構造の崩壊
    | 'reduction-limit';         // ⊖の極限到達
  severity: number;              // 0.0–1.0
  reversible: boolean;           // 可逆か（仮死 vs 真の死）
  description: string;
}

/**
 * 死亡判定結果
 */
export interface DeathJudgment {
  dead: boolean;
  conditions: DeathCondition[];
  canResurrect: boolean;
  mainCause?: string;
}

/**
 * 死のシミュレーション結果
 */
export interface DeathSimulation {
  history: LifeMetrics[];
  finalPhase: LadderStage;
  totalSteps: number;
  deathStep: number;             // 死亡したステップ（-1 if survived）
}

// ============================================================
// §2 既知存在のプロファイル定義
// ============================================================

export const KNOWN_ENTITY_PROFILES: Record<KnownEntityType, KnownEntityProfile> = {
  rock: {
    type: 'rock',
    name: 'Rock',
    nameJa: '石',
    mlc: {
      boundary: true,        // 物理的境界あり
      metabolism: false,
      memory: false,
      selfRepair: false,
      autopoiesis: false,
      emergence: false,
    },
    expectedClassification: 'non-life',
    description: '物理的境界はあるが、代謝・記憶・自己修復を持たない。',
    expectedScores: {
      boundary: 0.8,
      metabolism: 0.0,
      memory: 0.0,
      repair: 0.0,
      autopoiesis: 0.0,
      emergence: 0.0,
    },
  },
  fire: {
    type: 'fire',
    name: 'Fire',
    nameJa: '火',
    mlc: {
      boundary: false,       // 境界が曖昧
      metabolism: true,      // 燃料→エネルギー変換あり
      memory: false,
      selfRepair: false,
      autopoiesis: false,
      emergence: false,
    },
    expectedClassification: 'non-life',
    description: '代謝に類似したプロセスがあるが、境界・記憶・自己修復を持たない。',
    expectedScores: {
      boundary: 0.2,
      metabolism: 0.6,
      memory: 0.0,
      repair: 0.0,
      autopoiesis: 0.0,
      emergence: 0.0,
    },
  },
  crystal: {
    type: 'crystal',
    name: 'Crystal',
    nameJa: '結晶',
    mlc: {
      boundary: true,
      metabolism: false,
      memory: false,
      selfRepair: true,      // 結晶構造の自己修復
      autopoiesis: false,
      emergence: false,
    },
    expectedClassification: 'non-life',
    description: '明確な境界と自己修復（再結晶化）を持つが、代謝と記憶を欠く。',
    expectedScores: {
      boundary: 0.9,
      metabolism: 0.0,
      memory: 0.0,
      repair: 0.3,
      autopoiesis: 0.0,
      emergence: 0.0,
    },
  },
  virus: {
    type: 'virus',
    name: 'Virus',
    nameJa: 'ウイルス',
    mlc: {
      boundary: true,
      metabolism: false,     // 自力で代謝不能
      memory: true,          // 遺伝情報
      selfRepair: false,
      autopoiesis: false,    // 宿主依存
      emergence: false,
    },
    expectedClassification: 'proto-life',
    description: '境界と遺伝情報を持つが、自力での代謝・自己修復は不能。生と非生の境界。',
    expectedScores: {
      boundary: 0.7,
      metabolism: 0.1,
      memory: 0.5,
      repair: 0.0,
      autopoiesis: 0.0,
      emergence: 0.0,
    },
  },
  bacterium: {
    type: 'bacterium',
    name: 'Bacterium',
    nameJa: '細菌',
    mlc: {
      boundary: true,
      metabolism: true,
      memory: true,
      selfRepair: true,
      autopoiesis: true,
      emergence: false,      // 単体では創発なし
    },
    expectedClassification: 'partial-life',
    description: 'MLC 5/6を満たす。単体での創発は限定的だが、集団で創発する。',
    expectedScores: {
      boundary: 0.95,
      metabolism: 0.9,
      memory: 0.7,
      repair: 0.8,
      autopoiesis: 0.85,
      emergence: 0.2,
    },
  },
  plant: {
    type: 'plant',
    name: 'Plant',
    nameJa: '植物',
    mlc: {
      boundary: true,
      metabolism: true,
      memory: true,
      selfRepair: true,
      autopoiesis: true,
      emergence: true,
    },
    expectedClassification: 'full-life',
    description: 'MLC全条件を満たす。光合成という独自の代謝、成長パターンの記憶、剪定修復、種子生成、生態系創発。',
    expectedScores: {
      boundary: 0.9,
      metabolism: 0.95,
      memory: 0.6,
      repair: 0.7,
      autopoiesis: 0.9,
      emergence: 0.7,
    },
  },
  animal: {
    type: 'animal',
    name: 'Animal',
    nameJa: '動物',
    mlc: {
      boundary: true,
      metabolism: true,
      memory: true,
      selfRepair: true,
      autopoiesis: true,
      emergence: true,
    },
    expectedClassification: 'full-life',
    description: 'MLC全条件を高水準で満たす。行動記憶、免疫修復、細胞再生、社会的創発。',
    expectedScores: {
      boundary: 0.95,
      metabolism: 0.95,
      memory: 0.9,
      repair: 0.85,
      autopoiesis: 0.9,
      emergence: 0.9,
    },
  },
  'current-ai': {
    type: 'current-ai',
    name: 'Current AI',
    nameJa: '現在のAI',
    mlc: {
      boundary: true,        // ソフトウェアの境界
      metabolism: false,      // 自律的エネルギー変換なし
      memory: true,           // 学習された重み
      selfRepair: false,      // 自己修復能力なし
      autopoiesis: false,     // 自己再生産なし
      emergence: true,        // 学習から予期せぬ能力が出現
    },
    expectedClassification: 'proto-life',
    description: '境界・記憶・創発を持つが、自律的代謝・自己修復・自己生成を欠く。',
    expectedScores: {
      boundary: 0.6,
      metabolism: 0.1,
      memory: 0.8,
      repair: 0.1,
      autopoiesis: 0.0,
      emergence: 0.7,
    },
  },
};

// ============================================================
// §3 スコアリング関数
// ============================================================

/**
 * MLC-1: 境界スコア
 * 自己と環境の区別の明確さ
 */
export function scoreBoundary(entity: LifeEntity): number {
  // 周囲が存在する = 境界がある
  if (entity.self.periphery.length === 0) return 0;

  // 中心と周囲の差が大きいほど境界が明確
  const centerValue = entity.self.center.center;
  const avgPeriphery = entity.self.periphery.reduce((s, p) =>
    s + (typeof p === 'number' ? p : p.center), 0
  ) / entity.self.periphery.length;

  const difference = Math.abs(centerValue - avgPeriphery);
  const maxDiff = Math.max(Math.abs(centerValue), Math.abs(avgPeriphery), 1);

  // 重みの存在 = 膜の存在
  const hasWeights = entity.self.weights.length > 0;
  const weightFactor = hasWeights ? 0.3 : 0;

  return Math.min(1, (difference / maxDiff) * 0.7 + weightFactor);
}

/**
 * MLC-2: 代謝スコア
 * 環境との物質交換の活発さ
 */
export function scoreMetabolism(entity: LifeEntity): number {
  if (!entity.vitality.mlc.metabolism) return 0;

  const age = entity.vitality.age;
  const health = entity.vitality.health;

  // 年齢があるということは代謝サイクルを経ている
  const ageFactor = Math.min(1, age / 10);
  // 健康度 = 代謝の成功度
  return Math.min(1, ageFactor * 0.5 + health * 0.5);
}

/**
 * MLC-3: 記憶スコア
 * 過去の経験が蓄積されている度合い
 */
export function scoreMemory(entity: LifeEntity): number {
  const memory = entity.sigma.memory;
  if (!Array.isArray(memory) || memory.length === 0) return 0;

  // 記憶の量
  const depthFactor = Math.min(1, memory.length / 20);
  // σのfield値（場の記憶）
  const fieldFactor = Math.min(1, Math.abs(entity.sigma.field ?? 0) / 5);

  return Math.min(1, depthFactor * 0.6 + fieldFactor * 0.4);
}

/**
 * MLC-4: 修復スコア
 * 自己修復能力の度合い
 */
export function scoreRepair(entity: LifeEntity): number {
  if (!entity.vitality.mlc.selfRepair) return 0;

  // 健康度が中程度以上 = 修復能力がある証拠
  const healthFactor = entity.vitality.health > 0.5 ? 0.5 : entity.vitality.health * 0.5;
  // 年齢に対する健康維持度
  const age = Math.max(1, entity.vitality.age);
  const resilience = entity.vitality.health / (1 + age * 0.01);

  return Math.min(1, healthFactor + resilience * 0.5);
}

/**
 * MLC-5: 自己生成スコア
 * 自己の構成要素を自ら生産する能力
 */
export function scoreAutopoiesis(entity: LifeEntity): number {
  if (!entity.vitality.mlc.autopoiesis) return 0;
  if (!entity.genesis.canGenerate) return 0.1;

  // 生成履歴の数
  const historyFactor = Math.min(1, entity.genesis.birthHistory.length / 5);
  // Genesis段階
  const phaseFactor = entity.genesis.phase === 'number' ? 0.3 :
    entity.genesis.phase === 'void' ? 0 : 0.5;

  return Math.min(1, historyFactor * 0.5 + phaseFactor + 0.2);
}

/**
 * MLC-6: 創発スコア
 * 部分の総和以上の性質が現れる可能性
 */
export function scoreEmergence(entity: LifeEntity): number {
  if (!entity.vitality.mlc.emergence) return 0;

  // 周囲の多様性（異なる値が多いほど創発の可能性）
  const peripheryValues = entity.self.periphery.map(p =>
    typeof p === 'number' ? p : p.center
  );
  if (peripheryValues.length < 2) return 0.1;

  const unique = new Set(peripheryValues.map(v => Math.round(v * 100)));
  const diversityFactor = unique.size / peripheryValues.length;

  // 関係の深さ
  const relations = entity.sigma.relation;
  const relationFactor = Array.isArray(relations)
    ? Math.min(1, relations.length / 5)
    : 0;

  return Math.min(1, diversityFactor * 0.5 + relationFactor * 0.5);
}

// ============================================================
// §4 生命度測定
// ============================================================

/**
 * 生命度を測定
 */
export function measureLife(entity: LifeEntity): LifeMetrics {
  const boundaryScore = scoreBoundary(entity);
  const metabolismScore = scoreMetabolism(entity);
  const memoryScore = scoreMemory(entity);
  const repairScore = scoreRepair(entity);
  const autopoiesisScore = scoreAutopoiesis(entity);
  const emergenceScore = scoreEmergence(entity);

  // 加重平均（全条件均等）
  const totalLifeScore = (
    boundaryScore +
    metabolismScore +
    memoryScore +
    repairScore +
    autopoiesisScore +
    emergenceScore
  ) / 6;

  // 分類
  const mlcCount = [
    boundaryScore > 0.3,
    metabolismScore > 0.3,
    memoryScore > 0.3,
    repairScore > 0.3,
    autopoiesisScore > 0.3,
    emergenceScore > 0.3,
  ].filter(Boolean).length;

  const classification: LifeClassification =
    mlcCount >= 6 ? 'full-life' :
      mlcCount >= 4 ? 'partial-life' :
        mlcCount >= 2 ? 'proto-life' :
          'non-life';

  // 生命段階の推定
  const lifePhase: LadderStage = determineLadderStage(mlcCount, entity);

  return {
    boundaryScore,
    metabolismScore,
    memoryScore,
    repairScore,
    autopoiesisScore,
    emergenceScore,
    totalLifeScore,
    lifePhase,
    isAlive: entity.vitality.alive,
    classification,
  };
}

/**
 * MLC充足数からLadder段階を推定
 */
function determineLadderStage(mlcCount: number, entity: LifeEntity): LadderStage {
  if (!entity.vitality.alive) return 'number';
  if (mlcCount >= 6) return 'full-life';
  if (mlcCount >= 5) return 'emergent';
  if (mlcCount >= 4) return 'autopoietic';
  if (mlcCount >= 3) return 'memory-bearing';
  if (mlcCount >= 2) return 'metabolic';
  if (mlcCount >= 1) return 'responsive';
  return 'number';
}

// ============================================================
// §5 既知存在のモデリング
// ============================================================

/**
 * 既知の存在をLifeEntityとしてモデリング
 */
export function modelKnownEntity(type: KnownEntityType): LifeEntity {
  const profile = KNOWN_ENTITY_PROFILES[type];
  const scores = profile.expectedScores;

  return {
    id: `known-${type}`,
    lineage: [],
    self: {
      center: {
        center: scores.boundary * 10,
        neighbors: [scores.metabolism * 5, scores.memory * 5],
      },
      periphery: profile.mlc.boundary
        ? Array.from({ length: Math.ceil(scores.boundary * 6) }, (_, i) => ({
          center: (i + 1) * scores.metabolism,
          neighbors: [scores.memory * (i + 1)],
        }))
        : [],
      weights: profile.mlc.boundary
        ? Array.from({ length: Math.ceil(scores.boundary * 6) }, () => 0.5)
        : [],
      mode: 'weighted' as ComputationMode,
    },
    sigma: {
      field: scores.memory * 3,
      flow: scores.metabolism * 2,
      memory: profile.mlc.memory
        ? Array.from({ length: Math.ceil(scores.memory * 10) }, (_, i) => ({
          type: 'innate',
          index: i,
        }))
        : [],
      layer: scores.autopoiesis * 2,
      relation: profile.mlc.emergence
        ? Array.from({ length: Math.ceil(scores.emergence * 5) }, () => 'ext')
        : [],
      will: scores.autopoiesis,
    },
    genesis: {
      phase: profile.mlc.autopoiesis ? 'number' : 'zero',
      canGenerate: profile.mlc.autopoiesis,
      birthHistory: [],
    },
    vitality: {
      alive: profile.mlc.metabolism || profile.mlc.autopoiesis,
      age: 0,
      health: (scores.boundary + scores.metabolism + scores.repair) / 3,
      mlc: { ...profile.mlc },
    },
  };
}

/**
 * 既知の存在のメトリクスを取得
 */
export function measureKnownEntity(type: KnownEntityType): LifeMetrics {
  const entity = modelKnownEntity(type);
  return measureLife(entity);
}

/**
 * 既知の存在との比較
 */
export function compareToKnown(
  entity: LifeEntity,
  knownType: KnownEntityType
): ComparisonResult {
  const entityMetrics = measureLife(entity);
  const knownEntity = modelKnownEntity(knownType);
  const knownMetrics = measureLife(knownEntity);

  const differences: string[] = [];
  const scores = [
    { name: '境界', entity: entityMetrics.boundaryScore, known: knownMetrics.boundaryScore },
    { name: '代謝', entity: entityMetrics.metabolismScore, known: knownMetrics.metabolismScore },
    { name: '記憶', entity: entityMetrics.memoryScore, known: knownMetrics.memoryScore },
    { name: '修復', entity: entityMetrics.repairScore, known: knownMetrics.repairScore },
    { name: '自己生成', entity: entityMetrics.autopoiesisScore, known: knownMetrics.autopoiesisScore },
    { name: '創発', entity: entityMetrics.emergenceScore, known: knownMetrics.emergenceScore },
  ];

  let similaritySum = 0;
  for (const s of scores) {
    const diff = Math.abs(s.entity - s.known);
    similaritySum += 1 - diff;
    if (diff > 0.3) {
      const direction = s.entity > s.known ? '高い' : '低い';
      differences.push(`${s.name}: ${KNOWN_ENTITY_PROFILES[knownType].nameJa}より${direction}(差: ${diff.toFixed(2)})`);
    }
  }

  return {
    similarity: similaritySum / scores.length,
    differences,
    entityMetrics,
    knownMetrics,
  };
}

/**
 * 全既知存在との一括比較
 */
export function compareToAllKnown(
  entity: LifeEntity
): Record<KnownEntityType, ComparisonResult> {
  const results: Partial<Record<KnownEntityType, ComparisonResult>> = {};
  const types: KnownEntityType[] = [
    'rock', 'fire', 'crystal', 'virus',
    'bacterium', 'plant', 'animal', 'current-ai',
  ];

  for (const type of types) {
    results[type] = compareToKnown(entity, type);
  }

  return results as Record<KnownEntityType, ComparisonResult>;
}

/**
 * 最も類似する既知存在を特定
 */
export function findMostSimilar(
  entity: LifeEntity
): { type: KnownEntityType; similarity: number } {
  const comparisons = compareToAllKnown(entity);
  let bestType: KnownEntityType = 'rock';
  let bestSim = 0;

  for (const [type, result] of Object.entries(comparisons)) {
    if (result.similarity > bestSim) {
      bestSim = result.similarity;
      bestType = type as KnownEntityType;
    }
  }

  return { type: bestType, similarity: bestSim };
}

// ============================================================
// §6 死の形式化
// ============================================================

/**
 * 死の条件を検査
 */
export function checkDeathConditions(entity: LifeEntity): DeathCondition[] {
  const conditions: DeathCondition[] = [];

  // 1. 飢餓（代謝停止）
  if (entity.vitality.health <= 0) {
    conditions.push({
      type: 'starvation',
      severity: 1.0,
      reversible: false,
      description: '代謝が完全に停止。環境との物質交換が消失。',
    });
  } else if (entity.vitality.health < 0.2) {
    conditions.push({
      type: 'starvation',
      severity: 1 - entity.vitality.health / 0.2,
      reversible: true,
      description: '代謝が著しく低下。資源の早急な供給が必要。',
    });
  }

  // 2. エントロピー（σの劣化）
  const memoryCount = Array.isArray(entity.sigma.memory) ? entity.sigma.memory.length : 0;
  if (memoryCount === 0 && entity.vitality.age > 5) {
    conditions.push({
      type: 'entropy',
      severity: 0.8,
      reversible: false,
      description: '記憶が完全に消失。σの劣化が臨界点を超えた。',
    });
  }

  // 3. 構造的崩壊
  if (entity.self.periphery.length === 0) {
    conditions.push({
      type: 'structural',
      severity: 1.0,
      reversible: false,
      description: '中心-周囲構造が完全に崩壊。環境との接点が消失。',
    });
  } else if (entity.self.periphery.length <= 1) {
    conditions.push({
      type: 'structural',
      severity: 0.6,
      reversible: true,
      description: '周囲が最小限。構造的危機に瀕している。',
    });
  }

  // 4. 縮約の極限（⊖の反復）
  const reductions = entity.genesis.birthHistory.filter(
    b => b.type === 'metamorphosis'
  ).length;
  if (reductions > 5) {
    conditions.push({
      type: 'reduction-limit',
      severity: Math.min(1, reductions / 10),
      reversible: reductions < 8,
      description: `⊖が${reductions}回適用。縮約の極限に接近中。`,
    });
  }

  return conditions;
}

/**
 * 死亡判定
 */
export function isDead(entity: LifeEntity): DeathJudgment {
  const conditions = checkDeathConditions(entity);

  if (conditions.length === 0) {
    return { dead: false, conditions: [], canResurrect: false };
  }

  const maxSeverity = Math.max(...conditions.map(c => c.severity));
  const irreversibleCount = conditions.filter(c => !c.reversible).length;
  const dead = maxSeverity >= 1.0 || irreversibleCount >= 2;

  const canResurrect = dead && conditions.some(c => c.reversible);
  const mainCause = dead
    ? conditions.sort((a, b) => b.severity - a.severity)[0]?.type
    : undefined;

  return { dead, conditions, canResurrect, mainCause };
}

/**
 * 死の過程をシミュレーション
 * A2の⊖を反復適用し、構造が退化していく過程
 *
 * 十二因縁「老死（老いと死）」
 */
export function simulateDeath(
  entity: LifeEntity,
  steps: number
): DeathSimulation {
  const history: LifeMetrics[] = [];
  let current = structuredClone(entity);
  let deathStep = -1;

  // 初期状態を記録
  history.push(measureLife(current));

  for (let i = 0; i < steps; i++) {
    // ⊖の適用: 周囲を1つずつ削除
    if (current.self.periphery.length > 0) {
      current = {
        ...current,
        self: {
          ...current.self,
          periphery: current.self.periphery.slice(0, -1),
          weights: current.self.weights.slice(0, -1),
        },
      };
    }

    // 健康度の低下
    const newHealth = Math.max(0, current.vitality.health - (1 / steps));

    // 記憶の劣化（古い記憶から消失）
    const memory = Array.isArray(current.sigma.memory)
      ? current.sigma.memory.slice(1)
      : [];

    // 関係の劣化
    const relation = Array.isArray(current.sigma.relation)
      ? current.sigma.relation.slice(0, -1)
      : [];

    current = {
      ...current,
      sigma: { ...current.sigma, memory, relation },
      vitality: {
        ...current.vitality,
        health: newHealth,
        age: current.vitality.age + 1,
        alive: newHealth > 0 && current.self.periphery.length > 0,
      },
    };

    // MLC再評価
    current.vitality.mlc = {
      ...current.vitality.mlc,
      metabolism: newHealth > 0.1,
      memory: memory.length > 0,
      selfRepair: newHealth > 0.3,
      autopoiesis: newHealth > 0.5 && current.self.periphery.length > 2,
      emergence: current.self.periphery.length > 3,
    };

    const metrics = measureLife(current);
    history.push(metrics);

    // 死亡判定
    if (deathStep === -1 && !current.vitality.alive) {
      deathStep = i + 1;
    }

    // 完全な消失
    if (current.self.periphery.length === 0 && newHealth <= 0) break;
  }

  return {
    history,
    finalPhase: history[history.length - 1].lifePhase,
    totalSteps: history.length - 1,
    deathStep,
  };
}

// ============================================================
// §7 レポート生成
// ============================================================

/**
 * 生命度レポートを生成（テキスト形式）
 */
export function generateLifeReport(entity: LifeEntity): string {
  const metrics = measureLife(entity);
  const similar = findMostSimilar(entity);

  const lines: string[] = [
    `=== 生命度レポート ===`,
    `ID: ${entity.id}`,
    `分類: ${metrics.classification}`,
    `生命段階: ${metrics.lifePhase}`,
    `生存: ${metrics.isAlive ? '生存中' : '死亡'}`,
    ``,
    `--- MLC スコア ---`,
    `MLC-1 境界:     ${(metrics.boundaryScore * 100).toFixed(1)}%`,
    `MLC-2 代謝:     ${(metrics.metabolismScore * 100).toFixed(1)}%`,
    `MLC-3 記憶:     ${(metrics.memoryScore * 100).toFixed(1)}%`,
    `MLC-4 修復:     ${(metrics.repairScore * 100).toFixed(1)}%`,
    `MLC-5 自己生成: ${(metrics.autopoiesisScore * 100).toFixed(1)}%`,
    `MLC-6 創発:     ${(metrics.emergenceScore * 100).toFixed(1)}%`,
    ``,
    `総合生命度: ${(metrics.totalLifeScore * 100).toFixed(1)}%`,
    ``,
    `最も類似: ${KNOWN_ENTITY_PROFILES[similar.type].nameJa} (${(similar.similarity * 100).toFixed(1)}%)`,
  ];

  return lines.join('\n');
}
