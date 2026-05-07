#!/usr/bin/env python3
"""Tests for notes and monthly overview using playwright-cli."""
import subprocess, sys, os, time, yaml, re, shlex, datetime, signal

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


def pass_test(name):
    global PASS, TOTAL
    TOTAL += 1
    PASS += 1
    print(f"  \033[0;32m✅ {name}\033[0m")


def fail_test(name):
    global FAIL, TOTAL
    TOTAL += 1
    FAIL += 1
    print(f"  \033[0;31m❌ {name}\033[0m")


def today_str():
    return datetime.date.today().strftime("%Y-%m-%d")


def eval_js(js):
    """Run JS via playwright-cli eval and return the printed result."""
    # Use subprocess.run directly (not shlex.split) so JS string stays intact
    out = subprocess.run(
        ["playwright-cli", "eval", js],
        capture_output=True, text=True, timeout=30
    ).stdout
    return out.strip()


def add_habit(name, habit_type):
    btn = find_ref('button "Add habit"')
    if not btn:
        return False
    cli(f"playwright-cli click {btn}")
    time.sleep(0.5)
    snap()
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
    time.sleep(1)
    snap()
    return has_text(name)


def delete_habit(name):
    lines = open(SNAP_FILE).read().split("\n") if SNAP_FILE else []
    for i, line in enumerate(lines):
        if name in line and "generic [ref=" in line:
            for j in range(i + 1, min(i + 5, len(lines))):
                if "Delete habit" in lines[j]:
                    m = re.search(r"ref=(e\d+)", lines[j])
                    if m:
                        cli('playwright-cli eval "window.confirm = () => true"')
                        cli(f"playwright-cli click {m.group(1)}")
                        time.sleep(0.8)
                        snap()
                        return True
    return False


def cleanup_habit(name):
    for _ in range(5):
        if not has_text(name):
            break
        if not delete_habit(name):
            break
    snap()


def main():
    global PASS, FAIL, TOTAL
    start_dev_server()

    try:
        print("Opening Firefox...")
        cli("playwright-cli open --browser=firefox")
        time.sleep(1)
        cli(f"playwright-cli goto {APP_URL}")
        time.sleep(2)
        snap()

        # Clean up any existing test habits
        for name in ["Playwright Note Test"]:
            cleanup_habit(name)

        today = today_str()

        # =========================
        # TEST 1: Open note editor from main view
        # =========================
        print("\nTEST 1: Open note editor from main view")
        note_btn = find_ref('button "📝 Note"')
        if note_btn:
            cli(f"playwright-cli click {note_btn}")
            time.sleep(0.5)
            snap()
            if has_text(f"Note for {today}"):
                pass_test("Note editor opens from main view")
            else:
                fail_test("Note editor did not open")
        else:
            fail_test("Note button not found")

        # Close editor
        cli('playwright-cli type "Escape"')
        time.sleep(0.3)
        snap()

        # =========================
        # TEST 2: Save a note
        # =========================
        print("\nTEST 2: Save a note")
        note_btn = find_ref('button "📝 Note"')
        if note_btn:
            cli(f"playwright-cli click {note_btn}")
            time.sleep(0.5)
            snap()
            textarea = find_ref('textbox')
            if textarea:
                cli(f'playwright-cli fill {textarea} "Test note content"')
                time.sleep(0.3)
                save_btn = find_ref('button "Save"')
                if save_btn:
                    cli(f"playwright-cli click {save_btn}")
                    time.sleep(1)
                    snap()
                    if not has_text("Note for"):
                        pass_test("Note saved and editor closed")
                    else:
                        fail_test("Editor still open after save")
                else:
                    fail_test("Save button not found")
            else:
                fail_test("Textarea not found")
        else:
            fail_test("Note button not found")

        # =========================
        # TEST 3: Monthly overview shows note indicator
        # =========================
        print("\nTEST 3: Monthly overview shows note indicator")
        # Add a habit so monthly overview has data
        if add_habit("Playwright Note Test", "boolean"):
            pass_test("Habit added for monthly overview")

            # Go to Statistics tab
            stats_btn = find_ref('button "Statistics"')
            if stats_btn:
                cli(f"playwright-cli click {stats_btn}")
                time.sleep(2)
                snap()
                if has_text("Monthly Overview"):
                    pass_test("Statistics tab loaded")

                    # Check if today's cell has has-note class
                    date_attr = today
                    js = f"""document.querySelector('td[data-date=\"{date_attr}\"]')?.classList.contains('has-note')"""
                    result = eval_js(js)
                    if "true" in result.lower():
                        pass_test("Note indicator visible on today's cell")
                    else:
                        fail_test(f"Note indicator not found (result: {result})")
                else:
                    fail_test("Monthly Overview not found")
            else:
                fail_test("Statistics button not found")
        else:
            fail_test("Habit not added")

        # =========================
        # TEST 4: Tooltip shows note preview
        # =========================
        print("\nTEST 4: Tooltip shows note preview")
        # Hover over today's cell using JS
        js_hover = f"""(function() {{ const el = document.querySelector('td[data-date=\"{today}\"]'); if (el) {{ el.dispatchEvent(new MouseEvent('mouseenter', {{bubbles: true}})); return 'hovered'; }} return 'not found'; }})()"""
        result = eval_js(js_hover)
        time.sleep(0.5)
        snap()
        if has_text("Test note content"):
            pass_test("Tooltip shows note preview")
        else:
            fail_test("Tooltip note preview not found")

        # Unhover
        eval_js(f"""(function() {{ const el = document.querySelector('td[data-date=\"{today}\"]'); if (el) el.dispatchEvent(new MouseEvent('mouseleave', {{bubbles: true}})); }})()""")
        time.sleep(0.3)

        # =========================
        # TEST 5: Click cell to pin tooltip, then edit note
        # =========================
        print("\nTEST 5: Edit note from tooltip")
        # Click today's cell to pin tooltip
        js_click = f"""(function() {{ const el = document.querySelector('td[data-date=\"{today}\"]'); if (el) {{ el.click(); return 'clicked'; }} return 'not found'; }})()"""
        result = eval_js(js_click)
        time.sleep(0.5)
        snap()
        edit_btn = find_ref('button "Edit note"')
        if edit_btn:
            cli(f"playwright-cli click {edit_btn}")
            time.sleep(0.5)
            snap()
            if has_text("Note for") and has_text("Test note content"):
                pass_test("Note editor opens with existing content")
                # Update note
                textarea = find_ref('textbox')
                if textarea:
                    cli(f'playwright-cli fill {textarea} "Updated note"')
                    time.sleep(0.3)
                    save_btn = find_ref('button "Save"')
                    if save_btn:
                        cli(f"playwright-cli click {save_btn}")
                        time.sleep(1)
                        snap()
                        if not has_text("Note for"):
                            pass_test("Updated note saved")
                        else:
                            fail_test("Editor still open after update")
                    else:
                        fail_test("Save button not found for update")
                else:
                    fail_test("Textarea not found for update")
            else:
                fail_test("Note editor did not open with existing content")
        else:
            fail_test("Edit note button not found in tooltip")

        # =========================
        # TEST 6: Right-click cell opens note editor directly
        # =========================
        print("\nTEST 6: Right-click cell opens note editor")
        js_rightclick = f"""(function() {{ const el = document.querySelector('td[data-date=\"{today}\"]'); if (el) {{ el.dispatchEvent(new MouseEvent('contextmenu', {{bubbles: true, cancelable: true}})); return 'rightclicked'; }} return 'not found'; }})()"""
        result = eval_js(js_rightclick)
        time.sleep(0.5)
        snap()
        if has_text("Note for") and has_text("Updated note"):
            pass_test("Right-click opens note editor with content")
        else:
            fail_test("Right-click did not open note editor properly")

        # Close editor
        cli('playwright-cli type "Escape"')
        time.sleep(0.3)
        snap()

        # =========================
        # Cleanup
        # =========================
        print("\nCleanup")
        # Go back to main tab
        main_btn = find_ref('button "Main"')
        if main_btn:
            cli(f"playwright-cli click {main_btn}")
            time.sleep(1)
            snap()
        cleanup_habit("Playwright Note Test")

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
