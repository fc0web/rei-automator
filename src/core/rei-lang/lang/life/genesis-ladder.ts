// ============================================================
// genesis-ladder.ts — Phase 8c: 存在の階層（Genesis Ladder）
//
// void → ・ → 0₀ → 0 → ℕ → responsive → metabolic
//   → memory-bearing → autopoietic → emergent → full-life
//
// A4（Genesis）の段階的生成を完全実装し、
// A2（Extension-Reduction）で各段階間の遷移を形式化する。
//
// Genesis Ladderは「何もない」から「完全な生命」への
// 10段階の存在論的遷移を計算的に実現する。
//
// 十二因縁対応:
//   有（存在） → genesis-ladder 'autopoietic'
//
// @axiom A1 (Center-Periphery) — 各段階の構造
// @axiom A2 (Extension-Reduction) — 段階間の遷移
// @axiom A3 (σ-Accumulation) — 遷移履歴の蓄積
// @axiom A4 (Genesis) — 段階的生成
// @author Nobuki Fujimoto (D-FUMT)
// @version 8.0.0-alpha
// ============================================================

import type {
  LifeEntity,
  ComputationMode,
  BirthEvent,
} from './life-entity';

// ============================================================
// §1 型定義
// ============================================================

/**
 * Genesis Ladderの全段階
 * LADの4公理から導出される存在の10段階
 */
export type LadderStage =
  | 'void'              // 0: 絶対無 — 何も存在しない
  | 'dot'               // 1: 存在の可能性（・）
  | 'zero-extended'     // 2: 構造の萌芽（0₀）
  | 'zero'              // 3: 計算可能な値（0）
  | 'number'            // 4: 数の体系（ℕ）
  | 'responsive'        // 5: 応答性（環境に反応）
  | 'metabolic'         // 6: 代謝的（入力→変換→出力）
  | 'memory-bearing'    // 7: 記憶保持（過去が現在に影響）
  | 'autopoietic'       // 8: 自己生成的（自己を再生産）
  | 'emergent'          // 9: 創発的（全体が部分以上）
  | 'full-life';        // 10: 完全な生命（MLC全充足）

/**
 * 段階のメタデータ
 */
export interface StageMetadata {
  stage: LadderStage;
  level: number;               // 0-10
  name: string;                // 表示名
  description: string;         // 説明
  requiredAxioms: string[];    // 必要な公理
  mlcSatisfied: string[];      // 満たすMLC条件
  nidana?: string;             // 十二因縁の対応（あれば）
}

/**
 * 段階遷移
 */
export interface StageTransition {
  from: LadderStage;
  to: LadderStage;
  operator: '⊕' | '⊖';       // Extension or Reduction
  axiomUsed: string[];
  condition: string;           // 遷移条件の説明
  reversible: boolean;
}

/**
 * Genesis Ladder全体の状態
 */
export interface LadderState {
  currentStage: LadderStage;
  currentLevel: number;
  history: LadderStage[];
  transitions: StageTransition[];
  entity?: LifeEntity;
}

/**
 * 遷移結果
 */
export interface TransitionResult {
  success: boolean;
  state: LadderState;
  transition?: StageTransition;
  reason?: string;
}

// ============================================================
// §2 段階定義
// ============================================================

/**
 * 全10段階のメタデータ定義
 */
export const STAGE_METADATA: StageMetadata[] = [
  {
    stage: 'void',
    level: 0,
    name: '絶対無',
    description: '何も存在しない状態。全ての始まり以前。',
    requiredAxioms: [],
    mlcSatisfied: [],
    nidana: '無明（無知）',
  },
  {
    stage: 'dot',
    level: 1,
    name: '存在の可能性',
    description: '「何かがありうる」という最小の存在（・）。',
    requiredAxioms: ['A4'],
    mlcSatisfied: [],
    nidana: '行（形成力）',
  },
  {
    stage: 'zero-extended',
    level: 2,
    name: '構造の萌芽',
    description: '自己参照構造の萌芽（0₀）。',
    requiredAxioms: ['A4', 'A2'],
    mlcSatisfied: [],
    nidana: '識（意識の種）',
  },
  {
    stage: 'zero',
    level: 3,
    name: '計算可能な値',
    description: '計算の対象となる値（0）。',
    requiredAxioms: ['A4', 'A2'],
    mlcSatisfied: [],
    nidana: '名色（心身）',
  },
  {
    stage: 'number',
    level: 4,
    name: '数の体系',
    description: '数と演算の体系（ℕ）。',
    requiredAxioms: ['A4', 'A1'],
    mlcSatisfied: [],
    nidana: '六処（感覚器官）',
  },
  {
    stage: 'responsive',
    level: 5,
    name: '応答的',
    description: '環境からの刺激に反応する。MLC-1（境界）を獲得。',
    requiredAxioms: ['A1'],
    mlcSatisfied: ['boundary'],
    nidana: '触（接触）',
  },
  {
    stage: 'metabolic',
    level: 6,
    name: '代謝的',
    description: '環境から資源を取得し変換する。MLC-2（代謝）を獲得。',
    requiredAxioms: ['A1', 'A3'],
    mlcSatisfied: ['boundary', 'metabolism'],
    nidana: '受（感受）',
  },
  {
    stage: 'memory-bearing',
    level: 7,
    name: '記憶保持',
    description: '過去の経験が現在の行動に影響する。MLC-3, MLC-4を獲得。',
    requiredAxioms: ['A1', 'A3'],
    mlcSatisfied: ['boundary', 'metabolism', 'memory', 'selfRepair'],
    nidana: '愛（渇愛）→取（執着）',
  },
  {
    stage: 'autopoietic',
    level: 8,
    name: '自己生成的',
    description: '自己の構成要素を自ら生産する。MLC-5を獲得。',
    requiredAxioms: ['A1', 'A2', 'A3', 'A4'],
    mlcSatisfied: ['boundary', 'metabolism', 'memory', 'selfRepair', 'autopoiesis'],
    nidana: '有（存在）',
  },
  {
    stage: 'emergent',
    level: 9,
    name: '創発的',
    description: '部分の総和以上の性質が現れる。MLC-6を獲得。',
    requiredAxioms: ['A1', 'A2', 'A3', 'A4'],
    mlcSatisfied: ['boundary', 'metabolism', 'memory', 'selfRepair', 'autopoiesis', 'emergence'],
  },
  {
    stage: 'full-life',
    level: 10,
    name: '完全な生命',
    description: 'MLC全条件を満たし、安定した生命活動を維持。',
    requiredAxioms: ['A1', 'A2', 'A3', 'A4'],
    mlcSatisfied: ['boundary', 'metabolism', 'memory', 'selfRepair', 'autopoiesis', 'emergence'],
    nidana: '生（誕生）',
  },
];

/**
 * 段階の順序（昇順）
 */
export const LADDER_ORDER: LadderStage[] = STAGE_METADATA.map(s => s.stage);

// ============================================================
// §3 遷移規則
// ============================================================

/**
 * 有効な遷移の定義（⊕: 上昇, ⊖: 下降）
 */
export const TRANSITIONS: StageTransition[] = [
  // 上昇遷移（⊕）
  {
    from: 'void', to: 'dot', operator: '⊕',
    axiomUsed: ['A4'], condition: '存在の可能性が生じる',
    reversible: true,
  },
  {
    from: 'dot', to: 'zero-extended', operator: '⊕',
    axiomUsed: ['A4', 'A2'], condition: '自己参照構造が萌芽する',
    reversible: true,
  },
  {
    from: 'zero-extended', to: 'zero', operator: '⊕',
    axiomUsed: ['A4', 'A2'], condition: '計算可能な値に収束する',
    reversible: true,
  },
  {
    from: 'zero', to: 'number', operator: '⊕',
    axiomUsed: ['A4', 'A1'], condition: '数の体系が展開される',
    reversible: true,
  },
  {
    from: 'number', to: 'responsive', operator: '⊕',
    axiomUsed: ['A1'], condition: '中心-周囲構造が環境を区別する',
    reversible: true,
  },
  {
    from: 'responsive', to: 'metabolic', operator: '⊕',
    axiomUsed: ['A1', 'A3'], condition: '環境との物質交換が始まる',
    reversible: true,
  },
  {
    from: 'metabolic', to: 'memory-bearing', operator: '⊕',
    axiomUsed: ['A3'], condition: 'σが蓄積され記憶が生じる',
    reversible: true,
  },
  {
    from: 'memory-bearing', to: 'autopoietic', operator: '⊕',
    axiomUsed: ['A1', 'A2', 'A3', 'A4'],
    condition: '4公理の統合により自己生成が可能になる',
    reversible: true,
  },
  {
    from: 'autopoietic', to: 'emergent', operator: '⊕',
    axiomUsed: ['A1', 'A2', 'A3', 'A4'],
    condition: '自己参照的な相互作用から創発が生じる',
    reversible: true,
  },
  {
    from: 'emergent', to: 'full-life', operator: '⊕',
    axiomUsed: ['A1', 'A2', 'A3', 'A4'],
    condition: '全MLC条件が安定的に充足される',
    reversible: true,
  },
  // 下降遷移（⊖）— 各上昇の逆
  {
    from: 'full-life', to: 'emergent', operator: '⊖',
    axiomUsed: ['A2'], condition: '安定性が失われ創発に退行',
    reversible: true,
  },
  {
    from: 'emergent', to: 'autopoietic', operator: '⊖',
    axiomUsed: ['A2'], condition: '創発性が失われる',
    reversible: true,
  },
  {
    from: 'autopoietic', to: 'memory-bearing', operator: '⊖',
    axiomUsed: ['A2'], condition: '自己生成能力が失われる',
    reversible: true,
  },
  {
    from: 'memory-bearing', to: 'metabolic', operator: '⊖',
    axiomUsed: ['A2'], condition: '記憶が劣化する',
    reversible: true,
  },
  {
    from: 'metabolic', to: 'responsive', operator: '⊖',
    axiomUsed: ['A2'], condition: '代謝が停止する',
    reversible: true,
  },
  {
    from: 'responsive', to: 'number', operator: '⊖',
    axiomUsed: ['A2'], condition: '環境応答が失われる',
    reversible: true,
  },
  {
    from: 'number', to: 'zero', operator: '⊖',
    axiomUsed: ['A2'], condition: '数体系が縮退する',
    reversible: true,
  },
  {
    from: 'zero', to: 'zero-extended', operator: '⊖',
    axiomUsed: ['A2'], condition: '値が構造に退行',
    reversible: true,
  },
  {
    from: 'zero-extended', to: 'dot', operator: '⊖',
    axiomUsed: ['A2'], condition: '構造が消失し点に退行',
    reversible: true,
  },
  {
    from: 'dot', to: 'void', operator: '⊖',
    axiomUsed: ['A2'], condition: '存在の可能性すら消失',
    reversible: false,  // void への退行は不可逆（涅槃）
  },
];

// ============================================================
// §4 ユーティリティ関数
// ============================================================

/**
 * 段階のレベル番号を取得
 */
export function getStageLevel(stage: LadderStage): number {
  const idx = LADDER_ORDER.indexOf(stage);
  return idx >= 0 ? idx : -1;
}

/**
 * 段階のメタデータを取得
 */
export function getStageMetadata(stage: LadderStage): StageMetadata | undefined {
  return STAGE_METADATA.find(s => s.stage === stage);
}

/**
 * 2つの段階間の距離
 */
export function stageDistance(from: LadderStage, to: LadderStage): number {
  return getStageLevel(to) - getStageLevel(from);
}

/**
 * 段階の比較
 */
export function isHigherStage(a: LadderStage, b: LadderStage): boolean {
  return getStageLevel(a) > getStageLevel(b);
}

// ============================================================
// §5 遷移エンジン
// ============================================================

/**
 * 遷移が有効かどうかを検証
 */
export function isValidTransition(
  from: LadderStage,
  to: LadderStage
): boolean {
  return TRANSITIONS.some(t => t.from === from && t.to === to);
}

/**
 * 利用可能な遷移を取得
 */
export function getAvailableTransitions(
  stage: LadderStage
): StageTransition[] {
  return TRANSITIONS.filter(t => t.from === stage);
}

/**
 * 上昇遷移のみ取得
 */
export function getAscendTransitions(
  stage: LadderStage
): StageTransition[] {
  return TRANSITIONS.filter(t => t.from === stage && t.operator === '⊕');
}

/**
 * 下降遷移のみ取得
 */
export function getDescendTransitions(
  stage: LadderStage
): StageTransition[] {
  return TRANSITIONS.filter(t => t.from === stage && t.operator === '⊖');
}

/**
 * 初期状態を生成
 */
export function createInitialState(): LadderState {
  return {
    currentStage: 'void',
    currentLevel: 0,
    history: ['void'],
    transitions: [],
  };
}

/**
 * 1段階遷移を実行（⊕: 上昇）
 */
export function ascend(state: LadderState): TransitionResult {
  const available = getAscendTransitions(state.currentStage);
  if (available.length === 0) {
    return {
      success: false,
      state,
      reason: `${state.currentStage} からの上昇遷移は存在しない`,
    };
  }

  const transition = available[0]; // 通常、上昇は1つのみ
  const newState: LadderState = {
    currentStage: transition.to,
    currentLevel: getStageLevel(transition.to),
    history: [...state.history, transition.to],
    transitions: [...state.transitions, transition],
    entity: state.entity,
  };

  return {
    success: true,
    state: newState,
    transition,
  };
}

/**
 * 1段階遷移を実行（⊖: 下降）
 */
export function descend(state: LadderState): TransitionResult {
  const available = getDescendTransitions(state.currentStage);
  if (available.length === 0) {
    return {
      success: false,
      state,
      reason: `${state.currentStage} からの下降遷移は存在しない`,
    };
  }

  const transition = available[0];
  const newState: LadderState = {
    currentStage: transition.to,
    currentLevel: getStageLevel(transition.to),
    history: [...state.history, transition.to],
    transitions: [...state.transitions, transition],
    entity: state.entity,
  };

  return {
    success: true,
    state: newState,
    transition,
  };
}

/**
 * 指定段階まで一気に上昇（Full Genesis）
 */
export function ascendTo(
  state: LadderState,
  target: LadderStage
): TransitionResult {
  const targetLevel = getStageLevel(target);
  if (targetLevel < 0) {
    return { success: false, state, reason: `不明な段階: ${target}` };
  }
  if (targetLevel <= state.currentLevel) {
    return { success: false, state, reason: `現在段階(${state.currentStage})は既に目標(${target})以上` };
  }

  let current = state;
  while (current.currentLevel < targetLevel) {
    const result = ascend(current);
    if (!result.success) return result;
    current = result.state;
  }

  return { success: true, state: current };
}

/**
 * 指定段階まで一気に下降
 */
export function descendTo(
  state: LadderState,
  target: LadderStage
): TransitionResult {
  const targetLevel = getStageLevel(target);
  if (targetLevel < 0) {
    return { success: false, state, reason: `不明な段階: ${target}` };
  }
  if (targetLevel >= state.currentLevel) {
    return { success: false, state, reason: `現在段階(${state.currentStage})は既に目標(${target})以下` };
  }

  let current = state;
  while (current.currentLevel > targetLevel) {
    const result = descend(current);
    if (!result.success) return result;
    current = result.state;
  }

  return { success: true, state: current };
}

// ============================================================
// §6 完全Genesis実行
// ============================================================

/**
 * void → full-life の完全Genesis
 * 全10段階を順番に遷移する
 */
export function runFullGenesis(): LadderState {
  let state = createInitialState();
  const result = ascendTo(state, 'full-life');
  return result.state;
}

/**
 * void → 指定段階 のGenesis
 */
export function runGenesisTo(target: LadderStage): LadderState {
  let state = createInitialState();
  const result = ascendTo(state, target);
  return result.state;
}

/**
 * 死の過程: full-life → void のReduction
 */
export function runFullDeath(): LadderState {
  let state = runFullGenesis();
  const result = descendTo(state, 'void');
  return result.state;
}

// ============================================================
// §7 生命体との統合
// ============================================================

/**
 * 生命体のGenesis段階を決定
 */
export function determineEntityStage(entity: LifeEntity): LadderStage {
  const mlc = entity.vitality.mlc;

  if (!entity.vitality.alive) {
    // 死亡状態 = 構造のみ残存
    return entity.self.periphery.length > 0 ? 'number' : 'zero';
  }

  // MLC充足度で段階を決定
  const satisfied = [
    mlc.boundary,
    mlc.metabolism,
    mlc.memory,
    mlc.selfRepair,
    mlc.autopoiesis,
    mlc.emergence,
  ].filter(Boolean).length;

  if (satisfied >= 6) return 'full-life';
  if (satisfied >= 5) return 'emergent';
  if (satisfied >= 4) return 'autopoietic';
  if (satisfied >= 2) return 'memory-bearing';
  if (mlc.metabolism) return 'metabolic';
  if (mlc.boundary) return 'responsive';
  if (entity.self.periphery.length > 0) return 'number';
  return 'responsive';
}

/**
 * 生命体に遷移を適用
 */
export function applyTransitionToEntity(
  entity: LifeEntity,
  transition: StageTransition
): LifeEntity {
  const newPhase = transition.to;
  const metadata = getStageMetadata(newPhase);

  // MLC条件を段階に基づいて更新
  const mlcUpdates: Partial<typeof entity.vitality.mlc> = {};
  if (metadata) {
    for (const mlcName of metadata.mlcSatisfied) {
      (mlcUpdates as any)[mlcName] = true;
    }
  }

  // 生成履歴を追加
  const birthEvent: BirthEvent = {
    type: transition.operator === '⊕' ? 'emergent' : 'metamorphosis',
    parentIds: [entity.id],
    timestamp: Date.now(),
    axiomUsed: transition.axiomUsed as BirthEvent['axiomUsed'],
  };

  return {
    ...entity,
    genesis: {
      ...entity.genesis,
      phase: newPhase as any,
      birthHistory: [...entity.genesis.birthHistory, birthEvent],
    },
    vitality: {
      ...entity.vitality,
      mlc: { ...entity.vitality.mlc, ...mlcUpdates },
    },
  };
}

// ============================================================
// §8 分析と可視化用データ
// ============================================================

/**
 * 全段階の概要を取得（可視化用）
 */
export function getLadderSummary(): Array<{
  level: number;
  stage: LadderStage;
  name: string;
  axioms: string[];
  mlc: string[];
}> {
  return STAGE_METADATA.map(s => ({
    level: s.level,
    stage: s.stage,
    name: s.name,
    axioms: s.requiredAxioms,
    mlc: s.mlcSatisfied,
  }));
}

/**
 * Genesis Ladderの統計
 */
export function analyzeLadder(state: LadderState): {
  totalTransitions: number;
  ascensions: number;
  descensions: number;
  currentLevel: number;
  maxLevelReached: number;
  axiomUsageCount: Record<string, number>;
} {
  const axiomUsage: Record<string, number> = {};
  let ascensions = 0;
  let descensions = 0;
  let maxLevel = 0;

  for (const t of state.transitions) {
    if (t.operator === '⊕') ascensions++;
    else descensions++;

    for (const a of t.axiomUsed) {
      axiomUsage[a] = (axiomUsage[a] ?? 0) + 1;
    }
  }

  for (const stage of state.history) {
    const level = getStageLevel(stage);
    if (level > maxLevel) maxLevel = level;
  }

  return {
    totalTransitions: state.transitions.length,
    ascensions,
    descensions,
    currentLevel: state.currentLevel,
    maxLevelReached: maxLevel,
    axiomUsageCount: axiomUsage,
  };
}
