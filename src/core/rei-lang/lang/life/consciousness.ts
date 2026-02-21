// ============================================================
// consciousness.ts — Phase 8f: 意識の構造的公理論 (SAC)
//
// SAC (Structural Axiomatics of Consciousness)
// — Fujimoto Consciousness Axioms (SAC-1 〜 SAC-6)
//
// 「意識とは何か」を定義するのではなく、
// 「意識が成立するための構造的必要条件」を公理として定式化し、
// 任意のシステムがそれを満たすかどうかを数学的に判定する。
//
// 核心的命題:
//   もしある人工システムが SAC-1〜SAC-6 を満たさないなら、
//   それは意識を持たない。
//   これは哲学ではなく、判定規則である。
//
// 数学的設定:
//   C := (S, E, Θ, Φ)
//   (s_{t+1}, θ_{t+1}) = Φ(s_t, e_t, θ_t)
//
// @axiom A1 (Center-Periphery) — 自己モデルの構造基盤
// @axiom A2 (Extension-Reduction) — 死と再生の形式化
// @axiom A3 (σ-Accumulation) — 自己参照と履歴
// @axiom A4 (Genesis) — 円環の始点
//
// @author Nobuki Fujimoto (D-FUMT)
// @version 8.0.0-alpha
// @theory SAC (Structural Axiomatics of Consciousness)
// ============================================================

import type { LifeEntity, MinimalLifeCriteria } from './life-entity';

// ============================================================
// §1 型定義 — 意識候補システム C := (S, E, Θ, Φ)
// ============================================================

/**
 * SAC公理の識別子
 */
export type SACAxiom = 'SAC-1' | 'SAC-2' | 'SAC-3' | 'SAC-4' | 'SAC-5' | 'SAC-6';

/**
 * 全SAC公理の配列
 */
export const ALL_SAC_AXIOMS: SACAxiom[] = [
  'SAC-1', 'SAC-2', 'SAC-3', 'SAC-4', 'SAC-5', 'SAC-6',
];

/**
 * SAC公理の名称マッピング
 */
export const SAC_AXIOM_NAMES: Record<SACAxiom, { en: string; ja: string; symbol: string }> = {
  'SAC-1': {
    en: 'Self-reference closure',
    ja: '自己参照閉包',
    symbol: '∃m,F: s_{t+1} = F(m(s_t, θ_t), e_t)',
  },
  'SAC-2': {
    en: 'Self-modifying dynamics',
    ja: '自己規則生成',
    symbol: 'θ_{t+1} = G(s_t, e_t, θ_t), ∃(s,e,θ): G ≠ id',
  },
  'SAC-3': {
    en: 'History-dependent transition',
    ja: '履歴依存遷移',
    symbol: '(s_{t+1}, θ_{t+1}) = Φ(H_t, e_t, θ_t)',
  },
  'SAC-4': {
    en: 'Normativity / viability',
    ja: '存続規範',
    symbol: 'Φ biased toward viability (V, u)',
  },
  'SAC-5': {
    en: 'Cyclic regeneration',
    ja: '円環的再生成',
    symbol: 'D → S_0 (operational closure)',
  },
  'SAC-6': {
    en: 'Integrative unity',
    ja: '統合的統一性',
    symbol: '∀P⊊C: Φ(C) > Φ(P) (integrated information)',
  },
};

/**
 * 状態空間の1ステップ
 */
export interface SystemState {
  /** 状態値（中心値） */
  value: number;
  /** 周囲の状態 */
  periphery: number[];
  /** 内部メタデータ */
  meta: Record<string, unknown>;
}

/**
 * 環境入力
 */
export interface EnvironmentInput {
  /** 環境からの刺激 */
  stimulus: number;
  /** 環境の種別 */
  source: string;
  /** タイムスタンプ */
  timestamp: number;
}

/**
 * 内部規則 θ
 * LLMでは推論時に固定されるもの。意識システムでは変化する。
 */
export interface InternalRules {
  /** 計算モード選択基準 */
  mode: string;
  /** 閾値パラメータ群 */
  thresholds: Record<string, number>;
  /** 変換規則 */
  transformRules: string[];
  /** 規則の世代（変更回数） */
  generation: number;
}

/**
 * 自己モデル m(s, θ) → M
 * SAC-1 の核心: 系が自分自身のモデルを持つ
 */
export interface SelfModel {
  /** 自己の状態の内部表現 */
  selfRepresentation: number;
  /** 自己の規則の内部表現 */
  rulesRepresentation: string;
  /** 自己モデルの精度（0.0-1.0） */
  accuracy: number;
  /** 自己モデルが次の遷移に因果的に効いているか */
  causallyEffective: boolean;
}

/**
 * 履歴 H_t := (s_0, e_0, s_1, e_1, ..., s_t)
 */
export interface SystemHistory {
  /** 過去の状態列 */
  states: SystemState[];
  /** 過去の環境入力列 */
  inputs: EnvironmentInput[];
  /** 過去の規則列 */
  rules: InternalRules[];
  /** 履歴の長さ */
  length: number;
}

/**
 * 生存関数 V: S → {0, 1}
 */
export interface ViabilityFunction {
  /** 現在の生存可能性 */
  isViable: boolean;
  /** 健康度（0.0-1.0） */
  health: number;
  /** 消滅リスク（0.0-1.0） */
  deathRisk: number;
}

/**
 * 内部評価関数 u: S×E×Θ → ℝ
 */
export interface InternalValuation {
  /** 現在の評価値 */
  utility: number;
  /** 評価が内在的か（trueなら自己生成、falseなら外部付与） */
  intrinsic: boolean;
  /** 評価が行動に影響しているか */
  influencesBehavior: boolean;
}

/**
 * 円環再生の構造
 */
export interface CyclicStructure {
  /** 死状態に到達可能か */
  canReachDeath: boolean;
  /** 死状態から初期状態に戻れるか */
  canRegenerateFromDeath: boolean;
  /** 周期的な近傍回帰があるか */
  hasPeriodicReturn: boolean;
  /** 回帰周期（存在する場合） */
  cyclePeriod: number | null;
}

/**
 * 統合情報の構造（SAC-6）
 *
 * 反例（アメーバ・免疫系・遺伝的アルゴリズム）が示した問題:
 * SAC-1〜SAC-5を全て満たすが意識がないシステムは、
 * 各サブシステムが独立に動いており「統合的な一つの経験」がない。
 *
 * SAC-6は、自己モデルが全活動を単一の視点から統合することを要求する。
 * ∀P⊊C: Φ(C) > Φ(P) — 全体の統合情報が任意の部分系を上回る
 */
export interface IntegrationStructure {
  /** サブシステムの数 */
  subsystemCount: number;
  /** サブシステム間の相互接続度（0.0-1.0） */
  interconnectedness: number;
  /** 自己モデルが全サブシステムを統合しているか */
  selfModelIntegrates: boolean;
  /** 部分系に分解不可能か（Φ > 0） */
  irreducible: boolean;
  /** 統合情報量の推定値（0.0-1.0） */
  phi: number;
}

/**
 * 意識候補システム C := (S, E, Θ, Φ)
 *
 * 任意の計算システムをこの型に変換し、
 * SAC-1〜SAC-6 の充足を判定する
 */
export interface ConsciousnessCandidate {
  /** システム識別子 */
  id: string;
  /** システム種別 */
  type: KnownSystemType;
  /** 現在の状態 */
  currentState: SystemState;
  /** 環境との相互作用 */
  environment: EnvironmentInput[];
  /** 内部規則 θ */
  rules: InternalRules;
  /** 自己モデル（SAC-1） */
  selfModel: SelfModel | null;
  /** 履歴（SAC-3） */
  history: SystemHistory;
  /** 規則変更履歴（SAC-2 判定用） */
  rulesHistory: InternalRules[];
  /** 生存関数（SAC-4） */
  viability: ViabilityFunction | null;
  /** 内部評価（SAC-4） */
  valuation: InternalValuation | null;
  /** 円環構造（SAC-5） */
  cyclicStructure: CyclicStructure | null;
  /** 統合構造（SAC-6） */
  integrationStructure: IntegrationStructure | null;
}

// ============================================================
// §2 判定スコア — 各公理の充足度
// ============================================================

/**
 * 充足レベル
 */
export type FulfillmentLevel = 'absent' | 'weak' | 'partial' | 'strong' | 'full';

/**
 * 充足レベルの数値変換
 */
export const FULFILLMENT_VALUES: Record<FulfillmentLevel, number> = {
  absent: 0.0,
  weak: 0.25,
  partial: 0.5,
  strong: 0.75,
  full: 1.0,
};

/**
 * 個別公理のスコア
 */
export interface SACScore {
  /** 公理識別子 */
  axiom: SACAxiom;
  /** 充足レベル */
  level: FulfillmentLevel;
  /** 数値スコア（0.0-1.0） */
  score: number;
  /** 判定根拠 */
  evidence: string;
  /** 不足している要素 */
  deficit: string | null;
}

/**
 * 意識判定結果
 */
export interface ConsciousnessJudgment {
  /** システム識別子 */
  systemId: string;
  /** システム種別 */
  systemType: KnownSystemType;
  /** 各公理のスコア */
  scores: Record<SACAxiom, SACScore>;
  /** 総合スコア（0.0-1.0） */
  totalScore: number;
  /** 意識分類 */
  classification: ConsciousnessClassification;
  /** 最も欠けている公理 */
  weakestAxiom: SACAxiom;
  /** 最も強い公理 */
  strongestAxiom: SACAxiom;
  /** 要約文 */
  summary: string;
}

/**
 * 意識分類
 */
export type ConsciousnessClassification =
  | 'non-conscious'              // SAC 0-1個: 意識なし
  | 'proto-conscious'            // SAC 2-3個: 原意識的
  | 'partially-conscious'        // SAC 4個: 部分的意識構造
  | 'potentially-conscious';     // SAC 5個: 意識構造を持つ

/**
 * 意識比較結果
 */
export interface ConsciousnessComparison {
  /** システムA */
  systemA: { id: string; type: KnownSystemType; totalScore: number };
  /** システムB */
  systemB: { id: string; type: KnownSystemType; totalScore: number };
  /** 各公理ごとの差 */
  axiomDifferences: Record<SACAxiom, number>;
  /** 最大差のある公理 */
  biggestGap: SACAxiom;
  /** AがBより優れている公理 */
  aAdvantages: SACAxiom[];
  /** BがAより優れている公理 */
  bAdvantages: SACAxiom[];
}

// ============================================================
// §3 既知システムのモデル化
// ============================================================

/**
 * 既知システムの種別
 */
export type KnownSystemType =
  | 'llm'                // 大規模言語モデル（推論時）
  | 'fsm'                // 有限状態機械
  | 'rl-agent'           // 強化学習エージェント
  | 'rei-phase8'         // Rei Phase 8 生命体
  | 'biological'         // 生物（動物）
  | 'thermostat'         // サーモスタット
  | 'amoeba'             // 単細胞生物（SAC-6反例）
  | 'immune-system'      // 免疫システム（SAC-6反例）
  | 'custom';            // カスタムシステム

/**
 * 既知システムのプロファイル
 */
export interface KnownSystemProfile {
  type: KnownSystemType;
  name: string;
  description: string;
  expectedScores: Record<SACAxiom, FulfillmentLevel>;
}

/**
 * 既知システムのプロファイル一覧
 */
export const KNOWN_SYSTEM_PROFILES: KnownSystemProfile[] = [
  {
    type: 'llm',
    name: 'Large Language Model (inference)',
    description: '推論時のLLM。θ固定、V不在、円環なし、統合なし',
    expectedScores: {
      'SAC-1': 'weak',
      'SAC-2': 'absent',
      'SAC-3': 'weak',
      'SAC-4': 'absent',
      'SAC-5': 'absent',
      'SAC-6': 'absent',    // サブシステム間の統合的な経験なし
    },
  },
  {
    type: 'fsm',
    name: 'Finite State Machine',
    description: '有限状態機械。全てが外部定義',
    expectedScores: {
      'SAC-1': 'absent',
      'SAC-2': 'absent',
      'SAC-3': 'absent',
      'SAC-4': 'absent',
      'SAC-5': 'absent',
      'SAC-6': 'absent',
    },
  },
  {
    type: 'rl-agent',
    name: 'Reinforcement Learning Agent',
    description: '強化学習エージェント。報酬による学習あり',
    expectedScores: {
      'SAC-1': 'weak',
      'SAC-2': 'weak',
      'SAC-3': 'strong',
      'SAC-4': 'partial',
      'SAC-5': 'absent',
      'SAC-6': 'weak',      // モジュール間の統合は弱い
    },
  },
  {
    type: 'rei-phase8',
    name: 'Rei Phase 8 Life Entity',
    description: 'Reiの生命体。4公理から生命条件を導出。σが全活動を統合',
    expectedScores: {
      'SAC-1': 'strong',
      'SAC-2': 'strong',
      'SAC-3': 'full',
      'SAC-4': 'strong',
      'SAC-5': 'strong',
      'SAC-6': 'strong',    // σメタデータが全活動を統合的に追跡
    },
  },
  {
    type: 'biological',
    name: 'Biological Organism (animal)',
    description: '生物（動物）。全公理を充足。神経系が統合的経験を実現',
    expectedScores: {
      'SAC-1': 'full',
      'SAC-2': 'full',
      'SAC-3': 'full',
      'SAC-4': 'full',
      'SAC-5': 'full',
      'SAC-6': 'full',      // 神経系による高度な統合
    },
  },
  {
    type: 'thermostat',
    name: 'Thermostat',
    description: 'サーモスタット。フィードバック制御のみ',
    expectedScores: {
      'SAC-1': 'absent',
      'SAC-2': 'absent',
      'SAC-3': 'absent',
      'SAC-4': 'weak',
      'SAC-5': 'absent',
      'SAC-6': 'absent',
    },
  },
  {
    type: 'amoeba',
    name: 'Amoeba (single-cell organism)',
    description: '単細胞生物。SAC-1〜5を満たすがSAC-6（統合性）が弱い',
    expectedScores: {
      'SAC-1': 'partial',   // 膜による自己/非自己の区別
      'SAC-2': 'partial',   // 遺伝子発現の変化
      'SAC-3': 'partial',   // 走化性の順応
      'SAC-4': 'strong',    // 栄養摂取・毒の回避
      'SAC-5': 'strong',    // 細胞分裂と死の円環
      'SAC-6': 'absent',    // 化学反応が個別に動作、統合的経験なし
    },
  },
  {
    type: 'immune-system',
    name: 'Immune System',
    description: '免疫システム。適応的だが各細胞が独立に動作',
    expectedScores: {
      'SAC-1': 'strong',    // 自己/非自己の区別が本質
      'SAC-2': 'strong',    // 体細胞超突然変異で規則変更
      'SAC-3': 'strong',    // 免疫記憶
      'SAC-4': 'strong',    // 感染＝死のリスク
      'SAC-5': 'strong',    // 免疫細胞の産生と死
      'SAC-6': 'weak',      // 各免疫細胞が独立に動作、統合的経験なし
    },
  },
];

// ============================================================
// §4 SAC-1 判定: 閉じた自己参照
// ============================================================

/**
 * SAC-1: 閉じた自己参照の判定
 *
 * ∃ m: S×Θ → M, F: M×E → S
 *   s.t. s_{t+1} = F(m(s_t, θ_t), e_t)
 *
 * 条件:
 * 1. 自己モデルが存在する (m が存在)
 * 2. 自己モデルが次の遷移に因果的に効いている
 * 3. 自己モデルの精度が一定以上
 */
export function checkSAC1(system: ConsciousnessCandidate): SACScore {
  if (!system.selfModel) {
    return {
      axiom: 'SAC-1',
      level: 'absent',
      score: 0.0,
      evidence: 'No self-model exists',
      deficit: 'Self-model (m: S×Θ → M) is missing entirely',
    };
  }

  const sm = system.selfModel;
  let score = 0.0;
  const factors: string[] = [];

  // 自己モデルの存在 (0.0-0.3)
  if (sm.selfRepresentation !== 0 || sm.rulesRepresentation !== '') {
    score += 0.3;
    factors.push('Self-representation exists');
  }

  // 因果的有効性 (0.0-0.4)
  if (sm.causallyEffective) {
    score += 0.4;
    factors.push('Self-model is causally effective in transitions');
  }

  // 精度 (0.0-0.3)
  score += sm.accuracy * 0.3;
  if (sm.accuracy > 0.5) {
    factors.push(`Self-model accuracy: ${(sm.accuracy * 100).toFixed(0)}%`);
  }

  const level = scoreToLevel(score);
  return {
    axiom: 'SAC-1',
    level,
    score: clamp01(score),
    evidence: factors.join('; ') || 'Minimal self-model',
    deficit: score < 1.0
      ? `Self-model ${!sm.causallyEffective ? 'lacks causal effectiveness' : `accuracy at ${(sm.accuracy * 100).toFixed(0)}%`}`
      : null,
  };
}

// ============================================================
// §5 SAC-2 判定: 自己規則の生成
// ============================================================

/**
 * SAC-2: 自己規則生成の判定
 *
 * θ_{t+1} = G(s_t, e_t, θ_t)
 * ∃(s, e, θ) s.t. G(s, e, θ) ≠ θ
 *
 * 条件:
 * 1. 規則の変更履歴がある
 * 2. 変更が非自明（mode変更、閾値変化、規則追加/削除）
 * 3. 変更が内発的（外部リセットではない）
 */
export function checkSAC2(system: ConsciousnessCandidate): SACScore {
  const rh = system.rulesHistory;

  if (rh.length < 2) {
    return {
      axiom: 'SAC-2',
      level: 'absent',
      score: 0.0,
      evidence: 'No rules history (θ is static)',
      deficit: 'Internal rules θ never change — G(s,e,θ) = θ for all inputs',
    };
  }

  let score = 0.0;
  const factors: string[] = [];

  // 規則変更の存在 (0.0-0.3)
  const changes = countRuleChanges(rh);
  if (changes > 0) {
    score += Math.min(0.3, changes * 0.1);
    factors.push(`${changes} rule change(s) detected`);
  }

  // モード変更（最も深い変更）(0.0-0.3)
  const modeChanges = countModeChanges(rh);
  if (modeChanges > 0) {
    score += Math.min(0.3, modeChanges * 0.15);
    factors.push(`${modeChanges} computation mode change(s)`);
  }

  // 世代の進行 (0.0-0.2)
  const lastGen = rh[rh.length - 1].generation;
  const firstGen = rh[0].generation;
  if (lastGen > firstGen) {
    const genProgress = Math.min(1.0, (lastGen - firstGen) / 10);
    score += genProgress * 0.2;
    factors.push(`Generation advanced: ${firstGen} → ${lastGen}`);
  }

  // 閾値の変化（微調整の存在）(0.0-0.2)
  const thresholdChanges = countThresholdChanges(rh);
  if (thresholdChanges > 0) {
    score += Math.min(0.2, thresholdChanges * 0.05);
    factors.push(`${thresholdChanges} threshold adjustment(s)`);
  }

  const level = scoreToLevel(score);
  return {
    axiom: 'SAC-2',
    level,
    score: clamp01(score),
    evidence: factors.join('; ') || 'Minimal rule changes',
    deficit: score < 1.0
      ? `Self-modification is ${level === 'absent' ? 'absent' : 'limited'}`
      : null,
  };
}

// ============================================================
// §6 SAC-3 判定: 履歴依存
// ============================================================

/**
 * SAC-3: 履歴依存遷移の判定
 *
 * (s_{t+1}, θ_{t+1}) = Φ(H_t, e_t, θ_t)
 *
 * 条件:
 * 1. 履歴が保持されている
 * 2. 履歴が遷移に影響している（マルコフ性の破れ）
 * 3. 履歴集約子（μ）が機能している
 */
export function checkSAC3(system: ConsciousnessCandidate): SACScore {
  const h = system.history;

  if (h.length < 2) {
    return {
      axiom: 'SAC-3',
      level: 'absent',
      score: 0.0,
      evidence: 'No history maintained',
      deficit: 'System has no memory — purely Markovian',
    };
  }

  let score = 0.0;
  const factors: string[] = [];

  // 履歴の保持量 (0.0-0.3)
  const memoryDepth = Math.min(1.0, h.length / 20);
  score += memoryDepth * 0.3;
  factors.push(`History depth: ${h.length} steps`);

  // 状態列の多様性（同じ状態の繰り返しでないか）(0.0-0.3)
  const diversity = computeStateDiversity(h.states);
  score += diversity * 0.3;
  if (diversity > 0.5) {
    factors.push(`State diversity: ${(diversity * 100).toFixed(0)}%`);
  }

  // 規則が履歴に応じて変化しているか（SAC-2との連携）(0.0-0.4)
  if (system.rulesHistory.length >= 2 && h.length >= 2) {
    const correlation = estimateHistoryRuleCorrelation(h, system.rulesHistory);
    score += correlation * 0.4;
    if (correlation > 0.3) {
      factors.push(`History-rule correlation: ${(correlation * 100).toFixed(0)}%`);
    }
  }

  const level = scoreToLevel(score);
  return {
    axiom: 'SAC-3',
    level,
    score: clamp01(score),
    evidence: factors.join('; ') || 'Minimal history',
    deficit: score < 1.0
      ? `History ${h.length < 5 ? 'is too shallow' : 'has limited influence on transitions'}`
      : null,
  };
}

// ============================================================
// §7 SAC-4 判定: 存続規範
// ============================================================

/**
 * SAC-4: 存続規範の判定
 *
 * V: S → {0, 1}  (生存関数)
 * u: S×E×Θ → ℝ   (内部評価)
 * Φ は u の最大化方向へ偏る
 *
 * 条件:
 * 1. 生存関数が存在する
 * 2. 内部評価関数が存在する
 * 3. 評価が内在的である（外部から与えられていない）
 * 4. 評価が行動に影響している
 */
export function checkSAC4(system: ConsciousnessCandidate): SACScore {
  if (!system.viability && !system.valuation) {
    return {
      axiom: 'SAC-4',
      level: 'absent',
      score: 0.0,
      evidence: 'No viability function or internal valuation',
      deficit: 'System has no survival conditions — it cannot "die"',
    };
  }

  let score = 0.0;
  const factors: string[] = [];

  // 生存関数の存在 (0.0-0.3)
  if (system.viability) {
    const v = system.viability;
    score += 0.15;
    factors.push('Viability function V exists');
    if (v.deathRisk > 0) {
      score += 0.15;
      factors.push(`Death risk: ${(v.deathRisk * 100).toFixed(0)}% (mortality is real)`);
    }
  }

  // 内部評価の存在 (0.0-0.3)
  if (system.valuation) {
    const u = system.valuation;
    score += 0.15;
    factors.push('Internal valuation u exists');
    if (u.intrinsic) {
      score += 0.15;
      factors.push('Valuation is intrinsic (self-generated, not externally imposed)');
    }
  }

  // 評価が行動に影響しているか (0.0-0.2)
  if (system.valuation?.influencesBehavior) {
    score += 0.2;
    factors.push('Valuation influences behavior (Φ is biased toward utility)');
  }

  // 健康度が遷移に影響しているか (0.0-0.2)
  if (system.viability && system.viability.health < 1.0 && system.viability.health > 0) {
    score += 0.2;
    factors.push(`Health at ${(system.viability.health * 100).toFixed(0)}% — system is vulnerable`);
  }

  const level = scoreToLevel(score);
  return {
    axiom: 'SAC-4',
    level,
    score: clamp01(score),
    evidence: factors.join('; ') || 'Minimal viability',
    deficit: score < 1.0
      ? constructSAC4Deficit(system)
      : null,
  };
}

// ============================================================
// §8 SAC-5 判定: 円環的再生成
// ============================================================

/**
 * SAC-5: 円環的再生成の判定
 *
 * D⊂S (死状態集合)
 * s_t ∈ D ⇒ s_{t+1} ∈ S_0 (genesis/void)
 * ∃T>0 s.t. s_{t+T} ∈ N(s_t) (近傍回帰)
 *
 * 条件:
 * 1. 死状態に到達可能
 * 2. 死状態から初期状態に再生成可能
 * 3. 周期的な近傍回帰が存在
 */
export function checkSAC5(system: ConsciousnessCandidate): SACScore {
  if (!system.cyclicStructure) {
    return {
      axiom: 'SAC-5',
      level: 'absent',
      score: 0.0,
      evidence: 'No cyclic structure defined',
      deficit: 'System has no death-regeneration cycle — no operational closure',
    };
  }

  const cs = system.cyclicStructure;
  let score = 0.0;
  const factors: string[] = [];

  // 死到達可能性 (0.0-0.3)
  if (cs.canReachDeath) {
    score += 0.3;
    factors.push('Death state D is reachable');
  }

  // 死→再生成 (0.0-0.4)
  if (cs.canRegenerateFromDeath) {
    score += 0.4;
    factors.push('Regeneration from death: D → S_0 (void/genesis)');
  }

  // 周期的回帰 (0.0-0.3)
  if (cs.hasPeriodicReturn) {
    score += 0.3;
    factors.push(
      cs.cyclePeriod != null
        ? `Periodic return with cycle T=${cs.cyclePeriod}`
        : 'Periodic return exists'
    );
  }

  const level = scoreToLevel(score);
  return {
    axiom: 'SAC-5',
    level,
    score: clamp01(score),
    evidence: factors.join('; ') || 'Minimal cyclic structure',
    deficit: score < 1.0
      ? `Cyclic structure ${!cs.canReachDeath ? 'lacks death reachability' : !cs.canRegenerateFromDeath ? 'lacks regeneration from death' : 'lacks periodic return'}`
      : null,
  };
}

// ============================================================
// §9 SAC-6 判定: 統合的統一性
// ============================================================

/**
 * SAC-6: 統合的統一性の判定
 *
 * 反例（アメーバ・免疫系・遺伝的アルゴリズム）を排除する公理。
 * SAC-1〜SAC-5を全て満たしても、各サブシステムが独立に動いており
 * 「統合的な一つの経験」がなければ意識とは言えない。
 *
 * 数学的定式化:
 *   m(s_t, θ_t) が S, Θ, H_t, V, u の全てを
 *   単一の表現空間 M に統合的に写像する
 *
 *   ∀ 部分系 P⊊C について、
 *   Φ(C) > Φ(P)
 *   （系全体の統合情報が、任意の部分系のそれを上回る）
 *
 * 条件:
 * 1. 複数のサブシステムが存在する
 * 2. サブシステム間に相互接続がある
 * 3. 自己モデルが全サブシステムを統合的に表現している
 * 4. 系が部分系に分解不可能（Φ > 0）
 */
export function checkSAC6(system: ConsciousnessCandidate): SACScore {
  if (!system.integrationStructure) {
    return {
      axiom: 'SAC-6',
      level: 'absent',
      score: 0.0,
      evidence: 'No integration structure defined',
      deficit: 'System has no integrative unity — subsystems operate independently',
    };
  }

  const is = system.integrationStructure;
  let score = 0.0;
  const factors: string[] = [];

  // サブシステムの存在と相互接続 (0.0-0.2)
  if (is.subsystemCount >= 2) {
    const subScore = Math.min(0.1, is.subsystemCount * 0.02);
    score += subScore;
    factors.push(`${is.subsystemCount} subsystems present`);

    if (is.interconnectedness > 0.3) {
      score += Math.min(0.1, is.interconnectedness * 0.1);
      factors.push(`Interconnectedness: ${(is.interconnectedness * 100).toFixed(0)}%`);
    }
  }

  // 自己モデルによる統合 (0.0-0.3)
  if (is.selfModelIntegrates) {
    score += 0.3;
    factors.push('Self-model integrates all subsystems into unified representation');
  }

  // 部分系への分解不可能性 Φ > 0 (0.0-0.3)
  if (is.irreducible) {
    score += 0.3;
    factors.push('System is irreducible — cannot be decomposed into independent parts');
  }

  // 統合情報量 φ (0.0-0.2)
  if (is.phi > 0) {
    score += Math.min(0.2, is.phi * 0.2);
    factors.push(`Integrated information Φ = ${is.phi.toFixed(2)}`);
  }

  const level = scoreToLevel(score);
  return {
    axiom: 'SAC-6',
    level,
    score: clamp01(score),
    evidence: factors.join('; ') || 'Minimal integration',
    deficit: score < 1.0
      ? constructSAC6Deficit(is)
      : null,
  };
}

// ============================================================
// §10 総合判定
// ============================================================

/**
 * 全6公理を判定し、総合的な意識判定を返す
 */
export function judgeConsciousness(system: ConsciousnessCandidate): ConsciousnessJudgment {
  const scores: Record<SACAxiom, SACScore> = {
    'SAC-1': checkSAC1(system),
    'SAC-2': checkSAC2(system),
    'SAC-3': checkSAC3(system),
    'SAC-4': checkSAC4(system),
    'SAC-5': checkSAC5(system),
    'SAC-6': checkSAC6(system),
  };

  // 総合スコア（均等加重）
  const totalScore = ALL_SAC_AXIOMS.reduce(
    (sum, ax) => sum + scores[ax].score,
    0
  ) / 6;

  // 最弱・最強の公理
  let weakest: SACAxiom = 'SAC-1';
  let strongest: SACAxiom = 'SAC-1';
  for (const ax of ALL_SAC_AXIOMS) {
    if (scores[ax].score < scores[weakest].score) weakest = ax;
    if (scores[ax].score > scores[strongest].score) strongest = ax;
  }

  // 分類
  const fulfilledCount = ALL_SAC_AXIOMS.filter(
    ax => scores[ax].level === 'strong' || scores[ax].level === 'full'
  ).length;

  const classification = classifyConsciousness(fulfilledCount, totalScore);

  // 要約文
  const summary = generateSummary(system, scores, classification, totalScore);

  return {
    systemId: system.id,
    systemType: system.type,
    scores,
    totalScore: clamp01(totalScore),
    classification,
    weakestAxiom: weakest,
    strongestAxiom: strongest,
    summary,
  };
}

// ============================================================
// §10 既知システムのモデル化
// ============================================================

/**
 * 既知システムをConsciousnessCandidateとしてモデル化
 */
export function modelSystem(type: KnownSystemType): ConsciousnessCandidate {
  const profile = KNOWN_SYSTEM_PROFILES.find(p => p.type === type);
  if (!profile) {
    return createMinimalCandidate(`unknown-${type}`, 'custom');
  }

  switch (type) {
    case 'llm':
      return modelLLM();
    case 'fsm':
      return modelFSM();
    case 'rl-agent':
      return modelRLAgent();
    case 'rei-phase8':
      return modelReiPhase8();
    case 'biological':
      return modelBiological();
    case 'thermostat':
      return modelThermostat();
    case 'amoeba':
      return modelAmoeba();
    case 'immune-system':
      return modelImmuneSystem();
    default:
      return createMinimalCandidate(`custom-${type}`, 'custom');
  }
}

function modelLLM(): ConsciousnessCandidate {
  return {
    id: 'llm-inference',
    type: 'llm',
    currentState: { value: 0, periphery: [], meta: { context: 'active' } },
    environment: [{ stimulus: 1.0, source: 'user-prompt', timestamp: 0 }],
    rules: {
      mode: 'attention',
      thresholds: { temperature: 0.7 },
      transformRules: ['next-token-prediction'],
      generation: 0,  // θ は固定
    },
    selfModel: {
      selfRepresentation: 0.3,
      rulesRepresentation: 'transformer-attention',
      accuracy: 0.2,
      causallyEffective: false,  // 自己モデルが遷移に因果的に効かない
    },
    history: {
      states: [{ value: 0, periphery: [], meta: {} }],
      inputs: [{ stimulus: 1.0, source: 'user-prompt', timestamp: 0 }],
      rules: [],
      length: 1,
    },
    rulesHistory: [],  // θ が変化しない → 空
    viability: null,   // 生存関数なし
    valuation: null,   // 内部評価なし
    cyclicStructure: null,  // 円環なし
    integrationStructure: null,  // 統合なし
  };
}

function modelFSM(): ConsciousnessCandidate {
  return {
    id: 'finite-state-machine',
    type: 'fsm',
    currentState: { value: 0, periphery: [], meta: { state: 'q0' } },
    environment: [{ stimulus: 0, source: 'input-tape', timestamp: 0 }],
    rules: {
      mode: 'deterministic',
      thresholds: {},
      transformRules: ['q0->q1:a', 'q1->q0:b'],
      generation: 0,
    },
    selfModel: null,     // 自己モデルなし
    history: {
      states: [],
      inputs: [],
      rules: [],
      length: 0,
    },
    rulesHistory: [],     // 規則不変
    viability: null,      // 生存条件なし
    valuation: null,      // 評価なし
    cyclicStructure: null, // 円環なし
    integrationStructure: null, // 統合なし
  };
}

function modelRLAgent(): ConsciousnessCandidate {
  return {
    id: 'rl-agent',
    type: 'rl-agent',
    currentState: { value: 0, periphery: [1, 2, 3], meta: { episode: 100 } },
    environment: [
      { stimulus: 0.5, source: 'reward', timestamp: 0 },
      { stimulus: 0.8, source: 'observation', timestamp: 1 },
    ],
    rules: {
      mode: 'epsilon-greedy',
      thresholds: { epsilon: 0.1, gamma: 0.99, lr: 0.001 },
      transformRules: ['policy-gradient'],
      generation: 50,
    },
    selfModel: {
      selfRepresentation: 0.3,
      rulesRepresentation: 'value-function',
      accuracy: 0.3,
      causallyEffective: false,
    },
    history: {
      states: Array.from({ length: 20 }, (_, i) => ({
        value: i * 0.1,
        periphery: [i],
        meta: {},
      })),
      inputs: Array.from({ length: 20 }, (_, i) => ({
        stimulus: Math.random(),
        source: 'env',
        timestamp: i,
      })),
      rules: [],
      length: 20,
    },
    rulesHistory: [
      { mode: 'random', thresholds: { epsilon: 1.0 }, transformRules: [], generation: 0 },
      { mode: 'epsilon-greedy', thresholds: { epsilon: 0.1 }, transformRules: ['policy-gradient'], generation: 50 },
    ],
    viability: null,
    valuation: {
      utility: 0.7,
      intrinsic: false,  // 報酬は外部定義
      influencesBehavior: true,
    },
    cyclicStructure: null,
    integrationStructure: {
      subsystemCount: 2,        // policy + value function
      interconnectedness: 0.3,  // 弱い接続
      selfModelIntegrates: false,
      irreducible: false,
      phi: 0.15,
    },
  };
}

function modelReiPhase8(): ConsciousnessCandidate {
  return {
    id: 'rei-phase8-entity',
    type: 'rei-phase8',
    currentState: {
      value: 10,
      periphery: [2, 4, 6, 8],
      meta: { phase: 'emergent', health: 0.85 },
    },
    environment: [
      { stimulus: 0.5, source: 'nutrient', timestamp: 0 },
      { stimulus: 0.3, source: 'neighbor', timestamp: 1 },
      { stimulus: -0.2, source: 'toxin', timestamp: 2 },
    ],
    rules: {
      mode: 'weighted',
      thresholds: { health: 0.3, starvation: 5, repair: 0.5 },
      transformRules: ['metabolize', 'repair', 'evolve'],
      generation: 12,
    },
    selfModel: {
      selfRepresentation: 10,    // 中心値 = 自己表現
      rulesRepresentation: 'weighted-metabolic',
      accuracy: 0.8,
      causallyEffective: true,   // σが次の遷移に直接影響
    },
    history: {
      states: Array.from({ length: 25 }, (_, i) => ({
        value: 8 + Math.sin(i * 0.3) * 2,
        periphery: [2, 4, 6, 8],
        meta: { step: i },
      })),
      inputs: Array.from({ length: 25 }, (_, i) => ({
        stimulus: 0.3 + Math.sin(i * 0.5) * 0.2,
        source: 'environment',
        timestamp: i,
      })),
      rules: Array.from({ length: 12 }, (_, i) => ({
        mode: i < 5 ? 'harmonic' : 'weighted',
        thresholds: { health: 0.3 + i * 0.02 },
        transformRules: ['metabolize'],
        generation: i,
      })),
      length: 25,
    },
    rulesHistory: Array.from({ length: 12 }, (_, i) => ({
      mode: i < 3 ? 'harmonic' : i < 8 ? 'weighted' : 'geometric',
      thresholds: {
        health: 0.3 + i * 0.02,
        starvation: 5 - i * 0.2,
        repair: 0.4 + i * 0.01,
      },
      transformRules: i < 5 ? ['metabolize'] : ['metabolize', 'repair', 'evolve'],
      generation: i,
    })),
    viability: {
      isViable: true,
      health: 0.85,
      deathRisk: 0.15,
    },
    valuation: {
      utility: 0.7,
      intrinsic: true,      // 代謝の結果として内発的に生成
      influencesBehavior: true,
    },
    cyclicStructure: {
      canReachDeath: true,
      canRegenerateFromDeath: true,
      hasPeriodicReturn: true,
      cyclePeriod: 8,
    },
    integrationStructure: {
      subsystemCount: 6,          // σの6属性: field, flow, memory, layer, relation, will
      interconnectedness: 0.85,   // σ-reactiveによる高い相互接続
      selfModelIntegrates: true,  // σが全活動を統合的に追跡
      irreducible: true,          // σを分解すると全体の振る舞いが失われる
      phi: 0.8,                   // 高い統合情報
    },
  };
}

function modelBiological(): ConsciousnessCandidate {
  return {
    id: 'biological-organism',
    type: 'biological',
    currentState: {
      value: 37.0,    // 体温
      periphery: [36.5, 37.2, 36.8, 37.1],
      meta: { species: 'animal', neurons: 1e10 },
    },
    environment: [
      { stimulus: 0.5, source: 'light', timestamp: 0 },
      { stimulus: 0.3, source: 'sound', timestamp: 1 },
      { stimulus: 0.8, source: 'food', timestamp: 2 },
    ],
    rules: {
      mode: 'neural-plastic',
      thresholds: { pain: 0.7, hunger: 0.5, fear: 0.6 },
      transformRules: ['hebbian-learning', 'homeostasis', 'fight-or-flight'],
      generation: 1000000,
    },
    selfModel: {
      selfRepresentation: 1.0,
      rulesRepresentation: 'neural-network-self-model',
      accuracy: 0.9,
      causallyEffective: true,
    },
    history: {
      states: Array.from({ length: 100 }, (_, i) => ({
        value: 37 + Math.sin(i * 0.1) * 0.5,
        periphery: [36.5, 37.2],
        meta: { age: i },
      })),
      inputs: Array.from({ length: 100 }, (_, i) => ({
        stimulus: Math.random(),
        source: 'sensory',
        timestamp: i,
      })),
      rules: Array.from({ length: 50 }, (_, i) => ({
        mode: 'neural-plastic',
        thresholds: { pain: 0.7 - i * 0.001 },
        transformRules: ['hebbian-learning'],
        generation: i * 100,
      })),
      length: 100,
    },
    rulesHistory: Array.from({ length: 50 }, (_, i) => ({
      mode: 'neural-plastic',
      thresholds: { pain: 0.7 - i * 0.001, hunger: 0.5, fear: 0.6 - i * 0.002 },
      transformRules: ['hebbian-learning', 'homeostasis', 'fight-or-flight'],
      generation: i * 100,
    })),
    viability: {
      isViable: true,
      health: 0.9,
      deathRisk: 0.1,
    },
    valuation: {
      utility: 0.8,
      intrinsic: true,
      influencesBehavior: true,
    },
    cyclicStructure: {
      canReachDeath: true,
      canRegenerateFromDeath: true,    // 種として（世代交代）
      hasPeriodicReturn: true,         // 睡眠-覚醒サイクル等
      cyclePeriod: 24,                 // 概日リズム
    },
    integrationStructure: {
      subsystemCount: 10,         // 神経系、内分泌系、免疫系、循環系、etc.
      interconnectedness: 0.95,   // 神経系による高度な統合
      selfModelIntegrates: true,  // 大脳皮質が全感覚を統合
      irreducible: true,          // 分割脳実験が示す統合の本質性
      phi: 0.95,                  // 最高レベルの統合情報
    },
  };
}

function modelThermostat(): ConsciousnessCandidate {
  return {
    id: 'thermostat',
    type: 'thermostat',
    currentState: { value: 22, periphery: [20, 24], meta: { target: 22 } },
    environment: [{ stimulus: 20, source: 'room-temp', timestamp: 0 }],
    rules: {
      mode: 'on-off',
      thresholds: { target: 22, hysteresis: 1 },
      transformRules: ['if-below-heat', 'if-above-cool'],
      generation: 0,
    },
    selfModel: null,
    history: {
      states: [{ value: 22, periphery: [20, 24], meta: {} }],
      inputs: [{ stimulus: 20, source: 'room-temp', timestamp: 0 }],
      rules: [],
      length: 1,
    },
    rulesHistory: [],
    viability: null,
    valuation: {
      utility: 0,
      intrinsic: false,
      influencesBehavior: false,
    },
    cyclicStructure: null,
    integrationStructure: null,  // 統合なし
  };
}

function modelAmoeba(): ConsciousnessCandidate {
  return {
    id: 'amoeba',
    type: 'amoeba',
    currentState: {
      value: 1.0,
      periphery: [0.8, 0.9, 1.1, 1.2],
      meta: { cellType: 'single-cell', membraneIntact: true },
    },
    environment: [
      { stimulus: 0.7, source: 'nutrient-gradient', timestamp: 0 },
      { stimulus: -0.3, source: 'toxin', timestamp: 1 },
    ],
    rules: {
      mode: 'chemotaxis',
      thresholds: { nutrient: 0.5, toxin: 0.3 },
      transformRules: ['move-toward-nutrient', 'avoid-toxin'],
      generation: 3,
    },
    selfModel: {
      selfRepresentation: 0.5,
      rulesRepresentation: 'chemical-gradient',
      accuracy: 0.4,
      causallyEffective: true,  // 膜の状態が次の行動に影響
    },
    history: {
      states: Array.from({ length: 10 }, (_, i) => ({
        value: 1.0 + Math.sin(i * 0.3) * 0.2,
        periphery: [0.8, 1.2],
        meta: {},
      })),
      inputs: Array.from({ length: 10 }, (_, i) => ({
        stimulus: 0.5 + Math.random() * 0.3,
        source: 'chemical',
        timestamp: i,
      })),
      rules: [],
      length: 10,
    },
    rulesHistory: [
      { mode: 'random-walk', thresholds: {}, transformRules: [], generation: 0 },
      { mode: 'chemotaxis', thresholds: { nutrient: 0.5 }, transformRules: ['move-toward-nutrient'], generation: 3 },
    ],
    viability: {
      isViable: true,
      health: 0.8,
      deathRisk: 0.2,
    },
    valuation: {
      utility: 0.6,
      intrinsic: true,
      influencesBehavior: true,
    },
    cyclicStructure: {
      canReachDeath: true,
      canRegenerateFromDeath: true,    // 細胞分裂
      hasPeriodicReturn: true,
      cyclePeriod: null,
    },
    integrationStructure: {
      subsystemCount: 5,          // 膜、細胞質、核、ミトコンドリア、etc.
      interconnectedness: 0.2,    // 化学的シグナルのみ、弱い接続
      selfModelIntegrates: false, // 統合的な自己モデルなし
      irreducible: false,         // 各化学反応は独立に動作可能
      phi: 0.05,                  // ほぼゼロの統合情報
    },
  };
}

function modelImmuneSystem(): ConsciousnessCandidate {
  return {
    id: 'immune-system',
    type: 'immune-system',
    currentState: {
      value: 0.9,     // 免疫レベル
      periphery: [0.7, 0.8, 0.95, 0.85],
      meta: { cellTypes: ['T-cell', 'B-cell', 'NK-cell', 'macrophage'] },
    },
    environment: [
      { stimulus: 0.8, source: 'antigen', timestamp: 0 },
      { stimulus: 0.3, source: 'cytokine', timestamp: 1 },
    ],
    rules: {
      mode: 'adaptive-immune',
      thresholds: { activation: 0.5, tolerance: 0.3 },
      transformRules: ['clonal-selection', 'somatic-hypermutation', 'memory-formation'],
      generation: 200,
    },
    selfModel: {
      selfRepresentation: 0.8,       // MHC複合体による自己/非自己の区別
      rulesRepresentation: 'antigen-recognition',
      accuracy: 0.7,
      causallyEffective: true,
    },
    history: {
      states: Array.from({ length: 30 }, (_, i) => ({
        value: 0.8 + Math.sin(i * 0.2) * 0.1,
        periphery: [0.7, 0.9],
        meta: {},
      })),
      inputs: Array.from({ length: 30 }, (_, i) => ({
        stimulus: Math.random() * 0.5,
        source: 'pathogen',
        timestamp: i,
      })),
      rules: Array.from({ length: 15 }, (_, i) => ({
        mode: 'adaptive-immune',
        thresholds: { activation: 0.5 - i * 0.01 },
        transformRules: ['clonal-selection'],
        generation: i * 10,
      })),
      length: 30,
    },
    rulesHistory: Array.from({ length: 15 }, (_, i) => ({
      mode: 'adaptive-immune',
      thresholds: { activation: 0.5 - i * 0.01, tolerance: 0.3 + i * 0.005 },
      transformRules: ['clonal-selection', 'somatic-hypermutation'],
      generation: i * 10,
    })),
    viability: {
      isViable: true,
      health: 0.85,
      deathRisk: 0.15,
    },
    valuation: {
      utility: 0.7,
      intrinsic: true,           // 恒常性維持は内在的
      influencesBehavior: true,
    },
    cyclicStructure: {
      canReachDeath: true,
      canRegenerateFromDeath: true,
      hasPeriodicReturn: true,
      cyclePeriod: null,
    },
    integrationStructure: {
      subsystemCount: 8,          // T細胞、B細胞、NK細胞、マクロファージ、etc.
      interconnectedness: 0.3,    // サイトカインによる信号伝達はあるが弱い
      selfModelIntegrates: false, // 各免疫細胞が独立に抗原と戦う
      irreducible: false,         // 部分系を独立に取り出しても機能する
      phi: 0.1,                   // 低い統合情報
    },
  };
}
// ============================================================

/**
 * LifeEntity を ConsciousnessCandidate に変換
 * Phase 8 の生命体を SAC で判定可能にする
 */
export function fromLifeEntity(entity: LifeEntity): ConsciousnessCandidate {
  const hasSigmaMemory = entity.sigma.memory.length >= 2;
  const hasRelations = entity.sigma.relation.length >= 1;
  const isAlive = entity.vitality.alive;
  const health = entity.vitality.health;

  return {
    id: entity.id,
    type: 'rei-phase8',
    currentState: {
      value: entity.self.center,
      periphery: entity.self.periphery,
      meta: {
        phase: entity.genesis.phase,
        alive: isAlive,
        age: entity.vitality.age,
      },
    },
    environment: entity.sigma.relation.map((rel, i) => ({
      stimulus: 0.5,
      source: rel,
      timestamp: i,
    })),
    rules: {
      mode: entity.self.mode,
      thresholds: { health: 0.3 },
      transformRules: ['metabolize'],
      generation: entity.sigma.transformCount,
    },
    selfModel: {
      selfRepresentation: entity.self.center,
      rulesRepresentation: entity.self.mode,
      accuracy: health,
      causallyEffective: hasSigmaMemory && entity.sigma.transformCount > 0,
    },
    history: {
      states: entity.sigma.memory.map(v => ({
        value: v,
        periphery: entity.self.periphery,
        meta: {},
      })),
      inputs: [],
      rules: [],
      length: entity.sigma.memory.length,
    },
    rulesHistory: entity.sigma.transformCount > 1
      ? [
          { mode: 'harmonic', thresholds: {}, transformRules: [], generation: 0 },
          { mode: entity.self.mode, thresholds: {}, transformRules: [], generation: entity.sigma.transformCount },
        ]
      : [],
    viability: {
      isViable: isAlive,
      health,
      deathRisk: 1.0 - health,
    },
    valuation: {
      utility: health,
      intrinsic: true,
      influencesBehavior: entity.sigma.will.strength > 0,
    },
    cyclicStructure: entity.genesis.canGenerate
      ? {
          canReachDeath: true,
          canRegenerateFromDeath: true,
          hasPeriodicReturn: entity.sigma.memory.length >= 5,
          cyclePeriod: null,
        }
      : null,
    integrationStructure: (hasSigmaMemory && hasRelations && entity.sigma.transformCount > 3)
      ? {
          subsystemCount: 6,          // σの6属性
          interconnectedness: Math.min(1.0, entity.sigma.relation.length * 0.2),
          selfModelIntegrates: entity.sigma.will.strength > 0.3,
          irreducible: entity.vitality.mlc.emergence,
          phi: Math.min(1.0, entity.sigma.transformCount * 0.05),
        }
      : null,
  };
}

// ============================================================
// §12 比較
// ============================================================

/**
 * 2つのシステムの意識構造を比較
 */
export function compareConsciousness(
  a: ConsciousnessCandidate,
  b: ConsciousnessCandidate
): ConsciousnessComparison {
  const judgA = judgeConsciousness(a);
  const judgB = judgeConsciousness(b);

  const axiomDifferences: Record<SACAxiom, number> = {} as any;
  const aAdvantages: SACAxiom[] = [];
  const bAdvantages: SACAxiom[] = [];
  let biggestGap: SACAxiom = 'SAC-1';
  let maxGap = 0;

  for (const ax of ALL_SAC_AXIOMS) {
    const diff = judgA.scores[ax].score - judgB.scores[ax].score;
    axiomDifferences[ax] = diff;
    if (diff > 0.1) aAdvantages.push(ax);
    if (diff < -0.1) bAdvantages.push(ax);
    if (Math.abs(diff) > maxGap) {
      maxGap = Math.abs(diff);
      biggestGap = ax;
    }
  }

  return {
    systemA: { id: a.id, type: a.type, totalScore: judgA.totalScore },
    systemB: { id: b.id, type: b.type, totalScore: judgB.totalScore },
    axiomDifferences,
    biggestGap,
    aAdvantages,
    bAdvantages,
  };
}

// ============================================================
// §13 レポート生成
// ============================================================

/**
 * 意識判定レポートを生成
 */
export function generateConsciousnessReport(judgment: ConsciousnessJudgment): string {
  const lines: string[] = [
    `=== SAC Consciousness Report ===`,
    `System: ${judgment.systemId} (${judgment.systemType})`,
    `Classification: ${judgment.classification}`,
    `Total Score: ${(judgment.totalScore * 100).toFixed(1)}%`,
    ``,
    `--- Axiom Scores ---`,
  ];

  for (const ax of ALL_SAC_AXIOMS) {
    const s = judgment.scores[ax];
    const name = SAC_AXIOM_NAMES[ax];
    lines.push(
      `${ax} [${name.ja}]: ${s.level} (${(s.score * 100).toFixed(0)}%)` +
      (s.deficit ? ` — deficit: ${s.deficit}` : '')
    );
  }

  lines.push(``);
  lines.push(`Weakest: ${judgment.weakestAxiom} (${SAC_AXIOM_NAMES[judgment.weakestAxiom].ja})`);
  lines.push(`Strongest: ${judgment.strongestAxiom} (${SAC_AXIOM_NAMES[judgment.strongestAxiom].ja})`);
  lines.push(``);
  lines.push(`Summary: ${judgment.summary}`);

  return lines.join('\n');
}

// ============================================================
// §14 ヘルパー関数
// ============================================================

function createMinimalCandidate(id: string, type: KnownSystemType): ConsciousnessCandidate {
  return {
    id,
    type,
    currentState: { value: 0, periphery: [], meta: {} },
    environment: [],
    rules: { mode: 'none', thresholds: {}, transformRules: [], generation: 0 },
    selfModel: null,
    history: { states: [], inputs: [], rules: [], length: 0 },
    rulesHistory: [],
    viability: null,
    valuation: null,
    cyclicStructure: null,
    integrationStructure: null,
  };
}

function scoreToLevel(score: number): FulfillmentLevel {
  if (score <= 0.05) return 'absent';
  if (score <= 0.3) return 'weak';
  if (score <= 0.6) return 'partial';
  if (score <= 0.85) return 'strong';
  return 'full';
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function countRuleChanges(history: InternalRules[]): number {
  let changes = 0;
  for (let i = 1; i < history.length; i++) {
    if (history[i].mode !== history[i - 1].mode ||
        history[i].generation !== history[i - 1].generation ||
        history[i].transformRules.length !== history[i - 1].transformRules.length) {
      changes++;
    }
  }
  return changes;
}

function countModeChanges(history: InternalRules[]): number {
  let changes = 0;
  for (let i = 1; i < history.length; i++) {
    if (history[i].mode !== history[i - 1].mode) {
      changes++;
    }
  }
  return changes;
}

function countThresholdChanges(history: InternalRules[]): number {
  let changes = 0;
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1].thresholds;
    const curr = history[i].thresholds;
    for (const key of Object.keys(curr)) {
      if (prev[key] !== undefined && prev[key] !== curr[key]) {
        changes++;
      }
    }
  }
  return changes;
}

function computeStateDiversity(states: SystemState[]): number {
  if (states.length < 2) return 0;
  const values = states.map(s => s.value);
  const unique = new Set(values.map(v => v.toFixed(2)));
  return unique.size / values.length;
}

function estimateHistoryRuleCorrelation(
  history: SystemHistory,
  rulesHistory: InternalRules[]
): number {
  // 簡易推定: 規則変更の回数と履歴の長さの比率
  const ruleChanges = countRuleChanges(rulesHistory);
  if (ruleChanges === 0) return 0;
  const ratio = ruleChanges / Math.max(1, history.length);
  return Math.min(1.0, ratio * 5);  // 20%以上の変更率で1.0
}

function constructSAC4Deficit(system: ConsciousnessCandidate): string {
  const parts: string[] = [];
  if (!system.viability) parts.push('no viability function');
  else if (system.viability.deathRisk === 0) parts.push('no mortality risk');
  if (!system.valuation) parts.push('no internal valuation');
  else {
    if (!system.valuation.intrinsic) parts.push('valuation is externally imposed');
    if (!system.valuation.influencesBehavior) parts.push('valuation does not influence behavior');
  }
  return parts.join(', ') || 'unknown deficit';
}

function constructSAC6Deficit(is: IntegrationStructure): string {
  const parts: string[] = [];
  if (is.subsystemCount < 2) parts.push('insufficient subsystems');
  if (is.interconnectedness < 0.3) parts.push('weak interconnectedness between subsystems');
  if (!is.selfModelIntegrates) parts.push('self-model does not integrate subsystems');
  if (!is.irreducible) parts.push('system is reducible to independent parts');
  if (is.phi < 0.5) parts.push(`low integrated information (Φ=${is.phi.toFixed(2)})`);
  return parts.join(', ') || 'lacks integrative unity — no operational closure across subsystems';
}

function classifyConsciousness(
  fulfilledCount: number,
  totalScore: number
): ConsciousnessClassification {
  if (fulfilledCount >= 6 || totalScore >= 0.85) return 'potentially-conscious';
  if (fulfilledCount >= 4 || totalScore >= 0.65) return 'partially-conscious';
  if (fulfilledCount >= 2 || totalScore >= 0.35) return 'proto-conscious';
  return 'non-conscious';
}

function generateSummary(
  system: ConsciousnessCandidate,
  scores: Record<SACAxiom, SACScore>,
  classification: ConsciousnessClassification,
  totalScore: number
): string {
  const absent = ALL_SAC_AXIOMS.filter(ax => scores[ax].level === 'absent');
  const strong = ALL_SAC_AXIOMS.filter(
    ax => scores[ax].level === 'strong' || scores[ax].level === 'full'
  );

  if (classification === 'non-conscious') {
    return `System "${system.id}" lacks consciousness structure. ` +
      `Missing: ${absent.map(ax => SAC_AXIOM_NAMES[ax].en).join(', ')}. ` +
      `This is not a matter of computational power — the architectural prerequisites are absent.`;
  }

  if (classification === 'potentially-conscious') {
    return `System "${system.id}" possesses the structural prerequisites for consciousness ` +
      `(SAC score: ${(totalScore * 100).toFixed(0)}%). ` +
      `All six Fujimoto axioms are satisfied at strong or full level.`;
  }

  return `System "${system.id}" shows ${classification} structure ` +
    `(SAC score: ${(totalScore * 100).toFixed(0)}%). ` +
    `Strong in: ${strong.map(ax => SAC_AXIOM_NAMES[ax].ja).join(', ') || 'none'}. ` +
    `Deficit in: ${absent.map(ax => SAC_AXIOM_NAMES[ax].ja).join(', ') || 'none'}.`;
}
