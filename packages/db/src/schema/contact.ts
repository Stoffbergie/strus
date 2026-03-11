import { text, timestamp } from "drizzle-orm/pg-core";
import { pgTable } from "./helpers";

export const contactSubmission = pgTable("contact_submission", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull(),
	company: text("company").notNull(),
	message: text("message"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});
