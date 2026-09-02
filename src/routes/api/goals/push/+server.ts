import { json } from "@sveltejs/kit";
import {
	deletePushSubscription,
	savePushSubscription,
} from "$lib/server/db";
import { getVapidPublicKey } from "$lib/server/vapid";

export function GET() {
	return json({ publicKey: getVapidPublicKey() });
}

export async function POST({ request }) {
	const body = await request.json();
	if (!body.subscription?.endpoint) {
		return json({ error: "missing subscription" }, { status: 400 });
	}
	savePushSubscription(
		body.subscription.endpoint,
		JSON.stringify(body.subscription.keys),
		body.tzOffsetMinutes ?? 0,
	);
	return json({ ok: true });
}

export async function DELETE({ request }) {
	const body = await request.json();
	if (body.endpoint) deletePushSubscription(body.endpoint);
	return json({ ok: true });
}