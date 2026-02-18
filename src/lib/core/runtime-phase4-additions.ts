/**
 * runtime-phase4-additions.ts — Phase 4で runtime.ts に追加する実行処理
 *
 * 【統合方法】
 * 1. runtime.ts の先頭に ImageMatcher と screen-capture の import を追加
 * 2. ReiRuntime クラスに findState フィールドと imageMatcher フィールドを追加
 * 3. executeCommand() の switch 文に以下の case を追加
 *
 * 前提: ImageMatcher は main.ts 側からReiRuntimeに注入するか、
 *       runtime内で直接インスタンス化する
 */

/*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. runtime.ts 先頭に追加する import:

import { ImageMatcher, MatchResult, FindState } from '../auto/image-matcher';

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2. ReiRuntime クラスに追加するフィールド:

  private findState: FindState = {
    found: false,
    x: 0,
    y: 0,
    centerX: 0,
    centerY: 0,
    confidence: 0,
    template: '',
  };

  private imageMatcher: ImageMatcher | null = null;
  private captureFunc: (() => Promise<string>) | null = null;

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3. コンストラクタまたは初期化メソッドに追加:

  // ImageMatcher を注入（main.ts から呼ぶ）
  setImageMatcher(matcher: ImageMatcher): void {
    this.imageMatcher = matcher;
  }

  // キャプチャ関数を注入（main.ts の screen-capture を使う）
  setCaptureFunc(func: () => Promise<string>): void {
    this.captureFunc = func;
  }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4. executeCommand() の switch 文に追加する case:
*/

// ── ここから実際のコードブロック（コピペ用） ─────────────

/**
 * 以下の case 文を runtime.ts の executeCommand() 内の
 * switch (command.type) ブロックに追加してください。
 */

/*

      // ── Phase 4: find ─────────────────────────────────
      case 'find': {
        if (!this.imageMatcher || !this.captureFunc) {
          this.log('エラー: 画像認識が初期化されていません');
          break;
        }

        this.log(`テンプレート探索: "${command.template}"`);

        // 現在の画面をキャプチャ
        const capturePath = await this.captureFunc();

        // テンプレートマッチング実行
        const result = await this.imageMatcher.findTemplate(
          capturePath,
          command.template,
          { threshold: command.threshold }
        );

        // 結果を内部状態に保存
        this.findState = {
          found: result.found,
          x: result.x,
          y: result.y,
          centerX: result.centerX,
          centerY: result.centerY,
          confidence: result.confidence,
          template: command.template,
        };

        if (result.found) {
          this.log(
            `✓ 発見: "${command.template}" at (${result.centerX}, ${result.centerY}) ` +
            `信頼度: ${(result.confidence * 100).toFixed(1)}%`
          );
        } else {
          this.log(
            `✗ 未発見: "${command.template}" ` +
            `(最高信頼度: ${(result.confidence * 100).toFixed(1)}%)`
          );
        }
        break;
      }

      // ── Phase 4: click_found ──────────────────────────
      case 'click_found': {
        if (!this.findState.found) {
          this.log('エラー: find() が未実行または画像が見つかりませんでした');
          break;
        }

        const targetX = this.findState.centerX + (command.offsetX ?? 0);
        const targetY = this.findState.centerY + (command.offsetY ?? 0);

        this.log(
          `${command.action}(found) → (${targetX}, ${targetY}) ` +
          `[テンプレート: ${this.findState.template}]`
        );

        // 既存の AutoController を使ってクリック
        switch (command.action) {
          case 'click':
            await this.controller.click(targetX, targetY);
            break;
          case 'dblclick':
            await this.controller.dblclick(targetX, targetY);
            break;
          case 'rightclick':
            await this.controller.rightclick(targetX, targetY);
            break;
        }
        break;
      }

      // ── Phase 4: wait_find ────────────────────────────
      case 'wait_find': {
        if (!this.imageMatcher || !this.captureFunc) {
          this.log('エラー: 画像認識が初期化されていません');
          break;
        }

        const timeout = command.timeout ?? 10000;
        const interval = command.interval ?? 500;
        const startTime = Date.now();

        this.log(
          `テンプレート待機: "${command.template}" ` +
          `(タイムアウト: ${timeout}ms, 間隔: ${interval}ms)`
        );

        let found = false;
        while (Date.now() - startTime < timeout) {
          // 停止チェック
          if (this.shouldStop()) {
            this.log('wait_find: 停止されました');
            break;
          }

          // 一時停止チェック
          while (this.isPaused()) {
            await this.sleep(100);
            if (this.shouldStop()) break;
          }

          // キャプチャ→マッチング
          const capPath = await this.captureFunc();
          const matchResult = await this.imageMatcher.findTemplate(
            capPath,
            command.template,
            { threshold: command.threshold }
          );

          if (matchResult.found) {
            this.findState = {
              found: true,
              x: matchResult.x,
              y: matchResult.y,
              centerX: matchResult.centerX,
              centerY: matchResult.centerY,
              confidence: matchResult.confidence,
              template: command.template,
            };
            this.log(
              `✓ 発見: "${command.template}" at (${matchResult.centerX}, ${matchResult.centerY}) ` +
              `${((Date.now() - startTime) / 1000).toFixed(1)}秒後`
            );
            found = true;
            break;
          }

          await this.sleep(interval);
        }

        if (!found && !this.shouldStop()) {
          this.log(
            `✗ タイムアウト: "${command.template}" が ${timeout}ms 以内に見つかりませんでした`
          );
          this.findState = {
            found: false,
            x: 0, y: 0, centerX: 0, centerY: 0,
            confidence: 0,
            template: command.template,
          };
        }
        break;
      }

      // ── Phase 4: find_click ───────────────────────────
      case 'find_click': {
        if (!this.imageMatcher || !this.captureFunc) {
          this.log('エラー: 画像認識が初期化されていません');
          break;
        }

        this.log(`探索+クリック: "${command.template}"`);

        const capPath = await this.captureFunc();
        const matchResult = await this.imageMatcher.findTemplate(
          capPath,
          command.template,
          { threshold: command.threshold }
        );

        if (matchResult.found) {
          const targetX = matchResult.centerX + (command.offsetX ?? 0);
          const targetY = matchResult.centerY + (command.offsetY ?? 0);

          this.findState = {
            found: true,
            x: matchResult.x,
            y: matchResult.y,
            centerX: matchResult.centerX,
            centerY: matchResult.centerY,
            confidence: matchResult.confidence,
            template: command.template,
          };

          this.log(
            `✓ 発見+${command.action}: (${targetX}, ${targetY}) ` +
            `信頼度: ${(matchResult.confidence * 100).toFixed(1)}%`
          );

          switch (command.action) {
            case 'click':
              await this.controller.click(targetX, targetY);
              break;
            case 'dblclick':
              await this.controller.dblclick(targetX, targetY);
              break;
            case 'rightclick':
              await this.controller.rightclick(targetX, targetY);
              break;
          }
        } else {
          this.log(
            `✗ 未発見: "${command.template}" ` +
            `(最高信頼度: ${(matchResult.confidence * 100).toFixed(1)}%)`
          );
        }
        break;
      }

*/

// ── ヘルパーメソッド（runtime.ts に追加） ───────────────

/*
  // runtime.ts クラスに追加
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // findState のゲッター（外部からの参照用）
  getFindState(): FindState {
    return { ...this.findState };
  }
*/

export {}; // TypeScriptモジュールとして認識させるため
