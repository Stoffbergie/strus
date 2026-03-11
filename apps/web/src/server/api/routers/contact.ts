import { contactSubmission } from "@strus/db/schema/index";
import {
	ContactConfirmationEmail,
	ContactFormEmail,
	getResend,
} from "@strus/email";
import { env } from "@strus/env";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const contactRouter = createTRPCRouter({
	submit: publicProcedure
		.input(
			z.object({
				name: z.string().min(1),
				email: z.string().email(),
				company: z.string().min(1),
				message: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await ctx.db.insert(contactSubmission).values({
				id: crypto.randomUUID(),
				name: input.name,
				email: input.email,
				company: input.company,
				message: input.message ?? null,
			});

			const resend = getResend();

			const [notification, confirmation] = await Promise.all([
				resend.emails.send({
					from: "Strus <hello@mail.strus.io>",
					to: [env.CONTACT_EMAIL],
					replyTo: input.email,
					subject: `New inquiry from ${input.name} at ${input.company}`,
					react: ContactFormEmail({
						name: input.name,
						email: input.email,
						company: input.company,
						message: input.message,
					}),
				}),
				resend.emails.send({
					from: "Strus <hello@mail.strus.io>",
					to: [input.email],
					replyTo: env.CONTACT_EMAIL,
					subject: "We received your inquiry",
					react: ContactConfirmationEmail({
						name: input.name,
					}),
				}),
			]);

			if (notification.error) {
				throw new Error(
					`Failed to send notification email: ${notification.error.message}`,
				);
			}
			if (confirmation.error) {
				throw new Error(
					`Failed to send confirmation email: ${confirmation.error.message}`,
				);
			}

			return { success: true };
		}),
});
