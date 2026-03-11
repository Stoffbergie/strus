import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";
import { TABLE_PREFIX } from "./src/schema/helpers";

dotenv.config({
	path: "../../apps/web/.env",
});

const url = new URL(process.env.DATABASE_URL || "");
const sslmode = url.searchParams.get("sslmode");

export default defineConfig({
	schema: "./src/schema",
	out: "./src/migrations",
	dialect: "postgresql",
	dbCredentials: {
		host: url.hostname,
		port: Number(url.port) || 5432,
		user: decodeURIComponent(url.username),
		password: decodeURIComponent(url.password),
		database: url.pathname.slice(1),
		ssl: sslmode === "verify-full" ? "verify-full" : false,
	},
	tablesFilter: [`${TABLE_PREFIX}_*`],
});
