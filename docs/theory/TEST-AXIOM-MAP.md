# Rei テスト-公理依存マップ（Test-Axiom Dependency Map）

**Version:** 1.0  
**Date:** 2026-02-16  
**Author:** Nobuki Fujimoto (藤本伸樹)  
**対象:** v0.5.5（約1,533テスト / 42テストファイル）

---

## 概要

v0.5.5の全テストを、依存する公理（A1〜A4）で分類する。  
各テストファイルは、テスト内容が実際に依存する**最小の公理集合**にマッピングされる。

### 公理の凡例

| 公理 | 軸 | 内容 |
|------|-----|------|
| **A1** | 空間 | 中心-周囲構造（MDim） |
| **A2** | 深度 | 拡張-縮約（⊕ / ⊖ / ExtNum） |
| **A3** | 時間 | σ蓄積（メタデータ・履歴・傾向性） |
| **A4** | 存在 | 生成相転移（Genesis: void → ・ → 0₀ → 0 → ℕ） |

---

## ファイル別分類

### A1 のみ（中心-周囲構造）

| ファイル | テスト数 | 内容 | 依存定理 |
|---------|---------|------|---------|
| benchmark-suite.test.ts | 14 | MDimベンチマーク（画像カーネル、多次元集約） | T1, T2 |

### A1 + A2（構造 + 深度）

| ファイル | テスト数 | 内容 | 依存定理 |
|---------|---------|------|---------|
| interpreter.test.ts | 91 | 言語の全機能（数値、拡張数、MDim、compress、パイプ） | T1, T2, T4, T5 |
| kanji.test.ts | 49 | 漢字MDim（文字列の中心-周囲 + 深度表現） | T1, T8 |
| rct_compress.test.ts | 13 | RCT圧縮/展開 | T8 |
| rct_semantic.test.ts | 31 | RCTセマンティック圧縮 | T8 |
| rct_semantic_integration.test.ts | 13 | RCTセマンティック統合 | T8 |

### A1 + A3（構造 + 履歴）

| ファイル | テスト数 | 内容 | 依存定理 |
|---------|---------|------|---------|
| space.test.ts | 1 | Space-Layer-Diffusion | T12 |
| game.test.ts | 55 | ゲーム空間（ランダム、エントロピー、三目並べ） | T12, T10 |
| puzzle.test.ts | 33 | パズルエンジン（制約伝播、解法、σ） | T12, T9 |
| natural-science.test.ts | 42 | 自然科学（N体シミュレーション、波動、粒子） | T13 |
| info-engineering.test.ts | 34 | 情報工学（ETLパイプライン、エージェント） | T13 |
| humanities.test.ts | 48 | 人文科学（意味ネットワーク、社会シミュレーション、倫理） | T13 |
| event-bus.test.ts | 22 | イベントバス（Pub/Sub） | T9 |
| serializer.test.ts | 23 | シリアライズ（σ来歴の保存・復元） | T9 |

### A3 のみ（σ蓄積）

| ファイル | テスト数 | 内容 | 依存定理 |
|---------|---------|------|---------|
| sigma-deep.test.ts | 47 | σ深化（流れ、記憶、層、関係、意志） | T6, T7 |

### A1 + A2 + A3（構造 + 深度 + 履歴）

| ファイル | テスト数 | 内容 | 依存定理 |
|---------|---------|------|---------|
| tier1.test.ts | 29 | 公理C1: 全値型のσ（数値・文字列・MDim・Ext） | T6, T9 |
| tier2.test.ts | 34 | 射影（配列→MDim、文字列→MDim） | T1, T8 |
| tier3.test.ts | 34 | 全射影・全モード計算・perspectives | T1, T10 |
| tier4.test.ts | 38 | 応答（absorb/distribute/reflect/resonate） | T1, T12 |
| tier5.test.ts | 91 | 共鳴（resonance_field/map/chain）、型変換射影 | T1, T12, T14 |
| integration.test.ts | 52 | 統合テスト（v0.2.1互換〜Tier 5） | T1〜T14 |
| sigma-attributes.test.ts | 51 | 6属性ファーストクラス化（場・流れ・記憶・層・関係・意志） | T6, T14 |
| sigma-reactive.test.ts | 36 | σカスケード反応（relation→will→flow→memory→layer→relation） | T14 |
| sigma-dynamics.test.ts | 46 | 動的カスケード、星座ライフサイクル、共鳴増幅 | T14 |
| relation-will-deep.test.ts | 31 | 関係追跡・影響度・相互結合・意志進化 | T6, T9, T10 |
| autonomy.test.ts | 42 | 自律性（認識・融合・分離・変態） | T9, T11 |
| entity-agent.test.ts | 37 | エージェント（生成・ライフサイクル・perceive/decide/act） | T9, T11 |
| entity-agent-integration.test.ts | 25 | エージェント統合（Evaluator連携） | T9, T11 |
| mediator.test.ts | 25 | メディエーター（調停・競合検出） | T9, T11 |
| mediator-integration.test.ts | 35 | メディエーター統合（Evaluator連携） | T9, T11 |
| agent-space.test.ts | 30 | AgentSpace（パズル基盤・ゲーム基盤・σ） | T12, T11 |
| agent-space-integration.test.ts | 11 | AgentSpace統合 | T12, T11 |
| game-agent.test.ts | 18 | ゲーム推論深化（対局分析・戦術パターン） | T10, T12 |
| game-will-deep.test.ts | 15 | ゲーム×意志深化 | T10, T6 |
| puzzle-agent.test.ts | 19 | パズル推論深化（難易度分析・推論追跡） | T10, T12 |
| puzzle-relation-deep.test.ts | 21 | パズル×関係深化 | T6, T12 |
| phase4d-integration.test.ts | 12 | Phase 4d統合（σ deep × Agent） | T6, T11 |
| phase5-domains.test.ts | 61 | Phase 5ドメイン（B: 自然科学, C: 情報工学, D: 人文科学） | T13 |
| phase6-domains.test.ts | 65 | Phase 6ドメイン（E: 芸術, F: 音楽, G: 経済, H: 言語学） | T13 |
| cross-domain.test.ts | 38 | クロスドメイン（B↔C↔D） | T13 |
| cross-domain-efgh.test.ts | 99 | クロスドメイン（E↔F↔G↔H） | T13 |
| cross-domain-bcd-efgh.test.ts | 74 | クロスドメイン（BCD↔EFGH 全結合） | T13 |

### A1 + A3 + A4（構造 + 履歴 + 生成）

該当テストファイルは未確認。Genesisテストはinterpreter.test.ts内に含まれる可能性あり。

---

## 公理別テスト数の集計

| 公理の組み合わせ | テスト数 | 割合 |
|-----------------|---------|------|
| A1 のみ | 14 | 0.9% |
| A3 のみ | 47 | 3.0% |
| A1 + A2 | 197 | 12.4% |
| A1 + A3 | 258 | 16.3% |
| A1 + A2 + A3 | 1,069 | 67.5% |
| **合計** | **1,585** | **100%** |

---

## 公理別の被依存度

各公理が何件のテストに関与しているか：

| 公理 | 依存テスト数 | 割合 | 解釈 |
|------|------------|------|------|
| **A1** | 1,538 | 97.0% | ほぼ全テストが中心-周囲構造に依存 |
| **A2** | 1,266 | 79.9% | 拡張数・深度を使うテストが大半 |
| **A3** | 1,374 | 86.7% | σ蓄積は大半のテストに浸透 |
| **A4** | ≈0 | ≈0% | Genesis 単独テストは現在ほぼ不在 |

---

## 重要な発見

### 1. A1（中心-周囲）は97%のテストに浸透

ほぼ全てのテストが MDim 構造を直接的または間接的に使用している。これは A1 が Rei の最も基底的な公理であることの実証的裏付け。

### 2. A4（Genesis）のテストカバレッジが極めて低い

Genesis の相転移（void → ・ → 0₀ → 0 → ℕ）を直接テストするテストケースが現在のテストスイートにほぼ存在しない。interpreter.test.ts内にGenesis関連の記述がある可能性はあるが、独立したテストファイルがない。

**推奨:** A4 専用のテストファイル `tests/genesis.test.ts` を作成し、以下を検証すべき：
- 各相転移（G-E₁, G-S₀, G-S₁, G-N₁）の正確な動作
- 遮断規則（Firewall Rule）の厳密な検証
- 定理 S₀, S₁ の一意性証明
- A4 → A2 の整合性（Genesis内の0₀ = A2の0⊕o）

### 3. A1+A2+A3 の三重依存が67.5%

テストの2/3以上が3公理全てに依存している。これはReiの体系が「3公理の協調動作」を本質とすることを意味する。個々の公理より、公理間の相互作用が体系の力の源泉。

### 4. ドメインテストの公理依存は均一

7ドメイン関連テスト（phase5, phase6, cross-domain系: 計337件）は全て A1+A3 に依存。ドメインが異なっても公理依存パターンは同一であり、**ドメインは公理の応用であって公理ではない**ことが数値的に確認された。

---

## テスト-定理-公理の三層構造

```
テスト層（1,585件）
  │
  │ 各テストは1つ以上の定理に依存
  ▼
定理層（T1〜T15）
  │
  │ 各定理は1〜3個の公理から導出
  ▼
公理層（A1〜A4）

例:
  cross-domain-efgh.test.ts (99テスト)
    → T13 (7ドメイン) に依存
      → A1 (場としてのデータ) + A3 (σの保持) から導出
        → 2公理が99テストを支えている
```

---

## 次のアクション

1. **A4 テストの作成** — genesis.test.ts（目標: 20〜30テスト）
2. **interpreter.test.ts の分解分析** — 91テスト中、A4に依存するものの特定
3. **テスト-公理自動タグ付けシステムの検討** — テストファイル内にコメントとして `// @axiom A1, A3` のようなタグを付与

---

© 2024-2026 Nobuki Fujimoto (藤本伸樹)
