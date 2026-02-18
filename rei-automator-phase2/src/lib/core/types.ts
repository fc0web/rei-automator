/**
 * Rei Automator - 型定義
 * Rei言語のAST・実行コンテキストの型
 */

// ========== コマンド型 ==========

export type ReiCommand =
  | ClickCommand
  | DblClickCommand
  | RightClickCommand
  | MoveCommand
  | DragCommand
  | TypeCommand
  | KeyCommand
  | ShortcutCommand
  | WaitCommand
  | LoopCommand
  | CommentCommand;

export interface ClickCommand {
  type: 'click';
  x: number;
  y: number;
  line: number;
}

export interface DblClickCommand {
  type: 'dblclick';
  x: number;
  y: number;
  line: number;
}

export interface RightClickCommand {
  type: 'rightclick';
  x: number;
  y: number;
  line: number;
}

export interface MoveCommand {
  type: 'move';
  x: number;
  y: number;
  line: number;
}

export interface DragCommand {
  type: 'drag';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  line: number;
}

export interface TypeCommand {
  type: 'type';
  text: string;
  line: number;
}

export interface KeyCommand {
  type: 'key';
  keyName: string;
  line: number;
}

export interface ShortcutCommand {
  type: 'shortcut';
  keys: string[];
  line: number;
}

export interface WaitCommand {
  type: 'wait';
  durationMs: number;
  line: number;
}

export interface LoopCommand {
  type: 'loop';
  count: number | null; // null = 無限ループ
  body: ReiCommand[];
  line: number;
}

export interface CommentCommand {
  type: 'comment';
  text: string;
  line: number;
}

// ========== プログラム ==========

export interface ReiProgram {
  commands: ReiCommand[];
  errors: ParseError[];
}

// ========== エラー ==========

export interface ParseError {
  message: string;
  line: number;
  column?: number;
}

// ========== 実行コンテキスト ==========

export interface ExecutionContext {
  /** 実行中フラグ */
  running: boolean;
  /** 一時停止フラグ */
  paused: boolean;
  /** 現在の実行行 */
  currentLine: number;
  /** ログコールバック */
  onLog: (message: string, level: LogLevel) => void;
  /** ステータス変更コールバック */
  onStatusChange: (status: ExecutionStatus) => void;
  /** 行実行コールバック */
  onLineExecute: (line: number) => void;
}

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export type ExecutionStatus = 
  | 'idle'
  | 'running'
  | 'paused'
  | 'stopped'
  | 'completed'
  | 'error';

// ========== 実行結果 ==========

export interface ExecutionResult {
  success: boolean;
  message?: string;
  error?: string;
  executedLines: number;
  totalTime: number;
}
