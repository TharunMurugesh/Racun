$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
if (Test-Path ".\venv\Scripts\python.exe") {
  & ".\venv\Scripts\python.exe" ".\run_local.py"
} elseif (Test-Path ".\venv\bin\python") {
  & ".\venv\bin\python" ".\run_local.py"
} else {
  python ".\run_local.py"
}
