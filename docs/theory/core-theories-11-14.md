# D-FUMT 4理論 Rei統合設計書（計画済み理論）

**対象理論:**
1. 逆数理構築理論（Inverse Mathematical Construction Theory）— 宣言的逆算パラダイム
2. 数理分解構築理論（Mathematical Decomposition-Construction Theory）— △▽チェーンの一般化
3. 合わせ鏡計算式（Facing Mirror Computation）— 再帰的反射・振動演算子
4. 螺旋数体系理論（Spiral Number System Theory）— 回転＋階層トラバーサル

**Author:** Nobuki Fujimoto (藤本伸樹)  
**Syntax Design:** Claude (Anthropic)  
**Date:** 2026-02-10  
**Status:** DESIGN — Implementation pending  
**Prerequisite:** Rei v0.1 (BNF finalized), GA-v2, ISL  
**Related:** See `three-theories-design.md` for theories 5–7

---

## Design Constraints

| Invariant | Verification |
|-----------|-------------|
| 既存コードの動作が変わらない | 全既存テストがパス |
| 新キーワードは最小限（4理論合計 ≤ 6） | 本設計で4キーワード + 2演算子 |
| `center; neighbors` パターンとの一貫性 | 全新構文が中心-周囲で解釈可能 |
| ISL位相との整合 | 新構文が位相で型付け可能 |
| 直線数体系理論（Theory 6）との双対性 | 螺旋と直線が対で完全 |

---

# Theory 1: 逆数理構築理論（Inverse Mathematical Construction Theory）

## 1.1 Motivation

Reiの既存パラダイムは **順方向（forward）** である：

```
入力 → 演算 → 結果
𝕄{5; 1,2,3,4} |> compute :weighted → 3.0
```

逆数理構築理論は **逆方向（inverse）** を導入する：

```
結果 → 逆算 → 入力の構造を推定
3.0 |> inverse :weighted → 𝕄{?; ?, ?, ?, ?} の候補
```

これはプログラミングにおける **宣言的パラダイム**（Prolog, SQL のように
「何が欲しいか」を宣言すれば処理系が逆算する）のRei的実現である。

**Core Claim:**
「結果から構造を逆算して構築する」能力は、`compress` の哲学的補完である。
`compress` は「構造を本質に圧縮する」順方向の操作。
`inverse` は「本質から構造を復元する」逆方向の操作。
両者は共に D-FUMT の「拡張と縮約の円環」の表現である。

## 1.2 Axioms

```
Axiom IMC-1 (Inverse Existence):
  ∀ mode ∈ {weighted, multiplicative, harmonic, exponential},
  ∀ target ∈ ℝ, ∃ 𝕄 such that compute(𝕄, mode) = target.
  (Any target value has at least one multi-dim number that produces it.)

Axiom IMC-2 (Inverse Non-uniqueness):
  The inverse is generally not unique. The inverse operator returns
  a constraint set, not a single value.

Axiom IMC-3 (Constraint Composition):
  Constraints can be composed:
  inverse(target, mode₁) ∧ inverse(target, mode₂) narrows the solution space.

Axiom IMC-4 (Forward-Inverse Duality):
  ∀ 𝕄: 𝕄 |> compute :m |> inverse :m  ⊇  {𝕄}
  (Forward then inverse always contains the original in the solution set.)
  The reverse does not hold in general due to non-uniqueness.
```

## 1.3 Inverse Computation Model

### Weighted Mode Inverse

```
Forward:  V_w = c₀ + Σ(wᵢ · nᵢ)
Inverse:  Given V_w, find {c₀, n₁, ..., nₖ} such that c₀ + Σ(wᵢ · nᵢ) = V_w

With constraints:
  fix(center: 5)  → c₀ = 5, solve for neighbors
  fix(n_N: 3)     → n₁ = 3, solve for remaining
  range(n: 0..10) → all neighbors in [0, 10]
```

### Multiplicative Mode Inverse

```
Forward:  V_m = c₀ × Π(nᵢ^wᵢ)
Inverse:  Given V_m, find {c₀, n₁, ..., nₖ} such that c₀ × Π(nᵢ^wᵢ) = V_m

Logarithmic reduction:
  ln(V_m) = ln(c₀) + Σ(wᵢ · ln(nᵢ))
  → Reduces to weighted mode inverse in log-space.
```

## 1.4 Rei Syntax

### `inverse` Pipe Command

```rei
// Basic inverse: "what multi-dim number produces 3.0 in weighted mode?"
3.0 |> inverse :weighted
// → ConstraintSet{ c + Σ(wᵢnᵢ) = 3.0 }

// With constraints to narrow solutions
3.0 |> inverse :weighted fix(center: 5, neighbors: 4)
// → 𝕄{5; -0.5, -0.5, -0.5, -0.5}  (one specific solution)

3.0 |> inverse :weighted fix(center: 5) range(n: 0..10)
// → Solution set within range constraints
```

### `solve` Pipe Command (Constraint Resolution)

```rei
// Declare desired outcome, let Rei find the structure
let target = 42.0
let structure = target |> solve {
  mode: :weighted,
  center: fix(10),
  neighbors: 8,
  range: 0..20
}
// → 𝕄{10; n₁, ..., n₈} where compute(:weighted) ≈ 42.0
```

### Forward-Inverse Chain

```rei
// Round-trip verification
let m = 𝕄{5; 1, 2, 3, 4}
let v = m |> compute :weighted         // → forward result
let candidates = v |> inverse :weighted fix(center: 5, neighbors: 4)
// candidates contains m (Axiom IMC-4)

// Constraint accumulation across modes
let narrow = 7.5
  |> inverse :weighted fix(neighbors: 4)
  |> constrain :harmonic               // further narrow with harmonic constraint
// → Tighter solution set satisfying both modes
```

### Declarative Pattern Matching

```rei
// "Find a multi-dim number where weighted = harmonic"
let balanced = solve {
  compute(:weighted) == compute(:harmonic),
  center: range(1..10),
  neighbors: 4,
  range: 1..10
}
// → 𝕄 where all neighbors equal (symmetry implies weighted = harmonic)
```

### BNF Addition

```ebnf
inverse_expr    ::= primary '|>' 'inverse' ':' mode_name constraint*
solve_expr      ::= primary '|>' 'solve' '{' solve_body '}'
constrain_expr  ::= primary '|>' 'constrain' ':' mode_name

constraint      ::= 'fix' '(' fix_spec ')'
                  | 'range' '(' range_spec ')'
fix_spec        ::= IDENT ':' expr (',' IDENT ':' expr)*
range_spec      ::= IDENT ':' expr '..' expr

solve_body      ::= solve_clause (',' solve_clause)*
solve_clause    ::= IDENT ':' expr
                  | expr comparison_op expr
```

---

# Theory 2: 数理分解構築理論（Mathematical Decomposition-Construction Theory）

## 2.1 Motivation

Reiの拡張演算子 `>>` と縮約演算子 `<<` は、拡張数の次元を1つ増減させる：

```
0oo >> :x  → 0oox     (1次元追加)
0oox <<    → 0oo      (1次元除去)
```

数理分解構築理論は、この「1段階ずつ」の操作を **一般化** し、
任意の数理構造を **基本要素に分解（decompose）** し、
別の構成規則で **再構築（reconstruct）** する操作を定義する。

**Core Claim:**
分解と再構築は拡張（△）と縮約（▽）の一般化である。
△▽が「1つの軸に沿った伸縮」であるのに対し、
decompose/reconstruct は「任意の分解基底に沿った変換」である。

## 2.2 Axioms

```
Axiom DC-1 (Decomposability):
  Any multi-dimensional number 𝕄 can be decomposed into a set of
  basis elements {b₁, ..., bₖ} and coefficients {a₁, ..., aₖ}
  such that 𝕄 = Σ aᵢ · bᵢ (in the appropriate algebra).

Axiom DC-2 (Basis Independence):
  Multiple decomposition bases exist for the same 𝕄.
  The choice of basis determines the interpretation.

Axiom DC-3 (Reconstruction Fidelity):
  decompose(𝕄, basis) |> reconstruct(basis) = 𝕄
  (Round-trip identity for any valid basis.)

Axiom DC-4 (Cross-Basis Transformation):
  decompose(𝕄, basis_A) |> reconstruct(basis_B)
  produces a valid 𝕄' that represents 𝕄 in a different basis.
  This is the generalization of △▽ chains.
```

## 2.3 Decomposition Bases

```
Basis: :directional
  Decompose by 8-direction components.
  𝕄{5; 1,2,3,4,9,8,7,6} → {N:1, NE:2, E:3, SE:4, S:9, SW:8, W:7, NW:6}

Basis: :axial (connects to Linear Number System Theory)
  Decompose into 4 axis-pair components.
  → {axis_NS:(1,9), axis_EW:(3,7), axis_NE_SW:(2,8), axis_SE_NW:(4,6)}

Basis: :symmetric
  Decompose into symmetric + antisymmetric parts.
  → {sym: 𝕄{5; 5,5,5,5,5,5,5,5}, anti: 𝕄{0; -4,-3,-2,-1,4,3,2,1}}

Basis: :spectral
  Decompose into frequency components (discrete Fourier on neighbors).
  → {DC:mean, F1:cos(θ), F2:cos(2θ), F3:cos(3θ), F4:cos(4θ)}

Basis: :hierarchical
  Decompose hierarchical multi-dim into layers.
  𝕄⁽²⁾ → {layer0: center 𝕄, layer1: [neighbor 𝕄₁, ..., 𝕄ₖ]}
```

## 2.4 Rei Syntax

### `decompose` Pipe Command

```rei
let m = 𝕄{5; 1, 2, 3, 4, 9, 8, 7, 6}

// Decompose by direction
m |> decompose :directional
// → {N:1, NE:2, E:3, SE:4, S:9, SW:8, W:7, NW:6, center:5}

// Decompose by axis (paired with Linear Number System Theory)
m |> decompose :axial
// → {NS:(1,9), EW:(3,7), NE_SW:(2,8), SE_NW:(4,6)}

// Decompose into symmetric + antisymmetric
m |> decompose :symmetric
// → {sym: 𝕄{5; 5,5,5,5,5,5,5,5}, anti: 𝕄{0; -4,-3,-2,-1,4,3,2,1}}

// Spectral decomposition
m |> decompose :spectral
// → Frequency components of the neighbor ring
```

### `reconstruct` Pipe Command

```rei
// Round-trip identity
m |> decompose :axial |> reconstruct :axial
// → 𝕄{5; 1, 2, 3, 4, 9, 8, 7, 6}  (identical to m)

// Cross-basis transformation
m |> decompose :directional |> reconstruct :spectral
// → Spectral representation of the same data

// Selective reconstruction (use only some components)
m |> decompose :symmetric |> select(:sym) |> reconstruct :directional
// → Only the symmetric part, reconstructed as a regular 𝕄
// → 𝕄{5; 5,5,5,5,5,5,5,5} (smoothed version)
```

### △▽ Chain Generalization

```rei
// Existing △▽ chain (unchanged)
0oo >> :x << >> :z          // extend, contract, extend

// Generalized decompose-reconstruct chain (new)
m |> decompose :spectral    // → frequency domain
  |> filter(keep: [0, 1])   // → keep only low frequencies
  |> reconstruct :directional  // → back to spatial domain
// This is a low-pass filter expressed as a △▽ generalization!

// Analogy:
//   >> << = 1D extend/contract along subscript axis
//   decompose/reconstruct = nD extend/contract along arbitrary basis
```

### BNF Addition

```ebnf
decompose_expr   ::= primary '|>' 'decompose' ':' basis_name
reconstruct_expr ::= primary '|>' 'reconstruct' ':' basis_name
select_expr      ::= primary '|>' 'select' '(' select_spec ')'
filter_expr      ::= primary '|>' 'filter' '(' filter_spec ')'

basis_name       ::= 'directional' | 'axial' | 'symmetric'
                   | 'spectral' | 'hierarchical'
```

---

# Theory 3: 合わせ鏡計算式（Facing Mirror Computation）

## 3.1 Motivation

合わせ鏡（facing mirrors）は、向かい合った2枚の鏡の間で像が無限に反射する現象。

この構造は数学的に以下を表現する：
- **無限の再帰**: f(f(f(f(...))))
- **交互の反転**: 各反射で像が左右反転する
- **漸近的減衰**: 鏡の不完全さにより像は徐々に薄れる

Reiにおいて、これは **拡張と縮約が交互に繰り返される振動的な演算子** として実現する。

**Core Claim:**
合わせ鏡計算式は、Reiの `>>` (拡張) と `<<` (縮約) を交互に適用する
**振動演算子（oscillation operator）** を定義する。
各反射で変換関数を適用し、無限反射の極限値を計算する。

## 3.2 Axioms

```
Axiom FM-1 (Mirror Pair):
  A mirror pair (f, g) consists of two transformation functions.
  f is the "forward mirror" and g is the "backward mirror".
  Reflection alternates: f → g → f → g → ...

Axiom FM-2 (Reflection Chain):
  mirror(x, f, g, n) = (g ∘ f)^(n/2)(x)  for even n
                      = f ∘ (g ∘ f)^((n-1)/2)(x)  for odd n

Axiom FM-3 (Convergence):
  If |g ∘ f| < 1 (contractive), then
  lim[n→∞] mirror(x, f, g, n) exists and is the fixed point of (g ∘ f).

Axiom FM-4 (Attenuation):
  Each reflection applies a decay factor α ∈ (0, 1).
  mirror(x, f, g, n, α) = αⁿ · mirror(x, f, g, n)
  The infinite sum of attenuated reflections converges.
```

## 3.3 Mirror Computation Model

### Basic Mirror

```
x を初期値、f と g を変換関数とする。

反射 0:  x
反射 1:  f(x)
反射 2:  g(f(x))
反射 3:  f(g(f(x)))
反射 4:  g(f(g(f(x))))
...

極限:  固定点 x* where g(f(x*)) = x*
```

### Multi-Dimensional Mirror

```
多次元数に適用する場合:
  f = center → neighbors 方向の演算（拡張的）
  g = neighbors → center 方向の演算（縮約的）

反射 0:  𝕄{c; n₁,...,nₖ}
反射 1:  center に neighbors の情報を集約（>>的）
反射 2:  集約結果を neighbors に再配分（<<的）
反射 3:  再配分結果を再集約
...

→ 情報が center ↔ neighbors 間で振動しながら平衡に向かう
→ 収束値 = 多次元数の「固有値的な安定状態」
```

## 3.4 Rei Syntax

### Mirror Operator: `⟨⟩` (Facing Brackets)

```rei
// Basic mirror computation
let x = 10.0
x |> mirror(f: (*2), g: (/3), n: 10)
// → 10 → 20 → 6.67 → 13.33 → 4.44 → ...
// Converges to fixed point of (x/3 * 2) = (2/3)x → 0

// With attenuation
x |> mirror(f: (*2), g: (/3), alpha: 0.9)
// → Sum of attenuated reflections
```

### Multi-Dimensional Mirror

```rei
let m = 𝕄{5; 1, 2, 3, 4}

// Mirror between center and neighbors
m |> mirror(
  f: |> compute :weighted,     // center absorbs neighbors
  g: |> distribute :uniform,   // center radiates to neighbors
  n: 20                        // 20 reflections
)
// → Equilibrium state where center-neighbor exchange stabilizes

// Convergence detection
m |> mirror(
  f: |> compute :weighted,
  g: |> distribute :uniform,
  converge: 1e-8               // stop when change < threshold
)
// → Fixed point (equilibrium 𝕄)
```

### Infinite Mirror (Limit Computation)

```rei
// Compute the infinite mirror limit
m |> mirror_limit(
  f: |> compute :weighted,
  g: |> distribute :uniform
)
// → The mathematical fixed point (if convergent)

// Check convergence
m |> mirror_convergent?(
  f: |> compute :weighted,
  g: |> distribute :uniform
)
// → true/false
```

### Mirror as Extension-Contraction Oscillation

```rei
// Mirror expressed as alternating >> and <<
let e = 0oo
e |> mirror(f: (>> :x), g: (<<), n: 6)
// → 0oo → 0oox → 0oo → 0oox → 0oo → 0oox → 0oo
// Oscillation between two states (non-convergent — period 2)

// With decay: each extension adds less
e |> mirror(f: (>> :x), g: (<<), alpha: 0.5, n: 10)
// → Attenuated oscillation
```

### Connection to Contraction Zero Theory

```rei
// Mirror between expansion and contraction, with attenuation
// converges to 0̃ (tilde-zero) from Contraction Zero Theory
0₀ |> mirror(
  f: (>> :o),    // expand
  g: (<<),       // contract
  alpha: 0.99,   // slight decay each reflection
  converge: 1e-12
)
// → 0̃ (dynamic equilibrium — the mirror's fixed point IS tilde-zero)
```

### BNF Addition

```ebnf
mirror_expr     ::= primary '|>' 'mirror' '(' mirror_params ')'
mirror_limit    ::= primary '|>' 'mirror_limit' '(' mirror_params ')'
mirror_conv     ::= primary '|>' 'mirror_convergent?' '(' mirror_params ')'

mirror_params   ::= mirror_param (',' mirror_param)*
mirror_param    ::= 'f:' expr
                  | 'g:' expr
                  | 'n:' NUMBER
                  | 'alpha:' NUMBER
                  | 'converge:' NUMBER
```

---

# Theory 4: 螺旋数体系理論（Spiral Number System Theory）

## 4.1 Motivation

直線数体系理論（Theory 6 in three-theories-design.md）が「軸射影の数学」であるのに対し、
螺旋数体系理論は「回転の数学」を担う。両者は **双対** の関係にある。

多次元数の8近傍を「回転順に巡回しながら、層を上がる」トラバーサルを定義する。

```
Direct (existing):   m |> compute :weighted  → 全近傍を一括計算
Linear (Theory 6):   m |>⟨axis:NS⟩ gradient  → 軸ごとに分解
Spiral (this):       m |> spiral :cw          → 回転順に逐次計算
```

**Core Claim:**
螺旋は「回転 + 進行」の複合運動であり、多次元数の近傍を
N→NE→E→SE→S→SW→W→NW の順（時計回り）または逆順（反時計回り）で
**逐次的に累積計算する** 演算モデルを提供する。
さらに階層的多次元数では、1周するごとに1層上に進む螺旋トラバーサルが可能。

## 4.2 Axioms

```
Axiom SP-1 (Spiral Ordering):
  For 8-neighbor multi-dim number, the clockwise spiral order is:
  σ_cw = [N, NE, E, SE, S, SW, W, NW] = [0, 1, 2, 3, 4, 5, 6, 7]
  The counter-clockwise order is the reverse:
  σ_ccw = [N, NW, W, SW, S, SE, E, NE] = [0, 7, 6, 5, 4, 3, 2, 1]

Axiom SP-2 (Spiral Accumulation):
  spiral_acc(𝕄, σ, op) applies operation op sequentially:
  result₀ = center
  resultₖ = op(resultₖ₋₁, n_{σ(k)})
  final = resultₙ (after all neighbors visited)

Axiom SP-3 (Spiral-Linear Duality):
  spiral_acc(𝕄, σ_cw, +) = Σ proj_grad(𝕄, αₖ) (in rotated basis)
  The spiral result can be decomposed into axis projections,
  and axis projections can be composed into a spiral.

Axiom SP-4 (Hierarchical Spiral):
  For hierarchical multi-dim 𝕄⁽ⁿ⁾, a spiral completes one layer
  per revolution. After visiting all neighbors of layer k,
  the spiral descends into layer k+1.
  Total visits = Σ (neighbors at layer i) for i = 0..n.
```

## 4.3 Spiral Operations

### Basic Spiral

```
𝕄{5; 1, 2, 3, 4, 9, 8, 7, 6}  with σ_cw

Additive spiral:
  step 0: 5 (center)
  step 1: 5 + 1 = 6 (N)
  step 2: 6 + 2 = 8 (NE)
  step 3: 8 + 3 = 11 (E)
  step 4: 11 + 4 = 15 (SE)
  step 5: 15 + 9 = 24 (S)
  step 6: 24 + 8 = 32 (SW)
  step 7: 32 + 7 = 39 (W)
  step 8: 39 + 6 = 45 (NW)
  → final = 45

Multiplicative spiral:
  step 0: 5
  step 1: 5 × 1 = 5
  step 2: 5 × 2 = 10
  ...
  → Sequential product along spiral path
```

### Spiral with Decay (Weighted Spiral)

```
Each step applies a decay factor:
  resultₖ = α · resultₖ₋₁ + (1-α) · n_{σ(k)}

This models "newer information overwrites older information"
as the spiral progresses — like a moving average along the spiral path.
```

### Hierarchical Spiral

```
𝕄⁽²⁾ = 𝕄{c; 𝕄₁, 𝕄₂, 𝕄₃, 𝕄₄}

Layer 0: Visit c (center of outer 𝕄)
Layer 1: Spiral through 𝕄₁, 𝕄₂, 𝕄₃, 𝕄₄ (outer neighbors)
Layer 2: For each 𝕄ᵢ, spiral through its neighbors
→ The spiral "drills down" one layer per revolution
```

## 4.4 Rei Syntax

### Spiral Pipe Command

```rei
let m = 𝕄{5; 1, 2, 3, 4, 9, 8, 7, 6}

// Clockwise additive spiral
m |> spiral :cw                // → 45 (sum along CW path)

// Counter-clockwise
m |> spiral :ccw               // → same sum, different intermediate values

// Multiplicative spiral
m |> spiral :cw :multiplicative  // → product along CW path

// Spiral with decay (weighted moving average)
m |> spiral :cw alpha(0.7)     // → exponentially weighted spiral
```

### Spiral Trace (Intermediate Values)

```rei
// Get all intermediate values during spiral traversal
m |> spiral_trace :cw
// → [5, 6, 8, 11, 15, 24, 32, 39, 45]
// (each step's accumulated value)

// Useful for visualization and analysis
m |> spiral_trace :cw |> plot  // (if visualization available)
```

### Start Position

```rei
// Start spiral from a specific direction (not always N)
m |> spiral :cw from(:E)      // Start from East, go E→SE→S→SW→W→NW→N→NE
m |> spiral :cw from(:S)      // Start from South

// This changes the accumulation order and thus intermediate values
// (final sum is the same for additive, but differs for non-commutative ops)
```

### Hierarchical Spiral

```rei
let h = 𝕄{10; 𝕄{1; 2,3}, 𝕄{4; 5,6}, 𝕄{7; 8,9}, 𝕄{11; 12,13}}

// Flat spiral (only outer layer)
h |> spiral :cw depth(0)      // → spiral through outer 𝕄 values only

// Deep spiral (drill into each neighbor)
h |> spiral :cw depth(1)      // → spiral outer, then into each inner 𝕄

// Full depth spiral
h |> spiral :cw depth(:all)   // → complete hierarchical traversal
```

### Spiral-Linear Composition

```rei
// Spiral then decompose into axes (connects to Linear Number System)
m |> spiral_trace :cw |> decompose :axial
// → Axis components of the spiral trace

// Linear projections composed into spiral
m |> project_all |> spiral :cw
// → Spiral through the 4 axis projection values

// Dual verification
let s = m |> spiral :cw
let l = m |> project_all |> sum
// s and l should be related by Theorem LN-S (spiral-linear duality)
```

### Spiral as Generator (Lazy Evaluation)

```rei
// Infinite spiral — generates values on demand
let gen = m |> spiral_gen :cw
gen |> take(3)                 // → [5, 6, 8] (first 3 steps)
gen |> take(8)                 // → all 8 steps (one revolution)
gen |> take(16)                // → 2 revolutions (wraps around)

// Useful for streaming computation over large hierarchical structures
```

### BNF Addition

```ebnf
spiral_expr     ::= primary '|>' 'spiral' spiral_dir spiral_mode? spiral_opts*
spiral_trace    ::= primary '|>' 'spiral_trace' spiral_dir spiral_opts*
spiral_gen      ::= primary '|>' 'spiral_gen' spiral_dir

spiral_dir      ::= ':cw' | ':ccw'
spiral_mode     ::= ':multiplicative' | ':harmonic' | ':exponential'
                  (* default is additive if omitted *)

spiral_opts     ::= 'alpha' '(' NUMBER ')'
                  | 'from' '(' ':' direction ')'
                  | 'depth' '(' NUMBER | ':all' ')'
```

---

# 4理論の統合: 相互関係

## Architecture

```
            ┌──────────────────────────┐
            │ 逆数理構築理論            │
            │ inverse / solve          │
            │ "結果→構造" 逆算         │
            └───────────┬──────────────┘
                        │ forward ↔ inverse
            ┌───────────▼──────────────┐
            │ 既存の compute パイプ     │
            │ "構造→結果" 順算         │
            └──┬───────────────────┬───┘
               │                   │
   ┌───────────▼──────┐    ┌──────▼──────────────┐
   │ 数理分解構築理論  │    │ 合わせ鏡計算式       │
   │ decompose /      │    │ mirror /             │
   │ reconstruct      │    │ mirror_limit         │
   │ "分解↔再構築"    │    │ "振動→平衡"         │
   └──────┬───────────┘    └──────────────────────┘
          │ basis: :axial / :spectral
   ┌──────▼───────────────────────────────────────┐
   │           多次元数 𝕄 [c; n₁,...,n₈]          │
   └──┬───────────────────────────────────────┬───┘
      │                                       │
  ┌───▼────────────┐              ┌───────────▼──────┐
  │ 螺旋数体系理論  │              │ 直線数体系理論    │
  │ spiral :cw/:ccw │    dual     │ axis:NS/EW/...   │
  │ "回転トラバーサル"│ ←────────→ │ "射影トラバーサル" │
  └────────────────┘              └──────────────────┘
```

## Cross-Theory Examples

```rei
// === 逆数理 × 分解構築 ===
// "weighted=10 になる 𝕄 を見つけ、そのスペクトル成分を調べる"
10.0 |> inverse :weighted fix(center: 5, neighbors: 4)
     |> decompose :spectral

// === 合わせ鏡 × 螺旋 ===
// "螺旋計算と逆螺旋計算を交互に反射させる"
m |> mirror(
  f: |> spiral :cw,
  g: |> spiral :ccw,
  converge: 1e-8
)
// → CW spiral と CCW spiral の平衡点

// === 分解構築 × 螺旋 × 直線 ===
// "スペクトル分解 → 低周波成分のみ螺旋計算 → 軸射影"
m |> decompose :spectral
  |> filter(keep: [0, 1])
  |> reconstruct :directional
  |> spiral :cw
  |> decompose :axial

// === 逆数理 × 合わせ鏡 ===
// "目標値に鏡反射で漸近的に近づく"
let target = 42.0
m |> mirror(
  f: |> compute :weighted,
  g: |> inverse :weighted fix(center: m.center) |> first,
  converge: 1e-6
)
// → 𝕄 that produces exactly 42.0 through mirror convergence
```

---

# Summary: New Constructs

| Addition | Kind | Theory | Breaking? |
|----------|------|--------|:---------:|
| `inverse` | pipe command | Inverse Math Construction | No |
| `solve` | pipe command | Inverse Math Construction | No |
| `constrain` | pipe command | Inverse Math Construction | No |
| `decompose` | pipe command | Math Decomposition-Construction | No |
| `reconstruct` | pipe command | Math Decomposition-Construction | No |
| `select` | pipe command | Math Decomposition-Construction | No |
| `filter` | pipe command | Math Decomposition-Construction | No |
| `mirror` | pipe command | Facing Mirror Computation | No |
| `mirror_limit` | pipe command | Facing Mirror Computation | No |
| `mirror_convergent?` | pipe command | Facing Mirror Computation | No |
| `spiral` | pipe command | Spiral Number System | No |
| `spiral_trace` | pipe command | Spiral Number System | No |
| `spiral_gen` | pipe command | Spiral Number System | No |

**New keywords: 4** (`inverse`, `decompose`, `reconstruct`, `mirror`)  
**New operators: 0** (all expressed as pipe commands)  
**New literals: 0**  
**Breaking changes: 0**

---

## License

This design document is part of the Rei / D-FUMT project.  
Theory: © Nobuki Fujimoto — CC BY-NC-SA 4.0  
Implementation: Apache License 2.0  
See NOTICE file for protected computational model elements.
