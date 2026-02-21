/**
 * info-engineering.ts — 情報工学ドメイン拡張
 * 
 * ETLパイプライン、データ変換、LLMエージェントパターンなど
 * 情報工学の典型パターンをReiのパイプで表現する。
 * 
 * 使用例:
 *   data |> etl("extract") |> etl("transform", fn) |> etl("load") |> pipe_run |> pipe_sigma
 *   "text" |> llm_chain("summarize") |> llm_chain("translate") |> llm_sigma
 * 
 * @author Nobuki Fujimoto (D-FUMT)
 * @version Phase 5
 */

import {
  type PipelineSpace,
  type PipelineStage,
  createPipelineSpace,
  addStage,
  pipelineRun,
  getPipelineSigma,
} from './pipeline-core';

// ============================================================
// ETLパイプライン
// ============================================================

/** ETLパイプライン空間の作成 */
export function createETLSpace(data: any): PipelineSpace {
  const space = createPipelineSpace(data);
  space.metadata.type = 'etl';
  return space;
}

/** ビルトインETLステージ群 */
export const etlStages: Record<string, (config?: Record<string, any>) => PipelineStage> = {
  /** extract: データ抽出（配列化） */
  extract: (config) => ({
    name: 'extract',
    type: 'extract',
    fn: (data: any) => {
      if (typeof data === 'string') {
        // CSV風パース
        return data.split('\n').filter(Boolean).map(line => {
          const parts = line.split(',').map(s => s.trim());
          return parts.length === 1 ? parts[0] : parts;
        });
      }
      if (typeof data === 'object' && !Array.isArray(data)) {
        return Object.entries(data).map(([k, v]) => ({ key: k, value: v }));
      }
      return Array.isArray(data) ? data : [data];
    },
    config,
  }),
  
  /** clean: データクレンジング */
  clean: (config) => ({
    name: 'clean',
    type: 'transform',
    fn: (data: any) => {
      if (!Array.isArray(data)) return data;
      return data
        .filter(item => item !== null && item !== undefined && item !== '')
        .map(item => {
          if (typeof item === 'string') return item.trim();
          return item;
        });
    },
    config,
  }),
  
  /** deduplicate: 重複排除 */
  deduplicate: (config) => ({
    name: 'deduplicate',
    type: 'transform',
    fn: (data: any) => {
      if (!Array.isArray(data)) return data;
      const key = config?.key;
      if (key && typeof data[0] === 'object') {
        const seen = new Set();
        return data.filter(item => {
          const k = item[key];
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
      }
      return [...new Set(data.map(d => JSON.stringify(d)))].map(s => JSON.parse(s));
    },
    config,
  }),
  
  /** normalize: 正規化 */
  normalize: (config) => ({
    name: 'normalize',
    type: 'transform',
    fn: (data: any) => {
      if (!Array.isArray(data)) return data;
      const numData = data.filter(d => typeof d === 'number');
      if (numData.length === 0) return data;
      const min = Math.min(...numData);
      const max = Math.max(...numData);
      const range = max - min || 1;
      return data.map(d => typeof d === 'number' ? (d - min) / range : d);
    },
    config,
  }),
  
  /** aggregate: 集約 */
  aggregate: (config) => ({
    name: 'aggregate',
    type: 'aggregate',
    fn: (data: any) => {
      if (!Array.isArray(data)) return data;
      const mode = config?.mode ?? 'count';
      switch (mode) {
        case 'count': return { count: data.length };
        case 'sum': return { sum: data.reduce((a: number, b: number) => a + (typeof b === 'number' ? b : 0), 0) };
        case 'avg': {
          const nums = data.filter((d: any) => typeof d === 'number');
          return { avg: nums.reduce((a: number, b: number) => a + b, 0) / (nums.length || 1), count: nums.length };
        }
        case 'group': {
          const key = config?.key ?? 'type';
          const groups: Record<string, any[]> = {};
          for (const item of data) {
            const k = typeof item === 'object' ? item[key] : String(item);
            if (!groups[k]) groups[k] = [];
            groups[k].push(item);
          }
          return groups;
        }
        default: return { count: data.length, data };
      }
    },
    config,
  }),
  
  /** load: 出力（結果をオブジェクトに格納） */
  load: (config) => ({
    name: 'load',
    type: 'load',
    fn: (data: any) => ({
      loaded: true,
      timestamp: Date.now(),
      target: config?.target ?? 'memory',
      records: Array.isArray(data) ? data.length : 1,
      data,
    }),
    config,
  }),
};

/** ETLステージの追加（名前ベース） */
export function addETLStage(
  space: PipelineSpace,
  stageName: string,
  config?: Record<string, any>,
): PipelineSpace {
  const factory = etlStages[stageName];
  if (!factory) {
    throw new Error(`Unknown ETL stage: ${stageName}. Available: ${Object.keys(etlStages).join(', ')}`);
  }
  const stage = factory(config);
  return addStage(space, stage.name, stage.type, stage.fn, stage.config);
}

// ============================================================
// LLMエージェントパターン（モック）
// ============================================================

/** LLMチェーン空間 */
export interface LLMChainSpace {
  reiType: 'LLMChainSpace';
  prompts: { role: string; content: string; output?: string }[];
  context: string;
  result: string;
  tokens: { input: number; output: number };
  status: 'ready' | 'completed';
}

/** LLMチェーンの作成 */
export function createLLMChain(input: string): LLMChainSpace {
  return {
    reiType: 'LLMChainSpace',
    prompts: [],
    context: input,
    result: input,
    tokens: { input: 0, output: 0 },
    status: 'ready',
  };
}

/** チェーンにプロンプトステージを追加（モック実行） */
export function addLLMStage(
  chain: LLMChainSpace,
  role: string,
  instruction?: string,
): LLMChainSpace {
  const content = instruction ?? role;
  
  // モック処理: 実際のLLM呼び出しの代わりに変換をシミュレート
  let output = chain.result;
  
  switch (role) {
    case 'summarize':
      output = `[Summary of ${chain.result.length} chars] ${chain.result.substring(0, 50)}...`;
      break;
    case 'translate':
      output = `[Translated] ${chain.result}`;
      break;
    case 'analyze':
      output = `[Analysis] Input length: ${chain.result.length}, Words: ${chain.result.split(/\s+/).length}`;
      break;
    case 'classify':
      output = `[Classification] category: general, confidence: 0.85`;
      break;
    case 'extract':
      output = `[Extracted entities] from: "${chain.result.substring(0, 30)}..."`;
      break;
    case 'refine':
      output = `[Refined] ${chain.result}`;
      break;
    default:
      output = `[${role}] ${chain.result}`;
  }
  
  const inputTokens = Math.ceil(chain.result.length / 4);
  const outputTokens = Math.ceil(output.length / 4);
  
  chain.prompts.push({ role, content, output });
  chain.result = output;
  chain.tokens.input += inputTokens;
  chain.tokens.output += outputTokens;
  chain.status = 'completed';
  
  return chain;
}

/** LLMチェーンのσ */
export function getLLMChainSigma(chain: LLMChainSpace): any {
  return {
    reiType: 'SigmaResult',
    domain: 'info_engineering',
    subtype: 'llm_chain',
    field: {
      context: chain.context.substring(0, 100),
      stages: chain.prompts.length,
    },
    flow: {
      direction: 'sequential',
      momentum: chain.prompts.length,
      velocity: chain.tokens.output / Math.max(chain.prompts.length, 1),
      phase: chain.status,
    },
    memory: chain.prompts.map(p => ({
      role: p.role,
      inputLength: p.content.length,
      outputLength: p.output?.length ?? 0,
    })),
    layer: {
      depth: chain.prompts.length,
      roles: chain.prompts.map(p => p.role),
    },
    relation: chain.prompts.map((p, i) => ({
      from: i > 0 ? chain.prompts[i - 1].role : 'input',
      to: p.role,
      type: 'chain',
    })),
    will: {
      tendency: chain.status === 'completed' ? 'fulfilled' : 'processing',
      strength: 1,
    },
    tokens: chain.tokens,
    result: chain.result,
  };
}

// ============================================================
// エクスポート
// ============================================================

export {
  pipelineRun,
  getPipelineSigma,
};
