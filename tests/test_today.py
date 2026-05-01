#!/usr/bin/env python3
"""Test clicking TODAY vs other days for timer habit."""
import subprocess, sys, os, time, yaml, re, shlex

APP_URL = os.environ.get("APP_URL", "http://localhost:5174")
SNAP = []; SNAP_FILE = None


def cli(cmd):
    return subprocess.run(shlex.split(cmd), capture_output=True, text=True, timeout=30).stdout


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
    lines = get_lines()
    idx = None
    for i, line in enumerate(lines):
        if habit_name in line: idx = i; break
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
    print("Opening Firefox...")
    cli("playwright-cli open --browser=firefox")
    time.sleep(1)
    cli(f"playwright-cli goto {APP_URL}")
    time.sleep(2); snap()

    # Clean
    for name in ["Playwright Timer Test"]:
        while name in open(SNAP_FILE).read() if SNAP_FILE else False:
            for i, line in enumerate(get_lines()):
                if name in line:
                    for j in range(i + 1, min(i + 5, len(get_lines()))):
                        if "Delete habit" in get_lines()[j]:
                            ref = re.search(r"ref=(e\d+)", get_lines()[j]).group(1)
                            cli(f"playwright-cli click {ref}")
                            time.sleep(0.3); cli("playwright-cli dialog-accept")
                            time.sleep(0.5); snap()
                            break
            break

    # Add timer
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
    print(f"All buttons: {buttons}")

    # Today is Friday (index 4)
    print(f"\n1. Click TODAY (Friday, index 4) ref={buttons[4][1]}")
    cli(f"playwright-cli click {buttons[4][1]}")
    time.sleep(1.5); snap()
    lines = get_lines()
    for line in lines:
        if f"ref={buttons[4][1]}" in line:
            print(f"  Friday: {line.strip()}")
            print("  ✅ Active!" if "active" in line else "  ❌ Not active")
            break

    # Check FAB
    fab = find_ref("Stop timer")
    print(f"  FAB has 'Stop timer': {fab is not None}")

    # Stop
    if fab:
        cli(f"playwright-cli click {fab}")
        time.sleep(1); snap()
        print("🛑 Stopped")

    # 2. Click MONDAY (index 0)
    buttons2 = get_all_buttons("Playwright Timer Test")
    print(f"\n2. Click MONDAY (index 0) ref={buttons2[0][1]}")
    cli(f"playwright-cli click {buttons2[0][1]}")
    time.sleep(1.5); snap()
    lines = get_lines()
    for line in lines:
        if f"ref={buttons2[0][1]}" in line:
            print(f"  Monday: {line.strip()}")
            print("  ✅ Active!" if "active" in line else "  ❌ Not active")
            break

    fab2 = find_ref("Stop timer")
    print(f"  FAB has 'Stop timer': {fab2 is not None}")

    # Check ALL buttons to see which is active
    print("\n  All buttons state:")
    lines = get_lines()
    for line in lines:
        if "button" in line and "ref=e" in line and ("e1" in line or "e2" in line or "e3" in line):
            if "active" in line:
                print(f"    ACTIVE: {line.strip()}")

    cli("playwright-cli close")
    print("\n✅ Done")


if __name__ == "__main__":
    main()
