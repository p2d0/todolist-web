import { Capacitor } from "@capacitor/core";
import {
	ForegroundService,
	Importance,
} from "@capawesome-team/capacitor-android-foreground-service";
import { get } from "svelte/store";
import { habitsStore, timerStore } from "./timer.js";

let notifListener = null;
let updateInterval = null;

function formatTime(seconds) {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export async function initTimerNotification() {
	if (!Capacitor.isNativePlatform("android")) return;

	try {
		await ForegroundService.requestPermissions();
	} catch (e) {
		console.error("Permission request failed:", e);
	}

	notifListener = ForegroundService.addListener("buttonClicked", (data) => {
		if (data.id === 1) {
			timerStore.stop();
			ForegroundService.stopForegroundService();
		}
	});

	ForegroundService.addListener("notificationTapped", () => {
		ForegroundService.moveToForeground();
	});

	timerStore.subscribe(async (state) => {
		console.log("[notif] state changed:", JSON.stringify(state));
		try {
			if (state.running) {
				const habits = get(habitsStore);
				const habit = habits.find((h) => h.id === state.activeHabitId);
				const title = habit ? habit.description : "PomoTasker";
				const elapsed = state.startTime
					? Math.floor((Date.now() - state.startTime) / 1000) +
						state.elapsedBefore
					: state.elapsedBefore || 0;

				await ForegroundService.createNotificationChannel({
					id: "timer",
					name: "Timer",
					description: "Timer notification",
					importance: Importance.Default,
				});
				console.log("[notif] channel created");

				await ForegroundService.startForegroundService({
					id: 1,
					title,
					body: `Running: ${formatTime(elapsed)}`,
					serviceType: 32,
					smallIcon: "ic_stat_icon_config_sample",
					buttons: [{ title: "Stop", id: 1 }],
					silent: false,
					notificationChannelId: "timer",
				});
				console.log("[notif] service started!");

				updateInterval = setInterval(async () => {
					const s = get(timerStore);
					if (!s.running) {
						clearInterval(updateInterval);
						ForegroundService.stopForegroundService();
						return;
					}
					const e = s.startTime
						? Math.floor((Date.now() - s.startTime) / 1000) + s.elapsedBefore
						: s.elapsedBefore || 0;
					await ForegroundService.updateForegroundService({
						id: 1,
						body: `Running: ${formatTime(e)}`,
						smallIcon: "ic_stat_icon_config_sample",
					});
				}, 1000);
			} else {
				if (updateInterval) clearInterval(updateInterval);
				await ForegroundService.stopForegroundService();
			}
		} catch (e) {
			console.error("Notification error:", e);
		}
	});
}

export function cleanupTimerNotification() {
	if (notifListener) {
		notifListener.remove();
		notifListener = null;
	}
	if (updateInterval) clearInterval(updateInterval);
}
