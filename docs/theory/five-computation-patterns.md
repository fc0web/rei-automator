# Rei 5計算パターン — フラクタル・波紋・脈動・共鳴・浸透

## — Five Computation Patterns: Rei Axiom-Derived Dynamics —

**Document ID**: REI-5CP-v1.0
**著者**: 藤本伸樹 (Nobuki Fujimoto)
**日付**: 2026-02-17
**前提**: Rei v0.5.5+ / Phase 8a / 4公理 (A1–A4) / 6属性
**関連文書**: PHASE8-DESIGN.md, REI-LIFE-AXIOM-DERIVATION.md

---

## 0. 概要

Rei の4公理は静的な構造定義だけでなく、
**動的な計算パターン**を自然に生成する。

本稿では、4公理の組み合わせから導出される
5つの基本計算パターンを定義・定式化する。

```
パターン       起源公理        本質                  自然界の対応
──────       ──────        ──────              ──────────
1. フラクタル   A2             自己相似的再帰          海岸線、シダの葉
2. 波紋         A1             中心→周囲への伝播      水面の波紋、地震波
3. 脈動         A2 × A3        拡張↔縮約の周期交替    心臓、潮汐
4. 共鳴         A1 × A3        複数系の同期的振動      音叉、脳波同期
5. 浸透         A1 × A2        層を越えた拡散浸透      地下水、情報拡散
```

5パターンは Rei の計算における「動詞」に相当する。
4公理が「名詞」（構造）を定義するのに対し、
5パターンは「構造がどう動くか」を定義する。

---

## 1. フラクタル（Fractal）

### 1.1 定義

```
フラクタル計算: 拡張 ⊕ を自己参照的に繰り返し適用し、
各深度で相似な構造を生成するパターン。

F(v, depth) =
  | depth = 0 → v
  | depth > 0 → (c, {F(nᵢ, depth-1) | nᵢ ∈ N}, μ, w)

起源: A2（拡張-縮約）の再帰的適用
特徴: スケール不変性 — どの深度でも同じ構造が現れる
```

### 1.2 数式

```
自己相似性条件:
  structure(F(v, d)) ≅ structure(F(v, d+k))  ∀ k ≥ 0

フラクタル次元（Rei版）:
  D_F = lim_{d→∞} log(N(d)) / log(S(d))
  where N(d) = 深度 d での要素数
        S(d) = 深度 d でのスケール因子

A3 との接続:
  各深度の展開は Σ に記録される。
  Σ_fractal = {(d, structure(d)) | d = 0, 1, 2, ...}
  履歴そのものがフラクタル構造を持つ。
```

### 1.3 計算ルール

```
fractal(center, periphery, depth, scale):
  if depth <= 0: return center
  scaled_periphery = periphery.map(n => n * scale)
  children = scaled_periphery.map(n =>
    fractal(n, periphery, depth - 1, scale)
  )
  return compute(center, children, μ, w)

パラメータ:
  depth  — 再帰の深さ（整数 ≥ 0）
  scale  — 各深度でのスケール因子（0 < scale < 1）
```

---

## 2. 波紋（Ripple）

### 2.1 定義

```
波紋計算: 中心 c からの変化が周囲 N へ、
さらにその周囲へと同心円的に伝播するパターン。

R(c, t) = A · sin(k·d(x,c) - ω·t) · e^{-γ·d(x,c)}

起源: A1（中心-周囲）の動的拡張
特徴: 中心からの距離に応じた減衰伝播
```

### 2.2 数式

```
波紋場:
  φ(x, t) = A₀ · sin(2π(d/λ - t/T)) · e^{-αd}

  A₀  — 初期振幅（中心での変化量）
  d   — 中心からの距離: d = |x - c|
  λ   — 波長（伝播の空間スケール）
  T   — 周期（伝播の時間スケール）
  α   — 減衰率（距離に対する減衰）

離散版（Rei の周囲構造上）:
  v_i(t+1) = v_i(t) + β · Σⱼ∈N(i) w_ij · (v_j(t) - v_i(t)) - γ · v_i(t)

  β — 伝播強度
  γ — 減衰係数

A3 との接続:
  波紋の通過は各ノードの Σ に記録される。
  「この値は時刻 t に波紋の影響を受けた」という痕跡。
```

### 2.3 計算ルール

```
ripple(center, nodes, amplitude, decay, steps):
  values = nodes.map(() => 0)
  values[center_index] = amplitude
  for step in 0..steps:
    new_values = values.map((v, i) =>
      v + β · Σ(neighbors(i).map(j => w[i][j] * (values[j] - v))) - γ * v
    )
    values = new_values
    record_sigma(step, values)  // A3: 痕跡記録
  return values
```

---

## 3. 脈動（Pulse）

### 3.1 定義

```
脈動計算: 拡張 ⊕ と縮約 ⊖ を交互に繰り返し、
周期的な膨張-収縮サイクルを生成するパターン。

P(v, t) =
  | t mod 2 = 0 → v ⊕ s(t)   （拡張相）
  | t mod 2 = 1 → ⊖(v)        （縮約相）

起源: A2（拡張-縮約）× A3（σ蓄積による周期性）
特徴: 周期的な状態変動。各サイクルで Σ が蓄積。
```

### 3.2 数式

```
脈動関数:
  v(t) = v₀ + A · sin(2πt/T) · (1 + δ·t)

  v₀ — 基準値
  A  — 脈動振幅
  T  — 脈動周期
  δ  — ドリフト率（A3 の蓄積による漸進的変化）

Rei 版（離散）:
  v(t+1) = 
    | phase(t) = expand  → compute(v(t), N, μ, w) ⊕ pulse_strength(t)
    | phase(t) = contract → ⊖(v(t))

  phase(t) = expand  if sin(2πt/T) ≥ 0
  phase(t) = contract if sin(2πt/T) < 0

A3 蓄積効果:
  各サイクル後の基準値が微小にシフトする:
  v₀(cycle+1) = v₀(cycle) + ε · mean(Σ_cycle)
  
  これは「経験による成長」——脈動を繰り返すたびに
  系が少しずつ変化する——の数学的表現。
```

### 3.3 計算ルール

```
pulse(center, periphery, amplitude, period, cycles):
  v = center
  history = []
  for cycle in 0..cycles:
    for t in 0..period:
      phase = sin(2π * t / period)
      if phase >= 0:
        v = expand(v, periphery, amplitude * phase)
      else:
        v = contract(v, abs(phase))
      history.push({cycle, t, v, phase})
    v = v + drift(history)  // A3: 蓄積によるドリフト
  return {final: v, history}
```

---

## 4. 共鳴（Resonance）

### 4.1 定義

```
共鳴計算: 複数の中心-周囲系が相互作用し、
振動数が一致したとき出力が急激に増幅するパターン。

起源: A1（複数の中心-周囲系）× A3（履歴による同期）
特徴: 非線形増幅。個別の系の和を超える出力。
      Phase 7d（創発）の具体的な計算パターン。
```

### 4.2 数式

```
結合振動子モデル（Rei版）:
  v_i(t+1) = compute(c_i, N_i, μ_i, w_i)
             + K · Σⱼ sin(θⱼ(t) - θᵢ(t))

  θᵢ(t) — 系 i の位相
  K      — 結合強度

共鳴条件:
  |ω_i - ω_j| < ε  （振動数の差が閾値以下）
  ∧ K > K_c          （結合強度が臨界値以上）

  → 位相同期: lim_{t→∞} |θᵢ(t) - θⱼ(t)| = 0

共鳴時の増幅:
  output_resonant = Σᵢ Aᵢ · cos(θᵢ)
  ≫ Σᵢ |Aᵢ|  when θᵢ ≈ θⱼ  ∀ i,j
  （位相が揃うと振幅が建設的に加算）

A3 蓄積効果:
  共鳴の履歴が Σ に記録され、次回の共鳴が起きやすくなる:
  K_eff(t) = K + α · count(resonance_events in Σ)
  「一度共鳴した系は再び共鳴しやすい」= 学習。
```

### 4.3 計算ルール

```
resonance(systems, coupling, threshold, steps):
  phases = systems.map(s => s.initial_phase)
  frequencies = systems.map(s => s.frequency)
  amplitudes = systems.map(s => s.amplitude)
  
  for step in 0..steps:
    // 位相更新（蔵本モデル的）
    new_phases = phases.map((θ, i) =>
      θ + frequencies[i] + 
      coupling * Σ(systems.map((_, j) => sin(phases[j] - θ))) / systems.length
    )
    
    // 共鳴判定
    phase_coherence = |Σ(exp(i·θⱼ))| / systems.length
    is_resonating = phase_coherence > threshold
    
    if is_resonating:
      amplitudes = amplitudes.map(a => a * amplification_factor)
      record_resonance_event(step)  // A3
    
    phases = new_phases
  
  return {phases, amplitudes, coherence: phase_coherence}
```

---

## 5. 浸透（Permeation）

### 5.1 定義

```
浸透計算: 値が層構造（A2 の深度）を越えて
徐々に拡散していくパターン。

起源: A1（中心-周囲）× A2（層構造）
特徴: 層境界での抵抗と選択的通過。
      波紋が「同一層内での伝播」なのに対し、
      浸透は「層を越える伝播」。
```

### 5.2 数式

```
浸透方程式（Rei版）:
  ∂c/∂t = D_layer · ∇²c - R(layer) · c + S

  D_layer — 層内拡散係数
  R(layer) — 層境界の抵抗（層が深いほど大きい）
  S        — 源泉項

層境界条件:
  J_boundary = P · (c_upper - c_lower)

  P — 透過率（0: 完全不透過、1: 完全透過）
  P は層の深度差に依存:
    P(d₁, d₂) = e^{-β|d₁ - d₂|}

離散版:
  v(layer, t+1) = v(layer, t)
    + D · (v(layer-1, t) + v(layer+1, t) - 2·v(layer, t))  // 層内拡散
    + P_up · (v(layer-1, t) - v(layer, t))                   // 上層から浸透
    + P_down · (v(layer+1, t) - v(layer, t))                 // 下層から浸透
    - R · v(layer, t)                                         // 層抵抗による減衰

A3 蓄積効果:
  浸透の履歴により透過率が変化:
  P(t) = P₀ + η · flux_history(Σ)
  「頻繁に浸透が起きた経路は透過率が上がる」= 慣れ。
```

### 5.3 計算ルール

```
permeation(layers, source_layer, initial_value, permeability, steps):
  values = layers.map(() => 0)
  values[source_layer] = initial_value
  
  for step in 0..steps:
    new_values = values.map((v, layer) => {
      diffusion = 0
      if layer > 0:
        P_up = permeability * exp(-β * 1)  // 隣接層
        diffusion += P_up * (values[layer-1] - v)
      if layer < layers.length - 1:
        P_down = permeability * exp(-β * 1)
        diffusion += P_down * (values[layer+1] - v)
      return v + diffusion - resistance * v
    })
    values = new_values
    record_sigma(step, values)  // A3
  
  return values
```

---

## 6. 5パターンの相互関係

```
           フラクタル
          (深度方向の再帰)
               ↑
               |
  波紋 ←── 中心-周囲 ──→ 浸透
(同一層の伝播)   基盤構造   (層を越える伝播)
               |
               ↓
         脈動 ←→ 共鳴
    (単一系の振動) (複数系の同期)

統合パターン:
  波紋 + 脈動 = 脈動しながら波紋を放つ（心臓の拍動 → 血流）
  フラクタル + 浸透 = 各深度で異なる浸透率（多孔質体の拡散）
  共鳴 + 波紋 = 共鳴した系が同期的に波紋を放つ（地震波の干渉）
  脈動 + 共鳴 = 複数の脈動系が同期する（生体リズムの同期）
  フラクタル + 共鳴 = スケール横断的な共鳴（臨界現象）
```

---

## 7. 4公理・6属性との対応表

```
パターン   A1  A2  A3  A4  field flow memory layer relation will
────────  ──  ──  ──  ──  ───── ──── ────── ───── ──────── ────
フラクタル  △   ◎   ○   △    ○    △     ○     ◎     △      △
波紋        ◎   △   ○   △    ◎    ◎     ○     △     ○      △
脈動        △   ◎   ◎   △    ○    ◎     ◎     △     △      ○
共鳴        ◎   △   ◎   △    ○    ○     ◎     △     ◎      ○
浸透        ◎   ◎   ○   △    ◎    ○     ○     ◎     ○      △

◎ = 主要起源  ○ = 関連  △ = 間接的関連
```

---

**文書終端**

```
REI-5CP-v1.0
theory/five-computation-patterns.md
Rei (0₀式) — D-FUMT
© 2026 Nobuki Fujimoto
```
