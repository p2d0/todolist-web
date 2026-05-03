import { Capacitor } from "@capacitor/core";
import {
	ForegroundService,
	Importance,
} from "@capawesome-team/capacitor-android-foreground-service";
import { get } from "svelte/store";
import { habitsStore, timerStore } from "./timer.js";

let buttonListener = null;
let tapListener = null;
let updateInterval = null;
let serviceRunning = false;
let isProcessing = false;
let pendingState = null;

function formatTime(seconds) {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

async function processState(state) {
	if (isProcessing) {
		pendingState = state;
		return;
	}
	isProcessing = true;
	try {
		if (state.running) {
			// Only start the foreground service if not already running
			if (!serviceRunning) {
				const habits = get(habitsStore);
				const habit = habits.find((h) => h.id === state.activeHabitId);
				const title = habit ? habit.description : "PomoTasker";
				const elapsed = state.startTime
					? Math.floor((Date.now() - state.startTime) / 1000) +
						state.elapsedBefore
					: state.elapsedBefore || 0;

				try {
					await ForegroundService.createNotificationChannel({
						id: "timer",
						name: "Timer",
						description: "Timer notification",
						importance: Importance.Default,
					});
				} catch (e) {
					// channel may already exist
				}

				await ForegroundService.startForegroundService({
					id: 1,
					title,
					body: `Running: ${formatTime(elapsed)}`,
					smallIcon: "ic_stat_icon_config_sample",
					buttons: [{ title: "Stop", id: 1 }],
					silent: false,
					notificationChannelId: "timer",
				});

				serviceRunning = true;

				// Start the update interval
				if (updateInterval) clearInterval(updateInterval);
				updateInterval = setInterval(async () => {
					const s = get(timerStore);
					if (!s.running || !serviceRunning) {
						clearInterval(updateInterval);
						updateInterval = null;
						return;
					}
					const e = s.startTime
						? Math.floor((Date.now() - s.startTime) / 1000) + s.elapsedBefore
						: s.elapsedBefore || 0;
					try {
						await ForegroundService.updateForegroundService({
							id: 1,
							body: `Running: ${formatTime(e)}`,
							smallIcon: "ic_stat_icon_config_sample",
							buttons: [{ title: "Stop", id: 1 }],
							notificationChannelId: "timer",
							silent: true,
						});
					} catch (e) {
						console.error("Update notification error:", e);
					}
				}, 1000);
			}
		} else {
			// Stop the foreground service if running
			if (serviceRunning) {
				serviceRunning = false;
				if (updateInterval) {
					clearInterval(updateInterval);
					updateInterval = null;
				}
				try {
					await ForegroundService.stopForegroundService();
				} catch (e) {
					// ignore
				}
			}
		}
	} catch (e) {
		console.error("Notification error:", e);
	} finally {
		isProcessing = false;
		if (pendingState !== null) {
			const next = pendingState;
			pendingState = null;
			await processState(next);
		}
	}
}

export async function initTimerNotification() {
	if (!Capacitor.isNativePlatform("android")) return;

	try {
		await ForegroundService.requestPermissions();
	} catch (e) {
		console.error("Permission request failed:", e);
	}

	buttonListener = ForegroundService.addListener("buttonClicked", (data) => {
		if (data.id === 1) {
			timerStore.stop();
		}
	});

	tapListener = ForegroundService.addListener("notificationTapped", () => {
		ForegroundService.moveToForeground();
	});

	timerStore.subscribe((state) => {
		processState(state);
	});
}

export function cleanupTimerNotification() {
	if (buttonListener) {
		buttonListener.remove();
		buttonListener = null;
	}
	if (tapListener) {
		tapListener.remove();
		tapListener = null;
	}
	if (updateInterval) {
		clearInterval(updateInterval);
		updateInterval = null;
	}
	serviceRunning = false;
}
