/**
 * black-hole.ts — Rei言語 Phase 8 拡張: ブラックホール情報重力場
 *
 * ブラックホールの物理的特性を計算パターンとして実装する。
 * 0₀（拡張ゼロ）が特異点に対応し、中心-周縁パターンの
 * 極限的事例としてブラックホールを位置づける。
 *
 * 物理的対応:
 *   特異点        → 0₀（自己参照的原点）
 *   事象の地平面  → スコープ境界（情報の一方向性）
 *   ホーキング放射 → 変換的情報漏出
 *   重力レンズ    → 近傍計算への影響関数
 *   潮汐力        → 情報の引き伸ばし・圧縮
 *   情報パラドックス → 吸収情報の保存と変換
 *
 * @module black-hole
 * @author 藤本伸樹 (Nobuki Fujimoto)
 * @since Phase 8a+
 */

// ============================================================
// §1 型定義
// ============================================================

/** 情報量子 — ブラックホールが扱う最小情報単位 */
export interface InfoQuanta {
  id: string;
  content: unknown;
  mass: number;         // 情報の「質量」（複雑度）
  timestamp: number;
}

/** ホーキング放射粒子 — 変換されて放出される情報 */
export interface HawkingRadiation {
  originalId: string;   // 元の情報のID（追跡用）
  transformed: unknown; // 変換後の内容（元の形ではない）
  energy: number;       // 放射エネルギー
  wavelength: number;   // 放射の波長（変換の度合い）
}

/** 重力レンズ効果の結果 */
export interface LensedInfo {
  original: unknown;
  lensed: unknown;
  distortion: number;   // 歪みの度合い (0-1)
  angle: number;        // 観測角度
}

/** ブラックホールの状態 */
export interface BlackHoleState {
  mass: number;                      // 総質量
  radius: number;                    // シュヴァルツシルト半径
  temperature: number;               // ホーキング温度（質量に反比例）
  entropy: number;                   // ベッケンシュタイン=ホーキングエントロピー
  absorbedCount: number;             // 吸収した情報量子の数
  radiatedCount: number;             // 放射した量子の数
  age: number;                       // 経過ステップ数
  alive: boolean;                    // 蒸発していないか
}

/** 重力場の影響を受ける周辺エンティティ */
export interface OrbitingEntity {
  id: string;
  content: unknown;
  distance: number;     // ブラックホールからの距離
  velocity: number;     // 軌道速度
}

// ============================================================
// §2 定数（物理定数の計算的類似物）
// ============================================================

/** 計算的シュヴァルツシルト定数: 半径 = SCHWARZ_K * mass */
const SCHWARZ_K = 0.01;

/** 計算的ホーキング温度定数: temp = HAWKING_K / mass */
const HAWKING_K = 1.0;

/** 計算的エントロピー定数: entropy = ENTROPY_K * radius^2 */
const ENTROPY_K = Math.PI * 4;

/** ホーキング放射確率の基本値 */
const RADIATION_BASE_PROB = 0.1;

/** 最小質量（これ以下で蒸発完了） */
const MIN_MASS = 0.001;

// ============================================================
// §3 BlackHole クラス
// ============================================================

export class BlackHole {
  // --- 内部状態 ---
  private singularity: unknown = undefined;  // 0₀: 特異点
  private absorbed: Map<string, InfoQuanta> = new Map();
  private _mass: number = 0;
  private _age: number = 0;
  private _radiatedCount: number = 0;
  private _alive: boolean = true;
  private radiationLog: HawkingRadiation[] = [];

  /**
   * ブラックホールの生成
   * genesis.ts の void → 0₀ に対応:
   * 初期質量（情報の種）から特異点が形成される
   */
  constructor(private initialMass: number = 1.0) {
    this._mass = initialMass;
    // 特異点 = 0₀ の自己参照
    this.singularity = { ref: () => this.singularity };
  }

  // ============================================================
  // §3.1 事象の地平面 — 情報の一方向的吸収
  // ============================================================

  /**
   * 情報量子を吸収する（事象の地平面を越える）
   * 一度吸収された情報は元の形では取り出せない。
   * これがブラックホールの「一方向性」の計算的表現。
   */
  absorb(quanta: InfoQuanta): boolean {
    if (!this._alive) return false;

    // 事象の地平面の判定: 質量（複雑度）が十分なら吸収
    const escapeVelocity = this.getEscapeVelocity(quanta.mass);
    if (escapeVelocity >= 1.0) {
      // 情報は特異点に凝縮される
      this.absorbed.set(quanta.id, quanta);
      this._mass += quanta.mass;

      // 特異点の更新: 全情報が一点に折り畳まれる
      this.collapseSingularity();
      return true;
    }
    return false;
  }

  /**
   * 脱出速度の計算
   * v_escape = sqrt(2 * G * M / r) の計算的類似物
   */
  private getEscapeVelocity(infoMass: number): number {
    if (this._mass === 0) return 0;
    return Math.min(1.0, (this._mass / (this._mass + infoMass)));
  }

  /**
   * 特異点への崩壊
   * 全吸収情報を一つの自己参照的構造に凝縮する。
   * これが 0₀ の計算的意味: 全情報が一点で自己参照する。
   */
  private collapseSingularity(): void {
    const allInfo = Array.from(this.absorbed.values());
    this.singularity = {
      density: allInfo.length,
      compressed: this.compress(allInfo),
      ref: () => this.singularity  // 自己参照: 0₀
    };
  }

  /**
   * 情報圧縮（特異点内部での処理）
   * 個々の情報は区別を失い、統計的性質のみが保存される。
   */
  private compress(quanta: InfoQuanta[]): object {
    const totalMass = quanta.reduce((s, q) => s + q.mass, 0);
    const types = new Set(quanta.map(q => typeof q.content));
    return {
      count: quanta.length,
      totalMass,
      typeSignature: Array.from(types).sort().join('|'),
      hash: this.hashContents(quanta)
    };
  }

  /** 内容のハッシュ: 元の情報は復元不可能だが痕跡は残る */
  private hashContents(quanta: InfoQuanta[]): number {
    let hash = 0;
    for (const q of quanta) {
      const str = JSON.stringify(q.content);
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
      }
    }
    return Math.abs(hash);
  }

  // ============================================================
  // §3.2 ホーキング放射 — 変換的情報漏出
  // ============================================================

  /**
   * ホーキング放射のステップ
   * 量子効果により、ブラックホールは微量の情報を放射する。
   * ただし放射される情報は元の形ではない（情報パラドックス）。
   *
   * 物理的対応:
   *   温度 ∝ 1/M → 小さいBHほど高温で速く蒸発
   *   放射は熱的 → 元の情報の直接的復元は不可能
   */
  radiate(): HawkingRadiation | null {
    if (!this._alive || this._mass <= MIN_MASS) {
      this._alive = false;
      return null;
    }

    const temperature = this.getTemperature();
    const prob = RADIATION_BASE_PROB * temperature;

    // 確率的放射（量子効果の模倣）
    if (Math.random() < prob) {
      const radiation = this.emitRadiation(temperature);
      this._mass -= radiation.energy;
      this._radiatedCount++;
      this.radiationLog.push(radiation);

      // 蒸発チェック
      if (this._mass <= MIN_MASS) {
        this._alive = false;
      }

      return radiation;
    }

    return null;
  }

  /** 放射粒子の生成 */
  private emitRadiation(temperature: number): HawkingRadiation {
    // 最も古い吸収情報から「痕跡」を放射
    const entries = Array.from(this.absorbed.entries());
    const sourceEntry = entries.length > 0 ? entries[0] : null;

    const energy = Math.min(this._mass * 0.01, temperature * 0.1);

    if (sourceEntry) {
      const [id, quanta] = sourceEntry;
      // 情報は変換される: 元の内容は復元不可能
      return {
        originalId: id,
        transformed: this.transformContent(quanta.content, temperature),
        energy,
        wavelength: 1.0 / temperature
      };
    }

    // 真空放射（吸収情報がない場合）
    return {
      originalId: '__vacuum__',
      transformed: { noise: Math.random(), temperature },
      energy,
      wavelength: 1.0 / temperature
    };
  }

  /**
   * 情報の変換（情報パラドックスの計算的表現）
   * 元の情報は「形を変えて」放射される。
   * 完全な復元は不可能だが、統計的性質は保存される。
   */
  private transformContent(content: unknown, temperature: number): unknown {
    const str = JSON.stringify(content);
    // 高温ほど変換が激しい
    const scrambleDepth = Math.ceil(temperature * 3);
    let result = str;
    for (let i = 0; i < scrambleDepth; i++) {
      result = btoa(result).slice(0, str.length);
    }
    return {
      echo: result,
      entropy: str.length,
      fidelity: 1.0 / (1.0 + temperature)  // 低温ほど元に近い
    };
  }

  // ============================================================
  // §3.3 重力レンズ — 近傍情報への影響
  // ============================================================

  /**
   * 重力レンズ効果
   * ブラックホール近傍を通過する情報が「歪む」。
   * 中心-周縁パターンの「周縁」に対する中心の影響力。
   *
   * @param info - 通過する情報
   * @param distance - ブラックホールからの距離
   * @param angle - 観測角度 (radians)
   */
  gravitationalLens(info: unknown, distance: number, angle: number = 0): LensedInfo {
    if (!this._alive || distance <= 0) {
      return { original: info, lensed: info, distortion: distance <= 0 ? 1 : 0, angle };
    }

    // 歪みの強さ: mass / distance² （逆二乗則）
    const distortion = Math.min(1.0, this._mass / (distance * distance));

    // アインシュタインリング効果: 角度による変調
    const ringFactor = 1.0 + 0.5 * Math.sin(angle * 2);

    const lensed = this.distortInfo(info, distortion * ringFactor);

    return {
      original: info,
      lensed,
      distortion: distortion * ringFactor,
      angle
    };
  }

  /** 情報の歪み処理 */
  private distortInfo(info: unknown, distortion: number): unknown {
    if (typeof info === 'number') {
      // 数値: 重力赤方偏移
      return info * (1 - distortion * 0.5);
    }
    if (typeof info === 'string') {
      // 文字列: 時空の歪みによる遅延効果
      const delay = Math.floor(info.length * distortion);
      return info.slice(delay) + info.slice(0, delay);
    }
    if (Array.isArray(info)) {
      // 配列: 潮汐力によるスパゲッティ化（引き伸ばし）
      return this.spaghettify(info, distortion);
    }
    if (typeof info === 'object' && info !== null) {
      // オブジェクト: フレームドラッギング（構造の回転）
      return this.frameDrag(info as Record<string, unknown>, distortion);
    }
    return info;
  }

  /**
   * スパゲッティ化（潮汐力効果）
   * 配列要素間の「距離」が引き伸ばされる
   */
  private spaghettify(arr: unknown[], distortion: number): unknown[] {
    if (arr.length <= 1) return arr;
    const result: unknown[] = [];
    for (let i = 0; i < arr.length; i++) {
      result.push(arr[i]);
      // 潮汐力: 要素間に「引き伸ばし」を挿入
      const gaps = Math.floor(distortion * 2);
      for (let g = 0; g < gaps; g++) {
        result.push(null); // 潮汐的空隙
      }
    }
    return result;
  }

  /**
   * フレームドラッギング（慣性系の引きずり）
   * 回転するブラックホールが周囲の時空を引きずる効果。
   * オブジェクトのキーの順序が「回転」する。
   */
  private frameDrag(obj: Record<string, unknown>, distortion: number): Record<string, unknown> {
    const keys = Object.keys(obj);
    const shift = Math.floor(keys.length * distortion);
    const rotatedKeys = [...keys.slice(shift), ...keys.slice(0, shift)];
    const result: Record<string, unknown> = {};
    rotatedKeys.forEach((key, i) => {
      result[key] = obj[keys[i]];
    });
    return result;
  }

  // ============================================================
  // §3.4 時間膨張 — 事象の地平面近傍の計算遅延
  // ============================================================

  /**
   * 重力による時間膨張
   * ブラックホールに近いほど「計算時間が遅くなる」。
   * t_observed = t_proper / sqrt(1 - rs/r)
   *
   * @param properTime - 固有時間（ステップ数）
   * @param distance - ブラックホールからの距離
   * @returns 外部観測者から見た時間
   */
  timeDilation(properTime: number, distance: number): number {
    const rs = this.getSchwarzschildRadius();
    if (distance <= rs) return Infinity;  // 事象の地平面内部: 時間停止
    return properTime / Math.sqrt(1 - rs / distance);
  }

  // ============================================================
  // §3.5 ステップ進行
  // ============================================================

  /**
   * 1ステップ進行
   * 各ステップでホーキング放射を試行し、状態を更新する。
   */
  step(): { radiation: HawkingRadiation | null; state: BlackHoleState } {
    this._age++;
    const radiation = this.radiate();
    return { radiation, state: this.getState() };
  }

  // ============================================================
  // §3.6 状態取得
  // ============================================================

  getState(): BlackHoleState {
    return {
      mass: this._mass,
      radius: this.getSchwarzschildRadius(),
      temperature: this.getTemperature(),
      entropy: this.getEntropy(),
      absorbedCount: this.absorbed.size,
      radiatedCount: this._radiatedCount,
      age: this._age,
      alive: this._alive
    };
  }

  getSchwarzschildRadius(): number {
    return SCHWARZ_K * this._mass;
  }

  getTemperature(): number {
    if (this._mass <= 0) return Infinity;
    return HAWKING_K / this._mass;
  }

  getEntropy(): number {
    const r = this.getSchwarzschildRadius();
    return ENTROPY_K * r * r;
  }

  getSingularity(): unknown {
    return this.singularity;
  }

  getRadiationLog(): HawkingRadiation[] {
    return [...this.radiationLog];
  }

  isAlive(): boolean {
    return this._alive;
  }

  // ============================================================
  // §3.7 十二因縁との接続: 円環的再生
  // ============================================================

  /**
   * 蒸発完了後の「再生」
   * ブラックホールが完全に蒸発した後、放射の残留情報から
   * 新たなブラックホールが生成される可能性。
   *
   * これは十二因縁の「老死 → 無明」の円環に対応する:
   *   simulateDeath (蒸発) → genesis void (新たな無明)
   *
   * @returns 新たなブラックホール（残留エネルギーから生成）、
   *          または null（完全消滅）
   */
  reincarnate(): BlackHole | null {
    if (this._alive) return null;  // まだ蒸発していない

    // 残留エネルギー: 放射の総エネルギーの微小割合
    const residualEnergy = this.radiationLog
      .reduce((sum, r) => sum + r.energy, 0) * 0.01;

    if (residualEnergy > MIN_MASS) {
      // 円環: 蒸発 → void → 新たな特異点
      const newBH = new BlackHole(residualEnergy);
      return newBH;
    }

    return null;  // 完全消滅: 円環の解脱（涅槃）
  }
}

// ============================================================
// §4 ブラックホール連星系 — 情報の重力的相互作用
// ============================================================

/**
 * 二つのブラックホールの合体（merger）
 * LIGO/Virgoが観測した重力波イベントの計算的類似物。
 * 二つの情報重力場が融合し、より大きな構造を形成する。
 */
export function mergeBlackHoles(a: BlackHole, b: BlackHole): BlackHole {
  const stateA = a.getState();
  const stateB = b.getState();

  // 合体: 質量の和（重力波による損失を差し引く）
  const gravitationalWaveLoss = (stateA.mass + stateB.mass) * 0.05;
  const mergedMass = stateA.mass + stateB.mass - gravitationalWaveLoss;

  return new BlackHole(mergedMass);
}

// ============================================================
// §5 テスト
// ============================================================

export function runBlackHoleTests(): { passed: number; failed: number; results: string[] } {
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

  // --- §5.1 生成テスト ---
  results.push('\n§5.1 BlackHole Generation (特異点生成)');
  {
    const bh = new BlackHole(10);
    const state = bh.getState();
    assert(state.mass === 10, 'initial mass is set');
    assert(state.alive === true, 'black hole is alive');
    assert(state.radius === SCHWARZ_K * 10, 'Schwarzschild radius = K * mass');
    assert(state.temperature === HAWKING_K / 10, 'Hawking temperature = K / mass');
    assert(state.entropy > 0, 'entropy is positive');
    assert(state.absorbedCount === 0, 'no absorbed quanta initially');
    assert(bh.getSingularity() !== undefined, 'singularity exists (0₀)');
  }

  // --- §5.2 吸収テスト ---
  results.push('\n§5.2 Absorption (事象の地平面)');
  {
    const bh = new BlackHole(10);
    const quanta: InfoQuanta = { id: 'q1', content: 'hello', mass: 1.0, timestamp: Date.now() };
    const absorbed = bh.absorb(quanta);
    assert(absorbed === true, 'quanta absorbed successfully');

    const state = bh.getState();
    assert(state.mass === 11, 'mass increased after absorption');
    assert(state.absorbedCount === 1, 'absorbed count is 1');

    // 同じ情報を再吸収
    const quanta2: InfoQuanta = { id: 'q2', content: { data: [1, 2, 3] }, mass: 2.0, timestamp: Date.now() };
    bh.absorb(quanta2);
    assert(bh.getState().mass === 13, 'mass after second absorption');
    assert(bh.getState().absorbedCount === 2, 'absorbed count is 2');
  }

  // --- §5.3 ホーキング放射テスト ---
  results.push('\n§5.3 Hawking Radiation (ホーキング放射)');
  {
    // 小さいBH（高温）は頻繁に放射する
    const smallBH = new BlackHole(0.1);
    let radiated = false;
    for (let i = 0; i < 100; i++) {
      const r = smallBH.radiate();
      if (r !== null) { radiated = true; break; }
    }
    assert(radiated, 'small BH radiates (high temperature)');

    // 大きいBHは放射しにくい
    const largeBH = new BlackHole(1000);
    let largeRadiated = 0;
    for (let i = 0; i < 100; i++) {
      if (largeBH.radiate() !== null) largeRadiated++;
    }
    assert(largeRadiated < 50, 'large BH radiates less frequently');
  }

  // --- §5.4 蒸発テスト ---
  results.push('\n§5.4 Evaporation (蒸発)');
  {
    const tinyBH = new BlackHole(0.01);
    let steps = 0;
    while (tinyBH.isAlive() && steps < 10000) {
      tinyBH.step();
      steps++;
    }
    assert(!tinyBH.isAlive(), 'tiny BH evaporates');
    assert(steps < 10000, 'evaporation completes in finite steps');
  }

  // --- §5.5 重力レンズテスト ---
  results.push('\n§5.5 Gravitational Lensing (重力レンズ)');
  {
    const bh = new BlackHole(10);

    // 数値の赤方偏移
    const numLens = bh.gravitationalLens(100, 3);
    assert(numLens.distortion > 0, 'number is distorted');
    assert((numLens.lensed as number) < 100, 'number shows redshift');

    // 遠距離: 歪みは小さい
    const farLens = bh.gravitationalLens(100, 100);
    assert(farLens.distortion < numLens.distortion, 'far distance = less distortion');

    // 配列のスパゲッティ化
    const arrLens = bh.gravitationalLens([1, 2, 3], 2);
    assert(Array.isArray(arrLens.lensed), 'array is still array');
    assert((arrLens.lensed as unknown[]).length >= 3, 'spaghettified array is longer or equal');

    // 文字列の歪み
    const strLens = bh.gravitationalLens('abcdef', 3);
    assert(typeof strLens.lensed === 'string', 'string remains string');
  }

  // --- §5.6 時間膨張テスト ---
  results.push('\n§5.6 Time Dilation (時間膨張)');
  {
    const bh = new BlackHole(10);
    const rs = bh.getSchwarzschildRadius();

    // 遠距離: 膨張は小さい
    const farTime = bh.timeDilation(1, rs * 100);
    assert(farTime > 1, 'time dilated at distance');
    assert(farTime < 1.1, 'far distance: small dilation');

    // 近距離: 膨張は大きい
    const nearTime = bh.timeDilation(1, rs * 1.1);
    assert(nearTime > farTime, 'closer = more dilation');

    // 事象の地平面内: 無限大
    const insideTime = bh.timeDilation(1, rs * 0.5);
    assert(insideTime === Infinity, 'inside event horizon: infinite dilation');
  }

  // --- §5.7 円環的再生テスト（十二因縁） ---
  results.push('\n§5.7 Reincarnation (十二因縁: 老死→無明)');
  {
    const bh = new BlackHole(0.05);
    // 情報を吸収させてから蒸発させる
    bh.absorb({ id: 'soul1', content: 'karma', mass: 0.01, timestamp: Date.now() });

    while (bh.isAlive()) {
      bh.step();
    }

    const reborn = bh.reincarnate();
    // 再生の可能性（残留エネルギー次第）
    assert(!bh.isAlive(), 'original BH has evaporated');
    // reborn は null か 新しいBH のどちらか
    if (reborn !== null) {
      assert(reborn.isAlive(), 'reincarnated BH is alive');
      assert(reborn.getState().mass > 0, 'reincarnated BH has mass');
    } else {
      assert(true, 'complete dissolution (涅槃)');
    }
  }

  // --- §5.8 連星合体テスト ---
  results.push('\n§5.8 Binary Merger (連星合体)');
  {
    const bh1 = new BlackHole(10);
    const bh2 = new BlackHole(15);
    const merged = mergeBlackHoles(bh1, bh2);
    const state = merged.getState();

    assert(state.mass > 20, 'merged mass > individual masses minus GW loss');
    assert(state.mass < 25, 'gravitational wave loss occurred');
    assert(state.alive, 'merged BH is alive');
  }

  // --- §5.9 情報パラドックステスト ---
  results.push('\n§5.9 Information Paradox (情報パラドックス)');
  {
    const bh = new BlackHole(1);
    const original: InfoQuanta = {
      id: 'secret',
      content: { password: '12345', data: 'classified' },
      mass: 0.1,
      timestamp: Date.now()
    };

    bh.absorb(original);

    // 放射を集める
    const radiations: HawkingRadiation[] = [];
    for (let i = 0; i < 1000; i++) {
      const r = bh.radiate();
      if (r !== null) radiations.push(r);
    }

    if (radiations.length > 0) {
      const first = radiations[0];
      // 放射された情報は元の形ではない
      assert(
        JSON.stringify(first.transformed) !== JSON.stringify(original.content),
        'radiated info ≠ original (information paradox)'
      );
      // しかしIDの痕跡は残る
      assert(first.originalId === 'secret', 'original ID trace preserved');
    } else {
      assert(true, 'no radiation yet (large BH)');
    }
  }

  // --- §5.10 エントロピー面積法則テスト ---
  results.push('\n§5.10 Bekenstein-Hawking Entropy (エントロピー面積法則)');
  {
    const bh1 = new BlackHole(5);
    const bh2 = new BlackHole(10);

    const e1 = bh1.getEntropy();
    const e2 = bh2.getEntropy();

    // エントロピーは質量の2乗に比例（面積法則）
    assert(e2 > e1, 'larger BH has more entropy');

    const ratio = e2 / e1;
    const expectedRatio = 4; // (10/5)^2 = 4
    assert(Math.abs(ratio - expectedRatio) < 0.01, 'entropy ∝ mass² (area law)');
  }

  // --- 結果サマリー ---
  results.push(`\n━━━ Total: ${passed} passed, ${failed} failed ━━━`);
  return { passed, failed, results };
}
