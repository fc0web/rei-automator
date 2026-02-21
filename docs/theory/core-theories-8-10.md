# D-FUMT 3理論 Rei統合設計書

**対象理論:**
1. 縮小ゼロ理論（Contraction Zero Theory）— `⊖` の極限意味論
2. 直線数体系理論（Linear Number System Theory）— 射影演算子
3. 点数体系理論（Point Number System Theory）— 生成公理系の拡張

**Author:** Nobuki Fujimoto (藤本伸樹)  
**Syntax Design:** Claude (Anthropic)  
**Date:** 2026-02-10  
**Status:** DESIGN — Implementation pending  
**Prerequisite:** Rei v0.1 (BNF finalized), GA-v2, ISL

---

## Design Constraints

3理論を追加する際、以下の不変条件を維持する。

| Invariant | Verification |
|-----------|-------------|
| 既存コードの動作が変わらない | 全既存テストがパス |
| 新キーワードは最小限（≤ 5） | 本設計で3キーワード + 2リテラル |
| `center; neighbors` パターンとの一貫性 | 全新構文が中心-周囲で解釈可能 |
| ISL位相との整合 | 新リテラルが位相で型付け可能 |

---

# Theory 1: 縮小ゼロ理論（Contraction Zero Theory）

## 1.1 Motivation

D-FUMT の既存体系には「拡張」の方向が豊かに整備されている：

```
0₀ → 0ₒ → 0ₒₒ → 0ₒₒₒ → ...  （ゼロ拡張 — 次元が増える）
```

しかし「縮約」方向、すなわち `⊖` を繰り返し適用したとき **何が起きるのか** は未定義だった。

```
0ₒₒₒ ⊖ → 0ₒₒ ⊖ → 0ₒ ⊖ → 0₀ ⊖ → ???
```

縮小ゼロ理論は、この `???` に数学的意味を与える。

**Core Claim:**
「真のゼロ」は単なる「無」ではなく、正と負の無限小エネルギーが完全に釣り合った
**動的平衡状態（dynamic equilibrium）** である。縮約の極限は静的な void ではなく、
ゼロ点エネルギーを持つ振動状態である。

## 1.2 Axioms

```
Axiom CZ-1 (Contraction Limit Existence):
  lim[n→0] ⊖ⁿ(0_{o^k}) exists. We denote this 0̃ (tilde-zero).

Axiom CZ-2 (Dynamic Equilibrium):
  0̃ = lim[ε→0⁺] { +ε ⊕ (-ε) }
  0̃ is additively zero but contains internal energy pairs.

Axiom CZ-3 (Contraction-Expansion Asymmetry):
  ∀x: (x ⊕ s) ⊖ ≠ x  (generally)
  But lim[n→∞] (⊖ⁿ ∘ ⊕ⁿ)(x) → x  (asymptotic recovery)
```

## 1.3 Algebraic Properties of 0̃

```
0̃ + a = a           (additive identity — same as ordinary zero)
0̃ × a = 0̃           (multiplicative absorber — same as ordinary zero)
0̃ ⊖ = 0̃             (contraction fixed point — NEW)
energy(0̃) > 0        (zero-point energy — NEW)
0̃ ≠ void             (distinct from void — void has zero energy)
```

## 1.4 Energy Function

```
E: ReiValue → ℝ≥0

E(void) = 0
E(0₀)   = ε₀                    (minimal energy from genesis)
E(0ₒₒ)  = ε₀ × dim(0ₒₒ)        (proportional to dimension)
E(0̃)    = ε₀ / 2                (contraction limit — minimal nonzero)
```

## 1.5 Rei Syntax

### Tilde-Zero Literal

```rei
let tz = 0̃              // tilde-zero literal
let tz2 = 0~             // ASCII fallback

// Chained contraction reaches 0̃ automatically
let x = 0ooo
x << << << <<            // 0ooo → 0oo → 0o → 0₀ → 0̃
```

### Energy Pipe Command

```rei
0ooo |> energy           // → ε₀ × 3
0₀ |> energy             // → ε₀
0̃ |> energy              // → ε₀ / 2
void |> energy           // → 0

𝕄{5; 1,2,3,4} |> energy // → total energy of center + neighbors
```

### Extended Contraction Semantics

```rei
// Existing behavior (unchanged)
0ooo <<                  // → 0oo
0oo <<                   // → 0o
0o <<                    // → 0₀

// New behavior (added)
0₀ <<                    // → 0̃  (previously undefined)
0̃ <<                     // → 0̃  (fixed point)
```

### Equilibrium Detection

```rei
0̃ |> balanced?                        // → true
0₀ |> balanced?                       // → false
𝕄{0; 3, -3, 5, -5} |> balanced?      // → true  (neighbor sum = 0)
𝕄{0; 3, -3, 5, -4} |> balanced?      // → false
```

### ISL Phase Integration

```
0̃ belongs to @Compacted phase (maximally contracted state).

Phase ordering with 0̃:
  void (pre-phase) → ・ (pre-Open) → 0₀ (Open) → ... → 0̃ (Compacted)

Contraction to 0̃ is irreversible in ISL terms:
  once @Compacted, cannot return to @Open.
```

### BNF Addition

```ebnf
tilde_zero      ::= '0̃' | '0~'
energy_expr     ::= primary '|>' 'energy' | 'E' '(' expr ')'
balance_expr    ::= primary '|>' 'balanced?'
primary         ::= ... | tilde_zero
```

---

# Theory 2: 直線数体系理論（Linear Number System Theory）

## 2.1 Motivation

螺旋数体系理論が「回転の数学」であるのに対し、直線数体系理論はその **双対** として「射影の数学」を担う。

多次元数 `𝕄{c; n₁, n₂, ..., n₈}` に対して：

```
Spiral:  n₁ → n₂ → n₃ → ... → n₈ → c  (rotate into center)
Linear:  {n_N, n_S} → c   (project onto N-S axis)
         {n_E, n_W} → c   (project onto E-W axis)
         {n_NE, n_SW} → c (project onto NE-SW axis)
         {n_SE, n_NW} → c (project onto SE-NW axis)
```

8方向の近傍を **軸ごとにペアとして束ね、軸上で中心との関係を1次元的に分析する。**

## 2.2 Axioms and Definitions

### Projection Axes

8近傍多次元数に対して4つの射影軸を定義する。

```
Axis α₁ (N-S):    proj₁(𝕄) = (n_N, c, n_S)      — vertical
Axis α₂ (E-W):    proj₂(𝕄) = (n_E, c, n_W)      — horizontal
Axis α₃ (NE-SW):  proj₃(𝕄) = (n_NE, c, n_SW)    — right diagonal
Axis α₄ (SE-NW):  proj₄(𝕄) = (n_SE, c, n_NW)    — left diagonal
```

### Projection Operators

```
Definition LN-1 (Axis Projection Aggregation):
  proj_agg(𝕄, αₖ, mode) = compute([c; nₖ₊, nₖ₋], mode)

Definition LN-2 (Projection Gradient):
  proj_grad(𝕄, αₖ) = nₖ₊ - nₖ₋
  — Directional derivative. Equivalent to Sobel filter components.

Definition LN-3 (Projection Symmetry):
  proj_sym(𝕄, αₖ) = |nₖ₊ - nₖ₋| < ε

Definition LN-4 (Full Projection Vector):
  proj_all(𝕄) = [proj_grad(𝕄, α₁), ..., proj_grad(𝕄, α₄)]

Definition LN-5 (Axis Curvature):
  proj_curv(𝕄, αₖ) = nₖ₊ + nₖ₋ - 2c
  — Laplacian component along axis αₖ.
```

### Spiral-Linear Duality Theorem

```
Theorem LN-S (Spiral-Linear Duality):
  spiral_agg(𝕄, mode) = Σₖ wₖ · proj_agg(𝕄, αₖ, mode)

  Spiral traversal result = weighted sum of all axis projections.
  Conversely, projections are axis-decomposed components of spiral.

  Spiral = global (one continuous traversal)
  Linear = local (axis-by-axis decomposition)
```

## 2.3 Rei Syntax

### Axis-Specified Pipe: `|>⟨axis:___⟩`

既存の方向指定パイプ `|>⟨N,S⟩` を軸概念で抽象化する。

```rei
let m = 𝕄{5; 1, 2, 3, 4, 9, 8, 7, 6}
//           N  NE  E  SE  S  SW  W  NW

// Axis-projected gradient
m |>⟨axis:NS⟩ gradient       // → 1 - 9 = -8
m |>⟨axis:EW⟩ gradient       // → 3 - 7 = -4
m |>⟨axis:NE_SW⟩ gradient    // → 2 - 8 = -6
m |>⟨axis:SE_NW⟩ gradient    // → 4 - 6 = -2

// Full projection vector
m |> project_all              // → [-8, -4, -6, -2]

// Axis symmetry
m |>⟨axis:NS⟩ symmetric?     // → false (1 ≠ 9)
```

### Distinction from Direction Selection

```rei
// Direction selection (existing — unchanged)
m |>⟨N,S⟩ sum                // → 1 + 9 = 10 (select N and S)

// Axis projection (new — different semantics)
m |>⟨axis:NS⟩ gradient       // → 1 - 9 = -8 (project onto N-S axis)

// |>⟨N,S⟩  = set operation (select these neighbors)
// |>⟨axis:NS⟩ = geometric operation (project onto this axis)
```

### Derived Operators

```rei
// Axis curvature (Laplacian component)
m |>⟨axis:NS⟩ curvature      // → n_N + n_S - 2c = 1 + 9 - 10 = 0

// Full Laplacian (sum of all axis curvatures)
m |> laplacian                // → Σ curvature(αₖ)

// Gradient vector and derived quantities
m |> gradient_vector          // → [-8, -4, -6, -2]
m |> gradient_magnitude       // → √(64 + 16 + 36 + 4) = √120
m |> gradient_direction       // → atan2(grad_NS, grad_EW)
```

### Spiral-Linear Composition

```rei
// Spiral (planned)
m |> spiral :cw               // clockwise spiral aggregation

// Linear → Spiral composition
m |> project_all |> spiral :cw
// Project all axes, then spiral-aggregate the projections

// Spiral → Linear decomposition
m |> spiral :cw |> decompose_axes
// Decompose spiral result into axis components
```

### BNF Addition

```ebnf
axis_spec       ::= 'axis:' axis_name
axis_name       ::= 'NS' | 'EW' | 'NE_SW' | 'SE_NW'
direction_set   ::= ... | axis_spec              (* extend existing *)

linear_cmd      ::= 'gradient' | 'curvature' | 'symmetric?'
                  | 'project_all' | 'laplacian'
                  | 'gradient_vector' | 'gradient_magnitude'
                  | 'gradient_direction' | 'decompose_axes'
```

---

# Theory 3: 点数体系理論（Point Number System Theory）

## 3.1 Motivation

Reiの生成公理系（GA-v2）は以下の遷移を定義している：

```
void → ・（点の出現） → 0₀（原初のゼロ） → 0 → ℕ
```

しかし `・（点）` は公理系の物語として記述されているだけで、**Reiの構文上、第一級リテラルとして存在しない。**

点数体系理論は `・` を第一級リテラルとし、`void` と `0₀` の間の計算を可能にする。

**Core Claim:**
点（`・`）は「次元を持たないが存在する」— void と 0₀ の中間状態。
void は「存在すらしない」、0₀ は「ゼロ次元の数として存在する」、
点は「存在するが、まだ数ではない」。

この「数以前の存在（pre-numeric entity）」を計算対象とすることで、
生成公理系が「記述された物語」から「実行可能なプログラム」に昇格する。

## 3.2 Axioms

```
Axiom PT-1 (Existence of Point):
  ・ is neither void nor number. It is a third category of existence.

Axiom PT-2 (Pre-numericity):
  ・ has no ordering. Neither ・ < 0 nor ・ > 0 nor ・ = 0 holds.
  ・ does not reside on the number line.

Axiom PT-3 (Generative Capacity):
  Transition from ・ to 0₀ is described by dimensionalization: dim(・) = 0₀

Axiom PT-4 (Point Combination — Simplex Generation):
  ・ ⊕ ・ = ─           (line element / 1-simplex)
  ・ ⊕ ・ ⊕ ・ = △       (triangle element / 2-simplex)
  ・ ⊕ ・ ⊕ ・ ⊕ ・ = ▲   (tetrahedron element / 3-simplex)
  In general: n points combine to form an (n-1)-simplex.

Axiom PT-5 (Indivisibility):
  ・ ⊖ = void
  A point is atomic — it has no internal structure.
```

## 3.3 Point Algebra

```
// Combination table
・ ⊕ ・ = ─                    (point + point = line element)
─ ⊕ ・ = △                    (line + point = triangle element)
△ ⊕ ・ = ▲                    (triangle + point = tetrahedron element)
simplex(n) ⊕ ・ = simplex(n+1)  (general rule)

// Point-to-number transition
dim(・) = 0₀                   (dimensionalize → extended zero)
dim(─) = 0ₒ                   (1D → 1-subscript extended zero)
dim(△) = 0ₒₒ                  (2D → 2-subscript extended zero)

// Number-to-point transition (inverse)
undim(0₀) = ・
undim(0ₒ) = ─
undim(0ₒₒ) = △
```

## 3.4 Connection to GFT

点数体系理論は GFT（Graphic Formula Theory）の **基底層（substrate）** を提供する。

```
GFT literal:      △{origin; P₁, P₂, P₃}
Point substrate:   ・ ⊕ ・ ⊕ ・ = △

GFT figures are "results of point combination operations."
Point system → GFT = "atoms → molecules"
```

## 3.5 Rei Syntax

### Point Literal

```rei
let p = ・                // point (pre-numeric entity)
let p2 = dot              // ASCII fallback
```

### Point Combination (Simplex Generation)

```rei
let line = ・ ⊕ ・                 // → ─ (1-simplex)
let tri  = ・ ⊕ ・ ⊕ ・            // → △ (2-simplex)
let tet  = ・ ⊕ ・ ⊕ ・ ⊕ ・       // → ▲ (3-simplex)

let s5 = simplex(5)              // shorthand for 5-simplex

tri |> dim                        // → 2
```

### Dimensionalization: `dim` / `undim`

```rei
・ |> dim                         // → 0₀
─ |> dim                         // → 0o
△ |> dim                         // → 0oo

0₀ |> undim                      // → ・
0oo |> undim                     // → △

// Round-trip
・ |> dim |> undim               // → ・
```

### Fully Executable Genesis

```rei
// Each genesis stage now operates on real literals

let g = genesis()

g |> forward        // void → ・  (point emergence)
g.state             // → ・

g |> forward        // ・ → 0₀   (dimensionalization)
g.state             // → 0₀

g |> forward        // 0₀ → 0    (stabilization)
g |> forward        // 0 → 1     (successor generation)

// Reverse is also possible
g |> backward       // 1 → 0
g |> backward       // 0 → 0₀
g |> backward       // 0₀ → ・
g |> backward       // ・ → void
```

### Point-MultiDimNumber Relationship

```rei
let m = 𝕄{5; 1, 2, 3, 4}

// Extract topological skeleton as point structure
m |> skeleton       // → point graph: center ・ connected to 4 neighbor ・'s

// Reverse: build multi-dim number from simplex
simplex(4) |> to_mdnum(center: 5, fill: 0)
// → 𝕄{5; 0, 0, 0, 0}
```

### ISL Phase Integration

```
Points belong to @pre-Open phase (before number genesis).

Extended ISL phase ordering:
  pre-Open (void, ・) → Open (0₀ ~) → Sealed → Compacted (0̃)

pre-Open → Open transition via dim() is irreversible:
  let z: @Open = (・) |> dim    // OK: pre-Open → Open
  let p: @Open = z |> undim    // p is ・ but remains @Open
  // Cannot return to @pre-Open once dimensionalized
```

### BNF Addition

```ebnf
dot_literal     ::= '・' | 'dot'
simplex_literal ::= '─' | '△' | '▲' | 'simplex' '(' NUMBER ')'
dim_expr        ::= primary '|>' 'dim'
undim_expr      ::= primary '|>' 'undim'
skeleton_expr   ::= primary '|>' 'skeleton'
primary         ::= ... | dot_literal | simplex_literal
```

---

# Integration: How the 3 Theories Connect

## Architecture

```
                    ┌─────────────────────────┐
                    │    点数体系理論          │
                    │  void → ・ → simplex    │
                    └─────────┬───────────────┘
                              │ dim / undim
                    ┌─────────▼───────────────┐
                    │   Genesis Axiom System   │
                    │  0₀ → 0ₒ → 0ₒₒ → ...  │
                    └──┬──────────────────┬───┘
                       │ ⊖ (contract)     │ ⊕ (expand)
              ┌────────▼──────────┐       │
              │  縮小ゼロ理論      │       │
              │  ... → 0₀ → 0̃   │       │
              │  (dynamic eq.)    │       │
              └───────────────────┘       │
                                   ┌──────▼──────────────┐
                                   │  MultiDimNumber 𝕄   │
                                   │  [c; n₁,...,n₈]    │
                                   └──┬──────────────┬───┘
                                      │              │
                          ┌───────────▼──┐    ┌─────▼────────────┐
                          │ 直線数体系   │    │ 螺旋数体系(planned)│
                          │ axis proj.   │    │ spiral traversal  │
                          └──────────────┘    └──────────────────┘
                                      │              │
                                      └──────┬───────┘
                                             │ duality
                                      ┌──────▼───────┐
                                      │   GFT / UPFT  │
                                      └──────────────┘
```

## Full Cycle Example

```rei
// === Complete genesis → computation → annihilation cycle ===

// 1. Begin from point (Point Number System Theory)
let p = ・
let structure = p ⊕ p ⊕ p ⊕ p ⊕ p    // 4-simplex

// 2. Dimensionalize and compute (Linear Number System Theory)
let m = structure |> to_mdnum(center: 10, fill: [2, 4, 6, 8])
m |>⟨axis:NS⟩ gradient               // axis gradient
m |> gradient_magnitude               // edge strength

// 3. Contract to zero (Contraction Zero Theory)
let z = m |> compress :to_zero        // → 0₀
z << << <<                            // → 0̃ (dynamic equilibrium)
z |> energy                           // → ε₀ / 2 (not zero!)

// 4. Return to point
0̃ |> undim                            // → ・ (back to point)
// But this ・ is @Compacted, not @pre-Open

// === Full Cycle ===
// ・ → simplex → 𝕄 → computation → 0₀ → 0̃ → ・
// Start and end are both "point" but in different phases.
// This embodies D-FUMT's circular mathematics (円環的数理).
```

---

# Summary: New Constructs

| Addition | Kind | Theory | Breaking? |
|----------|------|--------|:---------:|
| `0̃` / `0~` | literal | Contraction Zero | No |
| `energy` / `E()` | pipe command | Contraction Zero | No |
| `balanced?` | pipe command | Contraction Zero | No |
| `axis:NS` etc. | direction extension | Linear Number | No |
| `gradient` | pipe command | Linear Number | No |
| `curvature` | pipe command | Linear Number | No |
| `symmetric?` | pipe command | Linear Number | No |
| `project_all` | pipe command | Linear Number | No |
| `laplacian` | pipe command | Linear Number | No |
| `gradient_vector` | pipe command | Linear Number | No |
| `gradient_magnitude` | pipe command | Linear Number | No |
| `gradient_direction` | pipe command | Linear Number | No |
| `decompose_axes` | pipe command | Linear Number | No |
| `・` / `dot` | literal | Point Number | No |
| `simplex(n)` | literal | Point Number | No |
| `dim` | pipe command | Point Number | No |
| `undim` | pipe command | Point Number | No |
| `skeleton` | pipe command | Point Number | No |

**New keywords: 3** (`dot`, `simplex`, `axis`)  
**New operators: 0** (reuses existing `⊕`, `<<`, `|>`)  
**New literals: 2** (`0̃`, `・`)  
**Breaking changes: 0**

---

## License

This design document is part of the Rei / D-FUMT project.  
Theory: © Nobuki Fujimoto — CC BY-NC-SA 4.0  
Implementation: Apache License 2.0  
See NOTICE file for protected computational model elements.
