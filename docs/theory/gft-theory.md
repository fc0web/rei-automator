# GFT: Graphic Formula Theory / 図式数式理論
# Visual Graph Representation of Mathematical Formulas

**Author / 考案者:** Nobuki Fujimoto (藤本伸樹)
**License:** CC BY-NC-SA 4.0 (see LICENSE-THEORY.md)
**Part of:** D-FUMT (Dimensional Fujimoto Universal Mathematical Theory)

---

## Overview / 概要

GFT (Graphic Formula Theory / 図式数式理論) represents mathematical formulas as directed graphs. It provides a unified visual language for all mathematical structures within D-FUMT, seamlessly integrating with multi-dimensional numbers, the genesis axiom system, and the Rei language.

GFT（図式数式理論）は、数式を有向グラフとして表現する理論である。D-FUMT内のすべての数学的構造に対する統一的な視覚言語を提供し、多次元数、生成公理系、Rei言語とシームレスに統合する。

## Core Concepts / 基本概念

### Nodes = Mathematical Objects / ノード＝数学的対象

| Node Kind | Description | Example |
|-----------|-------------|---------|
| value | Numerical literal | 5, 3.14, 0 |
| variable | Named variable | x, y, θ |
| operator | Mathematical operator | +, -, ×, ÷, ^ |
| function | Function | sin, cos, exp, log |
| multidim | Multi-dimensional number | [5; 1,2,3,4] |
| extended | Extended number | 0₀, 0ooo, πxx |
| unified | Unified number | Combined multi-dim + extended |
| genesis | Genesis phase | ∅, ・, 0₀, 0, ℕ |
| pipe | Data flow | \|> operator |
| compress | Function definition | compress keyword |

### Edges = Mathematical Relationships / エッジ＝数学的関係

| Edge Kind | Description | Visual |
|-----------|-------------|--------|
| input | Argument → operator | Solid line |
| output | Operator → result | Gold line |
| dependency | Dependency relation | Dashed line |
| extension | ⊕ extension | Green, animated |
| reduction | ⊖ reduction | Red, animated |
| pipe | \|> data flow | Cyan, animated |
| genesis | Phase transition ⇒G | White, animated |
| neighbor | Multi-dim adjacency | Blue, curved |
| transform | Transformation | Purple |

## Natural Layout Mapping / 自然なレイアウト対応

A key insight of GFT is that different mathematical structures naturally correspond to different graph layouts:

GFTの重要な洞察は、異なる数学的構造が異なるグラフレイアウトに自然に対応するということである。

### Multi-Dimensional Numbers → Radial Layout

```
        n₁
       / 
  n₄ — C — n₂    Center surrounded by neighbors
       \
        n₃
```

The center-neighbor structure of multi-dimensional numbers maps directly to a radial graph where the center node is surrounded by neighbor nodes at equal angular intervals.

### Genesis Axiom System → Hierarchical Layout

```
  ℕ
  ↑ G-N₁
  0
  ↑ G-S₁
  0₀
  ↑ G-S₀
  ・
  ↑ G-E₁
  ∅
```

The phase progression of the genesis system maps to a vertical hierarchy, with each phase transition represented as an upward edge.

### Expression Trees → Tree Layout

```
      +
     / \
    ×   4
   / \
  2   3
```

Standard mathematical expressions map to tree structures with operators as internal nodes and values/variables as leaves.

### Grid Computations → Grid Layout

```
  [1] [2] [3]
  [4] [5] [6]
  [7] [8] [9]
```

Multi-dimensional number grids map directly to matrix-like arrangements.

## Graph Transforms / グラフ変換

GFT defines operations that transform formula graphs:

| Transform | Description | Operator |
|-----------|-------------|----------|
| extend | Add dimension to node | ⊕ |
| reduce | Remove dimension from node | ⊖ |
| collapse | Fold subgraph into single node | — |
| expand | Unfold node into subgraph | — |
| substitute | Replace variable with value | — |
| simplify | Remove identity elements | — |
| decompose | Multi-dim → individual nodes | — |
| compose | Individual nodes → multi-dim | — |

These transforms correspond directly to Rei language operators, enabling a seamless pipeline:

```
formula → parse → GFT graph → transform → GFT graph → render
```

## Integration with Rei / Reiとの統合

In the Rei language, GFT is accessed through the `gft()` function and pipe operators:

```
// Expression → Graph → Layout → Render
gft("2 + 3 * x") |> layout("tree") |> render

// Multi-dim → Graph → Radial visualization
[5; 1, 2, 3, 4] |> gft |> layout("radial") |> render

// Genesis → Hierarchical visualization
genesis |> gft |> layout("hierarchical") |> render

// Graph transforms via operators
gft(expr) |> extend("x") |> simplify |> render
```

## Theoretical Properties / 理論的性質

### Completeness (完全性)
Every D-FUMT mathematical expression has a corresponding GFT graph representation.

### Faithfulness (忠実性)
The GFT representation preserves all mathematical relationships of the original expression.

### Compositionality (合成性)
The GFT graph of a compound expression is composed of the GFT graphs of its subexpressions.

### Reversibility (可逆性)
A GFT graph can be converted back to a mathematical expression (under certain well-formedness conditions).

---

© 2024-2026 Nobuki Fujimoto (藤本伸樹)
This document is licensed under CC BY-NC-SA 4.0.
Commercial use requires separate written permission from the author.
