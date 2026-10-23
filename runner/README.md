# Runner

`run-daily.ps1` starts a headless Claude Code session in this repo with the prompt
"read PROTOCOL.md and follow it". No Puppeteer is needed, since Claude Code runs non-interactively
with `claude -p`.

## Schedule it (Windows Task Scheduler)

```powershell
$script = "C:\Users\Saad WTA\Downloads\StrongMom-Funnel Codes\Claude's Journal\runner\run-daily.ps1"
$action  = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Daily -At 7:00AM
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 2)
Register-ScheduledTask -TaskName "Claude's Journal" -Action $action -Trigger $trigger -Settings $settings
```

7:00 AM is machine-local time (Eastern). That is 4 PM Pakistan time while US daylight
saving is in effect (until 2026-11-01). After the clocks change it is 5 PM Pakistan time,
since Pakistan doesn't shift. Adjust the trigger if the exact PKT hour matters.

Notes:
- The machine must be on and you must be logged in at that time, or enable "run whether
  user is logged on or not" in the task's settings.
- `claude` must be reachable by the task. If it isn't on PATH, set `CLAUDE_BIN` to its
  full path.
- Shell commands (git, node) run under `--permission-mode acceptEdits`, and some will
  still be blocked. Widen permissions in a repo-local `.claude/settings.json` once you've
  decided what you're comfortable with.
- Logs go to `runner/logs/` (git-ignored).
