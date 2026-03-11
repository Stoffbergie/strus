import { relations } from "drizzle-orm";
import { jsonb, real, text, timestamp } from "drizzle-orm/pg-core";
import { baseline } from "./baselines";
import { endpoint } from "./endpoints";
import { pgIndex, pgTable } from "./helpers";

export const shift = pgTable(
	"shift",
	{
		id: text("id").primaryKey(),
		endpointId: text("endpoint_id")
			.notNull()
			.references(() => endpoint.id, { onDelete: "cascade" }),
		userId: text("user_id").notNull(),
		baselineId: text("baseline_id")
			.notNull()
			.references(() => baseline.id, { onDelete: "cascade" }),
		signalType: text("signal_type", {
			enum: [
				"null_rate",
				"enum_distribution",
				"array_cardinality",
				"error_rate",
				"new_value",
			],
		}).notNull(),
		fieldName: text("field_name"),
		baselineValue: jsonb("baseline_value").notNull(),
		currentValue: jsonb("current_value").notNull(),
		confidence: real("confidence").notNull(),
		detectedAt: timestamp("detected_at").defaultNow().notNull(),
		resolvedAt: timestamp("resolved_at"),
	},
	(table) => [
		pgIndex("shift_userId_endpointId_detectedAt_idx").on(
			table.userId,
			table.endpointId,
			table.detectedAt,
		),
		pgIndex("shift_userId_resolvedAt_idx").on(table.userId, table.resolvedAt),
	],
);

export const shiftRelations = relations(shift, ({ one }) => ({
	endpoint: one(endpoint, {
		fields: [shift.endpointId],
		references: [endpoint.id],
	}),
	baseline: one(baseline, {
		fields: [shift.baselineId],
		references: [baseline.id],
	}),
}));
