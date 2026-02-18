/**
 * Rei Automator - Renderer Process
 * UIのイベントハンドリングとElectron APIとの通信
 */

// DOM要素の取得
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

  // ログエリア（あれば）
  logArea: document.getElementById('log-area') as HTMLDivElement | null,

  // 実行コントロール
  btnExecute: document.getElementById('btn-execute') as HTMLButtonElement,
  btnStop: document.getElementById('btn-stop') as HTMLButtonElement,
  btnPause: document.getElementById('btn-pause') as HTMLButtonElement,
  statusText: document.getElementById('status-text') as HTMLSpanElement,
};

// アプリケーション状態
let isExecuting = false;
let isPaused = false;

/**
 * 初期化
 */
function initialize() {
  setupEventListeners();
  setupExecutionListeners();
  console.log('Rei Automator initialized');
}

/**
 * イベントリスナーの設定
 */
function setupEventListeners() {
  // キャプチャボタン（Phase 2）
  elements.btnCapture.addEventListener('click', () => {
    showNotification('キャプチャモードはPhase 2で実装予定です');
  });

  // 座標指定ボタン（Phase 2）
  elements.btnTarget.addEventListener('click', () => {
    showNotification('座標指定モードはPhase 2で実装予定です');
  });

  // スクリプトを開く（ファイルダイアログ）
  elements.btnOpen.addEventListener('click', async () => {
    await loadScriptWithDialog();
  });

  // スクリプトを保存（ファイルダイアログ）
  elements.btnSave.addEventListener('click', async () => {
    await saveScriptWithDialog();
  });

  // コード生成ボタン（Phase 2）
  elements.btnConvert.addEventListener('click', () => {
    showNotification('コード生成機能はPhase 2で実装予定です');
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
}

/**
 * 実行関連のIPCリスナーを設定
 */
function setupExecutionListeners() {
  // ステータス変更
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

  // 実行ログ
  window.electronAPI.onExecutionLog((data) => {
    const prefix = data.level === 'error' ? '❌' : data.level === 'warn' ? '⚠️' : '▸';
    console.log(`${prefix} ${data.message}`);
    appendLog(`${prefix} ${data.message}`, data.level);
  });

  // 行実行通知
  window.electronAPI.onExecutionLine((line: number) => {
    highlightLine(line);
  });

  // 実行完了
  window.electronAPI.onExecutionComplete((result) => {
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

/**
 * Reiコードを実行
 */
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

/**
 * 実行を停止
 */
async function stopExecution() {
  try {
    await window.electronAPI.stopExecution();
    appendLog('⏹ 停止しました', 'info');
  } catch (error) {
    console.error('Stop error:', error);
  }
}

/**
 * 一時停止
 */
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

/**
 * 再開
 */
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

/**
 * ファイルダイアログで保存
 */
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

/**
 * ファイルダイアログで読み込み
 */
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

/**
 * 実行状態を設定
 */
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

/**
 * ステータスを更新
 */
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

/**
 * ログエリアにメッセージを追加
 */
function appendLog(message: string, level: string = 'info') {
  // コンソールに常に出力
  if (level === 'error') {
    console.error(message);
  } else {
    console.log(message);
  }

  // ログエリアがあれば表示
  if (elements.logArea) {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${level}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    elements.logArea.appendChild(entry);
    elements.logArea.scrollTop = elements.logArea.scrollHeight;
  }
}

/**
 * 実行中の行をハイライト（将来的な実装用）
 */
function highlightLine(line: number) {
  // Phase 2でコードエディタにハイライト機能を追加
  console.log(`Executing line: ${line}`);
}

/**
 * 通知を表示
 */
function showNotification(message: string, type: 'info' | 'error' = 'info') {
  if (type === 'error') {
    alert(`エラー: ${message}`);
  } else {
    console.log('Notification:', message);
    // ステータスバーにも表示
    if (!isExecuting) {
      elements.statusText.textContent = message;
    }
  }
}

// 初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
