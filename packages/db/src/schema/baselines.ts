import { relations } from "drizzle-orm";
import { boolean, integer, jsonb, text, timestamp } from "drizzle-orm/pg-core";
import { endpoint } from "./endpoints";
import { pgIndex, pgTable } from "./helpers";

export const baseline = pgTable(
	"baseline",
	{
		id: text("id").primaryKey(),
		endpointId: text("endpoint_id")
			.notNull()
			.references(() => endpoint.id, { onDelete: "cascade" }),
		userId: text("user_id").notNull(),
		windowStart: timestamp("window_start").notNull(),
		windowEnd: timestamp("window_end").notNull(),
		windowDays: integer("window_days").notNull(),
		signals: jsonb("signals").notNull(),
		version: integer("version").default(1).notNull(),
		active: boolean("active").default(true).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		pgIndex("baseline_userId_endpointId_active_idx").on(
			table.userId,
			table.endpointId,
			table.active,
		),
	],
);

export const baselineRelations = relations(baseline, ({ one }) => ({
	endpoint: one(endpoint, {
		fields: [baseline.endpointId],
		references: [endpoint.id],
	}),
}));
