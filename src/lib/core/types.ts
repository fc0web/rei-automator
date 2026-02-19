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
  | CommentCommand
  // Phase 4: 画像認識
  | FindCommand
  | ClickFoundCommand
  | WaitFindCommand
  | FindClickCommand
  // Phase 5: 条件分岐・OCR
  | IfCommand
  | ReadCommand;

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

// ========== Phase 4: 画像認識コマンド ==========

export interface FindCommand {
  type: 'find';
  template: string;
  threshold?: number;
  line: number;
}

export interface ClickFoundCommand {
  type: 'click_found';
  action: 'click' | 'dblclick' | 'rightclick';
  offsetX?: number;
  offsetY?: number;
  line: number;
}

export interface WaitFindCommand {
  type: 'wait_find';
  template: string;
  timeout: number;
  interval?: number;
  threshold?: number;
  line: number;
}

export interface FindClickCommand {
  type: 'find_click';
  template: string;
  action: 'click' | 'dblclick' | 'rightclick';
  threshold?: number;
  offsetX?: number;
  offsetY?: number;
  line: number;
}

export interface FindState {
  found: boolean;
  x: number;
  y: number;
  centerX: number;
  centerY: number;
  confidence: number;
  template: string;
}

// ========== Phase 5: 条件分岐・OCR ==========

/**
 * if文の条件式
 */
export type IfCondition =
  | { type: 'found' }                          // if found:
  | { type: 'not_found' }                      // if not found:
  | { type: 'text_eq'; value: string }         // if text == "..."
  | { type: 'text_ne'; value: string }         // if text != "..."
  | { type: 'text_contains'; value: string }   // if text contains "..."
  | { type: 'text_not_contains'; value: string }; // if text not contains "..."

/**
 * if 文
 *   if found:
 *     click(found)
 *   else:
 *     wait(1000)
 *
 *   if text == "完了":
 *     click(400, 300)
 */
export interface IfCommand {
  type: 'if';
  condition: IfCondition;
  thenBlock: ReiCommand[];
  elseBlock: ReiCommand[] | null;
  line: number;
}

/**
 * read(x, y, width, height)
 * 指定領域をOCRで読み取り、内部変数 `text` に格納
 */
export interface ReadCommand {
  type: 'read';
  x: number;
  y: number;
  width: number;
  height: number;
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
  /** 行実行コールバック（async対応） */
  onLineExecute: (line: number) => void | Promise<void>;
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
