/**
 * Rei AIOS — Axiom Brancher
 * Rei公理ベース3軸分岐エンジン
 *
 * AI回答を1回取得 → Reiの公理で「構造的に異なる視点」をローカル生成
 * 3軸: 論理的（Logical）/ 実用的（Practical）/ 批判的（Critical）
 *
 * D-FUMT中心-周囲パターン:
 *   中心 = ユーザーの質問
 *   周囲 = AI回答 + 3軸分岐
 */

// ─── 型定義 ──────────────────────────────────────────

export interface BranchResult {
  /** 元のAI回答 */
  original: string;
  /** 3軸分岐 */
  branches: Branch[];
  /** 分岐メタデータ */
  meta: BranchMeta;
}

export interface Branch {
  axis: 'logical' | 'practical' | 'critical';
  label: string;
  content: string;
  confidence: number;   // 0.0 - 1.0
  tags: string[];
}

export interface BranchMeta {
  questionType: QuestionType;
  branchCount: number;
  processingMs: number;
}

export type QuestionType =
  | 'factual'       // 事実確認
  | 'analytical'    // 分析
  | 'creative'      // 創造
  | 'procedural'    // 手順
  | 'opinion'       // 意見
  | 'comparison'    // 比較
  | 'troubleshoot'  // 問題解決
  | 'general';      // 一般

// ─── 質問タイプ判定 ──────────────────────────────────

const QUESTION_PATTERNS: Array<{ type: QuestionType; patterns: RegExp[] }> = [
  {
    type: 'factual',
    patterns: [
      /^(what|who|when|where|何|誰|いつ|どこ)\s/i,
      /(とは|って何|ですか)/,
    ],
  },
  {
    type: 'procedural',
    patterns: [
      /^(how|どう|どのよう)/i,
      /(方法|手順|やり方|作り方|使い方)/,
      /(install|setup|configure|実装|設定)/i,
    ],
  },
  {
    type: 'analytical',
    patterns: [
      /(why|なぜ|原因|理由)/i,
      /(分析|解析|影響|効果)/,
    ],
  },
  {
    type: 'comparison',
    patterns: [
      /(vs|versus|比較|違い|差|どちら)/i,
      /(better|worse|良い|悪い|おすすめ)/i,
    ],
  },
  {
    type: 'creative',
    patterns: [
      /(create|design|作っ|書い|考え|アイデア)/i,
      /(提案|企画|プラン)/,
    ],
  },
  {
    type: 'troubleshoot',
    patterns: [
      /(error|bug|problem|issue|エラー|バグ|問題|動かない|できない)/i,
      /(fix|solve|解決|修正|対処)/i,
    ],
  },
  {
    type: 'opinion',
    patterns: [
      /(think|opinion|べき|思い|どう思)/i,
      /(recommend|suggest|勧め)/i,
    ],
  },
];

function detectQuestionType(question: string): QuestionType {
  for (const { type, patterns } of QUESTION_PATTERNS) {
    if (patterns.some(p => p.test(question))) {
      return type;
    }
  }
  return 'general';
}

// ─── 分岐テンプレート ────────────────────────────────

interface BranchTemplate {
  axis: Branch['axis'];
  label: string;
  prompt: (question: string, answer: string, qType: QuestionType) => string;
  tags: (qType: QuestionType) => string[];
}

const BRANCH_TEMPLATES: BranchTemplate[] = [
  {
    axis: 'logical',
    label: '論理的視点 (Logical)',
    prompt: (q, a, qType) => {
      const base = extractKeyPoints(a);
      switch (qType) {
        case 'factual':
          return `[論理検証] ${base}\n\n前提条件の確認: この回答の根拠となる前提は何か。その前提が成立しない場合、結論はどう変わるか。`;
        case 'procedural':
          return `[論理的手順分析] ${base}\n\n各ステップの依存関係と、省略可能な手順、順序変更の可否を検討。`;
        case 'analytical':
          return `[因果関係の精査] ${base}\n\n相関と因果の区別、第三要因の可能性、逆因果の検討。`;
        case 'comparison':
          return `[構造的比較] ${base}\n\n比較軸の網羅性、重み付けの妥当性、文脈依存性の指摘。`;
        case 'troubleshoot':
          return `[根本原因分析] ${base}\n\n表層的な対処と根本原因の区別。再発防止の観点。`;
        default:
          return `[論理的分析] ${base}\n\n前提・推論過程・結論の整合性を検証。隠れた仮定や論理の飛躍がないか確認。`;
      }
    },
    tags: (qType) => ['logic', 'verification', qType],
  },
  {
    axis: 'practical',
    label: '実用的視点 (Practical)',
    prompt: (q, a, qType) => {
      const base = extractKeyPoints(a);
      switch (qType) {
        case 'factual':
          return `[実用的観点] ${base}\n\nこの情報を実際に活用する場面と、知っておくべき実務上の注意点。`;
        case 'procedural':
          return `[実装ガイド] ${base}\n\n最小実装パス（MVP）の提示。よくある落とし穴と回避策。実際の所要時間の見積もり。`;
        case 'analytical':
          return `[実務への示唆] ${base}\n\nこの分析結果から導かれる具体的アクション。リソース制約を考慮した優先順位。`;
        case 'comparison':
          return `[選択ガイド] ${base}\n\n具体的な選択基準の提示。「Aを選ぶべき条件」「Bを選ぶべき条件」の明確化。`;
        case 'troubleshoot':
          return `[即効解決策] ${base}\n\n最短で問題を解決する手順。一時的回避策と恒久的解決策の両方。`;
        case 'creative':
          return `[実現計画] ${base}\n\n72時間で実現可能な最小版の提案。必要なリソースとステップの具体化。`;
        default:
          return `[実用的視点] ${base}\n\n「明日からすぐ使える」形での再構成。制約条件下での最適なアプローチ。`;
      }
    },
    tags: (qType) => ['practical', 'actionable', qType],
  },
  {
    axis: 'critical',
    label: '批判的視点 (Critical)',
    prompt: (q, a, qType) => {
      const base = extractKeyPoints(a);
      switch (qType) {
        case 'factual':
          return `[情報の信頼性評価] ${base}\n\nこの情報が誤っている可能性とその条件。反例や例外の指摘。情報源の信頼性。`;
        case 'procedural':
          return `[リスク分析] ${base}\n\nこの手順で失敗するシナリオ。見落としがちな前提条件。代替アプローチの存在。`;
        case 'analytical':
          return `[反論と限界] ${base}\n\nこの分析の限界。異なる立場からの反論。見落としている視点。`;
        case 'comparison':
          return `[比較の盲点] ${base}\n\n比較に含まれていない重要な選択肢。状況による逆転の可能性。バイアスの指摘。`;
        case 'troubleshoot':
          return `[誤診の可能性] ${base}\n\nこの診断が間違っている場合の代替仮説。解決策が新たな問題を引き起こす可能性。`;
        case 'opinion':
          return `[反対意見] ${base}\n\n合理的に反対する立場からの論点。この意見が成立しない条件。`;
        default:
          return `[批判的検討] ${base}\n\nこの回答の弱点・限界・盲点。考慮されていない代替案。前提が崩れるシナリオ。`;
      }
    },
    tags: (qType) => ['critical', 'risk', qType],
  },
];

// ─── テキスト処理ヘルパー ────────────────────────────

function extractKeyPoints(text: string): string {
  // 長い回答から要点を抽出（最初の500文字 + 構造保持）
  if (text.length <= 600) return text;

  const lines = text.split('\n').filter(l => l.trim());
  const keyLines: string[] = [];
  let totalLen = 0;

  for (const line of lines) {
    if (totalLen > 500) break;
    // 見出し、箇条書き、短い行を優先
    if (line.startsWith('#') || line.startsWith('-') || line.startsWith('*')
        || line.startsWith('•') || line.length < 100) {
      keyLines.push(line);
      totalLen += line.length;
    } else {
      // 長い段落は最初の文だけ
      const firstSentence = line.split(/[。.!！？?]/)[0];
      keyLines.push(firstSentence + '…');
      totalLen += firstSentence.length;
    }
  }

  return keyLines.join('\n');
}

// ─── AxiomBrancher クラス ────────────────────────────

export class AxiomBrancher {
  /**
   * AI回答を受け取り、3軸分岐を生成
   * ★ ローカル処理のみ、追加のAI呼び出しなし
   */
  branch(question: string, aiResponse: string): BranchResult {
    const startTime = Date.now();
    const qType = detectQuestionType(question);

    const branches: Branch[] = BRANCH_TEMPLATES.map(template => ({
      axis: template.axis,
      label: template.label,
      content: template.prompt(question, aiResponse, qType),
      confidence: this.calcConfidence(qType, template.axis),
      tags: template.tags(qType),
    }));

    return {
      original: aiResponse,
      branches,
      meta: {
        questionType: qType,
        branchCount: branches.length,
        processingMs: Date.now() - startTime,
      },
    };
  }

  /**
   * 質問タイプと軸の組み合わせによる信頼度スコア
   */
  private calcConfidence(qType: QuestionType, axis: Branch['axis']): number {
    const matrix: Record<QuestionType, Record<Branch['axis'], number>> = {
      factual:      { logical: 0.9, practical: 0.7, critical: 0.8 },
      analytical:   { logical: 0.9, practical: 0.6, critical: 0.9 },
      creative:     { logical: 0.5, practical: 0.9, critical: 0.7 },
      procedural:   { logical: 0.7, practical: 0.9, critical: 0.6 },
      opinion:      { logical: 0.6, practical: 0.7, critical: 0.9 },
      comparison:   { logical: 0.8, practical: 0.8, critical: 0.8 },
      troubleshoot: { logical: 0.8, practical: 0.9, critical: 0.7 },
      general:      { logical: 0.7, practical: 0.7, critical: 0.7 },
    };
    return matrix[qType]?.[axis] ?? 0.7;
  }

  /**
   * 質問タイプを外部から取得
   */
  getQuestionType(question: string): QuestionType {
    return detectQuestionType(question);
  }
}
