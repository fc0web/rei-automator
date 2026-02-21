/**
 * economics.ts — 経済学ドメイン (G)
 * 
 * 市場シミュレーション、需要供給、ゲーム理論
 * 
 * 6属性マッピング:
 *   場(field)   = 市場空間・取引所
 *   流れ(flow)  = 資金フロー・取引量
 *   記憶(memory) = 価格履歴・トレンド
 *   層(layer)   = 経済主体の階層（個人→企業→国家）
 *   関係(relation) = 取引関係・競合/協力
 *   意志(will)  = 市場の期待・投機心理
 * 
 * @author Nobuki Fujimoto (D-FUMT)
 */

// ============================================================
// 型定義
// ============================================================

export interface MarketState {
  reiType: 'MarketState';
  name: string;
  price: number;
  supply: number;
  demand: number;
  volume: number;
  history: { time: number; price: number; volume: number }[];
  agents: MarketAgent[];
  equilibrium: { price: number; quantity: number };
  volatility: number;     // 0-1
  trend: 'bull' | 'bear' | 'stable';
}

export interface MarketAgent {
  id: string;
  type: 'buyer' | 'seller' | 'speculator';
  capital: number;
  inventory: number;
  strategy: string;       // fundamental, momentum, random
  threshold: number;      // 売買閾値
}

export interface SupplyDemandResult {
  reiType: 'SupplyDemandResult';
  supplyFn: { slope: number; intercept: number };
  demandFn: { slope: number; intercept: number };
  equilibrium: { price: number; quantity: number };
  surplus: number;
  elasticitySupply: number;
  elasticityDemand: number;
}

export interface GameTheoryResult {
  reiType: 'GameTheoryResult';
  game: string;
  players: string[];
  payoffMatrix: number[][][];
  nashEquilibria: { strategies: number[]; payoffs: number[] }[];
  dominant: { player: number; strategy: number } | null;
  paretoOptimal: { strategies: number[]; payoffs: number[] }[];
  cooperationIndex: number;    // 協力度 (0-1)
}

// ============================================================
// 需要供給モデル
// ============================================================

/** 需要供給分析 */
export function supplyDemand(
  supplySlope: number = 1,
  supplyIntercept: number = 0,
  demandSlope: number = -1,
  demandIntercept: number = 100,
): SupplyDemandResult {
  // 均衡点: supplySlope * P + supplyIntercept = demandSlope * P + demandIntercept
  const eqPrice = (demandIntercept - supplyIntercept) / (supplySlope - demandSlope);
  const eqQuantity = supplySlope * eqPrice + supplyIntercept;
  
  // 弾力性 (均衡点での)
  const elasticitySupply = eqPrice > 0 && eqQuantity > 0 ? supplySlope * eqPrice / eqQuantity : 0;
  const elasticityDemand = eqPrice > 0 && eqQuantity > 0 ? Math.abs(demandSlope * eqPrice / eqQuantity) : 0;
  
  return {
    reiType: 'SupplyDemandResult',
    supplyFn: { slope: supplySlope, intercept: supplyIntercept },
    demandFn: { slope: demandSlope, intercept: demandIntercept },
    equilibrium: { price: Math.max(0, eqPrice), quantity: Math.max(0, eqQuantity) },
    surplus: 0,
    elasticitySupply,
    elasticityDemand,
  };
}

// ============================================================
// 市場シミュレーション
// ============================================================

/** 市場を作成 */
export function createMarket(
  name: string = 'market',
  initialPrice: number = 100,
  numAgents: number = 10,
): MarketState {
  const agents: MarketAgent[] = [];
  for (let i = 0; i < numAgents; i++) {
    const type = i < numAgents * 0.4 ? 'buyer' : i < numAgents * 0.7 ? 'seller' : 'speculator';
    agents.push({
      id: `agent_${i}`,
      type,
      capital: 1000 + Math.random() * 4000,
      inventory: type === 'seller' ? 10 + Math.floor(Math.random() * 20) : 0,
      strategy: type === 'speculator' ? 'momentum' : 'fundamental',
      threshold: initialPrice * (0.8 + Math.random() * 0.4),
    });
  }

  const totalSupply = agents.filter(a => a.type === 'seller').reduce((s, a) => s + a.inventory, 0);
  const totalDemand = agents.filter(a => a.type === 'buyer').length * 5;

  return {
    reiType: 'MarketState',
    name,
    price: initialPrice,
    supply: totalSupply,
    demand: totalDemand,
    volume: 0,
    history: [{ time: 0, price: initialPrice, volume: 0 }],
    agents,
    equilibrium: { price: initialPrice, quantity: Math.min(totalSupply, totalDemand) },
    volatility: 0,
    trend: 'stable',
  };
}

/** 市場を1ステップ進める */
export function marketStep(market: MarketState): MarketState {
  let buyPressure = 0, sellPressure = 0, volume = 0;

  for (const agent of market.agents) {
    switch (agent.strategy) {
      case 'fundamental':
        if (agent.type === 'buyer' && market.price < agent.threshold) {
          buyPressure += (agent.threshold - market.price) / agent.threshold;
        }
        if (agent.type === 'seller' && market.price > agent.threshold) {
          sellPressure += (market.price - agent.threshold) / agent.threshold;
        }
        break;
      case 'momentum':
        if (market.history.length >= 2) {
          const prev = market.history[market.history.length - 2].price;
          if (market.price > prev) buyPressure += 0.3;
          else sellPressure += 0.3;
        }
        break;
      case 'random':
        if (Math.random() < 0.5) buyPressure += 0.2;
        else sellPressure += 0.2;
        break;
    }
  }

  // 価格変動
  const pressure = buyPressure - sellPressure;
  const noise = (Math.random() - 0.5) * 2;
  const priceChange = pressure * 2 + noise;
  const newPrice = Math.max(1, market.price + priceChange);

  volume = Math.abs(pressure) * market.agents.length;

  // ボラティリティ
  const returns = market.history.slice(-10).map((h, i, arr) =>
    i > 0 ? Math.abs(h.price - arr[i - 1].price) / arr[i - 1].price : 0
  );
  const volatility = returns.length > 1
    ? Math.min(returns.reduce((s, r) => s + r, 0) / returns.length * 10, 1)
    : 0;

  // トレンド
  const recentPrices = market.history.slice(-5).map(h => h.price);
  const avgRecent = recentPrices.reduce((a, b) => a + b, 0) / Math.max(recentPrices.length, 1);
  const trend = newPrice > avgRecent * 1.02 ? 'bull'
    : newPrice < avgRecent * 0.98 ? 'bear'
    : 'stable';

  const newHistory = [...market.history, { time: market.history.length, price: newPrice, volume }];

  return {
    ...market,
    price: newPrice,
    volume,
    history: newHistory,
    volatility,
    trend,
  };
}

/** 市場を複数ステップ実行 */
export function marketRun(market: MarketState, steps: number): MarketState {
  let current = market;
  for (let i = 0; i < steps; i++) {
    current = marketStep(current);
  }
  return current;
}

// ============================================================
// ゲーム理論
// ============================================================

/** ゲームを作成（2人ゲーム） */
export function createGame(
  gameName: string = 'custom',
  payoffMatrix?: number[][][],
): GameTheoryResult {
  // 定義済みゲーム
  let matrix: number[][][];
  let players = ['Player1', 'Player2'];

  switch (gameName) {
    case 'prisoners_dilemma':
    case '囚人のジレンマ':
      // [P1の利得, P2の利得]
      matrix = [
        [[3, 3], [0, 5]],  // P1が協力: P2協力/裏切り
        [[5, 0], [1, 1]],  // P1が裏切り: P2協力/裏切り
      ];
      players = ['囚人A', '囚人B'];
      break;
    case 'chicken':
    case 'チキンゲーム':
      matrix = [
        [[3, 3], [1, 5]],
        [[5, 1], [0, 0]],
      ];
      break;
    case 'stag_hunt':
    case '鹿狩り':
      matrix = [
        [[4, 4], [0, 3]],
        [[3, 0], [2, 2]],
      ];
      break;
    case 'matching_pennies':
    case 'コイン合わせ':
      matrix = [
        [[1, -1], [-1, 1]],
        [[-1, 1], [1, -1]],
      ];
      break;
    default:
      matrix = payoffMatrix ?? [
        [[3, 3], [0, 5]],
        [[5, 0], [1, 1]],
      ];
  }

  // ナッシュ均衡の探索（純粋戦略）
  const nashEquilibria: { strategies: number[]; payoffs: number[] }[] = [];
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const p1Payoff = matrix[i][j][0];
      const p2Payoff = matrix[i][j][1];

      // P1の最適応答チェック
      let p1BestResponse = true;
      for (let k = 0; k < rows; k++) {
        if (matrix[k][j][0] > p1Payoff) { p1BestResponse = false; break; }
      }
      // P2の最適応答チェック
      let p2BestResponse = true;
      for (let k = 0; k < cols; k++) {
        if (matrix[i][k][1] > p2Payoff) { p2BestResponse = false; break; }
      }

      if (p1BestResponse && p2BestResponse) {
        nashEquilibria.push({ strategies: [i, j], payoffs: [p1Payoff, p2Payoff] });
      }
    }
  }

  // 支配戦略の検出
  let dominant: { player: number; strategy: number } | null = null;
  for (let i = 0; i < rows; i++) {
    let dominates = true;
    for (let k = 0; k < rows; k++) {
      if (k === i) continue;
      for (let j = 0; j < cols; j++) {
        if (matrix[i][j][0] <= matrix[k][j][0]) { dominates = false; break; }
      }
      if (!dominates) break;
    }
    if (dominates) { dominant = { player: 0, strategy: i }; break; }
  }

  // パレート最適
  const paretoOptimal: { strategies: number[]; payoffs: number[] }[] = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      let dominated = false;
      for (let a = 0; a < rows && !dominated; a++) {
        for (let b = 0; b < cols && !dominated; b++) {
          if (a === i && b === j) continue;
          if (matrix[a][b][0] >= matrix[i][j][0] && matrix[a][b][1] >= matrix[i][j][1]
            && (matrix[a][b][0] > matrix[i][j][0] || matrix[a][b][1] > matrix[i][j][1])) {
            dominated = true;
          }
        }
      }
      if (!dominated) {
        paretoOptimal.push({ strategies: [i, j], payoffs: [matrix[i][j][0], matrix[i][j][1]] });
      }
    }
  }

  // 協力度: ナッシュ均衡がパレート最適かどうか
  const cooperationIndex = nashEquilibria.length > 0 && paretoOptimal.some(p =>
    nashEquilibria.some(n => n.strategies[0] === p.strategies[0] && n.strategies[1] === p.strategies[1])
  ) ? 0.8 : 0.3;

  return {
    reiType: 'GameTheoryResult',
    game: gameName,
    players,
    payoffMatrix: matrix,
    nashEquilibria,
    dominant,
    paretoOptimal,
    cooperationIndex,
  };
}

// ============================================================
// σ
// ============================================================

export function getEconomicsSigma(input: any): any {
  if (input?.reiType === 'MarketState') {
    const m = input as MarketState;
    return {
      reiType: 'SigmaResult', domain: 'economics', subtype: 'market',
      field: { name: m.name, price: m.price, agents: m.agents.length },
      flow: { direction: m.trend, momentum: m.volume, velocity: m.volatility },
      memory: { history: m.history.length, trend: m.trend },
      layer: { depth: 2, structure: 'market' },
      relation: { supply: m.supply, demand: m.demand },
      will: { tendency: m.trend, volatility: m.volatility },
    };
  }
  if (input?.reiType === 'SupplyDemandResult') {
    const sd = input as SupplyDemandResult;
    return {
      reiType: 'SigmaResult', domain: 'economics', subtype: 'supply_demand',
      field: { equilibrium: sd.equilibrium },
      flow: { direction: 'towards_equilibrium' },
      relation: { elasticityS: sd.elasticitySupply, elasticityD: sd.elasticityDemand },
      will: { tendency: 'equilibrate' },
    };
  }
  if (input?.reiType === 'GameTheoryResult') {
    const g = input as GameTheoryResult;
    return {
      reiType: 'SigmaResult', domain: 'economics', subtype: 'game_theory',
      field: { game: g.game, players: g.players.length },
      flow: { direction: 'strategic' },
      memory: { nashCount: g.nashEquilibria.length },
      relation: { cooperationIndex: g.cooperationIndex, dominant: g.dominant },
      will: { tendency: g.cooperationIndex > 0.5 ? 'cooperate' : 'compete' },
    };
  }
  return { reiType: 'SigmaResult', domain: 'economics' };
}
