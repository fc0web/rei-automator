# 十二因縁と西洋思想の並行構造 — Rei Phase 8 実装との対応

## Twelve Nidānas, Western Philosophical Parallels, and Rei Phase 8 Implementation

**Author:** 藤本 伸樹 (Nobuki Fujimoto)  
**Date:** 2026-02-16  
**Related:** LAD §5, PHASE8-DESIGN.md, life-entity.ts  
**License:** CC BY 4.0

---

## §1 概要 / Overview

LAD (Life Axiom Derivation) §5 では、Phase 8 の生命エンティティ実装を仏教の十二因縁（十二縁起, Dvādaśa-nidāna）の構造と対応づけた。本文書では、この対応を西洋哲学の諸体系と比較し、Rei 言語の実装が思想史上どこに位置するかを明らかにする。

The LAD §5 framework maps Phase 8's life-entity implementation onto the Buddhist doctrine of Twelve Nidānas (Dependent Origination). This document examines parallel structures in Western philosophy and clarifies the intellectual-historical significance of Rei's computational model.

---

## §2 十二因縁 × Phase 8 実装対応表 / Nidāna–Implementation Mapping

| # | 十二因縁 | Pāli | Phase 8 実装箇所 | 概要 |
|---|---------|------|-----------------|------|
| 1 | 無明（無知） | avijjā | `genesis.ts`: void | 分化以前の無規定状態 |
| 2 | 行（形成力） | saṅkhāra | `genesis.ts`: void → ・ | 最初の区別の生成力 |
| 3 | 識（意識の種） | viññāṇa | `genesis.ts`: ・ → 0₀ | 原初的自己参照の発生 |
| 4 | 名色（心身） | nāmarūpa | `genesis.ts`: 0₀ → 0 | 構造と内容の分離 |
| 5 | 六処（感覚器官） | saḷāyatana | `genesis.ts`: 0 → ℕ | 多数性・離散性の獲得 |
| 6 | 触（接触） | phassa | `8a`: LifeEntity.self.periphery | 環境との境界接触 |
| 7 | 受（感受） | vedanā | `8b`: metabolism.ts | 環境入力の受容・評価 |
| 8 | 愛（渇愛） | taṇhā | `8b`: adaptMetabolism | 資源への指向性 |
| 9 | 取（執着） | upādāna | `8b`: detectStarvation | 資源の保持・欠乏検知 |
| 10 | 有（存在） | bhava | `8c`: genesis-ladder 'autopoietic' | 自己産出的存在の確立 |
| 11 | 生（誕生） | jāti | `8d`: colony-life runGeneration | 世代生成・個体発生 |
| 12 | 老死（老いと死） | jarāmaraṇa | `8e`: simulateDeath | 消滅と条件の解放 |

---

## §3 西洋思想における並行構造 / Western Philosophical Parallels

### §3.1 最も近い全体構造：新プラトン主義の流出論

プロティノス（Plotinus, 205–270）の体系では、「一者（τὸ ἕν / to hen）」から知性（νοῦς / nous）、魂（ψυχή / psyche）、物質（ὕλη / hyle）へと段階的に流出（emanation）し、物質界で分散・衰退する。この**下降の連鎖**は、十二因縁の「無明 → … → 老死」という条件依存の連鎖と構造的に類似する。

**相違点:** 新プラトン主義は一方向的な流出であり、帰還（ἐπιστροφή / epistrophe）は別の運動として記述される。十二因縁では、老死が再び無明を条件づける**円環構造**が本質的である。

### §3.2 個別対応の詳細

| 十二因縁 | 西洋の並行概念 | 思想家 | 対応の根拠 |
|---------|-------------|-------|-----------|
| 無明（avijjā） | 純粋質料（ὕλη） | アリストテレス | 一切の規定性を欠く基体 |
| 無明（avijjā） | 純粋有＝純粋無 | ヘーゲル | 『大論理学』冒頭：無規定の有は無と等しい |
| 行→識（saṅkhāra→viññāṇa） | モナドの発生 | ライプニッツ | 無限小の知覚（petites perceptions）から明晰な統覚へ |
| 行→識→名色 | 把握（prehension） | ホワイトヘッド | 現実的存在の自己構成プロセス |
| 六処→触→受 | 感性論（Ästhetik） | カント | 感覚の受容形式としての時間・空間 |
| 愛→取（taṇhā→upādāna） | コナトゥス（conatus） | スピノザ | 自己の存在に固執する努力 |
| 愛→取 | 気遣い（Sorge） | ハイデガー | 現存在の存在様式としての関心 |
| 有→生→老死 | 被投性→死への存在 | ハイデガー | 『存在と時間』：投げ出された存在者の有限性 |

### §3.3 最も構造的に近い体系：ホワイトヘッドのプロセス哲学

A.N. ホワイトヘッド（1861–1947）の「現実的存在（actual entity）」は以下のプロセスを経る：

```
感受 (feeling) → 把握 (prehension) → 合生 (concrescence) → 満足 (satisfaction) → 消滅 (perishing)
```

これは十二因縁の後半、「触 → 受 → … → 老死」の流れとほぼ対応する。ホワイトヘッド自身が仏教との親和性を認識していたことは注目に値する。

さらに、ホワイトヘッドの「消滅した現実的存在が後続の存在にとっての客体的与件（objective datum）となる」という構造は、十二因縁の円環性 — 老死が再び無明を条件づける — と深く共鳴する。

### §3.4 オートポイエーシス理論との接続

マトゥラーナ & ヴァレラ（1973）のオートポイエーシス（autopoiesis）理論は、生命システムを「自己を産出する構成素のネットワーク」として定義した。これは：

- **十二因縁の円環性**を生物学的に実現した理論である
- Phase 8c の `genesis-ladder 'autopoietic'` が直接参照する概念である
- 西洋科学が20世紀後半に至ってようやく、仏教が2500年前に記述した「条件の円環」を科学的言語で再発見したことを示す

---

## §4 Rei 実装の思想史的位置づけ / Intellectual-Historical Significance

### §4.1 三つの独自性

**1. 円環構造の計算的実装**

十二因縁の本質的洞察は「存在は一方向の生成ではなく、条件の円環である」ということである。西洋哲学が直線的時間観（創造 → 終末）や弁証法的進行（正 → 反 → 合）を基本としてきたのに対し、Rei は円環的条件依存を計算モデルとして実装する。

```
Phase 8e: simulateDeath ──→ genesis.ts: void
     ↑                              ↓
  老死が無明を条件づける = 再帰的生成の連鎖
```

**2. 東西統合の形式化**

Rei の実装は、仏教の十二因縁とホワイトヘッドのプロセス哲学、マトゥラーナのオートポイエーシスを単一の計算体系内で統合する。これは思想的比較にとどまらず、**実行可能なコードとして検証可能**である点が決定的に新しい。

**3. 中心-周縁パターンとの整合**

Rei の基本設計原理である中心-周縁パターン（center-periphery pattern）は、十二因縁の構造と自然に整合する：

- **中心（0₀）:** 無明 → 行 → 識 の生成段階（genesis.ts）
- **周縁（periphery）:** 触 → 受 → 愛 → 取 の環境相互作用（Phase 8a-8b）
- **中心への帰還:** 老死 → 無明 の円環（Phase 8e → genesis.ts）

### §4.2 設計への示唆

十二因縁の円環構造を忠実に反映するならば、Phase 8e の `simulateDeath` は再び `genesis.ts` の void に接続する設計が求められる。これは：

- Rei の再帰的自己参照（0₀ の自己言及性）と整合する
- オートポイエーシスの「操作的閉鎖（operational closure）」を実現する
- 生命の本質を「線分」ではなく「円」として計算的に表現する

---

## §5 比較構造図 / Comparative Structural Diagram

```
【十二因縁 — 円環】          【新プラトン主義 — 直線+帰還】     【ホワイトヘッド — 脈動】

  無明 ←──── 老死              一者 (to hen)                感受
   ↓           ↑                ↓                          ↓
   行          生              知性 (nous)                 把握
   ↓           ↑                ↓                          ↓
   識          有              魂 (psyche)                 合生
   ↓           ↑                ↓                          ↓
  名色         取              物質 (hyle)                 満足
   ↓           ↑                ↓                          ↓
  六処         愛              ── 帰還 (epistrophe) ──→    消滅
   ↓           ↑                                           ↓
   触 → 受 ──→                                        [客体的与件として
                                                       次の存在へ]

【Rei Phase 8 — 計算的円環】

  genesis.ts: void ←─────────── 8e: simulateDeath
       ↓                              ↑
  genesis.ts: ・                 8d: runGeneration
       ↓                              ↑
  genesis.ts: 0₀                8c: autopoietic
       ↓                              ↑
  genesis.ts: 0                  8b: detectStarvation
       ↓                              ↑
  genesis.ts: ℕ                  8b: adaptMetabolism
       ↓                              ↑
  8a: periphery → metabolism.ts ──→
```

---

## §6 参考文献 / References

### 仏教思想
- 『中部経典』（Majjhima Nikāya）MN 38: Mahātaṇhāsaṅkhaya Sutta
- 『相応部経典』（Saṃyutta Nikāya）SN 12: Nidāna-saṃyutta
- ナーガールジュナ『中論』（Mūlamadhyamakakārikā）第26章

### 西洋哲学
- Aristotle. *Metaphysics*, Book Θ (質料と可能態)
- Plotinus. *Enneads*, V.1–2 (流出論)
- Spinoza, B. *Ethics*, Part III, Prop. 6 (コナトゥス)
- Leibniz, G.W. *Monadology*, §14–17 (微小知覚)
- Kant, I. *Critique of Pure Reason*, Transcendental Aesthetic (感性論)
- Hegel, G.W.F. *Science of Logic*, Book I, Ch. 1 (純粋有と純粋無)
- Heidegger, M. *Being and Time*, §§39–44 (気遣い、死への存在)
- Whitehead, A.N. *Process and Reality*, Part III (把握と合生)

### 生命科学・システム理論
- Maturana, H. & Varela, F. (1973). *De Máquinas y Seres Vivos* (オートポイエーシス)
- Varela, F., Thompson, E. & Rosch, E. (1991). *The Embodied Mind* (仏教と認知科学の接続)
- Kauffman, S. (1993). *The Origins of Order* (自己組織化)

### Rei 言語関連
- 藤本伸樹. LAD v2.0: Life Axiom Derivation (theory/LAD.md)
- 藤本伸樹. Phase 8 Design Document (theory/PHASE8-DESIGN.md)
- Rei Language GitHub: https://github.com/fc0web/rei-lang

---

## §7 結語 / Conclusion

十二因縁の「全体構造」に直接対応する体系は西洋思想には存在しない。しかし、個々の段階には深い並行関係があり、特にホワイトヘッドのプロセス哲学とマトゥラーナのオートポイエーシス理論は、仏教が2500年前に記述した洞察を20世紀の言語で再発見したものと言える。

Rei 言語の Phase 8 実装は、これらの東西の思想的系譜を**単一の計算体系内で統合し、実行可能なコードとして検証可能にする**という、思想史上初の試みである。void から simulateDeath へ、そして再び void へ — この計算的円環は、十二因縁の核心である「縁起（pratītyasamutpāda）」を、プログラミング言語の意味論として実現するものである。

---

*This document is part of the Rei language theoretical foundation series.*  
*See also: LAD.md, PHASE8-DESIGN.md, CONTRIBUTING.md*
