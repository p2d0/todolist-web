import { base } from "$app/paths";

function urlBase64ToUint8Array(base64String) {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
	const rawData = atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; i++) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
}

function tzOffsetMinutes() {
	return -new Date().getTimezoneOffset();
}

/**
 * Ensures we have a push subscription on this device. Returns true when
 * notifications are granted AND the subscription is stored server-side.
 */
export async function ensureGoalPush() {
	if (typeof Notification === "undefined") return false;
	if (Notification.permission !== "granted") {
		const perm = await Notification.requestPermission();
		if (perm !== "granted") return false;
	}
	if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

	const vapidRes = await fetch(`${base}/api/goals/push`);
	const { publicKey } = await vapidRes.json();

	const reg = await navigator.serviceWorker.ready;
	let subscription = await reg.pushManager.getSubscription();
	if (!subscription) {
		subscription = await reg.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: urlBase64ToUint8Array(publicKey),
		});
	}

	await fetch(`${base}/api/goals/push`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			subscription: subscription.toJSON(),
			tzOffsetMinutes: tzOffsetMinutes(),
		}),
	});
	return true;
}