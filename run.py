#!/usr/bin/env python3
"""AgentTower Unified Orchestration & Run Script

One entrypoint to install, seed, test, start backend + frontend, and reset.
Cross-platform: Windows, macOS, Linux compatible using pathlib and standard Python.
"""
from __future__ import annotations
import os
import sys
import time
import argparse
import subprocess
import signal
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"


def run_cmd(cmd: list[str], cwd: Path | None = None, check: bool = True) -> int:
    display_cmd = " ".join(cmd)
    print(f"\n[Run] Executing: {display_cmd} (in {cwd or ROOT_DIR})")
    res = subprocess.run(cmd, cwd=str(cwd or ROOT_DIR))
    if check and res.returncode != 0:
        print(f"[Run] Command failed with exit code {res.returncode}")
        sys.exit(res.returncode)
    return res.returncode


def cmd_install():
    print("=== Installing AgentTower Dependencies ===")
    run_cmd([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
    if FRONTEND_DIR.exists() and (FRONTEND_DIR / "package.json").exists():
        run_cmd(["npm", "install"], cwd=FRONTEND_DIR)
    print("=== Installation Complete ===")


def cmd_seed():
    print("=== Seeding AgentTower Clean Baseline State (~30 Agent Runs) ===")
    run_cmd([sys.executable, "scripts/seed.py"])


def cmd_test():
    print("=== Running Backend PyTest Suite ===")
    run_cmd([sys.executable, "-m", "pytest", "backend/tests", "-v"])


def cmd_evaluate():
    print("=== Running Autonomous Evaluation Harness (V1..V8) ===")
    run_cmd([sys.executable, "scripts/evaluate.py"])


def cmd_reset():
    print("=== Resetting AgentTower Demo State (<10s) ===")
    start_t = time.time()
    from scripts.seed import run_seed
    run_seed()
    elapsed = round(time.time() - start_t, 2)
    print(f"=== Reset Complete in {elapsed}s (Target: <10s) ===")


def cmd_start():
    print("=== Starting AgentTower Prototype (Backend + Frontend) ===")
    # 1. Check if DB exists; if not, initialize and seed
    db_file = ROOT_DIR / "agenttower.sqlite"
    if not db_file.exists():
        print("Database not found. Seeding initial baseline...")
        cmd_seed()

    # 2. Launch Backend via uvicorn
    backend_port = os.getenv("AGENTTOWER_PORT", "8001")
    frontend_port = os.getenv("FRONTEND_PORT", "3000")
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", backend_port, "--reload"],
        cwd=str(ROOT_DIR)
    )

    # 3. Launch Frontend if present
    frontend_proc = None
    if FRONTEND_DIR.exists() and (FRONTEND_DIR / "package.json").exists():
        frontend_proc = subprocess.Popen(
            ["node", "node_modules/next/dist/bin/next", "dev", "-p", frontend_port],
            cwd=str(FRONTEND_DIR)
        )

    print("\n" + "=" * 60)
    print("AgentTower Prototype Running:")
    print(f"  - Backend API & SSE: http://127.0.0.1:{backend_port}")
    print(f"  - API Documentation: http://127.0.0.1:{backend_port}/docs")
    if frontend_proc:
        print(f"  - Frontend Console:  http://localhost:{frontend_port}")
    print("Press Ctrl+C to terminate services gracefully.")
    print("=" * 60 + "\n")

    def handle_sigint(sig, frame):
        print("\nShutting down AgentTower...")
        backend_proc.terminate()
        if frontend_proc:
            frontend_proc.terminate()
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_sigint)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        handle_sigint(None, None)


def main():
    parser = argparse.ArgumentParser(description="AgentTower Prototype CLI")
    parser.add_argument("--install", action="store_true", help="Install Python and npm dependencies")
    parser.add_argument("--seed", action="store_true", help="Execute real agent baseline seeder")
    parser.add_argument("--test", action="store_true", help="Run automated test suite")
    parser.add_argument("--evaluate", action="store_true", help="Run V1..V8 evaluation harness")
    parser.add_argument("--reset", action="store_true", help="Fast reset to clean demo state (<10s)")
    parser.add_argument("--start", action="store_true", help="Start backend and frontend services")
    args = parser.parse_args()

    if args.install:
        cmd_install()
    elif args.seed:
        cmd_seed()
    elif args.test:
        cmd_test()
    elif args.evaluate:
        cmd_evaluate()
    elif args.reset:
        cmd_reset()
    elif args.start or len(sys.argv) == 1:
        cmd_start()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
