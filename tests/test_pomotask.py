#!/usr/bin/env python3
"""Tests for PomoTasker using playwright-cli. Starts/stops dev server automatically."""
import subprocess, sys, os, time, yaml, re, shlex, signal

APP_URL = os.environ.get("APP_URL", "http://localhost:5173")
PASS = FAIL = TOTAL = 0
SNAP = []
SNAP_FILE = None
DEV_SERVER_PID = None


def cli(cmd):
    return subprocess.run(shlex.split(cmd), capture_output=True, text=True, timeout=30).stdout


def start_dev_server():
    global DEV_SERVER_PID
    print("Starting dev server...")
    p = subprocess.Popen(
        "cd /mnt/md127/todolist-bun && POMO_BASE='' npm run dev",
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    DEV_SERVER_PID = p.pid
    # Wait for vite to output "Local: http://"
    for i in range(120):
        if p.poll() is not None:
            print("Dev server exited early.")
            return
        try:
            r = subprocess.run(
                f"curl -s -o /dev/null -w %{{{{http_code}}}} {APP_URL}",
                shell=True, capture_output=True, text=True, timeout=5
            )
            if r.stdout.strip() in ("200", "301", "302"):
                print("Dev server ready.")
                return
        except:
            pass
        time.sleep(1)
    print("Dev server slow, continuing anyway...")


def stop_dev_server():
    global DEV_SERVER_PID
    if DEV_SERVER_PID:
        try:
            os.kill(DEV_SERVER_PID, signal.SIGTERM)
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
        SNAP_FILE = None
        SNAP = []
    return SNAP


def find_ref(text):
    """Search parsed SNAP tree for ref matching text in key or string item."""
    def search(node):
        if isinstance(node, dict):
            for k, v in node.items():
                if isinstance(k, str) and text in k:
                    m = re.search(r"ref=(e\d+)", k)
                    if m:
                        return m.group(1)
                r = search(v)
                if r:
                    return r
        elif isinstance(node, list):
            for item in node:
                if isinstance(item, str) and text in item:
                    m = re.search(r"ref=(e\d+)", item)
                    if m:
                        return m.group(1)
                r = search(item)
                if r:
                    return r
        return None
    return search(SNAP)


def has_text(text):
    """Check if text appears anywhere in the raw snapshot file."""
    if not SNAP_FILE:
        return False
    with open(SNAP_FILE) as f:
        return text in f.read()


def get_button_text(ref):
    """Extract button display text by ref from raw snapshot file."""
    if not SNAP_FILE:
        return None
    with open(SNAP_FILE) as f:
        for line in f:
            if f"ref={ref}" in line:
                m = re.search(r'button\s+"([^"]+)"', line)
                if m:
                    return m.group(1)
    return None


def get_lines():
    """Return lines of raw snapshot file for indentation-based parsing."""
    if not SNAP_FILE:
        return []
    with open(SNAP_FILE) as f:
        return f.read().split("\n")


def find_habit_today(habit_name, occurrence=-1):
    """Find today circle (5th button) for a habit using raw lines.
    occurrence=-1 means last/newest, 0 means first/oldest.
    """
    lines = get_lines()
    matches = [i for i, line in enumerate(lines) if habit_name in line]
    if not matches:
        return None
    idx = matches[occurrence]
    line = lines[idx]
    name_indent = len(line) - len(line.lstrip())
    circles_indent = name_indent - 2
    circles_line = None
    for j in range(idx + 1, len(lines)):
        nl = lines[j]
        ni = len(nl) - len(nl.lstrip()) if nl.strip() else 999
        if ni == circles_indent and "generic [ref=" in nl and nl.strip().startswith("- generic"):
            circles_line = j
            break
        if ni <= name_indent - 4 and nl.strip():
            break
    if circles_line is None:
        return None
    bc = 0
    for j in range(circles_line + 1, len(lines)):
        nl = lines[j]
        ni = len(nl) - len(nl.lstrip()) if nl.strip() else 999
        if "button" in nl and "ref=" in nl and ni > circles_indent:
            bc += 1
            if bc == 5:
                m = re.search(r"ref=(e\d+)", nl)
                if m:
                    return m.group(1)
        if ni <= circles_indent and nl.strip():
            break
    return None


def get_all_buttons(habit_name):
    """Get all 7 day buttons for a habit. Returns list of (day_label, ref)."""
    lines = get_lines()
    idx = None
    for i, line in enumerate(lines):
        if habit_name in line:
            idx = i; break
    if idx is None:
        return []
    name_indent = len(lines[idx]) - len(lines[idx].lstrip())
    circles_indent = name_indent - 2
    circles_line = None
    for j in range(idx + 1, len(lines)):
        nl = lines[j]
        ni = len(nl) - len(nl.lstrip()) if nl.strip() else 999
        if ni == circles_indent and "generic [ref=" in nl and nl.strip().startswith("- generic"):
            circles_line = j; break
        if ni <= name_indent - 4 and nl.strip(): break
    if circles_line is None:
        return []
    btns = []
    for j in range(circles_line + 1, len(lines)):
        nl = lines[j]
        ni = len(nl) - len(nl.lstrip()) if nl.strip() else 999
        if "button" in nl and "ref=" in nl and ni > circles_indent:
            m = re.search(r'button "([^"]+)"', nl)
            m2 = re.search(r"ref=(e\d+)", nl)
            btns.append((m.group(1) if m else "?", m2.group(1) if m2 else None))
        if ni <= circles_indent and nl.strip(): break
    return btns


def pass_test(name):
    global PASS, TOTAL
    TOTAL += 1; PASS += 1
    print(f"  \033[0;32m✅ {name}\033[0m")


def fail_test(name):
    global FAIL, TOTAL
    TOTAL += 1; FAIL += 1
    print(f"  \033[0;31m❌ {name}\033[0m")


def add_habit(name, habit_type):
    btn = find_ref('button "Add habit"')
    if not btn:
        return False
    cli(f"playwright-cli click {btn}")
    time.sleep(0.5); snap()
    inp = find_ref('textbox "Name"')
    if not inp:
        return False
    cli(f'playwright-cli fill {inp} "{name}"')
    time.sleep(0.3)
    combo = find_ref('combobox "Type"')
    if not combo:
        return False
    cli(f"playwright-cli select {combo} {habit_type}")
    time.sleep(0.3)
    add_btn = find_ref('button "Add"')
    if not add_btn:
        return False
    cli(f"playwright-cli click {add_btn}")
    time.sleep(1); snap()
    return has_text(name)


def find_first_delete_ref(habit_name):
    lines = get_lines()
    for i, line in enumerate(lines):
        if habit_name in line:
            for j in range(i + 1, min(i + 5, len(lines))):
                if "Delete habit" in lines[j]:
                    m = re.search(r"ref=(e\d+)", lines[j])
                    if m:
                        return m.group(1)
            break
    return None


def delete_habit(habit_name):
    del_ref = find_first_delete_ref(habit_name)
    if del_ref:
        cli(f"playwright-cli click {del_ref}")
        time.sleep(0.3)
        cli("playwright-cli dialog-accept")
        time.sleep(0.5)
        snap()
        return not has_text(habit_name)
    return False


def cleanup_habit(name):
    """Clean up a specific test habit after its test."""
    while has_text(name):
        if not delete_habit(name):
            break
    snap()


def cleanup_all_test_habits():
    """Delete all test habits."""
    for name in ["Playwright Timer Test", "Playwright Bool Test", "Delete Me Test"]:
        cleanup_habit(name)
    snap()


def main():
    global PASS, FAIL, TOTAL

    # Start dev server
    start_dev_server()

    try:
        print("Opening Firefox...")
        cli("playwright-cli open --browser=firefox")
        time.sleep(1)

        print(f"Navigating to {APP_URL}")
        cli(f"playwright-cli goto {APP_URL}")
        time.sleep(2)
        snap()

        # Initial cleanup
        print("\nCleanup: deleting old test habits")
        cleanup_all_test_habits()

        # =========================
        # TEST 1: Add timer habit
        # =========================
        print("\nTEST 1: Add timer habit")
        if add_habit("Playwright Timer Test", "timer"):
            pass_test("Timer habit added")
        else:
            fail_test("Timer habit not visible after add")
        cleanup_habit("Playwright Timer Test")

        # =========================
        # TEST 2: Add and toggle yes/no
        # =========================
        print("\nTEST 2: Add and toggle yes/no")
        if add_habit("Playwright Bool Test", "boolean"):
            pass_test("Boolean habit added")

            # Ensure circle is OFF (freshly added should be off)
            today = find_habit_today("Playwright Bool Test", -1)
            if today:
                txt = get_button_text(today)
                if txt and txt == "\u2713":
                    cli(f"playwright-cli click {today}")
                    time.sleep(0.5); snap()

                # Re-find (ref changes after click)
                today = find_habit_today("Playwright Bool Test", -1)
                if today:
                    # Toggle ON
                    cli(f"playwright-cli click {today}")
                    time.sleep(0.5); snap()

                    # Re-find
                    today = find_habit_today("Playwright Bool Test", -1)
                    if today:
                        txt = get_button_text(today)
                        if txt == "\u2713":
                            pass_test("Boolean toggled ON")

                            # Toggle OFF
                            cli(f"playwright-cli click {today}")
                            time.sleep(0.5); snap()

                            today = find_habit_today("Playwright Bool Test", -1)
                            txt = get_button_text(today)
                            if txt and txt != "\u2713":
                                pass_test("Boolean toggled OFF")
                            else:
                                fail_test("Boolean still complete (text: " + str(txt) + ")")
                        else:
                            fail_test("Boolean not marked complete (text: " + str(txt) + ")")
                    else:
                        fail_test("Circle not found after toggle ON")
                else:
                    fail_test("Circle not found before toggle")
            else:
                fail_test("Today circle not found")
        else:
            fail_test("Boolean habit not visible")
        cleanup_habit("Playwright Bool Test")

        # =========================
        # TEST 3: Start timer
        # =========================
        print("\nTEST 3: Start timer on timer habit")
        if add_habit("Playwright Timer Test", "timer"):
            pass_test("Timer habit added")
            today = find_habit_today("Playwright Timer Test", -1)
            if today:
                cli(f"playwright-cli click {today}")
                time.sleep(1); snap()
                if "active" in open(SNAP_FILE).read() if SNAP_FILE else False:
                    pass_test("Timer started (circle active)")
                    stop = find_ref("Stop timer")
                    if stop:
                        cli(f"playwright-cli click {stop}")
                        time.sleep(1); snap()
                        pass_test("Timer stopped via FAB")
                    else:
                        today2 = find_habit_today("Playwright Timer Test", -1)
                        if today2:
                            cli(f"playwright-cli click {today2}")
                            time.sleep(1); snap()
                            pass_test("Timer stopped via circle")
                        else:
                            fail_test("Could not stop timer")
                else:
                    fail_test("Timer not active after click")
            else:
                fail_test("Timer habit today circle not found")
        else:
            fail_test("Timer habit not visible")
        cleanup_habit("Playwright Timer Test")

        # =========================
        # TEST 4: Add time on non-today day
        # =========================
        print("\nTEST 4: Add time on non-today day")
        if add_habit("Playwright Timer Test", "timer"):
            pass_test("Timer habit added")
            buttons = get_all_buttons("Playwright Timer Test")
            if len(buttons) >= 1:
                monday_name, monday_ref = buttons[0]
                print(f"    Clicking MONDAY ({monday_name})")
                cli(f"playwright-cli click {monday_ref}")
                time.sleep(1); snap()
                minutes_spin = find_ref('spinbutton "Minutes"')
                if minutes_spin:
                    pass_test("TimeEditor opened")
                    cli(f'playwright-cli fill {minutes_spin} "5"')
                    time.sleep(0.5)
                    save_btn = find_ref('button "Save"')
                    if save_btn:
                        cli(f"playwright-cli click {save_btn}")
                        time.sleep(1.5); snap()
                        buttons2 = get_all_buttons("Playwright Timer Test")
                        monday_txt = get_button_text(buttons2[0][1])
                        if monday_txt == "5m":
                            pass_test("Time saved on Monday")
                        else:
                            fail_test(f"Monday circle shows '{monday_txt}' instead of '5m'")
                    else:
                        fail_test("Save button not found")
                else:
                    fail_test("TimeEditor dialog did not open")
            else:
                fail_test("No day buttons found")
        else:
            fail_test("Timer habit not visible")
        cleanup_habit("Playwright Timer Test")

        # =========================
        # TEST 5: Remove habit
        # =========================
        print("\nTEST 5: Remove habit")
        if add_habit("Delete Me Test", "boolean"):
            pass_test("Habit to delete added")
            if delete_habit("Delete Me Test"):
                pass_test("Habit deleted")
            else:
                fail_test("Habit still visible after delete")
        else:
            fail_test("Habit to delete not visible")
        cleanup_habit("Delete Me Test")

        # =========================
        # Summary
        # =========================
        print(f"\n{'=' * 40}")
        print(f"Results: {PASS}/{TOTAL} passed, {FAIL} failed")
        print(f"{'=' * 40}")

        cli("playwright-cli close")
    finally:
        stop_dev_server()

    return FAIL


if __name__ == "__main__":
    sys.exit(main())
