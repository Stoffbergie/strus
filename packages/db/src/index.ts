import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL is not set");
}

const parsed = new URL(databaseUrl);
const useSSL = parsed.searchParams.get("sslmode") === "verify-full";
parsed.searchParams.delete("sslmode");
parsed.searchParams.delete("sslrootcert");

export const db = drizzle({
	connection: { connectionString: parsed.toString(), ssl: useSSL },
	schema,
});
