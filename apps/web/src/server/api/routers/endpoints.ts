import { endpoint } from "@strus/db/schema/index";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const endpointsRouter = createTRPCRouter({
	list: protectedProcedure
		.input(
			z
				.object({
					limit: z.number().min(1).max(100).default(50),
					offset: z.number().min(0).default(0),
				})
				.optional(),
		)
		.query(async ({ ctx, input }) => {
			return ctx.db
				.select()
				.from(endpoint)
				.where(eq(endpoint.userId, ctx.userId))
				.orderBy(desc(endpoint.lastSeenAt))
				.limit(input?.limit ?? 50)
				.offset(input?.offset ?? 0);
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
