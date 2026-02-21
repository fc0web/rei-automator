/**
 * pipeline-core.ts — データフロー・パイプライン共通基盤
 * 
 * 情報工学(C)で中心的に使われるデータ変換パイプライン。
 * Reiの「流れ（flow）」属性を具現化し、データが段階的に
 * 変換される過程を追跡可能にする。
 * 
 * 6属性マッピング:
 *   field  = データスキーマ（入力/出力の型）
 *   flow   = データフロー（変換の方向と速度）
 *   memory = 変換ログ（各ステージの入出力記録）
 *   layer  = ステージ深度
 *   relation = ステージ間の依存関係
 *   will   = 最適化目標（スループット、遅延）
 * 
 * @author Nobuki Fujimoto (D-FUMT)
 * @version Phase 5
 */

// ============================================================
// 型定義
// ============================================================

/** パイプラインのステージ */
export interface PipelineStage {
  name: string;
  type: 'extract' | 'transform' | 'load' | 'filter' | 'aggregate' | 'custom';
  fn: (data: any, context: PipelineContext) => any;
  config?: Record<string, any>;
}

/** パイプライン実行コンテキスト */
export interface PipelineContext {
  stageIndex: number;
  stageName: string;
  startTime: number;
  metadata: Record<string, any>;
}

/** ステージ実行ログ */
export interface StageLog {
  stage: string;
  type: string;
  inputSize: number;
  outputSize: number;
  duration: number;
  success: boolean;
  error?: string;
}

/** パイプライン空間 */
export interface PipelineSpace {
  reiType: 'PipelineSpace';
  stages: PipelineStage[];
  data: any;
  logs: StageLog[];
  status: 'ready' | 'running' | 'completed' | 'error';
  result: any;
  metadata: Record<string, any>;
}

// ============================================================
// 空間の作成
// ============================================================

export function createPipelineSpace(initialData?: any): PipelineSpace {
  return {
    reiType: 'PipelineSpace',
    stages: [],
    data: initialData ?? null,
    logs: [],
    status: 'ready',
    result: null,
    metadata: {},
  };
}

// ============================================================
// ステージ操作
// ============================================================

/** ステージ追加 */
export function addStage(
  space: PipelineSpace,
  name: string,
  type: PipelineStage['type'],
  fn: PipelineStage['fn'],
  config?: Record<string, any>,
): PipelineSpace {
  space.stages.push({ name, type, fn, config });
  return space;
}

/** ビルトイン：フィルタステージ */
export function filterStage(predicate: (item: any) => boolean): PipelineStage {
  return {
    name: 'filter',
    type: 'filter',
    fn: (data: any) => {
      if (Array.isArray(data)) return data.filter(predicate);
      return predicate(data) ? data : null;
    },
  };
}

/** ビルトイン：マップ変換ステージ */
export function mapStage(mapper: (item: any) => any): PipelineStage {
  return {
    name: 'map',
    type: 'transform',
    fn: (data: any) => {
      if (Array.isArray(data)) return data.map(mapper);
      return mapper(data);
    },
  };
}

/** ビルトイン：集約ステージ */
export function aggregateStage(
  reducer: (acc: any, item: any) => any,
  initial: any,
): PipelineStage {
  return {
    name: 'aggregate',
    type: 'aggregate',
    fn: (data: any) => {
      if (Array.isArray(data)) return data.reduce(reducer, initial);
      return data;
    },
  };
}

// ============================================================
// パイプライン実行
// ============================================================

function estimateSize(data: any): number {
  if (data === null || data === undefined) return 0;
  if (Array.isArray(data)) return data.length;
  if (typeof data === 'string') return data.length;
  if (typeof data === 'object') return Object.keys(data).length;
  return 1;
}

/** パイプライン実行 */
export function pipelineRun(space: PipelineSpace): PipelineSpace {
  space.status = 'running';
  space.logs = [];
  let current = space.data;
  
  for (let i = 0; i < space.stages.length; i++) {
    const stage = space.stages[i];
    const context: PipelineContext = {
      stageIndex: i,
      stageName: stage.name,
      startTime: Date.now(),
      metadata: { ...space.metadata },
    };
    
    const inputSize = estimateSize(current);
    const start = performance.now();
    
    try {
      current = stage.fn(current, context);
      const duration = performance.now() - start;
      
      space.logs.push({
        stage: stage.name,
        type: stage.type,
        inputSize,
        outputSize: estimateSize(current),
        duration,
        success: true,
      });
    } catch (err: any) {
      const duration = performance.now() - start;
      space.logs.push({
        stage: stage.name,
        type: stage.type,
        inputSize,
        outputSize: 0,
        duration,
        success: false,
        error: err.message,
      });
      space.status = 'error';
      space.result = { error: err.message, failedStage: stage.name };
      return space;
    }
  }
  
  space.status = 'completed';
  space.result = current;
  return space;
}

// ============================================================
// σ（シグマ）
// ============================================================

export function getPipelineSigma(space: PipelineSpace): any {
  const totalDuration = space.logs.reduce((sum, l) => sum + l.duration, 0);
  const successCount = space.logs.filter(l => l.success).length;
  const bottleneck = space.logs.length > 0
    ? space.logs.reduce((max, l) => l.duration > max.duration ? l : max, space.logs[0])
    : null;
  
  return {
    reiType: 'SigmaResult',
    domain: 'info_engineering',
    field: {
      inputSchema: describeType(space.data),
      outputSchema: describeType(space.result),
      stages: space.stages.length,
    },
    flow: {
      direction: space.status === 'completed' ? 'forward' : 'blocked',
      momentum: successCount / Math.max(space.stages.length, 1),
      velocity: totalDuration > 0 ? space.stages.length / totalDuration * 1000 : 0,
      phase: space.status,
    },
    memory: space.logs.map(l => ({
      stage: l.stage,
      type: l.type,
      inputSize: l.inputSize,
      outputSize: l.outputSize,
      duration: l.duration,
      success: l.success,
    })),
    layer: {
      depth: space.stages.length,
      names: space.stages.map(s => s.name),
    },
    relation: space.stages.map((s, i) => ({
      from: i > 0 ? space.stages[i - 1].name : 'input',
      to: s.name,
      type: 'data_flow',
    })),
    will: {
      tendency: space.status === 'completed' ? 'fulfilled' : 'seeking',
      strength: successCount / Math.max(space.stages.length, 1),
      goal: 'throughput',
    },
    performance: {
      totalDuration,
      stagesCompleted: successCount,
      bottleneck: bottleneck ? bottleneck.stage : null,
    },
    status: space.status,
  };
}

function describeType(data: any): string {
  if (data === null || data === undefined) return 'null';
  if (Array.isArray(data)) return `array[${data.length}]`;
  return typeof data;
}
