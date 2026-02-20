# ═══════════════════════════════════════════════════════
# Rei Automator — リモートクライアント サンプル
# Phase 9b: REST API経由でタスクを送信
#
# 使い方:
#   .\remote-client.ps1 -Action run -Code 'click(100, 200)'
#   .\remote-client.ps1 -Action run -File "my-task.rei"
#   .\remote-client.ps1 -Action status
#   .\remote-client.ps1 -Action tasks
#   .\remote-client.ps1 -Action logs
# ═══════════════════════════════════════════════════════

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("run", "status", "tasks", "logs", "schedule")]
    [string]$Action,

    [string]$Code = "",
    [string]$File = "",
    [string]$Name = "remote-task",
    [string]$Schedule = "",
    [string]$Host = "http://localhost:19720",
    [string]$ApiKey = ""
)

# ─── APIキー読み込み ──────────────────────────────
if (-not $ApiKey) {
    $keyFile = ".\rei-api-keys.json"
    if (Test-Path $keyFile) {
        $keys = Get-Content $keyFile | ConvertFrom-Json
        if ($keys.keys.Count -gt 0) {
            $ApiKey = $keys.keys[0].key
            Write-Host "Using API key: $($ApiKey.Substring(0,8))..." -ForegroundColor DarkGray
        }
    }
}

$headers = @{ "Content-Type" = "application/json" }
if ($ApiKey) {
    $headers["Authorization"] = "Bearer $ApiKey"
}

# ─── アクション ───────────────────────────────────

switch ($Action) {
    "run" {
        if (-not $Code -and -not $File) {
            Write-Host "Error: -Code or -File is required" -ForegroundColor Red
            exit 1
        }

        $body = @{ name = $Name }
        if ($Code) { $body.code = $Code }
        if ($File) { $body.file = $File }

        Write-Host "Sending task: $Name ..." -ForegroundColor Cyan
        try {
            $response = Invoke-RestMethod -Uri "$Host/api/tasks/run" `
                -Method POST -Headers $headers `
                -Body ($body | ConvertTo-Json) -ErrorAction Stop
            Write-Host "Task queued: $($response.taskId)" -ForegroundColor Green
        } catch {
            Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }

    "schedule" {
        if (-not $Schedule) {
            Write-Host "Error: -Schedule is required (e.g., 'every 30m')" -ForegroundColor Red
            exit 1
        }
        if (-not $Code -and -not $File) {
            Write-Host "Error: -Code or -File is required" -ForegroundColor Red
            exit 1
        }

        $body = @{ schedule = $Schedule; name = $Name }
        if ($Code) { $body.code = $Code }
        if ($File) { $body.file = $File }

        Write-Host "Scheduling task: $Name ($Schedule) ..." -ForegroundColor Cyan
        try {
            $response = Invoke-RestMethod -Uri "$Host/api/tasks/schedule" `
                -Method POST -Headers $headers `
                -Body ($body | ConvertTo-Json) -ErrorAction Stop
            Write-Host "Scheduled: $($response.message)" -ForegroundColor Green
        } catch {
            Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }

    "status" {
        try {
            $health = Invoke-RestMethod -Uri "$Host/health" -Method GET -ErrorAction Stop
            Write-Host "Daemon Status" -ForegroundColor Cyan
            Write-Host "  OK:         $($health.ok)"
            Write-Host "  Uptime:     $($health.uptime)s"
            Write-Host "  Tasks:      $($health.activeTasks) active, $($health.completedTasks) completed"
            Write-Host "  Errors:     $($health.errorTasks)"
            Write-Host "  Memory:     $([math]::Round($health.memoryMB, 1)) MB"
            Write-Host "  PID:        $($health.pid)"
            Write-Host "  WS Clients: $($health.wsClients)"
        } catch {
            Write-Host "Daemon is not running" -ForegroundColor Red
        }
    }

    "tasks" {
        try {
            $result = Invoke-RestMethod -Uri "$Host/api/tasks" `
                -Method GET -Headers $headers -ErrorAction Stop

            if ($result.count -eq 0) {
                Write-Host "No tasks registered" -ForegroundColor Yellow
            } else {
                Write-Host "Tasks ($($result.count)):" -ForegroundColor Cyan
                foreach ($task in $result.tasks) {
                    $status = if ($task.running) { "RUNNING" } else { "idle" }
                    $color = if ($task.running) { "Green" } else { "Gray" }
                    Write-Host "  [$status] $($task.name)" -ForegroundColor $color
                    if ($task.schedule) {
                        Write-Host "           Schedule: $($task.schedule)" -ForegroundColor DarkGray
                    }
                    if ($task.lastRun) {
                        Write-Host "           Last run: $($task.lastRun) ($($task.lastResult))" -ForegroundColor DarkGray
                    }
                }
            }
        } catch {
            Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }

    "logs" {
        try {
            $result = Invoke-RestMethod -Uri "$Host/api/logs?limit=20" `
                -Method GET -Headers $headers -ErrorAction Stop

            if ($result.count -eq 0) {
                Write-Host "No logs" -ForegroundColor Yellow
            } else {
                Write-Host "Recent Logs ($($result.count)):" -ForegroundColor Cyan
                foreach ($log in $result.logs) {
                    $color = switch ($log.level) {
                        "error" { "Red" }
                        "warn"  { "Yellow" }
                        "info"  { "White" }
                        default { "Gray" }
                    }
                    $time = $log.timestamp.Substring(11, 8)
                    Write-Host "  [$time] $($log.level.ToUpper().PadRight(5)) $($log.message)" -ForegroundColor $color
                }
            }
        } catch {
            Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}
