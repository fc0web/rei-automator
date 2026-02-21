// ============================================================
// Rei v0.3 Lexer — Integrated with Space-Layer-Diffusion
// Original: v0.2.1 by Nobuki Fujimoto
// Extended: v0.3 Space-Layer-Diffusion (collaborative design)
// ============================================================

export const TokenType: Record<string, string> = {
  // Literals
  NUMBER: "NUMBER",
  STRING: "STRING",
  EXT_LIT: "EXT_LIT",
  SYMBOL_0_0: "SYMBOL_0_0",
  SYMBOL_DOT_PRIM: "SYMBOL_DOT_PRIM",
  BOOL_TRUE: "BOOL_TRUE",
  BOOL_FALSE: "BOOL_FALSE",
  // Math constants
  CONST_PI: "CONST_PI",
  CONST_E: "CONST_E",
  CONST_PHI: "CONST_PHI",
  CONST_I: "CONST_I",
  CONST_PHI_UP: "CONST_PHI_UP",
  CONST_PSI_UP: "CONST_PSI_UP",
  CONST_OMEGA_UP: "CONST_OMEGA_UP",
  CONST_EMPTY: "CONST_EMPTY",
  // Quad literals (v0.2)
  QUAD_TOP: "QUAD_TOP",
  QUAD_BOT: "QUAD_BOT",
  QUAD_TOP_PI: "QUAD_TOP_PI",
  QUAD_BOT_PI: "QUAD_BOT_PI",
  // Keywords
  LET: "LET",
  MUT: "MUT",
  COMPRESS: "COMPRESS",
  WEIGHT: "WEIGHT",
  GENESIS: "GENESIS",
  IF: "IF",
  THEN: "THEN",
  ELSE: "ELSE",
  MATCH: "MATCH",
  CASE: "CASE",
  WITNESSED: "WITNESSED",
  BY: "BY",
  TRUE: "TRUE",
  FALSE: "FALSE",
  NULL: "NULL",
  TEMPORAL: "TEMPORAL",
  TIMELESS: "TIMELESS",
  // ── v0.3 Space-Layer-Diffusion keywords ──
  SPACE: "SPACE",       // 空 or "space"
  LAYER: "LAYER",       // 層 or "layer"
  // Identifiers
  IDENT: "IDENT",
  // Operators
  PLUS: "PLUS",
  MINUS: "MINUS",
  STAR: "STAR",
  SLASH: "SLASH",
  OPLUS: "OPLUS",
  OTIMES: "OTIMES",
  CDOT: "CDOT",
  PIPE_OP: "PIPE_OP",
  EXTEND: "EXTEND",
  REDUCE: "REDUCE",
  ASSIGN: "ASSIGN",
  DOT: "DOT",
  ARROW: "ARROW",
  SEMICOLON: "SEMICOLON",
  COMMA: "COMMA",
  COLON: "COLON",
  LPAREN: "LPAREN",
  RPAREN: "RPAREN",
  LBRACE: "LBRACE",
  RBRACE: "RBRACE",
  LBRACKET: "LBRACKET",
  RBRACKET: "RBRACKET",
  CONVERGE: "CONVERGE",
  DIVERGE: "DIVERGE",
  REFLECT: "REFLECT",
  AND: "AND",
  OR: "OR",
  NOT: "NOT",
  NOT_PI: "NOT_PI",
  GT_K: "GT_K",
  LT_K: "LT_K",
  EQ_K: "EQ_K",
  GT: "GT",
  LT: "LT",
  EQ: "EQ",
  NEQ: "NEQ",
  GTE: "GTE",
  LTE: "LTE",
  MDIM_OPEN: "MDIM_OPEN",
  // Special
  NEWLINE: "NEWLINE",
  EOF: "EOF",
};

const KEYWORDS: Record<string, string> = {
  "let": TokenType.LET,
  "mut": TokenType.MUT,
  "compress": TokenType.COMPRESS,
  "weight": TokenType.WEIGHT,
  "genesis": TokenType.GENESIS,
  "if": TokenType.IF,
  "then": TokenType.THEN,
  "else": TokenType.ELSE,
  "match": TokenType.MATCH,
  "case": TokenType.CASE,
  "witnessed": TokenType.WITNESSED,
  "by": TokenType.BY,
  "true": TokenType.TRUE,
  "false": TokenType.FALSE,
  "null": TokenType.NULL,
  "Temporal": TokenType.TEMPORAL,
  "Timeless": TokenType.TIMELESS,
  // ── v0.3 ──
  "space": TokenType.SPACE,
  "layer": TokenType.LAYER,
};

const SUBSCRIPT_CHARS = new Set("oxzwensbua".split(""));

export interface Token {
  type: string;
  value: string;
  line: number;
  col: number;
}

export class Lexer {
  private chars: string[];
  private pos = 0;
  private line = 1;
  private col = 1;
  private tokens: Token[] = [];

  constructor(private source: string) {
    this.chars = Array.from(source);
  }

  tokenize(): Token[] {
    this.tokens = [];
    while (this.pos < this.chars.length) {
      this.skipWhitespaceAndComments();
      if (this.pos >= this.chars.length) break;
      const ch = this.chars[this.pos];

      if (ch === "\n") {
        this.emit(TokenType.NEWLINE, "\n");
        this.advance();
        this.line++;
        this.col = 1;
        continue;
      }
      if (ch === '"') { this.readString(); continue; }
      if (ch === "0" && this.peek(1) === "\u2080") {
        this.emit(TokenType.SYMBOL_0_0, "0\u2080");
        this.advance(); this.advance(); continue;
      }
      if (ch === "\u{1D544}" && this.peek(1) === "{") {
        this.emit(TokenType.MDIM_OPEN, "\u{1D544}{");
        this.advance(); this.advance(); continue;
      }
      // ── v0.3: Unicode 空 and 層 ──
      if (ch === "空") {
        this.emit(TokenType.SPACE, "空");
        this.advance(); continue;
      }
      if (ch === "層") {
        this.emit(TokenType.LAYER, "層");
        this.advance(); continue;
      }
      if (this.isExtStart(ch)) {
        const ext = this.readExtLit();
        if (ext) continue;
      }
      if (this.isDigit(ch) || (ch === "-" && this.isDigit(this.peek(1) ?? "") && this.shouldNegateBePrefix())) {
        this.readNumber(); continue;
      }
      if (this.readUnicodeToken(ch)) continue;
      if (this.readMultiCharOp(ch)) continue;
      if (this.readSingleCharOp(ch)) continue;
      if (this.isIdentStart(ch)) { this.readIdentOrKeyword(); continue; }
      this.advance();
    }
    this.emit(TokenType.EOF, "");
    return this.tokens.filter(t => t.type !== TokenType.NEWLINE);
  }

  private skipWhitespaceAndComments() {
    while (this.pos < this.chars.length) {
      const ch = this.chars[this.pos];
      if (ch === " " || ch === "\t" || ch === "\r") { this.advance(); continue; }
      if (ch === "/" && this.peek(1) === "/") {
        while (this.pos < this.chars.length && this.chars[this.pos] !== "\n") this.advance();
        continue;
      }
      if (ch === "/" && this.peek(1) === "*") {
        this.advance(); this.advance();
        while (this.pos < this.chars.length) {
          if (this.chars[this.pos] === "*" && this.peek(1) === "/") {
            this.advance(); this.advance(); break;
          }
          if (this.chars[this.pos] === "\n") { this.line++; this.col = 0; }
          this.advance();
        }
        continue;
      }
      break;
    }
  }

  private readString() {
    const startCol = this.col;
    this.advance();
    let str = "";
    while (this.pos < this.chars.length && this.chars[this.pos] !== '"') {
      if (this.chars[this.pos] === "\\" && this.pos + 1 < this.chars.length) {
        this.advance();
        const esc = this.chars[this.pos];
        if (esc === "n") str += "\n";
        else if (esc === "t") str += "\t";
        else if (esc === "\\") str += "\\";
        else if (esc === '"') str += '"';
        else str += esc;
      } else {
        str += this.chars[this.pos];
      }
      this.advance();
    }
    if (this.pos < this.chars.length) this.advance();
    this.tokens.push({ type: TokenType.STRING, value: str, line: this.line, col: startCol });
  }

  private isExtStart(ch: string): boolean {
    if (ch === "0" && SUBSCRIPT_CHARS.has(this.peek(1) ?? "")) return true;
    if (ch === "\u03C0" || ch === "\u03C6") {
      const next = this.peek(1);
      if (next && SUBSCRIPT_CHARS.has(next)) return true;
    }
    if (ch === "e" || ch === "i") {
      const next = this.peek(1);
      if (!next || !SUBSCRIPT_CHARS.has(next)) return false;
      let offset = 1;
      while (this.peek(offset) && SUBSCRIPT_CHARS.has(this.peek(offset)!)) offset++;
      const afterSubs = this.peek(offset);
      if (afterSubs && /[a-zA-Z0-9_]/.test(afterSubs)) return false;
      return true;
    }
    return false;
  }

  private readExtLit(): boolean {
    const startCol = this.col;
    const base = this.chars[this.pos];
    this.advance();
    let subs = "";
    while (this.pos < this.chars.length && SUBSCRIPT_CHARS.has(this.chars[this.pos])) {
      subs += this.chars[this.pos];
      this.advance();
    }
    if (subs.length > 0) {
      this.tokens.push({ type: TokenType.EXT_LIT, value: base + subs, line: this.line, col: startCol });
      return true;
    }
    this.pos--; this.col--;
    return false;
  }

  private readNumber() {
    const startCol = this.col;
    let num = "";
    if (this.chars[this.pos] === "-") { num += "-"; this.advance(); }
    while (this.pos < this.chars.length && this.isDigit(this.chars[this.pos])) {
      num += this.chars[this.pos]; this.advance();
    }
    if (this.pos < this.chars.length && this.chars[this.pos] === "." && this.isDigit(this.peek(1) ?? "")) {
      num += "."; this.advance();
      while (this.pos < this.chars.length && this.isDigit(this.chars[this.pos])) {
        num += this.chars[this.pos]; this.advance();
      }
    }
    this.tokens.push({ type: TokenType.NUMBER, value: num, line: this.line, col: startCol });
  }

  private readUnicodeToken(ch: string): boolean {
    const map: [string, string][] = [
      ["\u2295", TokenType.OPLUS],
      ["\u2297", TokenType.OTIMES],
      ["\xB7", TokenType.CDOT],
      ["\u03C0", TokenType.CONST_PI],
      ["\u03C6", TokenType.CONST_PHI],
      ["\u03A6", TokenType.CONST_PHI_UP],
      ["\u03A8", TokenType.CONST_PSI_UP],
      ["\u03A9", TokenType.CONST_OMEGA_UP],
      ["\u2205", TokenType.CONST_EMPTY],
      ["\u22A4", TokenType.QUAD_TOP],
      ["\u22A5", TokenType.QUAD_BOT],
      ["\u290A", TokenType.CONVERGE],
      ["\u290B", TokenType.DIVERGE],
      ["\u25C1", TokenType.REFLECT],
      ["\u2227", TokenType.AND],
      ["\u2228", TokenType.OR],
      ["\xAC", TokenType.NOT],
      ["\u30FB", TokenType.SYMBOL_DOT_PRIM],
    ];
    if (ch === "\u22A4" && this.peek(1) === "\u03C0") {
      this.emit(TokenType.QUAD_TOP_PI, "\u22A4\u03C0");
      this.advance(); this.advance(); return true;
    }
    if (ch === "\u22A5" && this.peek(1) === "\u03C0") {
      this.emit(TokenType.QUAD_BOT_PI, "\u22A5\u03C0");
      this.advance(); this.advance(); return true;
    }
    if (ch === "\xAC" && this.peek(1) === "\u03C0") {
      this.emit(TokenType.NOT_PI, "\xAC\u03C0");
      this.advance(); this.advance(); return true;
    }
    for (const [sym, type] of map) {
      if (ch === sym) {
        this.emit(type, sym); this.advance(); return true;
      }
    }
    return false;
  }

  private readMultiCharOp(ch: string): boolean {
    const next = this.peek(1);
    if (ch === "|" && next === ">") { this.emit(TokenType.PIPE_OP, "|>"); this.advance(); this.advance(); return true; }
    if (ch === ">" && next === ">") { this.emit(TokenType.EXTEND, ">>"); this.advance(); this.advance(); return true; }
    if (ch === "<" && next === "<") { this.emit(TokenType.REDUCE, "<<"); this.advance(); this.advance(); return true; }
    if (ch === "-" && next === ">") { this.emit(TokenType.ARROW, "->"); this.advance(); this.advance(); return true; }
    if (ch === "=" && next === "=") { this.emit(TokenType.EQ, "=="); this.advance(); this.advance(); return true; }
    if (ch === "!" && next === "=") { this.emit(TokenType.NEQ, "!="); this.advance(); this.advance(); return true; }
    if (ch === ">" && next === "=") { this.emit(TokenType.GTE, ">="); this.advance(); this.advance(); return true; }
    if (ch === "<" && next === "=") { this.emit(TokenType.LTE, "<="); this.advance(); this.advance(); return true; }
    if (ch === ">" && next === "\u03BA") { this.emit(TokenType.GT_K, ">\u03BA"); this.advance(); this.advance(); return true; }
    if (ch === "<" && next === "\u03BA") { this.emit(TokenType.LT_K, "<\u03BA"); this.advance(); this.advance(); return true; }
    if (ch === "=" && next === "\u03BA") { this.emit(TokenType.EQ_K, "=\u03BA"); this.advance(); this.advance(); return true; }
    return false;
  }

  private readSingleCharOp(ch: string): boolean {
    const map: Record<string, string> = {
      "+": TokenType.PLUS, "-": TokenType.MINUS, "*": TokenType.STAR, "/": TokenType.SLASH,
      "=": TokenType.ASSIGN, ".": TokenType.DOT, ",": TokenType.COMMA, ":": TokenType.COLON,
      ";": TokenType.SEMICOLON, "(": TokenType.LPAREN, ")": TokenType.RPAREN,
      "{": TokenType.LBRACE, "}": TokenType.RBRACE, "[": TokenType.LBRACKET,
      "]": TokenType.RBRACKET, "|": TokenType.PIPE_OP, ">": TokenType.GT, "<": TokenType.LT,
    };
    const type = map[ch];
    if (type) { this.emit(type, ch); this.advance(); return true; }
    return false;
  }

  private readIdentOrKeyword() {
    const startCol = this.col;
    let name = "";
    while (this.pos < this.chars.length && this.isIdentPart(this.chars[this.pos])) {
      name += this.chars[this.pos]; this.advance();
    }
    if (name.startsWith("compress") && name.length > 8) {
      const suffix = name.slice(8);
      if (["\u2070", "\xB9", "\xB2", "\xB3", "\u221E"].includes(suffix)) {
        this.tokens.push({ type: TokenType.COMPRESS, value: name, line: this.line, col: startCol });
        return;
      }
    }
    const kw = KEYWORDS[name];
    if (kw) {
      this.tokens.push({ type: kw, value: name, line: this.line, col: startCol });
    } else {
      this.tokens.push({ type: TokenType.IDENT, value: name, line: this.line, col: startCol });
    }
  }

  private advance() { this.pos++; this.col++; }
  private peek(offset: number): string | undefined { return this.chars[this.pos + offset]; }
  private emit(type: string, value: string) { this.tokens.push({ type, value, line: this.line, col: this.col }); }
  private isDigit(ch: string) { return ch >= "0" && ch <= "9"; }
  private isIdentStart(ch: string) { return /[a-zA-Z_α-ωΑ-Ω𝕄𝕌\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u2190-\u2199]/.test(ch); }
  private isIdentPart(ch: string) { return /[a-zA-Z0-9_α-ωΑ-Ω⁰¹²³∞𝕄𝕌\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u2190-\u2199]/.test(ch); }
  private shouldNegateBePrefix(): boolean {
    if (this.tokens.length === 0) return true;
    const last = this.tokens[this.tokens.length - 1];
    return [
      TokenType.LPAREN, TokenType.COMMA, TokenType.ASSIGN,
      TokenType.PLUS, TokenType.MINUS, TokenType.STAR, TokenType.SLASH,
      TokenType.OPLUS, TokenType.OTIMES, TokenType.PIPE_OP,
      TokenType.SEMICOLON, TokenType.LBRACKET, TokenType.COLON,
      TokenType.MDIM_OPEN, TokenType.LBRACE,
    ].includes(last.type);
  }
}
