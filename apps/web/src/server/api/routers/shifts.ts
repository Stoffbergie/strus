import { shift, shiftVerification } from "@strus/db/schema/index";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const shiftsRouter = createTRPCRouter({
	list: protectedProcedure
		.input(
			z.object({
				status: z.enum(["active", "resolved", "all"]).default("active"),
				limit: z.number().min(1).max(100).default(50),
				offset: z.number().min(0).default(0),
			}),
		)
		.query(async ({ ctx, input }) => {
			const conditions = [eq(shift.userId, ctx.userId)];

			if (input.status === "active") {
				conditions.push(isNull(shift.resolvedAt));
			} else if (input.status === "resolved") {
				conditions.push(isNotNull(shift.resolvedAt));
			}

			return ctx.db
				.select()
				.from(shift)
				.where(and(...conditions))
				.orderBy(desc(shift.detectedAt))
				.limit(input.limit)
				.offset(input.offset);
		}),

	listActive: protectedProcedure.query(async ({ ctx }) => {
		return ctx.db
			.select()
			.from(shift)
			.where(and(eq(shift.userId, ctx.userId), isNull(shift.resolvedAt)));
	}),

	get: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const rows = await ctx.db
				.select()
				.from(shift)
				.where(eq(shift.id, input.id))
				.limit(1);

			return rows[0] ?? null;
		}),

	verify: protectedProcedure
		.input(
			z.object({
				shiftId: z.string(),
				verdict: z.enum(["intended", "unintended"]),
				note: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const id = `sv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

			await ctx.db.insert(shiftVerification).values({
				id,
				shiftId: input.shiftId,
				workosUserId: ctx.userId,
				verdict: input.verdict,
				note: input.note ?? null,
			});

			if (input.verdict === "intended") {
				await ctx.db
					.update(shift)
					.set({ resolvedAt: new Date() })
					.where(eq(shift.id, input.shiftId));
			}

			return { id, verdict: input.verdict };
		}),
});
