/**
 * Rei Automator Phase 6 - 変数・パラメータ管理
 *
 * 対応構文:
 *   set name = "value"        // 文字列変数
 *   set count = 42            // 数値変数
 *   set flag = true           // 真偽値
 *   param title = "デフォルト"  // 実行時入力パラメータ
 *   $name                     // 変数参照
 */

export type VarValue = string | number | boolean;

export interface ParamDefinition {
  name: string;
  defaultValue: VarValue;
  description?: string;
  type: 'string' | 'number' | 'boolean';
}

export class VariableStore {
  private vars: Map<string, VarValue> = new Map();
  private params: Map<string, ParamDefinition> = new Map();

  set(name: string, value: VarValue): void {
    this.vars.set(name, value);
  }

  get(name: string): VarValue | undefined {
    return this.vars.get(name);
  }

  has(name: string): boolean {
    return this.vars.has(name);
  }

  delete(name: string): void {
    this.vars.delete(name);
  }

  clear(): void {
    this.vars.clear();
    // paramsはクリアしない（定義は保持）
  }

  getAll(): Record<string, VarValue> {
    const result: Record<string, VarValue> = {};
    this.vars.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  defineParam(name: string, defaultValue: VarValue, description?: string): void {
    const type = typeof defaultValue as 'string' | 'number' | 'boolean';
    this.params.set(name, { name, defaultValue, description, type });
    // デフォルト値をセット
    if (!this.vars.has(name)) {
      this.vars.set(name, defaultValue);
    }
  }

  getParams(): ParamDefinition[] {
    return Array.from(this.params.values());
  }

  setParamValue(name: string, value: VarValue): void {
    this.vars.set(name, value);
  }

  /**
   * 文字列内の $変数名 を実際の値に展開する
   */
  interpolate(text: string): string {
    return text.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, varName) => {
      const value = this.vars.get(varName);
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * 値を適切な型に変換
   */
  static parseValue(raw: string): VarValue {
    // boolean
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    // number
    const num = Number(raw);
    if (!isNaN(num) && raw.trim() !== '') return num;
    // string (クォート除去)
    if ((raw.startsWith('"') && raw.endsWith('"')) ||
        (raw.startsWith("'") && raw.endsWith("'"))) {
      return raw.slice(1, -1);
    }
    return raw;
  }
}

/**
 * スクリプトのパラメータ定義を事前スキャン
 * 実行前にUIへ表示するためのもの
 */
export function scanParams(scriptContent: string): ParamDefinition[] {
  const params: ParamDefinition[] = [];
  const lines = scriptContent.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // "param name = value" または "param name = value  // description"
    const match = trimmed.match(/^param\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+?)(?:\s*\/\/\s*(.+))?$/);
    if (match) {
      const name = match[1];
      const rawValue = match[2].trim();
      const description = match[3]?.trim();
      const defaultValue = VariableStore.parseValue(rawValue);
      const type = typeof defaultValue as 'string' | 'number' | 'boolean';
      params.push({ name, defaultValue, description, type });
    }
  }

  return params;
}

/**
 * 変数・パラメータ対応の行パーサー
 * executorのparse関数の前処理として呼ぶ
 */
export function preprocessLine(line: string, store: VariableStore): string {
  const trimmed = line.trim();

  // "set name = value"
  const setMatch = trimmed.match(/^set\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
  if (setMatch) {
    const name = setMatch[1];
    const rawValue = store.interpolate(setMatch[2].trim());
    store.set(name, VariableStore.parseValue(rawValue));
    return '__SET__'; // 実行不要マーカー
  }

  // "param name = value"（定義行はスキップ）
  if (trimmed.startsWith('param ')) {
    return '__PARAM__'; // 実行不要マーカー
  }

  // $変数を展開して返す
  return store.interpolate(line);
}
