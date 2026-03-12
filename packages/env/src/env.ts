import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	server: {
		DATABASE_URL: z.string().url(),
		WORKOS_API_KEY: z.string().min(1),
		WORKOS_CLIENT_ID: z.string().min(1),
		WORKOS_COOKIE_PASSWORD: z.string().min(32),
		RESEND_API_KEY: z.string().min(1),
		STRUS_API_KEY: z.string().min(1).optional(),
		HMAC_SECRET: z.string().min(32),
		CONTACT_EMAIL: z.string().email().default("dirk@stoffberg.dev"),
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
	},

	client: {
		NEXT_PUBLIC_WORKOS_REDIRECT_URI: z.string().url(),
	},

	runtimeEnv: {
		DATABASE_URL: process.env.DATABASE_URL,
		WORKOS_API_KEY: process.env.WORKOS_API_KEY,
		WORKOS_CLIENT_ID: process.env.WORKOS_CLIENT_ID,
		WORKOS_COOKIE_PASSWORD: process.env.WORKOS_COOKIE_PASSWORD,
		NEXT_PUBLIC_WORKOS_REDIRECT_URI:
			process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI,
		RESEND_API_KEY: process.env.RESEND_API_KEY,
		STRUS_API_KEY: process.env.STRUS_API_KEY,
		HMAC_SECRET: process.env.HMAC_SECRET,
		CONTACT_EMAIL: process.env.CONTACT_EMAIL,
		NODE_ENV: process.env.NODE_ENV,
	},

	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});
