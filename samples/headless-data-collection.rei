// @schedule every 1h
// 1時間ごとのデータ収集タスク
// Phase 9a サンプル: VPS上での定期バッチ処理

log("=== Hourly Data Collection ===")

// ブラウザでデータ取得
window("データダッシュボード"):
  win_shortcut("データダッシュボード", "F5")   // リロード
  wait(3000)
  win_shortcut("データダッシュボード", "Ctrl+A")  // 全選択
  win_shortcut("データダッシュボード", "Ctrl+C")  // コピー

// エクセルに貼り付け
window("collection.xlsx"):
  win_shortcut("collection.xlsx", "Ctrl+End")   // 末尾に移動
  win_key("collection.xlsx", "Enter")
  win_shortcut("collection.xlsx", "Ctrl+V")     // 貼り付け
  win_shortcut("collection.xlsx", "Ctrl+S")     // 保存

log("Data collection completed")
