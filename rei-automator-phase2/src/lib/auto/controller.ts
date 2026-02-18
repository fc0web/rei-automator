/**
 * Rei Automator - PC操作コントローラー
 * マウス・キーボード操作の抽象インターフェース
 * 
 * バックエンドを差し替え可能にするための設計:
 *   - NutJSBackend: @nut-tree/nut-js を使用（実際のPC操作）
 *   - StubBackend: ログ出力のみ（テスト・開発用）
 */

export interface AutoBackend {
  // マウス
  click(x: number, y: number): Promise<void>;
  dblclick(x: number, y: number): Promise<void>;
  rightclick(x: number, y: number): Promise<void>;
  move(x: number, y: number): Promise<void>;
  drag(x1: number, y1: number, x2: number, y2: number): Promise<void>;

  // キーボード
  type(text: string): Promise<void>;
  key(keyName: string): Promise<void>;
  shortcut(keys: string[]): Promise<void>;
}

/**
 * PC操作コントローラー
 * バックエンドを切り替え可能
 */
export class AutoController implements AutoBackend {
  private backend: AutoBackend;

  constructor(backend: AutoBackend) {
    this.backend = backend;
  }

  async click(x: number, y: number): Promise<void> {
    return this.backend.click(x, y);
  }

  async dblclick(x: number, y: number): Promise<void> {
    return this.backend.dblclick(x, y);
  }

  async rightclick(x: number, y: number): Promise<void> {
    return this.backend.rightclick(x, y);
  }

  async move(x: number, y: number): Promise<void> {
    return this.backend.move(x, y);
  }

  async drag(x1: number, y1: number, x2: number, y2: number): Promise<void> {
    return this.backend.drag(x1, y1, x2, y2);
  }

  async type(text: string): Promise<void> {
    return this.backend.type(text);
  }

  async key(keyName: string): Promise<void> {
    return this.backend.key(keyName);
  }

  async shortcut(keys: string[]): Promise<void> {
    return this.backend.shortcut(keys);
  }

  /**
   * バックエンドを切り替え
   */
  setBackend(backend: AutoBackend): void {
    this.backend = backend;
  }
}
