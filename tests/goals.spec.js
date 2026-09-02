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
});