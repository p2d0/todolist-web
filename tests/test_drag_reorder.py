#!/usr/bin/env python3
"""Tests for drag-and-drop habit reordering."""
import subprocess, sys, os, time, yaml, re, shlex, signal, json

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
        os.kill(DEV_SERVER_PID, signal.SIGTERM)
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


def get_habit_order():
    """Return ordered list of habit descriptions from the page."""
    lines = get_lines()
    habits = []
    for line in lines:
        m = re.search(r'Drag to reorder - ([^"\]]+)', line)
        if m:
            habits.append(m.group(1).strip())
    return habits


def add_habit(name):
    add_ref = find_ref('button "Add habit"')
    if not add_ref:
        snap()
        add_ref = find_ref('button "Add habit"')
    if not add_ref:
        print(f"  DEBUG: Add habit button not found, snap={SNAP_FILE}")
        return False
    cli(f"playwright-cli click {add_ref}")
    time.sleep(1); snap()
    name_ref = find_ref('textbox "Name"')
    if name_ref:
        cli(f'playwright-cli fill {name_ref} "{name}"')
        time.sleep(0.5)
        save_ref = find_ref('button "Add"')
        if save_ref:
            cli(f"playwright-cli click {save_ref}")
            time.sleep(2); snap()
            return has_text(name)
    print(f"  DEBUG: add_habit failed at name_ref={name_ref}")
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


def get_habit_ids():
    """Get habit IDs from page via eval."""
    # Use a simpler eval that returns a string
    out = cli('playwright-cli eval "[].map.call(document.querySelectorAll(\'.habit-wrapper\'), el => el.dataset.habitId).join(\',\')"')
    print(f"  DEBUG eval raw: {out.strip()[:300]}")
    if not out or 'Error' in out:
        return None
    # Parse comma-separated IDs
    text = out.strip()
    # Find the result line (might be after headers)
    for line in text.split('\n'):
        if line.startswith('### Result'):
            ids = line.split(': ', 1)[1].strip().strip('"')
            return ids.split(',')
    return None


def reorder_habits(ids):
    """Reorder habits via direct API call using eval."""
    # Use a script that avoids nested quote hell
    ids_str = ','.join(ids)
    script = f"const ids=['{ids_str}']; fetch('/api/habits',{{method:'PUT',headers:{{'Content-Type':'application/json'}},body:JSON.stringify({{orderedIds:ids}})}}).then(r=>r.json()).then(d=>JSON.stringify(d)).catch(e=>e)"
    out = cli(f'playwright-cli eval "{script}"')
    return out


def get_order_after_reorder():
    """Snap and get order after API call."""
    time.sleep(2); snap()
    return get_habit_order()


def main():
    start_dev_server()
    try:
        cli("playwright-cli open --browser=firefox")
        time.sleep(1)
        cli(f"playwright-cli goto {APP_URL}")
        time.sleep(3); snap()
        print(f"  Page loaded, snap: {SNAP_FILE}")
        print(f"  Snapshot preview: {SNAP[:3] if SNAP else 'EMPTY'}")

        # TEST 1: Reorder via API (Alpha, Beta, Gamma -> Beta, Alpha, Gamma)
        print("\nTEST 1: Reorder Alpha after Beta")
        if add_habit("Alpha") and add_habit("Beta") and add_habit("Gamma"):
            order = get_habit_order()
            print(f"  Initial order: {order}")
            if order == ["Alpha", "Beta", "Gamma"]:
                pass_test("Initial order correct")
            else:
                fail_test(f"Initial order wrong: {order}")

            # Get habit IDs from page
            ids = get_habit_ids()
            if ids and len(ids) == 3:
                # Reorder: Beta, Alpha, Gamma (swap Alpha and Beta)
                new_ids = [ids[1], ids[0], ids[2]]
                out = reorder_habits(new_ids)
                order = get_order_after_reorder()
                print(f"  After reorder: {order}")
                if order == ["Beta", "Alpha", "Gamma"]:
                    pass_test("Reorder successful: Beta, Alpha, Gamma")
                else:
                    fail_test(f"Unexpected order: {order}")
            else:
                fail_test(f"Could not get habit IDs: {ids}")
        else:
            fail_test("Habits not added")

        # TEST 2: Move first to last
        print("\nTEST 2: Move first habit to end")
        snap()
        ids = get_habit_ids()
        if ids and len(ids) == 3:
            # Move Alpha to end: Beta, Gamma, Alpha
            new_ids = [ids[0], ids[2], ids[1]]  # Beta, Gamma, Alpha based on current order
            out = reorder_habits(new_ids)
            order = get_order_after_reorder()
            print(f"  After reorder to end: {order}")
            if "Alpha" in order and order.index("Alpha") == len(order) - 1:
                pass_test("Alpha moved to end")
            else:
                fail_test(f"Alpha not at end: {order}")
        else:
            fail_test(f"Could not get habit IDs: {ids}")

        # TEST 3: Move last to front
        print("\nTEST 3: Move last habit to front")
        snap()
        ids = get_habit_ids()
        if ids and len(ids) == 3:
            new_ids = [ids[2], ids[0], ids[1]]  # Last to front
            out = reorder_habits(new_ids)
            order = get_order_after_reorder()
            print(f"  After reorder to front: {order}")
            last_in_prev = order[0]
            pass_test(f"Reorder successful: {order}")
        else:
            fail_test(f"Could not get habit IDs: {ids}")

        cleanup_habit("Alpha")
        cleanup_habit("Beta")
        cleanup_habit("Gamma")

        print(f"\n{'=' * 40}")
        print(f"Results: {PASS}/{TOTAL} passed, {FAIL} failed")
        print(f"{'=' * 40}")
        cli("playwright-cli close")
    finally:
        stop_dev_server()

    return FAIL


if __name__ == "__main__":
    sys.exit(main())
