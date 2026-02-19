import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'step';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  lineNumber?: number;
  command?: string;
  variables?: Record<string, unknown>;
  duration?: number; // ms
}

export interface ExecutionSession {
  sessionId: string;
  scriptName: string;
  startTime: string;
  endTime?: string;
  entries: LogEntry[];
  success?: boolean;
}

export class Logger {
  private sessions: ExecutionSession[] = [];
  private currentSession: ExecutionSession | null = null;
  private logDir: string;
  private stepMode: boolean = false;
  private stepResolvers: Array<() => void> = [];

  // レンダラーへのログ送信コールバック
  onLog?: (entry: LogEntry) => void;
  onStepPause?: (entry: LogEntry) => void;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.logDir = path.join(userDataPath, 'logs');
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  startSession(scriptName: string): string {
    const sessionId = `session_${Date.now()}`;
    this.currentSession = {
      sessionId,
      scriptName,
      startTime: new Date().toISOString(),
      entries: [],
    };
    this.sessions.push(this.currentSession);
    this.log('info', `実行開始: ${scriptName}`);
    return sessionId;
  }

  endSession(success: boolean): void {
    if (!this.currentSession) return;
    this.currentSession.endTime = new Date().toISOString();
    this.currentSession.success = success;
    this.log('info', `実行${success ? '完了' : '失敗'}`);
    this.saveSession(this.currentSession);
    this.currentSession = null;
    this.stepResolvers = [];
  }

  log(
    level: LogLevel,
    message: string,
    options?: {
      lineNumber?: number;
      command?: string;
      variables?: Record<string, unknown>;
      duration?: number;
    }
  ): LogEntry {
    const entry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      level,
      message,
      ...options,
    };

    if (this.currentSession) {
      this.currentSession.entries.push(entry);
    }

    this.onLog?.(entry);
    return entry;
  }

  async logStep(
    lineNumber: number,
    command: string,
    variables?: Record<string, unknown>
  ): Promise<void> {
    const entry = this.log('step', `Line ${lineNumber}: ${command}`, {
      lineNumber,
      command,
      variables,
    });

    if (this.stepMode) {
      this.onStepPause?.(entry);
      // ユーザーが「次へ」を押すまで待機
      await new Promise<void>(resolve => {
        this.stepResolvers.push(resolve);
      });
    }
  }

  stepNext(): void {
    const resolver = this.stepResolvers.shift();
    if (resolver) resolver();
  }

  stepContinue(): void {
    // ステップモード解除して全resolver実行
    this.stepMode = false;
    const resolvers = [...this.stepResolvers];
    this.stepResolvers = [];
    resolvers.forEach(r => r());
  }

  setStepMode(enabled: boolean): void {
    this.stepMode = enabled;
  }

  isStepMode(): boolean {
    return this.stepMode;
  }

  getCurrentSession(): ExecutionSession | null {
    return this.currentSession;
  }

  getRecentLogs(count: number = 50): LogEntry[] {
    if (!this.currentSession) return [];
    return this.currentSession.entries.slice(-count);
  }

  private saveSession(session: ExecutionSession): void {
    const filename = path.join(
      this.logDir,
      `${session.sessionId}_${session.scriptName.replace(/[^a-zA-Z0-9_\u3040-\u30ff\u4e00-\u9fff]/g, '_')}.json`
    );
    try {
      fs.writeFileSync(filename, JSON.stringify(session, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save session log:', e);
    }
  }

  exportLogsAsText(session?: ExecutionSession): string {
    const target = session || this.currentSession;
    if (!target) return '';

    const lines: string[] = [
      `=== 実行ログ: ${target.scriptName} ===`,
      `開始: ${target.startTime}`,
      target.endTime ? `終了: ${target.endTime}` : '実行中...',
      '',
    ];

    for (const entry of target.entries) {
      const time = new Date(entry.timestamp).toLocaleTimeString('ja-JP');
      const levelTag = `[${entry.level.toUpperCase().padEnd(5)}]`;
      const lineInfo = entry.lineNumber !== undefined ? ` (Line ${entry.lineNumber})` : '';
      lines.push(`${time} ${levelTag}${lineInfo} ${entry.message}`);
      if (entry.variables && Object.keys(entry.variables).length > 0) {
        lines.push(`         変数: ${JSON.stringify(entry.variables)}`);
      }
    }

    return lines.join('\n');
  }

  listSessionFiles(): string[] {
    try {
      return fs.readdirSync(this.logDir)
        .filter(f => f.endsWith('.json'))
        .map(f => path.join(this.logDir, f));
    } catch {
      return [];
    }
  }
}
