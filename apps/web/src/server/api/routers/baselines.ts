import { baseline } from "@strus/db/schema/index";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const baselinesRouter = createTRPCRouter({
	list: protectedProcedure
		.input(
			z.object({
				endpointId: z.string().optional(),
				limit: z.number().min(1).max(100).default(50),
			}),
		)
		.query(async ({ ctx, input }) => {
			const conditions = [
				eq(baseline.userId, ctx.userId),
				eq(baseline.active, true),
			];

			if (input.endpointId) {
				conditions.push(eq(baseline.endpointId, input.endpointId));
			}

			return ctx.db
				.select()
				.from(baseline)
				.where(and(...conditions))
				.orderBy(desc(baseline.createdAt))
				.limit(input.limit);
		}),

	get: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const rows = await ctx.db
				.select()
				.from(baseline)
				.where(eq(baseline.id, input.id))
				.limit(1);

			return rows[0] ?? null;
		}),
});
