/**
 * Rei Automator - スタブバックエンド
 * 実際のPC操作を行わず、ログ出力のみ（テスト・開発用）
 */

import { AutoBackend } from './controller';

export class StubBackend implements AutoBackend {
  private logger: (message: string) => void;

  constructor(logger?: (message: string) => void) {
    this.logger = logger || ((msg) => console.log(`[Stub] ${msg}`));
  }

  async click(x: number, y: number): Promise<void> {
    this.logger(`Click at (${x}, ${y})`);
  }

  async dblclick(x: number, y: number): Promise<void> {
    this.logger(`Double-click at (${x}, ${y})`);
  }

  async rightclick(x: number, y: number): Promise<void> {
    this.logger(`Right-click at (${x}, ${y})`);
  }

  async move(x: number, y: number): Promise<void> {
    this.logger(`Move to (${x}, ${y})`);
  }

  async drag(x1: number, y1: number, x2: number, y2: number): Promise<void> {
    this.logger(`Drag from (${x1}, ${y1}) to (${x2}, ${y2})`);
  }

  async type(text: string): Promise<void> {
    this.logger(`Type: "${text}"`);
  }

  async key(keyName: string): Promise<void> {
    this.logger(`Key: ${keyName}`);
  }

  async shortcut(keys: string[]): Promise<void> {
    this.logger(`Shortcut: ${keys.join('+')}`);
  }
}
