/**
 * renderer-phase4-additions.ts — Phase 4で renderer.ts に追加するUI制御
 *
 * 【統合方法】
 * 1. 以下の変数宣言を renderer.ts のグローバルスコープに追加
 * 2. initTemplateMode() を既存の初期化処理の後で呼ぶ
 * 3. refreshTemplateList() を画面表示時に呼ぶ
 *
 * ※ 実際のコードをコピーして renderer.ts に統合してください。
 *   コメントブロック内のコードは全てそのまま使えます。
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  グローバル変数
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/*

let isTemplateMode = false;
let templateDragStart: { x: number; y: number } | null = null;
let templateSelection: { x: number; y: number; w: number; h: number } | null = null;
let captureImageNaturalSize: { width: number; height: number } | null = null;
// 最後にキャプチャされた画像のBase64データ（テンプレート作成用）
let lastCaptureBase64: string | null = null;

*/

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  テンプレートモード初期化
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/*

function initTemplateMode(): void {
  const btnTemplateMode = document.getElementById('btn-template-mode');
  const captureImage = document.getElementById('capture-image') as HTMLImageElement | null;

  if (!btnTemplateMode || !captureImage) return;

  // テンプレートモードの切り替え
  btnTemplateMode.addEventListener('click', () => {
    isTemplateMode = !isTemplateMode;
    btnTemplateMode.classList.toggle('active', isTemplateMode);
    captureImage.classList.toggle('template-mode', isTemplateMode);

    // 選択矩形をクリア
    clearTemplateSelection();

    if (isTemplateMode) {
      appendLog('テンプレート作成モード: 画像上でドラッグして範囲を選択');
    }
  });

  // キャプチャ画像上でのドラッグ選択
  captureImage.addEventListener('mousedown', (e) => {
    if (!isTemplateMode) return;
    e.preventDefault();

    const rect = captureImage.getBoundingClientRect();
    templateDragStart = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    // 前の選択を消す
    clearTemplateSelection();
  });

  captureImage.addEventListener('mousemove', (e) => {
    if (!isTemplateMode || !templateDragStart) return;

    const rect = captureImage.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const x = Math.min(templateDragStart.x, currentX);
    const y = Math.min(templateDragStart.y, currentY);
    const w = Math.abs(currentX - templateDragStart.x);
    const h = Math.abs(currentY - templateDragStart.y);

    // 選択矩形を表示
    showSelectionOverlay(captureImage, x, y, w, h);
  });

  captureImage.addEventListener('mouseup', (e) => {
    if (!isTemplateMode || !templateDragStart) return;

    const rect = captureImage.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const displayX = Math.min(templateDragStart.x, currentX);
    const displayY = Math.min(templateDragStart.y, currentY);
    const displayW = Math.abs(currentX - templateDragStart.x);
    const displayH = Math.abs(currentY - templateDragStart.y);

    templateDragStart = null;

    // 最小サイズチェック
    if (displayW < 5 || displayH < 5) {
      clearTemplateSelection();
      return;
    }

    // 表示座標→実座標への変換
    // （キャプチャ画像が縮小表示されている場合の補正）
    const scaleX = (captureImage.naturalWidth || captureImage.width) / rect.width;
    const scaleY = (captureImage.naturalHeight || captureImage.height) / rect.height;

    templateSelection = {
      x: Math.round(displayX * scaleX),
      y: Math.round(displayY * scaleY),
      w: Math.round(displayW * scaleX),
      h: Math.round(displayH * scaleY),
    };

    captureImageNaturalSize = {
      width: captureImage.naturalWidth || captureImage.width,
      height: captureImage.naturalHeight || captureImage.height,
    };

    appendLog(`テンプレート範囲: (${templateSelection.x}, ${templateSelection.y}) ${templateSelection.w}×${templateSelection.h}`);

    // テンプレート名入力ダイアログを表示
    showTemplateNameDialog();
  });

  // テンプレート名ダイアログのイベント
  const btnSave = document.getElementById('btn-template-save');
  const btnCancel = document.getElementById('btn-template-cancel');
  const nameInput = document.getElementById('template-name-input') as HTMLInputElement;

  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      if (!templateSelection || !nameInput) return;
      const name = nameInput.value.trim();
      if (!name) {
        alert('テンプレート名を入力してください');
        return;
      }
      await saveTemplate(name);
    });
  }

  if (btnCancel) {
    btnCancel.addEventListener('click', () => {
      hideTemplateNameDialog();
      clearTemplateSelection();
    });
  }

  if (nameInput) {
    nameInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        const name = nameInput.value.trim();
        if (name && templateSelection) {
          await saveTemplate(name);
        }
      } else if (e.key === 'Escape') {
        hideTemplateNameDialog();
        clearTemplateSelection();
      }
    });
  }

  // テンプレートリスト更新ボタン
  const btnRefresh = document.getElementById('btn-refresh-templates');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => refreshTemplateList());
  }

  // 初期ロード
  refreshTemplateList();
}

*/

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  選択範囲の表示/クリア
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/*

function showSelectionOverlay(
  captureImage: HTMLElement,
  x: number, y: number, w: number, h: number
): void {
  let overlay = document.getElementById('template-selection-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'template-selection-overlay';
    overlay.className = 'template-selection-overlay';
    captureImage.parentElement?.style.setProperty('position', 'relative');
    captureImage.parentElement?.appendChild(overlay);
  }
  overlay.style.left = `${x}px`;
  overlay.style.top = `${y}px`;
  overlay.style.width = `${w}px`;
  overlay.style.height = `${h}px`;
  overlay.style.display = 'block';
}

function clearTemplateSelection(): void {
  const overlay = document.getElementById('template-selection-overlay');
  if (overlay) overlay.style.display = 'none';
  templateSelection = null;
}

*/

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  テンプレート名ダイアログ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/*

function showTemplateNameDialog(): void {
  const dialog = document.getElementById('template-name-dialog');
  const nameInput = document.getElementById('template-name-input') as HTMLInputElement;
  const previewCanvas = document.getElementById('template-preview-canvas') as HTMLCanvasElement;

  if (!dialog || !nameInput) return;

  // プレビュー表示
  if (previewCanvas && templateSelection && lastCaptureBase64) {
    drawTemplatePreview(previewCanvas, lastCaptureBase64, templateSelection);
  }

  // 自動命名（template-001, template-002...）
  nameInput.value = `template-${String(Date.now()).slice(-3)}`;
  dialog.style.display = 'flex';
  nameInput.focus();
  nameInput.select();
}

function hideTemplateNameDialog(): void {
  const dialog = document.getElementById('template-name-dialog');
  if (dialog) dialog.style.display = 'none';
}

function drawTemplatePreview(
  canvas: HTMLCanvasElement,
  base64: string,
  region: { x: number; y: number; w: number; h: number }
): void {
  const img = new Image();
  img.onload = () => {
    canvas.width = region.w;
    canvas.height = region.h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, region.x, region.y, region.w, region.h, 0, 0, region.w, region.h);
    }
  };
  img.src = `data:image/png;base64,${base64}`;
}

*/

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  テンプレート保存
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/*

async function saveTemplate(name: string): Promise<void> {
  if (!templateSelection || !lastCaptureBase64) {
    appendLog('エラー: キャプチャデータがありません');
    return;
  }

  try {
    const result = await window.electronAPI.templateCreateFromBase64({
      base64: lastCaptureBase64,
      region: {
        x: templateSelection.x,
        y: templateSelection.y,
        width: templateSelection.w,
        height: templateSelection.h,
      },
      name,
    });

    if (result.success) {
      appendLog(`✓ テンプレート保存: ${result.template.name} (${result.template.width}×${result.template.height})`);
      hideTemplateNameDialog();
      clearTemplateSelection();
      refreshTemplateList();
    } else {
      appendLog(`✗ テンプレート保存失敗: ${result.error}`);
    }
  } catch (err: any) {
    appendLog(`✗ エラー: ${err.message}`);
  }
}

*/

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  テンプレート一覧表示
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/*

async function refreshTemplateList(): Promise<void> {
  const listEl = document.getElementById('template-list');
  if (!listEl) return;

  try {
    const result = await window.electronAPI.templateList();
    if (!result.success || result.templates.length === 0) {
      listEl.innerHTML = '<div class="template-list-empty">テンプレートなし</div>';
      return;
    }

    listEl.innerHTML = '';

    for (const tpl of result.templates) {
      const item = document.createElement('div');
      item.className = 'template-item';
      item.dataset.name = tpl.name;

      // サムネイル取得
      let thumbSrc = '';
      try {
        const preview = await window.electronAPI.templateGetPreview(tpl.name);
        if (preview.success && preview.base64) {
          thumbSrc = `data:image/png;base64,${preview.base64}`;
        }
      } catch { // ignore
      }

      item.innerHTML = `
        <img class="template-thumb" src="${thumbSrc}" alt="${tpl.name}" />
        <div class="template-info">
          <span class="template-name">${tpl.name}</span>
          <span class="template-size">${tpl.width}×${tpl.height}</span>
        </div>
        <div class="template-actions">
          <button class="btn-insert-find" title="find()を挿入">🔍</button>
          <button class="btn-insert-find-click" title="find_click()を挿入">🖱️</button>
          <button class="btn-test-match" title="マッチングテスト">🧪</button>
          <button class="btn-delete-template" title="削除">🗑️</button>
        </div>
      `;

      // イベントバインド
      const name = tpl.name;

      item.querySelector('.btn-insert-find')?.addEventListener('click', () => {
        insertCode(`find("${name}")\nclick(found)`);
      });

      item.querySelector('.btn-insert-find-click')?.addEventListener('click', () => {
        insertCode(`find_click("${name}")`);
      });

      item.querySelector('.btn-test-match')?.addEventListener('click', async () => {
        await testTemplateMatch(name);
      });

      item.querySelector('.btn-delete-template')?.addEventListener('click', async () => {
        if (confirm(`テンプレート "${name}" を削除しますか？`)) {
          const delResult = await window.electronAPI.templateDelete(name);
          if (delResult.success) {
            appendLog(`テンプレート削除: ${name}`);
            refreshTemplateList();
          }
        }
      });

      listEl.appendChild(item);
    }
  } catch (err: any) {
    listEl.innerHTML = `<div class="template-list-empty">読み込みエラー: ${err.message}</div>`;
  }
}

*/

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  コード挿入ヘルパー
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/*

function insertCode(code: string): void {
  // 既存のコードエディタ（textarea等）にコードを挿入
  const editor = document.getElementById('code-editor') as HTMLTextAreaElement | null;
  if (!editor) return;

  const pos = editor.selectionStart;
  const before = editor.value.substring(0, pos);
  const after = editor.value.substring(editor.selectionEnd);

  // 前に改行がなければ追加
  const prefix = before.length > 0 && !before.endsWith('\n') ? '\n' : '';

  editor.value = before + prefix + code + '\n' + after;
  editor.selectionStart = editor.selectionEnd = pos + prefix.length + code.length + 1;
  editor.focus();

  appendLog(`コード挿入: ${code.split('\n')[0]}`);
}

*/

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  マッチングテスト
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/*

async function testTemplateMatch(templateName: string): Promise<void> {
  appendLog(`マッチングテスト開始: "${templateName}"`);

  try {
    // 最新のキャプチャでテスト
    // （screen-capture を呼んで最新のスクリーンショットを取得）
    const captureResult = await window.electronAPI.captureScreen();
    if (!captureResult.success) {
      appendLog('キャプチャ失敗');
      return;
    }

    const matchResult = await window.electronAPI.templateTestMatch({
      screenshotPath: captureResult.path,
      templateName,
    });

    if (matchResult.success && matchResult.result) {
      const r = matchResult.result;
      if (r.found) {
        appendLog(
          `✓ マッチ成功: (${r.centerX}, ${r.centerY}) ` +
          `信頼度: ${(r.confidence * 100).toFixed(1)}%`
        );
        // キャプチャモーダルが開いていれば結果を表示
        showMatchResultOnCapture(r);
      } else {
        appendLog(
          `✗ マッチ失敗: 最高信頼度 ${(r.confidence * 100).toFixed(1)}%`
        );
      }
    } else {
      appendLog(`✗ テストエラー: ${matchResult.error}`);
    }
  } catch (err: any) {
    appendLog(`✗ テストエラー: ${err.message}`);
  }
}

function showMatchResultOnCapture(result: {
  found: boolean; x: number; y: number; width: number; height: number; confidence: number
}): void {
  const captureImage = document.getElementById('capture-image') as HTMLImageElement | null;
  if (!captureImage) return;

  // 既存の結果表示を消す
  document.querySelectorAll('.match-result-overlay').forEach(el => el.remove());

  const rect = captureImage.getBoundingClientRect();
  const scaleX = rect.width / (captureImage.naturalWidth || captureImage.width);
  const scaleY = rect.height / (captureImage.naturalHeight || captureImage.height);

  const overlay = document.createElement('div');
  overlay.className = `match-result-overlay ${result.found ? '' : 'not-found'}`;
  overlay.style.left = `${result.x * scaleX}px`;
  overlay.style.top = `${result.y * scaleY}px`;
  overlay.style.width = `${result.width * scaleX}px`;
  overlay.style.height = `${result.height * scaleY}px`;

  const label = document.createElement('div');
  label.className = 'match-result-label';
  label.textContent = `${(result.confidence * 100).toFixed(1)}%`;
  overlay.appendChild(label);

  captureImage.parentElement?.style.setProperty('position', 'relative');
  captureImage.parentElement?.appendChild(overlay);

  // 5秒後に消す
  setTimeout(() => overlay.remove(), 5000);
}

*/

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  既存のキャプチャ処理への統合ポイント
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/*

// 既存のキャプチャ成功時のコールバック内に追加:
// （キャプチャ画像のBase64データを保持しておく）

  // Phase 4: キャプチャデータをテンプレート作成用に保持
  lastCaptureBase64 = captureResult.base64; // ← captureResult の構造に合わせて調整

*/

export {};
