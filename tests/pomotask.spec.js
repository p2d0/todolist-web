import { expect, test } from "@playwright/test";

const BASE_URL = process.env.APP_URL || "https://ug.kyrgyzstan.kg/pomotask";

test.describe("PomoTasker Habits", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(BASE_URL);
		await page.waitForTimeout(500);
		// Override confirm dialogs so delete/archive proceed without blocking
		await page.evaluate(() => {
			window.confirm = () => true;
		});
	});

	test("add a timer habit", async ({ page }) => {
		await page.getByRole("button", { name: "Add habit" }).click();
		await page.waitForTimeout(300);

		const nameInput = page.getByRole("textbox", { name: "Name" });
		await expect(nameInput).toBeVisible();
		await nameInput.fill("Test Timer Habit");

		await page.getByRole("combobox", { name: "Type" }).selectOption("timer");

		await page.locator(".submit-btn").click();
		await page.locator(".dialog").waitFor({ state: "hidden" });
		await page.waitForTimeout(500);

		const habitRow = page.locator(".habit-row").filter({ hasText: "Test Timer Habit" });
		await expect(habitRow).toBeVisible();
	});

	test("add and toggle a yes/no habit", async ({ page }) => {
		await page.getByRole("button", { name: "Add habit" }).click();
		await page.waitForTimeout(300);

		const nameInput = page.getByRole("textbox", { name: "Name" });
		await nameInput.fill("Test Yes/No Habit");

		await page.getByRole("combobox", { name: "Type" }).selectOption("boolean");

		await page.locator(".submit-btn").click();
		await page.locator(".dialog").waitFor({ state: "hidden" });
		await page.waitForTimeout(500);

		const habitRow = page.locator(".habit-row").filter({ hasText: "Test Yes/No Habit" });
		await expect(habitRow).toBeVisible();

		const todayCircle = habitRow.locator(".circle-today");
		await expect(todayCircle).toBeVisible();

		// Toggle ON
		await todayCircle.click();
		await page.waitForTimeout(500);
		await expect(todayCircle).toHaveClass(/circle-complete/);

		// Toggle OFF
		await todayCircle.click();
		await page.waitForTimeout(500);
		await expect(todayCircle).not.toHaveClass(/circle-complete/);
	});

	test("start timer on a timer habit", async ({ page }) => {
		await page.getByRole("button", { name: "Add habit" }).click();
		await page.waitForTimeout(300);

		const nameInput = page.getByRole("textbox", { name: "Name" });
		await nameInput.fill("Test Timer Habit 2");

		await page.getByRole("combobox", { name: "Type" }).selectOption("timer");
		await page.locator(".submit-btn").click();
		await page.locator(".dialog").waitFor({ state: "hidden" });
		await page.waitForTimeout(500);

		const habitRow = page.locator(".habit-row").filter({ hasText: "Test Timer Habit 2" });
		const todayCircle = habitRow.locator(".circle-today");

		await expect(todayCircle).not.toHaveClass(/circle-active/);

		// Click play button to start timer
		const playButton = habitRow.getByRole("button", { name: "Start/stop timer" });
		await expect(playButton).toBeVisible();
		await playButton.click();
		await page.waitForTimeout(1000);

		await expect(todayCircle).toHaveClass(/circle-active/);

		// Stop the timer via play button
		const stopButton = habitRow.getByRole("button", { name: "Start/stop timer" });
		await stopButton.click();
		await page.waitForTimeout(1000);

		await expect(todayCircle).not.toHaveClass(/circle-active/);
		await expect(todayCircle).toHaveClass(/circle-complete/);
	});

	test("remove a habit", async ({ page }) => {
		await page.getByRole("button", { name: "Add habit" }).click();
		await page.waitForTimeout(300);

		const nameInput = page.getByRole("textbox", { name: "Name" });
		await nameInput.fill("Delete Me Habit");

		await page.getByRole("combobox", { name: "Type" }).selectOption("boolean");
		await page.locator(".submit-btn").click();
		await page.locator(".dialog").waitFor({ state: "hidden" });
		await page.waitForTimeout(500);

		const habitRow = page.locator(".habit-row").filter({ hasText: "Delete Me Habit" });
		await expect(habitRow).toBeVisible();

		const deleteBtn = habitRow.getByRole("button", { name: "Delete habit" });
		await expect(deleteBtn).toBeVisible();
		await deleteBtn.click();
		await page.waitForTimeout(1000);

		await expect(habitRow).not.toBeVisible();
	});
});
