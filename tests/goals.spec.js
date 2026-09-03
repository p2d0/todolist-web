import { expect, test } from "@playwright/test";

const BASE_URL = process.env.APP_URL || "https://ug.kyrgyzstan.kg/pomotask";
const stamp = Date.now();

test.describe("PomoTasker Goals", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(BASE_URL);
		await page.waitForTimeout(500);
		await page.evaluate(() => {
			window.confirm = () => true;
		});
	});

	test.afterEach(async ({ page }) => {
		// Cleanup: delete goals created by this test run via API
		await page.goto(BASE_URL);
		await page.waitForTimeout(500);
		await page.evaluate(async (marker) => {
			const res = await fetch("/pomotask/api/goals");
			const goals = await res.json();
			for (const g of goals) {
				if (g.title.includes(marker)) {
					await fetch(`/pomotask/api/goals/${g.id}`, { method: "DELETE" });
				}
			}
		}, `goal-e2e-${stamp}`);
		await page.waitForTimeout(300);
	});

	test("add a goal, mark complete, it moves to completed section", async ({ page }) => {
		const title = `goal-e2e-${stamp}-done`;
		await page.getByRole("button", { name: "Goals" }).click();
		await page.waitForTimeout(300);

		// FAB opens the Add Goal dialog
		await page.getByRole("button", { name: "Add habit" }).click();
		await page.waitForTimeout(300);
		const titleInput = page.getByRole("textbox", { name: "Title" });
		await expect(titleInput).toBeVisible();
		await titleInput.fill(title);
		await page.getByRole("textbox", { name: "Description" }).fill("test description");
		await page.locator(".submit-btn").click();
		await page.locator(".dialog").waitFor({ state: "hidden" });
		await page.waitForTimeout(500);

		const card = page.locator(".goal-card").filter({ hasText: title });
		await expect(card).toBeVisible();

		// Complete → moves to Completed section
		await card.getByRole("button", { name: "Complete" }).click();
		await page.waitForTimeout(500);
		const completedCard = page
			.locator(".goal-section", { hasText: "Completed" })
			.locator(".goal-card")
			.filter({ hasText: title });
		await expect(completedCard).toBeVisible();
		const activeSection = page.locator(".goal-section", { hasText: "Active" });
		await expect(activeSection.filter({ has: page.locator(`.goal-card:has-text("${title}")`) })).toHaveCount(0);
	});

	test("overdue goal shows overdue badge; reopen works", async ({ page }) => {
		const title = `goal-e2e-${stamp}-overdue`;
		await page.getByRole("button", { name: "Goals" }).click();
		await page.waitForTimeout(300);

		await page.getByRole("button", { name: "Add habit" }).click();
		await page.waitForTimeout(300);
		await page.getByRole("textbox", { name: "Title" }).fill(title);
		await page.locator('input[type="date"]').fill("2000-01-01");
		await page.locator(".submit-btn").click();
		await page.locator(".dialog").waitFor({ state: "hidden" });
		await page.waitForTimeout(500);

		const card = page.locator(".goal-card").filter({ hasText: title });
		await expect(card.locator(".overdue-badge")).toBeVisible();

		// Complete + Reopen returns it to active
		await card.getByRole("button", { name: "Complete" }).click();
		await page.waitForTimeout(500);
		const completedCard = page
			.locator(".goal-section", { hasText: "Completed" })
			.locator(".goal-card")
			.filter({ hasText: title });
		await completedCard.getByRole("button", { name: "Reopen" }).click();
		await page.waitForTimeout(500);
		const reopened = page.locator(".goal-card").filter({ hasText: title });
		await expect(reopened).toBeVisible();
		await expect(reopened.locator(".overdue-badge")).toBeVisible();
	});

	test("archive a goal, restore from archived view", async ({ page }) => {
		const title = `goal-e2e-${stamp}-archived`;
		await page.getByRole("button", { name: "Goals" }).click();
		await page.waitForTimeout(300);

		await page.getByRole("button", { name: "Add habit" }).click();
		await page.waitForTimeout(300);
		await page.getByRole("textbox", { name: "Title" }).fill(title);
		await page.locator(".submit-btn").click();
		await page.locator(".dialog").waitFor({ state: "hidden" });
		await page.waitForTimeout(500);

		const card = page.locator(".goal-card").filter({ hasText: title });
		await card.getByRole("button", { name: "🗄" }).click();
		await page.waitForTimeout(500);
		await expect(card).not.toBeVisible();

		// Archived view
		await page.getByRole("button", { name: "📁 Show archived" }).click();
		await page.waitForTimeout(500);
		const archivedCard = page.locator(".goal-card").filter({ hasText: title });
		await expect(archivedCard).toBeVisible();
		await archivedCard.getByRole("button", { name: "Restore" }).click();
		await page.waitForTimeout(500);
		await expect(page.locator(".goal-card").filter({ hasText: title })).toBeVisible();
	});

	test("numbered goal: counter updates per-day and progress", async ({ page }) => {
		const title = `goal-e2e-${stamp}-numbered`;
		await page.getByRole("button", { name: "Goals" }).click();
		await page.waitForTimeout(300);

		await page.getByRole("button", { name: "Add habit" }).click();
		await page.waitForTimeout(300);
		await page.getByRole("textbox", { name: "Title" }).fill(title);
		await page.getByRole("combobox", { name: "Type" }).selectOption("numbered");
		const due = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
		await page.locator('.dialog input[type="date"]').fill(due);
		const nums = page.locator('.dialog input[type="number"]');
		await nums.nth(0).fill("0");
		await nums.nth(1).fill("5");
		await page.locator(".submit-btn").click();
		await page.locator(".dialog").waitFor({ state: "hidden" });
		await page.waitForTimeout(500);

		const card = page.locator(".goal-card").filter({ hasText: title });
		await expect(card).toBeVisible();
		await expect(card.locator(".counter-input")).toBeVisible();
		await expect(card.locator(".counter-target")).toContainText("5");
		// start 0 → target 5, due in 3 days: runway 4 → ceil(5/4) = 2/day, progress 0%
		await expect(card.locator(".goal-due")).toContainText("2/day");
		await expect(card.locator(".progress-fill")).toHaveAttribute("style", /width:\s*0%/);

		// + → current 1 → 4 left → ceil(4/4) = 1/day, progress 20%
		await card.getByRole("button", { name: "+" }).click();
		await page.waitForTimeout(500);
		await expect(card.locator(".goal-due")).toContainText("1/day");
		await expect(card.locator(".progress-fill")).toHaveAttribute("style", /width:\s*20%/);

		// Edit start 0 → 100: counter resets to 100, per-day + progress recompute
		await card.getByRole("button", { name: "Edit" }).click();
		await page.waitForTimeout(300);
		const nums2 = page.locator('.dialog input[type="number"]');
		await nums2.nth(0).fill("100");
		await page.locator(".submit-btn").click();
		await page.locator(".dialog").waitFor({ state: "hidden" });
		await page.waitForTimeout(500);
		// 100 → 5: 95 left over runway 4 → 24/day, progress 0%
		await expect(card.locator(".counter-input")).toHaveValue("100");
		await expect(card.locator(".goal-due")).toContainText("24/day");
		await expect(card.locator(".progress-fill")).toHaveAttribute("style", /width:\s*0%/);
	});
});