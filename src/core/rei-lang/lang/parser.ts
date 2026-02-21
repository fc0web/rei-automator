// ============================================================
// Rei v0.3 Parser — Integrated with Space-Layer-Diffusion
// Original: v0.2.1 by Nobuki Fujimoto
// Extended: v0.3 Space-Layer-Diffusion (collaborative design)
// ============================================================

import { TokenType, type Token } from './lexer';

function node(type: string, props: Record<string, any> = {}): any {
  return { type, ...props };
}

export class Parser {
  private pos = 0;
  private tokens: Token[];

  constructor(tokens: Token[]) {
    this.tokens = tokens.filter(t => t.type !== TokenType.NEWLINE);
  }

  parseProgram(): any {
    const stmts: any[] = [];
    while (!this.isAtEnd()) {
      while (this.check(TokenType.SEMICOLON)) this.advance();
      if (this.isAtEnd()) break;
      stmts.push(this.parseStatement());
      while (this.check(TokenType.SEMICOLON)) this.advance();
    }
    return node("Program", { body: stmts });
  }

  private parseStatement(): any {
    if (this.check(TokenType.LET)) return this.parseLetStmt();
    if (this.check(TokenType.COMPRESS)) return this.parseCompressDef();
    return this.parseExpression();
  }

  // --- let [mut] name [: type] = expr [witnessed by "..."] ---
  private parseLetStmt(): any {
    this.expect(TokenType.LET);
    const mutable = this.match(TokenType.MUT);
    const name = this.expect(TokenType.IDENT).value;
    let typeAnnotation: string | null = null;
    let phaseGuard: string | null = null;
    if (this.match(TokenType.COLON)) {
      typeAnnotation = this.expect(TokenType.IDENT).value;
      if (this.check(TokenType.IDENT) && this.peek().value.startsWith("@")) {
        phaseGuard = this.advance().value.slice(1);
      }
    }
    this.expect(TokenType.ASSIGN);
    const init = this.parseExpression();
    let witness: string | null = null;
    if (this.match(TokenType.WITNESSED)) {
      this.expect(TokenType.BY);
      witness = this.expect(TokenType.STRING).value;
    }
    return node(mutable ? "MutStmt" : "LetStmt", {
      name, init, typeAnnotation, phaseGuard, witness,
    });
  }

  // --- compress [level] name(params) [-> type] = body ---
  private parseCompressDef(): any {
    const compressToken = this.expect(TokenType.COMPRESS);
    const level = this.parseCompressLevel(compressToken.value);
    const name = this.expect(TokenType.IDENT).value;
    this.expect(TokenType.LPAREN);
    const params: string[] = [];
    if (!this.check(TokenType.RPAREN)) {
      params.push(this.parseParamDecl());
      while (this.match(TokenType.COMMA)) {
        params.push(this.parseParamDecl());
      }
    }
    this.expect(TokenType.RPAREN);
    let returnType: string | null = null;
    if (this.match(TokenType.ARROW)) {
      returnType = this.expect(TokenType.IDENT).value;
    }
    this.expect(TokenType.ASSIGN);
    const body = this.parseExpression();
    return node("CompressDef", { name, params, body, level, returnType });
  }

  private parseCompressLevel(value: string): number {
    if (value === "compress") return -1;
    const suffixMap: Record<string, number> = {
      "compress\u2070": 0,  // ⁰
      "compress\xB9": 1,    // ¹
      "compress\xB2": 2,    // ²
      "compress\xB3": 3,    // ³
      "compress\u221E": Infinity, // ∞
    };
    return suffixMap[value] ?? -1;
  }

  private parseParamDecl(): string {
    let name: string;
    if (this.check(TokenType.IDENT)) {
      name = this.advance().value;
    } else if (this.check(TokenType.CONST_E)) {
      name = this.advance().value;
    } else if (this.check(TokenType.CONST_I)) {
      name = this.advance().value;
    } else {
      name = this.expect(TokenType.IDENT).value;
    }
    if (this.match(TokenType.COLON)) {
      this.expect(TokenType.IDENT); // type annotation consumed
    }
    return name;
  }

  // --- Expression hierarchy (low → high precedence) ---
  private parseExpression(): any {
    return this.parsePipe();
  }

  // Level 1: |> pipe, ◁ reflect
  private parsePipe(): any {
    let left = this.parseLogicOr();
    while (this.check(TokenType.PIPE_OP) || this.check(TokenType.REFLECT)) {
      if (this.match(TokenType.PIPE_OP)) {
        const cmd = this.parsePipeCommand();
        left = node("Pipe", { input: left, command: cmd });
      } else if (this.match(TokenType.REFLECT)) {
        const right = this.parseLogicOr();
        left = node("ReflectOp", { left, right });
      }
    }
    return left;
  }

  private parsePipeCommand(): any {
    if (this.check(TokenType.IDENT) || this.check(TokenType.GENESIS)
        || this.check(TokenType.SPACE) || this.check(TokenType.LAYER)
        || this.check(TokenType.COMPRESS)) {
      const cmd = this.advance().value;
      let mode: string | null = null;
      let args: any[] = [];
      if (this.match(TokenType.COLON)) {
        mode = this.expect(TokenType.IDENT).value;
      }
      if (this.match(TokenType.LPAREN)) {
        if (!this.check(TokenType.RPAREN)) {
          args.push(this.parseExpression());
          while (this.match(TokenType.COMMA)) args.push(this.parseExpression());
        }
        this.expect(TokenType.RPAREN);
      }
      return node("PipeCmd", { cmd, mode, args });
    }
    if (this.match(TokenType.CONVERGE)) return node("PipeCmd", { cmd: "\u290A", mode: null, args: [] });
    if (this.match(TokenType.DIVERGE)) return node("PipeCmd", { cmd: "\u290B", mode: null, args: [] });
    throw this.error("パイプコマンドが必要");
  }

  // Level 2: ∧ ∨ (logic)
  private parseLogicOr(): any {
    let left = this.parseLogicAnd();
    while (this.match(TokenType.OR)) {
      const right = this.parseLogicAnd();
      left = node("BinOp", { op: "\u2228", left, right });
    }
    return left;
  }

  private parseLogicAnd(): any {
    let left = this.parseComparison();
    while (this.match(TokenType.AND)) {
      const right = this.parseComparison();
      left = node("BinOp", { op: "\u2227", left, right });
    }
    return left;
  }

  // Level 3: comparison operators
  private parseComparison(): any {
    let left = this.parseAddition();
    const compOps = [
      TokenType.GT_K, TokenType.LT_K, TokenType.EQ_K,
      TokenType.EQ, TokenType.NEQ, TokenType.GT, TokenType.LT,
      TokenType.GTE, TokenType.LTE,
    ];
    while (compOps.some(op => this.check(op))) {
      const opToken = this.advance();
      const right = this.parseAddition();
      left = node("BinOp", { op: opToken.value, left, right });
    }
    return left;
  }

  // Level 4: + - ⊕
  private parseAddition(): any {
    let left = this.parseMultiplication();
    while (this.check(TokenType.PLUS) || this.check(TokenType.MINUS) || this.check(TokenType.OPLUS)) {
      const op = this.advance().value;
      const right = this.parseMultiplication();
      left = node("BinOp", { op, left, right });
    }
    return left;
  }

  // Level 5: * / ⊗ ·
  private parseMultiplication(): any {
    let left = this.parseExtendReduce();
    while (this.check(TokenType.STAR) || this.check(TokenType.SLASH) || this.check(TokenType.OTIMES) || this.check(TokenType.CDOT)) {
      const op = this.advance().value;
      const right = this.parseExtendReduce();
      left = node("BinOp", { op, left, right });
    }
    return left;
  }

  // Level 6: >> << ⤊ ⤋
  private parseExtendReduce(): any {
    let left = this.parseUnary();
    while (true) {
      if (this.match(TokenType.EXTEND)) {
        if (this.match(TokenType.COLON)) {
          const sub = this.expect(TokenType.IDENT).value;
          left = node("Extend", { target: left, subscript: sub });
        } else {
          const right = this.parseUnary();
          left = node("Extend", { target: left, expr: right });
        }
      } else if (this.match(TokenType.REDUCE)) {
        left = node("Reduce", { target: left });
      } else if (this.match(TokenType.CONVERGE)) {
        const right = this.parseUnary();
        left = node("ConvergeOp", { left, right });
      } else if (this.match(TokenType.DIVERGE)) {
        const right = this.parseUnary();
        left = node("DivergeOp", { left, right });
      } else {
        break;
      }
    }
    return left;
  }

  // Level 7: unary ¬ ¬π -
  private parseUnary(): any {
    if (this.match(TokenType.NOT_PI)) {
      const operand = this.parseUnary();
      return node("UnaryOp", { op: "\xAC\u03C0", operand });
    }
    if (this.match(TokenType.NOT)) {
      const operand = this.parseUnary();
      return node("UnaryOp", { op: "\xAC", operand });
    }
    if (this.check(TokenType.MINUS) && this.shouldNegateBePrefix()) {
      this.advance();
      const operand = this.parseUnary();
      return node("UnaryOp", { op: "-", operand });
    }
    return this.parsePostfix();
  }

  // Level 8: . member access, [index], (call)
  private parsePostfix(): any {
    let left = this.parsePrimary();
    while (true) {
      if (this.match(TokenType.DOT)) {
        if (this.check(TokenType.IDENT)) {
          const member = this.advance().value;
          // Check for .κ suffix using lookahead (don't consume DOT yet)
          if (this.check(TokenType.DOT) && this.checkAhead(TokenType.IDENT, 1)
              && this.tokens[this.pos + 1]?.value === "\u03BA") {
            this.advance(); // consume DOT
            this.advance(); // consume κ
            left = node("MemberAccess", { object: left, member, kappa: true });
          } else {
            left = node("MemberAccess", { object: left, member, kappa: false });
          }
        }
      } else if (this.match(TokenType.LPAREN)) {
        const args: any[] = [];
        if (!this.check(TokenType.RPAREN)) {
          args.push(this.parseExpression());
          while (this.match(TokenType.COMMA)) args.push(this.parseExpression());
        }
        this.expect(TokenType.RPAREN);
        left = node("FnCall", { callee: left, args });
      } else if (this.match(TokenType.LBRACKET)) {
        const index = this.parseExpression();
        this.expect(TokenType.RBRACKET);
        left = node("IndexAccess", { object: left, index });
      } else {
        break;
      }
    }
    return left;
  }

  // --- Primary expressions ---
  private parsePrimary(): any {
    if (this.check(TokenType.NUMBER)) {
      const val = this.advance().value;
      return node("NumLit", { value: parseFloat(val) });
    }
    if (this.check(TokenType.STRING)) {
      return node("StrLit", { value: this.advance().value });
    }
    if (this.match(TokenType.TRUE)) return node("BoolLit", { value: true });
    if (this.match(TokenType.FALSE)) return node("BoolLit", { value: false });
    if (this.match(TokenType.NULL)) return node("NullLit", {});
    if (this.check(TokenType.EXT_LIT)) {
      const val = this.advance().value;
      return node("ExtLit", { raw: val });
    }
    if (this.match(TokenType.SYMBOL_0_0)) {
      return node("ExtLit", { raw: "0\u2080" });
    }
    if (this.match(TokenType.SYMBOL_DOT_PRIM)) {
      return node("ConstLit", { value: "\u30FB" });
    }
    if (this.match(TokenType.CONST_PI)) return node("NumLit", { value: Math.PI });
    if (this.match(TokenType.CONST_E)) return node("NumLit", { value: Math.E });
    if (this.match(TokenType.CONST_PHI)) return node("NumLit", { value: (1 + Math.sqrt(5)) / 2 });
    if (this.match(TokenType.CONST_I)) return node("ConstLit", { value: "i" });
    if (this.match(TokenType.CONST_EMPTY)) return node("ConstLit", { value: "\u2205" });
    if (this.match(TokenType.CONST_PHI_UP)) return node("ConstLit", { value: "\u03A6" });
    if (this.match(TokenType.CONST_PSI_UP)) return node("ConstLit", { value: "\u03A8" });
    if (this.match(TokenType.CONST_OMEGA_UP)) return node("ConstLit", { value: "\u03A9" });
    if (this.match(TokenType.QUAD_TOP)) return node("QuadLit", { value: "top" });
    if (this.match(TokenType.QUAD_BOT)) return node("QuadLit", { value: "bottom" });
    if (this.match(TokenType.QUAD_TOP_PI)) return node("QuadLit", { value: "topPi" });
    if (this.match(TokenType.QUAD_BOT_PI)) return node("QuadLit", { value: "bottomPi" });
    if (this.match(TokenType.MDIM_OPEN)) {
      return this.parseMDimLit();
    }
    if (this.match(TokenType.LBRACKET)) {
      const elems: any[] = [];
      if (!this.check(TokenType.RBRACKET)) {
        elems.push(this.parseExpression());
        while (this.match(TokenType.COMMA)) elems.push(this.parseExpression());
      }
      this.expect(TokenType.RBRACKET);
      return node("ArrayLit", { elements: elems });
    }
    if (this.match(TokenType.LPAREN)) {
      const expr = this.parseExpression();
      this.expect(TokenType.RPAREN);
      return expr;
    }
    if (this.check(TokenType.IF)) return this.parseIfExpr();
    if (this.check(TokenType.MATCH)) return this.parseMatchExpr();
    if (this.check(TokenType.GENESIS)) {
      this.advance();
      if (this.match(TokenType.LPAREN)) {
        this.expect(TokenType.RPAREN);
      }
      return node("FnCall", { callee: node("Ident", { name: "genesis" }), args: [] });
    }

    // ── v0.3: Space literal ──
    if (this.check(TokenType.SPACE)) {
      return this.parseSpaceLit();
    }

    if (this.check(TokenType.IDENT)) {
      const name = this.advance().value;
      return node("Ident", { name });
    }
    throw this.error(`予期しないトークン: ${this.peek().value} (${this.peek().type})`);
  }

  // --- MDim literal: 𝕄{center; n1, n2, ... [weight w] [mode]} ---
  private parseMDimLit(): any {
    const center = this.parseExpression();
    this.expect(TokenType.SEMICOLON);
    const neighbors: any[] = [];
    neighbors.push(this.parseExpression());
    while (this.match(TokenType.COMMA)) {
      if (this.check(TokenType.RBRACE)) break;
      if (this.check(TokenType.WEIGHT)) break;
      neighbors.push(this.parseExpression());
    }
    let weight: any = null;
    if (this.match(TokenType.WEIGHT)) {
      weight = this.parseExpression();
    }
    let mode = "weighted";
    if (this.match(TokenType.COLON)) {
      if (this.check(TokenType.IDENT)) {
        mode = this.advance().value;
      }
    }
    this.expect(TokenType.RBRACE);
    return node("MDimLit", { center, neighbors, weight, mode });
  }

  // ── v0.3: Space literal: 空{ 層 0: expr, expr  層 1: expr } ──
  private parseSpaceLit(): any {
    this.expect(TokenType.SPACE); // consume 空 or space
    this.expect(TokenType.LBRACE);

    const layers: any[] = [];
    let topology = "flat";

    // Check for topology: 空{ topology: torus, ... }
    if (this.check(TokenType.IDENT) && this.peek().value === "topology") {
      this.advance(); // consume 'topology'
      this.expect(TokenType.COLON);
      if (this.check(TokenType.IDENT)) {
        topology = this.advance().value;
      }
      this.match(TokenType.COMMA); // optional comma
    }

    // Parse layer definitions
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      // 層 N: or layer N:
      if (!this.check(TokenType.LAYER)) {
        throw this.error(`層の定義が必要です。実際: ${this.peek().type} ("${this.peek().value}")`);
      }
      this.expect(TokenType.LAYER);
      const layerIndex = this.parseExpression();
      this.expect(TokenType.COLON);

      const nodes: any[] = [];
      // Parse node expressions until next 層 or }
      nodes.push(this.parseExpression());
      while (this.match(TokenType.COMMA)) {
        // Stop if next token is a layer definition or closing brace
        if (this.check(TokenType.LAYER) || this.check(TokenType.RBRACE)) break;
        nodes.push(this.parseExpression());
      }

      layers.push({ index: layerIndex, nodes });
    }

    this.expect(TokenType.RBRACE);
    return node("SpaceLit", { layers, topology });
  }

  // --- if expr then expr else expr ---
  private parseIfExpr(): any {
    this.expect(TokenType.IF);
    const cond = this.parseExpression();
    this.expect(TokenType.THEN);
    const then = this.parseExpression();
    this.expect(TokenType.ELSE);
    const elseExpr = this.parseExpression();
    return node("IfExpr", { cond, then, else: elseExpr });
  }

  // --- match expr { case pat -> expr, ... } ---
  private parseMatchExpr(): any {
    this.expect(TokenType.MATCH);
    const target = this.parseExpression();
    this.expect(TokenType.LBRACE);
    const cases: any[] = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      this.expect(TokenType.CASE);
      const pattern = this.parsePrimary();
      this.expect(TokenType.ARROW);
      const body = this.parseExpression();
      cases.push({ pattern, body });
      this.match(TokenType.COMMA);
    }
    this.expect(TokenType.RBRACE);
    return node("MatchExpr", { target, cases });
  }

  // --- Helpers ---
  private peek(): Token {
    return this.tokens[this.pos] || { type: TokenType.EOF, value: "", line: 0, col: 0 };
  }
  private isAtEnd(): boolean { return this.peek().type === TokenType.EOF; }
  private check(type: string): boolean { return this.peek().type === type; }
  private checkAhead(type: string, offset: number): boolean {
    const idx = this.pos + offset;
    return idx < this.tokens.length && this.tokens[idx].type === type;
  }
  private advance(): Token { const t = this.tokens[this.pos]; this.pos++; return t; }
  private match(type: string): boolean {
    if (this.check(type)) { this.advance(); return true; }
    return false;
  }
  private expect(type: string): Token {
    if (this.check(type)) return this.advance();
    const t = this.peek();
    throw this.error(`期待: ${type}, 実際: ${t.type} ("${t.value}")`);
  }
  private error(msg: string): Error {
    const t = this.peek();
    return new Error(`[行 ${t.line}:${t.col}] 構文エラー: ${msg}`);
  }
  private shouldNegateBePrefix(): boolean {
    if (this.pos === 0) return true;
    const prev = this.tokens[this.pos - 1];
    return [
      TokenType.LPAREN, TokenType.COMMA, TokenType.ASSIGN,
      TokenType.PLUS, TokenType.MINUS, TokenType.STAR, TokenType.SLASH,
      TokenType.OPLUS, TokenType.OTIMES, TokenType.PIPE_OP,
      TokenType.SEMICOLON, TokenType.LBRACKET, TokenType.COLON,
      TokenType.MDIM_OPEN, TokenType.LBRACE,
    ].includes(prev.type);
  }
}
