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
	async redirects() {
		return [
			{
				source: "/login",
				destination: "/changes",
				permanent: false,
			},
			{
				source: "/dashboard",
				destination: "/changes",
				permanent: false,
			},
		];
	},
};

export default config;
