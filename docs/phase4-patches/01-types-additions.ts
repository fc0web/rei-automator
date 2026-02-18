// ============================================================
// Phase 4 追加型定義
// 以下を types.ts の ReiCommandType union と ReiCommand union に追加
// ============================================================

// ReiCommandType に追加:
//   | 'find' | 'click_found' | 'wait_find' | 'find_click'

export interface FindCommand {
  type: 'find';
  template: string;
  threshold?: number;
}

export interface ClickFoundCommand {
  type: 'click_found';
  action: 'click' | 'dblclick' | 'rightclick';
  offsetX?: number;
  offsetY?: number;
}

export interface WaitFindCommand {
  type: 'wait_find';
  template: string;
  timeout: number;
  interval?: number;
  threshold?: number;
}

export interface FindClickCommand {
  type: 'find_click';
  template: string;
  action: 'click' | 'dblclick' | 'rightclick';
  threshold?: number;
  offsetX?: number;
  offsetY?: number;
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

// ReiCommand union に追加:
//   | FindCommand | ClickFoundCommand | WaitFindCommand | FindClickCommand
