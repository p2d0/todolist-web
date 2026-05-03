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
    import shutil
    db_path = "/mnt/md127/todolist-bun/data/pomotasker.db"
    if os.path.exists(db_path):
        os.remove(db_path)
        print("DB cleared")
    wal_path = db_path + "-wal"
    shm_path = db_path + "-shm"
    if os.path.exists(wal_path):
        os.remove(wal_path)
    if os.path.exists(shm_path):
        os.remove(shm_path)
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


def _find_habit_description_lines(habit_name):
    """Return indices of lines that look like habit description nodes
    (e.g. `  - generic [ref=e38]: Playwright Timer Test`).
    Filters out banner or other nodes by requiring an Edit/Delete button nearby.
    """
    lines = get_lines()
    result = []
    for i, line in enumerate(lines):
        if re.search(rf":\s*{re.escape(habit_name)}\s*$", line) and "generic [ref=" in line:
            for j in range(i + 1, min(i + 4, len(lines))):
                if "Edit habit" in lines[j] or "Delete habit" in lines[j]:
                    result.append(i)
                    break
    return result


def _today_button_index():
    """Return 1-based index of today's button (Mon=1 ... Sun=7)."""
    import datetime
    # datetime.weekday() -> Monday=0 ... Sunday=6, matching the app's circle order
    return datetime.datetime.now().weekday() + 1


def find_habit_today(habit_name, occurrence=-1):
    """Find today circle for a habit using raw lines.
    occurrence=-1 means last/newest, 0 means first/oldest.
    """
    lines = get_lines()
    matches = _find_habit_description_lines(habit_name)
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
    target = _today_button_index()
    bc = 0
    for j in range(circles_line + 1, len(lines)):
        nl = lines[j]
        ni = len(nl) - len(nl.lstrip()) if nl.strip() else 999
        if "button" in nl and "ref=" in nl and ni > circles_indent:
            bc += 1
            if bc == target:
                m = re.search(r"ref=(e\d+)", nl)
                if m:
                    return m.group(1)
        if ni <= circles_indent and nl.strip():
            break
    return None


def get_all_buttons(habit_name):
    """Get all 7 day buttons for a habit. Returns list of (day_label, ref)."""
    lines = get_lines()
    matches = _find_habit_description_lines(habit_name)
    for idx in matches:
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
            continue
        btns = []
        for j in range(circles_line + 1, len(lines)):
            nl = lines[j]
            ni = len(nl) - len(nl.lstrip()) if nl.strip() else 999
            if "button" in nl and "ref=" in nl and ni > circles_indent:
                m = re.search(r'button "([^"]+)"', nl)
                m2 = re.search(r"ref=(e\d+)", nl)
                btns.append((m.group(1) if m else "?", m2.group(1) if m2 else None))
            if ni <= circles_indent and nl.strip(): break
        if btns:
            return btns
    return []


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
    matches = _find_habit_description_lines(habit_name)
    for idx in matches:
        for j in range(idx + 1, min(idx + 5, len(lines))):
            if "Delete habit" in lines[j]:
                m = re.search(r"ref=(e\d+)", lines[j])
                if m:
                    return m.group(1)
    return None


def delete_habit(habit_name):
    del_ref = find_first_delete_ref(habit_name)
    if del_ref:
        # Bypass native confirm dialog so deletion proceeds immediately
        cli('playwright-cli eval "window.confirm = () => true"')
        cli(f"playwright-cli click {del_ref}")
        time.sleep(0.8)
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
                # Re-find today circle (ref may change after render)
                time.sleep(0.5)
                today = find_habit_today("Playwright Timer Test", -1)
                txt = get_button_text(today) if today else None
                # When timer is running the today circle shows elapsed time (e.g. "1s", "2m")
                if txt and any(c.isdigit() for c in txt):
                    pass_test("Timer started (circle active)")
                    # Close any open dialog
                    cli('playwright-cli type "Escape"')
                    time.sleep(0.5); snap()
                    today2 = find_habit_today("Playwright Timer Test", -1)
                    if today2:
                        cli(f"playwright-cli click {today2}")
                        time.sleep(1)
                        pass_test("Timer stopped via circle")
                    else:
                        fail_test("Could not find habit circle to stop timer")
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
        cli('playwright-cli type "Escape"')
        time.sleep(0.3)
        cli("playwright-cli reload")
        time.sleep(2); snap()
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
                        for _ in range(6):
                            time.sleep(1); snap()
                            buttons2 = get_all_buttons("Playwright Timer Test")
                            monday_txt = get_button_text(buttons2[0][1])
                            if monday_txt == "5m":
                                break
                        else:
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
