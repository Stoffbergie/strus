import { index, pgTableCreator, uniqueIndex } from "drizzle-orm/pg-core";

export const TABLE_PREFIX = "strus";

export const pgTable = pgTableCreator((name) => `${TABLE_PREFIX}_${name}`);

export const pgIndex = (name: string) => index(`${TABLE_PREFIX}_${name}`);

export const pgUniqueIndex = (name: string) =>
	uniqueIndex(`${TABLE_PREFIX}_${name}`);
