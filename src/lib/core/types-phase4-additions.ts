/**
 * types-phase4-additions.ts — Phase 4で types.ts に追加する型定義
 *
 * 【統合方法】既存の types.ts の ReiCommandType と ReiCommand に追記してください
 */

// ── ReiCommandType に追加 ───────────────────────────────
// 既存: 'click' | 'dblclick' | 'rightclick' | 'move' | 'drag' | 'type' | 'key' | 'shortcut' | 'wait' | 'loop'
// ↓ 以下を追加
//   | 'find' | 'click_found' | 'wait_find'

// ── ReiCommand に追加する型 ─────────────────────────────

/**
 * find("template.png")
 * テンプレート画像をスクリーンショット上で探す
 * 結果は内部変数 _found に保存される
 */
export interface FindCommand {
  type: 'find';
  template: string;      // テンプレートファイル名 (例: "button-ok.png")
  threshold?: number;    // マッチ閾値 (0.0〜1.0, デフォルト0.85)
}

/**
 * click(found)  / dblclick(found) / rightclick(found)
 * 直前の find() の結果位置をクリック
 */
export interface ClickFoundCommand {
  type: 'click_found';
  action: 'click' | 'dblclick' | 'rightclick';
  offsetX?: number;      // 中心からのオフセット
  offsetY?: number;
}

/**
 * wait_find("template.png", timeout)
 * テンプレートが見つかるまで繰り返しキャプチャ＋マッチング
 * タイムアウト（ms）で打ち切り
 */
export interface WaitFindCommand {
  type: 'wait_find';
  template: string;
  timeout: number;       // ミリ秒（デフォルト: 10000）
  interval?: number;     // 探索間隔（デフォルト: 500ms）
  threshold?: number;
}

/**
 * find_click("template.png")
 * find + click(found) のショートカット
 */
export interface FindClickCommand {
  type: 'find_click';
  template: string;
  action: 'click' | 'dblclick' | 'rightclick';
  threshold?: number;
  offsetX?: number;
  offsetY?: number;
}

// ── マッチ結果を保持する内部状態型 ─────────────────────

export interface FindState {
  found: boolean;
  x: number;
  y: number;
  centerX: number;
  centerY: number;
  confidence: number;
  template: string;
}

// ── ParseResult の拡張 ──────────────────────────────────
// 既存の ParseResult.commands 配列に上記の型を union で追加

/**
 * 【統合例】
 *
 * export type ReiCommandType =
 *   | 'click' | 'dblclick' | 'rightclick' | 'move' | 'drag'
 *   | 'type' | 'key' | 'shortcut' | 'wait' | 'loop'
 *   // Phase 4 追加
 *   | 'find' | 'click_found' | 'wait_find' | 'find_click';
 *
 * export type ReiCommand =
 *   | ClickCommand | DblClickCommand | ... (既存)
 *   // Phase 4 追加
 *   | FindCommand | ClickFoundCommand | WaitFindCommand | FindClickCommand;
 */
