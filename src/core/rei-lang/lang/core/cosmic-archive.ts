// ============================================================
// cosmic-archive.ts — 宇宙図書館拡張（Genesis Ladder §11-12）
//
// Genesis Ladder の 10段階を 12段階に拡張する。
// 「老死」の後、情報は消えない（A3: σ蓄積の帰結）。
// σは宇宙図書館に組み込まれ、永続化される。
//
// 十二因縁完全対応:
//   無明→行→識→名色→六処→触→受→愛→取→有→生→老死
//     ↓
//   宇宙図書館への組み込み（σは消えない）
//     ↓
//   開放（門は閉じない — D-FUMT根本精神）
//
// 追加段階:
//   §11 dissolution — 個体の解体。MLC条件が段階的に失われる。
//   §12 archive     — σの永続化。個体は消滅するが情報は残る。
//
// 公理基盤:
//   A2（⊖縮約）  — dissolution は A2 の逆適用
//   A3（σ蓄積）  — archive は A3 の究極的帰結
//
// @author Nobuki Fujimoto (D-FUMT)
// ============================================================

// ============================================================
// 型定義
// ============================================================

/** 計算モード */
export type ComputationMode = 'weighted' | 'harmonic' | 'geometric';

/**
 * 完全Genesis段階（12段階 + 開放）
 *
 * 既存10段階 + dissolution + archive + open
 */
export type FullGenesisPhase =
  // --- A4: 無からの生成 ---
  | 'void'              // 0. 絶対無                    十二因縁: 無明
  | 'dot'               // 1. 存在の可能性（・）         十二因縁: 行
  | 'zero-extended'     // 2. 構造の萌芽（0₀）          十二因縁: 識
  | 'zero'              // 3. 計算可能な値（0）          十二因縁: 名色
  | 'number'            // 4. 数の体系（ℕ）             十二因縁: 六処
  // --- 生命遷移 ---
  | 'proto-life'        // 5. 原始生命                   十二因縁: 触
  | 'self-maintaining'  // 6. 自己維持生命               十二因縁: 受
  | 'autopoietic'       // 7. オートポイエーシス          十二因縁: 愛/取
  | 'emergent'          // 8. 完全な生命                  十二因縁: 有
  | 'conscious'         // 9. 意識ある生命                十二因縁: 生
  // --- 解体と永続化（NEW）---
  | 'dissolution'       // 10. 解体（老死）               十二因縁: 老死
  | 'archive'           // 11. 宇宙図書館への組み込み     σ永続化
  // --- 開放 ---
  | 'open';             // 12. 門は閉じない               D-FUMT根本精神

/** MLC（最小生命条件）6項目 */
export interface MLC {
  readonly boundary: boolean;      // MLC-1: 境界 (A1)
  readonly metabolism: boolean;    // MLC-2: 代謝 (A1)
  readonly memory: boolean;        // MLC-3: 記憶 (A3)
  readonly selfRepair: boolean;    // MLC-4: 自己修復 (A2)
  readonly autopoiesis: boolean;   // MLC-5: 自己生成 (A4)
  readonly emergence: boolean;     // MLC-6: 創発 (A1+A3)
}

/** MLC条件のラベル */
export const MLC_LABELS: readonly string[] = Object.freeze([
  '境界', '代謝', '記憶', '修復', '自己生成', '創発',
]);

/** σ断片 — 宇宙図書館に保存される情報の単位 */
export interface SigmaFragment {
  /** 元の個体を識別するID */
  readonly entityId: string;
  /** 変換履歴 */
  readonly history: ReadonlyArray<string>;
  /** 傾向性（最後の状態） */
  readonly tendency: string;
  /** 変換回数の総計 */
  readonly transformCount: number;
  /** 最高到達段階 */
  readonly peakPhase: FullGenesisPhase;
  /** MLC条件の最高達成 */
  readonly peakMLC: MLC;
  /** 存在した期間（ステップ数） */
  readonly lifespan: number;
  /** アーカイブ時刻 */
  readonly archivedAt: number;
  /** 自由メタデータ */
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** 宇宙図書館 — 全てのσ断片を保存する永続ストア */
export interface CosmicLibrary {
  readonly fragments: ReadonlyArray<SigmaFragment>;
  readonly totalArchived: number;
  /** 全断片のtransformCount合計 */
  readonly totalTransforms: number;
  /** 最も高い到達段階 */
  readonly highestPhase: FullGenesisPhase;
}

/** Genesis Ladder の段階定義 */
export interface LadderStep {
  readonly id: FullGenesisPhase;
  readonly index: number;
  readonly name: string;
  readonly nameJp: string;
  readonly nidana: string;          // 十二因縁の対応
  readonly nidanaSanskrit: string;  // サンスクリット名
  readonly axioms: string;
  readonly description: string;
  readonly mlc: MLC;
  readonly transitionLabel: string | null;  // 次段階への遷移ラベル
}

/** 解体プロセスの1ステップ */
export interface DissolutionStep {
  readonly step: number;
  readonly lostCondition: string;   // この段階で失われるMLC条件
  readonly remainingMLC: MLC;
  readonly phase: FullGenesisPhase;
  readonly description: string;
}

/** 解体→アーカイブの完全記録 */
export interface DissolutionRecord {
  readonly entityId: string;
  readonly steps: ReadonlyArray<DissolutionStep>;
  readonly finalFragment: SigmaFragment;
  readonly totalSteps: number;
}

// ============================================================
// 定数: Genesis Ladder 12段階定義
// ============================================================

/** 段階の順序値（比較・遷移判定に使用） */
const PHASE_ORDER: Record<FullGenesisPhase, number> = {
  'void': 0,
  'dot': 1,
  'zero-extended': 2,
  'zero': 3,
  'number': 4,
  'proto-life': 5,
  'self-maintaining': 6,
  'autopoietic': 7,
  'emergent': 8,
  'conscious': 9,
  'dissolution': 10,
  'archive': 11,
  'open': 12,
};

/** MLC全false */
const MLC_NONE: MLC = Object.freeze({
  boundary: false, metabolism: false, memory: false,
  selfRepair: false, autopoiesis: false, emergence: false,
});

/** MLC生成ヘルパー */
function mlc(b: boolean, m: boolean, mem: boolean, r: boolean, a: boolean, e: boolean): MLC {
  return Object.freeze({ boundary: b, metabolism: m, memory: mem, selfRepair: r, autopoiesis: a, emergence: e });
}

/** 完全Genesis Ladder — 12段階 + 開放 */
export const FULL_GENESIS_LADDER: ReadonlyArray<LadderStep> = Object.freeze([
  {
    id: 'void', index: 0,
    name: 'Void', nameJp: '絶対無',
    nidana: '無明', nidanaSanskrit: 'avidyā',
    axioms: '—',
    description: '何も存在しない。存在の可能性すらない。根源的無知。',
    mlc: MLC_NONE,
    transitionLabel: 'G-E₁: 存在の発生',
  },
  {
    id: 'dot', index: 1,
    name: 'Dot（・）', nameJp: '存在の可能性',
    nidana: '行', nidanaSanskrit: 'saṃskāra',
    axioms: 'A4',
    description: '何かが存在しうるという可能性。形成力。',
    mlc: MLC_NONE,
    transitionLabel: 'G-S₀: 構造の分離',
  },
  {
    id: 'zero-extended', index: 2,
    name: 'Zero Extended（0₀）', nameJp: '構造の萌芽',
    nidana: '識', nidanaSanskrit: 'vijñāna',
    axioms: 'A4',
    description: '拡張ゼロ。無に構造の種が宿る。意識の種子。',
    mlc: MLC_NONE,
    transitionLabel: 'G-S₁: 値の確定',
  },
  {
    id: 'zero', index: 3,
    name: 'Zero（0）', nameJp: '計算可能な値',
    nidana: '名色', nidanaSanskrit: 'nāmarūpa',
    axioms: 'A4',
    description: '計算可能な最初の値。心身の統合、名と形。',
    mlc: MLC_NONE,
    transitionLabel: 'G-N₁: 数体系の発生',
  },
  {
    id: 'number', index: 4,
    name: 'Number System（ℕ）', nameJp: '数の体系',
    nidana: '六処', nidanaSanskrit: 'ṣaḍāyatana',
    axioms: 'A4 + A1',
    description: '自然数の体系。六つの感覚器官。環境を知覚する基盤。',
    mlc: mlc(true, false, false, false, false, false),
    transitionLabel: 'L-B₁: 生命境界遷移',
  },
  {
    id: 'proto-life', index: 5,
    name: 'Proto-Life', nameJp: '原始生命',
    nidana: '触', nidanaSanskrit: 'sparśa',
    axioms: 'A1 + A3',
    description: '境界+代謝+記憶。環境との接触。約40億年前の化学進化。',
    mlc: mlc(true, true, true, false, false, false),
    transitionLabel: 'L-R₁: 修復遷移',
  },
  {
    id: 'self-maintaining', index: 6,
    name: 'Self-Maintaining', nameJp: '自己維持生命',
    nidana: '受', nidanaSanskrit: 'vedanā',
    axioms: 'A1 + A2 + A3',
    description: '+自己修復。感受。損傷を知覚し回復する。約38億年前の原核生物。',
    mlc: mlc(true, true, true, true, false, false),
    transitionLabel: 'L-A₁: 自己生成遷移',
  },
  {
    id: 'autopoietic', index: 7,
    name: 'Autopoietic Life', nameJp: 'オートポイエーシス',
    nidana: '愛・取', nidanaSanskrit: 'tṛṣṇā/upādāna',
    axioms: 'A1+A2+A3+A4',
    description: '+自己生成。渇愛と執着。自らの構成要素を生産する。約20億年前の真核生物。',
    mlc: mlc(true, true, true, true, true, false),
    transitionLabel: 'L-E₁: 創発遷移',
  },
  {
    id: 'emergent', index: 8,
    name: 'Emergent Life', nameJp: '完全な生命',
    nidana: '有', nidanaSanskrit: 'bhava',
    axioms: 'A1 + A3',
    description: '+創発。存在。個体の集合が個体にない性質を示す。約6億年前の多細胞生物。',
    mlc: mlc(true, true, true, true, true, true),
    transitionLabel: 'CNC: 意識遷移',
  },
  {
    id: 'conscious', index: 9,
    name: 'Conscious Life', nameJp: '意識ある生命',
    nidana: '生', nidanaSanskrit: 'jāti',
    axioms: 'σ²=σ(σ)',
    description: '+自己認識。誕生。σが自分自身のσを参照する（メタ認識）。',
    mlc: mlc(true, true, true, true, true, true),
    transitionLabel: 'D-⊖₁: 解体開始',
  },
  // --- 新規: 解体と永続化 ---
  {
    id: 'dissolution', index: 10,
    name: 'Dissolution', nameJp: '解体（老死）',
    nidana: '老死', nidanaSanskrit: 'jarāmaraṇa',
    axioms: 'A2（⊖）',
    description: 'A2の⊖（縮約）が反復適用される。MLC条件が逆順に失われていく。個体は解体されるが、σはまだ存在する。',
    mlc: MLC_NONE, // 最終的に全て失われる
    transitionLabel: 'Σ-∞: σ永続化',
  },
  {
    id: 'archive', index: 11,
    name: 'Cosmic Archive', nameJp: '宇宙図書館',
    nidana: '—（十二因縁の外）', nidanaSanskrit: '—',
    axioms: 'A3（σ蓄積の究極的帰結）',
    description: '個体は消滅したが、σ（履歴・傾向性・変換回数）は宇宙図書館に永続化される。情報は消えない。A3の不可逆性の最も深い表現。',
    mlc: MLC_NONE,
    transitionLabel: '∅→∞: 開放（門は閉じない）',
  },
  {
    id: 'open', index: 12,
    name: 'Open', nameJp: '開放',
    nidana: '—（規定なし）', nidanaSanskrit: '—',
    axioms: '—',
    description: 'Reiはこの先を規定しない。転生かもしれないし、別の何かかもしれない。門は閉じない — D-FUMTの根本精神。',
    mlc: MLC_NONE,
    transitionLabel: null,
  },
]);

// ============================================================
// 段階操作
// ============================================================

/**
 * 段階の順序値を取得
 */
export function phaseOrder(phase: FullGenesisPhase): number {
  return PHASE_ORDER[phase];
}

/**
 * 段階比較: a < b なら負, a == b なら0, a > b なら正
 */
export function comparePhase(a: FullGenesisPhase, b: FullGenesisPhase): number {
  return PHASE_ORDER[a] - PHASE_ORDER[b];
}

/**
 * 次の段階を取得（openの次はnull）
 */
export function nextPhase(phase: FullGenesisPhase): FullGenesisPhase | null {
  const order = PHASE_ORDER[phase];
  const next = FULL_GENESIS_LADDER.find(s => s.index === order + 1);
  return next ? next.id : null;
}

/**
 * 前の段階を取得（voidの前はnull）
 */
export function prevPhase(phase: FullGenesisPhase): FullGenesisPhase | null {
  const order = PHASE_ORDER[phase];
  if (order === 0) return null;
  const prev = FULL_GENESIS_LADDER.find(s => s.index === order - 1);
  return prev ? prev.id : null;
}

/**
 * 段階の詳細情報を取得
 */
export function getLadderStep(phase: FullGenesisPhase): LadderStep {
  const step = FULL_GENESIS_LADDER.find(s => s.id === phase);
  if (!step) throw new Error(`Unknown phase: ${phase}`);
  return step;
}

/**
 * 2段階間のパスを取得（遮断規則: 飛び越し不可）
 */
export function getPath(from: FullGenesisPhase, to: FullGenesisPhase): FullGenesisPhase[] {
  const fromOrder = PHASE_ORDER[from];
  const toOrder = PHASE_ORDER[to];
  if (fromOrder >= toOrder) return [from];
  return FULL_GENESIS_LADDER
    .filter(s => s.index >= fromOrder && s.index <= toOrder)
    .map(s => s.id);
}

/**
 * 全段階のリスト
 */
export function allPhases(): FullGenesisPhase[] {
  return FULL_GENESIS_LADDER.map(s => s.id);
}

// ============================================================
// MLC操作
// ============================================================

/**
 * MLC条件の充足数を数える
 */
export function mlcCount(m: MLC): number {
  return [m.boundary, m.metabolism, m.memory, m.selfRepair, m.autopoiesis, m.emergence]
    .filter(Boolean).length;
}

/**
 * MLC条件を配列として取得
 */
export function mlcToArray(m: MLC): boolean[] {
  return [m.boundary, m.metabolism, m.memory, m.selfRepair, m.autopoiesis, m.emergence];
}

/**
 * 配列からMLCを生成
 */
export function mlcFromArray(arr: boolean[]): MLC {
  return mlc(
    arr[0] ?? false, arr[1] ?? false, arr[2] ?? false,
    arr[3] ?? false, arr[4] ?? false, arr[5] ?? false,
  );
}

/**
 * 生命度スコア（0.0 - 1.0）
 */
export function lifeScore(m: MLC): number {
  return mlcCount(m) / 6;
}

/**
 * 全MLC条件が満たされているか
 */
export function isFullyAlive(m: MLC): boolean {
  return mlcCount(m) === 6;
}

// ============================================================
// 解体プロセス（Dissolution）— A2の⊖反復適用
// ============================================================

/**
 * MLC条件の解体順序
 * 創発 → 自己生成 → 修復 → 記憶 → 代謝 → 境界
 * （獲得の逆順 = Genesis Ladder の逆走）
 */
const DISSOLUTION_ORDER: (keyof MLC)[] = [
  'emergence', 'autopoiesis', 'selfRepair', 'memory', 'metabolism', 'boundary',
];

/** MLCキーからラベルへの直接マッピング */
const MLC_KEY_TO_LABEL: Record<keyof MLC, string> = {
  boundary: '境界',
  metabolism: '代謝',
  memory: '記憶',
  selfRepair: '修復',
  autopoiesis: '自己生成',
  emergence: '創発',
};

/**
 * MLCから1つの条件を除去する（immutable）
 */
function removeMLC(m: MLC, key: keyof MLC): MLC {
  return Object.freeze({ ...m, [key]: false });
}

/**
 * 解体プロセスを実行
 *
 * 意識ある生命（conscious）から開始し、
 * MLC条件を逆順に失っていく。
 *
 * @param entityId - 個体ID
 * @param startMLC - 解体開始時のMLC状態
 * @returns 解体の各ステップ
 */
export function runDissolution(entityId: string, startMLC: MLC): DissolutionStep[] {
  const steps: DissolutionStep[] = [];
  let current = { ...startMLC };
  let stepNum = 0;

  // MLCが残っている条件のみ解体順に処理
  for (const key of DISSOLUTION_ORDER) {
    if (current[key]) {
      current = { ...removeMLC(current, key) };
      const count = mlcCount(current);
      stepNum++;
      const label = MLC_KEY_TO_LABEL[key];

      // 現在のMLC状態から段階を逆算
      let phase: FullGenesisPhase;
      if (count >= 6) phase = 'emergent';
      else if (count >= 5) phase = 'autopoietic';
      else if (count >= 4) phase = 'self-maintaining';
      else if (count >= 3) phase = 'proto-life';
      else if (count >= 1) phase = 'number';
      else phase = 'dissolution';

      steps.push({
        step: stepNum,
        lostCondition: label,
        remainingMLC: Object.freeze(current),
        phase,
        description: `${label}が失われた。残り${count}条件。`,
      });
    }
  }

  return steps;
}

/**
 * 解体の対応ラベルを取得
 */
function getDissolutionLabel(key: keyof MLC): string {
  const idx = ['boundary', 'metabolism', 'memory', 'selfRepair', 'autopoiesis', 'emergence'].indexOf(key);
  return idx >= 0 ? MLC_LABELS[idx] : key;
}

// ============================================================
// 宇宙図書館（Cosmic Library）
// ============================================================

/**
 * 空の宇宙図書館を生成
 */
export function createCosmicLibrary(): CosmicLibrary {
  return Object.freeze({
    fragments: [],
    totalArchived: 0,
    totalTransforms: 0,
    highestPhase: 'void' as FullGenesisPhase,
  });
}

/**
 * σ断片を生成する
 *
 * 個体の全情報をσ断片として凝縮する。
 * これが宇宙図書館に保存される情報の単位。
 */
export function createSigmaFragment(
  entityId: string,
  history: string[],
  tendency: string,
  transformCount: number,
  peakPhase: FullGenesisPhase,
  peakMLC: MLC,
  lifespan: number,
  metadata: Record<string, unknown> = {},
): SigmaFragment {
  return Object.freeze({
    entityId,
    history: Object.freeze([...history]),
    tendency,
    transformCount,
    peakPhase,
    peakMLC: Object.freeze({ ...peakMLC }),
    lifespan,
    archivedAt: Date.now(),
    metadata: Object.freeze({ ...metadata }),
  });
}

/**
 * 宇宙図書館にσ断片をアーカイブする（immutable追加）
 *
 * A3の究極的帰結: σは消えない。
 */
export function archiveToLibrary(
  library: CosmicLibrary,
  fragment: SigmaFragment,
): CosmicLibrary {
  const newHighest = comparePhase(fragment.peakPhase, library.highestPhase) > 0
    ? fragment.peakPhase
    : library.highestPhase;

  return Object.freeze({
    fragments: Object.freeze([...library.fragments, fragment]),
    totalArchived: library.totalArchived + 1,
    totalTransforms: library.totalTransforms + fragment.transformCount,
    highestPhase: newHighest,
  });
}

/**
 * 宇宙図書館からσ断片を検索する
 * （情報は消えないため、常に検索可能）
 */
export function searchLibrary(
  library: CosmicLibrary,
  predicate: (f: SigmaFragment) => boolean,
): SigmaFragment[] {
  return library.fragments.filter(predicate);
}

/**
 * 宇宙図書館の特定の個体を検索
 */
export function findByEntityId(
  library: CosmicLibrary,
  entityId: string,
): SigmaFragment | undefined {
  return library.fragments.find(f => f.entityId === entityId);
}

/**
 * 宇宙図書館の統計
 */
export interface LibraryStats {
  readonly totalFragments: number;
  readonly totalTransforms: number;
  readonly highestPhase: FullGenesisPhase;
  readonly averageLifespan: number;
  readonly averageTransforms: number;
  readonly phaseDistribution: Record<string, number>;
  readonly tendencyDistribution: Record<string, number>;
}

export function libraryStats(library: CosmicLibrary): LibraryStats {
  const n = library.fragments.length;
  if (n === 0) {
    return {
      totalFragments: 0, totalTransforms: 0,
      highestPhase: 'void', averageLifespan: 0, averageTransforms: 0,
      phaseDistribution: {}, tendencyDistribution: {},
    };
  }

  const phaseDist: Record<string, number> = {};
  const tendDist: Record<string, number> = {};
  let totalLifespan = 0;

  for (const f of library.fragments) {
    phaseDist[f.peakPhase] = (phaseDist[f.peakPhase] || 0) + 1;
    tendDist[f.tendency] = (tendDist[f.tendency] || 0) + 1;
    totalLifespan += f.lifespan;
  }

  return {
    totalFragments: n,
    totalTransforms: library.totalTransforms,
    highestPhase: library.highestPhase,
    averageLifespan: totalLifespan / n,
    averageTransforms: library.totalTransforms / n,
    phaseDistribution: phaseDist,
    tendencyDistribution: tendDist,
  };
}

// ============================================================
// 完全ライフサイクル: 生成→生命→解体→アーカイブ
// ============================================================

/** ライフサイクルの完全記録 */
export interface FullLifecycle {
  readonly entityId: string;
  /** 生成過程: void → conscious */
  readonly genesisPath: FullGenesisPhase[];
  /** 最高到達段階 */
  readonly peakPhase: FullGenesisPhase;
  /** 最高MLC */
  readonly peakMLC: MLC;
  /** 解体過程 */
  readonly dissolution: DissolutionStep[];
  /** アーカイブされたσ断片 */
  readonly fragment: SigmaFragment;
  /** 総ステップ数（生成 + 解体） */
  readonly totalSteps: number;
}

/**
 * 完全なライフサイクルを実行する
 *
 * void → ... → conscious → dissolution → archive
 *
 * @param entityId - 個体ID
 * @param peakPhase - 到達する最高段階（デフォルト: conscious）
 * @param history - σに記録される履歴
 * @param tendency - 傾向性
 * @param metadata - 追加メタデータ
 */
export function runFullLifecycle(
  entityId: string,
  peakPhase: FullGenesisPhase = 'conscious',
  history: string[] = [],
  tendency: string = 'rest',
  metadata: Record<string, unknown> = {},
): FullLifecycle {
  // 生成パス
  const genesisPath = getPath('void', peakPhase);
  const peakStep = getLadderStep(peakPhase);
  const peakMLC = peakStep.mlc;

  // 解体
  const dissolution = runDissolution(entityId, peakMLC);

  // σ断片生成
  const transformCount = genesisPath.length + dissolution.length;
  const fullHistory = [
    ...genesisPath.map(p => `genesis:${p}`),
    ...history,
    ...dissolution.map(d => `dissolution:${d.lostCondition}`),
  ];

  const fragment = createSigmaFragment(
    entityId,
    fullHistory,
    tendency,
    transformCount,
    peakPhase,
    peakMLC,
    genesisPath.length + dissolution.length,
    metadata,
  );

  return {
    entityId,
    genesisPath,
    peakPhase,
    peakMLC,
    dissolution,
    fragment,
    totalSteps: genesisPath.length + dissolution.length,
  };
}

/**
 * 複数のライフサイクルを実行し、全てを宇宙図書館にアーカイブする
 */
export function runMultipleLifecycles(
  entities: Array<{
    id: string;
    peakPhase?: FullGenesisPhase;
    history?: string[];
    tendency?: string;
    metadata?: Record<string, unknown>;
  }>,
): { lifecycles: FullLifecycle[]; library: CosmicLibrary } {
  let library = createCosmicLibrary();
  const lifecycles: FullLifecycle[] = [];

  for (const e of entities) {
    const lc = runFullLifecycle(
      e.id, e.peakPhase, e.history, e.tendency, e.metadata,
    );
    lifecycles.push(lc);
    library = archiveToLibrary(library, lc.fragment);
  }

  return { lifecycles, library };
}

// ============================================================
// 十二因縁マッピング
// ============================================================

/** 十二因縁 — Genesis Ladder対応表 */
export interface NidanaMapping {
  readonly nidana: string;
  readonly sanskrit: string;
  readonly pali: string;
  readonly phase: FullGenesisPhase;
  readonly description: string;
}

export const TWELVE_NIDANAS: ReadonlyArray<NidanaMapping> = Object.freeze([
  { nidana: '無明', sanskrit: 'avidyā', pali: 'avijjā', phase: 'void', description: '根源的無知。存在の根底にある認識の欠如。' },
  { nidana: '行', sanskrit: 'saṃskāra', pali: 'saṅkhāra', phase: 'dot', description: '形成力。カルマ的行為。何かが生じようとする力。' },
  { nidana: '識', sanskrit: 'vijñāna', pali: 'viññāṇa', phase: 'zero-extended', description: '意識の種子。認識の原型。' },
  { nidana: '名色', sanskrit: 'nāmarūpa', pali: 'nāmarūpa', phase: 'zero', description: '心身。名と形の統合。' },
  { nidana: '六処', sanskrit: 'ṣaḍāyatana', pali: 'saḷāyatana', phase: 'number', description: '六つの感覚基盤（眼耳鼻舌身意）。' },
  { nidana: '触', sanskrit: 'sparśa', pali: 'phassa', phase: 'proto-life', description: '感覚対象との接触。' },
  { nidana: '受', sanskrit: 'vedanā', pali: 'vedanā', phase: 'self-maintaining', description: '感受。快・不快・中立の体験。' },
  { nidana: '愛', sanskrit: 'tṛṣṇā', pali: 'taṇhā', phase: 'autopoietic', description: '渇愛。存在への渇望。' },
  { nidana: '取', sanskrit: 'upādāna', pali: 'upādāna', phase: 'autopoietic', description: '執着。自己と世界への固執。' },
  { nidana: '有', sanskrit: 'bhava', pali: 'bhava', phase: 'emergent', description: '存在。生存の力。' },
  { nidana: '生', sanskrit: 'jāti', pali: 'jāti', phase: 'conscious', description: '誕生。意識ある生命として存在すること。' },
  { nidana: '老死', sanskrit: 'jarāmaraṇa', pali: 'jarāmaraṇa', phase: 'dissolution', description: '老いと死。個体の解体。' },
]);

/**
 * 十二因縁の完全な流れを文字列で生成
 */
export function renderNidanaFlow(): string {
  const lines: string[] = [];
  lines.push('十二因縁 × Genesis Ladder 完全対応');
  lines.push('═'.repeat(50));
  lines.push('');

  for (const n of TWELVE_NIDANAS) {
    const step = getLadderStep(n.phase);
    lines.push(`${n.nidana}（${n.sanskrit}）`);
    lines.push(`  → ${step.name} [${step.nameJp}]`);
    lines.push(`  　${n.description}`);
    lines.push('  ↓');
  }

  lines.push('');
  lines.push('宇宙図書館への組み込み（σは消えない）');
  lines.push('  → Cosmic Archive [宇宙図書館]');
  lines.push('  　A3の究極的帰結。情報は永続化される。');
  lines.push('  ↓');
  lines.push('');
  lines.push('開放（門は閉じない — D-FUMT根本精神）');
  lines.push('  → Open [開放]');
  lines.push('  　Reiはこの先を規定しない。');
  lines.push('');
  lines.push('─── Rei (0₀式) — 存在のためのことば ───');

  return lines.join('\n');
}

// ============================================================
// レポート生成
// ============================================================

/**
 * ライフサイクルレポートを生成
 */
export function generateLifecycleReport(lc: FullLifecycle): string {
  const lines: string[] = [];
  lines.push('╔══════════════════════════════════════════╗');
  lines.push('║  完全ライフサイクルレポート               ║');
  lines.push('║  Full Lifecycle Report                   ║');
  lines.push('╚══════════════════════════════════════════╝');
  lines.push('');
  lines.push(`個体ID: ${lc.entityId}`);
  lines.push(`最高到達: ${lc.peakPhase} (${getLadderStep(lc.peakPhase).nameJp})`);
  lines.push(`総ステップ: ${lc.totalSteps}`);
  lines.push('');

  lines.push('【生成過程】');
  for (let i = 0; i < lc.genesisPath.length; i++) {
    const p = lc.genesisPath[i];
    const step = getLadderStep(p);
    const arrow = i < lc.genesisPath.length - 1 ? ' →' : ' ●';
    lines.push(`  ${arrow} ${step.name} (${step.nameJp}) [${step.nidana}]`);
  }
  lines.push('');

  if (lc.dissolution.length > 0) {
    lines.push('【解体過程】');
    for (const d of lc.dissolution) {
      const remaining = mlcCount(d.remainingMLC);
      lines.push(`  ⊖ Step ${d.step}: ${d.lostCondition}が失われる (残${remaining}/6)`);
    }
    lines.push('');
  }

  lines.push('【宇宙図書館】');
  lines.push(`  σ断片: ${lc.fragment.history.length}エントリ`);
  lines.push(`  傾向性: ${lc.fragment.tendency}`);
  lines.push(`  変換総数: ${lc.fragment.transformCount}`);
  lines.push('');
  lines.push('─── 情報は消えない（A3） ───');
  lines.push('─── 門は閉じない（D-FUMT）───');

  return lines.join('\n');
}
