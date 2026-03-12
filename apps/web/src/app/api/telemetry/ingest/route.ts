import { db } from "@strus/db";
import { apiKey, endpoint, telemetryEvent } from "@strus/db/schema/index";
import { and, eq, isNull, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const eventSchema = z.object({
	endpointId: z.string(),
	statusCode: z.number().int(),
	metadata: z.unknown(),
	idempotencyKey: z.string().optional(),
});

const ingestSchema = z.object({
	events: z.array(eventSchema).min(1).max(1000),
});

async function hashKey(raw: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(raw);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: NextRequest) {
	const authHeader = req.headers.get("authorization");
	const rawKey = authHeader?.startsWith("Bearer ")
		? authHeader.slice(7)
		: req.headers.get("x-api-key");

	if (!rawKey) {
		return NextResponse.json({ error: "Missing API key" }, { status: 401 });
	}
	const keyHash = await hashKey(rawKey);

	const [keyRow] = await db
		.select({ userId: apiKey.userId })
		.from(apiKey)
		.where(and(eq(apiKey.keyHash, keyHash), isNull(apiKey.revokedAt)))
		.limit(1);

	if (!keyRow) {
		return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
	}

	const body = await req.json();
	const parsed = ingestSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid payload", details: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	const { events } = parsed.data;
	const userId = keyRow.userId;

	const endpointUpdates = new Map<
		string,
		{ method: string; routePattern: string; count: number }
	>();

	for (const event of events) {
		const existing = endpointUpdates.get(event.endpointId);
		if (existing) {
			existing.count++;
		} else {
			const spaceIdx = event.endpointId.indexOf(" ");
			const method =
				spaceIdx > 0 ? event.endpointId.slice(0, spaceIdx) : "UNKNOWN";
			const routePattern =
				spaceIdx > 0 ? event.endpointId.slice(spaceIdx + 1) : event.endpointId;
			endpointUpdates.set(event.endpointId, { method, routePattern, count: 1 });
		}
	}

	for (const [endpointId, info] of endpointUpdates) {
		await db
			.insert(endpoint)
			.values({
				id: endpointId,
				userId,
				method: info.method,
				routePattern: info.routePattern,
				lastSeenAt: new Date(),
				eventCount: info.count,
			})
			.onConflictDoUpdate({
				target: endpoint.id,
				set: {
					lastSeenAt: new Date(),
					eventCount: sql`${endpoint.eventCount} + ${info.count}`,
				},
			});
	}

	const rows = events.map((event) => ({
		id: crypto.randomUUID(),
		endpointId: event.endpointId,
		userId,
		statusCode: event.statusCode,
		metadata: event.metadata,
		idempotencyKey: event.idempotencyKey ?? null,
		receivedAt: new Date(),
	}));

	await db
		.insert(telemetryEvent)
		.values(rows)
		.onConflictDoNothing({ target: telemetryEvent.idempotencyKey });

	return NextResponse.json({ ingested: rows.length });
}
