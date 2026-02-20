/**
 * Rei Automator — Headless Module
 * Phase 9a + 9b + 9d exports
 *
 * ★ 既存の index.ts を置き換えてください。
 */

// Phase 9a: ヘッドレスデーモン
export { Daemon, DaemonConfig, TaskEntry } from './daemon';
export { ServiceManager } from './service';
export { ScriptWatcher } from './watcher';
export { HealthChecker, HealthResult, TaskInfo } from './health';

// Phase 9b: REST API + WebSocket
export { ApiServer, ApiServerConfig } from './api-server';
export { ApiRoutes } from './api-routes';
export { ApiAuth, AuthConfig, ApiKeyEntry, Permission } from './api-auth';
export { WsManager, WsChannel, WsMessage } from './ws-manager';

// Phase 9d: ノード間通信・タスク分配
export { NodeManager, NodeInfo, NodeStats, NodeConfig, ClusterState } from './node-manager';
export { TaskDispatcher, DispatchStrategy, DispatchResult, DispatchOptions, DispatcherConfig } from './task-dispatcher';
export { createClusterRoutes } from './cluster-routes';
