#!/usr/bin/env python3
"""Test adding timer sessions to days other than today."""
import subprocess, sys, os, time, yaml, re, shlex

APP_URL = os.environ.get("APP_URL", "http://localhost:5173")
SNAP = []; SNAP_FILE = None
DEV_SERVER_PID = None


def cli(cmd):
    return subprocess.run(shlex.split(cmd), capture_output=True, text=True, timeout=30).stdout


def start_dev_server():
    global DEV_SERVER_PID
    print("Starting dev server...")
    db_path = "/mnt/md127/todolist-bun/data/pomotasker.db"
    if os.path.exists(db_path):
        os.remove(db_path)
    for suffix in ["-wal", "-shm"]:
        p = db_path + suffix
        if os.path.exists(p):
            os.remove(p)
    p = subprocess.Popen(
        "cd /mnt/md127/todolist-bun && POMO_BASE='' npm run dev",
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    DEV_SERVER_PID = p.pid
    time.sleep(3)


def stop_dev_server():
    global DEV_SERVER_PID
    if DEV_SERVER_PID:
        try:
            os.kill(DEV_SERVER_PID, 15)
        except:
            pass
        time.sleep(1)
    subprocess.run("pkill -f 'vite' 2>/dev/null", shell=True)


def snap():
    global SNAP, SNAP_FILE
    out = cli("playwright-cli snapshot")
    m = re.search(r"\[Snapshot\]\((.+?)\)", out)
    if m:
        SNAP_FILE = m.group(1)
        with open(SNAP_FILE) as f:
            SNAP = yaml.safe_load(f)
    else:
        SNAP_FILE = None; SNAP = []


def find_ref(text):
    def search(node):
        if isinstance(node, dict):
            for k, v in node.items():
                if isinstance(k, str) and text in k:
                    m = re.search(r"ref=(e\d+)", k)
                    if m: return m.group(1)
                r = search(v)
                if r: return r
        elif isinstance(node, list):
            for item in node:
                if isinstance(item, str) and text in item:
                    m = re.search(r"ref=(e\d+)", item)
                    if m: return m.group(1)
                r = search(item)
                if r: return r
        return None
    return search(SNAP)


def get_lines():
    return open(SNAP_FILE).read().split("\n") if SNAP_FILE else []


def get_all_buttons(habit_name):
    """Get all 7 day buttons for a habit. Returns list of (day_label, ref)."""
    lines = get_lines()
    idx = None
    for i, line in enumerate(lines):
        if habit_name in line:
            idx = i; break
    if idx is None: return []
    ni = len(lines[idx]) - len(lines[idx].lstrip())
    ci = ni - 2; cl = None
    for j in range(idx + 1, len(lines)):
        nl = lines[j]; nli = len(nl) - len(nl.lstrip()) if nl.strip() else 999
        if nli == ci and "generic [ref=" in nl and nl.strip().startswith("- generic"):
            cl = j; break
        if nli <= ni - 4 and nl.strip(): break
    if cl is None: return []
    btns = []
    for j in range(cl + 1, len(lines)):
        nl = lines[j]; nli = len(nl) - len(nl.lstrip()) if nl.strip() else 999
        if "button" in nl and "ref=" in nl and nli > ci:
            m = re.search(r'button "([^"]+)"', nl)
            m2 = re.search(r"ref=(e\d+)", nl)
            btns.append((m.group(1) if m else "?", m2.group(1) if m2 else None))
        if nli <= ci and nl.strip(): break
    return btns


def main():
    start_dev_server()
    try:
        print("Opening Firefox...")
        cli("playwright-cli open --browser=firefox")
        time.sleep(1)

        print(f"Navigating to {APP_URL}")
        cli(f"playwright-cli goto {APP_URL}")
        time.sleep(2)
        snap()

        # Clean old habits
        for name in ["Playwright Timer Test"]:
            while name in open(SNAP_FILE).read() if SNAP_FILE else False:
                for i, line in enumerate(get_lines()):
                    if name in line:
                        for j in range(i + 1, min(i + 5, len(get_lines()))):
                            if "Delete habit" in get_lines()[j]:
                                ref_m = re.search(r"ref=(e\d+)", get_lines()[j])
                                if ref_m:
                                    ref = ref_m.group(1)
                                    cli(f"playwright-cli click {ref}")
                                    time.sleep(0.3); cli("playwright-cli dialog-accept")
                                    time.sleep(0.5); snap()
                                    break
                break

        # Add timer habit
        print("\nAdding timer habit...")
        btn = find_ref('button "Add habit"')
        cli(f"playwright-cli click {btn}")
        time.sleep(0.5); snap()
        inp = find_ref('textbox "Name"')
        cli(f'playwright-cli fill {inp} "Playwright Timer Test"')
        time.sleep(0.3)
        combo = find_ref('combobox "Type"')
        cli(f"playwright-cli select {combo} timer")
        time.sleep(0.3)
        add_btn = find_ref('button "Add"')
        cli(f"playwright-cli click {add_btn}")
        time.sleep(1); snap()
        print("✅ Habit added")

        buttons = get_all_buttons("Playwright Timer Test")
        print(f"Buttons: {buttons}")

        # TEST: Click MONDAY (index 0)
        day_name, day_ref = buttons[0]
        print(f"\n🔵 Click MONDAY ({day_name}) ref={day_ref}")
        cli(f"playwright-cli click {day_ref}")
        time.sleep(1.5); snap()
        lines = get_lines()
        for line in lines:
            if f"ref={day_ref}" in line:
                print(f"  Result: {line.strip()}")
                if "active" in line:
                    print("  ✅ Monday active!")
                else:
                    print("  ❌ Monday NOT active")
                break

        # Stop via circle (close dialog first)
        cli('playwright-cli type "Escape"')
        time.sleep(0.5); snap()
        buttons2 = get_all_buttons("Playwright Timer Test")
        cli(f"playwright-cli click {buttons2[0][1]}")
        time.sleep(1); snap()
        print("🛑 Stopped")

        # TEST: Click TUESDAY (index 1)
        buttons2 = get_all_buttons("Playwright Timer Test")
        day_name2, day_ref2 = buttons2[1]
        print(f"\n🟠 Click TUESDAY ({day_name2}) ref={day_ref2}")
        cli(f"playwright-cli click {day_ref2}")
        time.sleep(1.5); snap()
        lines = get_lines()
        for line in lines:
            if f"ref={day_ref2}" in line:
                print(f"  Result: {line.strip()}")
                if "active" in line:
                    print("  ✅ Tuesday active!")
                else:
                    print("  ❌ Tuesday NOT active")
                break

        cli("playwright-cli close")
        print("\n✅ Done")
    finally:
        stop_dev_server()


if __name__ == "__main__":
    main()
