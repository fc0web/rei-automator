// ============================================================
// colony-life.ts — Phase 8d: コロニーと進化
//
// 複数の生命体が集まり、自然選択・突然変異・種分化
// を通じて進化するメカニズムを実装する。
//
// Phase 7の再利用:
//   7a σ-interaction → 代謝の属性カスケードに使用
//   7d emergence     → コロニーの創発に使用
//
// 十二因縁対応:
//   生（誕生） → colony-life runGeneration
//
// @axiom A1 (Center-Periphery) — 個体間の空間関係
// @axiom A2 (Extension-Reduction) — 突然変異（構造変化）
// @axiom A3 (σ-Accumulation) — 世代間の記憶伝達
// @axiom A4 (Genesis) — 新世代の生成
// @author Nobuki Fujimoto (D-FUMT)
// @version 8.0.0-alpha
// ============================================================

import type {
  LifeEntity,
  ComputationMode,
  BirthEvent,
} from './life-entity';
import type { MultiDimNumber, MetabolismResult } from './metabolism';

// ============================================================
// §1 型定義
// ============================================================

/**
 * コロニー（生命体の集団）
 */
export interface LifeColony {
  /** コロニーID */
  id: string;
  /** 所属する生命体 */
  members: LifeEntity[];
  /** 環境（共有資源） */
  environment: MultiDimNumber[];
  /** 世代番号 */
  generation: number;
  /** コロニーの集合σ（共有記憶） */
  collectiveSigma: CollectiveSigma;
  /** 種の分類 */
  species: SpeciesInfo[];
  /** 統計情報 */
  stats: ColonyStats;
}

/**
 * 集合σ（コロニーレベルの記憶）
 */
export interface CollectiveSigma {
  /** 共有された場の強度 */
  fieldStrength: number;
  /** 集団の流れの方向性 */
  flowDirection: number;
  /** 世代間の記憶 */
  generationalMemory: GenerationalRecord[];
  /** 集団の関係密度 */
  relationDensity: number;
  /** 集団の意志（生存戦略の方向性） */
  collectiveWill: number;
}

/**
 * 世代記録
 */
export interface GenerationalRecord {
  generation: number;
  populationSize: number;
  averageFitness: number;
  averageHealth: number;
  dominantMode: ComputationMode;
  speciesCount: number;
}

/**
 * 種の情報
 */
export interface SpeciesInfo {
  id: string;
  name: string;
  memberCount: number;
  dominantMode: ComputationMode;
  averageFitness: number;
  /** 種の特徴ベクトル（A1の中心-周囲パターン） */
  signature: number[];
}

/**
 * コロニー統計
 */
export interface ColonyStats {
  totalPopulation: number;
  averageFitness: number;
  averageHealth: number;
  averageAge: number;
  diversity: number;            // 多様性指数 (0.0–1.0)
  speciesCount: number;
  birthCount: number;
  deathCount: number;
}

/**
 * 適応度関数の結果
 */
export interface FitnessResult {
  entity: LifeEntity;
  fitness: number;              // 0.0–1.0
  components: {
    health: number;
    metabolicEfficiency: number;
    memoryDepth: number;
    peripheryCount: number;
    age: number;
  };
}

/**
 * 突然変異の種類
 */
export type MutationType =
  | 'periphery-add'        // 周囲の追加（A2 ⊕）
  | 'periphery-remove'     // 周囲の削除（A2 ⊖）
  | 'weight-shift'         // 重みの変動
  | 'mode-switch'          // 計算モードの変更
  | 'center-drift';        // 中心値のドリフト

/**
 * 突然変異の結果
 */
export interface MutationResult {
  entity: LifeEntity;
  mutationType: MutationType;
  magnitude: number;            // 変異の大きさ
  description: string;
}

/**
 * 世代実行結果
 */
export interface GenerationResult {
  colony: LifeColony;
  births: LifeEntity[];
  deaths: LifeEntity[];
  mutations: MutationResult[];
  newSpecies: SpeciesInfo[];
  emergenceDetected: boolean;
}

// ============================================================
// §2 コロニー生成
// ============================================================

let colonyIdCounter = 0;

/**
 * コロニーIDカウンタをリセット（テスト用）
 */
export function resetColonyIdCounter(): void {
  colonyIdCounter = 0;
}

/**
 * コロニーIDを生成
 */
export function generateColonyId(): string {
  return `colony-${++colonyIdCounter}`;
}

/**
 * コロニーを生成
 */
export function createColony(
  members: LifeEntity[],
  environment: MultiDimNumber[] = []
): LifeColony {
  const stats = computeColonyStats(members);
  const species = detectSpeciesFromMembers(members);

  return {
    id: generateColonyId(),
    members,
    environment,
    generation: 0,
    collectiveSigma: createCollectiveSigma(members),
    species,
    stats,
  };
}

/**
 * 集合σの初期化
 */
function createCollectiveSigma(members: LifeEntity[]): CollectiveSigma {
  if (members.length === 0) {
    return {
      fieldStrength: 0,
      flowDirection: 0,
      generationalMemory: [],
      relationDensity: 0,
      collectiveWill: 0,
    };
  }

  const avgField = members.reduce((s, m) =>
    s + (m.sigma.field ?? 0), 0) / members.length;
  const avgFlow = members.reduce((s, m) =>
    s + (m.sigma.flow ?? 0), 0) / members.length;

  return {
    fieldStrength: avgField,
    flowDirection: avgFlow,
    generationalMemory: [],
    relationDensity: members.length > 1
      ? Math.min(1, members.length / 20)
      : 0,
    collectiveWill: members.reduce((s, m) =>
      s + m.vitality.health, 0) / members.length,
  };
}

// ============================================================
// §3 適応度計算
// ============================================================

/**
 * 個体の適応度を計算
 */
export function computeFitness(entity: LifeEntity): FitnessResult {
  const health = entity.vitality.health;
  const peripheryCount = Math.min(1, entity.self.periphery.length / 6);
  const memoryDepth = Math.min(1,
    (Array.isArray(entity.sigma.memory) ? entity.sigma.memory.length : 0) / 20
  );
  const age = entity.vitality.age;
  // 若すぎても老いすぎてもペナルティ
  const ageFactor = age < 3 ? age / 3 :
    age < 30 ? 1.0 :
      Math.max(0, 1 - (age - 30) / 50);

  // 代謝効率は計算モードの安定性に基づく
  const modeStability: Record<ComputationMode, number> = {
    weighted: 0.7,
    harmonic: 0.5,
    geometric: 0.6,
  };
  const metabolicEfficiency = modeStability[entity.self.mode] ?? 0.5;

  const components = {
    health,
    metabolicEfficiency,
    memoryDepth,
    peripheryCount,
    age: ageFactor,
  };

  // 加重平均で適応度を算出
  const fitness =
    health * 0.3 +
    metabolicEfficiency * 0.2 +
    memoryDepth * 0.15 +
    peripheryCount * 0.2 +
    ageFactor * 0.15;

  return {
    entity,
    fitness: Math.max(0, Math.min(1, fitness)),
    components,
  };
}

// ============================================================
// §4 自然選択
// ============================================================

/**
 * 自然選択を実行
 * 適応度に基づいて生存者を選択
 *
 * @param members 現在の個体群
 * @param survivalRate 生存率 (0.0–1.0)
 * @returns 生存者と死亡者
 */
export function naturalSelection(
  members: LifeEntity[],
  survivalRate: number = 0.7
): { survivors: LifeEntity[]; dead: LifeEntity[] } {
  if (members.length === 0) return { survivors: [], dead: [] };

  // 適応度でソート（降順）
  const ranked = members
    .map(m => ({ entity: m, fitness: computeFitness(m).fitness }))
    .sort((a, b) => b.fitness - a.fitness);

  const surviveCount = Math.max(1,
    Math.ceil(members.length * survivalRate)
  );

  const survivors = ranked.slice(0, surviveCount).map(r => r.entity);
  const dead = ranked.slice(surviveCount).map(r => r.entity);

  return { survivors, dead };
}

// ============================================================
// §5 突然変異（A2: Extension-Reduction）
// ============================================================

/**
 * 突然変異を適用
 *
 * A2の⊕（拡張）と⊖（縮約）による構造変化
 */
export function mutate(
  entity: LifeEntity,
  mutationRate: number = 0.1,
  seed?: number
): MutationResult {
  // 疑似乱数（seed指定可能にしてテスト可能性を担保）
  const random = seed !== undefined
    ? seededRandom(seed)
    : Math.random;

  // 変異が起きるか判定
  if (random() > mutationRate) {
    return {
      entity,
      mutationType: 'center-drift',
      magnitude: 0,
      description: '変異なし',
    };
  }

  // 変異の種類を選択
  const mutations: MutationType[] = [
    'periphery-add', 'periphery-remove', 'weight-shift',
    'mode-switch', 'center-drift',
  ];
  const mutationType = mutations[Math.floor(random() * mutations.length)];

  let mutated: LifeEntity;
  let magnitude: number;
  let description: string;

  switch (mutationType) {
    case 'periphery-add': {
      // A2 ⊕: 周囲の追加
      const newValue = entity.self.center.center * (0.5 + random() * 1.0);
      const newMD: MultiDimNumber = { center: newValue, neighbors: [newValue * 0.5] };
      mutated = {
        ...entity,
        self: {
          ...entity.self,
          periphery: [...entity.self.periphery, newMD],
          weights: [...entity.self.weights, 0.5 + random() * 0.5],
        },
      };
      magnitude = 0.3;
      description = `周囲追加(⊕): 新しい接点(${newValue.toFixed(2)})を獲得`;
      break;
    }
    case 'periphery-remove': {
      // A2 ⊖: 周囲の削除
      if (entity.self.periphery.length <= 1) {
        mutated = entity;
        magnitude = 0;
        description = '周囲削除(⊖): 最小限のため変異なし';
        break;
      }
      const removeIdx = Math.floor(random() * entity.self.periphery.length);
      mutated = {
        ...entity,
        self: {
          ...entity.self,
          periphery: entity.self.periphery.filter((_, i) => i !== removeIdx),
          weights: entity.self.weights.filter((_, i) => i !== removeIdx),
        },
      };
      magnitude = 0.3;
      description = `周囲削除(⊖): 接点${removeIdx}を喪失`;
      break;
    }
    case 'weight-shift': {
      // 重みの変動
      const weights = entity.self.weights.map(w =>
        Math.max(0, Math.min(1, w + (random() - 0.5) * 0.3))
      );
      mutated = {
        ...entity,
        self: { ...entity.self, weights },
      };
      magnitude = 0.15;
      description = '重みシフト: 膜透過性が変化';
      break;
    }
    case 'mode-switch': {
      // 計算モードの変更
      const modes: ComputationMode[] = ['weighted', 'harmonic', 'geometric'];
      const currentIdx = modes.indexOf(entity.self.mode);
      const newIdx = (currentIdx + 1 + Math.floor(random() * 2)) % 3;
      mutated = {
        ...entity,
        self: { ...entity.self, mode: modes[newIdx] },
      };
      magnitude = 0.5;
      description = `モード変更: ${entity.self.mode} → ${modes[newIdx]}`;
      break;
    }
    case 'center-drift':
    default: {
      // 中心値のドリフト
      const drift = (random() - 0.5) * entity.self.center.center * 0.2;
      mutated = {
        ...entity,
        self: {
          ...entity.self,
          center: {
            ...entity.self.center,
            center: entity.self.center.center + drift,
          },
        },
      };
      magnitude = Math.abs(drift) / (Math.abs(entity.self.center.center) + 1);
      description = `中心ドリフト: ${drift >= 0 ? '+' : ''}${drift.toFixed(3)}`;
      break;
    }
  }

  return { entity: mutated, mutationType, magnitude, description };
}

/**
 * シード付き疑似乱数生成器
 */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

// ============================================================
// §6 繁殖
// ============================================================

let entityIdCounter = 1000;

/**
 * 繁殖: 親から子を生成
 * A4（Genesis）による新世代の生成
 */
export function reproduce(
  parent: LifeEntity,
  mutationRate: number = 0.1,
  seed?: number
): LifeEntity {
  const childId = `life-${++entityIdCounter}`;

  // 子は親の構造をコピー + 変異
  const child: LifeEntity = {
    ...parent,
    id: childId,
    lineage: [...parent.lineage, parent.id],
    vitality: {
      ...parent.vitality,
      age: 0,
      health: Math.min(1, parent.vitality.health * 0.9 + 0.1),
    },
    genesis: {
      ...parent.genesis,
      birthHistory: [
        ...parent.genesis.birthHistory,
        {
          type: 'split',
          parentIds: [parent.id],
          timestamp: Date.now(),
          axiomUsed: ['A4'] as BirthEvent['axiomUsed'],
        },
      ],
    },
    sigma: {
      ...parent.sigma,
      // 子は親の記憶の一部を継承（世代間伝達）
      memory: Array.isArray(parent.sigma.memory)
        ? parent.sigma.memory.slice(-5)  // 最新5件のみ
        : [],
    },
  };

  // 突然変異を適用
  const mutated = mutate(child, mutationRate, seed);
  return mutated.entity;
}

/**
 * 2親からの交叉繁殖
 */
export function crossover(
  parent1: LifeEntity,
  parent2: LifeEntity,
  seed?: number
): LifeEntity {
  const random = seed !== undefined ? seededRandom(seed) : Math.random;
  const childId = `life-${++entityIdCounter}`;

  // 中心値は2親の平均
  const centerValue = (parent1.self.center.center + parent2.self.center.center) / 2;

  // 周囲はランダムに選択
  const periphery = parent1.self.periphery.map((p, i) => {
    if (random() < 0.5 && i < parent2.self.periphery.length) {
      return parent2.self.periphery[i];
    }
    return p;
  });

  // モードは適応度の高い方から
  const f1 = computeFitness(parent1).fitness;
  const f2 = computeFitness(parent2).fitness;
  const mode = f1 >= f2 ? parent1.self.mode : parent2.self.mode;

  const child: LifeEntity = {
    ...parent1,
    id: childId,
    lineage: [...parent1.lineage, parent1.id, parent2.id],
    self: {
      center: { center: centerValue, neighbors: [centerValue * 0.5] },
      periphery,
      weights: parent1.self.weights.map((w, i) =>
        (w + (parent2.self.weights[i] ?? w)) / 2
      ),
      mode,
    },
    vitality: {
      ...parent1.vitality,
      age: 0,
      health: (parent1.vitality.health + parent2.vitality.health) / 2,
    },
    genesis: {
      ...parent1.genesis,
      birthHistory: [{
        type: 'merge',
        parentIds: [parent1.id, parent2.id],
        timestamp: Date.now(),
        axiomUsed: ['A4', 'A1'] as BirthEvent['axiomUsed'],
      }],
    },
    sigma: {
      ...parent1.sigma,
      memory: [
        ...(Array.isArray(parent1.sigma.memory) ? parent1.sigma.memory.slice(-3) : []),
        ...(Array.isArray(parent2.sigma.memory) ? parent2.sigma.memory.slice(-3) : []),
      ],
    },
  };

  return child;
}

// ============================================================
// §7 世代実行
// ============================================================

/**
 * 1世代を実行
 */
export function runGeneration(
  colony: LifeColony,
  config: {
    survivalRate?: number;
    mutationRate?: number;
    reproductionRate?: number;
    seed?: number;
  } = {}
): GenerationResult {
  const {
    survivalRate = 0.7,
    mutationRate = 0.1,
    reproductionRate = 0.3,
    seed,
  } = config;

  const random = seed !== undefined ? seededRandom(seed) : Math.random;

  // 1. 自然選択
  const { survivors, dead } = naturalSelection(colony.members, survivalRate);

  // 2. 繁殖
  const births: LifeEntity[] = [];
  const birthCount = Math.ceil(survivors.length * reproductionRate);
  for (let i = 0; i < birthCount; i++) {
    const parentIdx = Math.floor(random() * survivors.length);
    const parent = survivors[parentIdx];

    // 交叉の可能性（2親以上いる場合）
    if (survivors.length >= 2 && random() < 0.3) {
      let otherIdx = parentIdx;
      while (otherIdx === parentIdx) {
        otherIdx = Math.floor(random() * survivors.length);
      }
      births.push(crossover(parent, survivors[otherIdx], seed));
    } else {
      births.push(reproduce(parent, mutationRate, seed));
    }
  }

  // 3. 突然変異（生存者にも適用）
  const mutations: MutationResult[] = [];
  const mutatedSurvivors = survivors.map(s => {
    const result = mutate(s, mutationRate * 0.5, seed);
    if (result.magnitude > 0) {
      mutations.push(result);
    }
    return result.entity;
  });

  // 4. 新世代の個体群
  const newMembers = [...mutatedSurvivors, ...births];

  // 5. 種分化チェック
  const species = detectSpeciesFromMembers(newMembers);
  const existingSpeciesIds = colony.species.map(s => s.id);
  const newSpecies = species.filter(s => !existingSpeciesIds.includes(s.id));

  // 6. 創発チェック
  const emergenceDetected = detectColonialEmergence(newMembers, colony);

  // 7. 統計更新
  const stats = computeColonyStats(newMembers);

  // 8. 集合σ更新
  const record: GenerationalRecord = {
    generation: colony.generation + 1,
    populationSize: newMembers.length,
    averageFitness: stats.averageFitness,
    averageHealth: stats.averageHealth,
    dominantMode: getDominantMode(newMembers),
    speciesCount: species.length,
  };

  const collectiveSigma: CollectiveSigma = {
    ...colony.collectiveSigma,
    generationalMemory: [...colony.collectiveSigma.generationalMemory, record],
    relationDensity: Math.min(1, newMembers.length / 20),
    collectiveWill: stats.averageHealth,
  };

  // 9. 新コロニー
  const newColony: LifeColony = {
    ...colony,
    members: newMembers,
    generation: colony.generation + 1,
    species,
    stats: { ...stats, birthCount: births.length, deathCount: dead.length },
    collectiveSigma,
  };

  return {
    colony: newColony,
    births,
    deaths: dead,
    mutations,
    newSpecies,
    emergenceDetected,
  };
}

/**
 * 複数世代を連続実行
 */
export function runGenerations(
  colony: LifeColony,
  generations: number,
  config: {
    survivalRate?: number;
    mutationRate?: number;
    reproductionRate?: number;
    seed?: number;
  } = {}
): {
  colony: LifeColony;
  generationResults: GenerationResult[];
} {
  let current = colony;
  const results: GenerationResult[] = [];

  for (let i = 0; i < generations; i++) {
    const result = runGeneration(current, config);
    current = result.colony;
    results.push(result);

    // 絶滅した場合は中断
    if (current.members.length === 0) break;
  }

  return { colony: current, generationResults: results };
}

// ============================================================
// §8 種分化
// ============================================================

/**
 * 個体群から種を検出
 * 計算モードと構造の類似性に基づくクラスタリング
 */
export function detectSpeciesFromMembers(
  members: LifeEntity[]
): SpeciesInfo[] {
  if (members.length === 0) return [];

  // 計算モードでグループ化（簡易的な種分化）
  const groups: Record<ComputationMode, LifeEntity[]> = {
    weighted: [],
    harmonic: [],
    geometric: [],
  };

  for (const m of members) {
    groups[m.self.mode].push(m);
  }

  const species: SpeciesInfo[] = [];
  for (const [mode, group] of Object.entries(groups)) {
    if (group.length === 0) continue;

    const avgFitness = group.reduce((s, m) =>
      s + computeFitness(m).fitness, 0
    ) / group.length;

    // 種のシグネチャ = 中心値と周囲数のベクトル
    const signature = [
      group.reduce((s, m) => s + m.self.center.center, 0) / group.length,
      group.reduce((s, m) => s + m.self.periphery.length, 0) / group.length,
    ];

    species.push({
      id: `species-${mode}`,
      name: `${mode}種`,
      memberCount: group.length,
      dominantMode: mode as ComputationMode,
      averageFitness: avgFitness,
      signature,
    });
  }

  return species;
}

/**
 * 種分化の検出（世代間比較）
 */
export function detectSpeciation(
  currentSpecies: SpeciesInfo[],
  previousSpecies: SpeciesInfo[]
): SpeciesInfo[] {
  const previousIds = new Set(previousSpecies.map(s => s.id));
  return currentSpecies.filter(s => !previousIds.has(s.id));
}

// ============================================================
// §9 集合知の創発
// ============================================================

/**
 * コロニーレベルの創発を検知
 * Phase 7dのemergenceをコロニーレベルで適用
 */
export function detectColonialEmergence(
  members: LifeEntity[],
  previousColony: LifeColony
): boolean {
  if (members.length < 3) return false;

  // 条件1: 個体の適応度の総和が、個別の合計を超える
  const individualFitnessSum = members.reduce((s, m) =>
    s + computeFitness(m).fitness, 0
  );
  const previousFitnessSum = previousColony.members.reduce((s, m) =>
    s + computeFitness(m).fitness, 0
  );

  // 条件2: 種の多様性が維持されている
  const diversity = computeDiversity(members);

  // 条件3: 世代を経て改善している
  const improving = individualFitnessSum > previousFitnessSum * 0.95;

  return improving && diversity > 0.3;
}

/**
 * 集合知の創発結果を取得
 */
export function colonialEmergence(
  colony: LifeColony
): { emerged: boolean; property?: MultiDimNumber } {
  if (colony.members.length < 3) {
    return { emerged: false };
  }

  // 全個体の中心値の統合（A1の再帰適用）
  const centers = colony.members.map(m => m.self.center.center);
  const emergentCenter = centers.reduce((a, b) => a + b, 0) / centers.length;

  // 創発的性質 = 個体の平均を超える集合的パターン
  const variance = centers.reduce((s, c) =>
    s + Math.pow(c - emergentCenter, 2), 0
  ) / centers.length;

  // 低分散 + 高多様性 = 創発
  const diversity = computeDiversity(colony.members);
  const emerged = variance < emergentCenter * 0.5 && diversity > 0.3;

  if (emerged) {
    return {
      emerged: true,
      property: {
        center: emergentCenter,
        neighbors: colony.species.map(s => s.averageFitness),
      },
    };
  }

  return { emerged: false };
}

// ============================================================
// §10 ユーティリティ
// ============================================================

/**
 * コロニー統計を計算
 */
export function computeColonyStats(members: LifeEntity[]): ColonyStats {
  if (members.length === 0) {
    return {
      totalPopulation: 0,
      averageFitness: 0,
      averageHealth: 0,
      averageAge: 0,
      diversity: 0,
      speciesCount: 0,
      birthCount: 0,
      deathCount: 0,
    };
  }

  const fitnesses = members.map(m => computeFitness(m).fitness);
  const species = detectSpeciesFromMembers(members);

  return {
    totalPopulation: members.length,
    averageFitness: fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length,
    averageHealth: members.reduce((s, m) => s + m.vitality.health, 0) / members.length,
    averageAge: members.reduce((s, m) => s + m.vitality.age, 0) / members.length,
    diversity: computeDiversity(members),
    speciesCount: species.length,
    birthCount: 0,
    deathCount: 0,
  };
}

/**
 * 多様性指数の計算（Simpsonの多様性指数）
 */
export function computeDiversity(members: LifeEntity[]): number {
  if (members.length <= 1) return 0;

  const modeCount: Record<string, number> = {};
  for (const m of members) {
    modeCount[m.self.mode] = (modeCount[m.self.mode] ?? 0) + 1;
  }

  const n = members.length;
  let sumPi2 = 0;
  for (const count of Object.values(modeCount)) {
    const pi = count / n;
    sumPi2 += pi * pi;
  }

  // Simpson's diversity index: 1 - Σ(pi²)
  return 1 - sumPi2;
}

/**
 * 支配的な計算モードを取得
 */
function getDominantMode(members: LifeEntity[]): ComputationMode {
  const count: Record<ComputationMode, number> = {
    weighted: 0,
    harmonic: 0,
    geometric: 0,
  };
  for (const m of members) {
    count[m.self.mode]++;
  }
  return (Object.entries(count) as [ComputationMode, number][])
    .sort((a, b) => b[1] - a[1])[0][0];
}
