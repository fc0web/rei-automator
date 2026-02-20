// @schedule every 30m
// VPSヘルスモニタリング — 30分ごとにシステム状態をログ
// Phase 9a サンプル: デーモンの @schedule ディレクティブ

log("=== VPS Health Check ===")
log("Time: " + now())

// メモ帳にログを追記（カーソルなし方式）
win_activate("health-log.txt")
win_key("health-log.txt", "End")
win_key("health-log.txt", "Enter")
win_type("health-log.txt", now() + " - System OK")
win_shortcut("health-log.txt", "Ctrl+S")

log("Health check completed")
