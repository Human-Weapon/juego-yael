"""AgentBench target: execute one deterministic Protocol Omega verification script."""

from __future__ import annotations

import json
import subprocess
import sys


SCRIPTS = {
    "physics": "test-physics.js",
    "levels": "test-level-variety.js",
    "ai": "test-ai-personality.js",
    "combat": "test-combat-regressions.js",
    "roster": "test-roster-and-hazards.js",
    "arsenal": "test-arsenal.js",
}


def main() -> int:
    try:
        payload = json.loads(sys.stdin.read() or "{}")
    except json.JSONDecodeError:
        payload = {}
    case = payload.get("case") or {}
    script = SCRIPTS.get(case.get("id"))
    if not script:
        print("Unknown benchmark case", file=sys.stderr)
        return 2
    completed = subprocess.run(
        ["node", script],
        text=True,
        encoding="utf-8",
        errors="replace",
        capture_output=True,
        check=False,
    )
    sys.stdout.write(completed.stdout)
    sys.stderr.write(completed.stderr)
    return completed.returncode


if __name__ == "__main__":
    raise SystemExit(main())
