import { relations } from "drizzle-orm";
import { text, timestamp } from "drizzle-orm/pg-core";
import { pgIndex, pgTable } from "./helpers";
import { shift } from "./shifts";

export const shiftVerification = pgTable(
	"shift_verification",
	{
		id: text("id").primaryKey(),
		shiftId: text("shift_id")
			.notNull()
			.references(() => shift.id, { onDelete: "cascade" }),
		workosUserId: text("workos_user_id").notNull(),
		verdict: text("verdict", {
			enum: ["intended", "unintended"],
		}).notNull(),
		note: text("note"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [pgIndex("shift_verification_shiftId_idx").on(table.shiftId)],
);

export const shiftVerificationRelations = relations(
	shiftVerification,
	({ one }) => ({
		shift: one(shift, {
			fields: [shiftVerification.shiftId],
			references: [shift.id],
		}),
	}),
);
