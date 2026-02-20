/**
 * Rei Automator — Headless Module
 * Phase 9a + 9b exports
 *
 * ★ 既存の index.ts を置き換えてください。
 */

export { Daemon, DaemonConfig, TaskEntry } from './daemon';
export { ServiceManager } from './service';
export { ScriptWatcher } from './watcher';
export { HealthChecker, HealthResult, TaskInfo } from './health';

// Phase 9b
export { ApiServer, ApiServerConfig } from './api-server';
export { ApiRoutes } from './api-routes';
export { ApiAuth, AuthConfig, ApiKeyEntry, Permission } from './api-auth';
export { WsManager, WsChannel, WsMessage } from './ws-manager';
