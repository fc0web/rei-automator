/**
 * Rei Automator — Phase 9d: Task Dispatcher
 * ノード間タスク分配エンジン
 *
 * リーダーノードがタスクを各ワーカーに分配する。
 * 3つの分配戦略: Round Robin / Least Load / Affinity
 */

import { EventEmitter } from "events";
import { NodeManager, NodeInfo } from "./node-manager";

// ─── Types ───

export type DispatchStrategy = "round-robin" | "least-load" | "affinity";

export interface DispatchResult {
  success: boolean;
  taskId: string;
  targetNodeId: string;
  targetHost: string;
  strategy: DispatchStrategy;
  timestamp: number;
  error?: string;
  remoteTaskId?: string;
}

export interface DispatchOptions {
  /** Rei code to execute */
  code: string;
  /** Preferred strategy (overrides default) */
  strategy?: DispatchStrategy;
  /** For affinity strategy: target node ID */
  affinityNodeId?: string;
  /** For affinity strategy: task name pattern */
  affinityPattern?: string;
  /** API key for authentication on remote node */
  apiKey?: string;
  /** Priority (higher = sooner, default 0) */
  priority?: number;
}

export interface AffinityRule {
  pattern: string; // Task name glob pattern
  nodeId: string; // Target node ID
}

export interface DispatcherConfig {
  defaultStrategy: DispatchStrategy;
  affinityRules: AffinityRule[];
  maxRetries: number;
  retryDelay: number; // ms
  loadThreshold: number; // CPU % above which node is considered "busy"
}

const DEFAULT_DISPATCHER_CONFIG: DispatcherConfig = {
  defaultStrategy: "round-robin",
  affinityRules: [],
  maxRetries: 2,
  retryDelay: 3000,
  loadThreshold: 80,
};

// ─── Task Dispatcher ───

export class TaskDispatcher extends EventEmitter {
  private config: DispatcherConfig;
  private nodeManager: NodeManager;
  private roundRobinIndex = 0;
  private dispatchHistory: DispatchResult[] = [];

  constructor(nodeManager: NodeManager, config: Partial<DispatcherConfig> = {}) {
    super();
    this.nodeManager = nodeManager;
    this.config = { ...DEFAULT_DISPATCHER_CONFIG, ...config };
  }

  // ─── Main Dispatch ───

  async dispatch(options: DispatchOptions): Promise<DispatchResult> {
    const strategy = options.strategy || this.config.defaultStrategy;
    const taskId = `dispatch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    console.log(`[9d-dispatch] Strategy: ${strategy}, Task: ${taskId}`);

    // Select target node
    const target = this.selectNode(strategy, options);
    if (!target) {
      const result: DispatchResult = {
        success: false,
        taskId,
        targetNodeId: "",
        targetHost: "",
        strategy,
        timestamp: Date.now(),
        error: "No available nodes for dispatch",
      };
      this.recordResult(result);
      return result;
    }

    console.log(`[9d-dispatch] Target: ${target.name} (${target.host})`);

    // Execute with retries
    let lastError = "";
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const remoteResult = await this.executeOnNode(target, options.code, options.apiKey);

        if (remoteResult) {
          const result: DispatchResult = {
            success: true,
            taskId,
            targetNodeId: target.id,
            targetHost: target.host,
            strategy,
            timestamp: Date.now(),
            remoteTaskId: remoteResult.taskId,
          };
          this.recordResult(result);
          this.emit("dispatch:success", result);
          return result;
        }

        lastError = "Remote node returned empty response";
      } catch (err) {
        lastError = (err as Error).message;
        console.warn(`[9d-dispatch] Attempt ${attempt + 1} failed: ${lastError}`);

        if (attempt < this.config.maxRetries) {
          await this.sleep(this.config.retryDelay);
        }
      }
    }

    // All retries exhausted
    const failResult: DispatchResult = {
      success: false,
      taskId,
      targetNodeId: target.id,
      targetHost: target.host,
      strategy,
      timestamp: Date.now(),
      error: `Failed after ${this.config.maxRetries + 1} attempts: ${lastError}`,
    };
    this.recordResult(failResult);
    this.emit("dispatch:error", failResult);
    return failResult;
  }

  /**
   * Dispatch to a specific node by ID.
   */
  async dispatchToNode(nodeId: string, code: string, apiKey?: string): Promise<DispatchResult> {
    return this.dispatch({
      code,
      strategy: "affinity",
      affinityNodeId: nodeId,
      apiKey,
    });
  }

  /**
   * Broadcast: execute the same task on ALL online nodes.
   */
  async broadcastTask(code: string, apiKey?: string): Promise<DispatchResult[]> {
    const nodes = this.nodeManager.getOnlineNodes().filter(
      (n) => n.id !== this.nodeManager.getSelf().id
    );

    const results = await Promise.all(
      nodes.map((node) => this.dispatchToNode(node.id, code, apiKey))
    );

    this.emit("dispatch:broadcast", { count: results.length, results });
    return results;
  }

  // ─── Node Selection Strategies ───

  private selectNode(strategy: DispatchStrategy, options: DispatchOptions): NodeInfo | null {
    const candidates = this.nodeManager
      .getOnlineNodes()
      .filter((n) => n.id !== this.nodeManager.getSelf().id); // Don't dispatch to self

    if (candidates.length === 0) return null;

    switch (strategy) {
      case "round-robin":
        return this.selectRoundRobin(candidates);
      case "least-load":
        return this.selectLeastLoad(candidates);
      case "affinity":
        return this.selectAffinity(candidates, options);
      default:
        return this.selectRoundRobin(candidates);
    }
  }

  /**
   * Round Robin: 順番に均等分配
   */
  private selectRoundRobin(candidates: NodeInfo[]): NodeInfo {
    const node = candidates[this.roundRobinIndex % candidates.length];
    this.roundRobinIndex++;
    return node;
  }

  /**
   * Least Load: 負荷最小ノードに優先分配
   * Score = (CPU% × 0.4) + (runningTasks × 10 × 0.4) + (queuedTasks × 5 × 0.2)
   */
  private selectLeastLoad(candidates: NodeInfo[]): NodeInfo {
    let bestNode = candidates[0];
    let bestScore = Infinity;

    for (const node of candidates) {
      // Skip overloaded nodes
      if (node.stats.cpuUsage > this.config.loadThreshold) continue;

      const score =
        node.stats.cpuUsage * 0.4 +
        node.stats.tasksRunning * 10 * 0.4 +
        node.stats.tasksQueued * 5 * 0.2;

      if (score < bestScore) {
        bestScore = score;
        bestNode = node;
      }
    }

    return bestNode;
  }

  /**
   * Affinity: 特定タスク → 特定ノード固定
   */
  private selectAffinity(candidates: NodeInfo[], options: DispatchOptions): NodeInfo | null {
    // Direct node ID specification
    if (options.affinityNodeId) {
      return candidates.find((n) => n.id === options.affinityNodeId) || null;
    }

    // Pattern-based affinity rules
    if (options.affinityPattern) {
      for (const rule of this.config.affinityRules) {
        if (this.matchGlob(options.affinityPattern, rule.pattern)) {
          const target = candidates.find((n) => n.id === rule.nodeId);
          if (target) return target;
        }
      }
    }

    // Fallback to least-load if no affinity match
    return this.selectLeastLoad(candidates);
  }

  // ─── Remote Execution ───

  private async executeOnNode(
    node: NodeInfo,
    code: string,
    apiKey?: string
  ): Promise<{ taskId: string } | null> {
    const url = `http://${node.host}/api/tasks/run`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ code }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      return (await res.json()) as { taskId: string };
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  // ─── Configuration ───

  setStrategy(strategy: DispatchStrategy): void {
    this.config.defaultStrategy = strategy;
    this.emit("config:changed", { strategy });
    console.log(`[9d-dispatch] Strategy changed to: ${strategy}`);
  }

  addAffinityRule(pattern: string, nodeId: string): void {
    this.config.affinityRules.push({ pattern, nodeId });
    console.log(`[9d-dispatch] Affinity rule added: ${pattern} → ${nodeId}`);
  }

  removeAffinityRule(pattern: string): void {
    this.config.affinityRules = this.config.affinityRules.filter((r) => r.pattern !== pattern);
  }

  getConfig(): DispatcherConfig {
    return { ...this.config };
  }

  // ─── History & Stats ───

  private recordResult(result: DispatchResult): void {
    this.dispatchHistory.push(result);
    // Keep last 500 results
    if (this.dispatchHistory.length > 500) {
      this.dispatchHistory = this.dispatchHistory.slice(-500);
    }
  }

  getHistory(limit = 50): DispatchResult[] {
    return this.dispatchHistory.slice(-limit);
  }

  getStats(): {
    totalDispatched: number;
    successCount: number;
    errorCount: number;
    successRate: number;
    byStrategy: Record<string, number>;
    byNode: Record<string, number>;
  } {
    const total = this.dispatchHistory.length;
    const successes = this.dispatchHistory.filter((r) => r.success).length;
    const errors = total - successes;

    const byStrategy: Record<string, number> = {};
    const byNode: Record<string, number> = {};
    for (const r of this.dispatchHistory) {
      byStrategy[r.strategy] = (byStrategy[r.strategy] || 0) + 1;
      if (r.targetNodeId) {
        byNode[r.targetNodeId] = (byNode[r.targetNodeId] || 0) + 1;
      }
    }

    return {
      totalDispatched: total,
      successCount: successes,
      errorCount: errors,
      successRate: total > 0 ? Math.round((successes / total) * 1000) / 10 : 0,
      byStrategy,
      byNode,
    };
  }

  // ─── Utilities ───

  private matchGlob(text: string, pattern: string): boolean {
    const regex = new RegExp(
      "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$"
    );
    return regex.test(text);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
