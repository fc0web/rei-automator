// ============================================================
// Rei v0.4 Evaluator ? Integrated with Space-Layer-Diffusion
// Original: v0.2.1 by Nobuki Fujimoto
// Extended: v0.3 Space-Layer-Diffusion (collaborative design)
// Extended: v0.4 RCT Semantic Compression + 6-Attribute Activation
// ============================================================

import { TokenType } from './lexer';
import {
  createSpace, addNodeToLayer, stepSpace, diffuseSpace,
  computeNodeValue, stepNode,
  getSigmaFlow, getSigmaMemory, getSigmaField, getSigmaWill,
  getSpaceSigma, findResonances,
  type ReiSpace, type DNode, type ConvergenceCriteria, type ContractionMethod,
} from './space';
import {
  thinkLoop, getThoughtSigma, formatThought,
  thoughtTrajectory, thoughtModes, dominantMode,
  type ThoughtResult, type ThoughtConfig,
} from './thought';
import {
  createGameSpace, playMove, autoPlay, selectBestMove,
  gameAsMDim, getGameSigma, formatGame, getLegalMoves, simulateGames,
  randomFromMDim, randomUniform, randomWeighted, randomWalk,
  monteCarloSample, analyzeEntropy, seedRandom,
  type GameSpace, type RandomResult, type EntropyAnalysis,
} from './game';
import {
  createSudokuSpace, createLatinSquareSpace, createCustomPuzzleSpace,
  solvePuzzle, propagateOnly, propagateStep, propagateNakedPair,
  cellAsMDim, getGrid, getCandidates, getPuzzleSigma,
  formatSudoku, estimateDifficulty, generateSudoku, parseGrid,
  type PuzzleSpace,
} from './puzzle';
import {
  BindingRegistry, getBindingSimilarity,
  type ReiBinding, type BindingMode, type BindingSummary,
} from './relation';
import {
  createIntention, willCompute, willIterate,
  buildWillSigma, getIntentionOf, attachIntention,
  type ReiIntention, type IntentionType, type WillComputeResult,
} from './will';
import {
  compressToGenerativeParams, generate,
  type GenerativeParams,
} from '../../theory/theories-67';
import {
  recognize, fuse, separate, transform, buildEntitySigma,
  attachEntityMeta, getEntityMeta, unwrapAutonomousEntity,
  inferEntityKind, evaluateCompatibility, spaceAutoRecognize,
  type EntityKind, type FusionStrategy, type TransformDirection,
  type RecognitionResult, type FusionResult, type SeparationResult,
  type TransformResult, type EntitySigma,
} from './autonomy';
import { ReiEventBus, type ReiEvent, type EventBusSigma } from './event-bus';
import {
  ReiAgent, AgentRegistry,
  type AgentBehavior, type AgentSigma,
} from './entity-agent';
import {
  ReiMediator,
  type ConflictStrategy, type MediatorSigma,
  type RoundResult, type RunResult,
} from './mediator';
import {
  createPuzzleAgentSpace, createGameAgentSpace,
  agentSpaceRunRound, agentSpaceRun,
  getAgentSpaceSigma, getAgentSpaceGrid, getAgentSpaceGameState,
  formatAgentSpacePuzzle, formatAgentSpaceGame,
  getDifficultyAnalysis, getReasoningTrace, getMatchAnalysis,
  traceAgentRelations, computeAgentInfluence, cellRefToAgentId,
  detectGameWillConflict, alignGameWills,
  type AgentSpace, type AgentSpaceResult, type AgentSpaceSigma,
  type DifficultyAnalysis, type MatchAnalysis, type ReasoningTrace,
  type RelationSummary, type WillSummary,
} from './agent-space';
// RCT方向3: API版はtheory/semantic-compressor.tsを直接使用
// evaluator内はローカル同期版（下部のreiLocalSemantic*関数）を使用

// --- Tier 1: Sigma Metadata (imported from sigma.ts) ---
import {
  createSigmaMeta, wrapWithSigma, computeTendency,
  toNumSafe, unwrapReiVal, getSigmaOf, buildSigmaResult,
  type SigmaMetadata, type ReiVal,
} from './sigma';
import {
  mergeRelationBindings, mergeWillIntention,
  traceRelationChain, computeInfluence, createEntanglement,
  evolveWill, alignWills, detectWillConflict,
} from './sigma-deep';
import {
  cascadeFromRelation, cascadeFromWill, pulse as sigmaReactivePulse,
  type CascadeResult, type AttributeReaction,
} from './sigma-reactive';
export type { SigmaMetadata, ReiVal };

// --- Environment (Scope) ---

export class Environment {
  parent: Environment | null;
  bindings = new Map<string, { value: any; mutable: boolean }>();

  constructor(parent: Environment | null = null) {
    this.parent = parent;
  }

  define(name: string, value: any, mutable = false) {
    this.bindings.set(name, { value, mutable });
  }

  get(name: string): any {
    const b = this.bindings.get(name);
    if (b) return b.value;
    if (this.parent) return this.parent.get(name);
    throw new Error(`未定義の変数: ${name}`);
  }

  set(name: string, value: any) {
    const b = this.bindings.get(name);
    if (b) {
      if (!b.mutable) throw new Error(`不変の変数に代入: ${name}`);
      b.value = value;
      return;
    }
    if (this.parent) { this.parent.set(name, value); return; }
    throw new Error(`未定義の変数: ${name}`);
  }

  has(name: string): boolean {
    if (this.bindings.has(name)) return true;
    if (this.parent) return this.parent.has(name);
    return false;
  }

  getBinding(name: string): any {
    const b = this.bindings.get(name);
    if (b) return b;
    if (this.parent) return this.parent.getBinding(name);
    return null;
  }

  allBindings(): Map<string, { value: any; mutable: boolean }> {
    const all = new Map<string, { value: any; mutable: boolean }>();
    if (this.parent) {
      for (const [k, v] of this.parent.allBindings()) all.set(k, v);
    }
    for (const [k, v] of this.bindings) all.set(k, v);
    return all;
  }
}

// --- Extracted modules ---
import {
  createExtended, parseExtLit,
  ALL_COMPUTE_MODES, computeMDim, computeBlend, projectToMDim,
  projectAll, computeAll, compareModes, perspectives, computeNestedMDim,
  respondToStimulus, computeSensitivity, computeAwareness,
  applyTransform, checkModeEquivalence,
  computeResonance, getResonanceField, resonanceMap, resonanceChain,
  projectAs, composeProjections, checkRepresentable,
  deriveMode, getModeSpace, measureDepth, nestMDim, recursiveCompute,
  structuralSimilarity, bridgeMDim, encodeMDim, decodeMDim,
  mapSolutions, computeConsensus, selectBest, rankSolutions, solutionCompleteness,
  AWAKENING_THRESHOLD,
} from './mdim-core';
import {
  evolveMode,
  type EvolveResult, type EvolveCandidate,
} from './evolve';
import {
  kanjiToStringMDim, wordToStringMDim, sentenceToStringMDim,
  toneToStringMDim, kanjiSimilarity, reverseKanjiLookup, getPhoneticGroup,
  KANJI_DB,
  type StringMDim, type KanjiInfo,
} from './string-mdim';
import {
  reiSerialize, reiDeserialize, detectSerialType, cleanSerialPayload,
  reiCompress, reiDecompress, reiCompressInfo, valueToNumberArray,
  reiLocalSemanticCompress, reiLocalSemanticDecompress, reiLocalSemanticVerify,
} from './rct-local';
import {
  quadNot, quadAnd, quadOr,
  createGenesis, genesisForward,
  quadPiNegate, quadIsTruthy, quadIsPiRotated,
  QuadOps,
} from './quad-logic';

// ── Phase 5: マルチドメイン拡張 ──
import {
  type SimulationSpace,
  createSimulationSpace,
  addParticle,
  simStep as simStepCore,
  simRun as simRunCore,
  getSimulationSigma,
} from './domains/simulation-core';
import {
  createNBodySpace,
  createWaveField,
  waveStep as waveStepCore,
  waveRun as waveRunCore,
  getWaveFieldSigma,
  type WaveFieldSpace,
} from './domains/natural-science';
import {
  type PipelineSpace,
  createPipelineSpace,
  addStage as addPipelineStage,
  pipelineRun as pipelineRunCore,
  getPipelineSigma,
} from './domains/pipeline-core';
import {
  createETLSpace,
  addETLStage,
  createLLMChain,
  addLLMStage,
  getLLMChainSigma,
  type LLMChainSpace,
} from './domains/info-engineering';
import {
  type GraphSpace,
  createGraphSpace,
  addGraphNode as addGNode,
  addGraphEdge as addGEdge,
  graphTraverse as graphTraverseCore,
  propagateInfluence as propagateInfluenceCore,
  getGraphSigma,
} from './domains/graph-core';
import {
  analyzeText,
  getTextSigma,
  createGenealogy,
  createCausalNetwork,
  addCausalChain,
  getGenealogySigma,
  evaluateEthics,
  getEthicsSigma,
  type TextAnalysisResult,
  type EthicsResult,
} from './domains/humanities';

// ── Phase 5.5c: ドメイン横断統合 ──
import {
  simToPipeline,
  simEnergyToPipeline,
  simToCausal,
  simEthics,
  dataToText,
  dataEthics,
  pipelineToSim,
  causalToSim,
  textToPipeline,
  composeDomains,
  wrapCrossDomain,
  getCrossDomainSigma,
  getDomainCompositionSigma,
  type CrossDomainResult,
  type DomainComposition,
} from './domains/cross-domain';

// ── Phase 6: 新ドメイン (E.芸術 / F.音楽 / G.経済学 / H.言語学) ──
import {
  colorHarmony, generateFractal, generateLSystem,
  analyzeAesthetics, getArtSigma,
  type PatternResult, type ColorHarmony as ColorHarmonyType, type AestheticAnalysis,
} from './domains/art';

import {
  createScale, createChord, analyzeProgression,
  createRhythm, createMelody, getMusicSigma,
  type ScaleResult, type ChordResult, type RhythmPattern, type MelodyResult,
} from './domains/music';

import {
  supplyDemand, createMarket, marketStep, marketRun,
  createGame, getEconomicsSigma,
  type MarketState, type SupplyDemandResult, type GameTheoryResult,
} from './domains/economics';

import {
  parseSyntax, createSemanticFrame, analyzeWord,
  translate, getLinguisticsSigma,
  type SyntaxTree, type SemanticFrame, type WordRelation, type TranslationResult,
} from './domains/linguistics';

// ── Phase 6.5: EFGH ドメイン横断統合 ──
import {
  artToMusic, musicToArt,
  artToMarket, marketToArt,
  artToText, textToArt,
  musicToMarket, marketToMusic,
  musicToText, textToMusic,
  marketToText, textToMarket,
  artToSim, musicToSim, marketToSim,
  marketEthics, linguisticsToHumanities, linguisticsToPipeline,
  composeAll,
  getEFGHCrossSigma, getUniversalSigma,
  type EFGHCrossDomainResult, type UniversalComposition,
} from './domains/cross-domain-efgh';

// ── 型システム強化 ──
import {
  inferType, typeCheck, typeDomain, checkPipeCompatibility,
  getTypeCheckSigma,
  ReiTypeError, ReiPipeError, ReiDomainError,
  type ReiTypeId, type TypeCheckResult,
} from './type-system';

// ── Phase 5.5: 6属性深化 ──
import {
  extractFieldInfo,
  setField,
  mergeFields,
  analyzeFieldTopology,
  extractFlowInfo,
  setFlowDirection,
  reverseFlow,
  accelerateFlow,
  extractMemoryInfo,
  searchMemory,
  memorySnapshot,
  forgetMemory,
  extractLayerInfo,
  deepenLayer,
  flattenLayer,
  analyzeRelationTopology,
  analyzeRelationSymmetry,
  computeCollectiveWill,
  emergeWill,
  computeConstellation,
  composeAttributes,
  getConstellationSigma,
  type FieldInfo,
  type FlowInfo,
  type MemoryInfo,
  type LayerInfo,
  type AttributeConstellation,
} from './sigma-attributes';

// ── Phase 5.5b: 6属性動的相互作用 ──
import {
  dynamicCascade,
  evolveConstellation,
  classifyLifecycle,
  detectResonanceAmplification,
  getDynamicCascadeSigma,
  getConstellationHistorySigma,
  type AttrName,
  type DynamicCascadeResult,
  type ConstellationHistory,
} from './sigma-dynamics';

export class Evaluator {
  env: Environment;
  // ── v0.4: 関係エンジン ──
  bindingRegistry: BindingRegistry = new BindingRegistry();
  // ── v0.5: イベントバス + Agent + Mediator ──
  eventBus: ReiEventBus = new ReiEventBus();
  agentRegistry: AgentRegistry;
  mediator: ReiMediator;

  constructor(parent?: Environment) {
    this.env = new Environment(parent ?? null);
    this.agentRegistry = new AgentRegistry(this.eventBus);
    this.mediator = new ReiMediator(this.eventBus, this.agentRegistry);
    this.registerBuiltins();
  }

  private registerBuiltins() {
    this.env.define("e", Math.E);
    this.env.define("PI", Math.PI);
    this.env.define("genesis", {
      reiType: "Function", name: "genesis", params: [], body: null, closure: this.env,
    });
    const mathFns = ["abs", "sqrt", "sin", "cos", "log", "exp", "floor", "ceil", "round", "min", "max", "len", "print"];
    for (const name of mathFns) {
      this.env.define(name, {
        reiType: "Function", name, params: ["x"], body: null, closure: this.env,
      });
    }
  }

  eval(ast: any): any {
    switch (ast.type) {
      case "Program": return this.evalProgram(ast);
      case "NumLit": return ast.value;
      case "StrLit": return ast.value;
      case "BoolLit": return ast.value;
      case "NullLit": return null;
      case "ExtLit": return parseExtLit(ast.raw);
      case "ConstLit": return this.evalConstLit(ast);
      case "QuadLit": return { reiType: "Quad", value: ast.value };
      case "MDimLit": return this.evalMDimLit(ast);
      case "ArrayLit": return ast.elements.map((e: any) => this.eval(e));
      case "Ident": return this.env.get(ast.name);
      case "LetStmt": return this.evalLetStmt(ast);
      case "MutStmt": return this.evalMutStmt(ast);
      case "CompressDef": return this.evalCompressDef(ast);
      case "BinOp": return this.evalBinOp(ast);
      case "UnaryOp": return this.evalUnaryOp(ast);
      case "Pipe": return this.evalPipe(ast);
      case "FnCall": return this.evalFnCall(ast);
      case "MemberAccess": return this.evalMemberAccess(ast);
      case "IndexAccess": return this.evalIndexAccess(ast);
      case "Extend": return this.evalExtend(ast);
      case "Reduce": return this.evalReduce(ast);
      case "ConvergeOp": return this.evalConverge(ast);
      case "DivergeOp": return this.evalDiverge(ast);
      case "ReflectOp": return this.evalReflect(ast);
      case "IfExpr": return this.evalIfExpr(ast);
      case "MatchExpr": return this.evalMatchExpr(ast);
      // ── v0.3 ──
      case "SpaceLit": return this.evalSpaceLit(ast);
      default:
        throw new Error(`未実装のノード型: ${ast.type}`);
    }
  }

  private evalProgram(ast: any): any {
    let result = null;
    for (const stmt of ast.body) { result = this.eval(stmt); }
    return result;
  }

  private evalConstLit(ast: any): any {
    switch (ast.value) {
      case "\u30FB": return createGenesis();
      case "\u2205": return null;
      case "i": return { reiType: "Ext", base: NaN, order: 0, subscripts: "", valStar: () => NaN };
      case "\u03A6": return "\u03A6";
      case "\u03A8": return "\u03A8";
      case "\u03A9": return "\u03A9";
      default: return null;
    }
  }

  private evalMDimLit(ast: any): any {
    const rawCenter = this.eval(ast.center);
    const rawNeighbors = ast.neighbors.map((n: any) => this.eval(n));

    // ── 柱②: 文字列を含む場合はStringMDimを生成 ──
    const hasString = typeof rawCenter === 'string' ||
      rawNeighbors.some((n: any) => typeof n === 'string');

    if (hasString) {
      const center = typeof rawCenter === 'string' ? rawCenter : String(rawCenter);
      const neighbors = rawNeighbors.map((n: any) => typeof n === 'string' ? n : String(n));
      const mode = ast.mode || "freeform";
      return {
        reiType: 'StringMDim' as const,
        center,
        neighbors,
        mode,
        metadata: { source: 'literal' },
      } as StringMDim;
    }

    const center = this.toNumber(rawCenter);
    const neighbors = rawNeighbors.map((n: any) => this.toNumber(n));
    const weights = ast.weight ? [this.toNumber(this.eval(ast.weight))] : undefined;
    const mode = ast.mode || "weighted";
    return { reiType: "MDim", center, neighbors, mode, weights };
  }

  // ── v0.3: Space literal evaluation ──
  private evalSpaceLit(ast: any): ReiSpace {
    const space = createSpace((ast.topology || "flat") as any);

    for (const layerDef of ast.layers) {
      const layerIndex = typeof layerDef.index === 'object'
        ? this.toNumber(this.eval(layerDef.index))
        : layerDef.index;

      for (const nodeExpr of layerDef.nodes) {
        const val = this.eval(nodeExpr);
        if (this.isMDim(val)) {
          addNodeToLayer(space, layerIndex, val.center, val.neighbors, val.mode, val.weights);
        } else if (typeof val === 'number') {
          addNodeToLayer(space, layerIndex, val, []);
        }
      }
    }
    return space;
  }

  private evalLetStmt(ast: any): any {
    const val = this.eval(ast.init);
    this.env.define(ast.name, val, false);
    return val;
  }

  private evalMutStmt(ast: any): any {
    const val = this.eval(ast.init);
    this.env.define(ast.name, val, true);
    return val;
  }

  private evalCompressDef(ast: any): any {
    const fn = {
      reiType: "Function", name: ast.name, params: ast.params,
      body: ast.body, closure: this.env,
    };
    this.env.define(ast.name, fn);
    return fn;
  }

  private evalBinOp(ast: any): any {
    const left = this.eval(ast.left);
    const right = this.eval(ast.right);
    // Quad logic
    if (this.isQuad(left) && this.isQuad(right)) {
      switch (ast.op) {
        case "\u2227": return { reiType: "Quad", value: quadAnd(left.value, right.value) };
        case "\u2228": return { reiType: "Quad", value: quadOr(left.value, right.value) };
      }
    }
    const l = this.toNumber(left);
    const r = this.toNumber(right);
    switch (ast.op) {
      case "+": return l + r;
      case "-": return l - r;
      case "*": return l * r;
      case "/": return r !== 0 ? l / r : NaN;
      case "\u2295": return l + r;     // ?
      case "\u2297": return l * r;     // ?
      case "\xB7": return l * r;       // ・
      case "==": return l === r;
      case "!=": return l !== r;
      case ">": return l > r;
      case "<": return l < r;
      case ">=": return l >= r;
      case "<=": return l <= r;
      case ">\u03BA": return l > r;    // >κ
      case "<\u03BA": return l < r;    // <κ
      case "=\u03BA": return l === r;  // =κ
      case "\u2227": return l !== 0 && r !== 0;  // ∧
      case "\u2228": return l !== 0 || r !== 0;  // ∨
      default: throw new Error(`未知の演算子: ${ast.op}`);
    }
  }

  private evalUnaryOp(ast: any): any {
    const operand = this.eval(ast.operand);
    switch (ast.op) {
      case "-": return -this.toNumber(operand);
      case "\xAC":
        if (this.isQuad(operand)) return { reiType: "Quad", value: quadNot(operand.value) };
        return !operand;
      case "\xAC\u03C0":
        if (this.isQuad(operand)) return { reiType: "Quad", value: quadPiNegate(operand.value) };
        return operand;
      default: throw new Error(`未知の単項演算子: ${ast.op}`);
    }
  }

  private evalPipe(ast: any): any {
    const rawInput = this.eval(ast.input);
    const cmd = ast.command;
    if (cmd.type === "PipeCmd") {
      // ── Tier 1: σメモリ追跡 ──
      // sigmaコマンド自体はラップしない（参照操作なので）
      if (cmd.cmd === "sigma") {
        return this.execPipeCmd(rawInput, cmd);
      }
      // ── Serialization: serialize/deserialize もラップしない ──
      if (cmd.cmd === "serialize" || cmd.cmd === "serialize_pretty") {
        return reiSerialize(rawInput, cmd.cmd === "serialize_pretty");
      }
      if (cmd.cmd === "deserialize") {
        return reiDeserialize(rawInput);
      }
      // ── RCT: compress/decompress/compress_info もラップしない ──
      if (cmd.cmd === "compress" || cmd.cmd === "圧縮") {
        return reiCompress(rawInput);
      }
      if (cmd.cmd === "decompress" || cmd.cmd === "復元") {
        return reiDecompress(rawInput);
      }
      if (cmd.cmd === "compress_info" || cmd.cmd === "圧縮情報") {
        return reiCompressInfo(rawInput);
      }
      // ── RCT 方向3: semantic_compress/decompress/verify ──
      if (cmd.cmd === "semantic_compress" || cmd.cmd === "意味圧縮") {
        const data = typeof rawInput === 'string' ? rawInput : JSON.stringify(rawInput);
        const evalArgs = (cmd.args || []).map((a: any) => this.eval(a));
        const fidelity = (evalArgs.length > 1 && typeof evalArgs[1] === 'string' ? evalArgs[1] : 'high');
        return reiLocalSemanticCompress(data, fidelity);
      }
      if (cmd.cmd === "semantic_decompress" || cmd.cmd === "意味復元") {
        return reiLocalSemanticDecompress(rawInput);
      }
      if (cmd.cmd === "semantic_verify" || cmd.cmd === "意味検証") {
        if (!Array.isArray(rawInput) || rawInput.length < 2) {
          throw new Error('semantic_verify expects [original, reconstructed] array');
        }
        const orig = typeof rawInput[0] === 'string' ? rawInput[0] : JSON.stringify(rawInput[0]);
        const recon = typeof rawInput[1] === 'string' ? rawInput[1] : JSON.stringify(rawInput[1]);
        return reiLocalSemanticVerify(orig, recon);
      }
      // ── Evolve: evolve_value はラップしない（直値返却） ──
      if (cmd.cmd === "evolve_value") {
        return this.execPipeCmd(rawInput, cmd);
      }
      // ── 柱④: Thought Loop ? think/思考 はラップしない（ThoughtResult直返却） ──
      if (cmd.cmd === "think" || cmd.cmd === "思考" ||
          cmd.cmd === "think_trajectory" || cmd.cmd === "軌跡" ||
          cmd.cmd === "think_modes" || cmd.cmd === "think_dominant" ||
          cmd.cmd === "think_format" || cmd.cmd === "思考表示") {
        return this.execPipeCmd(rawInput, cmd);
      }
      // ThoughtResultの後続パイプも直値返却
      if (rawInput?.reiType === 'ThoughtResult' || (rawInput?.reiType === 'ReiVal' && rawInput?.value?.reiType === 'ThoughtResult')) {
        const thoughtAccessors = [
          "final_value", "最終値", "iterations", "反復数",
          "stop_reason", "停止理由", "trajectory", "軌跡",
          "convergence", "収束率", "awareness", "覚醒度",
          "tendency", "意志", "steps", "全履歴",
          "dominant_mode", "支配モード",
        ];
        if (thoughtAccessors.includes(cmd.cmd)) {
          return this.execPipeCmd(rawInput, cmd);
        }
      }
      // ── 柱⑤: Game/Random ? ラップしない（直値返却） ──
      const gameCommands = [
        "game", "ゲーム", "play", "打つ", "auto_play", "自動対局",
        "best_move", "最善手", "legal_moves", "合法手",
        "game_format", "盤面表示", "game_sigma",
        "simulate", "シミュレート",
        "random", "ランダム", "random_walk", "entropy", "エントロピー",
        "monte_carlo", "seed",
      ];
      if (gameCommands.includes(cmd.cmd)) {
        return this.execPipeCmd(rawInput, cmd);
      }
      // GameSpaceの後続パイプも直値返却
      const unwrappedForGame = rawInput?.reiType === 'ReiVal' ? rawInput.value : rawInput;
      if (unwrappedForGame?.reiType === 'GameSpace') {
        const gameAccessors = [
          "play", "打つ", "auto_play", "自動対局",
          "best_move", "最善手", "legal_moves", "合法手",
          "board", "盤面", "status", "状態", "winner", "勝者",
          "turn", "手番", "history", "棋譜",
          "game_format", "盤面表示", "sigma",
          "as_mdim",
          // Phase 4: Agent基盤
          "agent_play", "自律対戦", "agent_turn", "自律手番",
          "agent_match", "自律対局", "as_agent_space", "空間Agent化",
          // Phase 4c: 分析
          "agent_analyze", "自律分析",
        ];
        if (gameAccessors.includes(cmd.cmd)) {
          return this.execPipeCmd(rawInput, cmd);
        }
      }
      // RandomResult/EntropyAnalysisの後続パイプも直値返却
      if (unwrappedForGame?.reiType === 'RandomResult' || unwrappedForGame?.reiType === 'EntropyAnalysis') {
        return this.execPipeCmd(rawInput, cmd);
      }
      // ── 柱③: Puzzle ? パズルコマンドはラップしない（直値返却） ──
      const puzzleCommands = [
        "puzzle", "パズル", "数独", "sudoku", "latin_square", "ラテン方陣",
        "solve", "解く", "propagate", "伝播", "propagate_pair",
        "cell", "セル", "grid", "盤面", "candidates", "候補",
        "puzzle_format", "数独表示", "difficulty", "難易度",
        "generate_sudoku", "数独生成",
      ];
      if (puzzleCommands.includes(cmd.cmd)) {
        return this.execPipeCmd(rawInput, cmd);
      }
      // PuzzleSpaceの後続パイプも直値返却
      const unwrappedForPuzzle = rawInput?.reiType === 'ReiVal' ? rawInput.value : rawInput;
      if (unwrappedForPuzzle?.reiType === 'PuzzleSpace') {
        const puzzleAccessors = [
          "solve", "解く", "propagate", "伝播", "propagate_pair",
          "cell", "セル", "grid", "盤面", "candidates", "候補",
          "puzzle_format", "数独表示", "difficulty", "難易度",
          "sigma", "status", "状態", "history", "履歴",
          "as_mdim",
          // Phase 4: Agent基盤
          "agent_solve", "自律解法", "as_agent_space", "空間Agent化",
          "agent_propagate", "自律伝播",
          // Phase 4b: 分析
          "agent_difficulty", "自律難易度", "agent_trace", "自律追跡",
        ];
        if (puzzleAccessors.includes(cmd.cmd)) {
          return this.execPipeCmd(rawInput, cmd);
        }
      }
      // ── 柱②: StringMDimアクセサはラップしない（参照操作） ──
      // ── Phase 4: AgentSpace/AgentSpaceResult は直値返却 ──
      const unwrappedForAgent = rawInput?.reiType === 'ReiVal' ? rawInput.value : rawInput;
      if (unwrappedForAgent?.reiType === 'AgentSpace' || unwrappedForAgent?.reiType === 'AgentSpaceResult') {
        return this.execPipeCmd(rawInput, cmd);
      }
      // ── 柱②: StringMDimアクセサはラップしない（参照操作） ──
      const stringMDimAccessors = [
        "strokes", "画数", "category", "六書", "meaning", "意味",
        "readings", "読み", "radicals", "部首", "phonetic_group", "音符",
        "compose", "合成", "decompose", "分解", "similarity", "類似",
      ];
      if (stringMDimAccessors.includes(cmd.cmd)) {
        return this.execPipeCmd(rawInput, cmd);
      }
      // ── v0.4: 関係・意志コマンド ? ラップしない（直値返却） ──
      const relationWillCommands = [
        "bind", "結合", "unbind", "解除", "unbind_all", "全解除",
        "bindings", "結合一覧", "cause", "因果",
        "propagate_bindings", "伝播実行",
        "intend", "意志", "will_compute", "意志計算",
        "will_iterate", "意志反復",
        "intention", "意志確認", "satisfaction", "満足度",
        // v0.4+: 自律的相互認識コマンド
        "recognize", "認識", "fuse_with", "融合",
        "separate", "分離", "transform_to", "変容",
        "entity_sigma", "存在σ",
        "auto_recognize", "自動認識_全体",
        // v0.5: EventBus + Agent コマンド
        "events", "イベント", "event_sigma", "イベントσ",
        "event_count", "イベント数", "event_flow", "流れ状態",
        "agent", "エージェント", "agent_tick", "自律実行",
        "agent_sigma", "自律σ", "agent_list", "自律一覧",
        "agent_dissolve", "自律消滅", "agents_tick_all", "全自律実行",
        "agent_registry_sigma", "自律統計",
        // v0.5 Phase 2c: Mediator コマンド
        "mediate", "調停", "mediate_run", "調停実行",
        "mediator_sigma", "調停σ", "agent_priority", "優先度",
        "mediate_strategy", "調停戦略",
        "mediate_message", "調停通信", "mediate_broadcast", "調停放送",
        // v0.5+: relation/will 深化コマンド
        "trace", "追跡", "influence", "影響", "entangle", "縁起", "相互結合",
        "will_evolve", "意志進化", "will_align", "意志調律", "will_conflict", "意志衝突",
        // v0.5.3+: 6属性相互反応
        "pulse", "脈動", "cascade", "連鎖",
      ];
      if (relationWillCommands.includes(cmd.cmd)) {
        return this.execPipeCmd(rawInput, cmd);
      }
      const result = this.execPipeCmd(rawInput, cmd);
      // パイプ通過時にσメタデータを付与（操作名を記録）
      const prevMeta = getSigmaOf(rawInput);
      return wrapWithSigma(result, rawInput, prevMeta.pipeCount > 0 ? prevMeta : undefined, cmd.cmd);
    }
    throw new Error("無効なパイプコマンド");
  }

  private execPipeCmd(input: any, cmd: any): any {
    const { cmd: cmdName, mode, args: argNodes } = cmd;
    const args = argNodes.map((a: any) => this.eval(a));

    // ── Tier 1: σメタデータを保存してからアンラップ ──
    const sigmaMetadata = getSigmaOf(input);
    const rawInput = unwrapReiVal(input);

    // ???????????????????????????????????????????
    // Tier 1: σ（全値型の自己参照 ? 公理C1）
    // ???????????????????????????????????????????
    if (cmdName === "sigma") {
      // Space ? 既存のgetSpaceSigmaに委譲
      if (this.isSpace(rawInput)) return getSpaceSigma(rawInput as ReiSpace);
      // DNode ? 既存のσ関数と統合
      if (this.isDNode(rawInput)) {
        const dn = rawInput as DNode;
        return {
          reiType: "SigmaResult",
          flow: getSigmaFlow(dn),
          memory: [...getSigmaMemory(dn), ...sigmaMetadata.memory],
          layer: dn.layerIndex,
          will: getSigmaWill(dn),
          field: { center: dn.center, neighbors: [...dn.neighbors], layer: dn.layerIndex, index: dn.nodeIndex },
          relation: [],
        };
      }
      // ── 柱②: StringMDim ? 構造情報をσとして返す ──
      if (rawInput !== null && typeof rawInput === 'object' && rawInput.reiType === 'StringMDim') {
        const sm = rawInput as StringMDim;
        return {
          reiType: 'SigmaResult',
          field: { center: sm.center, neighbors: sm.neighbors, mode: sm.mode, type: 'string' },
          flow: { direction: 'rest', momentum: 0, velocity: 0 },
          memory: sigmaMetadata.memory,
          layer: 0,
          will: { tendency: sigmaMetadata.tendency, strength: 0, history: [] },
          relation: sm.neighbors.map((n: string) => ({ from: sm.center, to: n, type: sm.mode })),
        };
      }
      // ── 柱④: ThoughtResult ? 思考ループ結果のσ ──
      if (rawInput !== null && typeof rawInput === 'object' && rawInput.reiType === 'ThoughtResult') {
        return getThoughtSigma(rawInput as ThoughtResult);
      }
      // ── 柱⑤: GameSpace ? ゲームのσ ──
      if (rawInput !== null && typeof rawInput === 'object' && rawInput.reiType === 'GameSpace') {
        return getGameSigma(rawInput as GameSpace);
      }
      // ── 柱③: PuzzleSpace → パズルのσ ──
      if (rawInput !== null && typeof rawInput === 'object' && rawInput.reiType === 'PuzzleSpace') {
        return getPuzzleSigma(rawInput as PuzzleSpace);
      }
      // ── Phase 4: AgentSpace → エージェント空間のσ ──
      if (rawInput !== null && typeof rawInput === 'object' && rawInput.reiType === 'AgentSpace') {
        return getAgentSpaceSigma(rawInput as AgentSpace);
      }
      // 全値型 ? C1公理のσ関数
      const sigmaResult = buildSigmaResult(rawInput, sigmaMetadata);
      // ── v0.5+: σにrelation/will情報をマージ注入（上書きではなくマージ） ──
      const ref = this.findRefByValue(input);
      if (ref) {
        const bindings = this.bindingRegistry.buildRelationSigma(ref);
        sigmaResult.relation = mergeRelationBindings(sigmaResult.relation, bindings);
      }
      const intention = getIntentionOf(rawInput);
      if (intention) {
        const willSigma = buildWillSigma(intention);
        sigmaResult.will = mergeWillIntention(sigmaResult.will, willSigma);
      }
      return sigmaResult;
    }

    // ???????????????????????????????????????????
    // v0.3: Space pipe commands (rawInputを使用)
    // ???????????????????????????????????????????
    if (this.isSpace(rawInput)) {
      const sp = rawInput as ReiSpace;
      switch (cmdName) {
        case "step": {
          const targetLayer = args.length > 0 ? this.toNumber(args[0]) : undefined;
          stepSpace(sp, targetLayer);
          return sp;
        }
        case "diffuse": {
          let criteria: ConvergenceCriteria = { type: 'converged' };
          let targetLayer: number | undefined;
          let contractionMethod: ContractionMethod = 'weighted';

          if (args.length >= 1) {
            const arg0 = args[0];
            if (typeof arg0 === 'number') {
              criteria = { type: 'steps', max: arg0 };
            } else if (typeof arg0 === 'string') {
              switch (arg0) {
                case 'converged': criteria = { type: 'converged' }; break;
                case 'fixed': criteria = { type: 'fixed' }; break;
                default:
                  const eps = parseFloat(arg0);
                  if (!isNaN(eps)) criteria = { type: 'epsilon', threshold: eps };
              }
            }
          }
          if (args.length >= 2 && typeof args[1] === 'number') targetLayer = args[1];
          if (args.length >= 3 && typeof args[2] === 'string') contractionMethod = args[2] as ContractionMethod;

          return diffuseSpace(sp, criteria, targetLayer, contractionMethod);
        }
        case "node": {
          const layerIdx = args.length >= 1 ? this.toNumber(args[0]) : 0;
          const nodeIdx = args.length >= 2 ? this.toNumber(args[1]) : 0;
          const layer = sp.layers.get(layerIdx);
          if (layer && layer.nodes[nodeIdx]) return layer.nodes[nodeIdx];
          throw new Error(`ノードが見つかりません: 層${layerIdx}, index ${nodeIdx}`);
        }
        case "sigma": return getSpaceSigma(sp);
        case "resonances": {
          const threshold = args.length >= 1 ? this.toNumber(args[0]) : 0.5;
          return findResonances(sp, threshold);
        }
        case "freeze": {
          const layerIdx = this.toNumber(args[0] ?? 0);
          const layer = sp.layers.get(layerIdx);
          if (layer) layer.frozen = true;
          return sp;
        }
        case "thaw": {
          const layerIdx = this.toNumber(args[0] ?? 0);
          const layer = sp.layers.get(layerIdx);
          if (layer) layer.frozen = false;
          return sp;
        }
        case "spawn": {
          const val = args[0];
          const layerIdx = args.length >= 2 ? this.toNumber(args[1]) : 0;
          if (this.isMDim(val)) {
            addNodeToLayer(sp, layerIdx, val.center, val.neighbors, val.mode, val.weights);
          }
          return sp;
        }
        case "result": {
          const layerIdx = args.length >= 1 ? this.toNumber(args[0]) : undefined;
          const results: number[] = [];
          for (const [lIdx, layer] of sp.layers) {
            if (layerIdx !== undefined && lIdx !== layerIdx) continue;
            for (const n of layer.nodes) results.push(computeNodeValue(n));
          }
          return results.length === 1 ? results[0] : results;
        }

        // ???????????????????????????????????????????
        // Phase 3統合: Space × Auto-bind ? 共鳴→自動結合
        // ???????????????????????????????????????????

        // auto_bind / 自動結合: findResonancesの結果をBindingRegistryに登録
        case "auto_bind": case "自動結合": {
          const threshold = args.length >= 1 ? this.toNumber(args[0]) : 0.5;
          const resonances = findResonances(sp, threshold);
          let bindCount = 0;
          for (const pair of resonances) {
            const refA = `node_${pair.nodeA.layer}_${pair.nodeA.index}`;
            const refB = `node_${pair.nodeB.layer}_${pair.nodeB.index}`;
            // 既存の結合をチェック
            const existing = this.bindingRegistry.getBindingsFor(refA);
            if (existing.some(b => b.target === refB)) continue;
            // 共鳴度に応じた結合強度で resonance 結合を作成
            this.bindingRegistry.bind(refA, refB, 'resonance', pair.similarity, true);
            bindCount++;
          }
          return {
            reiType: 'AutoBindResult' as const,
            resonancesFound: resonances.length,
            bindingsCreated: bindCount,
            threshold,
            pairs: resonances.map(p => ({
              nodeA: p.nodeA,
              nodeB: p.nodeB,
              similarity: p.similarity,
            })),
          };
        }

        // space_relations / 場関係: 全結合を照会
        case "space_relations": case "場関係": {
          const allBindings: any[] = [];
          for (const [layerIdx, layer] of sp.layers) {
            for (let i = 0; i < layer.nodes.length; i++) {
              const ref = `node_${layerIdx}_${i}`;
              const bindings = this.bindingRegistry.getBindingsFor(ref);
              if (bindings.length > 0) {
                allBindings.push({
                  node: { layer: layerIdx, index: i },
                  center: layer.nodes[i].center,
                  bindings: bindings.map(b => ({
                    target: b.target,
                    mode: b.mode,
                    strength: b.strength,
                  })),
                });
              }
            }
          }
          return {
            totalBindings: allBindings.reduce((s, n) => s + n.bindings.length, 0),
            nodes: allBindings,
          };
        }
      }
    }

    // ???????????????????????????????????????????
    // v0.3: DNode pipe commands
    // ???????????????????????????????????????????
    if (this.isDNode(rawInput)) {
      const dn = rawInput as DNode;
      switch (cmdName) {
        case "sigma": {
          // Tier 1: 上のσハンドラに統合済み ? ここには到達しない
          return buildSigmaResult(dn, sigmaMetadata);
        }
        case "compute": return computeNodeValue(dn);
        case "center": return dn.center;
        case "neighbors": return dn.neighbors;
        case "dim": return dn.neighbors.length;
        case "stage": return dn.stage;
        case "step": { stepNode(dn); return dn; }
        case "extract": {
          return { reiType: "MDim", center: dn.center, neighbors: dn.neighbors, mode: dn.mode, weights: dn.weights };
        }
      }
    }

    // ???????????????????????????????????????????
    // v0.3: SigmaResult pipe commands
    // ???????????????????????????????????????????
    if (this.isObj(rawInput) && rawInput.reiType === "SigmaResult") {
      switch (cmdName) {
        case "flow": return rawInput.flow;
        case "memory": return rawInput.memory;
        case "layer": case "層": return rawInput.layer;
        case "will": return rawInput.will;
        case "field": return rawInput.field;
        case "relation": return rawInput.relation ?? [];
      }
    }

    // ???????????????????????????????????????????
    // Tier 2: project（N1 射影公理）/ reproject（N2 複数射影）
    // ???????????????????????????????????????????
    if (cmdName === "project") {
      const centerSpec = args.length > 0 ? args[0] : ':first';
      return projectToMDim(rawInput, centerSpec, args);
    }
    if (cmdName === "reproject") {
      if (this.isMDim(rawInput) && args.length > 0) {
        const newCenter = args[0];
        const allElements = [rawInput.center, ...rawInput.neighbors];
        const idx = typeof newCenter === 'number'
          ? allElements.indexOf(newCenter)
          : 0;
        if (idx < 0) throw new Error(`reproject: 中心値 ${newCenter} が見つかりません`);
        const center = allElements[idx];
        const neighbors = allElements.filter((_: any, i: number) => i !== idx);
        return { reiType: "MDim", center, neighbors, mode: rawInput.mode };
      }
      // 非MDimの場合はprojectにフォールバック
      return projectToMDim(rawInput, args[0] ?? ':first', args);
    }
    if (cmdName === "modes") {
      return [...ALL_COMPUTE_MODES];
    }
    if (cmdName === "blend") {
      // blend("weighted", 0.7, "geometric", 0.3) ? モード合成（M3: モード合成公理）
      if (!this.isMDim(rawInput)) throw new Error("blend: ??型の値が必要です");
      let blendedResult = 0;
      let totalWeight = 0;
      for (let i = 0; i < args.length - 1; i += 2) {
        const modeName = String(args[i]);
        const w = typeof args[i + 1] === 'number' ? args[i + 1] : 0;
        const result = computeMDim({ ...rawInput, mode: modeName });
        blendedResult += w * result;
        totalWeight += w;
      }
      return totalWeight > 0 ? blendedResult / totalWeight : computeMDim(rawInput);
    }

    // ???????????????????????????????????????????
    // Tier 3: U1(構造還元) & A1(解の多元性)
    // ???????????????????????????????????????????
    if (cmdName === "project_all") {
      // U1.2: n要素 → n通りの全射影
      return projectAll(rawInput);
    }
    if (cmdName === "compute_all") {
      // A1: 全モードで計算 → 解の多元性
      if (this.isMDim(rawInput)) return computeAll(rawInput);
      // 配列の場合は先にproject → compute_all
      if (Array.isArray(rawInput)) {
        const projected = projectToMDim(rawInput, 'first', []);
        return computeAll(projected);
      }
      return [];
    }
    if (cmdName === "compare") {
      // A1: 2モード比較
      if (!this.isMDim(rawInput)) throw new Error("compare: ??型の値が必要です");
      const mode1 = args.length >= 1 ? String(args[0]) : "weighted";
      const mode2 = args.length >= 2 ? String(args[1]) : "geometric";
      return compareModes(rawInput, mode1, mode2);
    }
    if (cmdName === "perspectives") {
      // U1+A1: 全射影 × 全モード
      return perspectives(rawInput);
    }
    if (cmdName === "flatten_nested") {
      // U1: ネスト??の再帰的フラット化
      if (this.isMDim(rawInput)) return computeNestedMDim(rawInput);
      return rawInput;
    }

    // ???????????????????????????????????????????
    // Tier 4: C3(応答) & C4(覚醒) & U2(変換保存) & M2(モード等価)
    // ???????????????????????????????????????????
    if (cmdName === "respond") {
      // C3: 外部刺激への応答
      const stimulus = args.length >= 1 ? this.toNumber(args[0]) : 0;
      const method = args.length >= 2 ? String(args[1]) : 'absorb';
      return respondToStimulus(rawInput, stimulus, method);
    }
    if (cmdName === "sensitivity") {
      // C3: 応答感度の測定
      return computeSensitivity(rawInput);
    }
    if (cmdName === "awareness") {
      // C4: 覚醒度スコア（0.0?1.0）
      return computeAwareness(rawInput, sigmaMetadata);
    }
    if (cmdName === "awakened") {
      // C4: 覚醒判定
      return computeAwareness(rawInput, sigmaMetadata) >= AWAKENING_THRESHOLD;
    }
    if (cmdName === "transform") {
      // U2: 変換パターンの統一適用
      const transformName = args.length >= 1 ? String(args[0]) : 'scale';
      const param = args.length >= 2 ? this.toNumber(args[1]) : 1;
      return applyTransform(rawInput, transformName, param);
    }
    if (cmdName === "mode_equiv") {
      // M2: モード等価判定
      if (!this.isMDim(rawInput)) throw new Error("mode_equiv: ??型の値が必要です");
      const m1 = args.length >= 1 ? String(args[0]) : "weighted";
      const m2 = args.length >= 2 ? String(args[1]) : "geometric";
      return checkModeEquivalence(rawInput, m1, m2);
    }

    // ???????????????????????????????????????????
    // Tier 5: C5(共鳴) & N3-N5 & M4-M5 & U3-U5 & A2-A5
    // ???????????????????????????????????????????

    // C5: 共鳴
    if (cmdName === "resonate") {
      // C5: 2つの値の共鳴を算出
      if (args.length < 1) throw new Error("resonate: 比較対象が必要です");
      return computeResonance(rawInput, args[0]);
    }
    if (cmdName === "resonance_field") {
      // C5: 共鳴場の取得
      return getResonanceField(rawInput, sigmaMetadata);
    }
    if (cmdName === "resonance_map") {
      // C5: 共鳴マップ（全ペアの共鳴）
      return resonanceMap(rawInput);
    }
    if (cmdName === "resonance_chain") {
      // C5: 共鳴チェーン
      return resonanceChain(rawInput);
    }

    // N3: 型変換射影
    if (cmdName === "project_as") {
      const targetType = args.length >= 1 ? String(args[0]) : 'graph';
      return projectAs(rawInput, targetType);
    }

    // N4: 射影合成
    if (cmdName === "compose_projections") {
      return composeProjections(rawInput);
    }

    // N5: 表現可能性判定
    if (cmdName === "representable") {
      return checkRepresentable(rawInput);
    }

    // M4: モード導出
    if (cmdName === "derive_mode") {
      if (!this.isMDim(rawInput)) throw new Error("derive_mode: ??型が必要です");
      const modes = args.filter((a: any) => typeof a === 'string');
      const weights = args.filter((a: any) => typeof a === 'number');
      if (modes.length === 0) modes.push('weighted', 'geometric');
      if (weights.length === 0) weights.push(0.5, 0.5);
      return deriveMode(rawInput, modes, weights);
    }

    // M5: モード空間
    if (cmdName === "mode_space") {
      return getModeSpace(rawInput);
    }

    // U3: 階層再帰
    if (cmdName === "depth") {
      return measureDepth(rawInput);
    }
    if (cmdName === "nest") {
      const levels = args.length >= 1 ? this.toNumber(args[0]) : 1;
      return nestMDim(rawInput, levels);
    }
    if (cmdName === "recursive_compute") {
      return recursiveCompute(rawInput);
    }

    // U4: 領域架橋
    if (cmdName === "bridge") {
      if (args.length < 1) throw new Error("bridge: 比較対象が必要です");
      return bridgeMDim(rawInput, args[0]);
    }
    if (cmdName === "structural_similarity") {
      if (args.length < 1) throw new Error("structural_similarity: 比較対象が必要です");
      return structuralSimilarity(rawInput, args[0]);
    }

    // U5: 完全性
    if (cmdName === "encode") {
      return encodeMDim(rawInput);
    }
    if (cmdName === "decode") {
      const targetType = args.length >= 1 ? String(args[0]) : 'array';
      return decodeMDim(rawInput, targetType);
    }

    // A2: 解変換
    if (cmdName === "map_solutions") {
      if (!this.isMDim(rawInput)) {
        if (Array.isArray(rawInput)) {
          const projected = projectToMDim(rawInput, 'first', []);
          return mapSolutions(projected, args.length >= 1 ? String(args[0]) : 'scale', args.length >= 2 ? this.toNumber(args[1]) : 1);
        }
        throw new Error("map_solutions: ??型または配列が必要です");
      }
      return mapSolutions(rawInput, args.length >= 1 ? String(args[0]) : 'scale', args.length >= 2 ? this.toNumber(args[1]) : 1);
    }

    // A3: 合意形成
    if (cmdName === "consensus") {
      if (!this.isMDim(rawInput)) {
        if (Array.isArray(rawInput)) {
          return computeConsensus(projectToMDim(rawInput, 'first', []));
        }
        throw new Error("consensus: ??型または配列が必要です");
      }
      return computeConsensus(rawInput);
    }

    // A4: 最良解・ランキング
    if (cmdName === "best") {
      if (!this.isMDim(rawInput)) {
        if (Array.isArray(rawInput)) {
          return selectBest(projectToMDim(rawInput, 'first', []), args.length >= 1 ? String(args[0]) : 'median_closest');
        }
        throw new Error("best: ??型または配列が必要です");
      }
      return selectBest(rawInput, args.length >= 1 ? String(args[0]) : 'median_closest');
    }
    if (cmdName === "rank") {
      if (!this.isMDim(rawInput)) {
        if (Array.isArray(rawInput)) {
          return rankSolutions(projectToMDim(rawInput, 'first', []), args.length >= 1 ? String(args[0]) : 'value');
        }
        throw new Error("rank: ??型または配列が必要です");
      }
      return rankSolutions(rawInput, args.length >= 1 ? String(args[0]) : 'value');
    }

    // A5: 解の完全性
    if (cmdName === "solution_completeness") {
      if (!this.isMDim(rawInput)) {
        if (Array.isArray(rawInput)) {
          return solutionCompleteness(projectToMDim(rawInput, 'first', []));
        }
        throw new Error("solution_completeness: ??型または配列が必要です");
      }
      return solutionCompleteness(rawInput);
    }

    // ???????????????????????????????????????????
    // Evolve ? 自動モード選択（柱①）
    // ???????????????????????????????????????????
    if (cmdName === "evolve") {
      // evolve / evolve("stable") / evolve("divergent") / evolve("creative") / evolve("tendency")
      const strategy = args.length >= 1 ? String(args[0]) : 'auto';
      return evolveMode(input, sigmaMetadata, strategy);
    }
    if (cmdName === "evolve_value") {
      // evolveの結果から値だけを取得するショートカット
      const strategy = args.length >= 1 ? String(args[0]) : 'auto';
      const result = evolveMode(input, sigmaMetadata, strategy);
      return result.value;
    }

    // ???????????????????????????????????????????
    // v0.4: 関係（Relation）? 非局所的結合
    // ???????????????????????????????????????????

    if (cmdName === "bind" || cmdName === "結合") {
      // a |> bind("b", "mirror")  or  a |> bind("b", "mirror", 0.8)
      // a |> 結合("b", "鏡像")
      if (args.length < 1) throw new Error("bind: ターゲット変数名が必要です");
      const targetRef = String(args[0]);
      const modeArg = args.length >= 2 ? String(args[1]) : 'mirror';
      const strength = args.length >= 3 ? this.toNumber(args[2]) : 1.0;
      const bidir = args.length >= 4 ? !!args[3] : false;

      // 日本語モード名の変換
      const modeMap: Record<string, BindingMode> = {
        'mirror': 'mirror', '鏡像': 'mirror',
        'inverse': 'inverse', '反転': 'inverse',
        'resonance': 'resonance', '共鳴': 'resonance',
        'entangle': 'entangle', 'もつれ': 'entangle',
        'causal': 'causal', '因果': 'causal',
      };
      const bindMode: BindingMode = modeMap[modeArg] ?? 'mirror';

      // ソース変数名の逆引き
      const sourceRef = this.findRefByValue(input) ?? `__anon_${Date.now()}`;

      // ターゲットが環境に存在するか確認
      if (!this.env.has(targetRef)) {
        throw new Error(`bind: 変数 '${targetRef}' が見つかりません`);
      }

      const binding = this.bindingRegistry.bind(sourceRef, targetRef, bindMode, strength, bidir);
      
      // ── 6属性カスケード: relation → will → flow → memory → layer ──
      const sourceMeta = getSigmaOf(rawInput);
      const targetMeta = getSigmaOf(this.env.get(targetRef));
      const cascade = cascadeFromRelation(sourceMeta, 'bind', targetMeta?.tendency);

      return {
        reiType: 'BindResult' as const,
        binding,
        source: rawInput,
        target: this.env.get(targetRef),
        cascade,
      };
    }

    if (cmdName === "cause" || cmdName === "因果") {
      // a |> cause("b") ? causal一方向結合のショートカット
      if (args.length < 1) throw new Error("cause: ターゲット変数名が必要です");
      const targetRef = String(args[0]);
      const strength = args.length >= 2 ? this.toNumber(args[1]) : 1.0;
      const sourceRef = this.findRefByValue(input) ?? `__anon_${Date.now()}`;

      if (!this.env.has(targetRef)) {
        throw new Error(`cause: 変数 '${targetRef}' が見つかりません`);
      }

      const binding = this.bindingRegistry.bind(sourceRef, targetRef, 'causal', strength, false);
      return {
        reiType: 'BindResult' as const,
        binding,
        source: rawInput,
        target: this.env.get(targetRef),
      };
    }

    if (cmdName === "unbind" || cmdName === "解除") {
      // a |> unbind("b")
      if (args.length < 1) throw new Error("unbind: ターゲット変数名が必要です");
      const targetRef = String(args[0]);
      const sourceRef = this.findRefByValue(input) ?? '';
      const result = this.bindingRegistry.unbind(sourceRef, targetRef);
      return result;
    }

    if (cmdName === "unbind_all" || cmdName === "全解除") {
      // a |> unbind_all
      const ref = this.findRefByValue(input) ?? '';
      return this.bindingRegistry.unbindAll(ref);
    }

    if (cmdName === "bindings" || cmdName === "結合一覧") {
      // a |> bindings ? この値の全結合リスト
      const ref = this.findRefByValue(input) ?? '';
      return this.bindingRegistry.getBindingsFor(ref);
    }

    if (cmdName === "propagate_bindings" || cmdName === "伝播実行") {
      // a |> propagate_bindings ? この値の結合先に現在値を伝播
      const ref = this.findRefByValue(input);
      if (!ref) throw new Error("propagate_bindings: 変数参照を解決できません");
      const count = this.triggerPropagation(ref, rawInput);
      return { propagated: count, source: ref };
    }

    // ???????????????????????????????????????????
    // v0.4: 意志（Will）? 自律的目標指向
    // ???????????????????????????????????????????

    if (cmdName === "intend" || cmdName === "意志") {
      // ??{5; 1,2,3} |> intend("seek", 10)
      // ??{5; 1,2,3} |> 意志("接近", 10)
      if (args.length < 1) throw new Error("intend: 意志の種類が必要です");
      const typeArg = String(args[0]);
      const target = args.length >= 2 ? this.toNumber(args[1]) : undefined;
      const patience = args.length >= 3 ? this.toNumber(args[2]) : 50;

      // 日本語意志タイプの変換
      const typeMap: Record<string, IntentionType> = {
        'seek': 'seek', '接近': 'seek',
        'avoid': 'avoid', '回避': 'avoid',
        'stabilize': 'stabilize', '安定': 'stabilize',
        'explore': 'explore', '探索': 'explore',
        'harmonize': 'harmonize', '調和': 'harmonize',
        'maximize': 'maximize', '最大化': 'maximize',
        'minimize': 'minimize', '最小化': 'minimize',
      };
      const intentType: IntentionType = typeMap[typeArg] ?? 'seek';

      const intention = createIntention(intentType, target, patience);

      // harmonize の場合、結合先の値を目標に設定
      if (intentType === 'harmonize') {
        const ref = this.findRefByValue(input);
        if (ref) {
          const bindings = this.bindingRegistry.getBindingsFor(ref);
          if (bindings.length > 0 && bindings[0].active) {
            try {
              const targetVal = this.env.get(bindings[0].target);
              intention.target = toNumSafe(targetVal);
            } catch { /* ignore */ }
          }
        }
      }

      // 値に意志を付与して返す
      return attachIntention(rawInput, intention);
    }

    if (cmdName === "will_compute" || cmdName === "意志計算") {
      // ??{5; 1,2,3} |> intend("seek", 10) |> will_compute
      const intention = getIntentionOf(rawInput);
      if (!intention) throw new Error("will_compute: 意志が付与されていません（先に intend を使用してください）");

      // harmonizeの場合、結合先の値をコンテキストに含める
      let harmonizeTarget: number | undefined;
      if (intention.type === 'harmonize' && intention.target !== undefined) {
        harmonizeTarget = intention.target;
      }

      const md = this.isMDim(rawInput)
        ? rawInput
        : { reiType: 'MDim', center: this.toNumber(rawInput), neighbors: [], mode: 'weighted' };

      return willCompute(md, intention, { harmonizeTarget });
    }

    if (cmdName === "will_iterate" || cmdName === "意志反復") {
      // ??{5; 1,2,3} |> intend("seek", 10) |> will_iterate
      // ??{5; 1,2,3} |> intend("seek", 10) |> will_iterate(20)  // 最大20ステップ
      const intention = getIntentionOf(rawInput);
      if (!intention) throw new Error("will_iterate: 意志が付与されていません");

      const maxSteps = args.length >= 1 ? this.toNumber(args[0]) : undefined;
      const md = this.isMDim(rawInput)
        ? rawInput
        : { reiType: 'MDim', center: this.toNumber(rawInput), neighbors: [], mode: 'weighted' };

      return willIterate(md, intention, maxSteps);
    }

    if (cmdName === "intention" || cmdName === "意志確認") {
      // 値の意志情報を取得
      const intention = getIntentionOf(rawInput);
      if (!intention) return null;
      return buildWillSigma(intention);
    }

    if (cmdName === "satisfaction" || cmdName === "満足度") {
      // 値の満足度を取得
      const intention = getIntentionOf(rawInput);
      return intention?.satisfaction ?? 0;
    }

    // ═══════════════════════════════════════════
    // v0.5+: relation/will 深化コマンド
    // ═══════════════════════════════════════════

    if (cmdName === "trace" || cmdName === "追跡") {
      const ref = this.findRefByValue(input);
      if (ref) {
        const maxDepth = args.length >= 1 ? this.toNumber(args[0]) : 5;
        return traceRelationChain(this.bindingRegistry, ref, maxDepth);
      }
      // fall through to existing trace handlers (e.g. puzzle agent trace)
    }

    if (cmdName === "influence" || cmdName === "影響") {
      // AgentSpaceResult 上では後段のハンドラで処理
      if (rawInput?.reiType === 'AgentSpaceResult') {
        // fall through to AgentSpaceResult handlers below
      } else {
        if (args.length < 1) throw new Error("influence: ターゲット変数名が必要です");
        const targetRef = String(args[0]);
        const sourceRef = this.findRefByValue(input);
        if (!sourceRef) throw new Error("influence: 変数に束縛された値にのみ使用できます");
        return computeInfluence(this.bindingRegistry, sourceRef, targetRef);
      }
    }

    if (cmdName === "entangle" || cmdName === "縁起" || cmdName === "相互結合") {
      if (args.length < 1) throw new Error("entangle: ターゲット変数名が必要です");
      const targetRef = String(args[0]);
      const resonance = args.length >= 2 ? this.toNumber(args[1]) : 1.0;
      const sourceRef = this.findRefByValue(input) ?? `__anon_${Date.now()}`;
      if (!this.env.has(targetRef)) throw new Error(`entangle: 変数 '${targetRef}' が見つかりません`);
      const result = createEntanglement(this.bindingRegistry, sourceRef, targetRef, resonance);

      // ── 6属性カスケード: entangle → will → flow → memory → layer ──
      const sourceMeta = getSigmaOf(rawInput);
      const targetVal = unwrapReiVal(this.env.get(targetRef));
      const targetMeta = getSigmaOf(targetVal);
      const cascade = cascadeFromRelation(sourceMeta, 'entangle', targetMeta?.tendency);
      (result as any).cascade = cascade;

      return result;
    }

    if (cmdName === "will_evolve" || cmdName === "意志進化") {
      const sigmaM = getSigmaOf(rawInput);
      const result = evolveWill(rawInput, sigmaM);
      // ── 6属性カスケード: will → flow → memory → layer ──
      const cascade = cascadeFromWill(sigmaM, 'evolve', result.evolved.strength);
      (result as any).cascade = cascade;
      return result;
    }

    if (cmdName === "will_align" || cmdName === "意志調律") {
      // AgentSpaceResult 上では後段のハンドラで処理
      if (rawInput?.reiType === 'AgentSpaceResult') {
        // fall through to AgentSpaceResult handlers below
      } else {
        if (args.length < 1) throw new Error("will_align: ターゲット変数名が必要です");
        const targetRef = String(args[0]);
        if (!this.env.has(targetRef)) throw new Error(`will_align: 変数 '${targetRef}' が見つかりません`);
        const targetVal = unwrapReiVal(this.env.get(targetRef));
        const sourceRef = this.findRefByValue(input) ?? '__anon';
        const metaA = getSigmaOf(rawInput);
        const metaB = getSigmaOf(targetVal);
        const result = alignWills(rawInput, targetVal, metaA, metaB, sourceRef, targetRef);
        // ── 6属性カスケード: will(align) → flow → memory → layer ──
        const cascade = cascadeFromWill(metaA, 'align', result.harmony);
        (result as any).cascade = cascade;
        return result;
      }
    }

    if (cmdName === "will_conflict" || cmdName === "意志衝突") {
      // AgentSpaceResult 上では後段のハンドラで処理
      if (rawInput?.reiType === 'AgentSpaceResult') {
        // fall through to AgentSpaceResult handlers below
      } else {
        if (args.length < 1) throw new Error("will_conflict: ターゲット変数名が必要です");
        const targetRef = String(args[0]);
        if (!this.env.has(targetRef)) throw new Error(`will_conflict: 変数 '${targetRef}' が見つかりません`);
        const targetVal = unwrapReiVal(this.env.get(targetRef));
        const sourceRef = this.findRefByValue(input) ?? '__anon';
        const metaA = getSigmaOf(rawInput);
        const metaB = getSigmaOf(targetVal);
        const result = detectWillConflict(rawInput, targetVal, metaA, metaB, sourceRef, targetRef);
        // ── 6属性カスケード: will(conflict) → flow → memory → layer ──
        const cascade = cascadeFromWill(metaA, 'conflict', result.tension);
        (result as any).cascade = cascade;
        return result;
      }
    }

    // ── pulse（脈動）: 6属性の相互反応を明示的に実行 ──
    if (cmdName === "pulse" || cmdName === "脈動") {
      const maxPulses = args.length >= 1 ? this.toNumber(args[0]) : 5;
      const sigmaM = getSigmaOf(rawInput);
      return sigmaReactivePulse(sigmaM, maxPulses);
    }

    // ── cascade（連鎖）: 特定イベントからのカスケードを確認 ──
    if (cmdName === "cascade" || cmdName === "連鎖") {
      const sigmaM = getSigmaOf(rawInput);
      const eventType = args.length >= 1 ? String(args[0]) : 'bind';
      if (eventType === 'bind' || eventType === 'entangle' || eventType === 'unbind') {
        return cascadeFromRelation(sigmaM, eventType as any);
      } else if (eventType === 'evolve' || eventType === 'align' || eventType === 'conflict') {
        const intensity = args.length >= 2 ? this.toNumber(args[1]) : 0.5;
        return cascadeFromWill(sigmaM, eventType as any, intensity);
      }
      throw new Error(`cascade: 未知のイベント '${eventType}'`);
    }

    // ???????????????????????????????????????????
    // v0.4+: 自律的相互認識（Autonomy Engine）
    // 数値・記号・言語の統一的エンティティ認識
    // ???????????????????????????????????????????

    if (cmdName === "recognize" || cmdName === "認識") {
      // value |> recognize         ? 環境内の全変数を認識
      // value |> recognize(0.5)    ? しきい値指定
      const threshold = args.length >= 1 ? this.toNumber(args[0]) : 0.1;
      const selfName = this.findRefByValue(input);
      // 環境の全変数を収集
      const envMap = new Map<string, any>();
      for (const [k, v] of this.env.allBindings()) {
        envMap.set(k, v);
      }
      const recResult = recognize(rawInput, envMap, selfName ?? undefined, threshold);
      this.eventBus.emit('entity:recognize', {
        source: selfName,
        compatibleCount: recResult.compatibleCount,
        totalScanned: recResult.totalScanned,
      });
      return recResult;
    }

    if (cmdName === "fuse_with" || cmdName === "融合") {
      // a |> fuse_with("b")              ? 変数bとの融合（戦略自動選択）
      // a |> fuse_with("b", "resonate")  ? 戦略指定
      if (args.length < 1) throw new Error("fuse_with: ターゲット変数名が必要です");
      const targetRef = String(args[0]);
      if (!this.env.has(targetRef)) {
        throw new Error(`fuse_with: 変数 '${targetRef}' が見つかりません`);
      }
      const targetValue = this.env.get(targetRef);

      // 融合戦略の日本語マッピング
      const strategyMap: Record<string, FusionStrategy> = {
        'absorb': 'absorb', '吸収': 'absorb',
        'merge': 'merge', '統合': 'merge',
        'overlay': 'overlay', '重畳': 'overlay',
        'resonate': 'resonate', '共鳴': 'resonate',
        'cascade': 'cascade', '連鎖': 'cascade',
      };
      const strategyArg = args.length >= 2 ? String(args[1]) : undefined;
      const strategy: FusionStrategy | undefined = strategyArg
        ? (strategyMap[strategyArg] ?? strategyArg as FusionStrategy)
        : undefined;

      const fuseResult = fuse(rawInput, targetValue, strategy);
      this.eventBus.emit('entity:fuse', {
        source: this.findRefByValue(input),
        target: targetRef,
        strategy: fuseResult.strategy,
      });
      return fuseResult;
    }

    if (cmdName === "separate" || cmdName === "分離") {
      // fused_value |> separate ? 融合を解除して分離
      const sepResult = separate(rawInput);
      this.eventBus.emit('entity:separate', {
        source: this.findRefByValue(input),
        partsCount: sepResult.parts.length,
      });
      return sepResult;
    }

    if (cmdName === "transform_to" || cmdName === "変容") {
      // value |> transform_to("numeric")    ? 数値表現へ
      // value |> transform_to("symbolic")   ? 記号表現へ
      // value |> transform_to("linguistic") ? 言語表現へ
      // value |> transform_to              ? 最適な形態へ（optimal）
      const directionMap: Record<string, TransformDirection> = {
        'numeric': 'to_numeric', '数値': 'to_numeric',
        'symbolic': 'to_symbolic', '記号': 'to_symbolic',
        'linguistic': 'to_linguistic', '言語': 'to_linguistic',
        'optimal': 'optimal', '最適': 'optimal',
      };
      const dirArg = args.length >= 1 ? String(args[0]) : 'optimal';
      const direction: TransformDirection = directionMap[dirArg] ?? 'optimal';

      const txResult = transform(rawInput, direction);
      this.eventBus.emit('entity:transform', {
        source: this.findRefByValue(input),
        direction,
        confidence: txResult.confidence,
      });
      return txResult;
    }

    if (cmdName === "entity_sigma" || cmdName === "存在σ") {
      // value |> entity_sigma ? エンティティの自律的自己記述
      return buildEntitySigma(rawInput);
    }

    if (cmdName === "auto_recognize" || cmdName === "自動認識_全体") {
      // space |> auto_recognize       ? Space内の全ノード間で相互認識
      // space |> auto_recognize(0.5)  ? しきい値指定
      if (this.isSpace(rawInput)) {
        const sp = rawInput as ReiSpace;
        const threshold = args.length >= 1 ? this.toNumber(args[0]) : 0.3;
        const nodes: Array<{ center: number; neighbors: number[]; layer: number; index: number }> = [];
        for (const [layerIdx, layer] of sp.layers) {
          for (let i = 0; i < layer.nodes.length; i++) {
            const node = layer.nodes[i];
            nodes.push({
              center: node.center,
              neighbors: [...node.neighbors],
              layer: layerIdx,
              index: i,
            });
          }
        }
        const recognitions = spaceAutoRecognize(nodes, threshold);

        // 認識結果に基づいてBindingRegistryに自動登録
        let bindCount = 0;
        let fuseCount = 0;
        for (const rec of recognitions) {
          const refA = `node_${rec.nodeA.layer}_${rec.nodeA.index}`;
          const refB = `node_${rec.nodeB.layer}_${rec.nodeB.index}`;
          if (rec.suggestedAction === 'bind' || rec.suggestedAction === 'fuse') {
            const existing = this.bindingRegistry.getBindingsFor(refA);
            if (!existing.some(b => b.target === refB)) {
              this.bindingRegistry.bind(refA, refB, 'resonance', rec.score, true);
              bindCount++;
            }
          }
          if (rec.suggestedAction === 'fuse') fuseCount++;
        }

        return {
          reiType: 'SpaceAutoRecognizeResult' as const,
          totalPairs: recognitions.length,
          bindingsCreated: bindCount,
          fusionCandidates: fuseCount,
          threshold,
          recognitions: recognitions.slice(0, 20), // 上位20件
        };
      }
      throw new Error("auto_recognize: Space型の値が必要です");
    }

    // ═══════════════════════════════════════════════════
    // v0.5 EventBus + Agent コマンド
    // ═══════════════════════════════════════════════════

    if (cmdName === "events" || cmdName === "イベント") {
      // any |> events           → 全イベントログ取得
      // any |> events("entity") → カテゴリ別ログ取得
      const category = args.length >= 1 ? String(args[0]) : undefined;
      return this.eventBus.getLog(category as any);
    }

    if (cmdName === "event_sigma" || cmdName === "イベントσ") {
      return this.eventBus.getSigma();
    }

    if (cmdName === "event_count" || cmdName === "イベント数") {
      return this.eventBus.getEventCount();
    }

    if (cmdName === "event_flow" || cmdName === "流れ状態") {
      return this.eventBus.getFlowMomentum();
    }

    if (cmdName === "agent" || cmdName === "エージェント") {
      // value |> agent                                  → reactiveで生成
      // value |> agent("autonomous")                    → behavior指定
      // value |> agent("autonomous", "my_agent")        → behavior + ID指定
      const behavior = (args.length >= 1 ? String(args[0]) : 'reactive') as AgentBehavior;
      const agentId = args.length >= 2 ? String(args[1]) : undefined;

      // 日本語behaviorマッピング
      const behaviorMap: Record<string, AgentBehavior> = {
        '受動': 'reactive', '自律': 'autonomous',
        '協調': 'cooperative', '探索': 'explorative',
      };
      const resolvedBehavior = behaviorMap[behavior] ?? behavior;

      const agent = this.agentRegistry.spawn(rawInput, {
        id: agentId,
        behavior: resolvedBehavior as AgentBehavior,
      });

      this.eventBus.emit('entity:recognize', {
        agentId: agent.id,
        kind: agent.kind,
        behavior: agent.behavior,
      }, agent.id);

      return agent.sigma();
    }

    if (cmdName === "agent_tick" || cmdName === "自律実行") {
      // value |> agent("autonomous", "a1") |> agent_tick
      // agent_id |> agent_tick
      let agentId: string | undefined;

      // σからagentIdを取得
      if (rawInput && typeof rawInput === 'object' && rawInput.reiType === 'AgentSigma') {
        agentId = rawInput.id;
      } else if (typeof rawInput === 'string') {
        agentId = rawInput;
      }

      if (!agentId) throw new Error("agent_tick: Agent IDが必要です");

      const agent = this.agentRegistry.get(agentId);
      if (!agent) throw new Error(`agent_tick: Agent '${agentId}' が見つかりません`);

      // 環境を構築
      const envMap = new Map<string, any>();
      for (const [name, binding] of this.env.allBindings()) {
        envMap.set(name, binding);
      }

      const result = agent.tick({
        environment: envMap,
        agentRegistry: this.agentRegistry,
        selfName: agentId,
      });

      return {
        reiType: 'AgentTickResult' as const,
        agentId,
        step: agent.step,
        perception: {
          eventCount: result.perception.events.length,
          recognizedCount: result.perception.recognized?.compatibleCount ?? 0,
          flowState: result.perception.flowState.state,
        },
        decision: {
          action: result.decision.action,
          confidence: result.decision.confidence,
          reason: result.decision.reason,
        },
        action: {
          success: result.action.success,
          reason: result.action.reason,
        },
      };
    }

    if (cmdName === "agent_sigma" || cmdName === "自律σ") {
      // agent_id |> agent_sigma
      let agentId: string | undefined;
      if (rawInput && typeof rawInput === 'object' && rawInput.reiType === 'AgentSigma') {
        agentId = rawInput.id;
      } else if (typeof rawInput === 'string') {
        agentId = rawInput;
      }
      if (!agentId) throw new Error("agent_sigma: Agent IDが必要です");
      const agent = this.agentRegistry.get(agentId);
      if (!agent) throw new Error(`agent_sigma: Agent '${agentId}' が見つかりません`);
      return agent.sigma();
    }

    if (cmdName === "agent_list" || cmdName === "自律一覧") {
      return this.agentRegistry.list();
    }

    if (cmdName === "agent_dissolve" || cmdName === "自律消滅") {
      // agent_id |> agent_dissolve
      let agentId: string | undefined;
      if (rawInput && typeof rawInput === 'object' && rawInput.reiType === 'AgentSigma') {
        agentId = rawInput.id;
      } else if (typeof rawInput === 'string') {
        agentId = rawInput;
      }
      if (!agentId) throw new Error("agent_dissolve: Agent IDが必要です");
      const dissolved = this.agentRegistry.dissolve(agentId);
      return { dissolved, agentId };
    }

    if (cmdName === "agents_tick_all" || cmdName === "全自律実行") {
      // any |> agents_tick_all → 全Agentを一括tick
      const envMap = new Map<string, any>();
      for (const [name, binding] of this.env.allBindings()) {
        envMap.set(name, binding);
      }
      const results = this.agentRegistry.tickAll(envMap);
      const summary: Record<string, any> = {};
      for (const [id, r] of results) {
        summary[id] = {
          decision: r.decision.action,
          success: r.action.success,
        };
      }
      return {
        reiType: 'AgentTickAllResult' as const,
        count: results.size,
        results: summary,
      };
    }

    if (cmdName === "agent_registry_sigma" || cmdName === "自律統計") {
      return this.agentRegistry.sigma();
    }

    // ═══════════════════════════════════════════════════
    // v0.5 Phase 2c: Mediator（調停）コマンド
    // ═══════════════════════════════════════════════════

    if (cmdName === "mediate" || cmdName === "調停") {
      // any |> mediate            → 1ラウンド並行実行
      // any |> mediate(3)         → 3ラウンド並行実行（収束検出付き）
      // any |> mediate(10, 0.8)   → 最大10ラウンド、収束閾値0.8
      const maxRounds = args.length >= 1 ? Number(args[0]) : 1;
      const threshold = args.length >= 2 ? Number(args[1]) : 1.0;

      const envMap = new Map<string, any>();
      for (const [name, binding] of this.env.allBindings()) {
        envMap.set(name, binding);
      }

      if (maxRounds <= 1) {
        // 単一ラウンド
        const round = this.mediator.runRound(envMap);
        const actionSummary: Record<string, any> = {};
        for (const [id, ar] of round.actions) {
          actionSummary[id] = {
            decision: round.resolvedDecisions.get(id)?.action ?? 'none',
            success: ar.success,
            reason: ar.reason,
          };
        }
        return {
          reiType: 'MediatorRoundResult' as const,
          round: round.round,
          activeAgents: round.metrics.activeAgents,
          conflicts: round.conflicts.length,
          resolutions: round.resolutions.map(r => ({
            type: r.conflict.type,
            strategy: r.strategy,
            agents: r.conflict.agents,
            reason: r.reason,
          })),
          actions: actionSummary,
          convergence: round.metrics.convergenceRatio,
        };
      } else {
        // 複数ラウンド
        const result = this.mediator.run(maxRounds, threshold, envMap);
        return {
          reiType: 'MediatorRunResult' as const,
          totalRounds: result.totalRounds,
          converged: result.converged,
          convergenceRound: result.convergenceRound,
          finalAgents: result.finalState.agents,
          roundSummaries: result.rounds.map(r => ({
            round: r.round,
            activeAgents: r.metrics.activeAgents,
            conflicts: r.metrics.conflictCount,
            convergence: r.metrics.convergenceRatio,
          })),
          flowMomentum: result.finalState.flowMomentum,
        };
      }
    }

    if (cmdName === "mediate_run" || cmdName === "調停実行") {
      // any |> mediate_run(maxRounds, threshold)
      // mediate(n)のエイリアス（常に複数ラウンドモード）
      const maxRounds = args.length >= 1 ? Number(args[0]) : 10;
      const threshold = args.length >= 2 ? Number(args[1]) : 1.0;

      const envMap = new Map<string, any>();
      for (const [name, binding] of this.env.allBindings()) {
        envMap.set(name, binding);
      }

      const result = this.mediator.run(maxRounds, threshold, envMap);
      return {
        reiType: 'MediatorRunResult' as const,
        totalRounds: result.totalRounds,
        converged: result.converged,
        convergenceRound: result.convergenceRound,
        finalAgents: result.finalState.agents,
        roundSummaries: result.rounds.map(r => ({
          round: r.round,
          activeAgents: r.metrics.activeAgents,
          conflicts: r.metrics.conflictCount,
          convergence: r.metrics.convergenceRatio,
        })),
        flowMomentum: result.finalState.flowMomentum,
      };
    }

    if (cmdName === "mediator_sigma" || cmdName === "調停σ") {
      return this.mediator.sigma();
    }

    if (cmdName === "agent_priority" || cmdName === "優先度") {
      // agentId |> agent_priority(0.8)  → 優先度設定
      // agentSigma |> agent_priority(0.8)
      let agentId: string | undefined;
      if (rawInput && typeof rawInput === 'object' && rawInput.reiType === 'AgentSigma') {
        agentId = rawInput.id;
      } else if (typeof rawInput === 'string') {
        agentId = rawInput;
      }
      if (!agentId) throw new Error("agent_priority: Agent IDが必要です");

      if (args.length >= 1) {
        const priority = Number(args[0]);
        this.mediator.setAgentPriority(agentId, priority);
        return { agentId, priority };
      }
      return { agentId, priority: this.mediator.getAgentPriority(agentId) };
    }

    if (cmdName === "mediate_strategy" || cmdName === "調停戦略") {
      // any |> mediate_strategy("cooperative") → デフォルト戦略変更
      if (args.length >= 1) {
        const strategyMap: Record<string, ConflictStrategy> = {
          'priority': 'priority', '優先': 'priority',
          'cooperative': 'cooperative', '協調': 'cooperative',
          'sequential': 'sequential', '順次': 'sequential',
          'cancel_both': 'cancel_both', '両方取消': 'cancel_both',
          'mediator': 'mediator', '調停者': 'mediator',
        };
        const strategy = strategyMap[String(args[0])] ?? String(args[0]) as ConflictStrategy;
        this.mediator.defaultStrategy = strategy;
        return { strategy: this.mediator.defaultStrategy };
      }
      return { strategy: this.mediator.defaultStrategy };
    }

    if (cmdName === "mediate_message" || cmdName === "調停通信") {
      // "from_id" |> mediate_message("to_id", data)
      const fromId = typeof rawInput === 'string' ? rawInput
        : (rawInput?.id ?? rawInput?.agentId ?? String(rawInput));
      const toId = args.length >= 1 ? String(args[0]) : undefined;
      if (!toId) throw new Error("mediate_message: 宛先Agent IDが必要です");
      const data = args.length >= 2 ? (typeof args[1] === 'object' ? args[1] : { message: args[1] }) : {};
      const event = this.mediator.sendMessage(fromId, toId, data);
      return { sent: true, from: fromId, to: toId, event: event.type };
    }

    if (cmdName === "mediate_broadcast" || cmdName === "調停放送") {
      // "agent_id" |> mediate_broadcast(data)
      const fromId = typeof rawInput === 'string' ? rawInput
        : (rawInput?.id ?? rawInput?.agentId ?? String(rawInput));
      const data = args.length >= 1 ? (typeof args[0] === 'object' ? args[0] : { message: args[0] }) : {};
      const event = this.mediator.broadcast(fromId, data);
      return { broadcast: true, from: fromId, event: event.type };
    }

    // ???????????????????????????????????????????
    // v0.2.1 Original pipe commands (rawInputを使用)
    // ???????????????????????????????????????????
    if (this.isMDim(rawInput)) {
      const md = rawInput;
      switch (cmdName) {
        case "compute": {
          const m = mode || md.mode;
          return computeMDim({ ...md, mode: m });
        }
        case "center": return md.center;
        case "neighbors": return md.neighbors;
        case "dim": return md.neighbors.length;
        case "normalize": {
          const sum = md.neighbors.reduce((a: number, b: number) => a + Math.abs(b), 0) || 1;
          return { reiType: "MDim", center: md.center, neighbors: md.neighbors.map((n: number) => n / sum), mode: md.mode };
        }
        case "flatten": return computeMDim(md);
        case "map": {
          if (args.length > 0 && this.isFunction(args[0])) {
            const fn = args[0];
            const newNeighbors = md.neighbors.map((n: number) => this.toNumber(this.callFunction(fn, [n])));
            return { ...md, neighbors: newNeighbors };
          }
          return md;
        }
      }
    }

    if (this.isExt(rawInput)) {
      const ext = rawInput;
      switch (cmdName) {
        case "order": return ext.order;
        case "base": return ext.base;
        case "valStar": case "val": return ext.valStar();
        case "subscripts": return ext.subscripts;
      }
    }

    if (this.isGenesis(rawInput)) {
      const g = rawInput;
      switch (cmdName) {
        case "forward": genesisForward(g); return g;
        case "phase": return g.state;
        case "history": return g.history;
        case "omega": return g.omega;
      }
    }

    if (Array.isArray(rawInput)) {
      switch (cmdName) {
        case "len": return rawInput.length;
        case "sum": return rawInput.reduce((a: number, b: any) => a + this.toNumber(b), 0);
        case "avg": return rawInput.length === 0 ? 0 : rawInput.reduce((a: number, b: any) => a + this.toNumber(b), 0) / rawInput.length;
        case "first": return rawInput[0] ?? null;
        case "last": return rawInput[rawInput.length - 1] ?? null;
        case "reverse": return [...rawInput].reverse();
        case "sort": return [...rawInput].sort((a: any, b: any) => this.toNumber(a) - this.toNumber(b));
        case "map": {
          if (args.length > 0 && this.isFunction(args[0])) {
            return rawInput.map((v: any) => this.callFunction(args[0], [v]));
          }
          return rawInput;
        }
        case "filter": {
          if (args.length > 0 && this.isFunction(args[0])) {
            return rawInput.filter((v: any) => !!this.callFunction(args[0], [v]));
          }
          return rawInput;
        }
        case "reduce": {
          if (args.length >= 2 && this.isFunction(args[0])) {
            return rawInput.reduce((acc: any, v: any) => this.callFunction(args[0], [acc, v]), args[1]);
          }
          return rawInput;
        }
      }
    }

    if (typeof rawInput === "number") {
      switch (cmdName) {
        case "abs": return Math.abs(rawInput);
        case "sqrt": return Math.sqrt(rawInput);
        case "round": return Math.round(rawInput);
        case "floor": return Math.floor(rawInput);
        case "ceil": return Math.ceil(rawInput);
        case "negate": return -rawInput;
      }
    }

    if (typeof rawInput === "string") {
      switch (cmdName) {
        case "len": return rawInput.length;
        case "upper": return rawInput.toUpperCase();
        case "lower": return rawInput.toLowerCase();
        case "trim": return rawInput.trim();
        case "split": return rawInput.split(args[0] ?? "");
        case "reverse": return Array.from(rawInput).reverse().join("");

        // ???????????????????????????????????????????
        // 柱②: 漢字/日本語パイプコマンド
        // ???????????????????????????????????????????
        case "kanji": case "漢字": {
          // "休" |> kanji → StringMDim{center:"休", neighbors:["人","木"]}
          const chars = Array.from(rawInput);
          if (chars.length === 1) return kanjiToStringMDim(chars[0]);
          return wordToStringMDim(rawInput);
        }
        case "sentence": case "文": {
          // "猫が魚を食べた" |> sentence → StringMDim{center:"食べた", neighbors:["猫が","魚を"]}
          return sentenceToStringMDim(rawInput);
        }
        case "tone": case "声調": {
          // "ma" |> tone("?", "麻", "?", "?") → StringMDim
          return toneToStringMDim(rawInput, args.map(String));
        }
      }
    }

    // ???????????????????????????????????????????
    // 柱②: StringMDim パイプコマンド
    // ???????????????????????????????????????????
    if (rawInput !== null && typeof rawInput === 'object' && rawInput.reiType === 'StringMDim') {
      const sm = rawInput as StringMDim;
      switch (cmdName) {
        case "center": return sm.center;
        case "neighbors": return sm.neighbors;
        case "dim": return sm.neighbors.length;
        case "mode": return sm.mode;
        case "metadata": return sm.metadata ?? {};

        case "similarity": case "類似": {
          // StringMDim |> similarity("明") or similarity(otherStringMDim)
          let other: StringMDim;
          if (typeof args[0] === 'string') {
            other = kanjiToStringMDim(args[0]);
          } else if (args[0]?.reiType === 'StringMDim') {
            other = args[0];
          } else {
            throw new Error("similarity: 比較対象が必要です（文字列またはStringMDim）");
          }
          return kanjiSimilarity(sm, other);
        }
        case "radicals": case "部首": {
          // 部首情報を返す
          if (sm.mode === 'kanji' && sm.metadata?.known) {
            return { radical: sm.metadata.radical, name: sm.metadata.radicalName };
          }
          // 複数文字の場合は各文字の部首
          return sm.neighbors.map((c: string) => {
            const info = KANJI_DB[c];
            return info ? { char: c, radical: info.radical, name: info.radicalName } : { char: c, radical: '?', name: 'unknown' };
          });
        }
        case "readings": case "読み": {
          if (sm.mode === 'kanji' && sm.metadata?.known) {
            return { on: sm.metadata.on, kun: sm.metadata.kun };
          }
          return sm.neighbors.map((c: string) => {
            const info = KANJI_DB[c];
            return info ? { char: c, on: info.on, kun: info.kun } : { char: c, on: [], kun: [] };
          });
        }
        case "strokes": case "画数": {
          if (sm.mode === 'kanji' && sm.metadata?.known) {
            return sm.metadata.strokes;
          }
          return sm.neighbors.reduce((total: number, c: string) => {
            const info = KANJI_DB[c];
            return total + (info?.strokes ?? 0);
          }, 0);
        }
        case "category": case "六書": {
          if (sm.mode === 'kanji' && sm.metadata?.known) {
            return sm.metadata.category;
          }
          return sm.neighbors.map((c: string) => {
            const info = KANJI_DB[c];
            return info ? { char: c, category: info.category } : { char: c, category: 'unknown' };
          });
        }
        case "meaning": case "意味": {
          if (sm.mode === 'kanji' && sm.metadata?.known) {
            return sm.metadata.meaning;
          }
          return sm.neighbors.map((c: string) => {
            const info = KANJI_DB[c];
            return info ? { char: c, meaning: info.meaning } : { char: c, meaning: 'unknown' };
          });
        }
        case "phonetic_group": case "音符": {
          // 同じ音符を共有する漢字群
          return getPhoneticGroup(sm.center);
        }
        case "compose": case "合成": {
          // 構成要素から漢字を逆引き
          return reverseKanjiLookup(sm.neighbors);
        }
        case "decompose": case "分解": {
          // 再帰的分解: 各構成要素もさらに分解
          return sm.neighbors.map((c: string) => kanjiToStringMDim(c));
        }
        case "kanji": case "漢字": {
          // StringMDimの中心を再度漢字分解
          return kanjiToStringMDim(sm.center);
        }
        case "sigma": {
          // StringMDimのσ ? 構造情報をSigmaResultとして返す
          return {
            reiType: 'SigmaResult',
            field: { center: sm.center, neighbors: sm.neighbors, mode: sm.mode, type: 'string' },
            flow: { direction: 'rest', momentum: 0, velocity: 0 },
            memory: [],
            layer: 0,
            will: { tendency: 'rest', strength: 0, history: [] },
            relation: sm.neighbors.map((n: string) => ({ from: sm.center, to: n, type: sm.mode })),
          };
        }
      }
    }

    if (cmdName === "\u290A" || cmdName === "converge") {
      if (this.isMDim(rawInput)) return computeMDim(rawInput);
      return rawInput;
    }
    if (cmdName === "\u290B" || cmdName === "diverge") {
      if (typeof rawInput === "number") {
        return { reiType: "MDim", center: rawInput, neighbors: [rawInput, rawInput, rawInput, rawInput], mode: "weighted" };
      }
      return rawInput;
    }

    // ???????????????????????????????????????????
    // 柱④: Thought Loop ? 思考ループ（自律的自己進化）
    // ???????????????????????????????????????????

    // think / 思考: メイン思考ループ
    if (cmdName === "think" || cmdName === "思考") {
      // think("converge") / think(10) / think("seek", 15) / think("awaken")
      const config: Partial<ThoughtConfig> = {};

      if (args.length >= 1) {
        const firstArg = args[0];
        if (typeof firstArg === 'string') {
          config.strategy = firstArg;
        } else if (typeof firstArg === 'number') {
          config.maxIterations = firstArg;
          config.strategy = 'converge';
        }
      }
      if (args.length >= 2) {
        const secondArg = args[1];
        if (typeof secondArg === 'number') {
          if (config.strategy === 'seek') {
            config.targetValue = secondArg;
          } else {
            config.maxIterations = secondArg;
          }
        }
      }
      if (args.length >= 3 && typeof args[2] === 'number') {
        config.maxIterations = args[2];
      }

      // ??? Phase 3統合: 意志付き思考 ???
      // 入力に __intention__ がある場合、思考ループに意志を反映
      const inputIntention = getIntentionOf(rawInput);
      if (inputIntention && !config.strategy) {
        // 意志の種類から思考戦略を導出
        switch (inputIntention.type) {
          case 'seek':
            config.strategy = 'seek';
            if (inputIntention.target !== undefined) config.targetValue = inputIntention.target;
            break;
          case 'stabilize':
            config.strategy = 'converge';
            break;
          case 'explore':
            config.strategy = 'explore';
            break;
          case 'maximize':
            config.strategy = 'explore'; // 全モード試行
            break;
          case 'minimize':
            config.strategy = 'converge';
            break;
          case 'harmonize':
            if (inputIntention.target !== undefined) {
              config.strategy = 'seek';
              config.targetValue = inputIntention.target;
            }
            break;
          default:
            config.strategy = 'converge';
        }
        if (inputIntention.patience && !config.maxIterations) {
          config.maxIterations = inputIntention.patience;
        }
      }

      const thinkResult = thinkLoop(rawInput, config);

      // 意志付き思考の場合、結果に意志情報を付加
      if (inputIntention) {
        (thinkResult as any).__intention_guided__ = true;
        (thinkResult as any).__original_intention__ = inputIntention;
      }

      return thinkResult;
    }

    // think_trajectory / 軌跡: 思考の数値軌跡を配列で返す
    if (cmdName === "think_trajectory" || cmdName === "軌跡") {
      if (rawInput?.reiType === 'ThoughtResult') return thoughtTrajectory(rawInput);
      // 直接入力の場合は思考してから軌跡を返す
      const config: Partial<ThoughtConfig> = {};
      if (args.length >= 1 && typeof args[0] === 'string') config.strategy = args[0];
      if (args.length >= 1 && typeof args[0] === 'number') config.maxIterations = args[0];
      return thoughtTrajectory(thinkLoop(rawInput, config));
    }

    // think_modes: 各ステップで選ばれたモード配列
    if (cmdName === "think_modes") {
      if (rawInput?.reiType === 'ThoughtResult') return thoughtModes(rawInput);
      return thoughtModes(thinkLoop(rawInput, {}));
    }

    // think_dominant / 支配モード: 最も多く選ばれたモード
    if (cmdName === "think_dominant" || cmdName === "支配モード") {
      if (rawInput?.reiType === 'ThoughtResult') return dominantMode(rawInput);
      return dominantMode(thinkLoop(rawInput, {}));
    }

    // think_format / 思考表示: 思考結果の文字列フォーマット
    if (cmdName === "think_format" || cmdName === "思考表示") {
      if (rawInput?.reiType === 'ThoughtResult') return formatThought(rawInput);
      return formatThought(thinkLoop(rawInput, {}));
    }

    // ThoughtResult のアクセサパイプ
    if (rawInput?.reiType === 'ThoughtResult') {
      const tr = rawInput as ThoughtResult;
      switch (cmdName) {
        case "final_value": case "最終値": return tr.finalValue;
        case "iterations": case "反復数": return tr.totalIterations;
        case "stop_reason": case "停止理由": return tr.stopReason;
        case "trajectory": case "軌跡": return tr.trajectory;
        case "convergence": case "収束率": return tr.convergenceRate;
        case "awareness": case "覚醒度": return tr.peakAwareness;
        case "tendency": case "意志": return { tendency: tr.loopTendency, strength: tr.loopStrength };
        case "steps": case "全履歴": return tr.steps;
        case "dominant_mode": case "支配モード": return dominantMode(tr);
        case "sigma": return getThoughtSigma(tr);
      }
    }

    // ???????????????????????????????????????????
    // 柱⑤: Game & Randomness ? ゲーム統一 & ピュアランダムネス
    // ???????????????????????????????????????????

    // --- Random commands ---

    // random / ランダム: ??のneighborsからランダム選択
    if (cmdName === "random" || cmdName === "ランダム") {
      if (rawInput?.reiType === 'MDim') return randomFromMDim(rawInput);
      if (Array.isArray(rawInput)) return randomUniform(rawInput);
      if (typeof rawInput === 'number') {
        // random(n) → 0?n-1のランダム整数
        return Math.floor(rawInput * Math.random());
      }
      return randomUniform([rawInput]);
    }

    // seed: 乱数シード設定
    if (cmdName === "seed") {
      const s = typeof rawInput === 'number' ? rawInput : 42;
      seedRandom(s);
      return s;
    }

    // random_walk: ランダムウォーク
    if (cmdName === "random_walk") {
      const start = typeof rawInput === 'number' ? rawInput : 0;
      const steps = args.length >= 1 ? Number(args[0]) : 20;
      const stepSize = args.length >= 2 ? Number(args[1]) : 1;
      return randomWalk(start, steps, stepSize);
    }

    // entropy / エントロピー: シャノンエントロピー分析
    if (cmdName === "entropy" || cmdName === "エントロピー") {
      if (Array.isArray(rawInput)) return analyzeEntropy(rawInput);
      if (rawInput?.reiType === 'MDim') return analyzeEntropy(rawInput.neighbors);
      return analyzeEntropy([rawInput]);
    }

    // monte_carlo: モンテカルロサンプリング
    if (cmdName === "monte_carlo") {
      const n = args.length >= 1 ? Number(args[0]) : 100;
      if (rawInput?.reiType === 'MDim') return monteCarloSample(rawInput, n);
      return monteCarloSample({ reiType: 'MDim', center: 0, neighbors: Array.isArray(rawInput) ? rawInput : [rawInput] }, n);
    }

    // --- Game commands ---

    // game / ゲーム: ゲームスペースの作成
    if (cmdName === "game" || cmdName === "ゲーム") {
      const gameName = typeof rawInput === 'string' ? rawInput :
                       args.length >= 1 ? String(args[0]) : 'tic_tac_toe';
      const config: any = {};
      if (typeof rawInput === 'number') config.stones = rawInput;
      if (args.length >= 2 && typeof args[1] === 'number') config.stones = args[1];
      return createGameSpace(gameName, config);
    }

    // GameSpace handlers
    if (rawInput?.reiType === 'GameSpace') {
      const gs = rawInput as GameSpace;
      switch (cmdName) {
        case "play": case "打つ": {
          const pos = args.length >= 1 ? Number(args[0]) : undefined;
          return playMove(gs, pos);
        }
        case "auto_play": case "自動対局": {
          const s1 = args.length >= 1 ? String(args[0]) : gs.strategy;
          const s2 = args.length >= 2 ? String(args[1]) : gs.strategy;
          return autoPlay(gs, s1, s2);
        }
        case "best_move": case "最善手":
          return selectBestMove(gs);
        case "legal_moves": case "合法手":
          return getLegalMoves(gs);
        case "board": case "盤面":
          return gs.state.board;
        case "status": case "状態":
          return gs.state.status;
        case "winner": case "勝者":
          return gs.state.winner;
        case "turn": case "手番":
          return gs.state.currentPlayer;
        case "history": case "棋譜":
          return gs.state.moveHistory;
        case "game_format": case "盤面表示":
          return formatGame(gs);
        case "as_mdim":
          return gameAsMDim(gs);
        case "sigma": case "game_sigma":
          return getGameSigma(gs);

        // ── Phase 4: Agent基盤対局 ──

        // agent_play / 自律対戦: Agent化して対局（決着まで）
        case "agent_play": case "自律対戦": {
          const s1 = args.length >= 1 ? String(args[0]) : gs.strategy;
          const s2 = args.length >= 2 ? String(args[1]) : gs.strategy;
          const maxRounds = args.length >= 3 ? Number(args[2]) : 20;
          const space = createGameAgentSpace(gs, s1, s2);
          return agentSpaceRun(space, maxRounds);
        }

        // agent_turn / 自律手番: Agent化して1手だけ打つ
        case "agent_turn": case "自律手番": {
          const s1 = args.length >= 1 ? String(args[0]) : gs.strategy;
          const s2 = args.length >= 2 ? String(args[1]) : gs.strategy;
          const space = createGameAgentSpace(gs, s1, s2);
          agentSpaceRunRound(space);
          return agentSpaceRun(space, 0);
        }

        // agent_match / 自律対局: = agent_play のエイリアス
        case "agent_match": case "自律対局": {
          const s1 = args.length >= 1 ? String(args[0]) : gs.strategy;
          const s2 = args.length >= 2 ? String(args[1]) : gs.strategy;
          const space = createGameAgentSpace(gs, s1, s2);
          return agentSpaceRun(space, 50);
        }

        // as_agent_space / 空間Agent化: AgentSpaceに変換（実行前）
        case "as_agent_space": case "空間Agent化": {
          const s1 = args.length >= 1 ? String(args[0]) : gs.strategy;
          const s2 = args.length >= 2 ? String(args[1]) : gs.strategy;
          return createGameAgentSpace(gs, s1, s2);
        }

        // Phase 4c: 対局分析
        case "agent_analyze": case "自律分析": {
          const s1 = args.length >= 1 ? String(args[0]) : gs.strategy;
          const s2 = args.length >= 2 ? String(args[1]) : gs.strategy;
          const maxRounds = args.length >= 3 ? Number(args[2]) : 50;
          const space = createGameAgentSpace(gs, s1, s2);
          agentSpaceRun(space, maxRounds);
          return getMatchAnalysis(space);
        }

        // ???????????????????????????????????????????
        // Phase 3統合: Game × Will ? 意志駆動の戦略選択
        // ???????????????????????????????????????????

        // game_intend / ゲーム意志: ゲームに意志を付与
        case "game_intend": case "ゲーム意志": {
          const intentTypeArg = args.length >= 1 ? String(args[0]) : 'maximize';
          const typeMap: Record<string, IntentionType> = {
            'maximize': 'maximize', '最大化': 'maximize',
            'minimize': 'minimize', '最小化': 'minimize',
            'seek': 'seek', '接近': 'seek',
            'explore': 'explore', '探索': 'explore',
            'stabilize': 'stabilize', '安定': 'stabilize',
          };
          const intentType = typeMap[intentTypeArg] ?? 'maximize';
          const target = args.length >= 2 ? Number(args[1]) : undefined;
          const intention = createIntention(intentType, target);
          const result = { ...gs } as any;
          result.__intention__ = intention;
          return result;
        }

        // will_play / 意志打ち: 意志計算で最善手を選択して1手進める
        case "will_play": case "意志打ち": {
          const moves = getLegalMoves(gs);
          if (moves.length === 0 || gs.state.status !== 'playing') return gs;

          // 各合法手を??のneighborとして表現
          // center = 現在ターン数、neighbors = 各手の評価値
          const evaluations = moves.map(move => {
            const newState = gs.rules.applyMove(gs.state, move);
            return gs.rules.evaluate(newState, gs.state.currentPlayer);
          });

          const gameMd = {
            reiType: 'MDim' as const,
            center: gs.state.turnCount,
            neighbors: evaluations,
            mode: 'weighted',
          };

          // 意志を決定（ゲームに付与済みの意志 or デフォルト maximize）
          const gameIntention = (gs as any).__intention__
            ?? createIntention('maximize');

          const willResult = willCompute(gameMd, gameIntention);

          // will_compute が選んだモードから最善手のインデックスを決定
          // maximize → 最大評価の手、minimize → 最小評価の手
          let bestIdx = 0;
          if (gameIntention.type === 'maximize') {
            bestIdx = evaluations.indexOf(Math.max(...evaluations));
          } else if (gameIntention.type === 'minimize') {
            bestIdx = evaluations.indexOf(Math.min(...evaluations));
          } else if (gameIntention.type === 'seek' && gameIntention.target !== undefined) {
            let minDist = Infinity;
            evaluations.forEach((ev, i) => {
              const dist = Math.abs(ev - (gameIntention.target ?? 0));
              if (dist < minDist) { minDist = dist; bestIdx = i; }
            });
          } else if (gameIntention.type === 'explore') {
            // ランダムに選択（探索意志）
            bestIdx = Math.floor(Math.random() * moves.length);
          } else {
            bestIdx = evaluations.indexOf(Math.max(...evaluations));
          }

          const chosenMove = moves[bestIdx];
          const result = playMove(gs, chosenMove);
          // 意志計算の情報を付加
          (result as any).__will_choice__ = {
            chosenMove,
            evaluation: evaluations[bestIdx],
            allEvaluations: moves.map((m, i) => ({ move: m, score: evaluations[i] })),
            willResult,
            intentionType: gameIntention.type,
          };
          return result;
        }

        // will_auto_play / 意志対局: 意志駆動で自動対局
        case "will_auto_play": case "意志対局": {
          let current = { ...gs } as any;
          const p1Intent = args.length >= 1 ? String(args[0]) : 'maximize';
          const p2Intent = args.length >= 2 ? String(args[1]) : 'maximize';
          let safetyCounter = 0;

          while (current.state.status === 'playing' && safetyCounter < 200) {
            safetyCounter++;
            const currentIntent = current.state.currentPlayer === 1 ? p1Intent : p2Intent;
            const typeMap: Record<string, IntentionType> = {
              'maximize': 'maximize', 'minimize': 'minimize',
              'seek': 'seek', 'explore': 'explore', 'stabilize': 'stabilize',
              '最大化': 'maximize', '探索': 'explore',
            };
            const intentType = typeMap[currentIntent] ?? 'maximize';
            current.__intention__ = createIntention(intentType);

            // will_play と同じロジック
            const moves = getLegalMoves(current);
            if (moves.length === 0) break;

            const evaluations = moves.map(move => {
              const newState = current.rules.applyMove(current.state, move);
              return current.rules.evaluate(newState, current.state.currentPlayer);
            });

            let bestIdx = 0;
            if (intentType === 'maximize') {
              bestIdx = evaluations.indexOf(Math.max(...evaluations));
            } else if (intentType === 'explore') {
              bestIdx = Math.floor(Math.random() * moves.length);
            } else {
              bestIdx = evaluations.indexOf(Math.max(...evaluations));
            }

            current = playMove(current, moves[bestIdx]);
          }
          return current;
        }

        // game_will_sigma / ゲーム意志σ: ゲームの意志情報を含むσ
        case "game_will_sigma": case "ゲーム意志σ": {
          const baseSigma = getGameSigma(gs);
          const gameIntention = (gs as any).__intention__;
          const willChoice = (gs as any).__will_choice__;
          return {
            ...baseSigma,
            will: gameIntention ? {
              type: gameIntention.type,
              target: gameIntention.target,
              satisfaction: gameIntention.satisfaction,
            } : null,
            lastWillChoice: willChoice ?? null,
          };
        }
      }
    }

    // simulate / シミュレート: 複数対局シミュレーション
    if (cmdName === "simulate" || cmdName === "シミュレート") {
      const gameName = typeof rawInput === 'string' ? rawInput : 'tic_tac_toe';
      const n = args.length >= 1 ? Number(args[0]) : 10;
      const s1 = args.length >= 2 ? String(args[1]) : 'minimax';
      const s2 = args.length >= 3 ? String(args[2]) : 'random';
      return simulateGames(gameName, n, s1, s2);
    }

    // RandomResult accessors
    if (rawInput?.reiType === 'RandomResult') {
      const rr = rawInput as RandomResult;
      switch (cmdName) {
        case "value": return rr.value;
        case "probability": case "確率": return rr.probability;
        case "entropy": case "エントロピー": return rr.entropy;
      }
    }

    // EntropyAnalysis accessors
    if (rawInput?.reiType === 'EntropyAnalysis') {
      const ea = rawInput as EntropyAnalysis;
      switch (cmdName) {
        case "shannon": return ea.shannon;
        case "relative": return ea.relativeEntropy;
        case "distribution": return ea.distribution;
      }
    }

    // ???????????????????????????????????????????
    // 柱③: Puzzle Unification ? パズル統一
    // ???????????????????????????????????????????

    // puzzle / パズル / 数独 / sudoku: パズル空間の作成
    if (cmdName === "puzzle" || cmdName === "パズル" || cmdName === "sudoku" || cmdName === "数独") {
      // 文字列入力 → parseGrid
      if (typeof rawInput === 'string') {
        const grid = parseGrid(rawInput);
        return createSudokuSpace(grid);
      }
      // 配列入力 → 直接グリッド or フラット配列
      if (Array.isArray(rawInput)) {
        if (Array.isArray(rawInput[0])) {
          return createSudokuSpace(rawInput as number[][]);
        }
        // フラット配列
        const grid = parseGrid(rawInput as number[]);
        return createSudokuSpace(grid);
      }
      // 数値入力 → ヒント数で生成
      if (typeof rawInput === 'number') {
        const seed = args.length > 0 ? Number(args[0]) : undefined;
        const grid = generateSudoku(rawInput, seed);
        return createSudokuSpace(grid);
      }
      throw new Error('puzzle: 文字列・配列・数値のいずれかを入力してください');
    }

    // latin_square / ラテン方陣
    if (cmdName === "latin_square" || cmdName === "ラテン方陣") {
      if (Array.isArray(rawInput)) {
        if (Array.isArray(rawInput[0])) {
          return createLatinSquareSpace(rawInput as number[][]);
        }
        const grid = parseGrid(rawInput as number[]);
        return createLatinSquareSpace(grid);
      }
      throw new Error('latin_square: 二次元配列を入力してください');
    }

    // generate_sudoku / 数独生成
    if (cmdName === "generate_sudoku" || cmdName === "数独生成") {
      const clues = typeof rawInput === 'number' ? rawInput : 30;
      const seed = args.length > 0 ? Number(args[0]) : undefined;
      const grid = generateSudoku(clues, seed);
      return createSudokuSpace(grid);
    }

    // PuzzleSpace handlers
    if (rawInput?.reiType === 'PuzzleSpace') {
      const ps = rawInput as PuzzleSpace;

      switch (cmdName) {
        // 解く
        case "solve": case "解く":
          return solvePuzzle(ps);

        // 制約伝播のみ
        case "propagate": case "伝播": {
          const maxSteps = args.length > 0 ? Number(args[0]) : 100;
          return propagateOnly(ps, maxSteps);
        }

        // 1ステップ伝播
        case "step": case "ステップ":
          propagateStep(ps);
          return ps;

        // Naked Pair
        case "propagate_pair": case "裸ペア":
          propagateNakedPair(ps);
          return ps;

        // セル取得（??形式）
        case "cell": case "セル": {
          const row = args.length > 0 ? Number(args[0]) : 0;
          const col = args.length > 1 ? Number(args[1]) : 0;
          return cellAsMDim(ps, row, col);
        }

        // 候補取得
        case "candidates": case "候補": {
          const row = args.length > 0 ? Number(args[0]) : 0;
          const col = args.length > 1 ? Number(args[1]) : 0;
          return getCandidates(ps, row, col);
        }

        // グリッド取得
        case "grid": case "盤面":
          return getGrid(ps);

        // 表示
        case "puzzle_format": case "数独表示":
          return formatSudoku(ps);

        // 難易度
        case "difficulty": case "難易度":
          return estimateDifficulty(ps);

        // σ
        case "sigma":
          return getPuzzleSigma(ps);

        // ── Phase 4: Agent基盤解法 ──

        // agent_solve / 自律解法: パズルをAgent化して解く
        case "agent_solve": case "自律解法": {
          const maxRounds = args.length > 0 ? Number(args[0]) : 100;
          const space = createPuzzleAgentSpace(ps);
          return agentSpaceRun(space, maxRounds);
        }

        // as_agent_space / 空間Agent化: AgentSpaceに変換（実行前）
        case "as_agent_space": case "空間Agent化":
          return createPuzzleAgentSpace(ps);

        // agent_propagate / 自律伝播: Nラウンドだけ実行
        case "agent_propagate": case "自律伝播": {
          const rounds = args.length > 0 ? Number(args[0]) : 1;
          const space = createPuzzleAgentSpace(ps);
          for (let i = 0; i < rounds; i++) {
            agentSpaceRunRound(space);
            if (space.solved) break;
          }
          return agentSpaceRun(space, 0);  // build result without additional rounds
        }

        // Phase 4b: 難易度分析
        case "agent_difficulty": case "自律難易度": {
          const maxRounds = args.length > 0 ? Number(args[0]) : 100;
          const space = createPuzzleAgentSpace(ps);
          agentSpaceRun(space, maxRounds);
          return getDifficultyAnalysis(space);
        }

        // Phase 4b: 推論追跡
        case "agent_trace": case "自律追跡": {
          const maxRounds = args.length > 0 ? Number(args[0]) : 100;
          const space = createPuzzleAgentSpace(ps);
          agentSpaceRun(space, maxRounds);
          return getReasoningTrace(space);
        }

        // 状態
        case "status": case "状態":
          return {
            solved: ps.solved,
            confirmedCells: ps.confirmedCells,
            totalCandidates: ps.totalCandidates,
            step: ps.step,
            size: ps.size,
            puzzleType: ps.puzzleType,
          };

        // 履歴
        case "history": case "履歴":
          return ps.history;

        // ??形式変換
        case "as_mdim": {
          const row = args.length > 0 ? Number(args[0]) : 0;
          const col = args.length > 1 ? Number(args[1]) : 0;
          return cellAsMDim(ps, row, col);
        }

        // ???????????????????????????????????????????
        // Phase 3統合: Puzzle × Bind ? 制約を関係として表現
        // ???????????????????????????????????????????

        // puzzle_bind_constraints / 制約結合: 制約グループをBindingRegistryに登録
        case "puzzle_bind_constraints": case "制約結合": {
          let bindCount = 0;
          for (const group of ps.constraints) {
            if (group.type !== 'all_different') continue;
            // グループ内の各セルペアを causal 結合（制約 = 相互因果）
            for (let i = 0; i < group.cells.length; i++) {
              for (let j = i + 1; j < group.cells.length; j++) {
                const [ri, ci] = group.cells[i];
                const [rj, cj] = group.cells[j];
                const refA = `cell_${ri}_${ci}`;
                const refB = `cell_${rj}_${cj}`;
                // 同じペアが既に登録済みならスキップ
                const existing = this.bindingRegistry.getBindingsFor(refA);
                if (existing.some(b => b.target === refB)) continue;
                this.bindingRegistry.bind(refA, refB, 'entangle', 1.0, true);
                bindCount++;
              }
            }
          }
          return {
            reiType: 'PuzzleBindResult' as const,
            constraintGroups: ps.constraints.length,
            bindingsCreated: bindCount,
            puzzleType: ps.puzzleType,
            size: ps.size,
          };
        }

        // cell_relations / セル関係: 指定セルの全関係を照会
        case "cell_relations": case "セル関係": {
          const row = args.length > 0 ? Number(args[0]) : 0;
          const col = args.length > 1 ? Number(args[1]) : 0;
          const cellRef = `cell_${row}_${col}`;
          const bindings = this.bindingRegistry.getBindingsFor(cellRef);
          // 関係の解読: cell_R_C → (R, C) に戻す
          const relations = bindings.map(b => {
            const targetMatch = b.target.match(/cell_(\d+)_(\d+)/);
            if (!targetMatch) return null;
            const tr = Number(targetMatch[1]);
            const tc = Number(targetMatch[2]);
            // どの制約グループに属するか特定
            const groups: string[] = [];
            for (const g of ps.constraints) {
              const hasSource = g.cells.some(([r, c]) => r === row && c === col);
              const hasTarget = g.cells.some(([r, c]) => r === tr && c === tc);
              if (hasSource && hasTarget) groups.push(g.label);
            }
            return {
              target: [tr, tc],
              mode: b.mode,
              strength: b.strength,
              constraintGroups: groups,
              targetValue: ps.cells[tr]?.[tc]?.value ?? 0,
              targetCandidates: ps.cells[tr]?.[tc]?.candidates ?? [],
            };
          }).filter(Boolean);
          return {
            cell: [row, col],
            value: ps.cells[row]?.[col]?.value ?? 0,
            candidates: ps.cells[row]?.[col]?.candidates ?? [],
            relatedCells: relations.length,
            relations,
          };
        }

        // puzzle_will_solve / 意志解法: 意志駆動でパズルを解く
        case "puzzle_will_solve": case "意志解法": {
          // 各未確定セルに「seek」意志を付与して候補を評価
          const solveLog: string[] = [];
          let confirms = 0;
          for (let r = 0; r < ps.size; r++) {
            for (let c = 0; c < ps.size; c++) {
              const cell = ps.cells[r][c];
              if (cell.value > 0 || cell.candidates.length !== 1) continue;
              // 候補が1つのセルを確定（will的にはseek成功）
              cell.value = cell.candidates[0];
              cell.candidates = [];
              confirms++;
              solveLog.push(`(${r},${c})=${cell.value} [意志確定]`);
            }
          }
          // 通常の伝播も実行
          const propagated = propagateOnly(ps, 50);
          // σ更新
          let totalCandidates = 0;
          let confirmedCells = 0;
          for (let r = 0; r < ps.size; r++) {
            for (let c = 0; c < ps.size; c++) {
              if (ps.cells[r][c].value > 0) confirmedCells++;
              else totalCandidates += ps.cells[r][c].candidates.length;
            }
          }
          ps.totalCandidates = totalCandidates;
          ps.confirmedCells = confirmedCells;
          ps.solved = confirmedCells === ps.size * ps.size;
          return {
            reiType: 'PuzzleWillSolveResult' as const,
            willConfirmations: confirms,
            solved: ps.solved,
            confirmedCells: ps.confirmedCells,
            remainingCandidates: ps.totalCandidates,
            log: solveLog,
          };
        }
      }
    }

    // ── AgentSpace handlers ──
    if (rawInput?.reiType === 'AgentSpace') {
      const as = rawInput as AgentSpace;
      switch (cmdName) {
        // 実行（収束/決着まで）
        case "run": case "run_agents": case "実行": case "自律実行": {
          const maxRounds = args.length > 0 ? Number(args[0]) : 100;
          const threshold = args.length > 1 ? Number(args[1]) : 1.0;
          return agentSpaceRun(as, maxRounds, threshold);
        }
        // 1ラウンド
        case "step": case "round": case "ステップ": case "ラウンド":
          agentSpaceRunRound(as);
          return as;
        // σ
        case "sigma": case "自律σ":
          return getAgentSpaceSigma(as);
        // 盤面
        case "grid": case "盤面":
          return as.kind === 'puzzle' ? getAgentSpaceGrid(as) : getAgentSpaceGameState(as);
        // 表示
        case "format": case "表示":
          return as.kind === 'puzzle' ? formatAgentSpacePuzzle(as) : formatAgentSpaceGame(as);
        // 調停σ
        case "mediator_sigma": case "調停σ":
          return as.mediator.sigma();
      }
    }

    // ── AgentSpaceResult handlers ──
    if (rawInput?.reiType === 'AgentSpaceResult') {
      const ar = rawInput as AgentSpaceResult;
      switch (cmdName) {
        case "grid": case "盤面":
          return ar.grid ?? ar.finalBoard ?? null;
        case "winner": case "勝者":
          return ar.winner ?? null;
        case "rounds": case "ラウンド数":
          return ar.totalRounds;
        case "solved": case "解決":
          return ar.solved;
        case "history": case "履歴":
          return ar.rounds;
        case "moves": case "棋譜":
          return ar.moveHistory ?? [];
        // Phase 4b
        case "difficulty": case "難易度":
          return ar.difficulty ?? null;
        case "trace": case "追跡":
          // 引数あり → 関係追跡、引数なし → 推論追跡
          if (args.length > 0) {
            const cellRef = cellRefToAgentId(String(args[0]));
            const maxDepth = args.length > 1 ? Number(args[1]) : 5;
            return traceAgentRelations(ar, cellRef, maxDepth);
          }
          return ar.reasoningTrace ?? [];
        // Phase 4c
        case "analyze": case "分析":
          return ar.matchAnalysis ?? null;

        // Phase 4d: relation deep（相互依存追跡）
        case "relations": case "関係":
          return ar.relationSummary ?? null;
        case "relation_trace": case "関係追跡": {
          if (args.length < 1) throw new Error("relation_trace: セル参照が必要です (例: \"R1C1\" or \"cell_0_0\")");
          const cellRef = cellRefToAgentId(String(args[0]));
          const maxDepth = args.length > 1 ? Number(args[1]) : 5;
          return traceAgentRelations(ar, cellRef, maxDepth);
        }
        case "influence": case "影響": {
          if (args.length < 2) throw new Error("influence: 2つのセル参照が必要です (例: \"R1C1\", \"R1C4\")");
          const fromRef = cellRefToAgentId(String(args[0]));
          const toRef = cellRefToAgentId(String(args[1]));
          return computeAgentInfluence(ar, fromRef, toRef);
        }

        // Phase 4d: will deep（意志駆動）
        case "will_summary": case "意志要約":
          return ar.willSummary ?? null;
        case "will_conflict": case "意志衝突":
          return detectGameWillConflict(ar);
        case "will_align": case "意志調律":
          return alignGameWills(ar);
        case "will_history": case "意志履歴":
          return ar.willSummary?.willHistory ?? [];
      }
    }

    // ═══════════════════════════════════════════════════════════
    // Phase 5.5: 6属性ファーストクラス化
    // ═══════════════════════════════════════════════════════════

    // ── 場 (field) ──
    if (cmdName === "field_of" || cmdName === "場") {
      return extractFieldInfo(rawInput, sigmaMetadata);
    }
    if (cmdName === "field_set" || cmdName === "場設定") {
      const key = args.length >= 1 ? String(args[0]) : '0';
      const val = args.length >= 2 ? args[1] : null;
      return setField(rawInput, key, val);
    }
    if (cmdName === "field_merge" || cmdName === "場融合") {
      const other = args.length >= 1 ? args[0] : [];
      return mergeFields(rawInput, other);
    }
    if (cmdName === "field_topology" || cmdName === "場位相") {
      return analyzeFieldTopology(rawInput);
    }

    // ── 流れ (flow) ──
    if (cmdName === "flow_of" || cmdName === "流れ") {
      return extractFlowInfo(rawInput, sigmaMetadata);
    }
    if (cmdName === "flow_set" || cmdName === "流れ設定") {
      const direction = args.length >= 1 ? String(args[0]) : 'expand';
      const newMeta = setFlowDirection(sigmaMetadata, direction);
      Object.assign(sigmaMetadata, newMeta);
      return rawInput;
    }
    if (cmdName === "flow_reverse" || cmdName === "流れ反転") {
      const newMeta = reverseFlow(sigmaMetadata);
      Object.assign(sigmaMetadata, newMeta);
      return rawInput;
    }
    if (cmdName === "flow_accelerate" || cmdName === "流れ加速") {
      const factor = args.length >= 1 ? this.toNumber(args[0]) : 1.5;
      const newMeta = accelerateFlow(sigmaMetadata, factor);
      Object.assign(sigmaMetadata, newMeta);
      return rawInput;
    }

    // ── 記憶 (memory) ──
    if (cmdName === "memory_of" || cmdName === "記憶") {
      return extractMemoryInfo(rawInput, sigmaMetadata);
    }
    if (cmdName === "memory_search" || cmdName === "記憶検索") {
      const query = args.length >= 1 ? String(args[0]) : '';
      return searchMemory(sigmaMetadata, query);
    }
    if (cmdName === "memory_snapshot" || cmdName === "記憶断面") {
      const index = args.length >= 1 ? this.toNumber(args[0]) : -1;
      return memorySnapshot(sigmaMetadata, index);
    }
    if (cmdName === "memory_forget" || cmdName === "記憶忘却") {
      const keep = args.length >= 1 ? this.toNumber(args[0]) : 5;
      const newMeta = forgetMemory(sigmaMetadata, keep);
      Object.assign(sigmaMetadata, newMeta);
      return rawInput;
    }

    // ── 層 (layer) ──
    if (cmdName === "layer_of" || cmdName === "層") {
      return extractLayerInfo(rawInput, sigmaMetadata);
    }
    if (cmdName === "layer_deepen" || cmdName === "層深化") {
      return deepenLayer(rawInput);
    }
    if (cmdName === "layer_flatten" || cmdName === "層平坦") {
      return flattenLayer(rawInput);
    }

    // ── 関係 拡張 (relation extended) ──
    if (cmdName === "relation_topology" || cmdName === "関係位相") {
      const ref = this.findRefByValue(input);
      const bindings = ref ? this.bindingRegistry.buildRelationSigma(ref) : [];
      return analyzeRelationTopology(bindings);
    }
    if (cmdName === "relation_symmetry" || cmdName === "関係対称") {
      const ref = this.findRefByValue(input);
      const bindings = ref ? this.bindingRegistry.buildRelationSigma(ref) : [];
      return analyzeRelationSymmetry(bindings);
    }

    // ── 意志 拡張 (will extended) ──
    if (cmdName === "will_emerge" || cmdName === "意志創発") {
      return emergeWill(rawInput, sigmaMetadata);
    }
    if (cmdName === "will_collective" || cmdName === "集合意志") {
      if (Array.isArray(rawInput)) {
        const wills = rawInput.map((item: any) => ({
          tendency: typeof item === 'object' ? (item.tendency ?? 'rest') : 'rest',
          strength: typeof item === 'object' ? (item.strength ?? 0.5) : 0.5,
        }));
        return computeCollectiveWill(wills);
      }
      throw new Error('will_collective: 配列が必要です');
    }

    // ── 星座分析 (constellation) ──
    if (cmdName === "constellation" || cmdName === "星座") {
      return computeConstellation(rawInput, sigmaMetadata);
    }
    if (cmdName === "attr_balance" || cmdName === "属性均衡") {
      const c = computeConstellation(rawInput, sigmaMetadata);
      return { balance: c.balance, dominant: c.dominantAttribute, weakest: c.weakestAttribute, pattern: c.pattern };
    }
    if (cmdName === "attr_resonance" || cmdName === "属性共鳴") {
      const c = computeConstellation(rawInput, sigmaMetadata);
      return { resonances: c.resonances, harmony: c.harmony };
    }
    if (cmdName === "attr_compose" || cmdName === "属性合成") {
      if (rawInput?.reiType === 'AttributeConstellation' && args.length >= 1 && args[0]?.reiType === 'AttributeConstellation') {
        const mode = args.length >= 2 ? String(args[1]) as any : 'blend';
        return composeAttributes(rawInput, args[0], mode);
      }
      throw new Error('attr_compose: 2つのAttributeConstellationが必要です');
    }
    if (cmdName === "constellation_sigma" || cmdName === "星座σ") {
      if (rawInput?.reiType === 'AttributeConstellation') return getConstellationSigma(rawInput);
      throw new Error('constellation_sigma: AttributeConstellationが必要です');
    }

    // ── 動的カスケード (dynamic cascade) ──
    if (cmdName === "dynamic_cascade" || cmdName === "動的連鎖") {
      const attr = args.length >= 1 ? String(args[0]) as AttrName : 'field';
      const event = args.length >= 2 ? String(args[1]) : 'restructure';
      const maxDepth = args.length >= 3 ? this.toNumber(args[2]) : 8;
      return dynamicCascade(rawInput, sigmaMetadata, attr, event, maxDepth);
    }
    if (cmdName === "cascade_sigma" || cmdName === "連鎖σ") {
      if (rawInput?.reiType === 'DynamicCascadeResult') return getDynamicCascadeSigma(rawInput);
      throw new Error('cascade_sigma: DynamicCascadeResultが必要です');
    }
    if (cmdName === "evolve_constellation" || cmdName === "星座発展") {
      const steps = args.length >= 1 ? this.toNumber(args[0]) : 10;
      return evolveConstellation(rawInput, sigmaMetadata, steps);
    }
    if (cmdName === "constellation_history_sigma" || cmdName === "星座履歴σ") {
      if (rawInput?.reiType === 'ConstellationHistory') return getConstellationHistorySigma(rawInput);
      throw new Error('constellation_history_sigma: ConstellationHistoryが必要です');
    }
    if (cmdName === "lifecycle" || cmdName === "生命段階") {
      const constellation = rawInput?.reiType === 'AttributeConstellation'
        ? rawInput : computeConstellation(rawInput, sigmaMetadata);
      return classifyLifecycle(constellation);
    }
    if (cmdName === "resonance_detect" || cmdName === "共鳴検出") {
      const constellation = rawInput?.reiType === 'AttributeConstellation'
        ? rawInput : computeConstellation(rawInput, sigmaMetadata);
      return detectResonanceAmplification(constellation);
    }

    // ═══════════════════════════════════════════════════════════
    // Phase 5: マルチドメイン拡張
    // ═══════════════════════════════════════════════════════════

    // ── 共通層: SimulationSpace ──
    if (cmdName === "nbody" || cmdName === "N体") {
      const n = typeof rawInput === 'number' ? rawInput : (Array.isArray(rawInput) ? rawInput[0] : 3);
      const forceType = args.length >= 1 ? String(args[0]) : 'gravity';
      return createNBodySpace(n, forceType);
    }

    if (cmdName === "sim_step" || cmdName === "シミュレーション_ステップ") {
      if (rawInput?.reiType === 'SimulationSpace') return simStepCore(rawInput);
      throw new Error('sim_step: SimulationSpaceが必要です');
    }

    if (cmdName === "sim_run" || cmdName === "シミュレーション_実行") {
      const steps = args.length >= 1 ? this.toNumber(args[0]) : 100;
      if (rawInput?.reiType === 'SimulationSpace') return simRunCore(rawInput, steps);
      throw new Error('sim_run: SimulationSpaceが必要です');
    }

    if (cmdName === "sim_sigma" || cmdName === "シミュレーションσ") {
      if (rawInput?.reiType === 'SimulationSpace') return getSimulationSigma(rawInput);
      throw new Error('sim_sigma: SimulationSpaceが必要です');
    }

    // ── 共通層: WaveField ──
    if (cmdName === "wave_field" || cmdName === "波動場") {
      if (Array.isArray(rawInput) && rawInput.length >= 2) {
        return createWaveField(rawInput[0], rawInput[1]);
      }
      const size = typeof rawInput === 'number' ? rawInput : 10;
      return createWaveField(size, size);
    }

    if (cmdName === "wave_step" || cmdName === "波動ステップ") {
      if (rawInput?.reiType === 'WaveFieldSpace') return waveStepCore(rawInput);
      throw new Error('wave_step: WaveFieldSpaceが必要です');
    }

    if (cmdName === "wave_run" || cmdName === "波動実行") {
      const steps = args.length >= 1 ? this.toNumber(args[0]) : 50;
      if (rawInput?.reiType === 'WaveFieldSpace') return waveRunCore(rawInput, steps);
      throw new Error('wave_run: WaveFieldSpaceが必要です');
    }

    if (cmdName === "wave_sigma" || cmdName === "波動σ") {
      if (rawInput?.reiType === 'WaveFieldSpace') return getWaveFieldSigma(rawInput);
      throw new Error('wave_sigma: WaveFieldSpaceが必要です');
    }

    // ── 共通層: PipelineSpace ──
    if (cmdName === "pipeline" || cmdName === "パイプライン") {
      return createPipelineSpace(rawInput);
    }

    if (cmdName === "pipe_stage" || cmdName === "パイプステージ") {
      if (rawInput?.reiType === 'PipelineSpace') {
        const stageName = args.length >= 1 ? String(args[0]) : 'extract';
        return addPipelineStage(rawInput, stageName, stageName as any, (data: any) => data);
      }
      throw new Error('pipe_stage: PipelineSpaceが必要です');
    }

    if (cmdName === "pipe_run" || cmdName === "パイプ実行") {
      if (rawInput?.reiType === 'PipelineSpace') return pipelineRunCore(rawInput);
      throw new Error('pipe_run: PipelineSpaceが必要です');
    }

    if (cmdName === "pipe_sigma" || cmdName === "パイプσ") {
      if (rawInput?.reiType === 'PipelineSpace') return getPipelineSigma(rawInput);
      throw new Error('pipe_sigma: PipelineSpaceが必要です');
    }

    // ── 共通層: GraphSpace ──
    if (cmdName === "graph" || cmdName === "グラフ") {
      return createGraphSpace('general');
    }

    if (cmdName === "graph_node" || cmdName === "グラフノード") {
      if (rawInput?.reiType === 'GraphSpace') {
        const id = args.length >= 1 ? String(args[0]) : 'node';
        const label = args.length >= 2 ? String(args[1]) : undefined;
        return addGNode(rawInput, id, label);
      }
      throw new Error('graph_node: GraphSpaceが必要です');
    }

    if (cmdName === "graph_edge" || cmdName === "グラフエッジ") {
      if (rawInput?.reiType === 'GraphSpace') {
        const from = args.length >= 1 ? String(args[0]) : '';
        const to = args.length >= 2 ? String(args[1]) : '';
        const type = args.length >= 3 ? String(args[2]) : 'related';
        return addGEdge(rawInput, from, to, type);
      }
      throw new Error('graph_edge: GraphSpaceが必要です');
    }

    if (cmdName === "graph_traverse" || cmdName === "グラフ走査") {
      if (rawInput?.reiType === 'GraphSpace') {
        const startId = args.length >= 1 ? String(args[0]) : '';
        const mode = args.length >= 2 ? String(args[1]) as 'bfs' | 'dfs' : 'bfs';
        return graphTraverseCore(rawInput, startId, mode);
      }
      throw new Error('graph_traverse: GraphSpaceが必要です');
    }

    if (cmdName === "graph_sigma" || cmdName === "グラフσ") {
      if (rawInput?.reiType === 'GraphSpace') return getGraphSigma(rawInput);
      throw new Error('graph_sigma: GraphSpaceが必要です');
    }

    // ── ドメインC: 情報工学 - ETL ──
    if (cmdName === "etl" || cmdName === "ETL") {
      return createETLSpace(rawInput);
    }

    if (cmdName === "etl_stage" || cmdName === "ETLステージ") {
      if (rawInput?.reiType === 'PipelineSpace') {
        const stageName = args.length >= 1 ? String(args[0]) : 'extract';
        const config = args.length >= 2 && typeof args[1] === 'object' ? args[1] : undefined;
        return addETLStage(rawInput, stageName, config);
      }
      throw new Error('etl_stage: PipelineSpaceが必要です');
    }

    // ── ドメインC: 情報工学 - LLMチェーン ──
    if (cmdName === "llm_chain" || cmdName === "LLMチェーン") {
      if (typeof rawInput === 'string') return createLLMChain(rawInput);
      throw new Error('llm_chain: 文字列が必要です');
    }

    if (cmdName === "llm_stage" || cmdName === "LLMステージ") {
      if (rawInput?.reiType === 'LLMChainSpace') {
        const role = args.length >= 1 ? String(args[0]) : 'process';
        const instruction = args.length >= 2 ? String(args[1]) : undefined;
        return addLLMStage(rawInput, role, instruction);
      }
      throw new Error('llm_stage: LLMChainSpaceが必要です');
    }

    if (cmdName === "llm_sigma" || cmdName === "LLMσ") {
      if (rawInput?.reiType === 'LLMChainSpace') return getLLMChainSigma(rawInput);
      throw new Error('llm_sigma: LLMChainSpaceが必要です');
    }

    // ── ドメインD: 人文科学 - テキスト分析 ──
    if (cmdName === "text_analyze" || cmdName === "テキスト分析") {
      if (typeof rawInput === 'string') return analyzeText(rawInput);
      throw new Error('text_analyze: 文字列が必要です');
    }

    if (cmdName === "text_sigma" || cmdName === "テキストσ") {
      if (rawInput?.reiType === 'TextAnalysis') return getTextSigma(rawInput);
      throw new Error('text_sigma: TextAnalysisが必要です');
    }

    // ── ドメインD: 人文科学 - 系譜・因果ネットワーク ──
    if (cmdName === "genealogy" || cmdName === "系譜") {
      return createGenealogy(typeof rawInput === 'string' ? rawInput : undefined);
    }

    if (cmdName === "causal_network" || cmdName === "因果網") {
      return createCausalNetwork(typeof rawInput === 'string' ? rawInput : undefined);
    }

    if (cmdName === "causal_chain" || cmdName === "因果連鎖") {
      if (rawInput?.reiType === 'GraphSpace') {
        const chain = args.map((a: any) => String(a));
        return addCausalChain(rawInput, chain);
      }
      throw new Error('causal_chain: GraphSpaceが必要です');
    }

    if (cmdName === "influence_propagate" || cmdName === "影響伝播") {
      if (rawInput?.reiType === 'GraphSpace') {
        const sourceId = args.length >= 1 ? String(args[0]) : '';
        const strength = args.length >= 2 ? this.toNumber(args[1]) : 1;
        return propagateInfluenceCore(rawInput, sourceId, strength);
      }
      throw new Error('influence_propagate: GraphSpaceが必要です');
    }

    if (cmdName === "genealogy_sigma" || cmdName === "系譜σ") {
      if (rawInput?.reiType === 'GraphSpace') return getGenealogySigma(rawInput);
      throw new Error('genealogy_sigma: GraphSpaceが必要です');
    }

    // ── ドメインD: 人文科学 - 倫理推論 ──
    if (cmdName === "ethics" || cmdName === "倫理") {
      const frameworks = args.length >= 1 
        ? (typeof args[0] === 'string' ? [args[0]] : args.map(String))
        : undefined;
      if (typeof rawInput === 'string') return evaluateEthics(rawInput, frameworks);
      if (typeof rawInput === 'object' && rawInput !== null) return evaluateEthics(rawInput, frameworks);
      throw new Error('ethics: 文字列またはオブジェクトが必要です');
    }

    if (cmdName === "ethics_sigma" || cmdName === "倫理σ") {
      if (rawInput?.reiType === 'EthicsResult') return getEthicsSigma(rawInput);
      throw new Error('ethics_sigma: EthicsResultが必要です');
    }

    // ═══════════════════════════════════════════════════════════
    // Phase 5.5c: ドメイン横断統合
    // ═══════════════════════════════════════════════════════════

    // B→C: 自然科学 → 情報工学
    if (cmdName === "sim_to_pipeline" || cmdName === "シミュ→パイプ") {
      if (rawInput?.reiType === 'SimulationSpace') return simToPipeline(rawInput);
      throw new Error('sim_to_pipeline: SimulationSpaceが必要です');
    }
    if (cmdName === "sim_energy_pipeline" || cmdName === "エネルギー→パイプ") {
      if (rawInput?.reiType === 'SimulationSpace') return simEnergyToPipeline(rawInput);
      throw new Error('sim_energy_pipeline: SimulationSpaceが必要です');
    }

    // B→D: 自然科学 → 人文科学
    if (cmdName === "sim_to_causal" || cmdName === "シミュ→因果") {
      if (rawInput?.reiType === 'SimulationSpace') return simToCausal(rawInput);
      throw new Error('sim_to_causal: SimulationSpaceが必要です');
    }
    if (cmdName === "sim_ethics" || cmdName === "シミュ倫理") {
      if (rawInput?.reiType === 'SimulationSpace') return simEthics(rawInput, args[0] as string);
      throw new Error('sim_ethics: SimulationSpaceが必要です');
    }

    // C→D: 情報工学 → 人文科学
    if (cmdName === "data_to_text" || cmdName === "データ→テキスト") {
      if (rawInput?.reiType === 'PipelineSpace') return dataToText(rawInput);
      throw new Error('data_to_text: PipelineSpaceが必要です');
    }
    if (cmdName === "data_ethics" || cmdName === "データ倫理") {
      if (rawInput?.reiType === 'PipelineSpace') return dataEthics(rawInput);
      throw new Error('data_ethics: PipelineSpaceが必要です');
    }

    // C→B: 情報工学 → 自然科学
    if (cmdName === "pipeline_to_sim" || cmdName === "パイプ→シミュ") {
      if (rawInput?.reiType === 'PipelineSpace') return pipelineToSim(rawInput);
      throw new Error('pipeline_to_sim: PipelineSpaceが必要です');
    }

    // D→B: 人文科学 → 自然科学
    if (cmdName === "causal_to_sim" || cmdName === "因果→シミュ") {
      if (rawInput?.reiType === 'GraphSpace') return causalToSim(rawInput);
      throw new Error('causal_to_sim: GraphSpaceが必要です');
    }

    // D→C: 人文科学 → 情報工学
    if (cmdName === "text_to_pipeline" || cmdName === "テキスト→パイプ") {
      if (rawInput?.reiType === 'TextAnalysis') return textToPipeline(rawInput);
      throw new Error('text_to_pipeline: TextAnalysisが必要です');
    }

    // 三領域統合
    if (cmdName === "domain_compose" || cmdName === "三領域統合") {
      if (args.length >= 2) {
        return composeDomains(rawInput, args[0], args[1]);
      }
      throw new Error('domain_compose: 3つのドメイン値が必要です (input, arg1, arg2)');
    }

    // 横断σ
    if (cmdName === "cross_sigma" || cmdName === "横断σ") {
      if (rawInput?.reiType === 'CrossDomainResult') return getCrossDomainSigma(rawInput);
      if (rawInput?.reiType === 'DomainComposition') return getDomainCompositionSigma(rawInput);
      if (rawInput?.reiType === 'EFGHCrossDomainResult') return getEFGHCrossSigma(rawInput);
      if (rawInput?.reiType === 'UniversalComposition') return getUniversalSigma(rawInput);
      throw new Error('cross_sigma: CrossDomainResult, DomainComposition, EFGHCrossDomainResult, or UniversalCompositionが必要です');
    }

    // ═══════════════════════════════════════════════════════════
    // Phase 6.5: EFGH ドメイン横断統合
    // ═══════════════════════════════════════════════════════════

    // E↔F: 芸術 ↔ 音楽 (共感覚)
    if (cmdName === "art_to_music" || cmdName === "芸術→音楽") {
      return artToMusic(rawInput);
    }
    if (cmdName === "music_to_art" || cmdName === "音楽→芸術") {
      return musicToArt(rawInput);
    }

    // E↔G: 芸術 ↔ 経済学
    if (cmdName === "art_to_market" || cmdName === "芸術→市場") {
      return artToMarket(rawInput);
    }
    if (cmdName === "market_to_art" || cmdName === "市場→芸術") {
      return marketToArt(rawInput);
    }

    // E↔H: 芸術 ↔ 言語学
    if (cmdName === "art_to_text" || cmdName === "芸術→言語") {
      return artToText(rawInput);
    }
    if (cmdName === "text_to_art" || cmdName === "言語→芸術") {
      return textToArt(rawInput);
    }

    // F↔G: 音楽 ↔ 経済学
    if (cmdName === "music_to_market" || cmdName === "音楽→市場") {
      return musicToMarket(rawInput);
    }
    if (cmdName === "market_to_music" || cmdName === "市場→音楽") {
      return marketToMusic(rawInput);
    }

    // F↔H: 音楽 ↔ 言語学
    if (cmdName === "music_to_text" || cmdName === "音楽→言語") {
      return musicToText(rawInput);
    }
    if (cmdName === "text_to_music" || cmdName === "言語→音楽") {
      return textToMusic(rawInput);
    }

    // G↔H: 経済学 ↔ 言語学
    if (cmdName === "market_to_text" || cmdName === "市場→言語") {
      return marketToText(rawInput);
    }
    if (cmdName === "text_to_market" || cmdName === "言語→市場") {
      return textToMarket(rawInput);
    }

    // EFGH → BCD ブリッジ
    if (cmdName === "art_to_sim" || cmdName === "芸術→シミュ") {
      return artToSim(rawInput);
    }
    if (cmdName === "music_to_sim" || cmdName === "音楽→シミュ") {
      return musicToSim(rawInput);
    }
    if (cmdName === "market_to_sim" || cmdName === "市場→シミュ") {
      return marketToSim(rawInput);
    }
    if (cmdName === "market_ethics" || cmdName === "市場倫理") {
      return marketEthics(rawInput);
    }
    if (cmdName === "linguistics_to_humanities" || cmdName === "言語→人文") {
      return linguisticsToHumanities(rawInput);
    }
    if (cmdName === "linguistics_to_pipeline" || cmdName === "言語→パイプ") {
      return linguisticsToPipeline(rawInput);
    }

    // 7ドメイン全体統合
    if (cmdName === "compose_all" || cmdName === "全領域統合") {
      if (rawInput && typeof rawInput === 'object' && !Array.isArray(rawInput)) {
        return composeAll(rawInput as Record<string, any>);
      }
      // argsから構築
      const inputs: Record<string, any> = {};
      if (rawInput) inputs.B = rawInput;
      if (args.length >= 1) inputs.C = args[0];
      if (args.length >= 2) inputs.D = args[1];
      if (args.length >= 3) inputs.E = args[2];
      if (args.length >= 4) inputs.F = args[3];
      if (args.length >= 5) inputs.G = args[4];
      if (args.length >= 6) inputs.H = args[5];
      return composeAll(inputs);
    }

    // ═══════════════════════════════════════════════════════════
    // Phase 6: E.芸術ドメイン
    // ═══════════════════════════════════════════════════════════

    if (cmdName === "fractal" || cmdName === "フラクタル") {
      const w = args.length >= 1 ? this.toNumber(args[0]) : 20;
      const h = args.length >= 2 ? this.toNumber(args[1]) : 20;
      const iter = args.length >= 3 ? this.toNumber(args[2]) : 50;
      return generateFractal(w, h, iter);
    }
    if (cmdName === "lsystem" || cmdName === "L系") {
      const axiom = typeof rawInput === 'string' ? rawInput : 'F';
      const rules = args.length >= 1 && typeof args[0] === 'object' ? args[0] as Record<string, string> : { F: 'F+F-F-F+F' };
      const iter = args.length >= 2 ? this.toNumber(args[1]) : 3;
      return generateLSystem(axiom, rules, iter);
    }
    if (cmdName === "color_harmony" || cmdName === "色彩調和") {
      const hue = typeof rawInput === 'number' ? rawInput : 0;
      const scheme = args.length >= 1 ? String(args[0]) : 'complementary';
      return colorHarmony(hue, scheme);
    }
    if (cmdName === "aesthetics" || cmdName === "美学分析") {
      return analyzeAesthetics(rawInput, args[0] as string);
    }
    if (cmdName === "art_sigma" || cmdName === "芸術σ") {
      return getArtSigma(rawInput);
    }

    // ═══════════════════════════════════════════════════════════
    // Phase 6: F.音楽ドメイン
    // ═══════════════════════════════════════════════════════════

    if (cmdName === "scale" || cmdName === "音階") {
      const root = typeof rawInput === 'string' ? rawInput : 'C';
      const mode = args.length >= 1 ? String(args[0]) : 'major';
      return createScale(root, mode);
    }
    if (cmdName === "chord" || cmdName === "和音") {
      const root = typeof rawInput === 'string' ? rawInput : 'C';
      const type = args.length >= 1 ? String(args[0]) : 'major';
      return createChord(root, type);
    }
    if (cmdName === "progression" || cmdName === "進行分析") {
      if (Array.isArray(rawInput) && rawInput[0]?.reiType === 'ChordResult') {
        return analyzeProgression(rawInput);
      }
      throw new Error('progression: ChordResult[] が必要です');
    }
    if (cmdName === "rhythm" || cmdName === "リズム") {
      const beats = typeof rawInput === 'number' ? rawInput : 4;
      const sub = args.length >= 1 ? this.toNumber(args[0]) : 4;
      const density = args.length >= 2 ? this.toNumber(args[1]) : 0.5;
      const bpm = args.length >= 3 ? this.toNumber(args[2]) : 120;
      return createRhythm(beats, sub, density, bpm);
    }
    if (cmdName === "melody" || cmdName === "旋律") {
      if (rawInput?.reiType === 'ScaleResult') {
        const length = args.length >= 1 ? this.toNumber(args[0]) : 8;
        const style = args.length >= 2 ? String(args[1]) : 'stepwise';
        return createMelody(rawInput, length, style);
      }
      throw new Error('melody: ScaleResult が必要です');
    }
    if (cmdName === "music_sigma" || cmdName === "音楽σ") {
      return getMusicSigma(rawInput);
    }

    // ═══════════════════════════════════════════════════════════
    // Phase 6: G.経済学ドメイン
    // ═══════════════════════════════════════════════════════════

    if (cmdName === "supply_demand" || cmdName === "需給") {
      const sSlope = typeof rawInput === 'number' ? rawInput : 1;
      const sIntercept = args.length >= 1 ? this.toNumber(args[0]) : 0;
      const dSlope = args.length >= 2 ? this.toNumber(args[1]) : -1;
      const dIntercept = args.length >= 3 ? this.toNumber(args[2]) : 100;
      return supplyDemand(sSlope, sIntercept, dSlope, dIntercept);
    }
    if (cmdName === "market" || cmdName === "市場") {
      const name = typeof rawInput === 'string' ? rawInput : 'market';
      const price = args.length >= 1 ? this.toNumber(args[0]) : 100;
      const agents = args.length >= 2 ? this.toNumber(args[1]) : 10;
      return createMarket(name, price, agents);
    }
    if (cmdName === "market_step" || cmdName === "市場ステップ") {
      if (rawInput?.reiType === 'MarketState') return marketStep(rawInput);
      throw new Error('market_step: MarketState が必要です');
    }
    if (cmdName === "market_run" || cmdName === "市場実行") {
      if (rawInput?.reiType === 'MarketState') {
        const steps = args.length >= 1 ? this.toNumber(args[0]) : 100;
        return marketRun(rawInput, steps);
      }
      throw new Error('market_run: MarketState が必要です');
    }
    if (cmdName === "game_theory" || cmdName === "ゲーム理論") {
      const name = typeof rawInput === 'string' ? rawInput : 'prisoners_dilemma';
      return createGame(name);
    }
    if (cmdName === "economics_sigma" || cmdName === "経済σ") {
      return getEconomicsSigma(rawInput);
    }

    // ═══════════════════════════════════════════════════════════
    // Phase 6: H.言語学ドメイン
    // ═══════════════════════════════════════════════════════════

    if (cmdName === "parse" || cmdName === "構文解析") {
      const text = typeof rawInput === 'string' ? rawInput : String(rawInput);
      return parseSyntax(text);
    }
    if (cmdName === "semantic_frame" || cmdName === "意味フレーム") {
      const predicate = typeof rawInput === 'string' ? rawInput : String(rawInput);
      const roles = args.length >= 1 && typeof args[0] === 'object' ? args[0] as Record<string, string> : {};
      return createSemanticFrame(predicate, roles);
    }
    if (cmdName === "word_analyze" || cmdName === "語分析") {
      const word = typeof rawInput === 'string' ? rawInput : String(rawInput);
      return analyzeWord(word);
    }
    if (cmdName === "translate" || cmdName === "翻訳") {
      const text = typeof rawInput === 'string' ? rawInput : String(rawInput);
      const from = args.length >= 1 ? String(args[0]) : 'ja';
      const to = args.length >= 2 ? String(args[1]) : 'en';
      return translate(text, from, to);
    }
    if (cmdName === "linguistics_sigma" || cmdName === "言語σ") {
      return getLinguisticsSigma(rawInput);
    }

    // ═══════════════════════════════════════════════════════════
    // 型システム
    // ═══════════════════════════════════════════════════════════

    if (cmdName === "type_of" || cmdName === "型") {
      return inferType(rawInput);
    }
    if (cmdName === "type_check" || cmdName === "型検査") {
      return typeCheck(rawInput);
    }
    if (cmdName === "type_domain" || cmdName === "型ドメイン") {
      const t = inferType(rawInput);
      return typeDomain(t);
    }
    if (cmdName === "type_sigma" || cmdName === "型σ") {
      if (rawInput?.reiType === 'TypeCheckResult') return getTypeCheckSigma(rawInput);
      return getTypeCheckSigma(typeCheck(rawInput));
    }

    // User-defined pipe function
    if (this.env.has(cmdName)) {
      const fn = this.env.get(cmdName);
      if (this.isFunction(fn)) return this.callFunction(fn, [rawInput, ...args]);
    }

    throw new Error(`未知のパイプコマンド: ${cmdName}`);
  }

  private evalFnCall(ast: any): any {
    const callee = this.eval(ast.callee);
    const args = ast.args.map((a: any) => this.eval(a));
    if (ast.callee.type === "Ident" && ast.callee.name === "genesis") return createGenesis();
    if (this.isFunction(callee)) return this.callFunction(callee, args);
    throw new Error(`呼び出し不可能: ${JSON.stringify(callee)}`);
  }

  private callFunction(fn: any, args: any[]): any {
    if (fn.body === null || fn.body === undefined) return this.callBuiltin(fn.name, args);
    const callEnv = new Environment(fn.closure);
    for (let i = 0; i < fn.params.length; i++) {
      callEnv.define(fn.params[i], args[i] ?? null);
    }
    const savedEnv = this.env;
    this.env = callEnv;
    const result = this.eval(fn.body);
    this.env = savedEnv;
    return result;
  }

  private callBuiltin(name: string, args: any[]): any {
    if (name === "genesis") return createGenesis();
    const a = args[0] !== undefined ? this.toNumber(args[0]) : 0;
    const b = args[1] !== undefined ? this.toNumber(args[1]) : 0;
    switch (name) {
      case "abs": return Math.abs(a);
      case "sqrt": return Math.sqrt(a);
      case "sin": return Math.sin(a);
      case "cos": return Math.cos(a);
      case "log": return Math.log(a);
      case "exp": return Math.exp(a);
      case "floor": return Math.floor(a);
      case "ceil": return Math.ceil(a);
      case "round": return Math.round(a);
      case "min": return Math.min(a, b);
      case "max": return Math.max(a, b);
      case "len":
        if (Array.isArray(args[0])) return args[0].length;
        if (typeof args[0] === "string") return args[0].length;
        return 0;
      case "print": return args[0] ?? null;
      default: throw new Error(`未知の組込み関数: ${name}`);
    }
  }

  private evalMemberAccess(ast: any): any {
    const rawObj = this.eval(ast.object);
    const obj = unwrapReiVal(rawObj);

    // ── Tier 1: σメタデータへのメンバーアクセス ──
    if (ast.member === "__sigma__") {
      return getSigmaOf(rawObj);
    }

    // ── Evolve: EvolveResult member access ──
    if (this.isObj(obj) && obj.reiType === "EvolveResult") {
      switch (ast.member) {
        case "value": return obj.value;
        case "selectedMode": return obj.selectedMode;
        case "strategy": return obj.strategy;
        case "reason": return obj.reason;
        case "candidates": return obj.candidates;
        case "awareness": return obj.awareness;
        case "tendency": return obj.tendency;
      }
    }

    // ── 柱②: StringMDim member access ──
    if (this.isObj(obj) && obj.reiType === "StringMDim") {
      switch (ast.member) {
        case "center": return obj.center;
        case "neighbors": return obj.neighbors;
        case "mode": return obj.mode;
        case "dim": return obj.neighbors.length;
        case "metadata": return obj.metadata ?? {};
        // 漢字メタデータへの直接アクセス
        case "radical": return obj.metadata?.radical ?? null;
        case "radicalName": return obj.metadata?.radicalName ?? null;
        case "strokes": return obj.metadata?.strokes ?? 0;
        case "on": return obj.metadata?.on ?? [];
        case "kun": return obj.metadata?.kun ?? [];
        case "category": return obj.metadata?.category ?? null;
        case "meaning": return obj.metadata?.meaning ?? null;
        case "known": return obj.metadata?.known ?? false;
      }
    }

    // ── 柱②: KanjiSimilarity member access ──
    if (this.isObj(obj) && obj.reiType === "KanjiSimilarity") {
      switch (ast.member) {
        case "strength": return obj.strength;
        case "pair": return obj.pair;
        case "sharedComponents": return obj.sharedComponents;
        case "jaccard": return obj.jaccard;
        case "sameRadical": return obj.sameRadical;
        case "sameCategory": return obj.sameCategory;
        case "strokeDiff": return obj.strokeDiff;
        case "sharedPhoneticGroup": return obj.sharedPhoneticGroup;
      }
    }

    // ── v0.4: BindResult member access ──
    if (this.isObj(obj) && obj.reiType === "BindResult") {
      switch (ast.member) {
        case "binding": return obj.binding;
        case "source": return obj.source;
        case "target": return obj.target;
        case "mode": return obj.binding?.mode;
        case "strength": return obj.binding?.strength;
        case "id": return obj.binding?.id;
        case "active": return obj.binding?.active;
      }
    }

    // ── v0.4: WillComputeResult member access ──
    if (this.isObj(obj) && obj.reiType === "WillComputeResult") {
      switch (ast.member) {
        case "value": return obj.value;
        case "numericValue": return obj.numericValue;
        case "chosenMode": return obj.chosenMode;
        case "reason": return obj.reason;
        case "satisfaction": return obj.satisfaction;
        case "allCandidates": return obj.allCandidates;
        case "intention": return obj.intention;
      }
    }

    // ── v0.4: WillSigma member access ──
    if (this.isObj(obj) && obj.reiType === undefined && obj.dominantMode !== undefined && obj.totalChoices !== undefined) {
      switch (ast.member) {
        case "type": return obj.type;
        case "target": return obj.target;
        case "satisfaction": return obj.satisfaction;
        case "active": return obj.active;
        case "step": return obj.step;
        case "totalChoices": return obj.totalChoices;
        case "dominantMode": return obj.dominantMode;
        case "history": return obj.history;
      }
    }

    // ── v0.3: SigmaResult member access ──
    if (this.isObj(obj) && obj.reiType === "SigmaResult") {
      switch (ast.member) {
        case "flow": return obj.flow;
        case "memory": return obj.memory;
        case "layer": return obj.layer;
        case "will": return obj.will;
        case "field": return obj.field;
        case "relation": return obj.relation ?? [];
      }
    }

    // ── v0.3: Sigma sub-object member access ──
    if (this.isObj(obj) && obj.stage !== undefined && obj.momentum !== undefined && obj.directions !== undefined) {
      switch (ast.member) {
        case "stage": return obj.stage;
        case "directions": return obj.directions;
        case "momentum": return obj.momentum;
        case "velocity": return obj.velocity;
      }
    }
    if (this.isObj(obj) && obj.tendency !== undefined && obj.strength !== undefined) {
      switch (ast.member) {
        case "tendency": return obj.tendency;
        case "strength": return obj.strength;
        case "history": return obj.history;
      }
    }
    // Space sigma field sub-object
    if (this.isObj(obj) && obj.layers !== undefined && obj.total_nodes !== undefined) {
      switch (ast.member) {
        case "layers": return obj.layers;
        case "total_nodes": return obj.total_nodes;
        case "active_nodes": return obj.active_nodes;
        case "topology": return obj.topology;
      }
    }
    // Space sigma flow sub-object
    if (this.isObj(obj) && obj.global_stage !== undefined && obj.converged_nodes !== undefined) {
      switch (ast.member) {
        case "global_stage": return obj.global_stage;
        case "converged_nodes": return obj.converged_nodes;
        case "expanding_nodes": return obj.expanding_nodes;
      }
    }

    // ── v0.3: DNode member access ──
    if (this.isDNode(obj)) {
      const dn = obj as DNode;
      switch (ast.member) {
        case "center": return dn.center;
        case "neighbors": return dn.neighbors;
        case "stage": return dn.stage;
        case "momentum": return dn.momentum;
        case "mode": return dn.mode;
        case "dim": return dn.neighbors.length;
      }
    }

    // ── v0.2.1 original member access ──
    if (this.isMDim(obj)) {
      switch (ast.member) {
        case "center": return obj.center;
        case "neighbors": return obj.neighbors;
        case "mode": return obj.mode;
        case "dim": return obj.neighbors.length;
      }
    }
    if (this.isExt(obj)) {
      switch (ast.member) {
        case "order": return obj.order;
        case "base": return obj.base;
        case "subscripts": return obj.subscripts;
        case "valStar": return obj.valStar();
      }
    }
    if (this.isGenesis(obj)) {
      switch (ast.member) {
        case "state": case "phase": return obj.state;
        case "omega": return obj.omega;
        case "history": return obj.history;
      }
    }
    if (Array.isArray(obj)) {
      switch (ast.member) {
        case "length": return obj.length;
        case "first": return obj[0] ?? null;
        case "last": return obj[obj.length - 1] ?? null;
      }
    }
    throw new Error(`メンバー ${ast.member} にアクセスできません`);
  }

  private evalIndexAccess(ast: any): any {
    const obj = this.eval(ast.object);
    const idx = this.toNumber(this.eval(ast.index));
    if (Array.isArray(obj)) return obj[idx] ?? null;
    if (typeof obj === "string") return obj[idx] ?? null;
    if (this.isMDim(obj)) return obj.neighbors[idx] ?? null;
    throw new Error("インデックスアクセス不可");
  }

  private evalExtend(ast: any): any {
    const target = this.eval(ast.target);
    if (this.isExt(target)) {
      if (ast.subscript) return createExtended(target.base, target.subscripts + ast.subscript);
      return createExtended(target.base, target.subscripts + "o");
    }
    throw new Error("拡張は拡張数にのみ適用可能");
  }

  private evalReduce(ast: any): any {
    const target = this.eval(ast.target);
    if (this.isExt(target)) {
      if (target.order <= 1) return target.base;
      return createExtended(target.base, target.subscripts.slice(0, -1));
    }
    throw new Error("縮約は拡張数にのみ適用可能");
  }

  private evalConverge(ast: any): any {
    const left = this.eval(ast.left);
    const right = this.eval(ast.right);
    if (this.isMDim(left) && this.isMDim(right)) {
      return {
        reiType: "MDim",
        center: (left.center + right.center) / 2,
        neighbors: [...left.neighbors, ...right.neighbors],
        mode: left.mode,
      };
    }
    return this.toNumber(left) + this.toNumber(right);
  }

  private evalDiverge(ast: any): any {
    const left = this.eval(ast.left);
    const right = this.eval(ast.right);
    if (this.isMDim(left)) {
      this.toNumber(right);
      const half = Math.floor(left.neighbors.length / 2);
      return [
        { reiType: "MDim", center: left.center, neighbors: left.neighbors.slice(0, half), mode: left.mode },
        { reiType: "MDim", center: left.center, neighbors: left.neighbors.slice(half), mode: left.mode },
      ];
    }
    return this.toNumber(left) - this.toNumber(right);
  }

  private evalReflect(ast: any): any {
    const left = this.eval(ast.left);
    this.eval(ast.right);
    if (this.isMDim(left)) {
      return { reiType: "MDim", center: left.center, neighbors: [...left.neighbors].reverse(), mode: left.mode };
    }
    return this.toNumber(left);
  }

  private evalIfExpr(ast: any): any {
    const cond = this.eval(ast.cond);
    return this.isTruthy(cond) ? this.eval(ast.then) : this.eval(ast.else);
  }

  private evalMatchExpr(ast: any): any {
    const target = this.eval(ast.target);
    for (const { pattern, body } of ast.cases) {
      const patVal = this.eval(pattern);
      if (this.matches(target, patVal)) return this.eval(body);
    }
    throw new Error("マッチする分岐が見つかりません");
  }

  // --- Helpers ---
  toNumber(val: any): number {
    // Tier 1: ReiVal透過
    if (val !== null && typeof val === 'object' && val.reiType === 'ReiVal') return this.toNumber(val.value);
    if (typeof val === "number") return val;
    if (typeof val === "boolean") return val ? 1 : 0;
    if (val === null) return 0;
    if (this.isExt(val)) return val.valStar();
    if (this.isMDim(val)) return computeMDim(val);
    if (typeof val === "string") return parseFloat(val) || 0;
    return 0;
  }

  private isTruthy(val: any): boolean {
    const v = unwrapReiVal(val);
    if (v === null || v === false || v === 0) return false;
    if (this.isQuad(v)) return v.value === "top" || v.value === "topPi";
    return true;
  }

  private matches(target: any, pattern: any): boolean {
    if (typeof target === typeof pattern && target === pattern) return true;
    if (this.isQuad(target) && this.isQuad(pattern)) return target.value === pattern.value;
    return false;
  }

  isObj(v: any): boolean { const u = unwrapReiVal(v); return u !== null && typeof u === "object" && !Array.isArray(u); }
  isMDim(v: any): boolean { const u = unwrapReiVal(v); return u !== null && typeof u === "object" && u.reiType === "MDim"; }
  isExt(v: any): boolean { const u = unwrapReiVal(v); return u !== null && typeof u === "object" && u.reiType === "Ext"; }
  isGenesis(v: any): boolean { const u = unwrapReiVal(v); return u !== null && typeof u === "object" && u.reiType === "State"; }
  isFunction(v: any): boolean { const u = unwrapReiVal(v); return u !== null && typeof u === "object" && u.reiType === "Function"; }
  isQuad(v: any): boolean { const u = unwrapReiVal(v); return u !== null && typeof u === "object" && u.reiType === "Quad"; }
  // ── v0.3 ──
  isSpace(v: any): boolean { const u = unwrapReiVal(v); return u !== null && typeof u === "object" && u.reiType === "Space"; }
  isDNode(v: any): boolean { const u = unwrapReiVal(v); return u !== null && typeof u === "object" && u.reiType === "DNode"; }
  // ── Tier 1 ──
  isReiVal(v: any): boolean { return v !== null && typeof v === 'object' && v.reiType === 'ReiVal'; }
  // ── 柱② ──
  isStringMDim(v: any): boolean { const u = unwrapReiVal(v); return u !== null && typeof u === "object" && u.reiType === "StringMDim"; }
  /** 値からσメタデータを取得（Tier 1） */
  getSigmaMetadata(v: any): SigmaMetadata { return getSigmaOf(v); }
  /** ReiValを透過的にアンラップ */
  unwrap(v: any): any { return unwrapReiVal(v); }

  // ── v0.4: 関係・意志ヘルパー ──

  /** 値からその変数名を逆引きする（参照一致） */
  findRefByValue(value: any): string | null {
    const raw = unwrapReiVal(value);
    for (const [name, binding] of this.env.allBindings()) {
      const bv = unwrapReiVal(binding.value);
      if (bv === raw) return name;
      // オブジェクト参照が異なる場合もσメタデータで同一性を判定
      if (raw !== null && typeof raw === 'object' && bv !== null && typeof bv === 'object') {
        if (raw.__sigma__ && raw.__sigma__ === bv.__sigma__) return name;
      }
    }
    return null;
  }

  /** 結合の伝播をトリガーする（変数名 + 新値） */
  triggerPropagation(ref: string, newValue: any): number {
    return this.bindingRegistry.propagate(
      ref,
      newValue,
      (r: string) => { try { return this.env.get(r); } catch { return undefined; } },
      (r: string, v: any) => { try { this.env.set(r, v); } catch { /* immutable */ } },
    );
  }
}
