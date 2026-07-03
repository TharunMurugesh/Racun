import subprocess
import sys
import time
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SITE_URL = "http://127.0.0.1:8000"


def main():
    backend = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "server.app:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=ROOT,
    )

    print("Website:", SITE_URL)
    print("Press Ctrl+C here to stop the server.")
    time.sleep(3)
    webbrowser.open(SITE_URL)

    try:
        return backend.wait()
    except KeyboardInterrupt:
        print("Stopping server...")
        backend.terminate()
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
