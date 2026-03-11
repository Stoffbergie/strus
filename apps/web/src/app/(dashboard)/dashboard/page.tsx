import { withAuth } from "@workos-inc/authkit-nextjs";

import { api, HydrateClient } from "~/trpc/server";

export default async function DashboardPage() {
	const { user } = await withAuth({ ensureSignedIn: true });

	void api.endpoints.list.prefetch();
	void api.shifts.listActive.prefetch();

	return (
		<HydrateClient>
			<div className="mx-auto max-w-5xl p-8">
				<div className="mb-8">
					<h1 className="font-bold text-2xl tracking-tight">Dashboard</h1>
					<p className="text-muted-foreground">
						Welcome back{user.firstName && `, ${user.firstName}`}.
					</p>
				</div>

				<div className="grid gap-6 md:grid-cols-2">
					<div className="rounded-lg border border-border p-6">
						<h2 className="mb-2 font-semibold">Endpoints</h2>
						<p className="text-muted-foreground text-sm">
							Monitored API endpoints will appear here once you integrate the
							Strus middleware.
						</p>
					</div>

					<div className="rounded-lg border border-border p-6">
						<h2 className="mb-2 font-semibold">Active Shifts</h2>
						<p className="text-muted-foreground text-sm">
							Detected structural changes in your API responses will show up
							here.
						</p>
					</div>
				</div>
			</div>
		</HydrateClient>
	);
}
