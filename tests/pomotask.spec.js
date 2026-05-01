import { expect, test } from "@playwright/test";

const BASE_URL = process.env.APP_URL || "https://ug.kyrgyzstan.kg/pomotask";

test.describe("PomoTasker Habits", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(BASE_URL);
		await page.waitForTimeout(500); // Wait for data to load
	});

	test("add a timer habit", async ({ page }) => {
		// Click the FAB "+" button to open add dialog
		await page.getByRole("button", { name: "Add habit" }).click();
		await page.waitForTimeout(300);

		// Fill in the habit name
		const nameInput = page.getByRole("textbox", { name: "Name" });
		await expect(nameInput).toBeVisible();
		await nameInput.fill("Test Timer Habit");

		// Timer is default, select it explicitly
		await page.getByRole("combobox", { name: "Type" }).selectOption("timer");

		// Click Add button
		await page.getByRole("button", { name: "Add" }).click();
		await page.waitForTimeout(500);

		// Verify habit appears in list
		const habitText = page.getByText("Test Timer Habit");
		await expect(habitText).toBeVisible();
	});

	test("add and toggle a yes/no habit", async ({ page }) => {
		// Add a boolean habit
		await page.getByRole("button", { name: "Add habit" }).click();
		await page.waitForTimeout(300);

		const nameInput = page.getByRole("textbox", { name: "Name" });
		await nameInput.fill("Test Yes/No Habit");

		// Select boolean type
		await page.getByRole("combobox", { name: "Type" }).selectOption("boolean");

		await page.getByRole("button", { name: "Add" }).click();
		await page.waitForTimeout(500);

		// Verify it appears
		const habitText = page.getByText("Test Yes/No Habit");
		await expect(habitText).toBeVisible();

		// Find the habit row container (the generic div containing the habit name)
		// The circles are in the sibling div after the header
		// We need to find the today circle - it has border class circle-today
		// Strategy: find all circles in the row containing "Test Yes/No Habit"
		const habitRow = page
			.locator(".habit-row")
			.filter({ hasText: "Test Yes/No Habit" });

		// Get today's circle (it has a blue border)
		const todayCircle = habitRow.locator(".circle-today");
		await expect(todayCircle).toBeVisible();

		// Click to mark as done (first click on empty should toggle to complete)
		await todayCircle.click();
		await page.waitForTimeout(500);

		// Verify it shows as complete (green background)
		await expect(todayCircle).toHaveClass(/circle-complete/);

		// Click again to unmark
		await todayCircle.click();
		await page.waitForTimeout(500);

		// Verify it's back to empty (no complete class)
		await expect(todayCircle).not.toHaveClass(/circle-complete/);
	});

	test("start timer on a timer habit", async ({ page }) => {
		// Add a timer habit first
		await page.getByRole("button", { name: "Add habit" }).click();
		await page.waitForTimeout(300);

		const nameInput = page.getByRole("textbox", { name: "Name" });
		await nameInput.fill("Test Timer Habit 2");

		await page.getByRole("combobox", { name: "Type" }).selectOption("timer");
		await page.getByRole("button", { name: "Add" }).click();
		await page.waitForTimeout(500);

		// Find the habit row
		const habitRow = page
			.locator(".habit-row")
			.filter({ hasText: "Test Timer Habit 2" });
		const todayCircle = habitRow.locator(".circle-today");

		// Verify timer is not active initially
		await expect(todayCircle).not.toHaveClass(/circle-active/);

		// Click today circle to start timer
		await todayCircle.click();
		await page.waitForTimeout(500);

		// Verify timer is running (circle should be active with purple glow)
		await expect(todayCircle).toHaveClass(/circle-active/);

		// Verify FAB changed to stop button (red square)
		const stopButton = page.getByRole("button", { name: "Stop timer" });
		await expect(stopButton).toBeVisible();

		// Stop the timer via FAB
		await stopButton.click();
		await page.waitForTimeout(500);

		// Verify timer stopped (circle no longer active)
		await expect(todayCircle).not.toHaveClass(/circle-active/);
		// Should show as complete (green) since we ran it
		await expect(todayCircle).toHaveClass(/circle-complete/);
	});

	test("remove a habit", async ({ page }) => {
		// Add a habit to delete
		await page.getByRole("button", { name: "Add habit" }).click();
		await page.waitForTimeout(300);

		const nameInput = page.getByRole("textbox", { name: "Name" });
		await nameInput.fill("Delete Me Habit");

		await page.getByRole("combobox", { name: "Type" }).selectOption("boolean");
		await page.getByRole("button", { name: "Add" }).click();
		await page.waitForTimeout(500);

		// Verify it appears
		const habitText = page.getByText("Delete Me Habit");
		await expect(habitText).toBeVisible();

		// Find the habit row and click delete button
		const habitRow = page
			.locator(".habit-row")
			.filter({ hasText: "Delete Me Habit" });
		const deleteBtn = habitRow.getByRole("button", { name: "Delete habit" });
		await expect(deleteBtn).toBeVisible();

		// Click delete
		await deleteBtn.click();
		await page.waitForTimeout(500);

		// Verify it's gone
		await expect(habitText).not.toBeVisible();
	});
});
