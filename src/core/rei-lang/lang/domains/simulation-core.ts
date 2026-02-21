/**
 * simulation-core.ts — 時間発展シミュレーション共通基盤
 * 
 * 自然科学(B)と人文科学(D)で共有される時間発展モデル。
 * Reiの中心-周縁パラダイムに基づき、状態空間が時間とともに
 * 発展する「場の動力学」を抽象化する。
 * 
 * 6属性マッピング:
 *   field  = 状態空間のトポロジー
 *   flow   = 時間発展の位相
 *   memory = 状態履歴
 *   layer  = スケール階層
 *   relation = 粒子/要素間の相互作用
 *   will   = ポテンシャル/傾向
 * 
 * @author Nobuki Fujimoto (D-FUMT)
 * @version Phase 5
 */

// ============================================================
// 型定義
// ============================================================

/** シミュレーション内の粒子/要素 */
export interface SimParticle {
  id: string;
  position: number[];    // N次元位置
  velocity: number[];    // N次元速度
  mass: number;
  properties: Record<string, number>;  // ドメイン固有属性
}

/** シミュレーション空間の状態スナップショット */
export interface SimSnapshot {
  time: number;
  particles: SimParticle[];
  energy: { kinetic: number; potential: number; total: number };
}

/** 時間発展のルール（力の法則など） */
export interface SimRule {
  name: string;
  type: 'pairwise' | 'field' | 'boundary' | 'custom';
  apply: (particles: SimParticle[], dt: number, params: Record<string, number>) => void;
}

/** シミュレーション空間 */
export interface SimulationSpace {
  reiType: 'SimulationSpace';
  domain: 'natural_science' | 'humanities' | 'general';
  particles: SimParticle[];
  rules: SimRule[];
  time: number;
  dt: number;
  history: SimSnapshot[];
  params: Record<string, number>;
  dimensions: number;
}

// ============================================================
// 空間の作成
// ============================================================

export function createSimulationSpace(
  domain: SimulationSpace['domain'],
  dimensions: number = 2,
  dt: number = 0.01,
): SimulationSpace {
  return {
    reiType: 'SimulationSpace',
    domain,
    particles: [],
    rules: [],
    time: 0,
    dt,
    history: [],
    params: {},
    dimensions,
  };
}

// ============================================================
// 粒子操作
// ============================================================

export function addParticle(
  space: SimulationSpace,
  id: string,
  position: number[],
  velocity?: number[],
  mass?: number,
  properties?: Record<string, number>,
): SimulationSpace {
  const dims = space.dimensions;
  const pos = position.length >= dims ? position.slice(0, dims) : [...position, ...Array(dims - position.length).fill(0)];
  const vel = velocity 
    ? (velocity.length >= dims ? velocity.slice(0, dims) : [...velocity, ...Array(dims - velocity.length).fill(0)])
    : Array(dims).fill(0);
  
  space.particles.push({
    id,
    position: pos,
    velocity: vel,
    mass: mass ?? 1,
    properties: properties ?? {},
  });
  return space;
}

// ============================================================
// ルール追加
// ============================================================

export function addRule(space: SimulationSpace, rule: SimRule): SimulationSpace {
  space.rules.push(rule);
  return space;
}

// ============================================================
// ビルトインルール
// ============================================================

/** 万有引力 */
export const gravityRule: SimRule = {
  name: 'gravity',
  type: 'pairwise',
  apply: (particles, dt, params) => {
    const G = params.G ?? 1;
    const softening = params.softening ?? 0.01;
    const n = particles.length;
    
    // 加速度の計算
    const accelerations: number[][] = particles.map(p => Array(p.position.length).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const pi = particles[i];
        const pj = particles[j];
        const dims = pi.position.length;
        
        // 距離ベクトル
        const dr: number[] = [];
        let r2 = softening;
        for (let d = 0; d < dims; d++) {
          const diff = pj.position[d] - pi.position[d];
          dr.push(diff);
          r2 += diff * diff;
        }
        
        const r = Math.sqrt(r2);
        const force = G * pi.mass * pj.mass / r2;
        
        for (let d = 0; d < dims; d++) {
          const f = force * dr[d] / r;
          accelerations[i][d] += f / pi.mass;
          accelerations[j][d] -= f / pj.mass;
        }
      }
    }
    
    // Velocity Verlet 積分
    for (let i = 0; i < n; i++) {
      const p = particles[i];
      const dims = p.position.length;
      for (let d = 0; d < dims; d++) {
        p.velocity[d] += accelerations[i][d] * dt;
        p.position[d] += p.velocity[d] * dt;
      }
    }
  },
};

/** バネ（フック）の法則 */
export const springRule: SimRule = {
  name: 'spring',
  type: 'pairwise',
  apply: (particles, dt, params) => {
    const k = params.k ?? 1;
    const restLength = params.restLength ?? 1;
    const damping = params.damping ?? 0.01;
    const n = particles.length;
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const pi = particles[i];
        const pj = particles[j];
        const dims = pi.position.length;
        
        let r2 = 0;
        const dr: number[] = [];
        for (let d = 0; d < dims; d++) {
          const diff = pj.position[d] - pi.position[d];
          dr.push(diff);
          r2 += diff * diff;
        }
        
        const r = Math.sqrt(r2) || 0.001;
        const displacement = r - restLength;
        const force = k * displacement;
        
        for (let d = 0; d < dims; d++) {
          const f = force * dr[d] / r;
          pi.velocity[d] += (f / pi.mass - damping * pi.velocity[d]) * dt;
          pj.velocity[d] -= (f / pj.mass - damping * pj.velocity[d]) * dt;
        }
      }
    }
    
    for (const p of particles) {
      for (let d = 0; d < p.position.length; d++) {
        p.position[d] += p.velocity[d] * dt;
      }
    }
  },
};

/** 拡散ルール（粒子間の影響伝播） */
export const diffusionRule: SimRule = {
  name: 'diffusion',
  type: 'field',
  apply: (particles, dt, params) => {
    const D = params.D ?? 0.1;
    const propName = 'influence';
    const n = particles.length;
    
    // 各粒子のinfluenceの変化を計算
    const deltas: number[] = Array(n).fill(0);
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const pi = particles[i];
        const pj = particles[j];
        let r2 = 0;
        for (let d = 0; d < pi.position.length; d++) {
          r2 += (pj.position[d] - pi.position[d]) ** 2;
        }
        const r = Math.sqrt(r2) || 0.001;
        const diff = (pj.properties[propName] ?? 0) - (pi.properties[propName] ?? 0);
        const flux = D * diff / r * dt;
        deltas[i] += flux;
        deltas[j] -= flux;
      }
    }
    
    for (let i = 0; i < n; i++) {
      particles[i].properties[propName] = (particles[i].properties[propName] ?? 0) + deltas[i];
    }
  },
};

// ============================================================
// シミュレーション実行
// ============================================================

function takeSnapshot(space: SimulationSpace): SimSnapshot {
  let kinetic = 0;
  for (const p of space.particles) {
    let v2 = 0;
    for (const v of p.velocity) v2 += v * v;
    kinetic += 0.5 * p.mass * v2;
  }
  
  // ポテンシャルエネルギー（万有引力の場合）
  let potential = 0;
  const G = space.params.G ?? 1;
  for (let i = 0; i < space.particles.length; i++) {
    for (let j = i + 1; j < space.particles.length; j++) {
      let r2 = 0;
      for (let d = 0; d < space.dimensions; d++) {
        r2 += (space.particles[j].position[d] - space.particles[i].position[d]) ** 2;
      }
      potential -= G * space.particles[i].mass * space.particles[j].mass / (Math.sqrt(r2) || 0.001);
    }
  }
  
  return {
    time: space.time,
    particles: space.particles.map(p => ({
      ...p,
      position: [...p.position],
      velocity: [...p.velocity],
      properties: { ...p.properties },
    })),
    energy: { kinetic, potential, total: kinetic + potential },
  };
}

/** 1ステップ進行 */
export function simStep(space: SimulationSpace): SimulationSpace {
  // スナップショット保存
  if (space.history.length === 0 || space.history[space.history.length - 1].time !== space.time) {
    space.history.push(takeSnapshot(space));
  }
  
  // ルール適用
  for (const rule of space.rules) {
    rule.apply(space.particles, space.dt, space.params);
  }
  
  space.time += space.dt;
  return space;
}

/** Nステップ実行 */
export function simRun(space: SimulationSpace, steps: number): SimulationSpace {
  for (let i = 0; i < steps; i++) {
    simStep(space);
  }
  // 最終状態も保存
  space.history.push(takeSnapshot(space));
  return space;
}

// ============================================================
// σ（シグマ）- 6属性メタデータ
// ============================================================

export function getSimulationSigma(space: SimulationSpace): any {
  const latest = space.history.length > 0 ? space.history[space.history.length - 1] : takeSnapshot(space);
  const initial = space.history.length > 0 ? space.history[0] : latest;
  
  // エネルギー保存率
  const energyConservation = initial.energy.total !== 0 
    ? Math.abs(latest.energy.total / initial.energy.total)
    : 1;
  
  // 重心の移動
  const centerOfMass = Array(space.dimensions).fill(0);
  let totalMass = 0;
  for (const p of space.particles) {
    totalMass += p.mass;
    for (let d = 0; d < space.dimensions; d++) {
      centerOfMass[d] += p.mass * p.position[d];
    }
  }
  if (totalMass > 0) {
    for (let d = 0; d < space.dimensions; d++) centerOfMass[d] /= totalMass;
  }
  
  // 平均速度（flow指標）
  let avgVelocity = 0;
  for (const p of space.particles) {
    let v2 = 0;
    for (const v of p.velocity) v2 += v * v;
    avgVelocity += Math.sqrt(v2);
  }
  avgVelocity = space.particles.length > 0 ? avgVelocity / space.particles.length : 0;
  
  return {
    reiType: 'SigmaResult',
    domain: space.domain,
    field: {
      center: centerOfMass,
      particles: space.particles.length,
      dimensions: space.dimensions,
      bounds: computeBounds(space),
    },
    flow: {
      direction: avgVelocity > 0.01 ? 'active' : 'rest',
      momentum: avgVelocity,
      velocity: avgVelocity,
      phase: space.time,
    },
    memory: space.history.map((s, i) => ({
      step: i,
      time: s.time,
      energy: s.energy.total,
    })),
    layer: {
      depth: space.rules.length,
      rules: space.rules.map(r => r.name),
    },
    relation: computeInteractions(space),
    will: {
      tendency: energyConservation > 0.95 ? 'conserved' : 'dissipating',
      strength: energyConservation,
      potential: latest.energy.potential,
    },
    energy: latest.energy,
    energyConservation,
    time: space.time,
    steps: space.history.length,
  };
}

function computeBounds(space: SimulationSpace): { min: number[]; max: number[] } {
  const min = Array(space.dimensions).fill(Infinity);
  const max = Array(space.dimensions).fill(-Infinity);
  for (const p of space.particles) {
    for (let d = 0; d < space.dimensions; d++) {
      if (p.position[d] < min[d]) min[d] = p.position[d];
      if (p.position[d] > max[d]) max[d] = p.position[d];
    }
  }
  return { min, max };
}

function computeInteractions(space: SimulationSpace): any[] {
  const interactions: any[] = [];
  for (let i = 0; i < space.particles.length; i++) {
    for (let j = i + 1; j < space.particles.length; j++) {
      let r2 = 0;
      for (let d = 0; d < space.dimensions; d++) {
        r2 += (space.particles[j].position[d] - space.particles[i].position[d]) ** 2;
      }
      interactions.push({
        from: space.particles[i].id,
        to: space.particles[j].id,
        distance: Math.sqrt(r2),
        type: 'interaction',
      });
    }
  }
  return interactions;
}
