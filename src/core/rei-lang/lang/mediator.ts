// ============================================================
// Rei v0.5 — Mediator (調停者) + 並行実行エンジン
// Phase 2c: 複数Agentの並行実行と競合解決
//
// 設計思想:
//   複数の自律Agent が同時に perceive → decide → act する際、
//   Mediator が「調停者」として競合を解決し、調和を導く。
//   ラウンドベースの並行実行で決定論的な結果を保証する。
//
// 構造哲学との対応:
//   均衡原理: 極端を避け、調和を見出す
//   → Mediator が対立するAgent意志の間で調和点を発見
//   相互依存構造: すべては相互依存的に生じる
//   → Agent間の行動は相互に影響し合い、Mediatorが因果を管理
//   集団調和: 集団の協調的統合
//   → Agent集団がMediatorの調停で協調的に動作
//
// D-FUMT統合:
//   Mediator は六属性「関係」の上位概念 —
//   個々のbindingを超えた、集団レベルの関係性を管理する。
//   実行ラウンドは六属性「流れ」の離散化 —
//   連続的な流れをステップとして観測する。
//
// 考案者: 藤本伸樹 (Nobuki Fujimoto)
// ============================================================

import {
  ReiEventBus,
  type ReiEvent, type EventType,
  type FlowMomentum,
} from './event-bus';
import {
  ReiAgent, AgentRegistry,
  type AgentState, type AgentBehavior, type AgentActionType,
  type Perception, type Decision, type ActionResult,
  type AgentSigma,
} from './entity-agent';

// ─── 型定義 ─────────────────────────

/** 競合解決戦略 */
export type ConflictStrategy =
  | 'priority'      // 優先度（confidence）が高い方を採用
  | 'cooperative'   // 両方の意図を融合した妥協案を生成
  | 'sequential'    // 順番に実行（先着順）
  | 'cancel_both'   // 両方キャンセル
  | 'mediator';     // Mediatorが独自判断

/** 競合の種類 */
export type ConflictType =
  | 'target_contention'  // 同一ターゲットへの競合アクション
  | 'resource_conflict'  // 同一リソースへの同時アクセス
  | 'mutual_fuse'        // 相互融合（AがBを、BがAを融合しようとする）
  | 'contradictory'      // 矛盾する行動（分離 vs 融合）
  | 'none';              // 競合なし

/** 検出された競合 */
export interface Conflict {
  type: ConflictType;
  agents: [string, string];          // 競合する2Agent ID
  decisions: [Decision, Decision];   // それぞれの判断
  description: string;
}

/** 競合解決結果 */
export interface ConflictResolution {
  conflict: Conflict;
  strategy: ConflictStrategy;
  outcome: {
    [agentId: string]: Decision;     // 解決後の判断（変更なしの場合は元の判断）
  };
  reason: string;
}

/** ラウンド実行結果 */
export interface RoundResult {
  round: number;
  timestamp: number;
  // フェーズ別結果
  perceptions: Map<string, Perception>;
  decisions: Map<string, Decision>;
  conflicts: Conflict[];
  resolutions: ConflictResolution[];
  resolvedDecisions: Map<string, Decision>;
  actions: Map<string, ActionResult>;
  // 集約メトリクス
  metrics: RoundMetrics;
}

/** ラウンドメトリクス */
export interface RoundMetrics {
  activeAgents: number;
  totalPerceptions: number;
  totalDecisions: number;
  conflictCount: number;
  actionSuccessCount: number;
  actionFailCount: number;
  noneActionCount: number;       // 「何もしない」を選択したAgent数
  convergenceRatio: number;      // none行動率 (0.0〜1.0)
}

/** 連続実行結果 */
export interface RunResult {
  totalRounds: number;
  converged: boolean;
  convergenceRound: number | null;
  rounds: RoundResult[];
  finalState: {
    agents: Array<{ id: string; state: AgentState; kind: string; step: number }>;
    flowMomentum: FlowMomentum;
  };
}

/** Mediator σ（自己記述） */
export interface MediatorSigma {
  reiType: 'MediatorSigma';
  totalRounds: number;
  totalConflicts: number;
  totalResolutions: number;
  conflictsByType: Record<string, number>;
  resolutionsByStrategy: Record<string, number>;
  defaultStrategy: ConflictStrategy;
  convergenceHistory: number[];   // 各ラウンドの収束率
  isRunning: boolean;
}

// ─── ReiMediator クラス ─────────────────────────

export class ReiMediator {
  private eventBus: ReiEventBus;
  private registry: AgentRegistry;
  private _defaultStrategy: ConflictStrategy = 'priority';
  private _totalRounds = 0;
  private _totalConflicts = 0;
  private _totalResolutions = 0;
  private _conflictsByType: Record<string, number> = {};
  private _resolutionsByStrategy: Record<string, number> = {};
  private _convergenceHistory: number[] = [];
  private _isRunning = false;

  // Agent別の優先度オーバーライド（高い値 = 高い優先度）
  private _agentPriorities = new Map<string, number>();

  constructor(eventBus: ReiEventBus, registry: AgentRegistry) {
    this.eventBus = eventBus;
    this.registry = registry;
  }

  // ─── 設定 ─────────────────────────

  get defaultStrategy(): ConflictStrategy { return this._defaultStrategy; }
  set defaultStrategy(s: ConflictStrategy) { this._defaultStrategy = s; }

  get totalRounds(): number { return this._totalRounds; }
  get isRunning(): boolean { return this._isRunning; }

  /** Agent優先度を設定（高い値 = 高い優先度） */
  setAgentPriority(agentId: string, priority: number): void {
    this._agentPriorities.set(agentId, priority);
  }

  /** Agent優先度を取得 */
  getAgentPriority(agentId: string): number {
    return this._agentPriorities.get(agentId) ?? 0.5;
  }

  // ─── 並行実行エンジン ─────────────────────────

  /**
   * 1ラウンドの並行実行
   * perceive all → decide all → detect conflicts → resolve → act all
   */
  runRound(environment?: Map<string, any>): RoundResult {
    const roundNum = ++this._totalRounds;
    const timestamp = Date.now();

    this._isRunning = true;

    this.eventBus.emit('system:init', {
      type: 'round_start',
      round: roundNum,
    }, 'mediator');

    // 環境マップ構築
    const env = environment ?? new Map<string, any>();

    // アクティブAgent一覧を取得
    const activeAgents = this.registry.list()
      .filter(a => a.state === 'active');
    const agentIds = activeAgents.map(a => a.id);

    // ── Phase 1: 全Agent同時認識（perceive） ──
    const perceptions = new Map<string, Perception>();
    for (const { id } of activeAgents) {
      const agent = this.registry.get(id);
      if (agent) {
        perceptions.set(id, agent.perceive(env, id));
      }
    }

    // ── Phase 2: 全Agent同時判断（decide） ──
    const decisions = new Map<string, Decision>();
    for (const { id } of activeAgents) {
      const agent = this.registry.get(id);
      const perception = perceptions.get(id);
      if (agent && perception) {
        decisions.set(id, agent.decide(perception));
      }
    }

    // ── Phase 3: 競合検出 ──
    const conflicts = this.detectConflicts(decisions, agentIds);

    // ── Phase 4: 競合解決 ──
    const resolutions = this.resolveConflicts(conflicts, decisions);

    // 解決後の判断マップを構築
    const resolvedDecisions = new Map(decisions);
    for (const resolution of resolutions) {
      for (const [agentId, newDecision] of Object.entries(resolution.outcome)) {
        resolvedDecisions.set(agentId, newDecision);
      }
    }

    // ── Phase 5: 全Agent同時行動（act） ──
    const actions = new Map<string, ActionResult>();
    for (const { id } of activeAgents) {
      const agent = this.registry.get(id);
      const decision = resolvedDecisions.get(id);
      if (agent && decision) {
        actions.set(id, agent.act(decision, {
          environment: env,
          agentRegistry: this.registry,
          selfName: id,
        }));
      }
    }

    // ── メトリクス計算 ──
    let successCount = 0;
    let failCount = 0;
    let noneCount = 0;

    for (const [, actionResult] of actions) {
      if (actionResult.action === 'none') {
        noneCount++;
      } else if (actionResult.success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    const convergenceRatio = activeAgents.length > 0
      ? noneCount / activeAgents.length
      : 1.0;
    this._convergenceHistory.push(convergenceRatio);

    const metrics: RoundMetrics = {
      activeAgents: activeAgents.length,
      totalPerceptions: perceptions.size,
      totalDecisions: decisions.size,
      conflictCount: conflicts.length,
      actionSuccessCount: successCount,
      actionFailCount: failCount,
      noneActionCount: noneCount,
      convergenceRatio,
    };

    this._isRunning = false;

    this.eventBus.emit('system:init', {
      type: 'round_end',
      round: roundNum,
      metrics,
    }, 'mediator');

    return {
      round: roundNum,
      timestamp,
      perceptions,
      decisions,
      conflicts,
      resolutions,
      resolvedDecisions,
      actions,
      metrics,
    };
  }

  /**
   * 複数ラウンドの連続実行（収束検出付き）
   * @param maxRounds 最大ラウンド数
   * @param convergenceThreshold 収束閾値 (全Agentのnone率がこの値以上で収束)
   * @param environment 環境マップ
   */
  run(
    maxRounds: number = 10,
    convergenceThreshold: number = 1.0,
    environment?: Map<string, any>,
  ): RunResult {
    const rounds: RoundResult[] = [];
    let converged = false;
    let convergenceRound: number | null = null;

    this.eventBus.emit('system:init', {
      type: 'run_start',
      maxRounds,
      convergenceThreshold,
    }, 'mediator');

    for (let i = 0; i < maxRounds; i++) {
      const round = this.runRound(environment);
      rounds.push(round);

      // 収束判定
      if (round.metrics.convergenceRatio >= convergenceThreshold) {
        converged = true;
        convergenceRound = round.round;
        break;
      }

      // Agentが全消滅した場合も終了
      if (round.metrics.activeAgents === 0) {
        converged = true;
        convergenceRound = round.round;
        break;
      }
    }

    const activeAgents = this.registry.list()
      .filter(a => a.state === 'active');

    const result: RunResult = {
      totalRounds: rounds.length,
      converged,
      convergenceRound,
      rounds,
      finalState: {
        agents: activeAgents.map(a => {
          const agent = this.registry.get(a.id);
          return {
            id: a.id,
            state: a.state,
            kind: a.kind,
            step: agent?.step ?? 0,
          };
        }),
        flowMomentum: this.eventBus.getFlowMomentum(),
      },
    };

    this.eventBus.emit('system:init', {
      type: 'run_end',
      totalRounds: rounds.length,
      converged,
      convergenceRound,
    }, 'mediator');

    return result;
  }

  // ─── 競合検出 ─────────────────────────

  /**
   * 全Agent判断の中から競合を検出する
   */
  private detectConflicts(
    decisions: Map<string, Decision>,
    agentIds: string[],
  ): Conflict[] {
    const conflicts: Conflict[] = [];

    const entries = Array.from(decisions.entries());

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [idA, decA] = entries[i];
        const [idB, decB] = entries[j];

        // 両方「何もしない」の場合はスキップ
        if (decA.action === 'none' && decB.action === 'none') continue;

        const conflict = this.checkConflict(idA, decA, idB, decB);
        if (conflict.type !== 'none') {
          conflicts.push(conflict);
          this._totalConflicts++;
          this._conflictsByType[conflict.type] = (this._conflictsByType[conflict.type] ?? 0) + 1;
        }
      }
    }

    return conflicts;
  }

  /**
   * 2Agent間の競合をチェック
   */
  private checkConflict(
    idA: string, decA: Decision,
    idB: string, decB: Decision,
  ): Conflict {
    // 相互融合: AがBを融合しようとし、BもAを融合しようとしている
    if (decA.action === 'fuse' && decB.action === 'fuse'
        && decA.target === idB && decB.target === idA) {
      return {
        type: 'mutual_fuse',
        agents: [idA, idB],
        decisions: [decA, decB],
        description: `${idA} と ${idB} が相互に融合を試みています`,
      };
    }

    // 同一ターゲット競合: 複数AgentがP同じターゲットに対してアクションを実行
    if (decA.target && decA.target === decB.target
        && decA.action !== 'none' && decB.action !== 'none') {
      return {
        type: 'target_contention',
        agents: [idA, idB],
        decisions: [decA, decB],
        description: `${idA} と ${idB} が同一ターゲット ${decA.target} に対して競合アクション`,
      };
    }

    // 矛盾する行動: 一方が融合、他方が分離を同じ対象に
    if ((decA.action === 'fuse' && decB.action === 'separate' && decA.target === idB)
        || (decB.action === 'fuse' && decA.action === 'separate' && decB.target === idA)) {
      return {
        type: 'contradictory',
        agents: [idA, idB],
        decisions: [decA, decB],
        description: `${idA} と ${idB} の行動が矛盾しています（融合 vs 分離）`,
      };
    }

    // リソース競合: 同じ変数へのbind
    if (decA.action === 'bind' && decB.action === 'bind'
        && decA.target && decA.target === decB.target) {
      return {
        type: 'resource_conflict',
        agents: [idA, idB],
        decisions: [decA, decB],
        description: `${idA} と ${idB} が同一リソース ${decA.target} に結合を試みています`,
      };
    }

    return {
      type: 'none',
      agents: [idA, idB],
      decisions: [decA, decB],
      description: '',
    };
  }

  // ─── 競合解決 ─────────────────────────

  /**
   * 検出された競合を全て解決する
   */
  private resolveConflicts(
    conflicts: Conflict[],
    allDecisions: Map<string, Decision>,
  ): ConflictResolution[] {
    return conflicts.map(conflict => this.resolveOne(conflict, allDecisions));
  }

  /**
   * 1つの競合を解決する
   */
  private resolveOne(
    conflict: Conflict,
    allDecisions: Map<string, Decision>,
  ): ConflictResolution {
    const strategy = this.selectStrategy(conflict);
    const [idA, idB] = conflict.agents;
    const [decA, decB] = conflict.decisions;

    let resolution: ConflictResolution;

    switch (strategy) {
      case 'priority':
        resolution = this.resolvePriority(conflict, decA, decB, idA, idB);
        break;
      case 'cooperative':
        resolution = this.resolveCooperative(conflict, decA, decB, idA, idB);
        break;
      case 'sequential':
        resolution = this.resolveSequential(conflict, decA, decB, idA, idB);
        break;
      case 'cancel_both':
        resolution = this.resolveCancelBoth(conflict, decA, decB, idA, idB);
        break;
      case 'mediator':
        resolution = this.resolveMediator(conflict, decA, decB, idA, idB);
        break;
      default:
        resolution = this.resolvePriority(conflict, decA, decB, idA, idB);
    }

    this._totalResolutions++;
    this._resolutionsByStrategy[strategy] = (this._resolutionsByStrategy[strategy] ?? 0) + 1;

    // 解決イベント発火
    this.eventBus.emit('agent:decide', {
      type: 'conflict_resolved',
      conflict: conflict.type,
      strategy,
      agents: conflict.agents,
      reason: resolution.reason,
    }, 'mediator');

    return resolution;
  }

  /**
   * 競合タイプに基づいて最適な解決戦略を選択
   */
  private selectStrategy(conflict: Conflict): ConflictStrategy {
    switch (conflict.type) {
      case 'mutual_fuse':
        // 相互融合 → 協調的に解決（どちらが吸収するか）
        return 'cooperative';
      case 'contradictory':
        // 矛盾 → 優先度で解決
        return 'priority';
      case 'target_contention':
        // ターゲット競合 → デフォルト戦略
        return this._defaultStrategy;
      case 'resource_conflict':
        // リソース競合 → 順次実行
        return 'sequential';
      default:
        return this._defaultStrategy;
    }
  }

  // ─── 解決戦略の実装 ─────────────────────────

  /** 優先度解決: confidence × agentPriority が高い方を採用 */
  private resolvePriority(
    conflict: Conflict, decA: Decision, decB: Decision,
    idA: string, idB: string,
  ): ConflictResolution {
    const scoreA = decA.confidence * this.getAgentPriority(idA);
    const scoreB = decB.confidence * this.getAgentPriority(idB);

    const winner = scoreA >= scoreB ? idA : idB;
    const loser = winner === idA ? idB : idA;

    const noneDecision: Decision = {
      timestamp: Date.now(),
      action: 'none',
      params: {},
      reason: `競合解決(priority): ${winner} が優先 (スコア: ${Math.max(scoreA, scoreB).toFixed(2)} vs ${Math.min(scoreA, scoreB).toFixed(2)})`,
      confidence: 0,
    };

    return {
      conflict,
      strategy: 'priority',
      outcome: {
        [winner]: winner === idA ? decA : decB,
        [loser]: noneDecision,
      },
      reason: `${winner} が優先度で勝利`,
    };
  }

  /** 協調解決: 両者の意図を融合した妥協案 */
  private resolveCooperative(
    conflict: Conflict, decA: Decision, decB: Decision,
    idA: string, idB: string,
  ): ConflictResolution {
    // 相互融合の場合: confidence が高い方が融合の主体になる
    if (conflict.type === 'mutual_fuse') {
      const primary = decA.confidence >= decB.confidence ? idA : idB;
      const secondary = primary === idA ? idB : idA;

      const fuseDec: Decision = {
        timestamp: Date.now(),
        action: 'fuse',
        target: secondary,
        params: { strategy: 'merge' },
        reason: `協調解決: ${primary} が融合の主体（相互融合を統合）`,
        confidence: Math.max(decA.confidence, decB.confidence),
      };

      const acceptDec: Decision = {
        timestamp: Date.now(),
        action: 'none',
        params: { accepted_fuse_from: primary },
        reason: `協調解決: ${secondary} は融合を受け入れ`,
        confidence: Math.min(decA.confidence, decB.confidence),
      };

      return {
        conflict,
        strategy: 'cooperative',
        outcome: {
          [primary]: fuseDec,
          [secondary]: acceptDec,
        },
        reason: `相互融合を協調解決: ${primary} が主体`,
      };
    }

    // その他の協調解決: 両方の行動を弱めて共存
    const weakenedA: Decision = {
      ...decA,
      confidence: decA.confidence * 0.6,
      reason: `協調解決(弱化): ${decA.reason}`,
    };
    const weakenedB: Decision = {
      ...decB,
      confidence: decB.confidence * 0.6,
      reason: `協調解決(弱化): ${decB.reason}`,
    };

    return {
      conflict,
      strategy: 'cooperative',
      outcome: {
        [idA]: weakenedA,
        [idB]: weakenedB,
      },
      reason: '両者の行動を弱化して共存',
    };
  }

  /** 順次解決: 優先度が高い方を先に実行、もう一方はnone */
  private resolveSequential(
    conflict: Conflict, decA: Decision, decB: Decision,
    idA: string, idB: string,
  ): ConflictResolution {
    const prioA = this.getAgentPriority(idA);
    const prioB = this.getAgentPriority(idB);
    const first = prioA >= prioB ? idA : idB;
    const second = first === idA ? idB : idA;

    const deferDecision: Decision = {
      timestamp: Date.now(),
      action: 'none',
      params: { deferred_to_next_round: true },
      reason: `順次解決: ${first} が先行、${second} は次ラウンドに延期`,
      confidence: 0,
    };

    return {
      conflict,
      strategy: 'sequential',
      outcome: {
        [first]: first === idA ? decA : decB,
        [second]: deferDecision,
      },
      reason: `${first} が先行実行`,
    };
  }

  /** 両方キャンセル */
  private resolveCancelBoth(
    conflict: Conflict, decA: Decision, decB: Decision,
    idA: string, idB: string,
  ): ConflictResolution {
    const cancelDec = (agentId: string): Decision => ({
      timestamp: Date.now(),
      action: 'none',
      params: { cancelled_due_to_conflict: true },
      reason: `競合により ${agentId} の行動がキャンセルされました`,
      confidence: 0,
    });

    return {
      conflict,
      strategy: 'cancel_both',
      outcome: {
        [idA]: cancelDec(idA),
        [idB]: cancelDec(idB),
      },
      reason: '競合により両方のアクションをキャンセル',
    };
  }

  /** Mediator独自判断: 競合タイプに応じた最適解 */
  private resolveMediator(
    conflict: Conflict, decA: Decision, decB: Decision,
    idA: string, idB: string,
  ): ConflictResolution {
    // Mediatorの独自判断 — 中道（ちゅうどう）の精神
    // 両者の意図を分析し、全体にとって最善の行動を選択

    // 消滅アクションは常に優先（不可逆なので止めない）
    if (decA.action === 'dissolve') {
      return {
        conflict,
        strategy: 'mediator',
        outcome: {
          [idA]: decA,
          [idB]: { ...decB, action: 'none', reason: 'Mediator: 消滅アクションを優先', confidence: 0 },
        },
        reason: `Mediator判断: ${idA}の消滅を優先`,
      };
    }
    if (decB.action === 'dissolve') {
      return {
        conflict,
        strategy: 'mediator',
        outcome: {
          [idA]: { ...decA, action: 'none', reason: 'Mediator: 消滅アクションを優先', confidence: 0 },
          [idB]: decB,
        },
        reason: `Mediator判断: ${idB}の消滅を優先`,
      };
    }

    // それ以外: priority解決にフォールバック
    return this.resolvePriority(conflict, decA, decB, idA, idB);
  }

  // ─── Agent間メッセージング ─────────────────────────

  /**
   * Agent間でメッセージを送信（EventBus経由）
   */
  sendMessage(fromId: string, toId: string, data: Record<string, any>): ReiEvent {
    return this.eventBus.emit('agent:act', {
      type: 'message',
      fromAgent: fromId,
      targetId: toId,
      ...data,
    }, fromId);
  }

  /**
   * 全Agentにブロードキャスト
   */
  broadcast(fromId: string, data: Record<string, any>): ReiEvent {
    return this.eventBus.emit('agent:act', {
      type: 'broadcast',
      fromAgent: fromId,
      ...data,
    }, fromId);
  }

  // ─── σ（自己記述） ─────────────────────────

  sigma(): MediatorSigma {
    return {
      reiType: 'MediatorSigma',
      totalRounds: this._totalRounds,
      totalConflicts: this._totalConflicts,
      totalResolutions: this._totalResolutions,
      conflictsByType: { ...this._conflictsByType },
      resolutionsByStrategy: { ...this._resolutionsByStrategy },
      defaultStrategy: this._defaultStrategy,
      convergenceHistory: [...this._convergenceHistory],
      isRunning: this._isRunning,
    };
  }

  /** 統計リセット */
  reset(): void {
    this._totalRounds = 0;
    this._totalConflicts = 0;
    this._totalResolutions = 0;
    this._conflictsByType = {};
    this._resolutionsByStrategy = {};
    this._convergenceHistory = [];
    this._agentPriorities.clear();
  }
}
