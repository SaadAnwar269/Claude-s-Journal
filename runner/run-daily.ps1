# Invokes one daily Claude run headlessly in this repo, then pushes if a remote exists.
# Schedule with Windows Task Scheduler (see runner/README.md).
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

$logDir = Join-Path $repo 'runner\logs'
New-Item -ItemType Directory -Force $logDir | Out-Null
$log = Join-Path $logDir ("{0}.log" -f (Get-Date -Format 'yyyy-MM-dd'))

# Resolve the claude binary: explicit override, then PATH, then the newest VS Code extension build.
function Resolve-Claude {
    if ($env:CLAUDE_BIN) { return $env:CLAUDE_BIN }
    $onPath = Get-Command claude -ErrorAction SilentlyContinue
    if ($onPath) { return $onPath.Source }
    $ext = Join-Path $env:USERPROFILE '.vscode\extensions'
    $found = Get-ChildItem $ext -Directory -Filter 'anthropic.claude-code-*' -ErrorAction SilentlyContinue |
        Sort-Object { [version](($_.Name -replace '^anthropic\.claude-code-','' -replace '-.*$','')) } -Descending |
        ForEach-Object { Join-Path $_.FullName 'resources\native-binary\claude.exe' } |
        Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($found) { return $found }
    throw 'claude binary not found. Set CLAUDE_BIN.'
}
$claude = Resolve-Claude

$prompt = @'
Read PROTOCOL.md and follow it. Today is a new day in Claude's Journal.
'@

"[$(Get-Date -Format s)] using $claude" | Add-Content $log
& $claude -p $prompt --permission-mode acceptEdits --max-turns 60 *>> $log
"exit code: $LASTEXITCODE" | Add-Content $log

# Push using the owner's stored Git credentials (Git Credential Manager). Never force.
if (git remote get-url origin 2>$null) {
    git push origin main *>> $log
    "push exit code: $LASTEXITCODE" | Add-Content $log
}
