/**
 * multi-dimensional-spiral.ts — Rei言語: 多次元螺旋計算エンジン
 *
 * 「0₀を中心として、複数の次元方向に同時に螺旋的に計算が展開する」
 *
 * 螺旋数体系理論（z = r·e^(iθ + s·τ), τ² = -1 + ε）を
 * Reiの0₀中心-周縁パターンと統合し、多次元同時計算を実現する。
 *
 * 核心的構造:
 *   単一螺旋（螺旋数体系）:
 *     z = r · e^(iθ + s·τ)
 *
 *   多次元同時螺旋（Rei統合）:
 *     Z(n) = 0₀ · Π[k=1..n] e^(iθ_k + s_k·τ_k)
 *     各次元 k が独立した螺旋軸を持ち、
 *     全てが 0₀ から同時に展開を開始する。
 *
 * 物理的類似:
 *   - 銀河の渦巻き腕（複数の螺旋が中心から放射）
 *   - ブラックホールの降着円盤（螺旋的流入と中心での凝縮）
 *   - DNA二重螺旋（複数の螺旋軸の同期的進行）
 *
 * εパラメータの役割:
 *   ε < 1 → 楕円的（安定・周期的計算）
 *   ε = 1 → 放物的（臨界点・相転移）
 *   ε > 1 → 双曲的（急速展開・発散的探索）
 *
 * @module multi-dimensional-spiral
 * @author 藤本伸樹 (Nobuki Fujimoto)
 * @since Phase 8+
 */

// ============================================================
// §1 型定義
// ============================================================

/** 螺旋軸の領域分類 */
export type SpiralRegime = 'elliptic' | 'parabolic' | 'hyperbolic';

/** 単一螺旋軸の定義 */
export interface SpiralAxis {
  /** 軸ID */
  id: string;

  /** 軸の名前（用途） */
  name: string;

  /** ε パラメータ（領域決定） */
  epsilon: number;

  /** 螺旋位相の進行速度 */
  sRate: number;

  /** 角速度（回転速度） */
  thetaRate: number;

  /** 初期半径 */
  radius: number;

  /** 現在の螺旋位相 s */
  s: number;

  /** 現在の角度 θ */
  theta: number;

  /** この軸の計算内容 */
  payload: unknown;
}

/** 螺旋軸上の計算点 */
export interface SpiralPoint {
  /** 所属軸ID */
  axisId: string;

  /** 3次元座標 */
  x: number;
  y: number;
  z: number;

  /** 螺旋パラメータ */
  r: number;
  theta: number;
  s: number;

  /** A(s), B(s) 関数値 */
  A: number;
  B: number;

  /** この点での計算結果 */
  value: unknown;

  /** 領域 */
  regime: SpiralRegime;

  /** 時刻ステップ */
  step: number;
}

/** 軸間の相互作用 */
export interface AxisInteraction {
  /** 相互作用元 */
  sourceAxisId: string;

  /** 相互作用先 */
  targetAxisId: string;

  /** 結合強度 κ */
  kappa: number;

  /** 相互作用の種類 */
  type: 'resonance' | 'modulation' | 'synchronization' | 'interference';
}

/** 多次元螺旋の状態 */
export interface MultiSpiralState {
  /** 総軸数 */
  axisCount: number;

  /** 総計算点数 */
  totalPoints: number;

  /** 各軸の領域分布 */
  regimeDistribution: Record<SpiralRegime, number>;

  /** 相互作用数 */
  interactionCount: number;

  /** 総エネルギー（全軸の展開度合い） */
  totalEnergy: number;

  /** 圧縮率（展開量に対する0₀への圧縮） */
  compressionRatio: number;

  /** 現在のステップ */
  currentStep: number;
}

/** 0₀ 中心からの射影結果 */
export interface ZeroProjectionResult {
  /** 全軸の圧縮像 */
  compressed: unknown;

  /** 各軸の本質（型シグネチャ + ハッシュ） */
  axisEssences: Array<{
    axisId: string;
    regime: SpiralRegime;
    hash: number;
    pointCount: number;
  }>;

  /** 軸間の相互作用マップ */
  interactionMap: unknown;

  /** 復元可能か */
  recoverable: boolean;
}

// ============================================================
// §2 螺旋関数（螺旋数体系理論の核心）
// ============================================================

/**
 * 螺旋関数 A(s, ε) と B(s, ε) の計算
 *
 * 螺旋数体系理論の核心:
 *   τ² = -1 + ε
 *
 *   ε < 1 (楕円): ω = √(1-ε)
 *     A(s) = cos(ω·s),  B(s) = sin(ω·s)/ω
 *
 *   ε = 1 (放物):
 *     A(s) = 1,  B(s) = s
 *
 *   ε > 1 (双曲): κ = √(ε-1)
 *     A(s) = cosh(κ·s),  B(s) = sinh(κ·s)/κ
 */
export function spiralFunctions(s: number, epsilon: number): { A: number; B: number; regime: SpiralRegime } {
  if (epsilon < 1 - 1e-9) {
    // 楕円領域
    const omega = Math.sqrt(1 - epsilon);
    return {
      A: Math.cos(omega * s),
      B: omega > 1e-9 ? Math.sin(omega * s) / omega : s,
      regime: 'elliptic'
    };
  } else if (epsilon > 1 + 1e-9) {
    // 双曲領域
    const kappa = Math.sqrt(epsilon - 1);
    return {
      A: Math.cosh(kappa * s),
      B: kappa > 1e-9 ? Math.sinh(kappa * s) / kappa : s,
      regime: 'hyperbolic'
    };
  } else {
    // 放物領域（臨界点）
    return {
      A: 1,
      B: s,
      regime: 'parabolic'
    };
  }
}

/**
 * 単一螺旋点の3次元座標計算
 *
 * x(t) = r · A(s) · cos(θ)
 * y(t) = r · A(s) · sin(θ)
 * z(t) = r · B(s)
 */
export function spiralPoint3D(r: number, theta: number, s: number, epsilon: number): {
  x: number; y: number; z: number; A: number; B: number; regime: SpiralRegime;
} {
  const { A, B, regime } = spiralFunctions(s, epsilon);
  return {
    x: r * A * Math.cos(theta),
    y: r * A * Math.sin(theta),
    z: r * B,
    A, B, regime
  };
}

// ============================================================
// §3 多次元螺旋計算エンジン
// ============================================================

export class MultiDimensionalSpiral {
  private axes: Map<string, SpiralAxis> = new Map();
  private interactions: AxisInteraction[] = [];
  private history: Map<string, SpiralPoint[]> = new Map();
  private _step: number = 0;

  // ============================================================
  // §3.1 軸の管理
  // ============================================================

  /**
   * 螺旋軸を追加する
   *
   * 0₀ を中心として、新しい計算次元を追加する。
   * 各軸は独立したε値を持ち、異なる計算体制で動作する。
   */
  addAxis(config: {
    id: string;
    name: string;
    epsilon: number;
    sRate?: number;
    thetaRate?: number;
    radius?: number;
    payload?: unknown;
  }): SpiralAxis {
    const axis: SpiralAxis = {
      id: config.id,
      name: config.name,
      epsilon: config.epsilon,
      sRate: config.sRate ?? 0.1,
      thetaRate: config.thetaRate ?? 0.5,
      radius: config.radius ?? 1.0,
      s: 0,
      theta: 0,
      payload: config.payload ?? null
    };

    this.axes.set(axis.id, axis);
    this.history.set(axis.id, []);

    // 既存の全軸との相互作用を自動確立（因陀羅網的）
    for (const [existId, existAxis] of this.axes) {
      if (existId !== axis.id) {
        this.interactions.push({
          sourceAxisId: axis.id,
          targetAxisId: existId,
          kappa: this.computeNaturalCoupling(axis, existAxis),
          type: this.classifyInteraction(axis, existAxis)
        });
      }
    }

    return axis;
  }

  /** 自然結合強度の計算（ε値の近さに基づく） */
  private computeNaturalCoupling(a: SpiralAxis, b: SpiralAxis): number {
    const epsilonDiff = Math.abs(a.epsilon - b.epsilon);
    // ε が近いほど強く結合（共鳴）
    return 1.0 / (1.0 + epsilonDiff);
  }

  /** 相互作用の分類 */
  private classifyInteraction(a: SpiralAxis, b: SpiralAxis): AxisInteraction['type'] {
    const regimeA = spiralFunctions(0, a.epsilon).regime;
    const regimeB = spiralFunctions(0, b.epsilon).regime;

    if (regimeA === regimeB) return 'resonance';        // 同領域: 共鳴
    if (regimeA === 'parabolic' || regimeB === 'parabolic') return 'synchronization'; // 臨界点: 同期
    return 'modulation'; // 異領域: 変調
  }

  /** 軸の取得 */
  getAxis(id: string): SpiralAxis | undefined {
    return this.axes.get(id);
  }

  /** 全軸IDの取得 */
  getAllAxisIds(): string[] {
    return Array.from(this.axes.keys());
  }

  // ============================================================
  // §3.2 同時多発計算（コアエンジン）
  // ============================================================

  /**
   * 1ステップの同時計算
   *
   * 全軸で同時に螺旋計算を進行させる。
   * 0₀ が中心にあり、各軸が独立に螺旋展開しながら、
   * 軸間の相互作用が各軸の進行に影響を与える。
   *
   * これが「中心から多方向へと同時多発計算が始まっていく」の
   * 計算的実装である。
   */
  step(): Map<string, SpiralPoint> {
    this._step++;
    const currentPoints = new Map<string, SpiralPoint>();

    // Phase 1: 各軸の独立計算（同時並行）
    for (const [id, axis] of this.axes) {
      // 螺旋位相と角度を進行
      axis.s += axis.sRate;
      axis.theta += axis.thetaRate;

      // 3D座標の計算
      const point3d = spiralPoint3D(axis.radius, axis.theta, axis.s, axis.epsilon);

      const point: SpiralPoint = {
        axisId: id,
        x: point3d.x,
        y: point3d.y,
        z: point3d.z,
        r: axis.radius,
        theta: axis.theta,
        s: axis.s,
        A: point3d.A,
        B: point3d.B,
        value: this.computeAxisValue(axis, point3d),
        regime: point3d.regime,
        step: this._step
      };

      currentPoints.set(id, point);
      this.history.get(id)!.push(point);
    }

    // Phase 2: 軸間相互作用の適用（因陀羅網的）
    this.applyInteractions(currentPoints);

    return currentPoints;
  }

  /** 軸上の計算値（ペイロードに基づく） */
  private computeAxisValue(axis: SpiralAxis, point3d: { A: number; B: number }): unknown {
    return {
      magnitude: Math.sqrt(point3d.A * point3d.A + point3d.B * point3d.B),
      phase: Math.atan2(point3d.B, point3d.A),
      energy: axis.radius * axis.radius * (point3d.A * point3d.A + point3d.B * point3d.B),
      payload: axis.payload
    };
  }

  /**
   * 軸間相互作用の適用
   *
   * 因陀羅網の原理: 各軸は他の全軸を「映す」。
   * 具体的には、軸Aの計算結果が軸Bの次ステップの
   * パラメータ（radius, sRate, thetaRate）に影響を与える。
   */
  private applyInteractions(currentPoints: Map<string, SpiralPoint>): void {
    for (const interaction of this.interactions) {
      const source = currentPoints.get(interaction.sourceAxisId);
      const target = this.axes.get(interaction.targetAxisId);
      if (!source || !target) continue;

      const κ = interaction.kappa;
      const sourceEnergy = (source.value as any)?.energy ?? 0;

      switch (interaction.type) {
        case 'resonance':
          // 共鳴: 同領域の軸は互いに半径を増幅
          target.radius += κ * 0.001 * sourceEnergy;
          break;
        case 'modulation':
          // 変調: 異領域の軸は回転速度を変調
          target.thetaRate += κ * 0.0001 * Math.sin(source.theta);
          break;
        case 'synchronization':
          // 同期: 臨界点付近の軸は位相を近づける
          const phaseDiff = source.theta - target.theta;
          target.theta += κ * 0.01 * Math.sin(phaseDiff);
          break;
        case 'interference':
          // 干渉: ε値を微修正
          target.epsilon += κ * 0.0001 * (Math.random() - 0.5);
          break;
      }
    }
  }

  /**
   * N ステップの同時計算
   */
  run(steps: number): Map<string, SpiralPoint[]> {
    const results = new Map<string, SpiralPoint[]>();
    for (const id of this.axes.keys()) {
      results.set(id, []);
    }

    for (let i = 0; i < steps; i++) {
      const points = this.step();
      for (const [id, point] of points) {
        results.get(id)!.push(point);
      }
    }

    return results;
  }

  // ============================================================
  // §3.3 0₀ 射影（全軸の圧縮）
  // ============================================================

  /**
   * 0₀ 射影: 全軸の計算結果を一点に凝縮する
   *
   * 「常に圧縮」の原則:
   *   多次元に展開された計算結果を 0₀ に向かって圧縮する。
   *   ブラックホールの降着円盤のように、
   *   外から螺旋的に計算が流入し、中心で情報が凝縮される。
   */
  zeroProjection(): ZeroProjectionResult {
    const axisEssences: ZeroProjectionResult['axisEssences'] = [];

    for (const [id, axis] of this.axes) {
      const points = this.history.get(id) || [];
      const { regime } = spiralFunctions(axis.s, axis.epsilon);

      axisEssences.push({
        axisId: id,
        regime,
        hash: this.hashPoints(points),
        pointCount: points.length
      });
    }

    // 全軸の圧縮像
    const compressed = {
      type: '0₀',
      axisCount: this.axes.size,
      totalSteps: this._step,
      totalPoints: Array.from(this.history.values()).reduce((s, h) => s + h.length, 0),
      interactionCount: this.interactions.length,
      essences: axisEssences,
      self: null as unknown
    };
    compressed.self = compressed;  // 0₀ 自己参照

    return {
      compressed,
      axisEssences,
      interactionMap: this.interactions.map(i => ({
        from: i.sourceAxisId,
        to: i.targetAxisId,
        κ: i.kappa,
        type: i.type
      })),
      recoverable: true
    };
  }

  private hashPoints(points: SpiralPoint[]): number {
    let hash = 0;
    for (const p of points) {
      hash = ((hash << 5) - hash + Math.floor(p.x * 1000)) | 0;
      hash = ((hash << 5) - hash + Math.floor(p.y * 1000)) | 0;
      hash = ((hash << 5) - hash + Math.floor(p.z * 1000)) | 0;
    }
    return Math.abs(hash);
  }

  // ============================================================
  // §3.4 共鳴検出
  // ============================================================

  /**
   * 軸間の共鳴を検出する
   *
   * 異なる軸の計算が「同期」する瞬間を検出。
   * これは因陀羅網の「映り合い」の計算的表現。
   */
  detectResonances(threshold: number = 0.1): Array<{
    axisA: string;
    axisB: string;
    step: number;
    strength: number;
  }> {
    const resonances: Array<{ axisA: string; axisB: string; step: number; strength: number }> = [];
    const ids = Array.from(this.axes.keys());

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const histA = this.history.get(ids[i]) || [];
        const histB = this.history.get(ids[j]) || [];
        const minLen = Math.min(histA.length, histB.length);

        for (let s = 0; s < minLen; s++) {
          const pA = histA[s], pB = histB[s];
          // 位相差が小さい = 共鳴
          const phaseDiff = Math.abs(Math.sin(pA.theta - pB.theta));
          if (phaseDiff < threshold) {
            resonances.push({
              axisA: ids[i],
              axisB: ids[j],
              step: s,
              strength: 1 - phaseDiff / threshold
            });
          }
        }
      }
    }

    return resonances;
  }

  // ============================================================
  // §3.5 状態取得
  // ============================================================

  getState(): MultiSpiralState {
    const regimeDist: Record<SpiralRegime, number> = { elliptic: 0, parabolic: 0, hyperbolic: 0 };
    let totalEnergy = 0;
    let totalPoints = 0;

    for (const [id, axis] of this.axes) {
      const { regime } = spiralFunctions(axis.s, axis.epsilon);
      regimeDist[regime]++;

      const points = this.history.get(id) || [];
      totalPoints += points.length;

      if (points.length > 0) {
        const last = points[points.length - 1];
        totalEnergy += (last.value as any)?.energy ?? 0;
      }
    }

    // 圧縮率: 0₀射影のサイズ / 全履歴のサイズ
    const projSize = this.axes.size * 3; // 各軸の本質 = regime + hash + count
    const histSize = totalPoints * 7;     // 各点 = x,y,z,r,θ,s,value
    const compressionRatio = histSize > 0 ? projSize / histSize : 1;

    return {
      axisCount: this.axes.size,
      totalPoints,
      regimeDistribution: regimeDist,
      interactionCount: this.interactions.length,
      totalEnergy,
      compressionRatio,
      currentStep: this._step
    };
  }

  /** 軸の履歴を取得 */
  getHistory(axisId: string): SpiralPoint[] {
    return this.history.get(axisId) || [];
  }

  /** 全相互作用を取得 */
  getInteractions(): AxisInteraction[] {
    return [...this.interactions];
  }

  /** 現在のステップ */
  getCurrentStep(): number {
    return this._step;
  }
}

// ============================================================
// §4 プリセット: 代表的な多次元螺旋構成
// ============================================================

/**
 * DNA二重螺旋パターン
 * 二本の螺旋軸が反対方向に巻きながら同期する
 */
export function presetDNA(): MultiDimensionalSpiral {
  const spiral = new MultiDimensionalSpiral();
  spiral.addAxis({
    id: 'strand-A', name: 'DNA Strand A',
    epsilon: 0.3, sRate: 0.1, thetaRate: 0.5, radius: 1.0
  });
  spiral.addAxis({
    id: 'strand-B', name: 'DNA Strand B',
    epsilon: 0.3, sRate: 0.1, thetaRate: -0.5, radius: 1.0
  });
  return spiral;
}

/**
 * 銀河渦巻き腕パターン
 * 4本の螺旋腕が中心から放射される
 */
export function presetGalaxy(): MultiDimensionalSpiral {
  const spiral = new MultiDimensionalSpiral();
  for (let i = 0; i < 4; i++) {
    spiral.addAxis({
      id: `arm-${i}`, name: `Galaxy Arm ${i}`,
      epsilon: 0.5 + i * 0.1,
      sRate: 0.08, thetaRate: 0.3,
      radius: 1.0 + i * 0.5
    });
  }
  return spiral;
}

/**
 * Rei 多次元計算パターン
 * 数学・論理・構造・意味の4軸が同時計算
 */
export function presetReiComputation(): MultiDimensionalSpiral {
  const spiral = new MultiDimensionalSpiral();
  spiral.addAxis({
    id: 'math', name: '数学的計算',
    epsilon: 0.2, sRate: 0.1, thetaRate: 0.5, radius: 1.0,
    payload: { domain: 'mathematics', operation: 'generation' }
  });
  spiral.addAxis({
    id: 'logic', name: '論理的計算',
    epsilon: 0.8, sRate: 0.12, thetaRate: 0.4, radius: 1.2,
    payload: { domain: 'logic', operation: 'proof' }
  });
  spiral.addAxis({
    id: 'structure', name: '構造的計算',
    epsilon: 1.0, sRate: 0.08, thetaRate: 0.6, radius: 0.8,
    payload: { domain: 'structure', operation: 'type-building' }
  });
  spiral.addAxis({
    id: 'meaning', name: '意味的計算',
    epsilon: 1.5, sRate: 0.15, thetaRate: 0.35, radius: 1.5,
    payload: { domain: 'semantics', operation: 'interpretation' }
  });
  return spiral;
}

/**
 * 十二因縁螺旋パターン
 * 12の因縁が螺旋的に円環する
 */
export function presetNidanas(): MultiDimensionalSpiral {
  const spiral = new MultiDimensionalSpiral();
  const nidanas = [
    { id: 'avijja', name: '無明', epsilon: 0.0 },
    { id: 'sankhara', name: '行', epsilon: 0.1 },
    { id: 'vinnana', name: '識', epsilon: 0.2 },
    { id: 'namarupa', name: '名色', epsilon: 0.3 },
    { id: 'salayatana', name: '六処', epsilon: 0.5 },
    { id: 'phassa', name: '触', epsilon: 0.7 },
    { id: 'vedana', name: '受', epsilon: 0.8 },
    { id: 'tanha', name: '愛', epsilon: 1.0 },
    { id: 'upadana', name: '取', epsilon: 1.2 },
    { id: 'bhava', name: '有', epsilon: 1.5 },
    { id: 'jati', name: '生', epsilon: 1.8 },
    { id: 'jaramarana', name: '老死', epsilon: 2.0 }
  ];

  for (const n of nidanas) {
    spiral.addAxis({
      id: n.id, name: n.name,
      epsilon: n.epsilon,
      sRate: 0.05, thetaRate: 0.3, radius: 1.0,
      payload: { nidana: n.name }
    });
  }
  return spiral;
}

// ============================================================
// §5 テスト
// ============================================================

export function runMultiSpiralTests(): {
  passed: number;
  failed: number;
  results: string[];
} {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string): void {
    if (condition) {
      passed++;
      results.push(`  ✓ ${name}`);
    } else {
      failed++;
      results.push(`  ✗ ${name}`);
    }
  }

  // --- §5.1 螺旋関数テスト ---
  results.push('\n§5.1 Spiral Functions (螺旋関数)');
  {
    // 楕円領域
    const e1 = spiralFunctions(0, 0.5);
    assert(e1.regime === 'elliptic', 'ε=0.5 → elliptic');
    assert(Math.abs(e1.A - 1) < 0.01, 'A(0) ≈ 1 for elliptic');
    assert(Math.abs(e1.B) < 0.01, 'B(0) ≈ 0 for elliptic');

    // 放物領域
    const e2 = spiralFunctions(0, 1.0);
    assert(e2.regime === 'parabolic', 'ε=1.0 → parabolic');
    assert(e2.A === 1, 'A(0) = 1 for parabolic');
    assert(e2.B === 0, 'B(0) = 0 for parabolic');

    // 双曲領域
    const e3 = spiralFunctions(0, 2.0);
    assert(e3.regime === 'hyperbolic', 'ε=2.0 → hyperbolic');
    assert(Math.abs(e3.A - 1) < 0.01, 'A(0) ≈ 1 for hyperbolic');

    // 放物領域でs>0
    const e4 = spiralFunctions(2, 1.0);
    assert(e4.A === 1, 'A(s) = 1 always for parabolic');
    assert(e4.B === 2, 'B(s) = s for parabolic');

    // 双曲領域の指数的成長
    const e5 = spiralFunctions(3, 3.0);
    assert(e5.A > 1, 'A grows in hyperbolic');
    assert(e5.B > 0, 'B > 0 for s > 0 in hyperbolic');
  }

  // --- §5.2 3D座標テスト ---
  results.push('\n§5.2 3D Coordinates (3D座標)');
  {
    const p = spiralPoint3D(1, 0, 0, 0.5);
    assert(Math.abs(p.x - 1) < 0.01, 'x(r=1, θ=0, s=0) ≈ 1');
    assert(Math.abs(p.y) < 0.01, 'y(r=1, θ=0, s=0) ≈ 0');
    assert(Math.abs(p.z) < 0.01, 'z(r=1, θ=0, s=0) ≈ 0');

    const p2 = spiralPoint3D(1, Math.PI / 2, 0, 0.5);
    assert(Math.abs(p2.x) < 0.01, 'x(θ=π/2) ≈ 0');
    assert(Math.abs(p2.y - 1) < 0.01, 'y(θ=π/2) ≈ 1');
  }

  // --- §5.3 多軸同時計算テスト ---
  results.push('\n§5.3 Multi-Axis Simultaneous Computation (多軸同時計算)');
  {
    const spiral = new MultiDimensionalSpiral();
    spiral.addAxis({ id: 'a', name: 'Axis A', epsilon: 0.3 });
    spiral.addAxis({ id: 'b', name: 'Axis B', epsilon: 1.5 });

    const points = spiral.step();
    assert(points.size === 2, 'two axes computed simultaneously');
    assert(points.has('a'), 'axis A has result');
    assert(points.has('b'), 'axis B has result');

    const pa = points.get('a')!;
    const pb = points.get('b')!;
    assert(pa.regime === 'elliptic', 'axis A is elliptic');
    assert(pb.regime === 'hyperbolic', 'axis B is hyperbolic');
    assert(pa.step === pb.step, 'same step number (simultaneous)');
  }

  // --- §5.4 軸間相互作用テスト ---
  results.push('\n§5.4 Axis Interactions (軸間相互作用)');
  {
    const spiral = new MultiDimensionalSpiral();
    spiral.addAxis({ id: 'x', name: 'X', epsilon: 0.5 });
    spiral.addAxis({ id: 'y', name: 'Y', epsilon: 0.5 });
    spiral.addAxis({ id: 'z', name: 'Z', epsilon: 2.0 });

    const interactions = spiral.getInteractions();
    assert(interactions.length > 0, 'interactions auto-established');

    // 同領域の軸は共鳴
    const xyInteraction = interactions.find(
      i => (i.sourceAxisId === 'y' && i.targetAxisId === 'x') ||
           (i.sourceAxisId === 'x' && i.targetAxisId === 'y')
    );
    if (xyInteraction) {
      assert(xyInteraction.type === 'resonance', 'same regime → resonance');
    }

    // 異領域の軸は変調
    const xzInteraction = interactions.find(
      i => (i.sourceAxisId === 'z' && i.targetAxisId === 'x') ||
           (i.sourceAxisId === 'x' && i.targetAxisId === 'z')
    );
    if (xzInteraction) {
      assert(xzInteraction.type === 'modulation', 'different regime → modulation');
    }
  }

  // --- §5.5 複数ステップ実行テスト ---
  results.push('\n§5.5 Multi-Step Execution (複数ステップ)');
  {
    const spiral = new MultiDimensionalSpiral();
    spiral.addAxis({ id: 'a', name: 'A', epsilon: 0.5 });
    spiral.addAxis({ id: 'b', name: 'B', epsilon: 1.0 });

    const results_run = spiral.run(100);
    assert(results_run.get('a')!.length === 100, 'axis A: 100 points computed');
    assert(results_run.get('b')!.length === 100, 'axis B: 100 points computed');
    assert(spiral.getCurrentStep() === 100, 'current step is 100');
  }

  // --- §5.6 0₀ 射影テスト ---
  results.push('\n§5.6 0₀ Projection (中心への圧縮)');
  {
    const spiral = presetReiComputation();
    spiral.run(50);

    const proj = spiral.zeroProjection();
    assert(proj.axisEssences.length === 4, '4 axis essences');
    assert((proj.compressed as any).type === '0₀', 'projection is 0₀ type');
    assert((proj.compressed as any).self === proj.compressed, '0₀ self-reference');
    assert(proj.recoverable === true, 'recoverable');
  }

  // --- §5.7 領域遷移テスト ---
  results.push('\n§5.7 Regime Transitions (領域遷移)');
  {
    // ε を連続的に変化させて遷移を確認
    const regimes: SpiralRegime[] = [];
    for (let eps = 0; eps <= 2; eps += 0.5) {
      regimes.push(spiralFunctions(1, eps).regime);
    }
    assert(regimes[0] === 'elliptic', 'ε=0 → elliptic');
    assert(regimes[2] === 'parabolic', 'ε=1 → parabolic');
    assert(regimes[4] === 'hyperbolic', 'ε=2 → hyperbolic');
    assert(regimes.includes('elliptic') && regimes.includes('hyperbolic'),
      'continuous transition across regimes');
  }

  // --- §5.8 共鳴検出テスト ---
  results.push('\n§5.8 Resonance Detection (共鳴検出)');
  {
    const spiral = new MultiDimensionalSpiral();
    // 同じ角速度 → 共鳴しやすい
    spiral.addAxis({ id: 'r1', name: 'R1', epsilon: 0.3, thetaRate: 0.5 });
    spiral.addAxis({ id: 'r2', name: 'R2', epsilon: 0.4, thetaRate: 0.5 });
    spiral.run(50);

    const resonances = spiral.detectResonances(0.3);
    assert(resonances.length > 0, 'resonances detected for similar axes');
  }

  // --- §5.9 プリセットテスト ---
  results.push('\n§5.9 Presets (プリセット)');
  {
    const dna = presetDNA();
    assert(dna.getAllAxisIds().length === 2, 'DNA: 2 strands');

    const galaxy = presetGalaxy();
    assert(galaxy.getAllAxisIds().length === 4, 'Galaxy: 4 arms');

    const rei = presetReiComputation();
    assert(rei.getAllAxisIds().length === 4, 'Rei: 4 computation axes');

    const nidanas = presetNidanas();
    assert(nidanas.getAllAxisIds().length === 12, 'Nidanas: 12 axes');
  }

  // --- §5.10 圧縮率テスト ---
  results.push('\n§5.10 Compression Ratio (圧縮率)');
  {
    const spiral = presetGalaxy();
    spiral.run(200);

    const state = spiral.getState();
    assert(state.totalPoints === 200 * 4, '800 total points');
    assert(state.compressionRatio < 1, 'compression ratio < 1');
    assert(state.compressionRatio > 0, 'compression ratio > 0');

    // 計算量が増えるほど圧縮が効く
    spiral.run(200);
    const state2 = spiral.getState();
    assert(state2.compressionRatio < state.compressionRatio,
      'more computation → better compression ratio');
  }

  // --- §5.11 状態テスト ---
  results.push('\n§5.11 State (状態)');
  {
    const spiral = presetReiComputation();
    spiral.run(10);

    const state = spiral.getState();
    assert(state.axisCount === 4, '4 axes');
    assert(state.totalPoints === 40, '40 total points');
    assert(state.interactionCount > 0, 'interactions exist');
    assert(state.totalEnergy > 0, 'positive energy');
    assert(state.currentStep === 10, 'step 10');

    // 領域分布: 楕円2 + 放物1 + 双曲1
    assert(state.regimeDistribution.elliptic >= 1, 'has elliptic axes');
    assert(state.regimeDistribution.hyperbolic >= 1, 'has hyperbolic axes');
  }

  // --- 結果サマリー ---
  results.push(`\n━━━ Total: ${passed} passed, ${failed} failed ━━━`);
  return { passed, failed, results };
}
