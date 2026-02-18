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
  
  // キャプチャ
  capturesContainer: document.getElementById('captures-container') as HTMLDivElement,
  
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
  // イベントリスナーの設定
  setupEventListeners();
  
  // 実行状態の監視
  window.electronAPI.onExecutionStatus((status: string) => {
    updateStatus(status);
  });
  
  console.log('Rei Automator initialized');
}

/**
 * イベントリスナーの設定
 */
function setupEventListeners() {
  // キャプチャボタン（Phase 2で実装）
  elements.btnCapture.addEventListener('click', () => {
    console.log('Capture mode - to be implemented in Phase 2');
    showNotification('キャプチャモードはPhase 2で実装予定です');
  });
  
  // 座標指定ボタン（Phase 2で実装）
  elements.btnTarget.addEventListener('click', () => {
    console.log('Target mode - to be implemented in Phase 2');
    showNotification('座標指定モードはPhase 2で実装予定です');
  });
  
  // スクリプトを開く
  elements.btnOpen.addEventListener('click', async () => {
    await loadScript();
  });
  
  // スクリプトを保存
  elements.btnSave.addEventListener('click', async () => {
    await saveScript();
  });
  
  // コード生成ボタン（Phase 2で実装）
  elements.btnConvert.addEventListener('click', () => {
    console.log('Code generation - to be implemented in Phase 2');
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
  
  // 一時停止ボタン（Phase 2で実装）
  elements.btnPause.addEventListener('click', () => {
    console.log('Pause - to be implemented in Phase 2');
    showNotification('一時停止機能はPhase 2で実装予定です');
  });
  
  // Reiコードエリアの変更監視
  elements.reiCode.addEventListener('input', () => {
    // コードが空でなければ実行ボタンを有効化
    elements.btnExecute.disabled = elements.reiCode.value.trim() === '';
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
    // UIを実行中状態に
    setExecutionState(true);
    updateStatus('実行中', 'running');
    
    // メインプロセスにコード実行を要求
    const result = await window.electronAPI.executeCode(code);
    
    if (result.success) {
      showNotification('コードの実行を開始しました');
    } else {
      showNotification(result.message || '実行に失敗しました', 'error');
      setExecutionState(false);
      updateStatus('待機中');
    }
  } catch (error) {
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
    const result = await window.electronAPI.stopExecution();
    
    if (result.success) {
      setExecutionState(false);
      updateStatus('停止しました');
      showNotification('実行を停止しました');
    }
  } catch (error) {
    console.error('Stop error:', error);
    showNotification('停止に失敗しました', 'error');
  }
}

/**
 * スクリプトを保存
 */
async function saveScript() {
  const code = elements.reiCode.value;
  
  if (!code.trim()) {
    showNotification('保存するコードがありません', 'error');
    return;
  }
  
  // ファイル名をプロンプトで取得（簡易実装）
  const filename = prompt('ファイル名を入力してください（拡張子なし）:', 'script');
  
  if (!filename) {
    return;
  }
  
  try {
    const result = await window.electronAPI.saveScript(filename, code);
    
    if (result.success) {
      showNotification(`スクリプトを保存しました: ${result.path}`);
    }
  } catch (error) {
    console.error('Save error:', error);
    showNotification('保存に失敗しました', 'error');
  }
}

/**
 * スクリプトを読み込み
 */
async function loadScript() {
  // ファイル名をプロンプトで取得（簡易実装）
  const filename = prompt('読み込むファイル名を入力してください（拡張子なし）:', 'script');
  
  if (!filename) {
    return;
  }
  
  try {
    const result = await window.electronAPI.loadScript(filename);
    
    if (result.success && result.code) {
      elements.reiCode.value = result.code;
      showNotification('スクリプトを読み込みました');
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
  
  // UIの有効/無効を切り替え
  elements.btnExecute.disabled = executing;
  elements.btnStop.disabled = !executing;
  elements.reiCode.disabled = executing;
  elements.btnOpen.disabled = executing;
  elements.btnSave.disabled = executing;
}

/**
 * ステータスを更新
 */
function updateStatus(text: string, type: 'normal' | 'running' | 'error' = 'normal') {
  elements.statusText.textContent = text;
  elements.statusText.className = 'status-text';
  
  if (type === 'running') {
    elements.statusText.classList.add('running');
  } else if (type === 'error') {
    elements.statusText.classList.add('error');
  }
}

/**
 * 通知を表示（簡易実装）
 */
function showNotification(message: string, type: 'info' | 'error' = 'info') {
  // Phase 1では単純なalertで実装
  // Phase 2以降でトースト通知に置き換え
  if (type === 'error') {
    alert(`エラー: ${message}`);
  } else {
    console.log('Notification:', message);
  }
}

// DOMContentLoadedでinitialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
