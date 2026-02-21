// ============================================================
// Rei v0.5 — AgentSpace（エージェント空間）
// Phase 4a: パズル統一理論 × ゲーム統一理論の Agent 基盤
//
// 核心的洞察:
//   パズル = 協調的マルチエージェントシステム（全セルが共通目標に向かう）
//   ゲーム = 競争的マルチエージェントシステム（プレイヤーが対立目標を持つ）
//   違いは Agent の behavior と Mediator の strategy だけ
//
// D-FUMT 6属性の統一対応:
//   場(Field)    = AgentSpace 全体（盤面 = 環境）
//   流れ(Flow)   = ラウンド進行 / ターン進行
//   記憶(Memory)  = 消去履歴 / 棋譜
//   層(Layer)    = 推論深度（制約層 / 探索深度）
//   関係(Relation) = 制約ネットワーク / プレイヤー間対立
//   意志(Will)   = 候補選択戦略 / ゲーム戦略
//
// Author: Nobuki Fujimoto / Claude (collaborative design)
// ============================================================

import { ReiEventBus, type FlowMomentum } from './event-bus';
import {
  ReiAgent, AgentRegistry,
  type AgentBehavior, type Perception, type Decision, type ActionResult,
  type AgentMemoryEntry,
} from './entity-agent';
import {
  ReiMediator,
  type ConflictStrategy, type RoundResult, type RunResult, type MediatorSigma,
} from './mediator';
import {
  type PuzzleSpace, type PuzzleCell, type ConstraintGroup,
  type PropagationStep,
} from './puzzle';
import {
  type GameSpace, type GameState, type GameRules, type GameMove,
  selectBestMove, type Player,
} from './game';
import { BindingRegistry } from './relation';
import {
  traceRelationChain, computeInfluence,
  createDeepSigmaMeta, evolveWill, alignWills, detectWillConflict,
  type TraceResult, type InfluenceResult,
  type DeepSigmaMeta, type WillEvolution, type WillConflict, type WillAlignment,
} from './sigma-deep';

// ═══════════════════════════════════════════
// Part 1: AgentSpace 型定義
// ═══════════════════════════════════════════

/** AgentSpace の種類 */
export type AgentSpaceKind = 'puzzle' | 'game';

/** AgentSpace ラウンド結果 */
export interface AgentSpaceRound {
  round: number;
  timestamp: number;
  actions: AgentSpaceAction[];
  metrics: AgentSpaceMetrics;
}

/** 個別アクション記録 */
export interface AgentSpaceAction {
  agentId: string;
  type: 'eliminate' | 'confirm' | 'move' | 'none';
  detail: string;
  data?: Record<string, any>;
}

/** ラウンドメトリクス */
export interface AgentSpaceMetrics {
  activeAgents: number;
  totalActions: number;
  noneCount: number;
  convergenceRatio: number;  // none率 (0.0〜1.0)
}

/** AgentSpace 実行結果 */
export interface AgentSpaceResult {
  reiType: 'AgentSpaceResult';
  kind: AgentSpaceKind;
  totalRounds: number;
  converged: boolean;
  solved: boolean;
  rounds: AgentSpaceRound[];
  // パズル固有
  grid?: number[][];
  totalEliminations?: number;
  totalConfirmations?: number;
  // ゲーム固有
  winner?: number | null;
  moveHistory?: GameMove[];
  finalBoard?: any[];
  // Phase 4b/4c
  difficulty?: DifficultyAnalysis;
  reasoningTrace?: ReasoningTrace[];
  matchAnalysis?: MatchAnalysis;
  // Phase 4d: relation deep（相互依存追跡）
  relationSummary?: RelationSummary;
  _bindingRegistry?: BindingRegistry;  // 動的クエリ用（trace/influence）
  // Phase 4d: will deep（意志駆動）
  willSummary?: WillSummary;
  _willMetas?: [DeepSigmaMeta, DeepSigmaMeta]; // 動的クエリ用（will_conflict/will_align）
}

/** 意志サマリー（ゲーム対局の意志追跡要約） */
export interface WillSummary {
  players: Array<{
    player: number;
    initialTendency: string;
    finalTendency: string;
    strengthGrowth: number;
    totalEvolutions: number;
  }>;
  willHistory: Array<{ round: number; player: number; evolution: WillEvolution }>;
  conflictAnalysis: WillConflict | null;
}

/** 関係サマリー（相互依存追跡の要約） */
export interface RelationSummary {
  totalBindings: number;
  constraintBindings: { row: number; column: number; block: number; other: number };
  avgBindingsPerAgent: number;
  mostConnectedAgent: { id: string; bindingCount: number } | null;
  leastConnectedAgent: { id: string; bindingCount: number } | null;
}

/** AgentSpace σ */
export interface AgentSpaceSigma {
  reiType: 'AgentSpaceSigma';
  kind: AgentSpaceKind;
  totalRounds: number;
  converged: boolean;
  solved: boolean;
  agentCount: number;
  convergenceHistory: number[];
  field: Record<string, any>;
  flow: { momentum: string; roundRate: number };
  memory: { totalActions: number; roundHistory: number[] };
}

/** AgentSpace 本体 */
export interface AgentSpace {
  reiType: 'AgentSpace';
  kind: AgentSpaceKind;

  // 内部コンポーネント
  registry: AgentRegistry;
  eventBus: ReiEventBus;
  mediator: ReiMediator;

  // Agent ID マッピング
  agentIds: string[];

  // 関係レジストリ（相互依存追跡用）
  bindingRegistry?: BindingRegistry;

  // パズル固有データ
  puzzleData?: PuzzleAgentData;

  // ゲーム固有データ
  gameData?: GameAgentData;

  // 実行状態
  rounds: AgentSpaceRound[];
  solved: boolean;
  convergenceHistory: number[];
}

/** パズル Agent 用データ */
interface PuzzleAgentData {
  size: number;
  puzzleType: string;
  constraints: ConstraintGroup[];
  // row,col → agentId のマッピング
  cellMap: Map<string, string>;
  // agentId → {row, col} の逆マッピング
  posMap: Map<string, { row: number; col: number }>;
  totalEliminations: number;
  totalConfirmations: number;
  reasoningTrace: ReasoningTrace[];
}
interface GameAgentData {
  gameName: string;
  rules: GameRules;
  state: GameState;
  maxDepth: number;
  strategies: [string, string];  // [P1戦略, P2戦略]
  behaviors: [string, string];   // [P1行動パターン, P2行動パターン] (Phase 4c)
  searchNodes: number;
  tacticalHistory: Array<{ player: number; patterns: TacticalPattern[] }>;
  // Phase 4d: will deep integration
  willMetas: [DeepSigmaMeta, DeepSigmaMeta];
  willHistory: Array<{ round: number; player: number; evolution: WillEvolution }>;
}

// ═══════════════════════════════════════════
// Part 2: パズル → AgentSpace 変換
// ═══════════════════════════════════════════

// ═══════════════════════════════════════════
// Part 2.5: Phase 4b/4c 拡張型定義
// ═══════════════════════════════════════════

/** 推論層レベル (Phase 4b) */
export type ReasoningLayer =
  | 'layer1_elimination'     // 基本消去
  | 'layer2_naked_pair'      // Naked Pair
  | 'layer2_hidden_single'   // Hidden Single
  | 'layer2_pointing_pair'   // Pointing Pair / Box-Line Reduction
  | 'layer3_backtrack';      // 仮定→検証

/** 推論追跡エントリ (Phase 4b) */
export interface ReasoningTrace {
  round: number;
  layer: ReasoningLayer;
  cell: [number, number];
  detail: string;
  value?: number;
}

/** 難易度レベル (Phase 4b) */
export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert';

/** 難易度分析結果 (Phase 4b) */
export interface DifficultyAnalysis {
  reiType: 'DifficultyAnalysis';
  level: DifficultyLevel;
  score: number;              // 0-100
  layersUsed: ReasoningLayer[];
  layerCounts: Record<ReasoningLayer, number>;
  totalSteps: number;
  backtrackCount: number;
}

/** 戦術パターン (Phase 4c) */
export type TacticalPattern =
  | 'threat'          // 相手のリーチ
  | 'opportunity'     // 自分のリーチ
  | 'fork'            // 二重脅威
  | 'block'           // 防御必須
  | 'center'          // 中央支配
  | 'corner'          // 隅支配
  | 'none';           // 特になし

/** 戦術知覚結果 (Phase 4c) */
export interface TacticalPerception {
  patterns: TacticalPattern[];
  urgency: number;        // 0.0-1.0 (0=余裕, 1=緊急)
  threats: number[];       // 脅威のある位置
  opportunities: number[]; // チャンスのある位置
}

/** 対局分析結果 (Phase 4c) */
export interface MatchAnalysis {
  reiType: 'MatchAnalysis';
  winner: number | null;
  totalMoves: number;
  players: PlayerAnalysis[];
  tacticalSummary: string;
}

/** プレイヤー分析 (Phase 4c) */
export interface PlayerAnalysis {
  player: number;
  behavior: string;
  strategy: string;
  avgSearchNodes: number;
  totalSearchNodes: number;
  moveCount: number;
  tacticalPatterns: Record<TacticalPattern, number>;
}

/**
 * PuzzleSpace を AgentSpace に変換する
 * 各セルが cooperative Agent になり、制約伝播を Agent の知覚→判断→行動で実現
 */
export function createPuzzleAgentSpace(puzzle: PuzzleSpace): AgentSpace {
  const eventBus = new ReiEventBus();
  const registry = new AgentRegistry(eventBus);
  const mediator = new ReiMediator(eventBus, registry);
  mediator.defaultStrategy = 'cooperative';

  const cellMap = new Map<string, string>();
  const posMap = new Map<string, { row: number; col: number }>();
  const agentIds: string[] = [];

  // 各セルを Agent として生成
  for (let r = 0; r < puzzle.size; r++) {
    for (let c = 0; c < puzzle.size; c++) {
      const cell = puzzle.cells[r][c];
      const cellKey = `${r},${c}`;

      // Agent の value = { row, col, value, candidates, fixed }
      const agentValue = {
        reiType: 'PuzzleCell',
        row: r,
        col: c,
        value: cell.value,
        candidates: [...cell.candidates],
        fixed: cell.fixed,
      };

      const agent = registry.spawn(agentValue, {
        id: `cell_${r}_${c}`,
        behavior: 'cooperative',
      });

      cellMap.set(cellKey, agent.id);
      posMap.set(agent.id, { row: r, col: c });
      agentIds.push(agent.id);

      // 確定済みセルは初期記憶に追加
      if (cell.fixed) {
        agent.addMemory('perception', `初期値: ${cell.value} (固定)`);
      }
    }
  }

  // 関係レジストリ: 制約グループに基づく相互依存結合
  const bindingRegistry = new BindingRegistry();
  const entanglementPairs = new Set<string>();  // 重複防止

  for (const constraint of puzzle.constraints) {
    // ラベルから制約タイプを判定
    const label = constraint.label;
    const mode = label.startsWith('行') ? 'row_constraint' as any
      : label.startsWith('列') ? 'column_constraint' as any
      : label.startsWith('ブロック') ? 'block_constraint' as any
      : 'constraint' as any;

    // 制約グループ内の全セルペアを結合
    for (let i = 0; i < constraint.cells.length; i++) {
      for (let j = i + 1; j < constraint.cells.length; j++) {
        const [r1, c1] = constraint.cells[i];
        const [r2, c2] = constraint.cells[j];
        const idA = `cell_${r1}_${c1}`;
        const idB = `cell_${r2}_${c2}`;
        const pairKey = idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;

        if (!entanglementPairs.has(pairKey)) {
          entanglementPairs.add(pairKey);
          bindingRegistry.bind(idA, idB, mode, 1.0, true);
        }
      }
    }
  }

  // Phase 4d P3: 各Agentにdeep metaを設定（関係情報）
  for (const agentId of agentIds) {
    const agent = registry.get(agentId);
    if (agent) {
      const bindings = bindingRegistry.getBindingsFor(agentId);
      agent.setDeepMeta({
        relation: {
          constraintCount: bindings.length,
          isolated: bindings.length === 0,
        },
        will: {
          tendency: 'cooperate',
          strength: 0.5,
        },
      });
    }
  }

  return {
    reiType: 'AgentSpace',
    kind: 'puzzle',
    registry,
    eventBus,
    mediator,
    agentIds,
    bindingRegistry,
    puzzleData: {
      size: puzzle.size,
      puzzleType: puzzle.puzzleType,
      constraints: puzzle.constraints,
      cellMap,
      posMap,
      totalEliminations: 0,
      totalConfirmations: 0,
      reasoningTrace: [],
    },
    rounds: [],
    solved: false,
    convergenceHistory: [],
  };
}

// ═══════════════════════════════════════════
// Part 3: ゲーム → AgentSpace 変換
// ═══════════════════════════════════════════

/**
 * GameSpace を AgentSpace に変換する
 * 各プレイヤーが competitive Agent になり、ターンベースで対局
 */
export function createGameAgentSpace(
  game: GameSpace,
  p1Strategy?: string,
  p2Strategy?: string,
): AgentSpace {
  const eventBus = new ReiEventBus();
  const registry = new AgentRegistry(eventBus);
  const mediator = new ReiMediator(eventBus, registry);
  mediator.defaultStrategy = 'priority';

  const s1 = p1Strategy ?? game.strategy;
  const s2 = p2Strategy ?? game.strategy;

  // Phase 4c: 戦略名 → Agent behavior マッピング
  const strategyToBehavior = (s: string): AgentBehavior => {
    switch (s) {
      case 'reactive': return 'reactive';
      case 'proactive': return 'autonomous';
      case 'cooperative': return 'cooperative';
      case 'competitive': case 'minimax': return 'explorative';
      case 'contemplative': case 'montecarlo': return 'explorative';
      default: return 'explorative';
    }
  };

  // 実際のプレイスタイル名を保存（behavior より詳細）
  const playStyle1 = s1 === 'minimax' ? 'competitive' : s1;
  const playStyle2 = s2 === 'minimax' ? 'competitive' : s2;

  const b1 = strategyToBehavior(s1);
  const b2 = strategyToBehavior(s2);

  const agentIds: string[] = [];

  // Player 1 Agent
  const p1Agent = registry.spawn(
    { reiType: 'Player', player: 1, strategy: s1 },
    { id: 'player_1', behavior: b1 },
  );
  agentIds.push(p1Agent.id);
  mediator.setAgentPriority(p1Agent.id, 1.0);

  // Player 2 Agent
  const p2Agent = registry.spawn(
    { reiType: 'Player', player: 2, strategy: s2 },
    { id: 'player_2', behavior: b2 },
  );
  agentIds.push(p2Agent.id);
  mediator.setAgentPriority(p2Agent.id, 1.0);

  // Phase 4d P3: 各AgentにwillのdeepMetaを設定
  p1Agent.setDeepMeta({
    will: { tendency: behaviorToTendency(playStyle1), strength: 0.5 },
    relation: { opponent: 'player_2', role: playStyle1 },
  });
  p2Agent.setDeepMeta({
    will: { tendency: behaviorToTendency(playStyle2), strength: 0.5 },
    relation: { opponent: 'player_1', role: playStyle2 },
  });

  // Phase 4d: 意志の初期化（behavior に基づく）
  const willMeta1 = createDeepSigmaMeta();
  const willMeta2 = createDeepSigmaMeta();
  willMeta1.tendency = behaviorToTendency(playStyle1);
  willMeta2.tendency = behaviorToTendency(playStyle2);

  return {
    reiType: 'AgentSpace',
    kind: 'game',
    registry,
    eventBus,
    mediator,
    agentIds,
    gameData: {
      gameName: game.rules.name,
      rules: game.rules,
      state: { ...game.state },
      maxDepth: game.maxDepth,
      strategies: [s1, s2],
      behaviors: [playStyle1, playStyle2],
      searchNodes: 0,
      tacticalHistory: [],
      willMetas: [willMeta1, willMeta2],
      willHistory: [],
    },
    rounds: [],
    solved: false,
    convergenceHistory: [],
  };
}

// ═══════════════════════════════════════════
// Part 4: パズル Agent 実行エンジン
// ═══════════════════════════════════════════

/**
 * パズル AgentSpace の1ラウンド実行
 * 全セルAgent が同時に: 知覚 → 判断(候補消去) → 行動(確定)
 */
function puzzleRunRound(space: AgentSpace): AgentSpaceRound {
  const pd = space.puzzleData!;
  const roundNum = space.rounds.length + 1;
  const actions: AgentSpaceAction[] = [];

  space.eventBus.emit('system:init', {
    type: 'puzzle_round_start',
    round: roundNum,
  }, 'agent-space');

  // ── Phase 1: 環境構築（確定値マップ） ──
  const confirmedValues = new Map<string, number>(); // "row,col" → value
  for (const agentId of space.agentIds) {
    const agent = space.registry.get(agentId);
    if (!agent || agent.state !== 'active') continue;
    const v = agent.value;
    if (v.value !== 0) {
      confirmedValues.set(`${v.row},${v.col}`, v.value);
    }
  }

  // ── Phase 2: 全Agent同時知覚 & 判断 & 行動 ──
  let eliminationCount = 0;
  let confirmationCount = 0;
  let noneCount = 0;

  for (const agentId of space.agentIds) {
    const agent = space.registry.get(agentId);
    if (!agent || agent.state !== 'active') continue;
    const v = agent.value;

    // 既に確定済みなら skip
    if (v.value !== 0) {
      noneCount++;
      actions.push({
        agentId,
        type: 'none',
        detail: `セル(${v.row},${v.col}) = ${v.value} (確定済み)`,
      });
      continue;
    }

    // ── 知覚: 同じ制約グループの確定値を収集 ──
    const neighborValues = new Set<number>();
    for (const constraint of pd.constraints) {
      const inGroup = constraint.cells.some(
        ([cr, cc]) => cr === v.row && cc === v.col
      );
      if (!inGroup) continue;

      for (const [cr, cc] of constraint.cells) {
        if (cr === v.row && cc === v.col) continue;
        const nv = confirmedValues.get(`${cr},${cc}`);
        if (nv !== undefined) {
          neighborValues.add(nv);
        }
      }
    }

    // ── 判断: 候補から確定済みの値を消去 ──
    const prevCandidates = [...v.candidates];
    const newCandidates = v.candidates.filter(
      (c: number) => !neighborValues.has(c)
    );
    const eliminated = prevCandidates.filter(
      (c: number) => !newCandidates.includes(c)
    );

    if (eliminated.length > 0) {
      // ── 行動: 候補消去 ──
      eliminationCount += eliminated.length;
      agent.addMemory('action',
        `候補消去: [${eliminated.join(',')}] (制約伝播 round ${roundNum})`
      );

      // Agent の value を更新
      const newValue = { ...v, candidates: newCandidates };

      // 候補が1つになったら確定
      if (newCandidates.length === 1) {
        newValue.value = newCandidates[0];
        newValue.candidates = [];
        confirmationCount++;
        pd.totalConfirmations++;

        agent.addMemory('action',
          `確定: ${newValue.value} (唯一候補 round ${roundNum})`
        );

        actions.push({
          agentId,
          type: 'confirm',
          detail: `セル(${v.row},${v.col}) → ${newValue.value}`,
          data: { row: v.row, col: v.col, value: newValue.value, eliminated },
        });

        space.eventBus.emit('entity:transform', {
          agentId,
          type: 'confirm',
          row: v.row, col: v.col,
          value: newValue.value,
        }, agentId);

        // Phase 4b: 推論層追跡
        pd.reasoningTrace.push({
          round: roundNum,
          layer: 'layer1_elimination',
          cell: [v.row, v.col],
          detail: `基本消去 → 確定: ${newValue.value}`,
          value: newValue.value,
        });
      } else {
        actions.push({
          agentId,
          type: 'eliminate',
          detail: `セル(${v.row},${v.col}): 候補[${eliminated.join(',')}]消去 → 残[${newCandidates.join(',')}]`,
          data: { row: v.row, col: v.col, eliminated, remaining: newCandidates },
        });
      }

      // Agent value を直接更新（ReiAgent._value への書き込み）
      agent.value = newValue;

      pd.totalEliminations += eliminated.length;
    } else {
      // 変化なし
      noneCount++;

      // ── Naked Pair 検出（層2推論） ──
      const nakedPairResult = puzzleNakedPairCheck(space, v.row, v.col, v.candidates);
      if (nakedPairResult) {
        // Naked Pair で消去できる候補がある
        eliminationCount += nakedPairResult.eliminated;
        pd.totalEliminations += nakedPairResult.eliminated;
        noneCount--; // 実際にアクションがあった

        agent.addMemory('action',
          `Naked Pair検出: ${nakedPairResult.detail} (層2推論 round ${roundNum})`
        );

        pd.reasoningTrace.push({
          round: roundNum,
          layer: 'layer2_naked_pair',
          cell: [v.row, v.col],
          detail: nakedPairResult.detail,
        });

        actions.push({
          agentId,
          type: 'eliminate',
          detail: nakedPairResult.detail,
          data: nakedPairResult.data,
        });
      } else {
        // ── Hidden Single 検出（層2推論） ──
        const hiddenResult = puzzleHiddenSingleCheck(space, v.row, v.col, v.candidates);
        if (hiddenResult) {
          confirmationCount++;
          noneCount--;

          actions.push({
            agentId,
            type: 'confirm',
            detail: hiddenResult.detail,
            data: hiddenResult.data,
          });
        } else {
          // ── Pointing Pair 検出（層2.5推論） ──
          const pointingResult = puzzlePointingPairCheck(space, v.row, v.col, v.candidates);
          if (pointingResult) {
            eliminationCount += pointingResult.eliminated;
            noneCount--;

            actions.push({
              agentId,
              type: 'eliminate',
              detail: pointingResult.detail,
              data: pointingResult.data,
            });
          } else {
            actions.push({
              agentId,
              type: 'none',
              detail: `セル(${v.row},${v.col}): 変化なし (候補[${v.candidates.join(',')}])`,
            });
          }
        }
      }
    }
  }

  const activeAgents = space.agentIds.length;
  const totalActions = actions.filter(a => a.type !== 'none').length;
  const convergenceRatio = activeAgents > 0 ? noneCount / activeAgents : 1.0;

  const round: AgentSpaceRound = {
    round: roundNum,
    timestamp: Date.now(),
    actions,
    metrics: {
      activeAgents,
      totalActions,
      noneCount,
      convergenceRatio,
    },
  };

  space.rounds.push(round);
  space.convergenceHistory.push(convergenceRatio);

  // 解決判定
  const allConfirmed = space.agentIds.every(id => {
    const agent = space.registry.get(id);
    return agent && agent.value.value !== 0;
  });
  if (allConfirmed) {
    space.solved = true;
  }

  space.eventBus.emit('system:init', {
    type: 'puzzle_round_end',
    round: roundNum,
    eliminations: eliminationCount,
    confirmations: confirmationCount,
    solved: space.solved,
  }, 'agent-space');

  return round;
}

/**
 * 停滞時のバックトラッキング（層3推論 — 仮定→検証）
 * 候補が最少のセルを選び、1つの候補を仮定して矛盾チェック
 */
function puzzleBacktrackStep(space: AgentSpace): boolean {
  const pd = space.puzzleData!;

  // 未確定セルの中で候補が最少のものを探す
  let bestAgent: ReiAgent | null = null;
  let bestCandidates: number[] = [];
  let bestPos = { row: 0, col: 0 };

  for (const agentId of space.agentIds) {
    const agent = space.registry.get(agentId);
    if (!agent || agent.value.value !== 0) continue;
    const cands: number[] = agent.value.candidates;
    if (cands.length === 0) continue;
    if (!bestAgent || cands.length < bestCandidates.length) {
      bestAgent = agent;
      bestCandidates = cands;
      bestPos = { row: agent.value.row, col: agent.value.col };
    }
  }

  if (!bestAgent || bestCandidates.length === 0) return false;

  // 候補を1つ仮定して矛盾チェック
  for (const guess of bestCandidates) {
    if (puzzleIsValidGuess(space, bestPos.row, bestPos.col, guess)) {
      bestAgent.value = {
        ...bestAgent.value,
        value: guess,
        candidates: [],
      };
      bestAgent.addMemory('action',
        `仮定: ${guess} at (${bestPos.row},${bestPos.col}) (層3推論 — バックトラック)`
      );
      pd.totalConfirmations++;
      return true;
    }
  }

  return false;
}

/**
 * 仮定値が現在の確定値と矛盾しないかチェック
 */
function puzzleIsValidGuess(
  space: AgentSpace, row: number, col: number, value: number,
): boolean {
  const pd = space.puzzleData!;

  for (const constraint of pd.constraints) {
    const inGroup = constraint.cells.some(([cr, cc]) => cr === row && cc === col);
    if (!inGroup) continue;

    for (const [cr, cc] of constraint.cells) {
      if (cr === row && cc === col) continue;
      const peerId = pd.cellMap.get(`${cr},${cc}`);
      if (!peerId) continue;
      const peer = space.registry.get(peerId);
      if (peer && peer.value.value === value) return false;
    }
  }
  return true;
}

/**
 * Naked Pair 検出（層2推論）
 * 同じ制約グループ内で、同じ2候補を持つ2セルを見つける
 * → グループ内の他セルからその2候補を消去
 */
function puzzleNakedPairCheck(
  space: AgentSpace,
  row: number, col: number,
  candidates: number[],
): { eliminated: number; detail: string; data: Record<string, any> } | null {
  if (candidates.length !== 2) return null;
  const pd = space.puzzleData!;

  for (const constraint of pd.constraints) {
    const inGroup = constraint.cells.some(
      ([cr, cc]) => cr === row && cc === col
    );
    if (!inGroup) continue;

    // 同じ2候補を持つペアを探す
    for (const [cr, cc] of constraint.cells) {
      if (cr === row && cc === col) continue;
      const peerId = pd.cellMap.get(`${cr},${cc}`);
      if (!peerId) continue;
      const peer = space.registry.get(peerId);
      if (!peer || peer.value.value !== 0) continue;

      const peerCands: number[] = peer.value.candidates;
      if (peerCands.length !== 2) continue;
      if (peerCands[0] !== candidates[0] || peerCands[1] !== candidates[1]) continue;

      // Naked Pair 発見！グループ内の他セルから候補を消去
      let totalElim = 0;
      for (const [or, oc] of constraint.cells) {
        if ((or === row && oc === col) || (or === cr && oc === cc)) continue;
        const otherId = pd.cellMap.get(`${or},${oc}`);
        if (!otherId) continue;
        const other = space.registry.get(otherId);
        if (!other || other.value.value !== 0) continue;

        const otherCands: number[] = other.value.candidates;
        const newCands = otherCands.filter(
          (c: number) => !candidates.includes(c)
        );
        if (newCands.length < otherCands.length) {
          totalElim += otherCands.length - newCands.length;
          const newVal = { ...other.value, candidates: newCands };
          if (newCands.length === 1) {
            newVal.value = newCands[0];
            newVal.candidates = [];
            pd.totalConfirmations++;
          }
          other.value = newVal;
          other.addMemory('action',
            `Naked Pair [${candidates.join(',')}] により候補消去`
          );
        }
      }

      if (totalElim > 0) {
        return {
          eliminated: totalElim,
          detail: `Naked Pair [${candidates.join(',')}] @ (${row},${col})+(${cr},${cc}) in ${constraint.label}: ${totalElim}候補消去`,
          data: { pair: candidates, cells: [[row, col], [cr, cc]], group: constraint.label },
        };
      }
    }
  }

  return null;
}

/**
 * Hidden Single 検出（層2推論）
 * 制約グループ内で、ある候補値が1つのセルにしか存在しない場合 → そのセルを確定
 */
function puzzleHiddenSingleCheck(
  space: AgentSpace,
  row: number, col: number,
  candidates: number[],
): { confirmed: number; detail: string; data: Record<string, any> } | null {
  const pd = space.puzzleData!;

  for (const constraint of pd.constraints) {
    const inGroup = constraint.cells.some(
      ([cr, cc]) => cr === row && cc === col
    );
    if (!inGroup) continue;

    // 各候補値について、グループ内で何セルが持っているかカウント
    for (const val of candidates) {
      let count = 0;
      let onlyCell: [number, number] | null = null;

      for (const [cr, cc] of constraint.cells) {
        const peerId = pd.cellMap.get(`${cr},${cc}`);
        if (!peerId) continue;
        const peer = space.registry.get(peerId);
        if (!peer) continue;

        if (peer.value.value === val) {
          count = 999; // 既に確定済み
          break;
        }
        if (peer.value.value === 0 && (peer.value.candidates as number[]).includes(val)) {
          count++;
          onlyCell = [cr, cc];
        }
      }

      // この値を持てるセルが自分だけ → Hidden Single
      if (count === 1 && onlyCell && onlyCell[0] === row && onlyCell[1] === col) {
        const agentId = pd.cellMap.get(`${row},${col}`);
        if (!agentId) continue;
        const agent = space.registry.get(agentId);
        if (!agent) continue;

        agent.value = {
          ...agent.value,
          value: val,
          candidates: [],
        };
        pd.totalConfirmations++;
        agent.addMemory('action',
          `Hidden Single: ${val} in ${constraint.label} (層2推論)`
        );

        pd.reasoningTrace.push({
          round: space.rounds.length + 1,
          layer: 'layer2_hidden_single',
          cell: [row, col],
          detail: `Hidden Single: ${val} in ${constraint.label}`,
          value: val,
        });

        return {
          confirmed: val,
          detail: `Hidden Single: ${val} @ (${row},${col}) in ${constraint.label}`,
          data: { value: val, cell: [row, col], group: constraint.label },
        };
      }
    }
  }

  return null;
}

/**
 * Pointing Pair 検出（層2.5推論）
 * Box内のある候補値が1行(or 1列)に限定される場合
 * → その行(or列)の他のBox内のセルからその候補を消去
 */
function puzzlePointingPairCheck(
  space: AgentSpace,
  row: number, col: number,
  candidates: number[],
): { eliminated: number; detail: string; data: Record<string, any> } | null {
  const pd = space.puzzleData!;
  if (pd.size !== 9) return null; // 9x9専用

  const boxSize = 3;
  const boxRow = Math.floor(row / boxSize) * boxSize;
  const boxCol = Math.floor(col / boxSize) * boxSize;

  // このセルが属するBox制約を見つける
  const boxConstraint = pd.constraints.find(c =>
    c.label?.includes('box') &&
    c.cells.some(([cr, cc]) => cr === row && cc === col)
  );
  if (!boxConstraint) return null;

  let totalElim = 0;

  for (const val of candidates) {
    // Box内でこの候補値を持つセルの位置を収集
    const cellsWithVal: [number, number][] = [];
    for (const [cr, cc] of boxConstraint.cells) {
      const peerId = pd.cellMap.get(`${cr},${cc}`);
      if (!peerId) continue;
      const peer = space.registry.get(peerId);
      if (!peer || peer.value.value !== 0) continue;
      if ((peer.value.candidates as number[]).includes(val)) {
        cellsWithVal.push([cr, cc]);
      }
    }

    if (cellsWithVal.length < 2 || cellsWithVal.length > 3) continue;

    // 全て同じ行にあるか？
    const allSameRow = cellsWithVal.every(([cr]) => cr === cellsWithVal[0][0]);
    // 全て同じ列にあるか？
    const allSameCol = cellsWithVal.every(([, cc]) => cc === cellsWithVal[0][1]);

    if (!allSameRow && !allSameCol) continue;

    // Pointing Pair/Triple 発見！行or列の他のBox内セルから候補消去
    const targetRow = allSameRow ? cellsWithVal[0][0] : -1;
    const targetCol = allSameCol ? cellsWithVal[0][1] : -1;

    for (let i = 0; i < pd.size; i++) {
      const tr = allSameRow ? targetRow : i;
      const tc = allSameCol ? targetCol : i;

      // 同じBox内のセルは除外
      if (tr >= boxRow && tr < boxRow + boxSize &&
          tc >= boxCol && tc < boxCol + boxSize) continue;

      const otherId = pd.cellMap.get(`${tr},${tc}`);
      if (!otherId) continue;
      const other = space.registry.get(otherId);
      if (!other || other.value.value !== 0) continue;

      const otherCands: number[] = other.value.candidates;
      if (!otherCands.includes(val)) continue;

      const newCands = otherCands.filter((c: number) => c !== val);
      totalElim++;

      const newVal = { ...other.value, candidates: newCands };
      if (newCands.length === 1) {
        newVal.value = newCands[0];
        newVal.candidates = [];
        pd.totalConfirmations++;
      }
      other.value = newVal;
      other.addMemory('action',
        `Pointing Pair: ${val} in ${allSameRow ? 'row' : 'col'} (層2.5推論)`
      );
    }

    if (totalElim > 0) {
      pd.totalEliminations += totalElim;
      const direction = allSameRow ? `row ${cellsWithVal[0][0]}` : `col ${cellsWithVal[0][1]}`;

      pd.reasoningTrace.push({
        round: space.rounds.length + 1,
        layer: 'layer2_pointing_pair',
        cell: [row, col],
        detail: `Pointing Pair: ${val} locked in ${boxConstraint.label} → ${direction}`,
      });

      return {
        eliminated: totalElim,
        detail: `Pointing Pair: ${val} in ${boxConstraint.label} → ${direction}: ${totalElim}候補消去`,
        data: { value: val, cells: cellsWithVal, direction },
      };
    }
  }

  return null;
}

// ═══════════════════════════════════════════
// Part 5: ゲーム Agent 実行エンジン
// ═══════════════════════════════════════════

/**
 * ゲーム AgentSpace の1ラウンド（= 1ターン）実行
 * 現在の手番プレイヤーの Agent が: 知覚 → 判断(手を選択) → 行動(手を打つ)
 */
function gameRunRound(space: AgentSpace): AgentSpaceRound {
  const gd = space.gameData!;
  const roundNum = space.rounds.length + 1;
  const actions: AgentSpaceAction[] = [];

  space.eventBus.emit('system:init', {
    type: 'game_round_start',
    round: roundNum,
    currentPlayer: gd.state.currentPlayer,
  }, 'agent-space');

  // ゲーム終了チェック
  if (gd.state.status !== 'playing') {
    space.solved = true;
    const round: AgentSpaceRound = {
      round: roundNum,
      timestamp: Date.now(),
      actions: [{
        agentId: 'system',
        type: 'none',
        detail: `ゲーム終了: ${gd.state.status}${gd.state.winner ? ` (勝者: Player ${gd.state.winner})` : ''}`,
      }],
      metrics: {
        activeAgents: 2,
        totalActions: 0,
        noneCount: 2,
        convergenceRatio: 1.0,
      },
    };
    space.rounds.push(round);
    space.convergenceHistory.push(1.0);
    return round;
  }

  // 現在のプレイヤー Agent を取得
  const currentPlayer = gd.state.currentPlayer;
  const currentAgentId = `player_${currentPlayer}`;
  const currentAgent = space.registry.get(currentAgentId);

  if (!currentAgent) {
    throw new Error(`Agent '${currentAgentId}' が見つかりません`);
  }

  const strategy = gd.strategies[currentPlayer - 1];
  const behavior = gd.behaviors[currentPlayer - 1];

  // ── 知覚: 盤面を観察 + 戦術パターン検出 (Phase 4c) ──
  const legalMoves = gd.rules.getLegalMoves(gd.state);
  const lastMove = gd.state.moveHistory.length > 0
    ? gd.state.moveHistory[gd.state.moveHistory.length - 1]
    : null;

  // 戦術パターン知覚
  const tactical = perceiveTacticalPatterns(gd, currentPlayer, legalMoves);

  currentAgent.addMemory('perception',
    `Round ${roundNum}: 盤面観察 — 合法手${legalMoves.length}個` +
    (lastMove ? `, 相手の直前手: ${lastMove.label ?? lastMove.position}` : '') +
    (tactical.patterns.length > 0 ? `, 戦術: [${tactical.patterns.join(',')}]` : '') +
    `, 緊急度: ${tactical.urgency.toFixed(2)}`
  );

  gd.tacticalHistory.push({ player: currentPlayer, patterns: tactical.patterns });

  space.eventBus.emit('agent:perceive', {
    agentId: currentAgentId,
    player: currentPlayer,
    legalMoves: legalMoves.length,
    tactical,
  }, currentAgentId);

  // ── 判断: behavior に基づいて手を選択 (Phase 4c) ──
  let selectedMove: number;
  let moveScore = 0;
  let searchNodes = 0;

  // behavior による分岐
  if (behavior === 'reactive' && tactical.urgency > 0.5 && tactical.threats.length > 0) {
    // reactive: 脅威がある場合のみ防御、それ以外はランダム
    selectedMove = tactical.threats[0];
    moveScore = -1;
    currentAgent.addMemory('decision', `reactive: 脅威防御 pos=${selectedMove}`);
  } else if (behavior === 'reactive') {
    // reactive: 脅威なし → ランダム
    selectedMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
    moveScore = 0;
    currentAgent.addMemory('decision', `reactive: ランダム着手 pos=${selectedMove}`);
  } else if (behavior === 'proactive' && tactical.opportunities.length > 0) {
    // proactive: チャンスがあれば攻め
    selectedMove = tactical.opportunities[0];
    moveScore = 1;
    currentAgent.addMemory('decision', `proactive: 攻撃 pos=${selectedMove}`);
  } else if (behavior === 'proactive') {
    // proactive: チャンスなし → 中央/隅優先
    const preferred = legalMoves.filter(m =>
      m === 4 || m === 0 || m === 2 || m === 6 || m === 8
    );
    selectedMove = preferred.length > 0 ? preferred[0] : legalMoves[0];
    moveScore = 0.5;
    currentAgent.addMemory('decision', `proactive: 位置優先 pos=${selectedMove}`);
  } else if (behavior === 'contemplative') {
    // contemplative: モンテカルロ風ランダムサンプリング評価
    const result = contemplativeDecision(gd, currentPlayer, legalMoves);
    selectedMove = result.move;
    moveScore = result.score;
    searchNodes = result.samples;
    currentAgent.addMemory('decision',
      `contemplative: MC評価 pos=${selectedMove}, score=${moveScore.toFixed(2)}, samples=${result.samples}`
    );
  } else {
    // competitive / cooperative / default → minimax
    const tempGame: GameSpace = {
      reiType: 'GameSpace',
      state: gd.state,
      rules: gd.rules,
      strategy,
      maxDepth: gd.maxDepth,
      searchNodes: 0,
    };
    const bestResult = selectBestMove(tempGame);
    selectedMove = bestResult.move;
    moveScore = bestResult.score;
    searchNodes = bestResult.searchNodes;
    currentAgent.addMemory('decision',
      `${behavior}: minimax pos=${selectedMove}, score=${moveScore}, nodes=${searchNodes}`
    );
  }

  gd.searchNodes += searchNodes;

  // ── Phase 4d: 意志進化（毎ターン） ──
  const playerIdx = currentPlayer - 1;
  const willMeta = gd.willMetas[playerIdx];
  // 行動結果をメタデータに記録（trajectoryに影響）
  willMeta.memory.push(moveScore);
  willMeta.pipeCount++;
  willMeta.operations.push(behavior);
  const willEvolution = evolveWill(
    { score: moveScore, behavior, tactical },
    willMeta,
  );
  gd.willHistory.push({ round: roundNum, player: currentPlayer, evolution: willEvolution });

  // Phase 4d P4: Agent の deepMeta を更新（意志状態の反映）
  currentAgent.setDeepMeta({
    ...(currentAgent.deepMeta ?? {}),
    will: {
      tendency: willEvolution.evolved.tendency,
      strength: willEvolution.evolved.strength,
      intrinsic: willEvolution.evolved.intrinsic,
      lastReason: willEvolution.reason,
    },
  });

  space.eventBus.emit('agent:decide', {
    agentId: currentAgentId,
    player: currentPlayer,
    move: selectedMove,
    score: moveScore,
    strategy,
    behavior,
  }, currentAgentId);

  // ── 行動: 手を打つ ──
  const newState = gd.rules.applyMove(gd.state, selectedMove);
  gd.state = newState;

  const moveLabel = newState.moveHistory.length > 0
    ? newState.moveHistory[newState.moveHistory.length - 1].label ?? `pos ${selectedMove}`
    : `pos ${selectedMove}`;

  currentAgent.addMemory('action',
    `着手: ${moveLabel} (turn ${newState.turnCount})`
  );

  actions.push({
    agentId: currentAgentId,
    type: 'move',
    detail: `Player ${currentPlayer}: ${moveLabel}`,
    data: {
      player: currentPlayer,
      position: selectedMove,
      score: moveScore,
      strategy,
      behavior,
      searchNodes,
    },
  });

  // 相手 Agent に「待機」アクションを記録
  const otherAgentId = `player_${currentPlayer === 1 ? 2 : 1}`;
  actions.push({
    agentId: otherAgentId,
    type: 'none',
    detail: `Player ${currentPlayer === 1 ? 2 : 1}: 待機中（相手の手番）`,
  });

  space.eventBus.emit('agent:act', {
    agentId: currentAgentId,
    player: currentPlayer,
    move: selectedMove,
    label: moveLabel,
    status: newState.status,
    winner: newState.winner,
  }, currentAgentId);

  // ゲーム終了判定
  if (newState.status !== 'playing') {
    space.solved = true;
  }

  const convergenceRatio = space.solved ? 1.0 : 0.0;

  const round: AgentSpaceRound = {
    round: roundNum,
    timestamp: Date.now(),
    actions,
    metrics: {
      activeAgents: 2,
      totalActions: 1,
      noneCount: 1,  // 待機中の相手
      convergenceRatio,
    },
  };

  space.rounds.push(round);
  space.convergenceHistory.push(convergenceRatio);

  return round;
}

// ═══════════════════════════════════════════
// Part 5.5: Phase 4c ゲーム補助関数
// ═══════════════════════════════════════════

/**
 * 戦術パターン知覚 (Phase 4c)
 * 三目並べ系ゲームでの脅威/チャンス/フォーク検出
 */
function perceiveTacticalPatterns(
  gd: GameAgentData,
  currentPlayer: number,
  legalMoves: number[],
): TacticalPerception {
  const patterns: TacticalPattern[] = [];
  const threats: number[] = [];
  const opportunities: number[] = [];
  const opponent = (currentPlayer === 1 ? 2 : 1) as Player;

  // 各合法手について戦術的意味を分析
  for (const move of legalMoves) {
    // チャンス: この手で勝てるか？
    try {
      const afterMove = gd.rules.applyMove(gd.state, move);
      if (afterMove.status === 'win' && afterMove.winner === currentPlayer) {
        opportunities.push(move);
      }
    } catch { /* invalid */ }

    // 脅威: 相手がこの手を打つと負けるか？
    const simState: GameState = { ...gd.state, currentPlayer: opponent };
    try {
      const afterOpp = gd.rules.applyMove(simState, move);
      if (afterOpp.status === 'win' && afterOpp.winner === opponent) {
        threats.push(move);
      }
    } catch { /* invalid */ }
  }

  if (opportunities.length > 0) patterns.push('opportunity');
  if (opportunities.length >= 2) patterns.push('fork');
  if (threats.length > 0) patterns.push('threat');
  if (threats.length > 0) patterns.push('block');

  // 中央/隅の評価
  if (legalMoves.includes(4)) patterns.push('center');
  const corners = [0, 2, 6, 8].filter(c => legalMoves.includes(c));
  if (corners.length > 0) patterns.push('corner');

  if (patterns.length === 0) patterns.push('none');

  // 緊急度: 脅威があれば高い
  const urgency = threats.length > 0 ? Math.min(1.0, threats.length * 0.5) :
                  opportunities.length > 0 ? 0.3 : 0.0;

  return { patterns, urgency, threats, opportunities };
}

/**
 * 思索型判断 (Phase 4c) — モンテカルロ風ランダムサンプリング
 * 各候補手について、ランダムプレイアウトを数回行い平均スコアで評価
 */
function contemplativeDecision(
  gd: GameAgentData,
  currentPlayer: number,
  legalMoves: number[],
): { move: number; score: number; samples: number } {
  const SAMPLES_PER_MOVE = 10;
  let bestMove = legalMoves[0];
  let bestScore = -Infinity;
  let totalSamples = 0;

  for (const move of legalMoves) {
    let wins = 0;
    let draws = 0;

    for (let s = 0; s < SAMPLES_PER_MOVE; s++) {
      totalSamples++;
      let simState = gd.rules.applyMove({ ...gd.state }, move);

      // ランダムプレイアウト（最大20手）
      for (let depth = 0; depth < 20 && simState.status === 'playing'; depth++) {
        const simMoves = gd.rules.getLegalMoves(simState);
        if (simMoves.length === 0) break;
        const rndMove = simMoves[Math.floor(Math.random() * simMoves.length)];
        simState = gd.rules.applyMove(simState, rndMove);
      }

      if (simState.winner === currentPlayer) wins++;
      else if (simState.status === 'draw') draws++;
    }

    const score = (wins + draws * 0.5) / SAMPLES_PER_MOVE;
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return { move: bestMove, score: bestScore, samples: totalSamples };
}

// ═══════════════════════════════════════════
// Part 6: 統一実行インターフェース
// ═══════════════════════════════════════════

/**
 * AgentSpace の1ラウンド実行（パズル/ゲーム共通）
 */
export function agentSpaceRunRound(space: AgentSpace): AgentSpaceRound {
  if (space.kind === 'puzzle') {
    return puzzleRunRound(space);
  } else {
    return gameRunRound(space);
  }
}

/**
 * AgentSpace を収束/決着まで実行
 */
export function agentSpaceRun(
  space: AgentSpace,
  maxRounds: number = 100,
  convergenceThreshold: number = 1.0,
): AgentSpaceResult {
  let stuckCount = 0;

  for (let i = 0; i < maxRounds; i++) {
    const round = agentSpaceRunRound(space);

    // 解決済み
    if (space.solved) break;

    // パズルの停滞検出: 変化がない場合、層3推論（バックトラック）を試行
    if (space.kind === 'puzzle' && round.metrics.totalActions === 0) {
      stuckCount++;
      if (stuckCount >= 2) {
        const progressed = puzzleBacktrackStep(space);
        if (progressed) {
          stuckCount = 0;
          continue;
        }
      }
    } else {
      stuckCount = 0;
    }

    // 収束判定（変化がなくなった）
    if (round.metrics.convergenceRatio >= convergenceThreshold) {
      // ゲームの場合は即終了、パズルの場合はバックトラック失敗後に終了
      if (space.kind === 'game' || stuckCount > 3) break;
    }
  }

  return buildResult(space);
}

/**
 * 結果オブジェクトの構築
 */
function buildResult(space: AgentSpace): AgentSpaceResult {
  const base: AgentSpaceResult = {
    reiType: 'AgentSpaceResult',
    kind: space.kind,
    totalRounds: space.rounds.length,
    converged: space.convergenceHistory.length > 0 &&
      space.convergenceHistory[space.convergenceHistory.length - 1] >= 0.95,
    solved: space.solved,
    rounds: space.rounds,
  };

  if (space.kind === 'puzzle') {
    const pd = space.puzzleData!;
    // グリッド再構成
    const grid: number[][] = [];
    for (let r = 0; r < pd.size; r++) {
      const row: number[] = [];
      for (let c = 0; c < pd.size; c++) {
        const agentId = pd.cellMap.get(`${r},${c}`);
        const agent = agentId ? space.registry.get(agentId) : undefined;
        row.push(agent?.value?.value ?? 0);
      }
      grid.push(row);
    }
    base.grid = grid;
    base.totalEliminations = pd.totalEliminations;
    base.totalConfirmations = pd.totalConfirmations;
    // Phase 4b
    base.difficulty = getDifficultyAnalysis(space);
    base.reasoningTrace = getReasoningTrace(space);

    // Phase 4d: relation deep
    if (space.bindingRegistry) {
      base.relationSummary = buildRelationSummary(space);
      base._bindingRegistry = space.bindingRegistry;
    }
  }

  if (space.kind === 'game') {
    const gd = space.gameData!;
    base.winner = gd.state.winner;
    base.moveHistory = gd.state.moveHistory;
    base.finalBoard = gd.state.board;
    // Phase 4c
    base.matchAnalysis = getMatchAnalysis(space);

    // Phase 4d: will deep
    if (gd.willMetas) {
      base.willSummary = buildWillSummary(space);
      base._willMetas = gd.willMetas;
    }
  }

  return base;
}

// ═══════════════════════════════════════════
// Part 7: σ（メタデータ）
// ═══════════════════════════════════════════

/**
 * AgentSpace のσ情報
 */
export function getAgentSpaceSigma(space: AgentSpace): AgentSpaceSigma {
  const totalActions = space.rounds.reduce(
    (sum, r) => sum + r.metrics.totalActions, 0
  );
  const roundHistory = space.rounds.map(r => r.metrics.totalActions);

  let field: Record<string, any> = {};

  if (space.kind === 'puzzle') {
    const pd = space.puzzleData!;
    const confirmed = space.agentIds.filter(id => {
      const a = space.registry.get(id);
      return a && a.value.value !== 0;
    }).length;
    field = {
      type: pd.puzzleType,
      size: pd.size,
      totalCells: pd.size * pd.size,
      confirmedCells: confirmed,
      remainingCells: pd.size * pd.size - confirmed,
      totalEliminations: pd.totalEliminations,
      totalConfirmations: pd.totalConfirmations,
      constraints: pd.constraints.length,
    };
  }

  if (space.kind === 'game') {
    const gd = space.gameData!;
    field = {
      game: gd.gameName,
      turnCount: gd.state.turnCount,
      status: gd.state.status,
      winner: gd.state.winner,
      strategies: gd.strategies,
      searchNodes: gd.searchNodes,
      moveCount: gd.state.moveHistory.length,
    };
  }

  return {
    reiType: 'AgentSpaceSigma',
    kind: space.kind,
    totalRounds: space.rounds.length,
    converged: space.solved,
    solved: space.solved,
    agentCount: space.agentIds.length,
    convergenceHistory: [...space.convergenceHistory],
    field,
    flow: {
      momentum: space.solved ? 'converged' : (space.rounds.length > 0 ? 'expanding' : 'rest'),
      roundRate: space.rounds.length > 0
        ? totalActions / space.rounds.length
        : 0,
    },
    memory: {
      totalActions,
      roundHistory,
    },
  };
}

// ═══════════════════════════════════════════
// Part 8: ユーティリティ
// ═══════════════════════════════════════════

/**
 * AgentSpace からグリッドを取得（パズル用）
 */
export function getAgentSpaceGrid(space: AgentSpace): number[][] {
  if (space.kind !== 'puzzle' || !space.puzzleData) {
    throw new Error('パズル AgentSpace のみ grid を取得できます');
  }
  const pd = space.puzzleData;
  const grid: number[][] = [];
  for (let r = 0; r < pd.size; r++) {
    const row: number[] = [];
    for (let c = 0; c < pd.size; c++) {
      const agentId = pd.cellMap.get(`${r},${c}`);
      const agent = agentId ? space.registry.get(agentId) : undefined;
      row.push(agent?.value?.value ?? 0);
    }
    grid.push(row);
  }
  return grid;
}

/**
 * AgentSpace からゲーム状態を取得
 */
export function getAgentSpaceGameState(space: AgentSpace): GameState | null {
  if (space.kind !== 'game' || !space.gameData) return null;
  return { ...space.gameData.state };
}

/**
 * AgentSpace の盤面フォーマット（パズル用）
 */
export function formatAgentSpacePuzzle(space: AgentSpace): string {
  if (space.kind !== 'puzzle' || !space.puzzleData) return '';
  const pd = space.puzzleData;
  const grid = getAgentSpaceGrid(space);
  const lines: string[] = [];

  const boxSize = Math.round(Math.sqrt(pd.size));

  for (let r = 0; r < pd.size; r++) {
    if (r > 0 && r % boxSize === 0) {
      lines.push('─'.repeat(pd.size * 2 + boxSize - 1));
    }
    const cells: string[] = [];
    for (let c = 0; c < pd.size; c++) {
      if (c > 0 && c % boxSize === 0) cells.push('│');
      cells.push(grid[r][c] === 0 ? '·' : String(grid[r][c]));
    }
    lines.push(cells.join(' '));
  }

  return lines.join('\n');
}

/**
 * AgentSpace の盤面フォーマット（ゲーム用）
 */
export function formatAgentSpaceGame(space: AgentSpace): string {
  if (space.kind !== 'game' || !space.gameData) return '';
  return space.gameData.rules.formatBoard(space.gameData.state);
}

// ═══════════════════════════════════════════
// Part 8: Phase 4b/4c 分析関数
// ═══════════════════════════════════════════

/**
 * パズル難易度分析 (Phase 4b)
 * 使用された推論層に基づいて難易度を判定
 */
export function getDifficultyAnalysis(space: AgentSpace): DifficultyAnalysis {
  if (space.kind !== 'puzzle' || !space.puzzleData) {
    return {
      reiType: 'DifficultyAnalysis',
      level: 'easy',
      score: 0,
      layersUsed: [],
      layerCounts: {
        layer1_elimination: 0,
        layer2_naked_pair: 0,
        layer2_hidden_single: 0,
        layer2_pointing_pair: 0,
        layer3_backtrack: 0,
      },
      totalSteps: 0,
      backtrackCount: 0,
    };
  }

  const pd = space.puzzleData;
  const trace = pd.reasoningTrace;

  const layerCounts: Record<ReasoningLayer, number> = {
    layer1_elimination: 0,
    layer2_naked_pair: 0,
    layer2_hidden_single: 0,
    layer2_pointing_pair: 0,
    layer3_backtrack: 0,
  };

  const layersUsed = new Set<ReasoningLayer>();

  for (const entry of trace) {
    layerCounts[entry.layer]++;
    layersUsed.add(entry.layer);
  }

  // バックトラック回数をラウンドログから推定
  let backtrackCount = 0;
  for (const round of space.rounds) {
    for (const action of round.actions) {
      if (action.detail.includes('バックトラック') || action.detail.includes('仮定')) {
        backtrackCount++;
      }
    }
  }
  layerCounts.layer3_backtrack = backtrackCount;
  if (backtrackCount > 0) layersUsed.add('layer3_backtrack');

  // スコア計算
  let score = 0;
  score += layerCounts.layer1_elimination * 1;
  score += layerCounts.layer2_naked_pair * 5;
  score += layerCounts.layer2_hidden_single * 4;
  score += layerCounts.layer2_pointing_pair * 6;
  score += backtrackCount * 15;
  score = Math.min(100, score);

  // 難易度レベル判定
  let level: DifficultyLevel;
  if (backtrackCount > 0) level = 'expert';
  else if (layersUsed.has('layer2_pointing_pair')) level = 'hard';
  else if (layersUsed.has('layer2_naked_pair') || layersUsed.has('layer2_hidden_single')) level = 'medium';
  else level = 'easy';

  return {
    reiType: 'DifficultyAnalysis',
    level,
    score,
    layersUsed: [...layersUsed],
    layerCounts,
    totalSteps: trace.length + backtrackCount,
    backtrackCount,
  };
}

/**
 * 推論追跡取得 (Phase 4b)
 */
export function getReasoningTrace(space: AgentSpace): ReasoningTrace[] {
  if (space.kind !== 'puzzle' || !space.puzzleData) return [];
  return [...space.puzzleData.reasoningTrace];
}

/**
 * 対局分析 (Phase 4c)
 */
export function getMatchAnalysis(space: AgentSpace): MatchAnalysis {
  if (space.kind !== 'game' || !space.gameData) {
    return {
      reiType: 'MatchAnalysis',
      winner: null,
      totalMoves: 0,
      players: [],
      tacticalSummary: 'No game data',
    };
  }

  const gd = space.gameData;

  // プレイヤーごとの分析
  const players: PlayerAnalysis[] = [1, 2].map(p => {
    const agentId = `player_${p}`;
    const agent = space.registry.get(agentId);

    // 手数カウント
    let moveCount = 0;
    let totalNodes = 0;
    for (const round of space.rounds) {
      for (const action of round.actions) {
        if (action.agentId === agentId && action.type === 'move') {
          moveCount++;
          totalNodes += action.data?.searchNodes ?? 0;
        }
      }
    }

    // 戦術パターン集計
    const patternCounts: Record<TacticalPattern, number> = {
      threat: 0, opportunity: 0, fork: 0, block: 0,
      center: 0, corner: 0, none: 0,
    };
    for (const entry of gd.tacticalHistory) {
      if (entry.player === p) {
        for (const pat of entry.patterns) {
          patternCounts[pat]++;
        }
      }
    }

    return {
      player: p,
      behavior: gd.behaviors[p - 1],
      strategy: gd.strategies[p - 1],
      avgSearchNodes: moveCount > 0 ? totalNodes / moveCount : 0,
      totalSearchNodes: totalNodes,
      moveCount,
      tacticalPatterns: patternCounts,
    };
  });

  // 戦術サマリー
  const p1 = players[0];
  const p2 = players[1];
  const winnerStr = gd.state.winner
    ? `Player ${gd.state.winner} (${gd.behaviors[gd.state.winner - 1]}) wins`
    : 'Draw';
  const tacticalSummary =
    `${winnerStr} in ${gd.state.moveHistory.length} moves. ` +
    `P1(${p1.behavior}): ${p1.moveCount} moves, ` +
    `P2(${p2.behavior}): ${p2.moveCount} moves.`;

  return {
    reiType: 'MatchAnalysis',
    winner: gd.state.winner ?? null,
    totalMoves: gd.state.moveHistory.length,
    players,
    tacticalSummary,
  };
}

// ═══════════════════════════════════════════
// Part 10: 関係深化（Phase 4d — 相互依存追跡）
// ═══════════════════════════════════════════

/**
 * AgentSpace の関係サマリーを構築
 */
function buildRelationSummary(space: AgentSpace): RelationSummary {
  const reg = space.bindingRegistry!;
  const counts = { row: 0, column: 0, block: 0, other: 0 };
  const agentBindingCounts = new Map<string, number>();

  // 全Agent のバインディング数を集計
  for (const agentId of space.agentIds) {
    const bindings = reg.getBindingsFor(agentId);
    agentBindingCounts.set(agentId, bindings.length);

    for (const b of bindings) {
      const mode = b.mode as string;
      if (mode === 'row_constraint') counts.row++;
      else if (mode === 'column_constraint') counts.column++;
      else if (mode === 'block_constraint') counts.block++;
      else counts.other++;
    }
  }

  // 各バインディングが2回カウントされるので半分にする
  const totalBindings = (counts.row + counts.column + counts.block + counts.other) / 2;
  counts.row = Math.floor(counts.row / 2);
  counts.column = Math.floor(counts.column / 2);
  counts.block = Math.floor(counts.block / 2);
  counts.other = Math.floor(counts.other / 2);

  // 最多/最少接続Agent
  let most: { id: string; bindingCount: number } | null = null;
  let least: { id: string; bindingCount: number } | null = null;
  for (const [id, count] of agentBindingCounts) {
    if (!most || count > most.bindingCount) most = { id, bindingCount: count };
    if (!least || count < least.bindingCount) least = { id, bindingCount: count };
  }

  return {
    totalBindings,
    constraintBindings: counts,
    avgBindingsPerAgent: space.agentIds.length > 0
      ? totalBindings * 2 / space.agentIds.length
      : 0,
    mostConnectedAgent: most,
    leastConnectedAgent: least,
  };
}

/**
 * AgentSpaceResult から特定セルの関係チェーンを追跡
 * パイプ用: result |> relation_trace("cell_0_0")
 */
export function traceAgentRelations(
  result: AgentSpaceResult,
  cellRef: string,
  maxDepth: number = 5,
): TraceResult | null {
  if (!result._bindingRegistry) return null;
  return traceRelationChain(result._bindingRegistry, cellRef, maxDepth);
}

/**
 * AgentSpaceResult から2セル間の影響度を計算
 * パイプ用: result |> relation_influence("cell_0_0", "cell_3_3")
 */
export function computeAgentInfluence(
  result: AgentSpaceResult,
  fromRef: string,
  toRef: string,
): InfluenceResult | null {
  if (!result._bindingRegistry) return null;
  return computeInfluence(result._bindingRegistry, fromRef, toRef);
}

/**
 * セル座標 "R1C1" → agentId "cell_0_0" への変換ヘルパー
 */
export function cellRefToAgentId(cellRef: string): string {
  // "R1C1" → "cell_0_0", "R2C3" → "cell_1_2"
  const match = cellRef.match(/^R(\d+)C(\d+)$/i);
  if (match) {
    return `cell_${parseInt(match[1]) - 1}_${parseInt(match[2]) - 1}`;
  }
  // "0,0" → "cell_0_0"
  const match2 = cellRef.match(/^(\d+),(\d+)$/);
  if (match2) {
    return `cell_${match2[1]}_${match2[2]}`;
  }
  // 既に "cell_X_Y" 形式ならそのまま
  if (cellRef.startsWith('cell_')) return cellRef;
  return cellRef;
}

// ═══════════════════════════════════════════
// Part 11: 意志深化（Phase 4d — 意志駆動対局）
// ═══════════════════════════════════════════

/**
 * behavior → 初期 tendency マッピング
 */
function behaviorToTendency(behavior: string): string {
  switch (behavior) {
    case 'competitive': return 'expand';
    case 'cooperative': return 'harmonize';
    case 'reactive': return 'rest';
    case 'proactive': return 'expand';
    case 'contemplative': return 'harmonize';
    default: return 'rest';
  }
}

/**
 * ゲーム対局の意志サマリーを構築
 */
function buildWillSummary(space: AgentSpace): WillSummary {
  const gd = space.gameData!;

  // 各プレイヤーの意志進化追跡
  const players = [0, 1].map(idx => {
    const playerHistory = gd.willHistory.filter(h => h.player === idx + 1);
    const initial = playerHistory.length > 0
      ? playerHistory[0].evolution.previous.tendency
      : gd.willMetas[idx].tendency;
    const final = playerHistory.length > 0
      ? playerHistory[playerHistory.length - 1].evolution.evolved.tendency
      : gd.willMetas[idx].tendency;
    const initialStrength = playerHistory.length > 0
      ? playerHistory[0].evolution.previous.strength
      : 0;
    const finalStrength = playerHistory.length > 0
      ? playerHistory[playerHistory.length - 1].evolution.evolved.strength
      : 0;

    return {
      player: idx + 1,
      initialTendency: initial,
      finalTendency: final,
      strengthGrowth: finalStrength - initialStrength,
      totalEvolutions: playerHistory.length,
    };
  });

  // 意志衝突分析
  const p1Agent = space.registry.get('player_1');
  const p2Agent = space.registry.get('player_2');
  let conflictAnalysis: WillConflict | null = null;
  if (p1Agent && p2Agent) {
    conflictAnalysis = detectWillConflict(
      p1Agent.value, p2Agent.value,
      gd.willMetas[0], gd.willMetas[1],
      'player_1', 'player_2',
    );
  }

  return {
    players,
    willHistory: gd.willHistory,
    conflictAnalysis,
  };
}

/**
 * AgentSpaceResult から意志衝突を検出
 */
export function detectGameWillConflict(result: AgentSpaceResult): WillConflict | null {
  if (!result._willMetas || !result.willSummary) return null;
  return result.willSummary.conflictAnalysis;
}

/**
 * AgentSpaceResult から意志調律を実行
 */
export function alignGameWills(result: AgentSpaceResult): WillAlignment | null {
  if (!result._willMetas) return null;
  return alignWills(
    { player: 1 }, { player: 2 },
    result._willMetas[0], result._willMetas[1],
    'player_1', 'player_2',
  );
}
