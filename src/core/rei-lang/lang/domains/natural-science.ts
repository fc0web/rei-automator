/**
 * natural-science.ts — 自然科学ドメイン拡張
 * 
 * N体問題、物理シミュレーション、波動方程式など
 * 自然科学の現象をReiのパイプで表現する。
 * 
 * 使用例:
 *   [3] |> nbody("gravity") |> sim_run(100) |> sim_sigma
 *   [5, 5] |> wave_field |> sim_run(50) |> sim_sigma
 * 
 * @author Nobuki Fujimoto (D-FUMT)
 * @version Phase 5
 */

import {
  type SimulationSpace,
  type SimParticle,
  createSimulationSpace,
  addParticle,
  addRule,
  gravityRule,
  springRule,
  diffusionRule,
  simStep,
  simRun,
  getSimulationSigma,
} from './simulation-core';

// ============================================================
// N体シミュレーション
// ============================================================

/**
 * N体シミュレーション空間の作成
 * @param n 粒子数
 * @param forceType 力の種類: gravity, spring, coulomb
 * @param params 追加パラメータ
 */
export function createNBodySpace(
  n: number,
  forceType: string = 'gravity',
  params: Record<string, number> = {},
): SimulationSpace {
  const space = createSimulationSpace('natural_science', 2, params.dt ?? 0.01);
  space.params = { ...params };
  
  // 粒子を円形に配置
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n;
    const radius = params.radius ?? 5;
    const orbitalV = params.orbitalVelocity ?? Math.sqrt(1 / radius);
    
    addParticle(
      space,
      `p${i}`,
      [radius * Math.cos(angle), radius * Math.sin(angle)],
      [-orbitalV * Math.sin(angle), orbitalV * Math.cos(angle)],
      params.mass ?? 1,
    );
  }
  
  // ルール設定
  switch (forceType) {
    case 'gravity':
      space.params.G = params.G ?? 1;
      space.params.softening = params.softening ?? 0.1;
      addRule(space, gravityRule);
      break;
    case 'spring':
      space.params.k = params.k ?? 1;
      space.params.restLength = params.restLength ?? 1;
      space.params.damping = params.damping ?? 0.01;
      addRule(space, springRule);
      break;
    case 'coulomb':
      space.params.G = params.ke ?? 1;  // クーロン定数をG相当で扱う
      space.params.softening = params.softening ?? 0.1;
      // 交互に正負の電荷を割り当て
      for (let i = 0; i < space.particles.length; i++) {
        space.particles[i].properties.charge = i % 2 === 0 ? 1 : -1;
      }
      addRule(space, coulombRule);
      break;
    default:
      addRule(space, gravityRule);
  }
  
  return space;
}

/** クーロン力ルール */
const coulombRule = {
  name: 'coulomb',
  type: 'pairwise' as const,
  apply: (particles: SimParticle[], dt: number, params: Record<string, number>) => {
    const ke = params.G ?? 1;
    const softening = params.softening ?? 0.01;
    const n = particles.length;
    const accelerations: number[][] = particles.map(p => Array(p.position.length).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const pi = particles[i];
        const pj = particles[j];
        const qi = pi.properties.charge ?? 1;
        const qj = pj.properties.charge ?? 1;
        const dims = pi.position.length;
        
        const dr: number[] = [];
        let r2 = softening;
        for (let d = 0; d < dims; d++) {
          const diff = pj.position[d] - pi.position[d];
          dr.push(diff);
          r2 += diff * diff;
        }
        
        const r = Math.sqrt(r2);
        // クーロン力: F = ke * q1 * q2 / r^2 (同符号で反発)
        const force = -ke * qi * qj / r2;
        
        for (let d = 0; d < dims; d++) {
          const f = force * dr[d] / r;
          accelerations[i][d] += f / pi.mass;
          accelerations[j][d] -= f / pj.mass;
        }
      }
    }
    
    for (let i = 0; i < n; i++) {
      const p = particles[i];
      for (let d = 0; d < p.position.length; d++) {
        p.velocity[d] += accelerations[i][d] * dt;
        p.position[d] += p.velocity[d] * dt;
      }
    }
  },
};

// ============================================================
// 波動場（格子シミュレーション）
// ============================================================

export interface WaveFieldSpace {
  reiType: 'WaveFieldSpace';
  width: number;
  height: number;
  grid: number[][];       // 変位
  velocity: number[][];   // 速度
  time: number;
  dt: number;
  c: number;              // 波速
  damping: number;
  history: { time: number; energy: number; maxAmplitude: number }[];
}

export function createWaveField(
  width: number,
  height: number,
  params: Record<string, number> = {},
): WaveFieldSpace {
  const grid: number[][] = [];
  const velocity: number[][] = [];
  
  for (let y = 0; y < height; y++) {
    grid.push(Array(width).fill(0));
    velocity.push(Array(width).fill(0));
  }
  
  // 中央に初期波紋
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  const amp = params.amplitude ?? 1;
  const sigma = params.sigma ?? 2;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const r2 = (x - cx) ** 2 + (y - cy) ** 2;
      grid[y][x] = amp * Math.exp(-r2 / (2 * sigma * sigma));
    }
  }
  
  return {
    reiType: 'WaveFieldSpace',
    width,
    height,
    grid,
    velocity,
    time: 0,
    dt: params.dt ?? 0.1,
    c: params.c ?? 1,
    damping: params.damping ?? 0.01,
    history: [],
  };
}

/** 波動場1ステップ */
export function waveStep(field: WaveFieldSpace): WaveFieldSpace {
  const { width, height, grid, velocity, dt, c, damping } = field;
  const c2dt2 = (c * dt) ** 2;
  
  // ラプラシアンを計算して更新
  const newGrid: number[][] = [];
  for (let y = 0; y < height; y++) {
    newGrid.push([...grid[y]]);
  }
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const laplacian = 
        grid[y - 1][x] + grid[y + 1][x] + 
        grid[y][x - 1] + grid[y][x + 1] - 
        4 * grid[y][x];
      
      velocity[y][x] += c2dt2 * laplacian - damping * velocity[y][x] * dt;
      newGrid[y][x] = grid[y][x] + velocity[y][x] * dt;
    }
  }
  
  field.grid = newGrid;
  field.time += dt;
  
  // エネルギー計算
  let energy = 0;
  let maxAmp = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      energy += 0.5 * (velocity[y][x] ** 2 + newGrid[y][x] ** 2);
      if (Math.abs(newGrid[y][x]) > maxAmp) maxAmp = Math.abs(newGrid[y][x]);
    }
  }
  field.history.push({ time: field.time, energy, maxAmplitude: maxAmp });
  
  return field;
}

/** 波動場Nステップ */
export function waveRun(field: WaveFieldSpace, steps: number): WaveFieldSpace {
  for (let i = 0; i < steps; i++) waveStep(field);
  return field;
}

/** 波動場のσ */
export function getWaveFieldSigma(field: WaveFieldSpace): any {
  const latest = field.history.length > 0 ? field.history[field.history.length - 1] : null;
  const initial = field.history.length > 0 ? field.history[0] : null;
  
  return {
    reiType: 'SigmaResult',
    domain: 'natural_science',
    subtype: 'wave_field',
    field: {
      center: [Math.floor(field.width / 2), Math.floor(field.height / 2)],
      dimensions: [field.width, field.height],
      type: 'wave',
    },
    flow: {
      direction: latest && latest.maxAmplitude > 0.01 ? 'propagating' : 'damped',
      momentum: latest?.maxAmplitude ?? 0,
      velocity: field.c,
      phase: field.time,
    },
    memory: field.history.slice(-20).map(h => ({
      time: h.time,
      energy: h.energy,
      maxAmplitude: h.maxAmplitude,
    })),
    layer: { depth: 1, type: 'grid' },
    relation: [],
    will: {
      tendency: latest && latest.energy > 0.01 ? 'oscillating' : 'rest',
      strength: latest?.energy ?? 0,
    },
    energy: latest?.energy ?? 0,
    maxAmplitude: latest?.maxAmplitude ?? 0,
    time: field.time,
    damping: field.damping,
  };
}

// ============================================================
// エクスポート（evaluatorとの統合用）
// ============================================================

export {
  simStep,
  simRun,
  getSimulationSigma,
};
