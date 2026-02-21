// ============================================================
// Rei v0.5 — Entity Agent (エンティティエージェント)
// Phase 2b: 六属性を持つ自律Agent抽象化
//
// 設計思想:
//   全プリミティブが「自律的存在」として振る舞うための統合層。
//   六属性（場・流れ・記憶・層・関係・意志）をAgentに内在させ、
//   EventBusを通じて perceive → decide → act サイクルを実行する。
//
// 構造哲学との対応:
//   全要素の計算可能性: あらゆる存在が自律的振る舞いの潜在能力を持つ
//   → あらゆるRei値がAgent（自律的存在）になりうる
//   六属性体系: 六つの認識・行動能力
//   → 六属性が認識・行動の基盤
//
// D-FUMT 6属性との統合:
//   場(field)   = Agentが保持する値そのもの
//   流れ(flow)  = イベントの方向性・勢い（EventBus FlowMomentum）
//   記憶(memory) = 行動履歴・認識履歴
//   層(layer)   = Agentの深度（内包するAgentの階層）
//   関係(relation) = BindingRegistry上の結合
//   意志(will)  = 目標・意図（ReiIntention）
//
// 考案者: 藤本伸樹 (Nobuki Fujimoto)
// ============================================================

import {
  ReiEventBus,
  type ReiEvent, type EventType, type EventCategory, type EventAction,
  type FlowMomentum,
} from './event-bus';
import {
  recognize, fuse, separate, transform, buildEntitySigma,
  attachEntityMeta, getEntityMeta, unwrapAutonomousEntity,
  inferEntityKind,
  type EntityKind, type FusionStrategy, type TransformDirection,
  type RecognitionResult, type FusionResult, type SeparationResult,
  type TransformResult, type EntitySigma, type EntityMeta,
} from './autonomy';
import type { ReiIntention, IntentionType, WillComputeResult } from './will';
import type { BindingSummary, ReiBinding } from './relation';

// ─── Agent型定義 ─────────────────────────

/** Agent の振る舞いポリシー */
export type AgentBehavior =
  | 'reactive'     // 受動的 — イベントに反応するだけ
  | 'autonomous'   // 自律的 — 自分で判断・行動
  | 'cooperative'  // 協調的 — 他Agentとの調和を優先
  | 'explorative'; // 探索的 — 未知の相互作用を積極的に試みる

/** Agent の状態 */
export type AgentState =
  | 'dormant'    // 休眠 — まだ起動していない
  | 'active'     // 活動中
  | 'perceiving' // 認識中
  | 'deciding'   // 判断中
  | 'acting'     // 行動中
  | 'suspended'  // 一時停止
  | 'dissolved'; // 消滅

/** 認識（Perception）結果 */
export interface Perception {
  timestamp: number;
  events: ReiEvent[];         // 受信したイベント群
  recognized: RecognitionResult | null;  // 環境認識結果
  flowState: FlowMomentum;    // 現在の流れ状態
  context: Record<string, any>; // 追加コンテキスト
}

/** 判断（Decision）結果 */
export interface Decision {
  timestamp: number;
  action: AgentActionType;
  target?: string;            // 対象Agent/変数のID
  params: Record<string, any>;
  reason: string;             // 判断理由
  confidence: number;         // 確信度 (0.0〜1.0)
}

/** Agent行動の種類 */
export type AgentActionType =
  | 'none'           // 何もしない
  | 'recognize'      // 環境を認識
  | 'fuse'           // 他エンティティと融合
  | 'separate'       // 自己を分離
  | 'transform'      // 自己を変容
  | 'bind'           // 関係を結ぶ
  | 'unbind'         // 関係を断つ
  | 'intend'         // 意志を設定
  | 'emit'           // イベントを発火
  | 'spawn'          // 子Agentを生成
  | 'dissolve';      // 自己を消滅

/** 行動（Action）結果 */
export interface ActionResult {
  timestamp: number;
  action: AgentActionType;
  success: boolean;
  result: any;
  reason: string;
  sideEffects: ReiEvent[];    // 副作用として発火したイベント
}

/** Agent の記憶エントリ */
export interface AgentMemoryEntry {
  step: number;
  timestamp: number;
  type: 'perception' | 'decision' | 'action';
  summary: string;
  data: any;
}

/** Agent σ（自己記述）*/
export interface AgentSigma {
  reiType: 'AgentSigma';
  id: string;
  state: AgentState;
  behavior: AgentBehavior;
  // 六属性
  field: {
    kind: EntityKind;
    value: any;
    entitySigma: EntitySigma;
  };
  flow: FlowMomentum;
  memory: {
    totalEntries: number;
    recentActions: string[];
    recognitionCount: number;
    fusionCount: number;
  };
  layer: {
    depth: number;
    parentId: string | null;
    childCount: number;
  };
  relation: {
    bindingCount: number;
    bindings: BindingSummary[];
  };
  will: {
    intention: ReiIntention | null;
    satisfaction: number;
  };
  // メタ
  step: number;
  autonomyLevel: number;
  uptime: number;           // 生成からの経過ms
}

// ─── ReiAgent クラス ─────────────────────────

let agentIdCounter = 0;

export class ReiAgent {
  readonly id: string;
  private _value: any;
  private _state: AgentState = 'dormant';
  private _behavior: AgentBehavior;
  private _step = 0;
  private _createdAt: number;

  // 六属性
  private _entityMeta: EntityMeta | undefined;
  private _intention: ReiIntention | null = null;
  private _bindings: BindingSummary[] = [];
  private _parentId: string | null = null;
  private _childIds: string[] = [];
  private _depth: number;
  private _deepMeta: Record<string, any> | null = null; // Phase 4d: sigma-deep統合

  // 記憶
  private _memory: AgentMemoryEntry[] = [];
  private _memoryLimit = 200;

  // EventBus連携
  private _eventBus: ReiEventBus | null = null;
  private _unsubscribers: (() => void)[] = [];

  // 認識バッファ
  private _pendingEvents: ReiEvent[] = [];

  constructor(
    value: any,
    options: {
      id?: string;
      behavior?: AgentBehavior;
      depth?: number;
      parentId?: string | null;
      intention?: ReiIntention | null;
      memoryLimit?: number;
    } = {}
  ) {
    this.id = options.id ?? `agent_${agentIdCounter++}`;
    this._value = value;
    this._behavior = options.behavior ?? 'reactive';
    this._depth = options.depth ?? 0;
    this._parentId = options.parentId ?? null;
    this._intention = options.intention ?? null;
    this._createdAt = Date.now();
    if (options.memoryLimit !== undefined) this._memoryLimit = options.memoryLimit;

    // EntityMetaを取得または推定
    this._entityMeta = getEntityMeta(value) ?? {
      kind: inferEntityKind(value),
      aliases: [],
      autonomyLevel: 0.0,
      recognitionHistory: [],
      fusionHistory: [],
    };
  }

  // ─── プロパティ ─────────────────────────

  get value(): any { return this._value; }
  set value(v: any) { this._value = v; }
  get state(): AgentState { return this._state; }
  get behavior(): AgentBehavior { return this._behavior; }
  get step(): number { return this._step; }
  get kind(): EntityKind { return this._entityMeta?.kind ?? inferEntityKind(this._value); }
  get autonomyLevel(): number { return this._entityMeta?.autonomyLevel ?? 0.0; }
  get intention(): ReiIntention | null { return this._intention; }
  get depth(): number { return this._depth; }
  get parentId(): string | null { return this._parentId; }
  get childIds(): string[] { return [...this._childIds]; }
  get memory(): AgentMemoryEntry[] { return [...this._memory]; }
  get bindings(): BindingSummary[] { return [...this._bindings]; }

  // ─── ライフサイクル ─────────────────────────

  /**
   * Agentを起動する
   */
  activate(eventBus?: ReiEventBus): void {
    if (this._state === 'dissolved') {
      throw new Error(`Agent ${this.id} は消滅済みです`);
    }
    this._state = 'active';
    if (eventBus) {
      this.attachEventBus(eventBus);
    }
    this.addMemory('action', `起動 (behavior: ${this._behavior})`);

    this._eventBus?.emit('agent:spawn', {
      agentId: this.id,
      kind: this.kind,
      behavior: this._behavior,
      value: summarizeValue(this._value),
    }, this.id);
  }

  /**
   * EventBusを接続する
   */
  attachEventBus(eventBus: ReiEventBus): void {
    this.detachEventBus();
    this._eventBus = eventBus;

    // 自分に関連するイベントを購読
    const unsub1 = eventBus.on('entity', (event) => {
      this._pendingEvents.push(event);
    });
    const unsub2 = eventBus.on('binding', (event) => {
      if (event.data.sourceRef === this.id || event.data.targetRef === this.id) {
        this._pendingEvents.push(event);
      }
    });
    const unsub3 = eventBus.on('agent', (event) => {
      if (event.data.agentId === this.id || event.data.targetId === this.id) {
        this._pendingEvents.push(event);
      }
    });

    this._unsubscribers = [unsub1, unsub2, unsub3];
  }

  /**
   * EventBusを切断する
   */
  detachEventBus(): void {
    for (const unsub of this._unsubscribers) unsub();
    this._unsubscribers = [];
    this._eventBus = null;
  }

  /**
   * Agentを一時停止する
   */
  suspend(): void {
    if (this._state !== 'active') return;
    this._state = 'suspended';
    this.addMemory('action', '一時停止');
  }

  /**
   * Agentを再開する
   */
  resume(): void {
    if (this._state !== 'suspended') return;
    this._state = 'active';
    this.addMemory('action', '再開');
  }

  /**
   * Agentを消滅させる
   */
  dissolve(): void {
    this._state = 'dissolved';
    this.detachEventBus();
    this.addMemory('action', '消滅');

    this._eventBus?.emit('agent:destroy', {
      agentId: this.id,
      kind: this.kind,
      step: this._step,
    }, this.id);
  }

  // ─── perceive → decide → act サイクル ─────────

  /**
   * 知覚フェーズ — 環境を認識し、受信イベントを処理する
   */
  perceive(environment?: Map<string, any>, selfName?: string): Perception {
    if (this._state !== 'active') {
      return {
        timestamp: Date.now(),
        events: [],
        recognized: null,
        flowState: { state: 'rest', rate: 0, recentCount: 0, trend: 0 },
        context: { state: this._state },
      };
    }

    this._state = 'perceiving';

    // 受信イベントを取得
    const events = [...this._pendingEvents];
    this._pendingEvents = [];

    // 環境認識
    let recognized: RecognitionResult | null = null;
    if (environment) {
      recognized = recognize(this._value, environment, selfName);
    }

    // FlowMomentum
    const flowState = this._eventBus?.getFlowMomentum() ?? {
      state: 'rest' as const,
      rate: 0,
      recentCount: 0,
      trend: 0,
    };

    const perception: Perception = {
      timestamp: Date.now(),
      events,
      recognized,
      flowState,
      context: {
        step: this._step,
        behavior: this._behavior,
        autonomyLevel: this.autonomyLevel,
      },
    };

    this.addMemory('perception',
      `イベント${events.length}件受信` +
      (recognized ? `, ${recognized.compatibleCount}件の互換エンティティ検出` : '')
    );

    this._state = 'active';

    this._eventBus?.emit('agent:perceive', {
      agentId: this.id,
      eventCount: events.length,
      recognizedCount: recognized?.compatibleCount ?? 0,
    }, this.id);

    return perception;
  }

  /**
   * 判断フェーズ — 知覚結果に基づいて行動を決定する
   */
  decide(perception: Perception): Decision {
    if (this._state !== 'active') {
      return {
        timestamp: Date.now(),
        action: 'none',
        params: {},
        reason: `Agent状態が${this._state}のため行動不可`,
        confidence: 0,
      };
    }

    this._state = 'deciding';

    let decision: Decision;

    switch (this._behavior) {
      case 'reactive':
        decision = this.decideReactive(perception);
        break;
      case 'autonomous':
        decision = this.decideAutonomous(perception);
        break;
      case 'cooperative':
        decision = this.decideCooperative(perception);
        break;
      case 'explorative':
        decision = this.decideExplorative(perception);
        break;
      default:
        decision = {
          timestamp: Date.now(),
          action: 'none',
          params: {},
          reason: '未知のbehavior',
          confidence: 0,
        };
    }

    this.addMemory('decision',
      `${decision.action} (確信度: ${decision.confidence.toFixed(2)}, 理由: ${decision.reason})`
    );

    this._state = 'active';

    this._eventBus?.emit('agent:decide', {
      agentId: this.id,
      action: decision.action,
      confidence: decision.confidence,
      reason: decision.reason,
    }, this.id);

    return decision;
  }

  /**
   * 行動フェーズ — 判断に基づいて実際に行動する
   */
  act(decision: Decision, context?: {
    environment?: Map<string, any>;
    agentRegistry?: AgentRegistry;
    selfName?: string;
  }): ActionResult {
    if (this._state !== 'active') {
      return {
        timestamp: Date.now(),
        action: 'none',
        success: false,
        result: null,
        reason: `Agent状態が${this._state}のため行動不可`,
        sideEffects: [],
      };
    }

    this._state = 'acting';
    this._step++;

    let result: ActionResult;

    try {
      switch (decision.action) {
        case 'recognize':
          result = this.actRecognize(context?.environment, context?.selfName);
          break;
        case 'fuse':
          result = this.actFuse(decision.target, decision.params, context?.agentRegistry);
          break;
        case 'separate':
          result = this.actSeparate();
          break;
        case 'transform':
          result = this.actTransform(decision.params.direction);
          break;
        case 'emit':
          result = this.actEmit(decision.params);
          break;
        case 'dissolve':
          result = this.actDissolve();
          break;
        default:
          result = {
            timestamp: Date.now(),
            action: decision.action,
            success: true,
            result: null,
            reason: '行動なし',
            sideEffects: [],
          };
      }
    } catch (err) {
      result = {
        timestamp: Date.now(),
        action: decision.action,
        success: false,
        result: null,
        reason: `エラー: ${(err as Error).message}`,
        sideEffects: [],
      };
    }

    this.addMemory('action',
      `${result.action}: ${result.success ? '成功' : '失敗'} — ${result.reason}`
    );

    this._state = (this._state as string) === 'dissolved' ? 'dissolved' : 'active';

    this._eventBus?.emit('agent:act', {
      agentId: this.id,
      action: result.action,
      success: result.success,
      step: this._step,
    }, this.id);

    return result;
  }

  /**
   * perceive → decide → act を一括実行（便利メソッド）
   */
  tick(context?: {
    environment?: Map<string, any>;
    agentRegistry?: AgentRegistry;
    selfName?: string;
  }): { perception: Perception; decision: Decision; action: ActionResult } {
    const perception = this.perceive(context?.environment, context?.selfName);
    const decision = this.decide(perception);
    const action = this.act(decision, context);
    return { perception, decision, action };
  }

  // ─── 判断ロジック（behaviorごと） ─────────────

  private decideReactive(perception: Perception): Decision {
    // 受動的: イベントが来た時だけ反応
    if (perception.events.length === 0 && !perception.recognized) {
      return {
        timestamp: Date.now(),
        action: 'none',
        params: {},
        reason: '受動モード: イベントなし',
        confidence: 1.0,
      };
    }

    // 融合イベントがあれば反応
    const fuseEvents = perception.events.filter(e => e.action === 'fuse');
    if (fuseEvents.length > 0) {
      return {
        timestamp: Date.now(),
        action: 'fuse',
        target: fuseEvents[0].data.targetId,
        params: { strategy: fuseEvents[0].data.strategy },
        reason: '融合イベントに反応',
        confidence: 0.8,
      };
    }

    // 互換エンティティが見つかれば認識
    if (perception.recognized && perception.recognized.compatibleCount > 0) {
      return {
        timestamp: Date.now(),
        action: 'recognize',
        params: {},
        reason: `${perception.recognized.compatibleCount}件の互換エンティティを検出`,
        confidence: 0.6,
      };
    }

    return {
      timestamp: Date.now(),
      action: 'none',
      params: {},
      reason: '反応すべきイベントなし',
      confidence: 1.0,
    };
  }

  private decideAutonomous(perception: Perception): Decision {
    // 自律的: 意志に基づいて能動的に行動

    // 意志がある場合: 意志に従う
    if (this._intention && this._intention.active) {
      const satisfaction = this._intention.satisfaction;

      if (satisfaction < 0.3) {
        // 目標未達 → 変容を試みる
        return {
          timestamp: Date.now(),
          action: 'transform',
          params: { direction: 'optimal' },
          reason: `意志満足度 ${satisfaction.toFixed(2)} — 変容で目標接近を試みる`,
          confidence: 0.7,
        };
      }

      if (satisfaction > 0.8) {
        // 目標達成 → 新しい探索
        return {
          timestamp: Date.now(),
          action: 'recognize',
          params: {},
          reason: `意志満足度 ${satisfaction.toFixed(2)} — 目標達成、新しい接続を探索`,
          confidence: 0.6,
        };
      }
    }

    // 互換エンティティがあれば融合を検討
    if (perception.recognized) {
      const best = perception.recognized.recognized[0];
      if (best && best.score > 0.7 && best.fusionPossible) {
        return {
          timestamp: Date.now(),
          action: 'fuse',
          target: best.name,
          params: { strategy: best.suggestedStrategy },
          reason: `高互換性エンティティ ${best.name} (スコア: ${best.score.toFixed(2)}) と融合`,
          confidence: best.score,
        };
      }
    }

    // デフォルト: 環境認識
    return {
      timestamp: Date.now(),
      action: 'recognize',
      params: {},
      reason: '自律モード: 環境を継続認識',
      confidence: 0.5,
    };
  }

  private decideCooperative(perception: Perception): Decision {
    // 協調的: 他Agentとの調和を優先

    // 結合先があれば調和を優先
    if (this._bindings.length > 0) {
      const activeBindings = this._bindings.filter(b => b.active);
      if (activeBindings.length > 0) {
        return {
          timestamp: Date.now(),
          action: 'recognize',
          params: { focus: 'bindings' },
          reason: `${activeBindings.length}件の結合先との調和を確認`,
          confidence: 0.7,
        };
      }
    }

    // 互換エンティティがあれば結合を提案
    if (perception.recognized) {
      const best = perception.recognized.recognized[0];
      if (best && best.score > 0.5) {
        return {
          timestamp: Date.now(),
          action: 'bind',
          target: best.name,
          params: { mode: 'resonance' },
          reason: `互換エンティティ ${best.name} と結合して協調`,
          confidence: best.score * 0.8,
        };
      }
    }

    return {
      timestamp: Date.now(),
      action: 'none',
      params: {},
      reason: '協調モード: 待機中',
      confidence: 1.0,
    };
  }

  private decideExplorative(perception: Perception): Decision {
    // 探索的: 未知の相互作用を積極的に試みる

    // 変容を試みる（新しい形態の探索）
    if (this._step % 3 === 0) {
      const directions: TransformDirection[] = ['to_numeric', 'to_symbolic', 'to_linguistic'];
      const currentKind = this.kind;
      const unexplored = directions.filter(d =>
        d !== `to_${currentKind}` as TransformDirection
      );
      if (unexplored.length > 0) {
        const target = unexplored[this._step % unexplored.length];
        return {
          timestamp: Date.now(),
          action: 'transform',
          params: { direction: target },
          reason: `探索モード: ${target}への変容を試みる`,
          confidence: 0.5,
        };
      }
    }

    // 認識していないエンティティを探す
    return {
      timestamp: Date.now(),
      action: 'recognize',
      params: { threshold: 0.05 },  // 低しきい値で幅広く認識
      reason: '探索モード: 低閾値で幅広い認識',
      confidence: 0.4,
    };
  }

  // ─── 行動実装 ─────────────────────────

  private actRecognize(environment?: Map<string, any>, selfName?: string): ActionResult {
    if (!environment) {
      return {
        timestamp: Date.now(),
        action: 'recognize',
        success: false,
        result: null,
        reason: '環境が提供されていません',
        sideEffects: [],
      };
    }

    const result = recognize(this._value, environment, selfName);

    // 自律度を更新
    if (this._entityMeta) {
      this._entityMeta.autonomyLevel = Math.min(1.0,
        this._entityMeta.autonomyLevel + 0.05 * result.compatibleCount
      );
      this._entityMeta.recognitionHistory.push(
        ...result.recognized.map(r => ({
          timestamp: Date.now(),
          targetKind: r.kind,
          targetRepresentation: r.name,
          compatibility: r.compatibility,
          score: r.score,
        }))
      );
    }

    return {
      timestamp: Date.now(),
      action: 'recognize',
      success: true,
      result,
      reason: `${result.compatibleCount}件の互換エンティティを認識`,
      sideEffects: [],
    };
  }

  private actFuse(targetId?: string, params?: Record<string, any>, registry?: AgentRegistry): ActionResult {
    if (!targetId || !registry) {
      return {
        timestamp: Date.now(),
        action: 'fuse',
        success: false,
        result: null,
        reason: 'ターゲットIDまたはAgentRegistryが不足',
        sideEffects: [],
      };
    }

    const targetAgent = registry.get(targetId);
    if (!targetAgent) {
      return {
        timestamp: Date.now(),
        action: 'fuse',
        success: false,
        result: null,
        reason: `Agent '${targetId}' が見つかりません`,
        sideEffects: [],
      };
    }

    const strategy = params?.strategy as FusionStrategy | undefined;
    const result = fuse(this._value, targetAgent.value, strategy);

    // 融合後の値を更新
    this._value = result.fused;
    this._entityMeta = getEntityMeta(result.fused) ?? this._entityMeta;

    return {
      timestamp: Date.now(),
      action: 'fuse',
      success: true,
      result,
      reason: result.reason,
      sideEffects: [],
    };
  }

  private actSeparate(): ActionResult {
    const result = separate(this._value);

    return {
      timestamp: Date.now(),
      action: 'separate',
      success: result.parts.length > 1,
      result,
      reason: result.reason,
      sideEffects: [],
    };
  }

  private actTransform(direction?: TransformDirection): ActionResult {
    const result = transform(this._value, direction ?? 'optimal');

    if (result.confidence > 0.3) {
      this._value = result.transformed;
      if (this._entityMeta) {
        this._entityMeta.kind = result.transformedKind;
      }
    }

    return {
      timestamp: Date.now(),
      action: 'transform',
      success: result.confidence > 0.3,
      result,
      reason: result.reason,
      sideEffects: [],
    };
  }

  private actEmit(params: Record<string, any>): ActionResult {
    if (!this._eventBus) {
      return {
        timestamp: Date.now(),
        action: 'emit',
        success: false,
        result: null,
        reason: 'EventBusが接続されていません',
        sideEffects: [],
      };
    }

    const eventType = params.type as EventType;
    const data = params.data ?? {};
    const event = this._eventBus.emit(eventType, { ...data, agentId: this.id }, this.id);

    return {
      timestamp: Date.now(),
      action: 'emit',
      success: true,
      result: event,
      reason: `${eventType} を発火`,
      sideEffects: [event],
    };
  }

  private actDissolve(): ActionResult {
    this.dissolve();
    return {
      timestamp: Date.now(),
      action: 'dissolve',
      success: true,
      result: null,
      reason: `Agent ${this.id} は消滅しました`,
      sideEffects: [],
    };
  }

  // ─── 結合管理 ─────────────────────────

  /** 結合情報を更新 */
  updateBindings(bindings: BindingSummary[]): void {
    this._bindings = bindings;
  }

  /** Phase 4d: sigma-deep メタデータの取得・設定 */
  get deepMeta(): Record<string, any> | null { return this._deepMeta; }
  setDeepMeta(meta: Record<string, any>): void { this._deepMeta = meta; }

  // ─── 意志管理 ─────────────────────────

  /** 意志を設定 */
  setIntention(intention: ReiIntention): void {
    this._intention = intention;
    this.addMemory('action', `意志設定: ${intention.type} (優先度: ${intention.priority})`);
  }

  /** 意志をクリア */
  clearIntention(): void {
    this._intention = null;
    this.addMemory('action', '意志クリア');
  }

  // ─── 子Agent管理 ─────────────────────────

  addChild(childId: string): void {
    if (!this._childIds.includes(childId)) {
      this._childIds.push(childId);
    }
  }

  removeChild(childId: string): void {
    this._childIds = this._childIds.filter(id => id !== childId);
  }

  // ─── 記憶管理 ─────────────────────────

  /** メモリに記録を追加（AgentSpace等の外部モジュールからも利用） */
  addMemory(type: AgentMemoryEntry['type'], summary: string, data?: any): void {
    this._memory.push({
      step: this._step,
      timestamp: Date.now(),
      type,
      summary,
      data,
    });
    if (this._memory.length > this._memoryLimit) {
      this._memory = this._memory.slice(-Math.floor(this._memoryLimit * 0.8));
    }
  }

  // ─── σ（自己記述） ─────────────────────────

  sigma(): AgentSigma {
    const entitySigma = buildEntitySigma(this._value);
    const flowMomentum = this._eventBus?.getFlowMomentum() ?? {
      state: 'rest' as const,
      rate: 0,
      recentCount: 0,
      trend: 0,
    };

    const recentActions = this._memory
      .filter(m => m.type === 'action')
      .slice(-5)
      .map(m => m.summary);

    return {
      reiType: 'AgentSigma',
      id: this.id,
      state: this._state,
      behavior: this._behavior,
      field: {
        kind: this.kind,
        value: summarizeValue(this._value),
        entitySigma,
      },
      flow: flowMomentum,
      memory: {
        totalEntries: this._memory.length,
        recentActions,
        recognitionCount: this._entityMeta?.recognitionHistory?.length ?? 0,
        fusionCount: this._entityMeta?.fusionHistory?.length ?? 0,
      },
      layer: {
        depth: this._depth,
        parentId: this._parentId,
        childCount: this._childIds.length,
      },
      relation: {
        bindingCount: this._bindings.length,
        bindings: this._bindings,
        // Phase 4d: sigma-deep 関係情報
        ...(this._deepMeta?.relation ?? {}),
      },
      will: {
        intention: this._intention,
        satisfaction: this._intention?.satisfaction ?? 0,
        // Phase 4d: sigma-deep 意志情報
        ...(this._deepMeta?.will ?? {}),
      },
      step: this._step,
      autonomyLevel: this.autonomyLevel,
      uptime: Date.now() - this._createdAt,
    };
  }
}

// ─── AgentRegistry（Agent管理レジストリ） ─────────

export class AgentRegistry {
  private agents = new Map<string, ReiAgent>();
  private eventBus: ReiEventBus | null = null;

  constructor(eventBus?: ReiEventBus) {
    this.eventBus = eventBus ?? null;
  }

  /**
   * EventBusを設定
   */
  setEventBus(eventBus: ReiEventBus): void {
    this.eventBus = eventBus;
    // 既存Agentにも接続
    for (const agent of this.agents.values()) {
      if (agent.state === 'active') {
        agent.attachEventBus(eventBus);
      }
    }
  }

  /**
   * 新しいAgentを生成して登録
   */
  spawn(value: any, options: {
    id?: string;
    behavior?: AgentBehavior;
    parentId?: string | null;
    intention?: ReiIntention | null;
    autoActivate?: boolean;
  } = {}): ReiAgent {
    const parentAgent = options.parentId ? this.agents.get(options.parentId) : undefined;
    const depth = parentAgent ? parentAgent.depth + 1 : 0;

    const agent = new ReiAgent(value, {
      ...options,
      depth,
    });

    this.agents.set(agent.id, agent);

    if (parentAgent) {
      parentAgent.addChild(agent.id);
    }

    if (options.autoActivate !== false) {
      agent.activate(this.eventBus ?? undefined);
    }

    return agent;
  }

  /**
   * Agentを取得
   */
  get(id: string): ReiAgent | undefined {
    return this.agents.get(id);
  }

  /**
   * Agentを消滅させる
   */
  dissolve(id: string): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;

    // 子Agentも連鎖消滅
    for (const childId of agent.childIds) {
      this.dissolve(childId);
    }

    // 親から自分を除去
    if (agent.parentId) {
      const parent = this.agents.get(agent.parentId);
      parent?.removeChild(id);
    }

    agent.dissolve();
    this.agents.delete(id);
    return true;
  }

  /**
   * 全Agentのtickを実行
   */
  tickAll(environment: Map<string, any>): Map<string, {
    perception: Perception;
    decision: Decision;
    action: ActionResult;
  }> {
    const results = new Map<string, {
      perception: Perception;
      decision: Decision;
      action: ActionResult;
    }>();

    for (const [id, agent] of this.agents) {
      if (agent.state === 'active') {
        const result = agent.tick({
          environment,
          agentRegistry: this,
          selfName: id,
        });
        results.set(id, result);
      }
    }

    return results;
  }

  /**
   * 全Agentを列挙
   */
  list(): Array<{ id: string; state: AgentState; kind: EntityKind; behavior: AgentBehavior }> {
    return Array.from(this.agents.entries()).map(([id, agent]) => ({
      id,
      state: agent.state,
      kind: agent.kind,
      behavior: agent.behavior,
    }));
  }

  /**
   * Agent数
   */
  size(): number {
    return this.agents.size;
  }

  /**
   * 全Agentを消滅
   */
  clear(): void {
    for (const agent of this.agents.values()) {
      agent.dissolve();
    }
    this.agents.clear();
  }

  /**
   * レジストリのσ情報
   */
  sigma(): {
    reiType: 'AgentRegistrySigma';
    totalAgents: number;
    activeAgents: number;
    byState: Record<string, number>;
    byBehavior: Record<string, number>;
    byKind: Record<string, number>;
    maxDepth: number;
  } {
    const byState: Record<string, number> = {};
    const byBehavior: Record<string, number> = {};
    const byKind: Record<string, number> = {};
    let maxDepth = 0;
    let activeCount = 0;

    for (const agent of this.agents.values()) {
      byState[agent.state] = (byState[agent.state] ?? 0) + 1;
      byBehavior[agent.behavior] = (byBehavior[agent.behavior] ?? 0) + 1;
      byKind[agent.kind] = (byKind[agent.kind] ?? 0) + 1;
      if (agent.depth > maxDepth) maxDepth = agent.depth;
      if (agent.state === 'active') activeCount++;
    }

    return {
      reiType: 'AgentRegistrySigma',
      totalAgents: this.agents.size,
      activeAgents: activeCount,
      byState,
      byBehavior,
      byKind,
      maxDepth,
    };
  }
}

// ─── ヘルパー ─────────────────────────

function summarizeValue(v: any): any {
  if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v;
  if (v === null || v === undefined) return v;
  if (v && typeof v === 'object' && v.reiType) {
    return `${v.reiType}(${v.center ?? v.value ?? '...'})`;
  }
  return String(v).substring(0, 50);
}
