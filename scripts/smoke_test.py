from __future__ import annotations
import os
import sys
import time
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT_DIR / "frontend"
SCREENSHOTS_DIR = ROOT_DIR / "docs" / "screenshots"
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)


def run_smoke_test():
    print("=" * 60)
    print("AgentTower Playwright Smoke Test & Visual Documentation")
    print("=" * 60)

    # 1. Reset & Seed DB to ensure full data is present
    print("[1/4] Ensuring clean seeded database state...")
    subprocess.run([sys.executable, "scripts/seed.py"], cwd=str(ROOT_DIR), check=True)

    # 2. Launch Backend process
    print("[2/4] Starting FastAPI backend on http://127.0.0.1:8000...")
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=str(ROOT_DIR)
    )

    # 3. Launch Frontend process
    print("[3/4] Starting Next.js frontend on http://localhost:3000...")
    frontend_proc = subprocess.Popen(
        ["node", "node_modules/next/dist/bin/next", "start", "-p", "3000"],
        cwd=str(FRONTEND_DIR)
    )

    try:
        # Wait for servers to be up
        time.sleep(4.0)

        pages_to_capture = [
            ("http://localhost:3000/", "01_overview.png", "Overview Dashboard"),
            ("http://localhost:3000/lineage", "02_lineage.png", "Lineage DAG Visualizer"),
            ("http://localhost:3000/incidents", "03_incidents.png", "AEGIS Incidents Management"),
            ("http://localhost:3000/approvals", "04_approvals.png", "Decision Gate Approvals Queue"),
            ("http://localhost:3000/remediation", "05_remediation.png", "Governed Remediation Pipeline"),
            ("http://localhost:3000/cost", "06_cost.png", "Cost Attribution Engine"),
            ("http://localhost:3000/replay", "07_replay.png", "Deterministic Audit & Replay"),
            ("http://localhost:3000/demo", "08_demo_controls.png", "Demo Controls & Fault Injection"),
        ]

        print("\n[4/4] Launching Playwright Chromium headless browser...")
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1920, "height": 1080})

            for url, filename, title in pages_to_capture:
                print(f"  - Navigating to {title} ({url})...")
                page.goto(url, wait_until="networkidle", timeout=15000)
                time.sleep(1.0)
                save_path = SCREENSHOTS_DIR / filename
                page.screenshot(path=str(save_path), full_page=False)
                print(f"    ✓ Screenshot saved: {save_path.name}")

            browser.close()

        print("\n" + "=" * 60)
        print("Smoke Test Passed: All 8 Pages Captured in 1080p Resolution")
        print(f"Screenshots directory: {SCREENSHOTS_DIR}")
        print("=" * 60)

    finally:
        print("\nShutting down smoke test server daemons...")
        backend_proc.terminate()
        frontend_proc.terminate()


if __name__ == "__main__":
    run_smoke_test()

