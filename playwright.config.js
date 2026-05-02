import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./tests",
	timeout: 30000,
	expect: { timeout: 5000 },
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: 1,
	reporter: "list",
	use: {
		baseURL: process.env.APP_URL || "https://ug.kyrgyzstan.kg/pomotask",
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
	},
	projects: [
		{
			name: "firefox",
			use: { ...devices["Desktop Firefox"], browserName: "firefox" },
		},
	],
});
