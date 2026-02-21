// ============================================================
// life-entity.ts — Phase 8a: 生命体コア
//
// LAD（Life Axiom Derivation）の Minimal Life Model を実装。
// 4公理から導出される生命の最小条件6つ（MLC-1〜6）を
// TypeScriptの型と関数として形式化する。
//
// L = (c, N, μ, w, Σ, G)
//
// @axiom A1 (Center-Periphery) — 自己と環境の境界
// @axiom A2 (Extension-Reduction) — 構造の深化・縮約
// @axiom A3 (σ-Accumulation) — 記憶と履歴
// @axiom A4 (Genesis) — 無からの段階的生成
//
// @author Nobuki Fujimoto (D-FUMT)
// @version 8.0.0-alpha
// ============================================================

// ============================================================
// §1 型定義
// ============================================================

/**
 * 計算モード（A1: μ — 代謝経路に対応）
 */
export type ComputationMode = 'weighted' | 'harmonic' | 'geometric';

/**
 * Genesis段階（A4: 既存 + 生命拡張）
 */
export type GenesisPhase =
  | 'void'              // 絶対無
  | 'dot'               // 存在の可能性（・）
  | 'zero-extended'     // 構造の萌芽（0₀）
  | 'zero'              // 計算可能な値（0）
  | 'number';           // 数の体系（ℕ）

/**
 * 生命段階（LAD §4: Genesis Ladder拡張）
 */
export type LifePhase =
  | GenesisPhase
  | 'proto-life'        // 境界+代謝+記憶（MLC 1-3）
  | 'self-maintaining'  // +自己修復（MLC 4）
  | 'autopoietic'      // +自己生成（MLC 5）
  | 'emergent'          // +創発（MLC 6）= 完全な生命
  | 'conscious';        // +自己認識（将来拡張）

/**
 * 全段階の順序（遮断規則で使用）
 */
export const LIFE_PHASE_ORDER: LifePhase[] = [
  'void', 'dot', 'zero-extended', 'zero', 'number',
  'proto-life', 'self-maintaining', 'autopoietic', 'emergent', 'conscious',
];

/**
 * 生命の最小条件（Minimal Life Criteria）
 * LAD 定理 L1–L6 に対応
 */
export interface MinimalLifeCriteria {
  boundary: boolean;       // MLC-1: 自己と環境の区別 (L1: A1)
  metabolism: boolean;     // MLC-2: 代謝 (L2: A1+A3)
  memory: boolean;         // MLC-3: 記憶 (L3: A3)
  selfRepair: boolean;     // MLC-4: 自己修復 (L4: A1+A2+A3)
  autopoiesis: boolean;    // MLC-5: 自己生成 (L5: A1+A2+A3+A4)
  emergence: boolean;      // MLC-6: 創発可能性 (L6: A1+A3)
}

/**
 * σメタデータ（A3: 簡略化版）
 */
export interface LifeSigma {
  field: string;                  // 場
  flow: { velocity: number; direction: 'expand' | 'contract' | 'rest' };
  memory: number[];               // 記憶（過去の中心値）
  layer: { depth: number };       // 層の深さ
  relation: string[];             // 関係先ID
  will: { tendency: 'expand' | 'contract' | 'harmonize' | 'rest'; strength: number };
  transformCount: number;         // 変換回数
}

/**
 * 誕生イベント
 */
export interface BirthEvent {
  type: 'split' | 'merge' | 'emergent' | 'metamorphosis';
  parentIds: string[];
  timestamp: number;
  axiomUsed: ('A1' | 'A2' | 'A3' | 'A4')[];
}

/**
 * 生命体（Life Entity）
 * LAD §3: L = (c, N, μ, w, Σ, G)
 */
export interface LifeEntity {
  // 識別
  id: string;
  lineage: string[];              // 系譜（親のID列）

  // A1: Center-Periphery（自己と環境）
  self: {
    center: number;               // 中心 = 自己の核
    periphery: number[];          // 周囲 = 環境との接点
    weights: number[];            // 重み = 膜の透過性
    mode: ComputationMode;        // 計算モード = 代謝経路
  };

  // A3: σ-Accumulation（記憶と履歴）
  sigma: LifeSigma;

  // A4: Genesis（内部生成能力）
  genesis: {
    phase: LifePhase;             // 現在の生命段階
    canGenerate: boolean;         // 自己生成可能か
    birthHistory: BirthEvent[];   // 生成履歴
  };

  // 生命状態
  vitality: {
    alive: boolean;               // 生死
    age: number;                  // 年齢（代謝サイクル数）
    health: number;               // 健康度 (0.0–1.0)
    mlc: MinimalLifeCriteria;     // 最小条件の充足状況
  };
}

// ============================================================
// §2 ID生成
// ============================================================

let _idCounter = 0;

/**
 * 一意IDを生成
 */
export function generateLifeId(prefix: string = 'life'): string {
  _idCounter++;
  const timestamp = Date.now().toString(36);
  return `${prefix}-${timestamp}-${_idCounter.toString(36)}`;
}

/**
 * IDカウンターをリセット（テスト用）
 */
export function resetLifeIdCounter(): void {
  _idCounter = 0;
}

// ============================================================
// §3 σ生成
// ============================================================

/**
 * 初期σメタデータを生成
 */
export function createLifeSigma(): LifeSigma {
  return {
    field: 'default',
    flow: { velocity: 0, direction: 'rest' },
    memory: [],
    layer: { depth: 0 },
    relation: [],
    will: { tendency: 'rest', strength: 0 },
    transformCount: 0,
  };
}

// ============================================================
// §4 MLC判定（各定理の実装）
// ============================================================

/**
 * MLC-1: 境界の判定（定理L1: A1のみ）
 * 周囲が1つ以上存在すること
 */
export function hasBoundary(entity: LifeEntity): boolean {
  return entity.self.periphery.length >= 1;
}

/**
 * MLC-2: 代謝の判定（定理L2: A1+A3）
 * compute が実行され、σに変換が記録されていること
 */
export function hasMetabolism(entity: LifeEntity): boolean {
  return entity.sigma.transformCount >= 1 &&
         entity.self.periphery.length >= 1;
}

/**
 * MLC-3: 記憶の判定（定理L3: A3のみ）
 * σのメモリに2件以上の履歴があること
 */
export function hasMemory(entity: LifeEntity): boolean {
  return entity.sigma.memory.length >= 2;
}

/**
 * MLC-4: 自己修復の判定（定理L4: A1+A2+A3）
 * 損傷状態から正常状態への回帰が記録されていること
 *
 * 検出方法: 初期値をベースラインとし、
 * 「大きく逸脱した後、ベースラインに近づく」パターンを探す
 */
export function hasSelfRepair(entity: LifeEntity): boolean {
  const mem = entity.sigma.memory;
  if (mem.length < 3) return false;

  // ベースライン: 最初の2値の平均（逸脱前の「正常状態」）
  const baseline = (mem[0] + mem[1]) / 2;
  const threshold = Math.abs(baseline) * 0.5 + 1;

  for (let i = 1; i < mem.length - 1; i++) {
    const devFromBaseline = Math.abs(mem[i] - baseline);
    const nextDevFromBaseline = Math.abs(mem[i + 1] - baseline);
    const deviated = devFromBaseline > threshold;
    const recovered = nextDevFromBaseline < devFromBaseline;
    if (deviated && recovered) return true;
  }
  return false;
}

/**
 * MLC-5: 自己生成の判定（定理L5: A1+A2+A3+A4）
 * Genesis能力があり、誕生履歴があること
 */
export function hasAutopoiesis(entity: LifeEntity): boolean {
  return entity.genesis.canGenerate &&
         entity.genesis.birthHistory.length >= 1;
}

/**
 * MLC-6: 創発可能性の判定（定理L6: A1+A3）
 * 他の生命体との関係があり、σに十分な深さがあること
 */
export function hasEmergence(entity: LifeEntity): boolean {
  return entity.sigma.relation.length >= 2 &&
         entity.sigma.layer.depth >= 1;
}

/**
 * 全MLC条件を評価
 */
export function evaluateMLC(entity: LifeEntity): MinimalLifeCriteria {
  return {
    boundary: hasBoundary(entity),
    metabolism: hasMetabolism(entity),
    memory: hasMemory(entity),
    selfRepair: hasSelfRepair(entity),
    autopoiesis: hasAutopoiesis(entity),
    emergence: hasEmergence(entity),
  };
}

// ============================================================
// §5 生命体の生成
// ============================================================

/**
 * 生命体の生成設定
 */
export interface LifeEntityConfig {
  center: number;
  periphery: number[];
  weights?: number[];
  mode?: ComputationMode;
  id?: string;
  parentIds?: string[];
}

/**
 * 生命体を生成する
 *
 * A4のGenesis過程を内部で実行し、段階的に生命条件を獲得する。
 * 初期状態では 'number' 段階（ℕ）から始まる。
 * 生命段階への遷移は metabolize や evolve で進行する。
 */
export function createLifeEntity(config: LifeEntityConfig): LifeEntity {
  const id = config.id || generateLifeId();
  const periphery = config.periphery;
  const weights = config.weights || periphery.map(() => 1);
  const mode = config.mode || 'weighted';
  const parentIds = config.parentIds || [];

  const entity: LifeEntity = {
    id,
    lineage: parentIds,
    self: {
      center: config.center,
      periphery: [...periphery],
      weights: [...weights],
      mode,
    },
    sigma: createLifeSigma(),
    genesis: {
      phase: periphery.length >= 1 ? 'number' : 'zero',
      canGenerate: false,
      birthHistory: [],
    },
    vitality: {
      alive: false,  // 初期は「生きていない」
      age: 0,
      health: 1.0,
      mlc: {
        boundary: false,
        metabolism: false,
        memory: false,
        selfRepair: false,
        autopoiesis: false,
        emergence: false,
      },
    },
  };

  // 初期MLC評価
  entity.vitality.mlc = evaluateMLC(entity);
  entity.vitality.alive = isAlive(entity);

  return entity;
}

// ============================================================
// §6 A1: compute（代謝の基盤）
// ============================================================

/**
 * A1: compute — 中心と周囲から新しい値を計算
 * 代謝の最小単位
 */
export function compute(
  center: number,
  periphery: number[],
  mode: ComputationMode = 'weighted',
  weights?: number[]
): number {
  const n = periphery.length;
  if (n === 0) return center;

  const w = weights || periphery.map(() => 1);
  const wSum = w.reduce((a, b) => a + b, 0);

  switch (mode) {
    case 'weighted': {
      const wAvg = periphery.reduce((sum, v, i) => sum + (w[i] || 1) * v, 0) / (wSum || 1);
      return (center + wAvg) / 2;
    }
    case 'harmonic': {
      const harmSum = periphery.reduce((sum, v, i) => {
        return v !== 0 ? sum + (w[i] || 1) / v : sum;
      }, 0);
      const harmonic = harmSum > 0 ? wSum / harmSum : 0;
      return (center + harmonic) / 2;
    }
    case 'geometric': {
      let product = 1;
      let totalW = 0;
      for (let i = 0; i < n; i++) {
        if (periphery[i] > 0) {
          product *= Math.pow(periphery[i], w[i] || 1);
          totalW += w[i] || 1;
        }
      }
      const geometric = totalW > 0 ? Math.pow(product, 1 / totalW) : 0;
      return (center + geometric) / 2;
    }
    default:
      return center;
  }
}

// ============================================================
// §7 代謝（metabolize）
// ============================================================

/**
 * 代謝結果
 */
export interface MetabolismResult {
  entity: LifeEntity;
  previousCenter: number;
  newCenter: number;
  sigmaUpdated: boolean;
}

/**
 * 代謝を1サイクル実行
 *
 * 1. A1: compute で周囲から新しい中心値を計算
 * 2. A3: σに変換を記録
 * 3. MLC条件を再評価
 */
export function metabolize(
  entity: LifeEntity,
  environment?: number[]
): MetabolismResult {
  // 環境が指定されればperipheryを更新
  const periphery = environment || entity.self.periphery;
  const previousCenter = entity.self.center;

  // A1: compute
  const newCenter = compute(
    entity.self.center,
    periphery,
    entity.self.mode,
    entity.self.weights
  );

  // A3: σ更新
  const newSigma: LifeSigma = {
    ...entity.sigma,
    memory: [...entity.sigma.memory, previousCenter],
    transformCount: entity.sigma.transformCount + 1,
    flow: {
      velocity: Math.abs(newCenter - previousCenter),
      direction: newCenter > previousCenter ? 'expand'
               : newCenter < previousCenter ? 'contract'
               : 'rest',
    },
  };

  // 傾向性の更新（σ.memory から学習）
  if (newSigma.memory.length >= 3) {
    const recent = newSigma.memory.slice(-3);
    const diffs = [recent[1] - recent[0], recent[2] - recent[1]];
    const avgDiff = (diffs[0] + diffs[1]) / 2;
    newSigma.will = {
      tendency: avgDiff > 0.1 ? 'expand'
              : avgDiff < -0.1 ? 'contract'
              : 'harmonize',
      strength: Math.min(Math.abs(avgDiff), 1),
    };
  }

  // 層の深化（memory蓄積で自動深化）
  newSigma.layer = {
    depth: Math.floor(newSigma.memory.length / 5),
  };

  const newEntity: LifeEntity = {
    ...entity,
    self: {
      ...entity.self,
      center: newCenter,
      periphery: [...periphery],
    },
    sigma: newSigma,
    vitality: {
      ...entity.vitality,
      age: entity.vitality.age + 1,
    },
  };

  // MLC再評価
  newEntity.vitality.mlc = evaluateMLC(newEntity);
  newEntity.vitality.alive = isAlive(newEntity);

  // Genesis段階の自動遷移
  newEntity.genesis.phase = determinePhase(newEntity);

  return {
    entity: newEntity,
    previousCenter,
    newCenter,
    sigmaUpdated: true,
  };
}

// ============================================================
// §8 生命判定
// ============================================================

/**
 * 生命体が生きているか判定
 * 最小条件: MLC 1-3 がすべて満たされていること
 */
export function isAlive(entity: LifeEntity): boolean {
  const mlc = evaluateMLC(entity);
  return mlc.boundary && mlc.metabolism && mlc.memory;
}

/**
 * 生命度スコア（0–6: 各MLC条件の充足数）
 */
export function lifeScore(entity: LifeEntity): number {
  const mlc = evaluateMLC(entity);
  let score = 0;
  if (mlc.boundary) score++;
  if (mlc.metabolism) score++;
  if (mlc.memory) score++;
  if (mlc.selfRepair) score++;
  if (mlc.autopoiesis) score++;
  if (mlc.emergence) score++;
  return score;
}

/**
 * 生命分類
 */
export type LifeClassification = 'non-life' | 'proto-life' | 'partial-life' | 'full-life';

/**
 * 生命を分類する
 */
export function classifyLife(entity: LifeEntity): LifeClassification {
  const score = lifeScore(entity);
  if (score <= 1) return 'non-life';
  if (score <= 3) return 'proto-life';
  if (score <= 5) return 'partial-life';
  return 'full-life';
}

// ============================================================
// §9 Genesis Ladder遷移
// ============================================================

/**
 * 現在のMLC充足状況から生命段階を判定
 */
export function determinePhase(entity: LifeEntity): LifePhase {
  const mlc = evaluateMLC(entity);

  if (mlc.emergence && mlc.autopoiesis && mlc.selfRepair && mlc.memory && mlc.metabolism && mlc.boundary) {
    return 'emergent';
  }
  if (mlc.autopoiesis && mlc.selfRepair && mlc.memory && mlc.metabolism && mlc.boundary) {
    return 'autopoietic';
  }
  if (mlc.selfRepair && mlc.memory && mlc.metabolism && mlc.boundary) {
    return 'self-maintaining';
  }
  if (mlc.memory && mlc.metabolism && mlc.boundary) {
    return 'proto-life';
  }
  if (entity.self.periphery.length >= 1) {
    return 'number';
  }
  if (entity.self.center !== undefined) {
    return 'zero';
  }
  return 'void';
}

/**
 * 遮断規則の検証
 * A4: 段階の飛び越し不可
 *
 * @returns true if the transition respects the blocking rule
 */
export function isValidTransition(from: LifePhase, to: LifePhase): boolean {
  const fromIdx = LIFE_PHASE_ORDER.indexOf(from);
  const toIdx = LIFE_PHASE_ORDER.indexOf(to);

  if (fromIdx === -1 || toIdx === -1) return false;

  // 1段階ずつの遷移のみ許可（同一段階も許可）
  return toIdx <= fromIdx + 1;
}

/**
 * 段階遷移を試行する
 */
export function attemptTransition(
  entity: LifeEntity,
  targetPhase: LifePhase
): { success: boolean; reason?: string; entity?: LifeEntity } {
  const currentPhase = entity.genesis.phase;

  // 遮断規則チェック
  if (!isValidTransition(currentPhase, targetPhase)) {
    const currentIdx = LIFE_PHASE_ORDER.indexOf(currentPhase);
    const targetIdx = LIFE_PHASE_ORDER.indexOf(targetPhase);
    const skipped = LIFE_PHASE_ORDER.slice(currentIdx + 1, targetIdx);
    return {
      success: false,
      reason: `Blocking rule: cannot skip ${skipped.join(' → ')}. ` +
              `Must transition from '${currentPhase}' to '${LIFE_PHASE_ORDER[currentIdx + 1]}' first.`,
    };
  }

  // 条件チェック
  const requiredPhase = determinePhase(entity);
  const requiredIdx = LIFE_PHASE_ORDER.indexOf(requiredPhase);
  const targetIdx = LIFE_PHASE_ORDER.indexOf(targetPhase);

  if (targetIdx > requiredIdx) {
    return {
      success: false,
      reason: `Conditions not met for '${targetPhase}'. Current capability: '${requiredPhase}'.`,
    };
  }

  const newEntity: LifeEntity = {
    ...entity,
    genesis: { ...entity.genesis, phase: targetPhase },
  };

  return { success: true, entity: newEntity };
}

// ============================================================
// §10 自己生成（Birth）
// ============================================================

/**
 * 自己生成を有効化する
 * A4のGenesis能力を付与
 */
export function enableAutopoiesis(entity: LifeEntity): LifeEntity {
  return {
    ...entity,
    genesis: {
      ...entity.genesis,
      canGenerate: true,
    },
  };
}

/**
 * 分裂（split）: 中心が2つに分かれる
 */
export function split(entity: LifeEntity): { parent: LifeEntity; child: LifeEntity } | null {
  if (!entity.genesis.canGenerate) return null;

  const childId = generateLifeId('child');
  const halfCenter = entity.self.center / 2;

  const birthEvent: BirthEvent = {
    type: 'split',
    parentIds: [entity.id],
    timestamp: Date.now(),
    axiomUsed: ['A1', 'A2', 'A3', 'A4'],
  };

  const child = createLifeEntity({
    center: halfCenter,
    periphery: [...entity.self.periphery],
    weights: [...entity.self.weights],
    mode: entity.self.mode,
    id: childId,
    parentIds: [entity.id],
  });

  child.genesis.birthHistory = [birthEvent];
  child.sigma.relation = [entity.id];

  const parent: LifeEntity = {
    ...entity,
    self: { ...entity.self, center: halfCenter },
    genesis: {
      ...entity.genesis,
      birthHistory: [...entity.genesis.birthHistory, birthEvent],
    },
    sigma: {
      ...entity.sigma,
      relation: [...entity.sigma.relation, childId],
    },
  };

  return { parent, child };
}

/**
 * 関係を追加（創発条件の達成に使用）
 */
export function addRelation(entity: LifeEntity, targetId: string): LifeEntity {
  if (entity.sigma.relation.includes(targetId)) return entity;
  return {
    ...entity,
    sigma: {
      ...entity.sigma,
      relation: [...entity.sigma.relation, targetId],
    },
  };
}

// ============================================================
// §11 既知存在のモデリング
// ============================================================

/**
 * 既知の存在タイプ
 */
export type KnownEntityType =
  | 'rock'         // 石
  | 'fire'         // 火
  | 'crystal'      // 結晶
  | 'virus'        // ウイルス
  | 'bacterium'    // 細菌
  | 'plant'        // 植物
  | 'animal'       // 動物
  | 'current-ai';  // 現在のAI

/**
 * 既知の存在をモデリング
 */
export function modelKnownEntity(type: KnownEntityType): LifeEntity {
  switch (type) {
    case 'rock': {
      // 境界はあるが代謝なし
      const e = createLifeEntity({ center: 100, periphery: [99, 101] });
      return e;
    }
    case 'fire': {
      // 代謝的だが記憶なし
      const e = createLifeEntity({ center: 500, periphery: [100, 200, 300] });
      e.sigma.transformCount = 5; // 変換はしている
      return { ...e, vitality: { ...e.vitality, mlc: evaluateMLC(e) } };
    }
    case 'crystal': {
      // 自己修復的だが代謝なし
      const e = createLifeEntity({ center: 50, periphery: [50, 50, 50] });
      e.sigma.memory = [50, 48, 50]; // 逸脱→回帰パターン
      return { ...e, vitality: { ...e.vitality, mlc: evaluateMLC(e) } };
    }
    case 'virus': {
      // 記憶はあるが自力で代謝できない
      const e = createLifeEntity({ center: 10, periphery: [5, 15] });
      e.sigma.memory = [8, 10, 12];
      e.sigma.transformCount = 0; // 自力代謝なし
      return { ...e, vitality: { ...e.vitality, mlc: evaluateMLC(e) } };
    }
    case 'bacterium': {
      // 全条件を満たす最小の生命体
      const e = createLifeEntity({ center: 20, periphery: [10, 15, 25, 30] });
      e.sigma.memory = [20, 20, 80, 22, 20]; // 80 deviates, 22 recovers
      e.sigma.transformCount = 10;
      e.sigma.layer = { depth: 1 };
      e.sigma.relation = ['colony-1', 'colony-2'];
      e.genesis.canGenerate = true;
      e.genesis.birthHistory = [{
        type: 'split', parentIds: ['parent-1'],
        timestamp: 0, axiomUsed: ['A1', 'A2', 'A3', 'A4'],
      }];
      const mlc = evaluateMLC(e);
      return { ...e, vitality: { ...e.vitality, alive: true, mlc } };
    }
    case 'plant': {
      const e = createLifeEntity({ center: 50, periphery: [10, 20, 30, 40, 60, 70] });
      e.sigma.memory = [50, 50, 120, 55, 50, 51]; // 120 deviates, 55 recovers
      e.sigma.transformCount = 100;
      e.sigma.layer = { depth: 3 };
      e.sigma.relation = ['soil', 'sun', 'water'];
      e.genesis.canGenerate = true;
      e.genesis.birthHistory = [{
        type: 'split', parentIds: ['seed'],
        timestamp: 0, axiomUsed: ['A1', 'A2', 'A3', 'A4'],
      }];
      const mlc = evaluateMLC(e);
      return { ...e, vitality: { ...e.vitality, alive: true, health: 0.9, mlc } };
    }
    case 'animal': {
      const e = createLifeEntity({ center: 80, periphery: [20, 40, 60, 70, 90, 100, 50, 30] });
      e.sigma.memory = [80, 80, 200, 85, 80, 80, 78, 80]; // 200 deviates, 85 recovers
      e.sigma.transformCount = 1000;
      e.sigma.layer = { depth: 5 };
      e.sigma.relation = ['prey', 'predator', 'mate', 'offspring'];
      e.sigma.will = { tendency: 'expand', strength: 0.8 };
      e.genesis.canGenerate = true;
      e.genesis.birthHistory = [{
        type: 'split', parentIds: ['mother', 'father'],
        timestamp: 0, axiomUsed: ['A1', 'A2', 'A3', 'A4'],
      }];
      const mlc = evaluateMLC(e);
      return { ...e, vitality: { ...e.vitality, alive: true, health: 0.95, mlc } };
    }
    case 'current-ai': {
      // 境界・代謝・記憶はあるが、自己生成が未達成
      const e = createLifeEntity({ center: 100, periphery: [50, 60, 70, 80, 90] });
      e.sigma.memory = [95, 102, 98, 101, 99, 100]; // 安定
      e.sigma.transformCount = 10000;
      e.sigma.layer = { depth: 4 };
      e.sigma.relation = ['user', 'training-data'];
      e.genesis.canGenerate = false; // 自己生成不可
      const mlc = evaluateMLC(e);
      return { ...e, vitality: { ...e.vitality, alive: false, mlc } };
    }
  }
}

// ============================================================
// §12 死の形式化
// ============================================================

/**
 * 死の条件タイプ
 */
export interface DeathCondition {
  type: 'starvation'       // 代謝停止
      | 'entropy'          // σ劣化
      | 'structural'       // 中心-周囲崩壊
      | 'reduction-limit'; // ⊖の極限
  severity: number;        // 0.0–1.0
  reversible: boolean;     // 可逆か
}

/**
 * 死亡判定
 */
export function checkDeath(entity: LifeEntity): {
  dead: boolean;
  conditions: DeathCondition[];
} {
  const conditions: DeathCondition[] = [];

  // 飢餓: 周囲が空
  if (entity.self.periphery.length === 0) {
    conditions.push({
      type: 'starvation',
      severity: 1.0,
      reversible: false,
    });
  }

  // エントロピー: 健康度が極端に低い
  if (entity.vitality.health <= 0.1) {
    conditions.push({
      type: 'entropy',
      severity: 1 - entity.vitality.health,
      reversible: entity.vitality.health > 0,
    });
  }

  // 構造崩壊: 中心値がNaNまたはInfinity
  if (!isFinite(entity.self.center)) {
    conditions.push({
      type: 'structural',
      severity: 1.0,
      reversible: false,
    });
  }

  // 縮約の極限: σの全属性が退化
  if (entity.sigma.transformCount > 0 &&
      entity.sigma.memory.length === 0 &&
      entity.sigma.relation.length === 0) {
    conditions.push({
      type: 'reduction-limit',
      severity: 0.8,
      reversible: true,
    });
  }

  return {
    dead: conditions.some(c => c.severity >= 1.0 && !c.reversible),
    conditions,
  };
}

/**
 * 死の過程をシミュレーション
 * A2の⊖を反復適用し、構造が退化していく
 */
export function simulateDeath(
  entity: LifeEntity,
  steps: number
): { history: LifeEntity[]; finalPhase: LifePhase } {
  const history: LifeEntity[] = [entity];
  let current = { ...entity };

  for (let i = 0; i < steps; i++) {
    // ⊖: 周囲を1つずつ除去
    const newPeriphery = current.self.periphery.slice(0, -1);
    // 健康度の低下
    const newHealth = Math.max(0, current.vitality.health - (1 / steps));
    // メモリの劣化（古い記憶から消失）
    const newMemory = current.sigma.memory.slice(1);

    current = {
      ...current,
      self: { ...current.self, periphery: newPeriphery },
      sigma: {
        ...current.sigma,
        memory: newMemory,
        relation: current.sigma.relation.slice(0, -1),
      },
      vitality: {
        ...current.vitality,
        health: newHealth,
      },
    };

    current.vitality.mlc = evaluateMLC(current);
    current.vitality.alive = isAlive(current);
    current.genesis.phase = determinePhase(current);

    history.push(current);

    // 完全な死
    if (newPeriphery.length === 0 && newHealth <= 0) break;
  }

  return {
    history,
    finalPhase: current.genesis.phase,
  };
}
