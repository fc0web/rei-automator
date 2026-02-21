# Rei Standard Library — Tier 1 Module Design

**Category B: Standard Library Modules**  
**Author:** Nobuki Fujimoto  
**Date:** 2026-02-10  
**Modules:** `field`, `symmetry`, `unified`

---

## Module 1: `import field` — 情報場数学理論

### 概要

多次元数の8近傍構造を連続場（field）として解釈し、
微分幾何学的な演算（勾配・発散・回転・ラプラシアン）を提供する。

Reiの `𝕄{c; n₁,...,n₈}` は離散化された場の1点であり、
`field` モジュールはその場全体を操作する道具を与える。

### 数学的基盤

**スカラー場** F: ℤ² → ℝ  
各格子点 (i,j) に多次元数 𝕄{c; n₁,...,n₈} が配置される。

**勾配 (gradient)**:
```
∇F(i,j) = (∂F/∂x, ∂F/∂y)
         ≈ ((n_E - n_W) / 2, (n_N - n_S) / 2)
```
- 8近傍の対向差分で近似
- 結果は2成分ベクトル（方向と大きさ）

**発散 (divergence)**:
```
div F(i,j) = ∂Fx/∂x + ∂Fy/∂y
           ≈ (n_E - 2c + n_W) / 1 + (n_N - 2c + n_S) / 1
```
- 正 = 湧き出し（center < neighbors平均）
- 負 = 吸い込み（center > neighbors平均）
- 0 = 平衡

**回転 (curl)**:
```
curl F(i,j) = ∂Fy/∂x - ∂Fx/∂y
            ≈ Σ(n_i × sign_i) / N  （循環成分）
```
- 8近傍を巡回したときの正味の回転量
- 正 = 反時計回り、負 = 時計回り

**ラプラシアン (laplacian)**:
```
∇²F(i,j) = Σ(n_i - c) / N
          = mean(neighbors) - center
```
- Reiの `compute :weighted` と本質的に同一
- 拡散方程式の離散化核

**場のエネルギー**:
```
E(F) = Σ_all_points |∇F|²
```
- 場全体の「変動の激しさ」を測る汎関数

### Rei構文例

```rei
import field

let grid = createGrid(100, 100, init: :random)

// 各点の勾配を計算
let grad = grid |> field.gradient
grad[50][50].magnitude  // → 勾配の大きさ
grad[50][50].direction  // → 勾配の方向（ラジアン）

// 発散（湧き出し・吸い込み検出）
let div = grid |> field.divergence
div[50][50]  // → 正:湧き出し, 負:吸い込み

// 回転（渦検出）
let rot = grid |> field.curl
rot[50][50]  // → 正:反時計回り

// ラプラシアン（拡散核）
let lap = grid |> field.laplacian

// 場のエネルギー
let energy = grid |> field.energy

// ポアソン方程式求解: ∇²φ = ρ
let solution = field.solve_poisson(source: rho, boundary: :dirichlet)

// 場の合成
let combined = field.superpose(field_a, field_b, weight: 0.7)
```

### API定義

```typescript
// --- 型定義 ---
interface FieldPoint {
  position: [number, number];
  value: MultiDimNumber;
}

interface FieldGrid {
  width: number;
  height: number;
  points: FieldPoint[][];
}

interface GradientResult {
  dx: number;        // x方向微分
  dy: number;        // y方向微分
  magnitude: number; // |∇F|
  direction: number; // atan2(dy, dx)
}

// --- 関数 ---
function gradient(md: MultiDimNumber): GradientResult;
function gradientGrid(grid: FieldGrid): GradientResult[][];

function divergence(md: MultiDimNumber): number;
function divergenceGrid(grid: FieldGrid): number[][];

function curl(md: MultiDimNumber): number;
function curlGrid(grid: FieldGrid): number[][];

function laplacian(md: MultiDimNumber): number;
function laplacianGrid(grid: FieldGrid): number[][];

function energy(grid: FieldGrid): number;

function superpose(a: FieldGrid, b: FieldGrid, weight?: number): FieldGrid;
function solvePoisson(source: FieldGrid, options?: PoissonOptions): FieldGrid;
```

---

## Module 2: `import symmetry` — 超対称数学理論

### 概要

多次元数のneighbor配列に潜む対称性を自動検出し、
対称変換（回転・反射・反転）を型安全に実行する。

既存の `SymmetryClass` enum（Full, Axial, Rotational, Asymmetric）を
汎化し、対称群 Dₙ（二面体群）として形式化する。

### 数学的基盤

**二面体群 D₈**:
8近傍の対称群は D₈（位数16）：
- 8つの回転: r⁰, r¹, r², ..., r⁷（45°刻み）
- 8つの鏡映: s₀, s₁, ..., s₇（各軸に対する反射）

**対称性検出**:
neighbors配列 [n₀, n₁, ..., n₇] に対して、
D₈の全元素を適用し、不変な変換の集合 = **安定化群（stabilizer）** を求める。

```
Stab(n) = { g ∈ D₈ | g·n = n }
```

| 安定化群の位数 | 対称性クラス | 例 |
|--------------|-------------|-----|
| 16 | Full (完全対称) | [5,5,5,5,5,5,5,5] |
| 8 | 4-fold + reflections | [1,2,1,2,1,2,1,2] |
| 4 | Axial (軸対称) | [1,2,3,2,1,2,3,2] |
| 2 | Single reflection | [1,2,3,4,5,4,3,2] |
| 1 | Asymmetric (非対称) | [1,3,7,2,5,8,4,6] |

**対称性破れ (symmetry breaking)**:
```
B(n) = min_{g ∈ D₈} ||n - g·n||
```
- 完全対称からのズレの度合い
- 0 = 完全対称、大きいほど非対称

**軌道分解**:
neighbor配列を D₈ の作用で軌道に分解する。
同一軌道に属する要素は対称的に等価。

### Rei構文例

```rei
import symmetry

let cell = 𝕄{5; 1,2,3,2,1,2,3,2}

// 対称性検出
cell |> symmetry.detect
// → { class: "axial", stabilizer_order: 4, axes: [:NS, :EW] }

// 対称変換
cell |> symmetry.rotate(steps: 2)   // 90°回転
cell |> symmetry.reflect(:NS)       // 南北軸で反射
cell |> symmetry.invert             // 中心反転（center ↔ mean(neighbors)）

// 対称性破れの度合い
cell |> symmetry.breaking
// → 0.0 (完全に軸対称)

// 対称化（最も近い対称構造に射影）
𝕄{5; 1,2,3,4,5,6,7,8} |> symmetry.symmetrize(:axial)
// → 𝕄{5; 1,2,3,4,1,2,3,4} (軸対称に射影)

// 軌道分解
cell |> symmetry.orbits
// → [[1,1], [2,2,2,2], [3,3]]  (3つの軌道)

// 対称テンソル
let tensor = symmetry.tensor(cell)
// → 2x2対称テンソル（主軸方向と主値）
```

### API定義

```typescript
// --- 型定義 ---
type SymmetryAxis = 'N' | 'NE' | 'E' | 'SE' | 'NS' | 'EW' | 'NESW' | 'NWSE';

interface SymmetryInfo {
  class: 'full' | 'four_fold' | 'axial' | 'single_reflection' | 'asymmetric';
  stabilizerOrder: number;
  axes: SymmetryAxis[];
  rotationalOrder: number;  // n-fold rotational symmetry
}

interface SymmetryTensor {
  eigenvalues: [number, number];   // 主値
  eigenvectors: [[number, number], [number, number]]; // 主軸
  anisotropy: number;              // 異方性の度合い (0=等方, 1=完全異方)
}

interface OrbitDecomposition {
  orbits: number[][];              // 等価な要素のグループ
  orbitSizes: number[];
  representatives: number[];       // 各軌道の代表元
}

// --- 関数 ---
function detect(md: MultiDimNumber): SymmetryInfo;

function rotate(md: MultiDimNumber, steps: number): MultiDimNumber;
function reflect(md: MultiDimNumber, axis: SymmetryAxis): MultiDimNumber;
function invert(md: MultiDimNumber): MultiDimNumber;

function breaking(md: MultiDimNumber): number;
function symmetrize(md: MultiDimNumber, target: SymmetryInfo['class']): MultiDimNumber;

function orbits(md: MultiDimNumber): OrbitDecomposition;
function tensor(md: MultiDimNumber): SymmetryTensor;
```

---

## Module 3: `import unified` — 統合数体系 U³

### 概要

Reiの3つの数体系（多次元数 𝕄、拡張数 Ext、統合数 Uni）を
圏論的に統合し、体系間の自然変換を提供する。

既存の `core/unified.ts` を理論的に完成させ、
U³ = 𝕄 × Ext × Level の完全な代数構造を定義する。

### 数学的基盤

**三位一体構造 U³**:
```
U³ = (𝕄, Ext, ℕ)
   = (MultiDim × Extended × Level)
```

各成分の役割：
- 𝕄 (MultiDim): 空間的構造（center-neighbor）
- Ext (Extended): 階層的深度（0₀ → 0₀₀ → ...）
- Level (ℕ): 統合レベル（抽象度）

**自然変換 (functors)**:
```
η_M : Num → 𝕄         (数値を多次元数に埋め込み)
η_E : Num → Ext        (数値を拡張数に埋め込み)
η_U : 𝕄 × Ext → U³    (組み合わせて統合数に)
π_M : U³ → 𝕄           (多次元数への射影)
π_E : U³ → Ext          (拡張数への射影)
```

**統合演算の整合性条件**:
```
π_M(u₁ ⊕ u₂) = π_M(u₁) ⊕_M π_M(u₂)   (加法の射影保存)
π_E(u₁ ⊕ u₂) = π_E(u₁) ⊕_E π_E(u₂)   (拡張数側も保存)
```

**レベル昇格・降格**:
```
↑(u) = (𝕄, extend(Ext), Level+1)     (抽象度を上げる)
↓(u) = (𝕄, reduce(Ext), Level-1)     (具体化する)
```

**U³ テンソル積**:
```
u₁ ⊗_U u₂ = (𝕄₁ ⊗_M 𝕄₂, Ext₁ ⊕_E Ext₂, Level₁ + Level₂)
```
多次元数は乗法的に、拡張数は加法的に、レベルは加法的に合成。

**距離関数**:
```
d_U(u₁, u₂) = α·d_M(π_M(u₁), π_M(u₂)) + β·d_E(π_E(u₁), π_E(u₂)) + γ·|L₁-L₂|
```
3成分の重み付き距離。

### Rei構文例

```rei
import unified

// 各体系からの変換
let m = 𝕄{5; 1,2,3,4,5,6,7,8}
let e = 0ooox
let u = unified.from(multidim: m, extended: e, level: 2)

// 射影
u |> unified.to_multidim   // → 𝕄{5; 1,2,3,4,5,6,7,8}
u |> unified.to_extended    // → 0ooox
u |> unified.level          // → 2

// レベル操作
u |> unified.elevate        // Level 2 → 3, Ext深化
u |> unified.ground         // Level 2 → 1, Ext縮約

// 統合演算
let u1 = unified.from(multidim: m1, extended: e1, level: 1)
let u2 = unified.from(multidim: m2, extended: e2, level: 1)
let sum = u1 |> unified.add(u2)
let prod = u1 |> unified.mul(u2)

// 距離
unified.distance(u1, u2)

// 整合性検証
unified.verify_consistency(u)
// → { md_ext_consistent: true, level_depth_match: true }

// 一括変換
[1, 2, 3, 4, 5] |> unified.from_array(level: 1)
// → U³配列（各要素を統合数に自動変換）
```

### API定義

```typescript
// --- 型定義 ---
interface U3Number {
  readonly multidim: MultiDimNumber;
  readonly extended: ExtendedNumber;
  readonly level: number;
}

interface ConsistencyCheck {
  mdExtConsistent: boolean;   // 射影の整合性
  levelDepthMatch: boolean;   // レベルと拡張深度の一致
  errors: string[];
}

interface U3Distance {
  total: number;
  mdComponent: number;
  extComponent: number;
  levelComponent: number;
}

// --- 構築 ---
function from(options: {
  multidim: MultiDimNumber;
  extended: ExtendedNumber;
  level: number;
}): U3Number;

function fromNumber(n: number, level?: number): U3Number;
function fromMultiDim(md: MultiDimNumber, level?: number): U3Number;
function fromExtended(ext: ExtendedNumber, level?: number): U3Number;
function fromArray(arr: number[], level?: number): U3Number[];

// --- 射影 ---
function toMultiDim(u: U3Number): MultiDimNumber;
function toExtended(u: U3Number): ExtendedNumber;
function toNumber(u: U3Number): number;

// --- 演算 ---
function add(a: U3Number, b: U3Number): U3Number;
function mul(a: U3Number, b: U3Number): U3Number;

// --- レベル操作 ---
function elevate(u: U3Number): U3Number;
function ground(u: U3Number): U3Number;
function setLevel(u: U3Number, level: number): U3Number;

// --- 計量 ---
function distance(a: U3Number, b: U3Number, weights?: {
  alpha?: number; beta?: number; gamma?: number;
}): U3Distance;

// --- 検証 ---
function verifyConsistency(u: U3Number): ConsistencyCheck;
```

---

## モジュール間接続マップ

```
                    ┌─────────────────┐
                    │   unified (U³)  │
                    │ 3数体系の統合   │
                    └────┬───────┬────┘
                         │       │
              射影 π_M   │       │  射影 π_E
                         ▼       ▼
               ┌─────────────┐  ┌──────────┐
               │  MultiDim   │  │ Extended │
               │  (core)     │  │ (core)   │
               └──────┬──────┘  └──────────┘
                      │
            場として解釈
                      ▼
               ┌─────────────┐
               │   field      │
               │ 勾配・発散   │
               └──────┬──────┘
                      │
            対称性検出
                      ▼
               ┌─────────────┐
               │  symmetry    │
               │ D₈群の操作  │
               └─────────────┘
```

**接続の意味**:
- `unified` は `field` と `symmetry` の**上位**に位置する
  - U³統合数に対して場の演算を適用できる
  - U³統合数の多次元成分の対称性を検出できる
- `field` の勾配ベクトルに `symmetry` の回転を適用できる
- 3モジュールは独立に使えるが、組み合わせるとより強力

**カテゴリA理論との接続**:
- `field.laplacian` = #19 時相数体系の拡散規則と同一
- `symmetry.detect` = #12 数理分解の対称/反対称分解と連携
- `unified.elevate` = #1 ゼロ拡張と #17 無限拡張の統合操作

---

## NOTICE追記案

```
Theory: Super-Symmetric Mathematics Theory (超対称数学理論)
Module: symmetry
Originality: Dihedral group D₈ symmetry detection for center-neighbor
  structures; automatic symmetrization by orbit projection;
  symmetry breaking measure as minimal D₈-orbit distance.

Theory: Information Field Mathematics Theory (情報場数学理論)
Module: field
Originality: Discrete differential operators (gradient, divergence,
  curl, Laplacian) defined natively on 8-neighbor multi-dimensional
  numbers; field energy functional; Poisson solver on center-neighbor
  grids.

Theory: Unified Number System U³ (統合数体系U³)
Module: unified
Originality: Category-theoretic unification of MultiDim × Extended ×
  Level as a three-component algebraic structure with natural
  transformations (embeddings and projections) satisfying homomorphism
  conditions; level elevation/grounding as functorial operations.
```
