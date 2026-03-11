import { text, timestamp } from "drizzle-orm/pg-core";
import { pgIndex, pgTable } from "./helpers";

export const apiKey = pgTable(
	"api_key",
	{
		id: text("id").primaryKey(),
		userId: text("user_id").notNull(),
		keyHash: text("key_hash").notNull().unique(),
		keyPrefix: text("key_prefix").notNull(),
		name: text("name").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		revokedAt: timestamp("revoked_at"),
	},
	(table) => [
		pgIndex("api_key_userId_idx").on(table.userId),
		pgIndex("api_key_keyHash_idx").on(table.keyHash),
	],
);
