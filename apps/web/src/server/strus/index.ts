import { env } from "@strus/env";
import { StrusClient } from "strus-middleware";
import { strusNextjs } from "strus-middleware/nextjs";

const strus = new StrusClient({
	apiKey: env.STRUS_API_KEY ?? "",
	enabled: !!env.STRUS_API_KEY,
});

export const { wrapHandler } = strusNextjs(strus);
