import { endpoint, telemetryEvent } from "@strus/db/schema/index";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const jsonFilterSchema = z.object({
	path: z.string().min(1),
	value: z.string(),
});

const timeRangeSchema = z.enum(["1h", "6h", "24h", "7d", "30d"]).default("24h");

function getTimeRangeStart(range: z.infer<typeof timeRangeSchema>): Date {
	const now = new Date();
	switch (range) {
		case "1h":
			return new Date(now.getTime() - 60 * 60 * 1000);
		case "6h":
			return new Date(now.getTime() - 6 * 60 * 60 * 1000);
		case "24h":
			return new Date(now.getTime() - 24 * 60 * 60 * 1000);
		case "7d":
			return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
		case "30d":
			return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
	}
}

function getBucketInterval(range: z.infer<typeof timeRangeSchema>): string {
	switch (range) {
		case "1h":
			return "1 minute";
		case "6h":
			return "5 minutes";
		case "24h":
			return "30 minutes";
		case "7d":
			return "6 hours";
		case "30d":
			return "1 day";
	}
}

export const telemetryRouter = createTRPCRouter({
	list: protectedProcedure
		.input(
			z.object({
				endpointId: z.string(),
				timeRange: timeRangeSchema,
				statusCode: z.number().int().optional(),
				jsonFilters: z.array(jsonFilterSchema).optional(),
				limit: z.number().min(1).max(200).default(100),
				cursor: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const ep = await ctx.db
				.select({ userId: endpoint.userId })
				.from(endpoint)
				.where(eq(endpoint.id, input.endpointId))
				.limit(1);

			if (!ep[0] || ep[0].userId !== ctx.userId) {
				return { events: [], nextCursor: undefined };
			}

			const rangeStart = getTimeRangeStart(input.timeRange);

			const conditions = [
				eq(telemetryEvent.endpointId, input.endpointId),
				eq(telemetryEvent.userId, ctx.userId),
				gte(telemetryEvent.receivedAt, rangeStart),
			];

			if (input.statusCode) {
				conditions.push(eq(telemetryEvent.statusCode, input.statusCode));
			}

			if (input.cursor) {
				conditions.push(lte(telemetryEvent.receivedAt, new Date(input.cursor)));
			}

			if (input.jsonFilters?.length) {
				for (const filter of input.jsonFilters) {
					conditions.push(
						sql`${telemetryEvent.metadata}::jsonb #>> string_to_array(${filter.path}, '.') = ${filter.value}`,
					);
				}
			}

			const events = await ctx.db
				.select({
					id: telemetryEvent.id,
					statusCode: telemetryEvent.statusCode,
					durationMs: telemetryEvent.durationMs,
					responseBody: telemetryEvent.responseBody,
					metadata: telemetryEvent.metadata,
					receivedAt: telemetryEvent.receivedAt,
				})
				.from(telemetryEvent)
				.where(and(...conditions))
				.orderBy(desc(telemetryEvent.receivedAt))
				.limit(input.limit + 1);

			let nextCursor: string | undefined;
			if (events.length > input.limit) {
				const last = events.pop();
				if (last) {
					nextCursor = last.receivedAt.toISOString();
				}
			}

			return { events, nextCursor };
		}),

	histogram: protectedProcedure
		.input(
			z.object({
				endpointId: z.string(),
				timeRange: timeRangeSchema,
				statusCode: z.number().int().optional(),
				jsonFilters: z.array(jsonFilterSchema).optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const ep = await ctx.db
				.select({ userId: endpoint.userId })
				.from(endpoint)
				.where(eq(endpoint.id, input.endpointId))
				.limit(1);

			if (!ep[0] || ep[0].userId !== ctx.userId) {
				return { buckets: [] };
			}

			const rangeStart = getTimeRangeStart(input.timeRange);
			const interval = getBucketInterval(input.timeRange);

			const conditions = [
				sql`${telemetryEvent.endpointId} = ${input.endpointId}`,
				sql`${telemetryEvent.userId} = ${ctx.userId}`,
				sql`${telemetryEvent.receivedAt} >= ${rangeStart}`,
			];

			if (input.statusCode) {
				conditions.push(
					sql`${telemetryEvent.statusCode} = ${input.statusCode}`,
				);
			}

			if (input.jsonFilters?.length) {
				for (const filter of input.jsonFilters) {
					conditions.push(
						sql`${telemetryEvent.metadata}::jsonb #>> string_to_array(${filter.path}, '.') = ${filter.value}`,
					);
				}
			}

			const result = await ctx.db.execute(sql`
				WITH series AS (
					SELECT generate_series(
						date_trunc('hour', ${rangeStart}::timestamptz),
						now(),
						${interval}::interval
					) AS bucket
				),
				events AS (
					SELECT
						date_trunc('hour', ${telemetryEvent.receivedAt})
							+ (EXTRACT(EPOCH FROM (${telemetryEvent.receivedAt} - date_trunc('hour', ${telemetryEvent.receivedAt})))::int
								/ EXTRACT(EPOCH FROM ${interval}::interval)::int)
							* ${interval}::interval AS bucket,
						${telemetryEvent.statusCode} AS status_code
					FROM ${telemetryEvent}
					WHERE ${and(...conditions)}
				)
				SELECT
					s.bucket,
					COUNT(e.bucket)::int AS count,
					COUNT(e.bucket) FILTER (WHERE e.status_code >= 400)::int AS error_count
				FROM series s
				LEFT JOIN events e ON e.bucket = s.bucket
				GROUP BY s.bucket
				ORDER BY s.bucket ASC
			`);

			const buckets = (
				result.rows as { bucket: string; count: number; error_count: number }[]
			).map((row) => ({
				bucket: new Date(row.bucket).toISOString(),
				count: Number(row.count),
				errorCount: Number(row.error_count),
			}));

			return { buckets };
		}),

	statusCodes: protectedProcedure
		.input(
			z.object({
				endpointId: z.string(),
				timeRange: timeRangeSchema,
			}),
		)
		.query(async ({ ctx, input }) => {
			const rangeStart = getTimeRangeStart(input.timeRange);

			const result = await ctx.db
				.select({
					statusCode: telemetryEvent.statusCode,
					count: sql<number>`COUNT(*)::int`,
				})
				.from(telemetryEvent)
				.where(
					and(
						eq(telemetryEvent.endpointId, input.endpointId),
						eq(telemetryEvent.userId, ctx.userId),
						gte(telemetryEvent.receivedAt, rangeStart),
					),
				)
				.groupBy(telemetryEvent.statusCode)
				.orderBy(telemetryEvent.statusCode);

			return result;
		}),
});
