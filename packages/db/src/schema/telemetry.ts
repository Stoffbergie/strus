import { relations } from "drizzle-orm";
import { integer, jsonb, real, text, timestamp } from "drizzle-orm/pg-core";
import { endpoint } from "./endpoints";
import { pgIndex, pgTable } from "./helpers";

export const telemetryEvent = pgTable(
	"telemetry_event",
	{
		id: text("id").primaryKey(),
		endpointId: text("endpoint_id")
			.notNull()
			.references(() => endpoint.id, { onDelete: "cascade" }),
		userId: text("user_id").notNull(),
		statusCode: integer("status_code").notNull(),
		metadata: jsonb("metadata").notNull(),
		idempotencyKey: text("idempotency_key").unique(),
		receivedAt: timestamp("received_at").defaultNow().notNull(),
	},
	(table) => [
		pgIndex("telemetry_event_userId_endpointId_receivedAt_idx").on(
			table.userId,
			table.endpointId,
			table.receivedAt,
		),
		pgIndex("telemetry_event_receivedAt_idx").on(table.receivedAt),
	],
);

export const telemetryAggregate = pgTable(
	"telemetry_aggregate",
	{
		id: text("id").primaryKey(),
		endpointId: text("endpoint_id")
			.notNull()
			.references(() => endpoint.id, { onDelete: "cascade" }),
		userId: text("user_id").notNull(),
		windowStart: timestamp("window_start").notNull(),
		windowEnd: timestamp("window_end").notNull(),
		eventCount: integer("event_count").notNull(),
		errorCount: integer("error_count").notNull(),
		errorRate: real("error_rate").notNull(),
		nullRates: jsonb("null_rates").notNull(),
		enumDistributions: jsonb("enum_distributions").notNull(),
		arrayCardinalities: jsonb("array_cardinalities").notNull(),
		observedValues: jsonb("observed_values").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		pgIndex("telemetry_aggregate_userId_endpointId_window_idx").on(
			table.userId,
			table.endpointId,
			table.windowStart,
		),
	],
);

export const telemetryEventRelations = relations(telemetryEvent, ({ one }) => ({
	endpoint: one(endpoint, {
		fields: [telemetryEvent.endpointId],
		references: [endpoint.id],
	}),
}));

export const telemetryAggregateRelations = relations(
	telemetryAggregate,
	({ one }) => ({
		endpoint: one(endpoint, {
			fields: [telemetryAggregate.endpointId],
			references: [endpoint.id],
		}),
	}),
);
