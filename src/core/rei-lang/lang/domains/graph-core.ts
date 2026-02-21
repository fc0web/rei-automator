/**
 * graph-core.ts — ネットワーク構造共通基盤
 * 
 * B/C/D全ドメインで共有されるグラフ演算基盤。
 * Reiの「関係（relation）」属性を空間構造として具現化し、
 * 相互依存構造（interdependence）の数理的表現を提供する。
 * 
 * 6属性マッピング:
 *   field    = グラフのトポロジー
 *   flow     = 情報/影響の伝播
 *   memory   = 走査履歴
 *   layer    = コミュニティ/階層構造
 *   relation = エッジ（関係そのもの）
 *   will     = ノードの傾向・ポテンシャル
 * 
 * @author Nobuki Fujimoto (D-FUMT)
 * @version Phase 5
 */

// ============================================================
// 型定義
// ============================================================

/** グラフノード */
export interface GraphNode {
  id: string;
  label: string;
  properties: Record<string, any>;
  weight: number;
  layer?: number;         // 階層（系譜の世代、ネットワーク層など）
}

/** グラフエッジ */
export interface GraphEdge {
  from: string;
  to: string;
  type: string;           // caused, influenced, parent, depends_on, etc.
  weight: number;
  directed: boolean;
  properties: Record<string, any>;
}

/** グラフ空間 */
export interface GraphSpace {
  reiType: 'GraphSpace';
  domain: 'natural_science' | 'info_engineering' | 'humanities' | 'general';
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  traversalHistory: string[];
  metadata: Record<string, any>;
}

// ============================================================
// 空間の作成
// ============================================================

export function createGraphSpace(
  domain: GraphSpace['domain'] = 'general',
): GraphSpace {
  return {
    reiType: 'GraphSpace',
    domain,
    nodes: new Map(),
    edges: [],
    traversalHistory: [],
    metadata: {},
  };
}

// ============================================================
// ノード・エッジ操作
// ============================================================

export function addGraphNode(
  space: GraphSpace,
  id: string,
  label?: string,
  properties?: Record<string, any>,
  weight?: number,
  layer?: number,
): GraphSpace {
  space.nodes.set(id, {
    id,
    label: label ?? id,
    properties: properties ?? {},
    weight: weight ?? 1,
    layer,
  });
  return space;
}

export function addGraphEdge(
  space: GraphSpace,
  from: string,
  to: string,
  type: string = 'related',
  weight: number = 1,
  directed: boolean = true,
  properties?: Record<string, any>,
): GraphSpace {
  if (!space.nodes.has(from)) addGraphNode(space, from);
  if (!space.nodes.has(to)) addGraphNode(space, to);
  
  space.edges.push({
    from, to, type, weight, directed,
    properties: properties ?? {},
  });
  return space;
}

// ============================================================
// グラフ走査
// ============================================================

/** BFS走査 */
export function graphTraverse(
  space: GraphSpace,
  startId: string,
  mode: 'bfs' | 'dfs' = 'bfs',
  maxDepth: number = Infinity,
): { visited: string[]; paths: Map<string, string[]>; depths: Map<string, number> } {
  const visited: string[] = [];
  const paths = new Map<string, string[]>();
  const depths = new Map<string, number>();
  
  if (!space.nodes.has(startId)) return { visited, paths, depths };
  
  if (mode === 'bfs') {
    const queue: [string, number][] = [[startId, 0]];
    const seen = new Set<string>([startId]);
    paths.set(startId, [startId]);
    depths.set(startId, 0);
    
    while (queue.length > 0) {
      const [current, depth] = queue.shift()!;
      visited.push(current);
      space.traversalHistory.push(current);
      
      if (depth >= maxDepth) continue;
      
      const neighbors = getNeighbors(space, current);
      for (const neighbor of neighbors) {
        if (!seen.has(neighbor)) {
          seen.add(neighbor);
          depths.set(neighbor, depth + 1);
          paths.set(neighbor, [...(paths.get(current) || []), neighbor]);
          queue.push([neighbor, depth + 1]);
        }
      }
    }
  } else {
    // DFS
    const stack: [string, number][] = [[startId, 0]];
    const seen = new Set<string>();
    paths.set(startId, [startId]);
    depths.set(startId, 0);
    
    while (stack.length > 0) {
      const [current, depth] = stack.pop()!;
      if (seen.has(current)) continue;
      seen.add(current);
      visited.push(current);
      space.traversalHistory.push(current);
      
      if (depth >= maxDepth) continue;
      
      const neighbors = getNeighbors(space, current).reverse();
      for (const neighbor of neighbors) {
        if (!seen.has(neighbor)) {
          depths.set(neighbor, depth + 1);
          paths.set(neighbor, [...(paths.get(current) || []), neighbor]);
          stack.push([neighbor, depth + 1]);
        }
      }
    }
  }
  
  return { visited, paths, depths };
}

/** 隣接ノードの取得 */
export function getNeighbors(space: GraphSpace, nodeId: string): string[] {
  const neighbors: string[] = [];
  for (const edge of space.edges) {
    if (edge.from === nodeId) neighbors.push(edge.to);
    if (!edge.directed && edge.to === nodeId) neighbors.push(edge.from);
  }
  return [...new Set(neighbors)];
}

// ============================================================
// グラフ分析
// ============================================================

/** 次数中心性 */
export function degreeCentrality(space: GraphSpace): Map<string, number> {
  const degrees = new Map<string, number>();
  for (const node of space.nodes.values()) {
    degrees.set(node.id, 0);
  }
  for (const edge of space.edges) {
    degrees.set(edge.from, (degrees.get(edge.from) ?? 0) + 1);
    if (!edge.directed) {
      degrees.set(edge.to, (degrees.get(edge.to) ?? 0) + 1);
    }
  }
  // 正規化
  const maxDeg = Math.max(...degrees.values(), 1);
  for (const [id, deg] of degrees) {
    degrees.set(id, deg / maxDeg);
  }
  return degrees;
}

/** 影響伝播シミュレーション（相互依存構造の数理化） */
export function propagateInfluence(
  space: GraphSpace,
  sourceId: string,
  strength: number = 1,
  decay: number = 0.5,
  maxSteps: number = 10,
): Map<string, number> {
  const influence = new Map<string, number>();
  influence.set(sourceId, strength);
  
  let frontier = new Set([sourceId]);
  
  for (let step = 0; step < maxSteps && frontier.size > 0; step++) {
    const nextFrontier = new Set<string>();
    
    for (const current of frontier) {
      const currentInfluence = influence.get(current) ?? 0;
      if (currentInfluence < 0.001) continue;
      
      const neighbors = getNeighbors(space, current);
      for (const neighbor of neighbors) {
        const edge = space.edges.find(e => 
          (e.from === current && e.to === neighbor) ||
          (!e.directed && e.to === current && e.from === neighbor)
        );
        const edgeWeight = edge?.weight ?? 1;
        const propagated = currentInfluence * decay * edgeWeight;
        
        const existing = influence.get(neighbor) ?? 0;
        if (propagated > existing) {
          influence.set(neighbor, propagated);
          nextFrontier.add(neighbor);
        }
      }
    }
    
    frontier = nextFrontier;
  }
  
  return influence;
}

/** 連結成分 */
export function connectedComponents(space: GraphSpace): string[][] {
  const visited = new Set<string>();
  const components: string[][] = [];
  
  for (const nodeId of space.nodes.keys()) {
    if (visited.has(nodeId)) continue;
    
    const component: string[] = [];
    const queue = [nodeId];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      component.push(current);
      
      // 全方向の隣接を取得
      for (const edge of space.edges) {
        if (edge.from === current && !visited.has(edge.to)) queue.push(edge.to);
        if (edge.to === current && !visited.has(edge.from)) queue.push(edge.from);
      }
    }
    
    components.push(component);
  }
  
  return components;
}

/** 最短パス（BFS） */
export function shortestPath(space: GraphSpace, from: string, to: string): string[] | null {
  if (from === to) return [from];
  
  const queue: [string, string[]][] = [[from, [from]]];
  const visited = new Set<string>([from]);
  
  while (queue.length > 0) {
    const [current, path] = queue.shift()!;
    const neighbors = getNeighbors(space, current);
    
    // 無向グラフの場合の逆方向も探索
    for (const edge of space.edges) {
      if (edge.to === current && !edge.directed) {
        neighbors.push(edge.from);
      }
    }
    
    for (const neighbor of [...new Set(neighbors)]) {
      if (neighbor === to) return [...path, to];
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([neighbor, [...path, neighbor]]);
      }
    }
  }
  
  return null;
}

// ============================================================
// σ（シグマ）
// ============================================================

export function getGraphSigma(space: GraphSpace): any {
  const centrality = degreeCentrality(space);
  const components = connectedComponents(space);
  
  // 中心ノード（最高次数）
  let centerNode = '';
  let maxCentrality = 0;
  for (const [id, c] of centrality) {
    if (c > maxCentrality) {
      maxCentrality = c;
      centerNode = id;
    }
  }
  
  // エッジタイプの分布
  const edgeTypes: Record<string, number> = {};
  for (const edge of space.edges) {
    edgeTypes[edge.type] = (edgeTypes[edge.type] ?? 0) + 1;
  }
  
  return {
    reiType: 'SigmaResult',
    domain: space.domain,
    field: {
      center: centerNode,
      nodes: space.nodes.size,
      edges: space.edges.length,
      density: space.nodes.size > 1 
        ? space.edges.length / (space.nodes.size * (space.nodes.size - 1))
        : 0,
      components: components.length,
    },
    flow: {
      direction: space.edges.some(e => e.directed) ? 'directed' : 'undirected',
      momentum: space.edges.length / Math.max(space.nodes.size, 1),
      velocity: 0,
    },
    memory: space.traversalHistory.slice(-20),
    layer: {
      depth: components.length,
      structure: components.map(c => c.length),
    },
    relation: Object.entries(edgeTypes).map(([type, count]) => ({
      type,
      count,
      percentage: count / Math.max(space.edges.length, 1),
    })),
    will: {
      tendency: components.length === 1 ? 'connected' : 'fragmented',
      strength: maxCentrality,
      center: centerNode,
    },
    centrality: Object.fromEntries(centrality),
  };
}
