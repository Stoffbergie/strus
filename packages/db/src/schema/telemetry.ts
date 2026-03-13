import { relations } from "drizzle-orm";
import {
	integer,
	jsonb,
	primaryKey,
	real,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { endpoint } from "./endpoints";
import { pgIndex, pgTable, pgUniqueIndex } from "./helpers";

export const telemetryEvent = pgTable(
	"telemetry_event",
	{
		id: text("id").notNull(),
		endpointId: text("endpoint_id")
			.notNull()
			.references(() => endpoint.id, { onDelete: "cascade" }),
		userId: text("user_id").notNull(),
		statusCode: integer("status_code").notNull(),
		durationMs: integer("duration_ms"),
		responseBody: jsonb("response_body"),
		requestBody: jsonb("request_body"),
		metadata: jsonb("metadata"),
		idempotencyKey: text("idempotency_key"),
		receivedAt: timestamp("received_at").defaultNow().notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.id, table.receivedAt] }),
		pgUniqueIndex("telemetry_event_idempotency_key_unique").on(
			table.idempotencyKey,
			table.receivedAt,
		),
		pgIndex("telemetry_event_userId_endpointId_receivedAt_idx").on(
			table.userId,
			table.endpointId,
			table.receivedAt,
		),
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
