// ============================================================
// Rei v0.5 — EventBus (イベントバス)
// Phase 2a: イベント駆動基盤
//
// 設計思想:
//   Evaluatorインスタンスごとに1つのEventBusを保持。
//   型安全なイベント定義、フィルタリング、購読管理。
//   六属性「流れ」との概念的接続（FlowMomentum）。
//
// Author: Nobuki Fujimoto / Claude (collaborative design)
// ============================================================

// ─── イベント型定義 ─────────────────────────

export type EventCategory =
  | 'entity'    // エンティティ操作
  | 'binding'   // 結合操作
  | 'will'      // 意志操作
  | 'space'     // 空間操作
  | 'pipe'      // パイプ操作
  | 'agent'     // Agent操作 (Phase 2b)
  | 'system';   // システムイベント

export type EventAction =
  // entity
  | 'recognize' | 'fuse' | 'separate' | 'transform'
  // binding
  | 'create' | 'break' | 'propagate'
  // will
  | 'intend' | 'compute' | 'iterate'
  // space
  | 'step' | 'diffuse' | 'converge'
  // agent (Phase 2b)
  | 'spawn' | 'perceive' | 'decide' | 'act' | 'destroy'
  // pipe
  | 'execute'
  // system
  | 'init' | 'reset' | 'error';

export type EventType = `${EventCategory}:${EventAction}`;

/** イベントデータ */
export interface ReiEvent {
  type: EventType;
  category: EventCategory;
  action: EventAction;
  timestamp: number;
  data: Record<string, any>;
  source?: string;        // 発火元のID
  depth: number;          // 連鎖深度（無限連鎖防止）
}

/** フィルタ関数型 */
export type EventFilter = (event: ReiEvent) => boolean;

/** リスナー関数型 */
export type EventListener = (event: ReiEvent) => void;

/** 購読情報 */
interface Subscription {
  id: number;
  filter: EventFilter;
  listener: EventListener;
  once: boolean;
}

// ─── FlowMomentum — 六属性「流れ」との接続 ─────────

export type FlowMomentumState =
  | 'rest'         // 静止 — イベントなし
  | 'expanding'    // 拡張 — イベント増加中
  | 'contracting'  // 収縮 — イベント減少中
  | 'converged'    // 収束 — 安定状態
  | 'pulsing';     // 脈動 — 周期的パターン

export interface FlowMomentum {
  state: FlowMomentumState;
  rate: number;          // イベント/秒
  recentCount: number;   // 直近ウィンドウのイベント数
  trend: number;         // -1.0〜1.0 (減少〜増加)
}

// ─── EventBusのσ情報 ─────────────────────────

export interface EventBusSigma {
  reiType: 'EventBusSigma';
  totalEmitted: number;
  totalListeners: number;
  categoryCounts: Record<string, number>;
  flowMomentum: FlowMomentum;
  maxDepth: number;
  logSize: number;
}

// ─── ReiEventBus クラス ─────────────────────────

const MAX_DEPTH = 16;
const DEFAULT_LOG_LIMIT = 1000;
const FLOW_WINDOW_MS = 5000;  // FlowMomentum計算用ウィンドウ

export class ReiEventBus {
  private subscriptions: Subscription[] = [];
  private nextId = 0;
  private eventLog: ReiEvent[] = [];
  private logLimit: number;
  private totalEmitted = 0;
  private currentDepth = 0;

  // FlowMomentum用
  private recentTimestamps: number[] = [];

  constructor(logLimit: number = DEFAULT_LOG_LIMIT) {
    this.logLimit = logLimit;
  }

  // ─── 購読 ─────────────────────────

  /**
   * イベントを購読する
   * @returns 購読解除関数
   */
  on(filter: EventFilter | EventType | EventCategory | '*', listener: EventListener): () => void {
    const resolvedFilter = this.resolveFilter(filter);
    const sub: Subscription = {
      id: this.nextId++,
      filter: resolvedFilter,
      listener,
      once: false,
    };
    this.subscriptions.push(sub);
    return () => this.unsubscribe(sub.id);
  }

  /**
   * 一度だけイベントを購読する
   * @returns 購読解除関数
   */
  once(filter: EventFilter | EventType | EventCategory | '*', listener: EventListener): () => void {
    const resolvedFilter = this.resolveFilter(filter);
    const sub: Subscription = {
      id: this.nextId++,
      filter: resolvedFilter,
      listener,
      once: true,
    };
    this.subscriptions.push(sub);
    return () => this.unsubscribe(sub.id);
  }

  private unsubscribe(id: number): void {
    this.subscriptions = this.subscriptions.filter(s => s.id !== id);
  }

  private resolveFilter(filter: EventFilter | EventType | EventCategory | '*'): EventFilter {
    if (typeof filter === 'function') return filter;
    if (filter === '*') return () => true;
    // EventType完全一致 (例: 'entity:recognize')
    if (filter.includes(':')) return (e) => e.type === filter;
    // カテゴリワイルドカード (例: 'entity')
    return (e) => e.category === filter;
  }

  // ─── 発火 ─────────────────────────

  /**
   * イベントを発火する
   */
  emit(type: EventType, data: Record<string, any> = {}, source?: string): ReiEvent {
    if (this.currentDepth >= MAX_DEPTH) {
      const errorEvent = this.createEvent('system:error', {
        error: `最大連鎖深度 ${MAX_DEPTH} に到達`,
        originalType: type,
      }, source);
      this.logEvent(errorEvent);
      return errorEvent;
    }

    const [category, action] = type.split(':') as [EventCategory, EventAction];
    const event: ReiEvent = {
      type,
      category,
      action,
      timestamp: Date.now(),
      data,
      source,
      depth: this.currentDepth,
    };

    this.logEvent(event);
    this.totalEmitted++;
    this.recentTimestamps.push(event.timestamp);

    // リスナー呼び出し（エラー耐性）
    this.currentDepth++;
    const toRemove: number[] = [];

    for (const sub of this.subscriptions) {
      try {
        if (sub.filter(event)) {
          sub.listener(event);
          if (sub.once) toRemove.push(sub.id);
        }
      } catch (err) {
        // リスナーエラーは握りつぶさず、ログに記録
        this.logEvent(this.createEvent('system:error', {
          error: `リスナーエラー: ${(err as Error).message}`,
          listenerId: sub.id,
          originalEvent: type,
        }));
      }
    }

    this.currentDepth--;

    // once購読の解除
    if (toRemove.length > 0) {
      this.subscriptions = this.subscriptions.filter(s => !toRemove.includes(s.id));
    }

    return event;
  }

  private createEvent(type: EventType, data: Record<string, any>, source?: string): ReiEvent {
    const [category, action] = type.split(':') as [EventCategory, EventAction];
    return {
      type, category, action,
      timestamp: Date.now(),
      data, source,
      depth: this.currentDepth,
    };
  }

  // ─── ログ管理 ─────────────────────────

  private logEvent(event: ReiEvent): void {
    this.eventLog.push(event);
    if (this.eventLog.length > this.logLimit) {
      this.eventLog = this.eventLog.slice(-Math.floor(this.logLimit * 0.8));
    }
  }

  /** イベントログ取得（カテゴリでフィルタ可） */
  getLog(category?: EventCategory): ReiEvent[] {
    if (!category) return [...this.eventLog];
    return this.eventLog.filter(e => e.category === category);
  }

  /** イベント数 */
  getEventCount(): number {
    return this.totalEmitted;
  }

  // ─── FlowMomentum ─────────────────────────

  getFlowMomentum(): FlowMomentum {
    const now = Date.now();
    const windowStart = now - FLOW_WINDOW_MS;

    // 古いタイムスタンプを除去
    this.recentTimestamps = this.recentTimestamps.filter(t => t >= windowStart);

    const count = this.recentTimestamps.length;
    const rate = count / (FLOW_WINDOW_MS / 1000);

    // トレンド計算（前半 vs 後半）
    const midpoint = windowStart + FLOW_WINDOW_MS / 2;
    const firstHalf = this.recentTimestamps.filter(t => t < midpoint).length;
    const secondHalf = count - firstHalf;
    const trend = count > 0
      ? Math.max(-1, Math.min(1, (secondHalf - firstHalf) / Math.max(count, 1)))
      : 0;

    // 状態判定
    let state: FlowMomentumState;
    if (count === 0) {
      state = 'rest';
    } else if (trend > 0.3) {
      state = 'expanding';
    } else if (trend < -0.3) {
      state = 'contracting';
    } else if (rate < 0.5) {
      state = 'converged';
    } else {
      state = 'pulsing';
    }

    return { state, rate, recentCount: count, trend };
  }

  // ─── σ（自己記述） ─────────────────────────

  getSigma(): EventBusSigma {
    const categoryCounts: Record<string, number> = {};
    for (const event of this.eventLog) {
      categoryCounts[event.category] = (categoryCounts[event.category] ?? 0) + 1;
    }

    return {
      reiType: 'EventBusSigma',
      totalEmitted: this.totalEmitted,
      totalListeners: this.subscriptions.length,
      categoryCounts,
      flowMomentum: this.getFlowMomentum(),
      maxDepth: MAX_DEPTH,
      logSize: this.eventLog.length,
    };
  }

  // ─── ユーティリティ ─────────────────────────

  /** 全購読を解除 */
  clear(): void {
    this.subscriptions = [];
  }

  /** ログをクリア */
  clearLog(): void {
    this.eventLog = [];
    this.recentTimestamps = [];
  }

  /** リスナー数 */
  listenerCount(): number {
    return this.subscriptions.length;
  }
}

// ─── ヘルパー: イベント生成関数 ─────────────────────

export function createEntityEvent(action: EventAction, data: Record<string, any>, source?: string): EventType {
  return `entity:${action}`;
}

export function createBindingEvent(action: EventAction, data: Record<string, any>, source?: string): EventType {
  return `binding:${action}`;
}

export function createWillEvent(action: EventAction, data: Record<string, any>, source?: string): EventType {
  return `will:${action}`;
}

export function createSpaceEvent(action: EventAction, data: Record<string, any>, source?: string): EventType {
  return `space:${action}`;
}

export function createAgentEvent(action: EventAction, data: Record<string, any>, source?: string): EventType {
  return `agent:${action}`;
}

export function createPipeEvent(data: Record<string, any>, source?: string): EventType {
  return `pipe:execute`;
}
