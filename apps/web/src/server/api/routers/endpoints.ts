import { endpoint } from "@strus/db/schema/index";
import { and, desc, eq, ilike, lt, or } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const endpointsRouter = createTRPCRouter({
	list: protectedProcedure
		.input(
			z
				.object({
					limit: z.number().min(1).max(100).default(50),
					cursor: z.string().optional(),
					search: z.string().optional(),
				})
				.optional(),
		)
		.query(async ({ ctx, input }) => {
			const limit = input?.limit ?? 50;
			const search = input?.search?.trim();

			const conditions = [eq(endpoint.userId, ctx.userId)];

			if (search) {
				conditions.push(
					or(
						ilike(endpoint.routePattern, `%${search}%`),
						ilike(endpoint.method, `%${search}%`),
					)!,
				);
			}

			if (input?.cursor) {
				const cursorRow = await ctx.db
					.select({ lastSeenAt: endpoint.lastSeenAt })
					.from(endpoint)
					.where(eq(endpoint.id, input.cursor))
					.limit(1);

				if (cursorRow[0]) {
					conditions.push(lt(endpoint.lastSeenAt, cursorRow[0].lastSeenAt));
				}
			}

			const rows = await ctx.db
				.select()
				.from(endpoint)
				.where(and(...conditions))
				.orderBy(desc(endpoint.lastSeenAt))
				.limit(limit + 1);

			const hasMore = rows.length > limit;
			const items = hasMore ? rows.slice(0, limit) : rows;
			const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

			return { items, nextCursor };
		}),

	get: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const rows = await ctx.db
				.select()
				.from(endpoint)
				.where(eq(endpoint.id, input.id))
				.limit(1);

			if (rows.length === 0) return null;
			return rows[0]!;
		}),
});
