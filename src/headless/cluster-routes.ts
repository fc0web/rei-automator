/**
 * Rei Automator — Phase 9d: Cluster API Routes
 * ノード間通信・タスク分配用の追加APIエンドポイント
 *
 * Phase 9b の api-routes.ts に追加する形で使用。
 * 11エンドポイント追加（合計25エンドポイント）。
 */

import { IncomingMessage, ServerResponse } from "http";
import { NodeManager } from "./node-manager";
import { TaskDispatcher, DispatchStrategy } from "./task-dispatcher";

interface RouteHandler {
  method: string;
  path: string;
  handler: (req: IncomingMessage, res: ServerResponse, body: any, params: Record<string, string>) => Promise<void>;
  auth?: "read" | "execute" | "admin";
}

export function createClusterRoutes(
  nodeManager: NodeManager,
  dispatcher: TaskDispatcher
): RouteHandler[] {
  // ─── Helper ───
  const json = (res: ServerResponse, data: any, status = 200) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };

  return [
    // ────────────────────────────────────────────
    // Cluster Info (public, no auth)
    // ────────────────────────────────────────────

    /**
     * GET /api/cluster/info
     * ノード自身の情報を返す（ディスカバリ用）
     */
    {
      method: "GET",
      path: "/api/cluster/info",
      handler: async (_req, res) => {
        const self = nodeManager.getSelf();
        json(res, {
          nodeId: self.id,
          nodeName: self.name,
          host: self.host,
          role: self.role,
          status: self.status,
          joinedAt: self.joinedAt,
          stats: self.stats,
          isLeader: nodeManager.isLeader(),
        });
      },
    },

    /**
     * GET /api/cluster/nodes
     * クラスタ内の全ノード一覧
     */
    {
      method: "GET",
      path: "/api/cluster/nodes",
      auth: "read",
      handler: async (_req, res) => {
        const nodes = nodeManager.getNodes().map((n) => ({
          id: n.id,
          name: n.name,
          host: n.host,
          role: n.role,
          status: n.status,
          joinedAt: n.joinedAt,
          lastHeartbeat: n.lastHeartbeat,
          stats: n.stats,
        }));
        const leader = nodeManager.getLeader();
        json(res, {
          nodes,
          leaderId: leader?.id || null,
          leaderName: leader?.name || null,
          clusterVersion: nodeManager.getCluster().version,
          totalNodes: nodes.length,
          onlineNodes: nodes.filter((n) => n.status === "online").length,
        });
      },
    },

    /**
     * GET /api/cluster/leader
     * 現在のリーダーノード情報
     */
    {
      method: "GET",
      path: "/api/cluster/leader",
      auth: "read",
      handler: async (_req, res) => {
        const leader = nodeManager.getLeader();
        if (!leader) {
          json(res, { error: "No leader elected" }, 503);
          return;
        }
        json(res, {
          id: leader.id,
          name: leader.name,
          host: leader.host,
          stats: leader.stats,
          isSelf: nodeManager.isLeader(),
        });
      },
    },

    // ────────────────────────────────────────────
    // Cluster Membership
    // ────────────────────────────────────────────

    /**
     * POST /api/cluster/join
     * 新ノードがクラスタに参加（ノード間通信用）
     */
    {
      method: "POST",
      path: "/api/cluster/join",
      handler: async (_req, res, body) => {
        if (!body.id || !body.name || !body.host) {
          json(res, { error: "Missing: id, name, host" }, 400);
          return;
        }
        nodeManager.handleJoin(body);
        json(res, { accepted: true, clusterVersion: nodeManager.getCluster().version });
      },
    },

    /**
     * POST /api/cluster/leave
     * ノードがクラスタから離脱（ノード間通信用）
     */
    {
      method: "POST",
      path: "/api/cluster/leave",
      handler: async (_req, res, body) => {
        if (!body.nodeId) {
          json(res, { error: "Missing: nodeId" }, 400);
          return;
        }
        nodeManager.handleLeave(body);
        json(res, { acknowledged: true });
      },
    },

    /**
     * POST /api/cluster/heartbeat
     * ハートビート受信（ノード間通信用）
     */
    {
      method: "POST",
      path: "/api/cluster/heartbeat",
      handler: async (_req, res, body) => {
        if (!body.nodeId || !body.stats) {
          json(res, { error: "Missing: nodeId, stats" }, 400);
          return;
        }
        nodeManager.handleHeartbeat(body);
        json(res, { ack: true, timestamp: Date.now() });
      },
    },

    /**
     * POST /api/cluster/leader
     * リーダー選出結果の通知（ノード間通信用）
     */
    {
      method: "POST",
      path: "/api/cluster/leader",
      handler: async (_req, res, body) => {
        // Accept leader announcement from peer
        json(res, { acknowledged: true, localLeader: nodeManager.getCluster().leaderId });
      },
    },

    // ────────────────────────────────────────────
    // Task Dispatch (Phase 9d)
    // ────────────────────────────────────────────

    /**
     * POST /api/dispatch
     * タスクを他ノードに分配実行（リーダーまたは任意ノードから）
     * Body: { code, strategy?, targetNodeId?, apiKey? }
     */
    {
      method: "POST",
      path: "/api/dispatch",
      auth: "execute",
      handler: async (_req, res, body) => {
        if (!body.code) {
          json(res, { error: "Missing: code" }, 400);
          return;
        }

        const result = await dispatcher.dispatch({
          code: body.code,
          strategy: body.strategy as DispatchStrategy,
          affinityNodeId: body.targetNodeId,
          apiKey: body.apiKey,
          priority: body.priority,
        });

        json(res, result, result.success ? 200 : 502);
      },
    },

    /**
     * POST /api/dispatch/broadcast
     * 全オンラインノードに同一タスクをブロードキャスト
     * Body: { code, apiKey? }
     */
    {
      method: "POST",
      path: "/api/dispatch/broadcast",
      auth: "admin",
      handler: async (_req, res, body) => {
        if (!body.code) {
          json(res, { error: "Missing: code" }, 400);
          return;
        }
        const results = await dispatcher.broadcastTask(body.code, body.apiKey);
        json(res, {
          totalNodes: results.length,
          successes: results.filter((r) => r.success).length,
          failures: results.filter((r) => !r.success).length,
          results,
        });
      },
    },

    /**
     * GET /api/dispatch/history
     * 分配履歴
     */
    {
      method: "GET",
      path: "/api/dispatch/history",
      auth: "read",
      handler: async (_req, res) => {
        json(res, {
          history: dispatcher.getHistory(100),
          stats: dispatcher.getStats(),
        });
      },
    },

    /**
     * GET /api/dispatch/config
     * 分配戦略設定の取得
     */
    {
      method: "GET",
      path: "/api/dispatch/config",
      auth: "read",
      handler: async (_req, res) => {
        json(res, dispatcher.getConfig());
      },
    },
  ];
}
