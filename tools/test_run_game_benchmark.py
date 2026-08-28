"""Smoke test for the AgentBench bridge used by this project."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "tools" / "run_game_benchmark.py"


def run(payload: dict[str, object]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(TARGET)],
        input=json.dumps(payload),
        text=True,
        encoding="utf-8",
        errors="replace",
        capture_output=True,
        cwd=ROOT,
        check=False,
    )


def main() -> int:
    valid = run({"case": {"id": "combat"}})
    if valid.returncode != 0 or "COMBAT REGRESSION CHECK PASSED" not in valid.stdout:
        print(valid.stdout)
        print(valid.stderr, file=sys.stderr)
        return 1
    invalid = run({"case": {"id": "does-not-exist"}})
    if invalid.returncode != 2:
        print("El puente no rechaza casos desconocidos", file=sys.stderr)
        return 1
    print("AGENTBENCH TARGET TEST PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
