#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [ -x "./venv/bin/python" ]; then
  ./venv/bin/python ./run_local.py
elif [ -x "./venv/Scripts/python.exe" ]; then
  ./venv/Scripts/python.exe ./run_local.py
elif command -v python3 >/dev/null 2>&1; then
  python3 ./run_local.py
else
  python ./run_local.py
fi
