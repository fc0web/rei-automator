/**
 * Rei Automator — Phase 9d: Node Communication Manager
 * ノード間通信・ディスカバリ・リーダー選出
 *
 * 各ノードはREST API（ポート19720）で相互通信。
 * リーダーノードがクラスタ全体の状態を管理し、タスク分配を決定する。
 */

import { EventEmitter } from "events";

// ─── Types ───

export interface NodeInfo {
  id: string;
  name: string;
  host: string; // "hostname:port"
  role: "leader" | "worker";
  status: "online" | "offline" | "busy";
  joinedAt: number;
  lastHeartbeat: number;
  stats: NodeStats;
}

export interface NodeStats {
  cpuUsage: number;
  memoryUsage: number;
  tasksRunning: number;
  tasksQueued: number;
  tasksCompleted: number;
  uptime: number;
}

export interface ClusterState {
  leaderId: string | null;
  nodes: Map<string, NodeInfo>;
  version: number; // Incremented on every state change
}

export interface NodeConfig {
  nodeId: string;
  nodeName: string;
  listenPort: number;
  seedNodes: string[]; // Initial nodes to contact: ["host:port", ...]
  heartbeatInterval: number; // ms
  heartbeatTimeout: number; // ms (node considered dead after this)
  electionTimeout: number; // ms
}

const DEFAULT_CONFIG: NodeConfig = {
  nodeId: `node-${Date.now().toString(36)}`,
  nodeName: "Rei Node",
  listenPort: 19720,
  seedNodes: [],
  heartbeatInterval: 10000, // 10s
  heartbeatTimeout: 30000, // 30s
  electionTimeout: 5000, // 5s
};

// ─── Node Manager ───

export class NodeManager extends EventEmitter {
  private config: NodeConfig;
  private cluster: ClusterState;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private electionTimer: ReturnType<typeof setTimeout> | null = null;
  private isRunning = false;

  constructor(config: Partial<NodeConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cluster = {
      leaderId: null,
      nodes: new Map(),
      version: 0,
    };

    // Register self
    const self: NodeInfo = {
      id: this.config.nodeId,
      name: this.config.nodeName,
      host: `localhost:${this.config.listenPort}`,
      role: "worker",
      status: "online",
      joinedAt: Date.now(),
      lastHeartbeat: Date.now(),
      stats: {
        cpuUsage: 0,
        memoryUsage: 0,
        tasksRunning: 0,
        tasksQueued: 0,
        tasksCompleted: 0,
        uptime: 0,
      },
    };
    this.cluster.nodes.set(self.id, self);
  }

  // ─── Lifecycle ───

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log(`[9d] Node ${this.config.nodeId} starting...`);

    // Contact seed nodes
    await this.discoverNodes();

    // Start heartbeat
    this.heartbeatTimer = setInterval(() => this.sendHeartbeats(), this.config.heartbeatInterval);

    // Trigger initial leader election
    await this.electLeader();

    this.emit("started", { nodeId: this.config.nodeId });
    console.log(`[9d] Node ${this.config.nodeId} started. Role: ${this.getSelf().role}`);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.electionTimer) clearTimeout(this.electionTimer);

    // Notify other nodes of departure
    await this.broadcastToAll("POST", "/api/cluster/leave", {
      nodeId: this.config.nodeId,
    });

    this.emit("stopped", { nodeId: this.config.nodeId });
    console.log(`[9d] Node ${this.config.nodeId} stopped.`);
  }

  // ─── Discovery ───

  private async discoverNodes(): Promise<void> {
    for (const seedHost of this.config.seedNodes) {
      try {
        const info = await this.fetchFromNode(seedHost, "GET", "/api/cluster/info");
        if (info) {
          this.registerNode({
            id: info.nodeId,
            name: info.nodeName,
            host: seedHost,
            role: "worker",
            status: "online",
            joinedAt: info.joinedAt || Date.now(),
            lastHeartbeat: Date.now(),
            stats: info.stats || this.emptyStats(),
          });

          // Also fetch that node's known peers
          const peers = await this.fetchFromNode(seedHost, "GET", "/api/cluster/nodes");
          if (peers && Array.isArray(peers.nodes)) {
            for (const peer of peers.nodes) {
              if (peer.id !== this.config.nodeId && !this.cluster.nodes.has(peer.id)) {
                this.registerNode(peer);
              }
            }
          }

          // Announce self to the seed node
          await this.fetchFromNode(seedHost, "POST", "/api/cluster/join", {
            id: this.config.nodeId,
            name: this.config.nodeName,
            host: `${this.getLocalHost()}:${this.config.listenPort}`,
          });
        }
      } catch (err) {
        console.warn(`[9d] Failed to contact seed node ${seedHost}:`, (err as Error).message);
      }
    }
  }

  private registerNode(node: NodeInfo): void {
    const existing = this.cluster.nodes.get(node.id);
    if (!existing || node.lastHeartbeat > existing.lastHeartbeat) {
      this.cluster.nodes.set(node.id, node);
      this.cluster.version++;
      this.emit("node:updated", node);
      if (!existing) {
        console.log(`[9d] Node discovered: ${node.name} (${node.host})`);
        this.emit("node:joined", node);
      }
    }
  }

  // ─── Heartbeat ───

  private async sendHeartbeats(): Promise<void> {
    // Update own stats
    const self = this.getSelf();
    self.lastHeartbeat = Date.now();
    self.stats = await this.collectLocalStats();

    // Check for dead nodes
    const now = Date.now();
    for (const [id, node] of this.cluster.nodes) {
      if (id === this.config.nodeId) continue;
      if (now - node.lastHeartbeat > this.config.heartbeatTimeout) {
        if (node.status !== "offline") {
          node.status = "offline";
          this.cluster.version++;
          console.log(`[9d] Node ${node.name} (${node.host}) went offline.`);
          this.emit("node:offline", node);

          // Re-elect if leader went down
          if (node.id === this.cluster.leaderId) {
            console.log("[9d] Leader went offline. Triggering re-election...");
            await this.electLeader();
          }
        }
      }
    }

    // Send heartbeat to all online peers
    await this.broadcastToAll("POST", "/api/cluster/heartbeat", {
      nodeId: this.config.nodeId,
      stats: self.stats,
      clusterVersion: this.cluster.version,
    });
  }

  private async collectLocalStats(): Promise<NodeStats> {
    // In production, collect real metrics via os module
    const uptime = Math.floor((Date.now() - this.getSelf().joinedAt) / 1000);
    return {
      cpuUsage: Math.round(Math.random() * 40 * 10) / 10, // Placeholder
      memoryUsage: Math.round((process.memoryUsage?.().heapUsed || 0) / 1024 / 1024 * 10) / 10,
      tasksRunning: 0, // Will be set by daemon integration
      tasksQueued: 0,
      tasksCompleted: 0,
      uptime,
    };
  }

  // ─── Leader Election (Simple Bully Algorithm) ───

  /**
   * Simple leader election:
   * - Node with the lexicographically smallest ID among online nodes becomes leader.
   * - If current leader goes offline, re-election is triggered.
   * - Deterministic: all nodes arrive at the same conclusion.
   */
  async electLeader(): Promise<void> {
    const onlineNodes = Array.from(this.cluster.nodes.values())
      .filter((n) => n.status === "online" || n.id === this.config.nodeId)
      .sort((a, b) => a.id.localeCompare(b.id));

    if (onlineNodes.length === 0) return;

    const newLeader = onlineNodes[0];
    const prevLeader = this.cluster.leaderId;

    this.cluster.leaderId = newLeader.id;
    this.cluster.version++;

    // Update roles
    for (const node of this.cluster.nodes.values()) {
      node.role = node.id === newLeader.id ? "leader" : "worker";
    }

    if (prevLeader !== newLeader.id) {
      console.log(`[9d] Leader elected: ${newLeader.name} (${newLeader.id})`);
      this.emit("leader:elected", newLeader);

      // Broadcast new leader to all nodes
      await this.broadcastToAll("POST", "/api/cluster/leader", {
        leaderId: newLeader.id,
        clusterVersion: this.cluster.version,
      });
    }
  }

  // ─── Communication Helpers ───

  private async fetchFromNode(
    host: string,
    method: string,
    path: string,
    body?: any
  ): Promise<any> {
    const url = `http://${host}${path}`;
    try {
      // Use dynamic import for fetch in Node.js < 18, or native fetch
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  private async broadcastToAll(method: string, path: string, body?: any): Promise<void> {
    const promises: Promise<any>[] = [];
    for (const [id, node] of this.cluster.nodes) {
      if (id === this.config.nodeId) continue;
      if (node.status === "offline") continue;
      promises.push(this.fetchFromNode(node.host, method, path, body));
    }
    await Promise.allSettled(promises);
  }

  private getLocalHost(): string {
    // In production, detect actual network interface
    return "localhost";
  }

  private emptyStats(): NodeStats {
    return { cpuUsage: 0, memoryUsage: 0, tasksRunning: 0, tasksQueued: 0, tasksCompleted: 0, uptime: 0 };
  }

  // ─── Public API (for api-routes.ts integration) ───

  getSelf(): NodeInfo {
    return this.cluster.nodes.get(this.config.nodeId)!;
  }

  getCluster(): ClusterState {
    return this.cluster;
  }

  getNodes(): NodeInfo[] {
    return Array.from(this.cluster.nodes.values());
  }

  getOnlineNodes(): NodeInfo[] {
    return this.getNodes().filter((n) => n.status === "online");
  }

  getLeader(): NodeInfo | null {
    if (!this.cluster.leaderId) return null;
    return this.cluster.nodes.get(this.cluster.leaderId) || null;
  }

  isLeader(): boolean {
    return this.cluster.leaderId === this.config.nodeId;
  }

  /**
   * Handle incoming heartbeat from a peer node.
   * Called from api-routes when POST /api/cluster/heartbeat is received.
   */
  handleHeartbeat(data: { nodeId: string; stats: NodeStats; clusterVersion?: number }): void {
    const node = this.cluster.nodes.get(data.nodeId);
    if (node) {
      node.lastHeartbeat = Date.now();
      node.status = "online";
      node.stats = data.stats;
      this.emit("node:heartbeat", node);
    }
  }

  /**
   * Handle a join request from a new node.
   * Called from api-routes when POST /api/cluster/join is received.
   */
  handleJoin(data: { id: string; name: string; host: string }): void {
    this.registerNode({
      id: data.id,
      name: data.name,
      host: data.host,
      role: "worker",
      status: "online",
      joinedAt: Date.now(),
      lastHeartbeat: Date.now(),
      stats: this.emptyStats(),
    });

    // Re-evaluate leader
    this.electLeader();
  }

  /**
   * Handle a leave notification from a departing node.
   * Called from api-routes when POST /api/cluster/leave is received.
   */
  handleLeave(data: { nodeId: string }): void {
    const node = this.cluster.nodes.get(data.nodeId);
    if (node) {
      node.status = "offline";
      this.cluster.version++;
      console.log(`[9d] Node ${node.name} left the cluster.`);
      this.emit("node:left", node);

      if (data.nodeId === this.cluster.leaderId) {
        this.electLeader();
      }
    }
  }

  /**
   * Update own task stats (called by daemon).
   */
  updateTaskStats(running: number, queued: number, completed: number): void {
    const self = this.getSelf();
    self.stats.tasksRunning = running;
    self.stats.tasksQueued = queued;
    self.stats.tasksCompleted = completed;
    self.stats.cpuUsage = running > 0 ? Math.min(100, running * 15 + Math.random() * 10) : self.stats.cpuUsage;
  }
}
