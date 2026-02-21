// ============================================================
// Rei v0.4 — Quad Logic & Genesis
// Four-valued logic and state genesis system
//
// 後方互換ラッパー: 全ロジックは quad-logic.ts に統合済み
// evaluator.ts からのインポートを壊さないために維持
// ============================================================

export {
  quadNot,
  quadAnd,
  quadOr,
  createGenesis,
  genesisForward,
} from './quad-logic';
