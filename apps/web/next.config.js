import "@strus/env";

/** @type {import("next").NextConfig} */
const config = {
	transpilePackages: [
		"@strus/db",
		"@strus/detect",
		"@strus/email",
		"@strus/env",
		"@strus/ui",
	],
};

export default config;
