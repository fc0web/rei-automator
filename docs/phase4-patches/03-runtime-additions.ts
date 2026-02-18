// ============================================================
// Phase 4 ランタイム追加
// ============================================================

// --- 先頭に import 追加 ---
// import { ImageMatcher, MatchResult } from '../auto/image-matcher';
// import { FindState } from './types';

// --- クラスフィールドに追加 ---
//   private findState: FindState = {
//     found: false, x: 0, y: 0, centerX: 0, centerY: 0,
//     confidence: 0, template: '',
//   };
//   private imageMatcher: ImageMatcher | null = null;
//   private captureFunc: (() => Promise&lt;string&gt;) | null = null;

// --- メソッド追加 ---
//   setImageMatcher(matcher: ImageMatcher): void { this.imageMatcher = matcher; }
//   setCaptureFunc(func: () => Promise&lt;string&gt;): void { this.captureFunc = func; }
//   getFindState(): FindState { return { ...this.findState }; }
//   private sleep(ms: number): Promise&lt;void&gt; { return new Promise(r => setTimeout(r, ms)); }

// --- executeCommand() switch 文に追加 ---

      case 'find': {
        if (!this.imageMatcher || !this.captureFunc) {
          this.log('エラー: 画像認識が初期化されていません');
          break;
        }
        this.log('テンプレート探索: "' + command.template + '"');
        const capturePath = await this.captureFunc();
        const result = await this.imageMatcher.findTemplate(
          capturePath, command.template, { threshold: command.threshold }
        );
        this.findState = {
          found: result.found, x: result.x, y: result.y,
          centerX: result.centerX, centerY: result.centerY,
          confidence: result.confidence, template: command.template,
        };
        if (result.found) {
          this.log('✓ 発見: "' + command.template + '" at (' + result.centerX + ', ' + result.centerY + ') 信頼度: ' + (result.confidence * 100).toFixed(1) + '%');
        } else {
          this.log('✗ 未発見: "' + command.template + '" (最高信頼度: ' + (result.confidence * 100).toFixed(1) + '%)');
        }
        break;
      }

      case 'click_found': {
        if (!this.findState.found) {
          this.log('エラー: find() が未実行または画像が見つかりませんでした');
          break;
        }
        const targetX = this.findState.centerX + (command.offsetX ?? 0);
        const targetY = this.findState.centerY + (command.offsetY ?? 0);
        this.log(command.action + '(found) → (' + targetX + ', ' + targetY + ') [テンプレート: ' + this.findState.template + ']');
        switch (command.action) {
          case 'click': await this.controller.click(targetX, targetY); break;
          case 'dblclick': await this.controller.dblclick(targetX, targetY); break;
          case 'rightclick': await this.controller.rightclick(targetX, targetY); break;
        }
        break;
      }

      case 'wait_find': {
        if (!this.imageMatcher || !this.captureFunc) {
          this.log('エラー: 画像認識が初期化されていません');
          break;
        }
        const wfTimeout = command.timeout ?? 10000;
        const wfInterval = command.interval ?? 500;
        const wfStart = Date.now();
        this.log('テンプレート待機: "' + command.template + '" (タイムアウト: ' + wfTimeout + 'ms)');
        let wfFound = false;
        while (Date.now() - wfStart < wfTimeout) {
          if (this.shouldStop()) { this.log('wait_find: 停止されました'); break; }
          while (this.isPaused()) {
            await this.sleep(100);
            if (this.shouldStop()) break;
          }
          const capPath = await this.captureFunc();
          const matchResult = await this.imageMatcher.findTemplate(
            capPath, command.template, { threshold: command.threshold }
          );
          if (matchResult.found) {
            this.findState = {
              found: true, x: matchResult.x, y: matchResult.y,
              centerX: matchResult.centerX, centerY: matchResult.centerY,
              confidence: matchResult.confidence, template: command.template,
            };
            this.log('✓ 発見: "' + command.template + '" at (' + matchResult.centerX + ', ' + matchResult.centerY + ') ' + ((Date.now() - wfStart) / 1000).toFixed(1) + '秒後');
            wfFound = true;
            break;
          }
          await this.sleep(wfInterval);
        }
        if (!wfFound && !this.shouldStop()) {
          this.log('✗ タイムアウト: "' + command.template + '" が ' + wfTimeout + 'ms 以内に見つかりませんでした');
          this.findState = { found: false, x: 0, y: 0, centerX: 0, centerY: 0, confidence: 0, template: command.template };
        }
        break;
      }

      case 'find_click': {
        if (!this.imageMatcher || !this.captureFunc) {
          this.log('エラー: 画像認識が初期化されていません');
          break;
        }
        this.log('探索+クリック: "' + command.template + '"');
        const fcCapPath = await this.captureFunc();
        const fcResult = await this.imageMatcher.findTemplate(
          fcCapPath, command.template, { threshold: command.threshold }
        );
        if (fcResult.found) {
          const fcX = fcResult.centerX + (command.offsetX ?? 0);
          const fcY = fcResult.centerY + (command.offsetY ?? 0);
          this.findState = {
            found: true, x: fcResult.x, y: fcResult.y,
            centerX: fcResult.centerX, centerY: fcResult.centerY,
            confidence: fcResult.confidence, template: command.template,
          };
          this.log('✓ 発見+' + command.action + ': (' + fcX + ', ' + fcY + ') 信頼度: ' + (fcResult.confidence * 100).toFixed(1) + '%');
          switch (command.action) {
            case 'click': await this.controller.click(fcX, fcY); break;
            case 'dblclick': await this.controller.dblclick(fcX, fcY); break;
            case 'rightclick': await this.controller.rightclick(fcX, fcY); break;
          }
        } else {
          this.log('✗ 未発見: "' + command.template + '" (最高信頼度: ' + (fcResult.confidence * 100).toFixed(1) + '%)');
        }
        break;
      }
