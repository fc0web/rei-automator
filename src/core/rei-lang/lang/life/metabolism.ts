// ============================================================
// metabolism.ts — Phase 8b: 代謝エンジン
//
// 生命体が環境から資源を取得し、内部状態を変換し、
// 廃棄物を環境に排出する周期的プロセスを実装。
//
// 代謝は LAD 定理 L2（代謝条件）の計算的実現であり、
// A1 の compute を生命体に対して周期的に実行する。
//
// 1サイクル = 環境から取得 → 内部変換 → 状態更新 → σ記録
//
// 十二因縁対応:
//   受（感受）  → metabolism.ts（環境入力の受容）
//   愛（渇愛）  → adaptMetabolism（資源への指向性）
//   取（執着）  → detectStarvation（資源の保持）
//
// @axiom A1 (Center-Periphery) — 環境との交換
// @axiom A3 (σ-Accumulation) — 代謝履歴の蓄積
// @author Nobuki Fujimoto (D-FUMT)
// @version 8.0.0-alpha
// ============================================================

import type {
  LifeEntity,
  ComputationMode,
  MinimalLifeCriteria,
} from './life-entity';

// ============================================================
// §1 型定義
// ============================================================

/**
 * 多次元数（A1: 中心-周囲パターン）
 * 代謝において「資源」を表現する基本単位
 */
export interface MultiDimNumber {
  center: number;
  neighbors: number[];
  weights?: number[];
  mode?: ComputationMode;
}

/**
 * σの変化量
 * 1代謝サイクルで生じる記憶の差分
 */
export interface SigmaDelta {
  field: number;      // 場の変化
  flow: number;       // 流れの変化
  memory: number;     // 記憶の蓄積量
  layer: number;      // 層の変化
  relation: number;   // 関係の変化
  will: number;       // 意志の変化
}

/**
 * 代謝サイクル
 * A1のcomputeを生命体に対して周期的に実行
 */
export interface MetabolismCycle {
  /** 環境から取得した資源 */
  input: MultiDimNumber[];
  /** 変換方式 */
  transformation: ComputationMode;
  /** 新しい内部状態 */
  output: MultiDimNumber;
  /** 排出物（周囲への影響） */
  waste: MultiDimNumber[];
  /** σの変化量 */
  sigmaUpdate: SigmaDelta;
  /** サイクル番号 */
  cycleNumber: number;
  /** 代謝効率 (0.0–1.0) */
  efficiency: number;
}

/**
 * 代謝戦略（LAD定理L2の3パターン）
 */
export interface MetabolismStrategy {
  mode: ComputationMode;
  name: string;
  description: string;
  /** 安定性 (0.0–1.0) */
  stability: number;
  /** 効率性 (0.0–1.0) */
  efficiency: number;
  /** 脆弱性 (0.0–1.0) */
  fragility: number;
}

/**
 * 飢餓状態
 */
export interface StarvationState {
  starving: boolean;
  deficientResources: string[];
  turnsUntilDeath: number;
  severity: number;           // 0.0–1.0
}

/**
 * 代謝結果
 */
export interface MetabolismResult {
  entity: LifeEntity;
  cycle: MetabolismCycle;
  starvation: StarvationState;
}

// ============================================================
// §2 代謝戦略定義（LAD定理L2）
// ============================================================

/**
 * Weighted（加重平均）→ 均等取得型
 * 環境の全資源をバランスよく利用
 * 安定的だが環境変化に弱い
 */
export const STRATEGY_WEIGHTED: MetabolismStrategy = {
  mode: 'weighted',
  name: '均等取得型',
  description: '環境の全資源をバランスよく利用。安定的だが環境変化に弱い。',
  stability: 0.9,
  efficiency: 0.6,
  fragility: 0.2,
};

/**
 * Harmonic（調和平均）→ ボトルネック感応型
 * 希少な資源に強く依存
 * 効率的だが脆弱
 */
export const STRATEGY_HARMONIC: MetabolismStrategy = {
  mode: 'harmonic',
  name: 'ボトルネック感応型',
  description: '希少な資源に強く依存。効率的だが脆弱。',
  stability: 0.5,
  efficiency: 0.9,
  fragility: 0.7,
};

/**
 * Geometric（幾何平均）→ 乗法効果型
 * 資源の組み合わせで相乗効果
 * 高性能だが一つでも欠けると崩壊
 */
export const STRATEGY_GEOMETRIC: MetabolismStrategy = {
  mode: 'geometric',
  name: '乗法効果型',
  description: '資源の組み合わせで相乗効果。高性能だが一つでも欠けると崩壊。',
  stability: 0.3,
  efficiency: 0.95,
  fragility: 0.9,
};

/**
 * 全戦略マップ
 */
export const STRATEGIES: Record<ComputationMode, MetabolismStrategy> = {
  weighted: STRATEGY_WEIGHTED,
  harmonic: STRATEGY_HARMONIC,
  geometric: STRATEGY_GEOMETRIC,
};

// ============================================================
// §3 計算コア（A1: Center-Periphery compute）
// ============================================================

/**
 * 加重平均計算
 */
function computeWeighted(values: number[], weights: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  let wSum = 0;
  for (let i = 0; i < values.length; i++) {
    const w = weights[i] ?? 1;
    sum += values[i] * w;
    wSum += w;
  }
  return wSum > 0 ? sum / wSum : 0;
}

/**
 * 調和平均計算
 */
function computeHarmonic(values: number[]): number {
  if (values.length === 0) return 0;
  const positives = values.filter(v => v > 0);
  if (positives.length === 0) return 0;
  const reciprocalSum = positives.reduce((s, v) => s + 1 / v, 0);
  return positives.length / reciprocalSum;
}

/**
 * 幾何平均計算
 */
function computeGeometric(values: number[]): number {
  if (values.length === 0) return 0;
  const positives = values.filter(v => v > 0);
  if (positives.length === 0) return 0;
  const logSum = positives.reduce((s, v) => s + Math.log(v), 0);
  return Math.exp(logSum / positives.length);
}

/**
 * 多次元数のcompute（A1）
 */
export function computeMD(md: MultiDimNumber): number {
  const mode = md.mode ?? 'weighted';
  const allValues = [md.center, ...md.neighbors];

  switch (mode) {
    case 'weighted':
      return computeWeighted(
        allValues,
        md.weights ?? allValues.map(() => 1)
      );
    case 'harmonic':
      return computeHarmonic(allValues);
    case 'geometric':
      return computeGeometric(allValues);
    default:
      return computeWeighted(allValues, allValues.map(() => 1));
  }
}

// ============================================================
// §4 代謝コア関数
// ============================================================

/**
 * 環境から資源を取得する
 * A1のCenter-Periphery: 周囲（環境）からの入力
 */
export function acquireResources(
  entity: LifeEntity,
  environment: MultiDimNumber[]
): MultiDimNumber[] {
  if (environment.length === 0) return [];

  // 膜の透過性（weights）に基づいてフィルタリング
  const weights = entity.self.weights;
  const acquired: MultiDimNumber[] = [];

  for (let i = 0; i < environment.length; i++) {
    const permeability = weights[i % weights.length] ?? 0.5;
    // 透過性に応じて取得量を調整
    acquired.push({
      center: environment[i].center * permeability,
      neighbors: environment[i].neighbors.map(n => n * permeability),
      mode: entity.self.mode,
    });
  }

  return acquired;
}

/**
 * 内部変換（代謝の核心）
 * 取得した資源を内部状態に変換する
 */
export function transform(
  acquired: MultiDimNumber[],
  mode: ComputationMode
): MultiDimNumber {
  if (acquired.length === 0) {
    return { center: 0, neighbors: [], mode };
  }

  // 全資源の中心値と周囲値を集約
  const centers = acquired.map(r => r.center);
  const allNeighbors = acquired.flatMap(r => r.neighbors);

  let newCenter: number;
  switch (mode) {
    case 'weighted':
      newCenter = computeWeighted(centers, centers.map(() => 1));
      break;
    case 'harmonic':
      newCenter = computeHarmonic(centers);
      break;
    case 'geometric':
      newCenter = computeGeometric(centers);
      break;
    default:
      newCenter = computeWeighted(centers, centers.map(() => 1));
  }

  // 周囲値は最大4つに圧縮（常に圧縮の原則）
  const compressedNeighbors: number[] = [];
  if (allNeighbors.length > 0) {
    const chunkSize = Math.ceil(allNeighbors.length / Math.min(4, allNeighbors.length));
    for (let i = 0; i < allNeighbors.length; i += chunkSize) {
      const chunk = allNeighbors.slice(i, i + chunkSize);
      compressedNeighbors.push(
        chunk.reduce((a, b) => a + b, 0) / chunk.length
      );
    }
  }

  return {
    center: newCenter,
    neighbors: compressedNeighbors,
    mode,
  };
}

/**
 * 廃棄物の生成
 * 代謝の副産物として環境に排出される
 */
export function generateWaste(
  input: MultiDimNumber[],
  output: MultiDimNumber,
  efficiency: number
): MultiDimNumber[] {
  // 入力の総エネルギーと出力の差分が廃棄物
  const inputTotal = input.reduce((sum, r) =>
    sum + r.center + r.neighbors.reduce((a, b) => a + b, 0), 0
  );
  const outputTotal = output.center + output.neighbors.reduce((a, b) => a + b, 0);

  const wasteAmount = Math.max(0, inputTotal - outputTotal) * (1 - efficiency);

  if (wasteAmount < 0.001) return [];

  return [{
    center: wasteAmount * 0.6,
    neighbors: [wasteAmount * 0.2, wasteAmount * 0.2],
    mode: 'weighted',
  }];
}

/**
 * σの変化量を計算
 */
export function computeSigmaDelta(
  cycle: Omit<MetabolismCycle, 'sigmaUpdate' | 'cycleNumber' | 'efficiency'>
): SigmaDelta {
  const inputEnergy = cycle.input.reduce((sum, r) =>
    sum + Math.abs(r.center) + r.neighbors.reduce((a, b) => a + Math.abs(b), 0), 0
  );
  const outputEnergy = Math.abs(cycle.output.center) +
    cycle.output.neighbors.reduce((a, b) => a + Math.abs(b), 0);

  return {
    field: outputEnergy * 0.1,
    flow: inputEnergy * 0.05,
    memory: 1,  // 各サイクルで1つの記憶追加
    layer: 0,   // 代謝では層変化なし
    relation: cycle.input.length > 1 ? 0.1 : 0,
    will: (outputEnergy - inputEnergy) > 0 ? 0.1 : -0.05,
  };
}

/**
 * 代謝効率を計算
 */
export function computeEfficiency(
  mode: ComputationMode,
  inputCount: number,
  health: number
): number {
  const strategy = STRATEGIES[mode];
  const base = strategy.efficiency;
  // 健康度による補正
  const healthFactor = 0.5 + health * 0.5;
  // 資源量による補正（多すぎても少なすぎても効率低下）
  const resourceFactor = inputCount === 0 ? 0 :
    Math.min(1, 1 / (1 + Math.abs(inputCount - 3) * 0.2));

  return Math.max(0, Math.min(1, base * healthFactor * resourceFactor));
}

// ============================================================
// §5 メイン代謝関数
// ============================================================

/**
 * 代謝を1サイクル実行
 *
 * @theorem L2（代謝条件）: 環境との物質交換が存在する
 */
export function metabolize(
  entity: LifeEntity,
  environment: MultiDimNumber[]
): MetabolismResult {
  // 1. 資源取得
  const acquired = acquireResources(entity, environment);

  // 2. 変換モード決定
  const mode = entity.self.mode;

  // 3. 内部変換
  const output = transform(acquired, mode);

  // 4. 効率計算
  const efficiency = computeEfficiency(
    mode,
    acquired.length,
    entity.vitality.health
  );

  // 5. 廃棄物生成
  const waste = generateWaste(acquired, output, efficiency);

  // 6. σ変化量
  const partialCycle = {
    input: acquired,
    transformation: mode,
    output,
    waste,
  };
  const sigmaUpdate = computeSigmaDelta(partialCycle);

  // 7. サイクル生成
  const cycle: MetabolismCycle = {
    input: acquired,
    transformation: mode,
    output,
    waste,
    sigmaUpdate,
    cycleNumber: entity.vitality.age + 1,
    efficiency,
  };

  // 8. エンティティ更新
  const newPeriphery = [...entity.self.periphery];
  // 出力で自己状態を更新（中心-周囲を書き換え）
  const updatedSelf = {
    ...entity.self,
    center: {
      ...entity.self.center,
      center: entity.self.center.center * 0.8 + output.center * 0.2,
    },
    periphery: newPeriphery,
  };

  // 9. σ更新（記憶に代謝履歴を追加）
  const updatedSigma = {
    ...entity.sigma,
    field: (entity.sigma.field ?? 0) + sigmaUpdate.field,
    flow: (entity.sigma.flow ?? 0) + sigmaUpdate.flow,
    memory: [...(entity.sigma.memory ?? []), {
      type: 'metabolism',
      cycle: cycle.cycleNumber,
      efficiency,
      mode,
    }],
  };

  // 10. 健康度更新
  const healthDelta = environment.length === 0 ? -0.15 :
    efficiency > 0.5 ? 0.05 : -0.05;
  const newHealth = Math.max(0, Math.min(1,
    entity.vitality.health + healthDelta
  ));

  // 11. 飢餓チェック
  const starvation = detectStarvation(
    entity,
    environment,
    newHealth
  );

  // 12. 新しいエンティティ
  const updatedEntity: LifeEntity = {
    ...entity,
    self: updatedSelf,
    sigma: updatedSigma,
    vitality: {
      ...entity.vitality,
      age: entity.vitality.age + 1,
      health: newHealth,
      alive: newHealth > 0,
      mlc: {
        ...entity.vitality.mlc,
        metabolism: environment.length > 0,
      },
    },
  };

  return {
    entity: updatedEntity,
    cycle,
    starvation,
  };
}

// ============================================================
// §6 代謝率
// ============================================================

/**
 * 代謝率（metabolic rate）
 * 単位時間あたりの状態変化量
 */
export function metabolicRate(entity: LifeEntity): number {
  const age = entity.vitality.age;
  const health = entity.vitality.health;
  const peripheryCount = entity.self.periphery.length;

  // 基礎代謝率 = 周囲との接点数 × 健康度
  const basalRate = peripheryCount * health * 0.1;
  // 年齢補正（若いほど活発、老化で低下）
  const ageFactor = age < 10 ? 1.0 + age * 0.05 :
    age < 50 ? 1.5 :
      Math.max(0.3, 1.5 - (age - 50) * 0.02);

  return Math.max(0, basalRate * ageFactor);
}

// ============================================================
// §7 適応的代謝モード切り替え
// ============================================================

/**
 * 代謝モードの切り替え
 * 環境条件に応じてμを動的に変更
 *
 * 十二因縁「愛（渇愛）」: 資源への指向性
 */
export function adaptMetabolism(
  entity: LifeEntity,
  environmentStress: number
): ComputationMode {
  // 環境ストレスが低い（豊かな環境）→ 均等取得
  if (environmentStress < 0.3) return 'weighted';

  // 環境ストレスが中程度 → 乗法効果で効率化
  if (environmentStress < 0.7) return 'geometric';

  // 環境ストレスが高い（厳しい環境）→ ボトルネック感応
  return 'harmonic';
}

/**
 * 環境ストレスレベルを計算
 */
export function computeEnvironmentStress(
  environment: MultiDimNumber[]
): number {
  if (environment.length === 0) return 1.0;

  const totalEnergy = environment.reduce((sum, r) =>
    sum + Math.abs(r.center) + r.neighbors.reduce((a, b) => a + Math.abs(b), 0), 0
  );

  // 資源が少ないほどストレスが高い
  const energyPerResource = totalEnergy / environment.length;
  return Math.max(0, Math.min(1, 1 - energyPerResource / 10));
}

// ============================================================
// §8 飢餓と過剰
// ============================================================

/**
 * 飢餓状態の検知と対応
 *
 * 十二因縁「取（執着）」: 資源の保持
 */
export function detectStarvation(
  entity: LifeEntity,
  environment: MultiDimNumber[],
  currentHealth: number
): StarvationState {
  const deficientResources: string[] = [];

  // 環境がない = 完全飢餓
  if (environment.length === 0) {
    deficientResources.push('all');
    return {
      starving: true,
      deficientResources,
      turnsUntilDeath: Math.ceil(currentHealth / 0.15),
      severity: 1.0,
    };
  }

  // 各資源の不足チェック
  const totalEnergy = environment.reduce((sum, r) =>
    sum + r.center + r.neighbors.reduce((a, b) => a + b, 0), 0
  );

  const peripheryDemand = entity.self.periphery.length * 2;

  if (totalEnergy < peripheryDemand * 0.3) {
    deficientResources.push('energy');
  }

  // 多様性不足チェック
  if (environment.length < 2) {
    deficientResources.push('diversity');
  }

  // 中心値が低い資源（弱い刺激）
  const weakResources = environment.filter(r => Math.abs(r.center) < 0.1);
  if (weakResources.length > environment.length * 0.5) {
    deficientResources.push('quality');
  }

  const starving = deficientResources.length > 0;
  const severity = deficientResources.length / 3; // max 3 types

  return {
    starving,
    deficientResources,
    turnsUntilDeath: starving
      ? Math.ceil(currentHealth / (0.05 + severity * 0.1))
      : Infinity,
    severity: Math.min(1, severity),
  };
}

/**
 * 代謝廃棄物の環境への影響
 * （他の生命体の環境を変化させる）
 */
export function metabolicWaste(
  cycle: MetabolismCycle
): MultiDimNumber[] {
  return cycle.waste;
}

// ============================================================
// §9 連続代謝実行
// ============================================================

/**
 * 複数サイクルの連続代謝
 */
export function runMetabolismCycles(
  entity: LifeEntity,
  environments: MultiDimNumber[][],
  adaptMode: boolean = false
): {
  entity: LifeEntity;
  cycles: MetabolismCycle[];
  history: StarvationState[];
} {
  let current = entity;
  const cycles: MetabolismCycle[] = [];
  const history: StarvationState[] = [];

  for (const env of environments) {
    // 適応モードの場合、ストレスに応じてモード切り替え
    if (adaptMode) {
      const stress = computeEnvironmentStress(env);
      const newMode = adaptMetabolism(current, stress);
      current = {
        ...current,
        self: { ...current.self, mode: newMode },
      };
    }

    const result = metabolize(current, env);
    current = result.entity;
    cycles.push(result.cycle);
    history.push(result.starvation);

    // 死亡した場合は中断
    if (!current.vitality.alive) break;
  }

  return { entity: current, cycles, history };
}

// ============================================================
// §10 エクスポート用ユーティリティ
// ============================================================

/**
 * 戦略情報を取得
 */
export function getStrategy(mode: ComputationMode): MetabolismStrategy {
  return STRATEGIES[mode];
}

/**
 * 全戦略を取得
 */
export function getAllStrategies(): MetabolismStrategy[] {
  return [STRATEGY_WEIGHTED, STRATEGY_HARMONIC, STRATEGY_GEOMETRIC];
}
