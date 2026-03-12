import { connection } from "next/server";

import ApiKeyManager from "~/app/_components/api-keys";
import { api, HydrateClient } from "~/trpc/server";

export default async function SettingsPage() {
	await connection();
	void api.apiKeys.list.prefetch();

	return (
		<HydrateClient>
			<div>
				<div className="mb-8">
					<h1 className="font-bold text-[#111] text-[28px] tracking-[-0.035em]">
						Settings
					</h1>
				</div>

				<div className="space-y-10">
					<ApiKeyManager />
				</div>
			</div>
		</HydrateClient>
	);
}
