#!/usr/bin/env python3
"""Tests for Hide Done button using playwright-cli."""
import subprocess, sys, os, time, yaml, re, shlex, signal, datetime

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
    db_path = "/mnt/md127/todolist-bun/data/pomotasker.db"
    for p in [db_path, db_path + "-wal", db_path + "-shm"]:
        if os.path.exists(p):
            os.remove(p)
    print("DB cleared")
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
    if not SNAP_FILE:
        return False
    with open(SNAP_FILE) as f:
        return text in f.read()


def get_lines():
    if not SNAP_FILE:
        return []
    with open(SNAP_FILE) as f:
        return f.read().split("\n")


def get_button_text(ref):
    if not SNAP_FILE:
        return None
    with open(SNAP_FILE) as f:
        for line in f:
            if f"ref={ref}" in line:
                m = re.search(r'button\s+"([^"]+)"', line)
                if m:
                    return m.group(1)
    return None


def find_habit_today(habit_name, occurrence=-1):
    """Find today's circle button. Mon=1..Sun=7."""
    today_idx = datetime.date.today().weekday() + 1  # 0=Mon -> 1=Mon
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
            if bc == today_idx:
                m = re.search(r"ref=(e\d+)", nl)
                if m:
                    return m.group(1)
        if ni <= circles_indent and nl.strip():
            break
    return None


def add_habit(name, habit_type):
    add_ref = find_ref('button "Add habit"')
    if not add_ref:
        snap()
        add_ref = find_ref('button "Add habit"')
    if not add_ref:
        return False
    cli(f"playwright-cli click {add_ref}")
    time.sleep(1); snap()
    name_ref = find_ref('textbox "Name"')
    if name_ref:
        cli(f'playwright-cli fill {name_ref} "{name}"')
        time.sleep(0.5)
        if habit_type == "boolean":
            combobox_ref = find_ref('combobox "Type"')
            if combobox_ref:
                cli(f'playwright-cli select {combobox_ref} "boolean"')
                time.sleep(0.5)
        elif habit_type == "number":
            combobox_ref = find_ref('combobox "Type"')
            if combobox_ref:
                cli(f'playwright-cli select {combobox_ref} "number"')
                time.sleep(0.5)
        save_ref = find_ref('button "Add"')
        if save_ref:
            cli(f"playwright-cli click {save_ref}")
            time.sleep(2); snap()
            return has_text(name)
    return False


def pass_test(name):
    global PASS, TOTAL
    PASS += 1; TOTAL += 1
    print(f"  ✅ {name}")


def fail_test(name):
    global FAIL, TOTAL
    FAIL += 1; TOTAL += 1
    print(f"  ❌ {name}")


def cleanup_habit(name):
    if not has_text(name):
        return
    lines = get_lines()
    for i, line in enumerate(lines):
        if name in line:
            for j in range(i, min(i + 10, len(lines))):
                if "Delete habit" in lines[j]:
                    m = re.search(r"ref=(e\d+)", lines[j])
                    if m:
                        cli(f"playwright-cli click {m.group(1)}")
                        time.sleep(0.3)
                        cli("playwright-cli dialog-accept")
                        time.sleep(0.5); snap()
                        return
    snap()


def main():
    global PASS, FAIL, TOTAL
    start_dev_server()
    try:
        print("Opening Firefox...")
        cli("playwright-cli open --browser=firefox")
        time.sleep(1)
        cli(f"playwright-cli goto {APP_URL}")
        time.sleep(2); snap()

        cleanup_habit("Hide Done Test")

        print("\nTEST 1: Add yes/no habit and mark done")
        if add_habit("Hide Done Test", "boolean"):
            pass_test("Bool habit added")
            today = find_habit_today("Hide Done Test", -1)
            if today:
                txt = get_button_text(today)
                print(f"    Before toggle: '{txt}'")
                cli(f"playwright-cli click {today}")
                time.sleep(2); snap()
                today2 = find_habit_today("Hide Done Test", -1)
                txt = get_button_text(today2) if today2 else None
                print(f"    After toggle: '{txt}'")
                if txt == "✓":
                    pass_test("Habit toggled ON")
                    print("\nTEST 2: Hide done hides completed habit")
                    hide_ref = find_ref('button "Hide done"')
                    if hide_ref:
                        pass_test("Hide done button found")
                        cli(f"playwright-cli click {hide_ref}")
                        time.sleep(2); snap()
                        if not has_text("Hide Done Test"):
                            pass_test("Habit hidden")
                            print("\nTEST 3: Show all restores habit")
                            show_ref = find_ref('button "Show all"')
                            if show_ref:
                                pass_test("Show all button found")
                                cli(f"playwright-cli click {show_ref}")
                                time.sleep(1); snap()
                                if has_text("Hide Done Test"):
                                    pass_test("Habit shown")
                                    
                                    # TEST 4: Checkmark must persist after show
                                    print("\nTEST 4: Checkmark persists after hide/show")
                                    today3 = find_habit_today("Hide Done Test", -1)
                                    if today3:
                                        txt3 = get_button_text(today3)
                                        if txt3 == "✓":
                                            pass_test("Checkmark still present")
                                        else:
                                            fail_test(f"Checkmark LOST: button shows '{txt3}' instead of '✓'")
                                    else:
                                        fail_test("Today circle not found after show")
                                    
                                    # TEST 5: Complete habit while hide done is active -> hides live
                                    print("\nTEST 5: Completing habit while hide-done active hides it live")
                                    # Hide is OFF (test 3 toggled). Habit is completed (checkmark).
                                    # Step 1: Uncheck the habit (toggle off)
                                    today4 = find_habit_today("Hide Done Test", -1)
                                    if today4:
                                        cli(f"playwright-cli click {today4}")
                                        time.sleep(1); snap()
                                        # Step 2: Activate hide done (habit is unchecked, should stay visible)
                                        hide_ref2 = find_ref('button "Hide done"')
                                        if hide_ref2:
                                            cli(f"playwright-cli click {hide_ref2}")
                                            time.sleep(1); snap()
                                            # Habit still visible (it's unchecked)
                                            # Step 3: Complete it while hide is active -> should hide live
                                            today5 = find_habit_today("Hide Done Test", -1)
                                            if today5:
                                                cli(f"playwright-cli click {today5}")
                                                time.sleep(2); snap()
                                                if not has_text("Hide Done Test"):
                                                    pass_test("Habit auto-hidden after completing while hide-done active")
                                                else:
                                                    fail_test("Habit still visible after completing while hide-done active")
                                            else:
                                                fail_test("Today circle not found for live-hide test")
                                        else:
                                            fail_test("Hide done button not found for live-hide test")
                                    else:
                                        fail_test("Today circle not found to uncheck")
                                    
                                    # TEST 6: Timer habit auto-hides when stopped while hide-done active
                                    print("\nTEST 6: Timer auto-hides when stopped while hide-done active")
                                    show_ref3 = find_ref('button "Show all"')
                                    if show_ref3:
                                        cli(f"playwright-cli click {show_ref3}")
                                        time.sleep(1); snap()
                                        if add_habit("Timer Hide Test", "timer"):
                                            pass_test("Timer habit added")
                                            today6 = find_habit_today("Timer Hide Test", -1)
                                            if today6:
                                                cli(f"playwright-cli click {today6}")
                                                time.sleep(1); snap()
                                                hide_ref3 = find_ref('button "Hide done"')
                                                if hide_ref3:
                                                    cli(f"playwright-cli click {hide_ref3}")
                                                    time.sleep(1); snap()
                                                    today7 = find_habit_today("Timer Hide Test", -1)
                                                    if today7:
                                                        cli(f"playwright-cli click {today7}")
                                                        time.sleep(2); snap()
                                                        if not has_text("Timer Hide Test"):
                                                            pass_test("Timer habit auto-hidden when stopped")
                                                        else:
                                                            fail_test("Timer habit still visible after stopping")
                                                    else:
                                                        fail_test("Today circle not found to stop timer")
                                                else:
                                                    fail_test("Hide done button not found for timer test")
                                            else:
                                                fail_test("Today circle not found to start timer")
                                        else:
                                            fail_test("Timer habit not added")
                                    else:
                                        fail_test("Show all button not found for timer test")
                                    
                                    # TEST 7: Number habit auto-hides when value >= min while hide-done active
                                    print("\nTEST 7: Number auto-hides when value >= min while hide-done active")
                                    show_ref4 = find_ref('button "Show all"')
                                    if show_ref4:
                                        cli(f"playwright-cli click {show_ref4}")
                                        time.sleep(1); snap()
                                        hide_ref4 = find_ref('button "Hide done"')
                                        if hide_ref4:
                                            cli(f"playwright-cli click {hide_ref4}")
                                            time.sleep(1); snap()
                                            if add_habit("Number Hide Test", "number"):
                                                pass_test("Number habit added")
                                                today8 = find_habit_today("Number Hide Test", -1)
                                                if today8:
                                                    cli(f"playwright-cli click {today8}")
                                                    time.sleep(2); snap()
                                                    num_input_ref = find_ref('spinbutton "Value"')
                                                    if num_input_ref:
                                                        cli(f'playwright-cli fill {num_input_ref} "10"')
                                                        time.sleep(0.5); snap()
                                                        save_ref2 = find_ref('button "Save"')
                                                        if save_ref2:
                                                            cli(f"playwright-cli click {save_ref2}")
                                                            time.sleep(2); snap()
                                                            if not has_text("Number Hide Test"):
                                                                pass_test("Number habit auto-hidden when value entered")
                                                            else:
                                                                fail_test("Number habit still visible after entering value")
                                                        else:
                                                            save_ref3 = find_ref('button "Add"')
                                                            if save_ref3:
                                                                cli(f"playwright-cli click {save_ref3}")
                                                                time.sleep(2); snap()
                                                                if not has_text("Number Hide Test"):
                                                                    pass_test("Number habit auto-hidden when value entered")
                                                                else:
                                                                    fail_test("Number habit still visible after entering value")
                                                            else:
                                                                fail_test("Save/Add button not found in number editor")
                                                    else:
                                                        fail_test("Number input not found")
                                                else:
                                                    fail_test("Today circle not found for number test")
                                            else:
                                                fail_test("Number habit not added")
                                        else:
                                            fail_test("Hide done button not found for number test")
                                    else:
                                        fail_test("Show all button not found for number test")
                                else:
                                    fail_test("Habit not shown")
                            else:
                                fail_test("Show all button not found")
                        else:
                            fail_test("Habit still visible")
                    else:
                        fail_test("Hide done button not found")
                else:
                    fail_test(f"Habit text is '{txt}' not '✓'")
            else:
                fail_test("Today circle not found")
        else:
            fail_test("Bool habit not visible")

        cleanup_habit("Hide Done Test")
        cleanup_habit("Timer Hide Test")
        cleanup_habit("Number Hide Test")

        print(f"\n{'=' * 40}")
        print(f"Results: {PASS}/{TOTAL} passed, {FAIL} failed")
        print(f"{'=' * 40}")
        cli("playwright-cli close")
    finally:
        stop_dev_server()

    return FAIL


if __name__ == "__main__":
    sys.exit(main())
