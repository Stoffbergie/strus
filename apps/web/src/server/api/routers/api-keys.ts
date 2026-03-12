import { apiKey } from "@strus/db/schema/index";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const apiKeysRouter = createTRPCRouter({
	list: protectedProcedure.query(async ({ ctx }) => {
		return ctx.db
			.select({
				id: apiKey.id,
				keyPrefix: apiKey.keyPrefix,
				name: apiKey.name,
				createdAt: apiKey.createdAt,
			})
			.from(apiKey)
			.where(eq(apiKey.userId, ctx.userId));
	}),

	create: protectedProcedure
		.input(z.object({ name: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const rawKey = `strus_${crypto.randomUUID().replace(/-/g, "")}`;
			const prefix = rawKey.slice(0, 12);
			const encoder = new TextEncoder();
			const data = encoder.encode(rawKey);
			const hashBuffer = await crypto.subtle.digest("SHA-256", data);
			const hashArray = Array.from(new Uint8Array(hashBuffer));
			const keyHash = hashArray
				.map((b) => b.toString(16).padStart(2, "0"))
				.join("");

			await ctx.db.insert(apiKey).values({
				id: crypto.randomUUID(),
				userId: ctx.userId,
				keyHash,
				keyPrefix: prefix,
				name: input.name,
			});

			return { key: rawKey, prefix };
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db
				.delete(apiKey)
				.where(and(eq(apiKey.id, input.id), eq(apiKey.userId, ctx.userId)));

			return { success: true };
		}),
});
