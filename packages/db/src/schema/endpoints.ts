import { integer, text, timestamp } from "drizzle-orm/pg-core";
import { pgIndex, pgTable, pgUniqueIndex } from "./helpers";

export const endpoint = pgTable(
	"endpoint",
	{
		id: text("id").primaryKey(),
		userId: text("user_id").notNull(),
		method: text("method").notNull(),
		routePattern: text("route_pattern").notNull(),
		firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
		lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
		eventCount: integer("event_count").default(0).notNull(),
	},
	(table) => [
		pgIndex("endpoint_userId_idx").on(table.userId),
		pgUniqueIndex("endpoint_userId_method_route_idx").on(
			table.userId,
			table.method,
			table.routePattern,
		),
	],
);
