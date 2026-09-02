import webpush from "web-push";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const vapidPath = path.join(process.cwd(), "data", "vapid.json");

export function getVapidKeys() {
	if (existsSync(vapidPath)) {
		return JSON.parse(readFileSync(vapidPath, "utf8"));
	}
	const keys = webpush.generateVAPIDKeys();
	const dir = path.dirname(vapidPath);
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	writeFileSync(vapidPath, JSON.stringify(keys, null, 2), { mode: 0o600 });
	return keys;
}

export function getVapidPublicKey() {
	return getVapidKeys().publicKey;
}