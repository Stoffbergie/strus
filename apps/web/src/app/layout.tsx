import "~/styles/globals.css";

import { Toaster } from "@strus/ui/components/sonner";

import { AuthKitProvider } from "@workos-inc/authkit-nextjs/components";
import type { Metadata } from "next";

import { NuqsAdapter } from "nuqs/adapters/next/app";

import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
	title: "Strus | Behavioral monitoring for regulated software",
	description:
		"Strus learns how your system behaves and alerts when something shifts. API responses, data quality, UI behavior. PHI free. Open source. Built for healthcare and finance.",
	icons: {
		icon: [
			{ url: "/favicon.ico", sizes: "32x32" },
			{ url: "/favicon.svg", type: "image/svg+xml" },
		],
		apple: "/apple-touch-icon.png",
	},
	manifest: "/site.webmanifest",
	openGraph: {
		type: "website",
		url: "https://strus.io",
		title: "Strus | Behavioral monitoring for regulated software",
		description:
			"Strus learns how your system behaves and alerts when something shifts. API responses, data quality, UI behavior. PHI free. Open source. Built for healthcare and finance.",
		siteName: "Strus",
		locale: "en_US",
	},
	twitter: {
		card: "summary",
		title: "Strus | Behavioral monitoring for regulated software",
		description:
			"Strus learns how your system behaves and alerts when something shifts. API responses, data quality, UI behavior. PHI free. Open source. Built for healthcare and finance.",
	},
	alternates: {
		canonical: "https://strus.io",
	},
};

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" className="overscroll-none">
			<body className="overscroll-none">
				<NuqsAdapter>
					<AuthKitProvider>
						<TRPCReactProvider>{children}</TRPCReactProvider>
					</AuthKitProvider>
				</NuqsAdapter>
				<Toaster />
			</body>
		</html>
	);
}
