// ============================================================
// Rei v0.6 — Information Engineering Domain (情報工学ドメイン)
// Phase 5-C: 記憶(memory) + 層(layer) を主軸としたデータ処理基盤
//
// 核心的洞察:
//   ETLパイプライン = パイプ演算子 |> の実世界応用
//   データ変換 = 中心(スキーマ) ← 周辺(レコード群)の中心-周辺パターン
//   エージェント連携 = AgentSpace の情報工学応用
//
// D-FUMT 6属性との対応:
//   場(field)    = データスキーマ・データ空間
//   流れ(flow)   = パイプライン実行順序・データの流れ
//   記憶(memory)  = ★変換履歴・ログ・リネージ
//   層(layer)    = ★パイプライン深度・変換の抽象度
//   関係(relation) = データ依存グラフ・参照整合性
//   意志(will)   = 最適化目標・品質制約
//
// Author: Nobuki Fujimoto / Claude (collaborative design)
// ============================================================

// ═══════════════════════════════════════════
// Part 1: 型定義
// ═══════════════════════════════════════════

/** データスキーマ定義 */
export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  required?: boolean;
  description?: string;
}

/** データソース定義 */
export interface DataSource {
  id: string;
  name: string;
  schema: SchemaField[];
  format: 'json' | 'csv' | 'api' | 'memory';
}

/** データシンク（出力先）定義 */
export interface DataSink {
  id: string;
  name: string;
  schema?: SchemaField[];
  format: 'json' | 'csv' | 'memory';
}

/** 変換関数の定義 */
export interface TransformDef {
  id: string;
  name: string;
  type: 'map' | 'filter' | 'aggregate' | 'join' | 'project' | 'sort' | 'custom';
  fn: (records: Record<string, any>[]) => Record<string, any>[];
  description?: string;
}

/** パイプラインステージ */
export interface PipelineStage {
  id: string;
  type: 'extract' | 'transform' | 'load';
  name: string;
  config: DataSource | TransformDef | DataSink;
  inputSchema?: SchemaField[];
  outputSchema?: SchemaField[];
}

/** ステージ実行結果 */
export interface StageResult {
  stageId: string;
  stageName: string;
  type: 'extract' | 'transform' | 'load';
  inputCount: number;
  outputCount: number;
  durationMs: number;
  timestamp: number;
  error?: string;
}

/** ETLパイプライン */
export interface ETLPipeline {
  reiType: 'ETLPipeline';
  id: string;
  name: string;
  stages: PipelineStage[];
  stageResults: StageResult[];
  totalRuns: number;
  lastRunTime?: number;
}

/** ETL実行結果 */
export interface ETLResult {
  reiType: 'ETLResult';
  pipelineId: string;
  pipelineName: string;
  success: boolean;
  data: Record<string, any>[];
  stageResults: StageResult[];
  totalDurationMs: number;
  sigma: ETLSigma;
}

/** ETL σ — 6属性でパイプライン状態を記述 */
export interface ETLSigma {
  reiType: 'ETLSigma';
  field: {
    totalStages: number;
    extractCount: number;
    transformCount: number;
    loadCount: number;
    inputSchema: SchemaField[];
    outputSchema: SchemaField[];
  };
  flow: {
    direction: 'forward' | 'complete' | 'failed';
    totalDurationMs: number;
    avgStageDurationMs: number;
    bottleneckStage: string;
    throughputRecordsPerSec: number;
  };
  memory: {
    stageHistory: StageResult[];
    totalTransformations: number;
    totalRuns: number;
    dataLineage: string[];      // データの系譜
  };
  layer: {
    depth: number;              // パイプライン深度（ステージ数）
    branchCount: number;        // 分岐数（現在は1、将来拡張用）
    compressionRatio: number;   // 入力レコード数/出力レコード数
  };
  relation: {
    dependencies: string[];     // ステージ間の依存関係
    schemaTransitions: number;  // スキーマ変更回数
  };
  will: {
    qualityScore: number;       // 0-1: データ品質スコア
    completeness: number;       // 0-1: NULL率の逆数
    goal: 'throughput' | 'quality' | 'balanced';
  };
}

/** LLMエージェント定義 */
export interface LLMAgentDef {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  maxTokens: number;
  temperature?: number;
}

/** エージェントメッセージ */
export interface AgentMessage {
  from: string;
  to: string;
  content: string;
  timestamp: number;
  tokenCount: number;
}

/** エージェントオーケストレータ */
export interface AgentOrchestrator {
  reiType: 'AgentOrchestrator';
  agents: LLMAgentDef[];
  messages: AgentMessage[];
  tokenBudget: number;
  tokenUsed: number;
  totalRounds: number;
}

/** オーケストレーション結果 */
export interface OrchResult {
  reiType: 'OrchResult';
  task: string;
  rounds: OrchRound[];
  finalOutput: string;
  totalTokens: number;
  sigma: OrchSigma;
}

/** オーケストレーション1ラウンド */
export interface OrchRound {
  round: number;
  agentId: string;
  input: string;
  output: string;
  tokenCount: number;
  durationMs: number;
}

/** オーケストレーションσ */
export interface OrchSigma {
  reiType: 'OrchSigma';
  field: {
    agentCount: number;
    roles: string[];
  };
  flow: {
    totalRounds: number;
    avgRoundDuration: number;
    direction: 'sequential' | 'parallel' | 'recursive';
  };
  memory: {
    conversationLength: number;
    totalTokens: number;
    contextUtilization: number;  // 使用率 0-1
  };
  layer: {
    depth: number;      // 再帰深度 or パイプライン深度
    delegation: number; // 委任回数
  };
  relation: {
    communicationPairs: number;
    mostActiveAgent: string;
  };
  will: {
    convergence: number;  // 0-1: タスク完了への収束度
    confidence: number;   // 0-1: 結果への確信度
  };
}

/** データフロー分析結果 */
export interface DataFlowAnalysis {
  reiType: 'DataFlowAnalysis';
  nodes: DataFlowNode[];
  edges: DataFlowEdge[];
  bottlenecks: string[];
  criticalPath: string[];
  maxDepth: number;
}

export interface DataFlowNode {
  id: string;
  name: string;
  type: 'source' | 'transform' | 'sink';
  avgDurationMs: number;
}

export interface DataFlowEdge {
  from: string;
  to: string;
  recordCount: number;
}

// ═══════════════════════════════════════════
// Part 2: ETLパイプライン
// ═══════════════════════════════════════════

/** ETLパイプラインの生成 */
export function createETLPipeline(name: string): ETLPipeline {
  return {
    reiType: 'ETLPipeline',
    id: `etl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    stages: [],
    stageResults: [],
    totalRuns: 0,
  };
}

/** Extract ステージの追加 */
export function addExtract(pipeline: ETLPipeline, source: DataSource): ETLPipeline {
  pipeline.stages.push({
    id: `stage_e_${pipeline.stages.length}`,
    type: 'extract',
    name: `Extract: ${source.name}`,
    config: source,
    outputSchema: source.schema,
  });
  return pipeline;
}

/** Transform ステージの追加 */
export function addTransform(pipeline: ETLPipeline, transform: TransformDef): ETLPipeline {
  const prevStage = pipeline.stages[pipeline.stages.length - 1];
  pipeline.stages.push({
    id: `stage_t_${pipeline.stages.length}`,
    type: 'transform',
    name: `Transform: ${transform.name}`,
    config: transform,
    inputSchema: prevStage?.outputSchema,
  });
  return pipeline;
}

/** Load ステージの追加 */
export function addLoad(pipeline: ETLPipeline, sink: DataSink): ETLPipeline {
  pipeline.stages.push({
    id: `stage_l_${pipeline.stages.length}`,
    type: 'load',
    name: `Load: ${sink.name}`,
    config: sink,
  });
  return pipeline;
}

/** ETLパイプラインの実行 */
export function runETL(pipeline: ETLPipeline, inputData: Record<string, any>[]): ETLResult {
  const stageResults: StageResult[] = [];
  let currentData = [...inputData];
  let success = true;
  const startTime = Date.now();
  const dataLineage: string[] = [`input(${inputData.length} records)`];

  for (const stage of pipeline.stages) {
    const stageStart = Date.now();
    const inputCount = currentData.length;

    try {
      if (stage.type === 'extract') {
        // Extract: データをそのまま通過（実際のシステムではソースから取得）
        dataLineage.push(`extract:${stage.name}`);
      } else if (stage.type === 'transform') {
        const transform = stage.config as TransformDef;
        currentData = transform.fn(currentData);
        dataLineage.push(`transform:${transform.name}(${inputCount} → ${currentData.length})`);
      } else if (stage.type === 'load') {
        dataLineage.push(`load:${stage.name}(${currentData.length} records)`);
      }

      stageResults.push({
        stageId: stage.id,
        stageName: stage.name,
        type: stage.type,
        inputCount,
        outputCount: currentData.length,
        durationMs: Date.now() - stageStart,
        timestamp: Date.now(),
      });
    } catch (error) {
      success = false;
      stageResults.push({
        stageId: stage.id,
        stageName: stage.name,
        type: stage.type,
        inputCount,
        outputCount: 0,
        durationMs: Date.now() - stageStart,
        timestamp: Date.now(),
        error: String(error),
      });
      break;
    }
  }

  const totalDurationMs = Date.now() - startTime;
  pipeline.totalRuns++;
  pipeline.lastRunTime = totalDurationMs;
  pipeline.stageResults.push(...stageResults);

  // σ計算
  const sigma = computeETLSigma(pipeline, stageResults, inputData, currentData, totalDurationMs, dataLineage);

  return {
    reiType: 'ETLResult',
    pipelineId: pipeline.id,
    pipelineName: pipeline.name,
    success,
    data: currentData,
    stageResults,
    totalDurationMs,
    sigma,
  };
}

/** ETL σ計算 */
function computeETLSigma(
  pipeline: ETLPipeline,
  stageResults: StageResult[],
  inputData: Record<string, any>[],
  outputData: Record<string, any>[],
  totalDurationMs: number,
  dataLineage: string[]
): ETLSigma {
  const extractStages = pipeline.stages.filter(s => s.type === 'extract');
  const transformStages = pipeline.stages.filter(s => s.type === 'transform');
  const loadStages = pipeline.stages.filter(s => s.type === 'load');

  // ボトルネック検出
  const bottleneck = stageResults.reduce((max, sr) =>
    sr.durationMs > max.durationMs ? sr : max,
    stageResults[0] || { stageName: 'none', durationMs: 0 }
  );

  const avgDuration = stageResults.length > 0
    ? stageResults.reduce((s, sr) => s + sr.durationMs, 0) / stageResults.length
    : 0;

  // データ品質スコア
  let nullCount = 0;
  let totalFields = 0;
  for (const record of outputData) {
    for (const key of Object.keys(record)) {
      totalFields++;
      if (record[key] === null || record[key] === undefined) nullCount++;
    }
  }
  const completeness = totalFields > 0 ? 1 - nullCount / totalFields : 1;

  const inputSchema = extractStages[0]?.outputSchema ?? [];
  const lastStage = pipeline.stages[pipeline.stages.length - 1];
  const outputSchema = lastStage?.inputSchema ?? lastStage?.outputSchema ?? [];

  return {
    reiType: 'ETLSigma',
    field: {
      totalStages: pipeline.stages.length,
      extractCount: extractStages.length,
      transformCount: transformStages.length,
      loadCount: loadStages.length,
      inputSchema,
      outputSchema,
    },
    flow: {
      direction: stageResults.some(r => r.error) ? 'failed' : 'complete',
      totalDurationMs,
      avgStageDurationMs: avgDuration,
      bottleneckStage: bottleneck?.stageName ?? 'none',
      throughputRecordsPerSec: totalDurationMs > 0
        ? (inputData.length / totalDurationMs) * 1000
        : 0,
    },
    memory: {
      stageHistory: stageResults,
      totalTransformations: transformStages.length,
      totalRuns: pipeline.totalRuns,
      dataLineage,
    },
    layer: {
      depth: pipeline.stages.length,
      branchCount: 1,
      compressionRatio: inputData.length > 0
        ? outputData.length / inputData.length
        : 1,
    },
    relation: {
      dependencies: pipeline.stages.map((s, i) =>
        i > 0 ? `${pipeline.stages[i - 1].id} → ${s.id}` : `source → ${s.id}`
      ),
      schemaTransitions: transformStages.length,
    },
    will: {
      qualityScore: completeness * (stageResults.some(r => r.error) ? 0.5 : 1.0),
      completeness,
      goal: 'balanced',
    },
  };
}

// ═══════════════════════════════════════════
// Part 3: LLMエージェント連携
// ═══════════════════════════════════════════

/** エージェントオーケストレータの生成 */
export function createAgentOrchestrator(
  agents: LLMAgentDef[],
  tokenBudget: number = 10000
): AgentOrchestrator {
  return {
    reiType: 'AgentOrchestrator',
    agents,
    messages: [],
    tokenBudget,
    tokenUsed: 0,
    totalRounds: 0,
  };
}

/**
 * エージェント間オーケストレーション
 * 各エージェントに順にタスクを投げ、結果を次のエージェントに渡す
 * 
 * simulateFn: テスト用のLLM応答シミュレーター
 *   (agent: LLMAgentDef, input: string) => { output: string, tokens: number }
 */
export function orchestrate(
  orch: AgentOrchestrator,
  task: string,
  simulateFn: (agent: LLMAgentDef, input: string) => { output: string; tokens: number }
): OrchResult {
  const rounds: OrchRound[] = [];
  let currentInput = task;
  let totalTokens = 0;

  for (const agent of orch.agents) {
    if (totalTokens >= orch.tokenBudget) break;

    const roundStart = Date.now();
    const { output, tokens } = simulateFn(agent, currentInput);
    const durationMs = Date.now() - roundStart;

    totalTokens += tokens;
    orch.tokenUsed += tokens;
    orch.totalRounds++;

    const round: OrchRound = {
      round: rounds.length + 1,
      agentId: agent.id,
      input: currentInput,
      output,
      tokenCount: tokens,
      durationMs,
    };
    rounds.push(round);

    orch.messages.push({
      from: 'user',
      to: agent.id,
      content: currentInput,
      timestamp: Date.now(),
      tokenCount: estimateTokens(currentInput),
    });
    orch.messages.push({
      from: agent.id,
      to: 'user',
      content: output,
      timestamp: Date.now(),
      tokenCount: tokens,
    });

    currentInput = output;
  }

  const finalOutput = rounds.length > 0 ? rounds[rounds.length - 1].output : '';

  const sigma = computeOrchSigma(orch, rounds, totalTokens);

  return {
    reiType: 'OrchResult',
    task,
    rounds,
    finalOutput,
    totalTokens,
    sigma,
  };
}

/** トークン数の推定（簡易） */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** オーケストレーションσ計算 */
function computeOrchSigma(
  orch: AgentOrchestrator,
  rounds: OrchRound[],
  totalTokens: number
): OrchSigma {
  const avgDuration = rounds.length > 0
    ? rounds.reduce((s, r) => s + r.durationMs, 0) / rounds.length
    : 0;

  // 最もアクティブなエージェント
  const agentTokens = new Map<string, number>();
  for (const r of rounds) {
    agentTokens.set(r.agentId, (agentTokens.get(r.agentId) || 0) + r.tokenCount);
  }
  let mostActiveAgent = '';
  let maxTokens = 0;
  for (const [id, tokens] of agentTokens) {
    if (tokens > maxTokens) {
      maxTokens = tokens;
      mostActiveAgent = id;
    }
  }

  // 通信ペア数
  const pairs = new Set<string>();
  for (const msg of orch.messages) {
    pairs.add(`${msg.from}->${msg.to}`);
  }

  return {
    reiType: 'OrchSigma',
    field: {
      agentCount: orch.agents.length,
      roles: orch.agents.map(a => a.role),
    },
    flow: {
      totalRounds: rounds.length,
      avgRoundDuration: avgDuration,
      direction: 'sequential',
    },
    memory: {
      conversationLength: orch.messages.length,
      totalTokens,
      contextUtilization: orch.tokenBudget > 0 ? totalTokens / orch.tokenBudget : 0,
    },
    layer: {
      depth: rounds.length,
      delegation: rounds.length > 1 ? rounds.length - 1 : 0,
    },
    relation: {
      communicationPairs: pairs.size,
      mostActiveAgent,
    },
    will: {
      convergence: rounds.length > 0 ? 1.0 : 0,
      confidence: Math.min(totalTokens / (orch.tokenBudget * 0.5), 1.0),
    },
  };
}

// ═══════════════════════════════════════════
// Part 4: データフロー分析
// ═══════════════════════════════════════════

/** パイプラインのデータフロー分析 */
export function analyzeDataFlow(pipeline: ETLPipeline): DataFlowAnalysis {
  const nodes: DataFlowNode[] = [];
  const edges: DataFlowEdge[] = [];
  const bottlenecks: string[] = [];

  // ノードの作成
  for (const stage of pipeline.stages) {
    const avgDuration = pipeline.stageResults
      .filter(sr => sr.stageId === stage.id)
      .reduce((sum, sr, _, arr) => sum + sr.durationMs / arr.length, 0);

    nodes.push({
      id: stage.id,
      name: stage.name,
      type: stage.type === 'extract' ? 'source' : (stage.type === 'load' ? 'sink' : 'transform'),
      avgDurationMs: avgDuration,
    });
  }

  // エッジの作成
  for (let i = 1; i < pipeline.stages.length; i++) {
    const prevResults = pipeline.stageResults.filter(
      sr => sr.stageId === pipeline.stages[i - 1].id
    );
    const avgRecords = prevResults.length > 0
      ? prevResults.reduce((s, sr) => s + sr.outputCount, 0) / prevResults.length
      : 0;

    edges.push({
      from: pipeline.stages[i - 1].id,
      to: pipeline.stages[i].id,
      recordCount: Math.round(avgRecords),
    });
  }

  // ボトルネック検出（平均の2倍以上かかるステージ）
  const avgDuration = nodes.reduce((s, n) => s + n.avgDurationMs, 0) / (nodes.length || 1);
  for (const node of nodes) {
    if (node.avgDurationMs > avgDuration * 2) {
      bottlenecks.push(node.id);
    }
  }

  // クリティカルパス（直列なので全ステージ）
  const criticalPath = pipeline.stages.map(s => s.id);

  return {
    reiType: 'DataFlowAnalysis',
    nodes,
    edges,
    bottlenecks,
    criticalPath,
    maxDepth: pipeline.stages.length,
  };
}

// ═══════════════════════════════════════════
// Part 5: ユーティリティ変換関数
// ═══════════════════════════════════════════

/** 汎用的な変換関数ビルダー */
export const transforms = {
  /** フィルタ変換 */
  filter(name: string, predicate: (r: Record<string, any>) => boolean): TransformDef {
    return {
      id: `tf_filter_${Date.now()}`,
      name,
      type: 'filter',
      fn: (records) => records.filter(predicate),
      description: `Filter: ${name}`,
    };
  },

  /** マップ変換 */
  map(name: string, mapper: (r: Record<string, any>) => Record<string, any>): TransformDef {
    return {
      id: `tf_map_${Date.now()}`,
      name,
      type: 'map',
      fn: (records) => records.map(mapper),
      description: `Map: ${name}`,
    };
  },

  /** 集約変換 */
  aggregate(
    name: string,
    groupBy: string,
    aggregations: Record<string, (values: any[]) => any>
  ): TransformDef {
    return {
      id: `tf_agg_${Date.now()}`,
      name,
      type: 'aggregate',
      fn: (records) => {
        const groups = new Map<string, Record<string, any>[]>();
        for (const r of records) {
          const key = String(r[groupBy] ?? 'null');
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(r);
        }

        const result: Record<string, any>[] = [];
        for (const [key, group] of groups) {
          const row: Record<string, any> = { [groupBy]: key };
          for (const [aggName, aggFn] of Object.entries(aggregations)) {
            row[aggName] = aggFn(group.map(r => r[aggName] ?? r));
          }
          result.push(row);
        }
        return result;
      },
      description: `Aggregate by ${groupBy}: ${name}`,
    };
  },

  /** 射影（列選択）変換 */
  project(name: string, columns: string[]): TransformDef {
    return {
      id: `tf_proj_${Date.now()}`,
      name,
      type: 'project',
      fn: (records) => records.map(r => {
        const result: Record<string, any> = {};
        for (const col of columns) {
          if (col in r) result[col] = r[col];
        }
        return result;
      }),
      description: `Project: ${columns.join(', ')}`,
    };
  },

  /** ソート変換 */
  sort(name: string, key: string, order: 'asc' | 'desc' = 'asc'): TransformDef {
    return {
      id: `tf_sort_${Date.now()}`,
      name,
      type: 'sort',
      fn: (records) => [...records].sort((a, b) => {
        const va = a[key] ?? 0;
        const vb = b[key] ?? 0;
        return order === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
      }),
      description: `Sort by ${key} ${order}`,
    };
  },
};
