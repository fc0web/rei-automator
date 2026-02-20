// サンプル: メモ帳にカーソルなしでテキスト入力
// 前提: メモ帳が開いている状態で実行
win_list()
wait(1s)
window("メモ帳"):
  type("=== Rei Automator カーソルなし実行テスト ===")
  key("Enter")
  key("Enter")
  type("このテキストはカーソルを動かさずに入力されました。")
  key("Enter")
  type("VPS上でRDP切断後も動作します。")
  key("Enter")
  key("Enter")
  type("--- 入力完了 ---")
