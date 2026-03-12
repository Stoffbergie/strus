"use client";

import Link from "next/link";

import { api } from "~/trpc/react";
import SetupGuide from "./setup-guide";
import UserMenu from "./user-menu";

export default function OnboardingGate({
	children,
}: {
	children: React.ReactNode;
}) {
	const { data: endpoints, isLoading: endpointsLoading } =
		api.endpoints.list.useQuery();

	const hasEvents = (endpoints?.length ?? 0) > 0;

	if (endpointsLoading) {
		return (
			<div className="flex min-h-svh items-center justify-center bg-white">
				<div className="h-5 w-5 animate-spin rounded-full border-2 border-[#e8e8e8] border-t-[#111]" />
			</div>
		);
	}

	if (!hasEvents) {
		return (
			<div className="min-h-svh bg-white">
				<header className="border-[#e8e8e8] border-b bg-white">
					<div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
						<Link
							href="/changes"
							className="font-bold text-[#111] text-[17px] tracking-tight no-underline"
						>
							strus
						</Link>
						<UserMenu />
					</div>
				</header>
				<main className="mx-auto max-w-3xl px-6 py-10">
					<SetupGuide />
				</main>
			</div>
		);
	}

	return <>{children}</>;
}
