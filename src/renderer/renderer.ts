/**
 * Rei Automator - Renderer Process
 * UIのイベントハンドリングとElectron APIとの通信
 * Phase 3: 画面キャプチャ・座標指定モード追加
 */

// ========== DOM要素 ==========

const elements = {
  // ツールバー
  btnCapture: document.getElementById('btn-capture') as HTMLButtonElement,
  btnTarget: document.getElementById('btn-target') as HTMLButtonElement,
  btnOpen: document.getElementById('btn-open') as HTMLButtonElement,
  btnSave: document.getElementById('btn-save') as HTMLButtonElement,

  // 日本語入力
  japaneseInput: document.getElementById('japanese-input') as HTMLTextAreaElement,
  btnConvert: document.getElementById('btn-convert') as HTMLButtonElement,

  // Reiコード
  reiCode: document.getElementById('rei-code') as HTMLTextAreaElement,

  // ログエリア
  logArea: document.getElementById('log-area') as HTMLDivElement | null,

  // 実行コントロール
  btnExecute: document.getElementById('btn-execute') as HTMLButtonElement,
  btnStop: document.getElementById('btn-stop') as HTMLButtonElement,
  btnPause: document.getElementById('btn-pause') as HTMLButtonElement,
  statusText: document.getElementById('status-text') as HTMLSpanElement,

  // キャプチャオーバーレイ
  captureOverlay: document.getElementById('capture-overlay') as HTMLDivElement,
  captureModalTitle: document.getElementById('capture-modal-title') as HTMLHeadingElement,
  btnCaptureNew: document.getElementById('btn-capture-new') as HTMLButtonElement,
  btnCaptureClose: document.getElementById('btn-capture-close') as HTMLButtonElement,
  captureCommandType: document.getElementById('capture-command-type') as HTMLSelectElement,
  captureCoords: document.getElementById('capture-coords') as HTMLSpanElement,
  captureLoading: document.getElementById('capture-loading') as HTMLDivElement,
  captureEmpty: document.getElementById('capture-empty') as HTMLDivElement,
  captureCanvas: document.getElementById('capture-canvas') as HTMLCanvasElement,
  captureImageContainer: document.getElementById('capture-image-container') as HTMLDivElement,
  captureMarkers: document.getElementById('capture-markers') as HTMLDivElement,
  captureHistoryList: document.getElementById('capture-history-list') as HTMLDivElement,
  btnInsertCoords: document.getElementById('btn-insert-coords') as HTMLButtonElement,
  btnClearCoords: document.getElementById('btn-clear-coords') as HTMLButtonElement,
};

// ========== 状態管理 ==========

let isExecuting = false;
let isPaused = false;

// キャプチャ関連の状態
interface CapturePoint {
  x: number;
  y: number;
  command: string;
}

let captureImage: HTMLImageElement | null = null;
let captureScale = 1;
let capturedPoints: CapturePoint[] = [];
let screenWidth = 0;
let screenHeight = 0;

// ========== 初期化 ==========

function initialize() {
  setupEventListeners();
  setupExecutionListeners();
  setupCaptureListeners();
  console.log('Rei Automator v0.3 initialized');
}

// ========== イベントリスナー ==========

function setupEventListeners() {
  // キャプチャボタン
  elements.btnCapture.addEventListener('click', async () => {
    openCaptureModal();
    await performCapture();
  });

  // 座標指定ボタン（キャプチャモーダルを開く）
  elements.btnTarget.addEventListener('click', () => {
    openCaptureModal();
    // 既にキャプチャがあればそのまま表示、なければメッセージ
    if (!captureImage) {
      elements.captureEmpty.style.display = 'flex';
    }
  });

  // スクリプトを開く
  elements.btnOpen.addEventListener('click', async () => {
    await loadScriptWithDialog();
  });

  // スクリプトを保存
  elements.btnSave.addEventListener('click', async () => {
    await saveScriptWithDialog();
  });

  // コード生成ボタン
  elements.btnConvert.addEventListener('click', async () => {
    await convertJapaneseToCode();
  });

  // 実行ボタン
  elements.btnExecute.addEventListener('click', async () => {
    await executeCode();
  });

  // 停止ボタン
  elements.btnStop.addEventListener('click', async () => {
    await stopExecution();
  });

  // 一時停止/再開ボタン
  elements.btnPause.addEventListener('click', async () => {
    if (isPaused) {
      await resumeExecution();
    } else {
      await pauseExecution();
    }
  });

  // Reiコードエリアの変更監視
  elements.reiCode.addEventListener('input', () => {
    elements.btnExecute.disabled = elements.reiCode.value.trim() === '';
  });

  // 日本語入力エリアの変更監視
  elements.japaneseInput.addEventListener('input', () => {
    elements.btnConvert.disabled = elements.japaneseInput.value.trim() === '';
  });
}

// ========== キャプチャ関連リスナー ==========

function setupCaptureListeners() {
  // 再キャプチャ
  elements.btnCaptureNew.addEventListener('click', async () => {
    await performCapture();
  });

  // モーダルを閉じる
  elements.btnCaptureClose.addEventListener('click', () => {
    closeCaptureModal();
  });

  // オーバーレイ背景クリックで閉じる
  elements.captureOverlay.addEventListener('click', (e) => {
    if (e.target === elements.captureOverlay) {
      closeCaptureModal();
    }
  });

  // キャンバスクリックで座標取得
  elements.captureCanvas.addEventListener('click', (e) => {
    handleCanvasClick(e);
  });

  // キャンバスマウス移動で座標表示
  elements.captureCanvas.addEventListener('mousemove', (e) => {
    handleCanvasMouseMove(e);
  });

  // キャンバスマウスアウト
  elements.captureCanvas.addEventListener('mouseleave', () => {
    elements.captureCoords.textContent = '座標: ---';
  });

  // コードに挿入
  elements.btnInsertCoords.addEventListener('click', () => {
    insertCoordsToCode();
  });

  // 座標クリア
  elements.btnClearCoords.addEventListener('click', () => {
    clearCapturedPoints();
  });

  // ESCキーでモーダルを閉じる
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elements.captureOverlay.style.display !== 'none') {
      closeCaptureModal();
    }
  });
}

// ========== キャプチャモーダル操作 ==========

function openCaptureModal() {
  elements.captureOverlay.style.display = 'flex';
}

function closeCaptureModal() {
  elements.captureOverlay.style.display = 'none';
}

/**
 * 画面キャプチャを実行
 */
async function performCapture() {
  elements.captureLoading.style.display = 'flex';
  elements.captureEmpty.style.display = 'none';
  elements.captureCanvas.style.display = 'none';

  try {
    const result = await window.electronAPI.captureScreen();

    if (result.success && result.imageData) {
      screenWidth = result.width || 1920;
      screenHeight = result.height || 1080;

      // 画像を読み込み
      const img = new Image();
      img.onload = () => {
        captureImage = img;
        drawCaptureImage();
        elements.captureLoading.style.display = 'none';
        elements.captureCanvas.style.display = 'block';
        appendLog('📷 画面キャプチャ完了', 'info');
      };
      img.onerror = () => {
        elements.captureLoading.style.display = 'none';
        elements.captureEmpty.style.display = 'flex';
        elements.captureEmpty.textContent = 'キャプチャ画像の読み込みに失敗しました';
        appendLog('❌ キャプチャ画像読み込み失敗', 'error');
      };
      img.src = `data:image/png;base64,${result.imageData}`;
    } else {
      elements.captureLoading.style.display = 'none';
      elements.captureEmpty.style.display = 'flex';
      elements.captureEmpty.textContent = result.error || 'キャプチャに失敗しました';
      appendLog(`❌ キャプチャ失敗: ${result.error}`, 'error');
    }
  } catch (error: any) {
    elements.captureLoading.style.display = 'none';
    elements.captureEmpty.style.display = 'flex';
    elements.captureEmpty.textContent = 'キャプチャエラー';
    appendLog(`❌ キャプチャエラー: ${error.message}`, 'error');
  }
}

/**
 * キャプチャ画像をキャンバスに描画
 */
function drawCaptureImage() {
  if (!captureImage) return;

  const canvas = elements.captureCanvas;
  const container = elements.captureImageContainer;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // コンテナサイズに合わせてスケーリング
  const containerWidth = container.clientWidth - 4; // border分
  const scale = containerWidth / captureImage.width;
  captureScale = scale;

  canvas.width = Math.floor(captureImage.width * scale);
  canvas.height = Math.floor(captureImage.height * scale);

  ctx.drawImage(captureImage, 0, 0, canvas.width, canvas.height);

  // 既存マーカーを再描画
  redrawMarkers();
}

/**
 * キャンバスクリックで座標取得
 */
function handleCanvasClick(e: MouseEvent) {
  if (!captureImage) return;

  const canvas = elements.captureCanvas;
  const rect = canvas.getBoundingClientRect();

  // キャンバス上の座標
  const canvasX = e.clientX - rect.left;
  const canvasY = e.clientY - rect.top;

  // 実際の画面座標に変換
  const realX = Math.round(canvasX / captureScale);
  const realY = Math.round(canvasY / captureScale);

  // 画面範囲内かチェック
  if (realX < 0 || realY < 0 || realX > screenWidth || realY > screenHeight) return;

  const command = elements.captureCommandType.value;
  const point: CapturePoint = { x: realX, y: realY, command };
  capturedPoints.push(point);

  // マーカーを追加
  addMarker(canvasX, canvasY, capturedPoints.length, command);

  // 履歴を更新
  updateCaptureHistory();

  appendLog(`🎯 座標選択: ${command}(${realX}, ${realY})`, 'info');
}

/**
 * マウス移動で座標をリアルタイム表示
 */
function handleCanvasMouseMove(e: MouseEvent) {
  if (!captureImage) return;

  const canvas = elements.captureCanvas;
  const rect = canvas.getBoundingClientRect();
  const canvasX = e.clientX - rect.left;
  const canvasY = e.clientY - rect.top;

  const realX = Math.round(canvasX / captureScale);
  const realY = Math.round(canvasY / captureScale);

  elements.captureCoords.textContent = `座標: (${realX}, ${realY})`;
}

/**
 * マーカーを表示
 */
function addMarker(canvasX: number, canvasY: number, index: number, command: string) {
  const marker = document.createElement('div');
  marker.className = 'capture-marker';
  marker.style.left = `${canvasX}px`;
  marker.style.top = `${canvasY}px`;
  marker.textContent = String(index);
  marker.title = `${command} #${index}`;
  elements.captureMarkers.appendChild(marker);
}

/**
 * マーカーを全て再描画
 */
function redrawMarkers() {
  elements.captureMarkers.innerHTML = '';
  capturedPoints.forEach((point, i) => {
    const canvasX = point.x * captureScale;
    const canvasY = point.y * captureScale;
    addMarker(canvasX, canvasY, i + 1, point.command);
  });
}

/**
 * キャプチャ座標履歴を更新
 */
function updateCaptureHistory() {
  const list = elements.captureHistoryList;
  list.innerHTML = '';

  if (capturedPoints.length === 0) {
    list.innerHTML = '<span class="capture-history-empty">画像をクリックして座標を選択してください</span>';
    elements.btnInsertCoords.disabled = true;
    elements.btnClearCoords.disabled = true;
    return;
  }

  capturedPoints.forEach((point, i) => {
    const item = document.createElement('span');
    item.className = 'capture-history-item';
    item.textContent = `#${i + 1} ${point.command}(${point.x}, ${point.y})`;
    item.title = 'クリックで削除';
    item.addEventListener('click', () => {
      capturedPoints.splice(i, 1);
      redrawMarkers();
      updateCaptureHistory();
    });
    list.appendChild(item);
  });

  elements.btnInsertCoords.disabled = false;
  elements.btnClearCoords.disabled = false;
}

/**
 * 選択した座標をReiコードに挿入
 */
function insertCoordsToCode() {
  if (capturedPoints.length === 0) return;

  const codeLines = capturedPoints.map(
    (p) => `${p.command}(${p.x}, ${p.y})`
  );
  const code = codeLines.join('\n');

  const existingCode = elements.reiCode.value.trim();
  if (existingCode) {
    elements.reiCode.value = existingCode + '\n' + code;
  } else {
    elements.reiCode.value = code;
  }

  elements.btnExecute.disabled = false;
  appendLog(`📋 ${capturedPoints.length}個の座標をコードに挿入`, 'info');

  // 挿入後にモーダルを閉じる
  closeCaptureModal();
}

/**
 * 座標履歴をクリア
 */
function clearCapturedPoints() {
  capturedPoints = [];
  elements.captureMarkers.innerHTML = '';
  updateCaptureHistory();
}

// ========== 実行関連リスナー ==========

function setupExecutionListeners() {
  window.electronAPI.onExecutionStatus((status: string) => {
    updateStatus(status);
    switch (status) {
      case 'running':
        setExecutionState(true);
        break;
      case 'paused':
        isPaused = true;
        elements.btnPause.textContent = '▶ 再開';
        break;
      case 'completed':
      case 'stopped':
      case 'error':
        setExecutionState(false);
        break;
    }
  });

  window.electronAPI.onExecutionLog((data: any) => {
    const prefix = data.level === 'error' ? '❌' : data.level === 'warn' ? '⚠️' : '▸';
    console.log(`${prefix} ${data.message}`);
    appendLog(`${prefix} ${data.message}`, data.level);
  });

  window.electronAPI.onExecutionLine((line: number) => {
    highlightLine(line);
  });

  window.electronAPI.onExecutionComplete((result: any) => {
    setExecutionState(false);
    if (result.success) {
      const msg = result.message || `完了 (${result.executedLines}コマンド, ${result.totalTime}ms)`;
      updateStatus(msg);
      appendLog(`✅ ${msg}`, 'info');
    } else {
      updateStatus('エラー', 'error');
      appendLog(`❌ ${result.error}`, 'error');
      showNotification(result.error || '実行エラー', 'error');
    }
  });
}

// ========== 実行操作 ==========

async function executeCode() {
  const code = elements.reiCode.value.trim();
  if (!code) {
    showNotification('Reiコードを入力してください', 'error');
    return;
  }

  try {
    setExecutionState(true);
    updateStatus('実行中...', 'running');
    appendLog('--- 実行開始 ---', 'info');
    const result = await window.electronAPI.executeCode(code);
    if (!result.success) {
      showNotification(result.error || result.message || '実行に失敗しました', 'error');
      setExecutionState(false);
      updateStatus('エラー', 'error');
    }
  } catch (error: any) {
    console.error('Execution error:', error);
    showNotification('実行エラーが発生しました', 'error');
    setExecutionState(false);
    updateStatus('エラー', 'error');
  }
}

async function stopExecution() {
  try {
    await window.electronAPI.stopExecution();
    appendLog('⏹ 停止しました', 'info');
  } catch (error) {
    console.error('Stop error:', error);
  }
}

async function pauseExecution() {
  try {
    await window.electronAPI.pauseExecution();
    isPaused = true;
    elements.btnPause.textContent = '▶ 再開';
    appendLog('⏸ 一時停止', 'info');
  } catch (error) {
    console.error('Pause error:', error);
  }
}

async function resumeExecution() {
  try {
    await window.electronAPI.resumeExecution();
    isPaused = false;
    elements.btnPause.textContent = '⏸ 一時停止';
    appendLog('▶ 再開', 'info');
  } catch (error) {
    console.error('Resume error:', error);
  }
}

// ========== ファイル操作 ==========

async function saveScriptWithDialog() {
  const code = elements.reiCode.value;
  if (!code.trim()) {
    showNotification('保存するコードがありません', 'error');
    return;
  }
  try {
    const result = await window.electronAPI.saveScriptDialog(code);
    if (result.success) {
      showNotification(`保存しました: ${result.path}`);
    }
  } catch (error) {
    console.error('Save error:', error);
    showNotification('保存に失敗しました', 'error');
  }
}

async function loadScriptWithDialog() {
  try {
    const result = await window.electronAPI.loadScriptDialog();
    if (result.success && result.code) {
      elements.reiCode.value = result.code;
      elements.btnExecute.disabled = false;
      showNotification('読み込みました');
    }
  } catch (error) {
    console.error('Load error:', error);
    showNotification('読み込みに失敗しました', 'error');
  }
}

// ========== 日本語変換 ==========

async function convertJapaneseToCode() {
  const japaneseText = elements.japaneseInput.value.trim();
  if (!japaneseText) {
    showNotification('日本語テキストを入力してください', 'error');
    return;
  }

  try {
    elements.btnConvert.disabled = true;
    elements.btnConvert.textContent = '🔄 変換中...';

    const result = await window.electronAPI.convertJapanese(japaneseText);
    if (result.success && result.code) {
      const existingCode = elements.reiCode.value.trim();
      if (existingCode) {
        elements.reiCode.value = existingCode + '\n\n' + result.code;
      } else {
        elements.reiCode.value = result.code;
      }
      elements.btnExecute.disabled = false;
      appendLog(`✅ 変換完了: ${japaneseText.substring(0, 30)}...`, 'info');
      showNotification('コード生成しました');
    } else {
      showNotification(result.error || '変換に失敗しました', 'error');
      appendLog(`❌ 変換失敗: ${result.error}`, 'error');
    }
  } catch (error: any) {
    console.error('Convert error:', error);
    showNotification('変換エラーが発生しました', 'error');
  } finally {
    elements.btnConvert.disabled = elements.japaneseInput.value.trim() === '';
    elements.btnConvert.textContent = '🔄 コード生成';
  }
}

// ========== UI ヘルパー ==========

function setExecutionState(executing: boolean) {
  isExecuting = executing;
  isPaused = false;
  elements.btnExecute.disabled = executing;
  elements.btnStop.disabled = !executing;
  elements.btnPause.disabled = !executing;
  elements.btnPause.textContent = '⏸ 一時停止';
  elements.reiCode.disabled = executing;
  elements.btnOpen.disabled = executing;
  elements.btnSave.disabled = executing;
}

function updateStatus(text: string, type: 'normal' | 'running' | 'error' = 'normal') {
  const statusMap: Record<string, string> = {
    'running': '実行中',
    'paused': '一時停止中',
    'completed': '完了',
    'stopped': '停止',
    'error': 'エラー',
    'idle': '待機中',
  };
  elements.statusText.textContent = statusMap[text] || text;
  elements.statusText.className = 'status-text';
  if (type === 'running' || text === 'running') {
    elements.statusText.classList.add('running');
  } else if (type === 'error' || text === 'error') {
    elements.statusText.classList.add('error');
  }
}

function appendLog(message: string, level: string = 'info') {
  if (level === 'error') {
    console.error(message);
  } else {
    console.log(message);
  }
  if (elements.logArea) {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${level}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    elements.logArea.appendChild(entry);
    elements.logArea.scrollTop = elements.logArea.scrollHeight;
  }
}

function highlightLine(line: number) {
  console.log(`Executing line: ${line}`);
}

function showNotification(message: string, type: 'info' | 'error' = 'info') {
  if (type === 'error') {
    alert(`エラー: ${message}`);
  } else {
    console.log('Notification:', message);
    if (!isExecuting) {
      elements.statusText.textContent = message;
    }
  }
}

// ========== 起動 ==========

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
