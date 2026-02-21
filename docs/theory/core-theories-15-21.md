# Rei (0₀式) 言語コア統合設計書 — 理論 #15〜#21

**Author:** Nobuki Fujimoto  
**Language:** Rei (0₀式 / れいしき)  
**Date:** 2026-02-10  
**Status:** Design Draft  
**Scope:** カテゴリA ★★☆〜★☆☆ 理論群の言語コア統合  

---

## 概要

本設計書は、D-FUMT（Dimensional Fujimoto Universal Mathematical Theory）のうち、Reiの言語コア（演算・構文）に直接組み込むべきカテゴリA理論の残り7件を定義する。前回設計書（#8〜#14）の完了を前提とし、既存のBNF v0.1およびGenesis Axioms v2との整合性を保つ。

### 理論番号対応表

| # | 理論名 | 優先度 | 新キーワード | 新演算子 | 破壊的変更 |
|---|--------|--------|-------------|---------|-----------|
| 15 | 定数縮小理論群（π/e/φ縮小） | ★★☆ | 3 | 0 | 0 |
| 16 | 次元螺旋零点理論（DSZT） | ★★☆ | 2 | 1 | 0 |
| 17 | 無限拡張数学理論 | ★★☆ | 2 | 0 | 0 |
| 18 | 縮小理論（compress/expandの双対性） | ★★☆ | 1 | 1 | 0 |
| 19 | 時相数体系理論 | ★★☆ | 3 | 0 | 0 |
| 20 | 無時間性数体系理論 | ★★☆ | 2 | 0 | 0 |
| 21 | 四価0π理論 | ★☆☆ | 4 | 0 | 0 |
| — | **合計** | — | **17** | **2** | **0** |

全理論がパイプ `|>` コマンドまたは型修飾子として統合され、Reiのコアを破壊しない。

---

## #15 定数縮小理論群（π縮小・e縮小・φ縮小理論）

### 理論的背景

縮小ゼロ理論（#8）が「0₀ → 0̃（動的平衡ゼロ）」への縮約を定義したのに対し、定数縮小理論群は**数学的定数を縮約の到達先（アトラクタ）として用いる**。縮約がゼロに向かうのではなく、πやeやφといった超越数・代数的定数に「引き寄せられる」計算パターンを形式化する。

物理的対応：
- **π縮小** — 周期的現象の縮約（波動が定常波に収束）
- **e縮小** — 指数的減衰の縮約（放射性崩壊が平衡に到達）
- **φ縮小** — 自己相似構造の縮約（フラクタルがスケール不変点に収束）

### Rei構文設計

```rei
// π縮小：周期的パターンへの縮約
let signal = 𝕄{0; sin(t), cos(t), sin(2t), cos(2t), ...}
signal |> compress :pi
// → 基本周期成分のみ残る（フーリエ的縮約）
// 結果: 𝕄{A₀; A₁e^(iωt)} — 中心=DC成分、周囲=基本モード

// e縮小：指数減衰への縮約
let decay_data = 𝕄{N₀; n₁, n₂, n₃, ..., n₈}
decay_data |> compress :e
// → 指数曲線 N₀·e^(-λt) のパラメータ (N₀, λ) に縮約
// 周囲の揺らぎが指数カーブに吸収される

// φ縮小：黄金比的自己相似への縮約
let fractal = 𝕄{root; branch₁, branch₂, ..., branch₈}
fractal |> compress :phi
// → 自己相似的縮約: 各層が φ 比で相似な構造に収束
// 結果: 𝕄{seed; φ·seed, φ²·seed, ...}

// 連鎖縮約（複合パターン）
data |> compress :pi |> compress :e
// まず周期成分を抽出し、次にその包絡線の減衰パラメータを抽出
// → 減衰振動 A·e^(-λt)·sin(ωt) の本質パラメータ
```

### BNF拡張

```ebnf
compress_mode   ::= ':zero'        (* #8 縮小ゼロ理論 *)
                  | ':pi'          (* π縮小 — 周期的縮約 *)
                  | ':e'           (* e縮小 — 指数的縮約 *)
                  | ':phi'         (* φ縮小 — 自己相似縮約 *)
                  | ':' IDENT      (* 将来の拡張用 *)
```

### 数学的定義

**π縮約 (Cπ)**:  
Cπ(𝕄{c; n₁,...,n₈}) = 𝕄{a₀; a₁e^(iω₁t), ...}  
ここで {a₀, aₖ, ωₖ} は離散フーリエ変換の主要成分。  
縮約条件: |aₖ/a₁| < ε のモードを切り捨て。

**e縮約 (Cₑ)**:  
Cₑ(𝕄{c; n₁,...,n₈}) = (c, λ) where nᵢ ≈ c·e^(-λ·iΔt)  
最小二乗適合により λ を決定。

**φ縮約 (Cφ)**:  
Cφ(𝕄{c; n₁,...,n₈}) = 𝕄{s; φ·s, φ²·s, ...}  
ここで s は自己相似スケーリングの種（seed）。  
各層の比が φ = (1+√5)/2 に収束するよう縮約。

### 不変量

- Cπ は位相情報を保存（振幅は縮約可能、位相は不変）
- Cₑ は初期値 c を保存（c = Cₑの中心値）
- Cφ は相似比を保存（隣接層比 → φ）
- 連鎖縮約の順序は一般に非可換: Cπ∘Cₑ ≠ Cₑ∘Cπ（これは物理的に正しい）

---

## #16 次元螺旋零点理論（DSZT: Dimensional Spiral Zero-point Theory）

### 理論的背景

ゼロ拡張理論（0 → 0₀ → 0₀₀ → ...）と螺旋数体系理論（#14）を統合する。ゼロ拡張による次元上昇が「直線的」であるのに対し、DSZTはこの上昇を**螺旋的**に捉える。すなわち、拡張のたびに次元が上がるだけでなく「回転角」が伴い、ある拡張深度で元の位相に近づく（だが完全には一致しない）。

これは物理学における繰り込み群のフローに対応する。エネルギースケールを変えると物理量が変化するが、固定点の周囲を螺旋的に巡回するパターンが現れることがある。

### Rei構文設計

```rei
// 螺旋的ゼロ拡張
let z0 = 0₀
z0 |> spiral_extend(depth: 5, twist: π/4)
// → 各拡張段階で π/4 ずつ回転しながら次元上昇
// 結果: [0₀, 0₀₀∠π/4, 0₀₀₀∠π/2, 0₀₀₀₀∠3π/4, 0₀₀₀₀₀∠π]

// 螺旋零点の検出
let field = 𝕄{f(x,y); ∂f/∂x, ∂f/∂y, ∂²f/∂x², ...}
field |> find_spiral_zeros
// → 場の零点のうち、螺旋的に接近するもの（渦型零点）を検出

// 次元遷移演算子 ⤊（新演算子）
// 螺旋的次元上昇を1ステップ実行
let state = 𝕄{c; n₁,...,n₈}
state ⤊ π/6
// → 次元+1、回転角 π/6 を付加した新しい多次元数
// 逆方向: state ⤋ で次元降下（螺旋を逆回転）
```

### BNF拡張

```ebnf
ext_expr        ::= unary_expr ('>>' ':' SUBSCRIPT | '<<'
                  | '⤊' angle_expr      (* 螺旋的次元上昇 *)
                  | '⤋' angle_expr?     (* 螺旋的次元降下 *)
                  )*

angle_expr      ::= NUMBER              (* ラジアン *)
                  | 'π' '/' NUMBER       (* π分数 *)
                  | IDENT                (* 変数 *)

spiral_cmd      ::= 'spiral_extend' '(' spiral_params ')'
                  | 'find_spiral_zeros'

spiral_params   ::= 'depth' ':' NUMBER (',' 'twist' ':' angle_expr)?
```

### 数学的定義

**螺旋拡張 (S⤊)**:  
S⤊(𝕄ₙ, θ) = 𝕄ₙ₊₁ × R(θ)  
ここで 𝕄ₙ はn次元多次元数、R(θ) は回転行列。

**螺旋零点条件**:  
z が螺旋零点 ⟺ ∃ 数列 {zₖ} s.t. |zₖ| → 0 かつ arg(zₖ₊₁ - zₖ) が等差数列を成す。

**回帰近似定理**:  
深度 d の螺旋拡張で twist = 2π/p（p は整数）ならば、d = p 段後に「ほぼ同じ位相」に戻る。ただし次元は p だけ上昇しているため、厳密な同一性は成立しない。これがゼロ拡張の「螺旋的非閉性」の核心。

---

## #17 無限拡張数学理論

### 理論的背景

ゼロ拡張理論（0の拡張: 0 → 0₀）を**任意の数・記号に一般化**する。0だけでなく、1, 2, 3, ..., 9999, さらには π, e, ∞ なども「拡張」の基底となりうる。

例えば 1₁（1の1拡張）は「1の背後にある構造」を意味し、π_π（πのπ拡張）は「πの自己参照的構造」を意味する。これにより、ゼロ拡張が特殊な場合（基底=0）であることが明らかになり、Reiの拡張演算子 `>>` の適用範囲が劇的に広がる。

### Rei構文設計

```rei
// 従来のゼロ拡張（特殊ケース）
let z = 0 >> :0     // → 0₀（ゼロの0拡張 = 従来通り）

// 一般化拡張
let one_ext = 1 >> :1     // → 1₁（1の1拡張）
let pi_ext  = π >> :π     // → π_π（πの自己参照拡張）
let e_ext   = e >> :2     // → e₂（eの2拡張）

// 多段一般化拡張
let deep = 3 >> :2 >> :1 >> :0
// → 3₂₁₀（3を2拡張し、それを1拡張し、さらに0拡張）

// 拡張の基底を変数として扱う
compress¹ gen_extend(x: Number, base: Number) = x >> :base

// 拡張階層の走査
let hierarchy = 5 >> :3
hierarchy |> extension_depth    // → 1
hierarchy |> extension_base     // → 3
hierarchy |> extension_root     // → 5
```

### BNF拡張

```ebnf
ext_expr        ::= unary_expr ('>>' ':' ext_subscript | '<<'
                  | '⤊' angle_expr | '⤋' angle_expr?
                  )*

ext_subscript   ::= NUMBER             (* 数値拡張: 0, 1, 2, ... *)
                  | MATH_CONST         (* 定数拡張: π, e, φ *)
                  | IDENT              (* 変数拡張 *)

ext_query_cmd   ::= 'extension_depth'
                  | 'extension_base'
                  | 'extension_root'
                  | 'extension_chain'  (* 全拡張履歴を配列で返す *)
```

### 数学的定義

**一般化拡張 (E)**:  
E(x, b) = x_b（x の b拡張）  
ここで x_b は「x の構造的背景のうち b に対応する側面」を表す。

**拡張の公理**:

1. **特殊化公理**: E(0, 0) = 0₀（従来のゼロ拡張と同一）
2. **非自明性公理**: E(x, b) ≠ x（拡張は常に新しい対象を生む）
3. **深度加法性**: depth(E(E(x, b₁), b₂)) = depth(x) + 2
4. **根の保存**: root(E(E(x, b₁), b₂)) = root(x)

**縮約との双対性**:  
x >> :b >> << = x（拡張して縮約すると元に戻る）  
ただし x << >> :b ≠ x（縮約してから拡張すると構造情報が失われる可能性がある）。これは情報理論的に「圧縮は非可逆になりうる」という原理と整合する。

---

## #18 縮小理論（compress/expand の双対性）

### 理論的背景

Reiの `compress` は「複雑な構造を本質に縮約する」操作であるが、その厳密な逆操作 `expand` が未定義であった。縮小理論は、compress と expand を**圏論的双対（adjunction）** として形式化する。

重要な洞察: 完全な逆関数としての expand は一般に存在しない（情報が失われるため）。しかし「最も自然な展開」（＝制約下の最小情報付加による復元）は一意に定義できる。これは統計力学における最大エントロピー原理に対応する。

### Rei構文設計

```rei
// 縮約
let compressed = data |> compress sum
// 𝕄{5; 1,2,3,4,5,6,7,8} → 41

// 展開（逆演算子 ◁）
let restored = 41 ◁ expand :uniform(8)
// → 𝕄{5; 4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5}
// 制約: sum = 41, center = 5, neighbors = 8
// 最大エントロピー解 = 均等分配

// 条件付き展開
let restored2 = 41 ◁ expand :maxent(8, symmetry: :ortho)
// → 直交方向対称性を制約に加えた最大エントロピー展開

// compress-expand 往復チェック
let original = 𝕄{5; 1,2,3,4,5,6,7,8}
let roundtrip = original |> compress sum ◁ expand :uniform(8)
original |> distance(roundtrip)  // → 情報損失量を測定

// パイプチェーン内での双対
data |> compress :pi |> transform |> expand :pi
// π縮約 → 変換 → π展開（周波数領域での処理）
```

### BNF拡張

```ebnf
pipe_expr       ::= curvature_expr (pipe_op IDENT arg*
                  | '◁' expand_cmd    (* 展開演算子 *)
                  )*

expand_cmd      ::= 'expand' expand_mode '(' expand_params ')'

expand_mode     ::= ':uniform'         (* 均等分配展開 *)
                  | ':maxent'          (* 最大エントロピー展開 *)
                  | ':pi'              (* π展開 = 逆フーリエ的 *)
                  | ':e'               (* e展開 = 指数成長的 *)
                  | ':phi'             (* φ展開 = 黄金分割的 *)
                  | ':' IDENT          (* カスタム展開 *)

expand_params   ::= NUMBER                          (* neighbor数 *)
                  | NUMBER ',' constraint_list       (* 制約付き *)

constraint_list ::= constraint (',' constraint)*
constraint      ::= 'symmetry' ':' sym_type
                  | 'preserve' ':' IDENT
                  | 'prior' ':' expr

sym_type        ::= ':ortho' | ':diag' | ':full' | ':none'
```

### 数学的定義

**compress-expand 随伴対 (C ⊣ E)**:

compress C: 𝕄ⁿ → 𝕊（多次元数空間からスカラー空間への射）  
expand  E: 𝕊 → 𝕄ⁿ（スカラー空間から多次元数空間への射）

随伴条件:  
∀ m ∈ 𝕄ⁿ, ∀ s ∈ 𝕊:  
Hom(C(m), s) ≅ Hom(m, E(s))

**最大エントロピー展開**:  
E_maxent(s, n) = argmax_{m ∈ 𝕄ⁿ} H(m)  subject to C(m) = s  
ここで H(m) は多次元数 m のエントロピー。

**情報損失量**:  
L(m) = d(m, E(C(m)))  
L = 0 ⟺ C が可逆（例: compress :pi は位相保存なので L ≈ 0）  
L > 0 ⟺ C が非可逆（例: compress sum は分布情報を喪失）

---

## #19 時相数体系理論

### 理論的背景

多次元数 𝕄{c; n₁,...,n₈} に**時間次元**を付加する。従来の多次元数は「ある瞬間の空間的な中心-周囲関係」を記述するが、時相数体系は「その関係が時間とともにどう変化するか」を言語レベルで表現する。

これにより、物理シミュレーション（熱伝導、波動伝播）、時系列データ分析、動的システムのモデリングがReiの型システム内で自然に記述可能になる。

### Rei構文設計

```rei
// 時相多次元数リテラル
let state_t = 𝕄{5; 1,2,3,4,5,6,7,8 | t=0.0}
// t=0.0 の時刻における空間状態

// 時間発展演算子
let evolved = state_t |> evolve(dt: 0.1, steps: 100, rule: :diffusion)
// → 100ステップの時間発展を実行
// 結果: 時相多次元数の時系列 [𝕄{...| t=0.0}, 𝕄{...| t=0.1}, ...]

// 時刻でのスライス
evolved |> at(t: 5.0)
// → t=5.0 の空間状態を取得

// 時間微分
state_t |> temporal_diff
// → ∂/∂t 𝕄{c; n₁,...,n₈} = 中心-周囲パターンの時間変化率

// 時間窓での集約
evolved |> window(from: 1.0, to: 3.0) |> compress mean
// → t=1.0〜3.0 の時間平均

// 時相型注釈
let heat: Temporal<𝕄> @evolving = 𝕄{100; 20,20,20,20,20,20,20,20 | t=0}
// @evolving: この値は時間発展する（不変ではない）ことを型で宣言
```

### BNF拡張

```ebnf
md_literal      ::= '𝕄' '{' center ';' neighbors temporal_tag? '}'
temporal_tag    ::= '|' 't' '=' expr

temporal_cmd    ::= 'evolve' '(' evolve_params ')'
                  | 'at' '(' 't' ':' expr ')'
                  | 'temporal_diff'
                  | 'window' '(' 'from' ':' expr ',' 'to' ':' expr ')'

evolve_params   ::= 'dt' ':' expr ',' 'steps' ':' expr
                     (',' 'rule' ':' evolve_rule)?

evolve_rule     ::= ':diffusion'       (* 拡散方程式 *)
                  | ':wave'            (* 波動方程式 *)
                  | ':advection'       (* 移流方程式 *)
                  | ':custom' '(' expr ')' (* カスタムルール *)

phase_type      ::= ... (* 既存 *)
                  | 'evolving'         (* 時間発展型 *)
                  | 'stationary'       (* 定常型 *)
                  | 'periodic'         (* 周期型 *)
```

### 数学的定義

**時相多次元数 (𝕋𝕄)**:  
𝕋𝕄 = 𝕄 × ℝ₊（多次元数と非負実数の直積）  
𝕋𝕄{c; n₁,...,n₈ | t} は「時刻 t における空間状態」

**時間発展 (T)**:  
T(𝕋𝕄, Δt, R) = 𝕋𝕄' where:  
- t' = t + Δt  
- c' = R(c, n₁,...,n₈)（規則 R による中心の更新）  
- nᵢ' = R(nᵢ, neighbors_of(nᵢ))（周囲の更新）

**拡散規則の例**:  
R_diffusion(c, n₁,...,n₈) = c + α·Δt·(mean(n₁,...,n₈) - c)  
ここで α は拡散係数。これはラプラシアンの離散化そのもの。

**保存則**: 適切な規則 R のもとで、全質量 Σ(c + n₁ + ... + n₈) が保存される。

---

## #20 無時間性数体系理論

### 理論的背景

時相数体系理論（#19）の**圏論的双対**。時相が「変化するもの」を記述するのに対し、無時間性数体系は「時間によって変化しないもの」、すなわち**不変量**を型レベルで保証し、抽出する。

物理学では保存量（エネルギー、運動量、角運動量）に対応し、プログラミングではイミュータブルな計算の保証に対応する。ISL（不可逆構文層）の `Sealed` / `Compacted` 状態は無時間性の具体例である。

### Rei構文設計

```rei
// 無時間性宣言
let constant: Timeless<𝕄> = 𝕄{E₀; p₁,p₂,p₃,L₁,L₂,L₃,S,Q}
// Timeless<𝕄>: この多次元数は時間発展の対象にならない

// 不変量抽出
let evolving_state = 𝕄{100; 20,30,40,50,20,30,40,50 | t=0}
evolving_state |> evolve(dt: 0.1, steps: 1000, rule: :diffusion)
              |> extract_invariant
// → Timeless<Number>: 総質量 = 380（拡散では保存される）

// 不変量チェック（コンパイル時）
let inv = state |> extract_invariant
state |> evolve(...) |> assert_invariant(inv)
// → 時間発展後も不変量が保たれることを検証

// 時相 → 無時間変換
let trajectory = state |> evolve(dt: 0.01, steps: 10000)
trajectory |> timeless_project
// → 時間を「忘れる」：軌道の形状のみを抽出（位相空間の射影）

// 無時間的パイプ（順序不変な計算）
data |> timeless_pipe [sum, mean, max]
// → 計算順序に依存しない3つの不変量を同時抽出
// timeless_pipe は可換な操作のみ受け付ける
```

### BNF拡張

```ebnf
type_expr       ::= ... (* 既存 *)
                  | 'Timeless' '<' type_expr '>'
                  | 'Temporal' '<' type_expr '>'

timeless_cmd    ::= 'extract_invariant'
                  | 'assert_invariant' '(' expr ')'
                  | 'timeless_project'
                  | 'timeless_pipe' '[' cmd_list ']'

cmd_list        ::= IDENT (',' IDENT)*
```

### 数学的定義

**無時間性 (Timeless)**:  
値 v が Timeless ⟺ ∀ t₁, t₂: T(v, t₁) = T(v, t₂)  
すなわち、あらゆる時間発展演算子 T に対して不変。

**不変量抽出 (I)**:  
I: Temporal<𝕄> → Timeless<Number>  
I(trajectory) = {q | ∀ t: q(state(t)) = const}

**Noetherの定理との対応**:  
- 時間並進対称性 → エネルギー保存 → `extract_invariant` が energy を返す
- 空間並進対称性 → 運動量保存 → `extract_invariant` が momentum を返す
- 回転対称性 → 角運動量保存 → `extract_invariant` が angular_momentum を返す

**timeless_pipe の可換性保証**:  
`timeless_pipe [f, g]` は f∘g = g∘f であることをコンパイル時に検証。非可換な操作の組み合わせはコンパイルエラー。

---

## #21 四価0π理論

### 理論的背景

古典論理は二値（true/false）であり、直観主義論理は三値（true/false/undecided）であるが、四価0π理論は**四値論理型**を導入する。4つの値は：

1. **0** — 偽（false）: 確定的に成立しない
2. **1** — 真（true）: 確定的に成立する
3. **0π** — 潜在的偽（latent false）: 現在は偽だが、条件により真になりうる
4. **1π** — 潜在的真（latent true）: 現在は真だが、条件により偽になりうる

「π」は「可能性の回転」を表す。0πは「0の周囲をπ回転した位置」、すなわち偽の裏側にある潜在的真理。量子力学の重ね合わせ状態、仏教哲学の空（くう）（「あるでもなく、ないでもない」）、そしてNULL問題（SQLの三値論理の不十分さ）に対する統一的回答。

### Rei構文設計

```rei
// 四価リテラル
let definite_yes: Quad = ⊤       // true (1)
let definite_no:  Quad = ⊥       // false (0)
let latent_yes:   Quad = ⊤π      // latent true (1π)
let latent_no:    Quad = ⊥π      // latent false (0π)

// 四価論理演算
⊤  ∧ ⊤π  // → ⊤π（確定真 ∧ 潜在真 = 潜在真）
⊥  ∨ ⊥π  // → ⊥π（確定偽 ∨ 潜在偽 = 潜在偽）
⊤π ∧ ⊥π  // → ⊥π（両方潜在 → 潜在偽が優先）

// 潜在性の解決（条件による確定化）
let maybe_valid: Quad = ⊤π
maybe_valid |> resolve(condition: x > 0)
// → x > 0 なら ⊤、そうでなければ ⊥

// 四価パターンマッチ
match status {
  ⊤  => "確定的に成立",
  ⊥  => "確定的に不成立",
  ⊤π => "条件付きで成立しうる",
  ⊥π => "条件付きで不成立になりうる",
}

// 多次元数との統合
let quantum_state = 𝕄{⊤π; ⊤, ⊥, ⊤π, ⊥π, ⊤, ⊥, ⊤π, ⊥π}
quantum_state |> certainty
// → 確定度: 4/9 = 0.444...（⊤と⊥の数 / 全要素数）
quantum_state |> collapse
// → 全⊤πを⊤に、全⊥πを⊥に確定化
```

### BNF拡張

```ebnf
quad_literal    ::= '⊤'              (* true *)
                  | '⊥'              (* false *)
                  | '⊤π'             (* latent true *)
                  | '⊥π'             (* latent false *)

type_expr       ::= ... (* 既存 *)
                  | 'Quad'            (* 四価論理型 *)

quad_cmd        ::= 'resolve' '(' 'condition' ':' expr ')'
                  | 'certainty'       (* 確定度を算出 *)
                  | 'collapse'        (* 全潜在値を確定化 *)
                  | 'is_latent'       (* ⊤πまたは⊥πか判定 *)
                  | 'is_definite'     (* ⊤または⊥か判定 *)

(* 四価論理演算は既存の論理演算子を拡張 *)
logic_expr      ::= quad_literal
                  | expr '∧' expr     (* AND — 四価拡張 *)
                  | expr '∨' expr     (* OR — 四価拡張 *)
                  | '¬' expr          (* NOT — 四価拡張 *)
```

### 数学的定義

**四価束 (Q, ≤)**:
```
        ⊤ (true)
       / \
     ⊤π   ⊥π
       \ /
        ⊥ (false)
```

順序: ⊥ ≤ ⊥π ≤ ⊤ かつ ⊥ ≤ ⊤π ≤ ⊤  
⊤π と ⊥π は**非比較**（どちらが「大きい」とは言えない）。

**四価論理演算表**:

| ∧ | ⊤ | ⊤π | ⊥π | ⊥ |
|---|---|----|----|---|
| **⊤** | ⊤ | ⊤π | ⊥π | ⊥ |
| **⊤π** | ⊤π | ⊤π | ⊥π | ⊥ |
| **⊥π** | ⊥π | ⊥π | ⊥π | ⊥ |
| **⊥** | ⊥ | ⊥ | ⊥ | ⊥ |

| ∨ | ⊤ | ⊤π | ⊥π | ⊥ |
|---|---|----|----|---|
| **⊤** | ⊤ | ⊤ | ⊤ | ⊤ |
| **⊤π** | ⊤ | ⊤π | ⊤π | ⊤π |
| **⊥π** | ⊤ | ⊤π | ⊥π | ⊥π |
| **⊥** | ⊤ | ⊤π | ⊥π | ⊥ |

| ¬ | 結果 |
|---|------|
| ⊤ | ⊥ |
| ⊥ | ⊤ |
| ⊤π | ⊥π |
| ⊥π | ⊤π |

**resolve 関数**:  
resolve(⊤, c) = ⊤（確定値は変化しない）  
resolve(⊥, c) = ⊥（確定値は変化しない）  
resolve(⊤π, c) = if c then ⊤ else ⊥  
resolve(⊥π, c) = if c then ⊥ else ⊤（⊥πが解決されると反転）

---

## 理論間接続マップ

```
                    #17 無限拡張
                    (一般化拡張)
                        │
                        ▼
    #8 縮小ゼロ ◄──── #15 定数縮小群 ────► #18 縮小理論
    (0̃ = 動的平衡)    (πeφアトラクタ)      (compress⊣expand)
         │                  │                      │
         ▼                  ▼                      ▼
    #14 螺旋数体系 ◄── #16 DSZT ──────► #19 時相数体系
    (回転トラバーサル)  (螺旋的次元遷移)    (時間次元付加)
                                                   │
    #13 合わせ鏡 ─────────────────────► #20 無時間性
    (振動の固定点)                        (不変量抽出)
         │
         ▼
    #21 四価0π
    (潜在性 = 振動の位相状態)
```

### 特筆すべき接続

1. **#15 → #18**: π縮小の逆操作がπ展開。定数縮小理論は縮小理論の特殊化。
2. **#16 → #19**: DSZTの螺旋的次元遷移は時相数体系の「時間＋回転」の特殊ケース。
3. **#19 ↔ #20**: 時相と無時間は圏論的双対。Temporal の不変部分が Timeless。
4. **#13 → #21**: 合わせ鏡の振動が ⊤ と ⊥ の間を行き来する → ⊤π/⊥π は振動の中間状態。
5. **完全サイクルの拡張**:

```
・ → simplex → 𝕄 → 計算 → 0₀ → 0̃ → ・
                ↓拡張
・ → simplex → 𝕋𝕄 → 時間発展 → 不変量抽出 → Timeless → ・
                            ↓
                    四価論理で潜在性を記述
```

---

## BNF v0.1 への差分サマリ

### 新キーワード（17個）

| キーワード | 理論 | 用途 |
|-----------|------|------|
| `:pi`, `:e`, `:phi` | #15 | compress モード拡張 |
| `spiral_extend`, `find_spiral_zeros` | #16 | 螺旋的拡張・零点検出 |
| `extension_depth`, `extension_chain` | #17 | 一般化拡張の照会 |
| `expand` | #18 | compress の双対 |
| `evolve`, `at`, `temporal_diff` | #19 | 時間発展操作 |
| `extract_invariant`, `timeless_pipe` | #20 | 不変量抽出 |
| `Quad`, `resolve`, `certainty`, `collapse` | #21 | 四価論理型と操作 |

### 新演算子（2個）

| 演算子 | 理論 | 意味 |
|--------|------|------|
| `⤊` / `⤋` | #16 | 螺旋的次元上昇/降下 |
| `◁` | #18 | 展開演算子（expand前置） |

### 新型（3個）

| 型 | 理論 | 意味 |
|----|------|------|
| `Temporal<T>` | #19 | 時間発展する値 |
| `Timeless<T>` | #20 | 時間不変な値 |
| `Quad` | #21 | 四価論理型 |

### 破壊的変更: 0件

全7理論は既存のパイプ `|>` コマンド、型修飾子、compress モード、または新演算子として追加され、既存構文との衝突はない。

---

## #8〜#21 累計統計

| 範囲 | 理論数 | 新キーワード | 新演算子 | 新型 | 破壊的変更 |
|------|--------|-------------|---------|------|-----------|
| #8〜#10 | 3 | 7 | 0 | 0 | 0 |
| #11〜#14 | 4 | 7 | 0 | 0 | 0 |
| #15〜#21 | 7 | 17 | 2 | 3 | 0 |
| **累計** | **14** | **31** | **2** | **3** | **0** |

14理論を追加して新演算子がわずか2個、破壊的変更が0件。Reiのコア設計の抽象化レベルが正しいことの強い証拠。
