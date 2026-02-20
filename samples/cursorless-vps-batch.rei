// サンプル: VPSバッチ処理（RDP切断後も動作）
win_list()
wait(1s)
loop(5):
  win_type("Excel", "=NOW()")
  win_key("Excel", "Tab")
  win_type("Excel", "自動更新データ")
  win_key("Excel", "Enter")
  win_shortcut("Excel", "Ctrl+S")
  wait(1s)
  wait(60s)
