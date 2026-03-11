"use client";

import { useAuth } from "@workos-inc/authkit-nextjs/components";

import ApiKeyManager from "~/app/_components/api-key-manager";

export default function SettingsPage() {
	const { user } = useAuth();

	return (
		<div>
			<div className="mb-8">
				<h1 className="font-bold text-[#111] text-[28px] tracking-[-0.035em]">
					Settings
				</h1>
			</div>

			<div className="space-y-10">
				<section>
					<div className="mb-2 font-semibold text-[#bbb] text-[11px] uppercase tracking-[0.15em]">
						API Keys
					</div>
					<p className="mb-4 text-[#999] text-[13px]">
						Keys for the middleware library to authenticate with the ingestion
						endpoint.
					</p>
					<ApiKeyManager />
				</section>

				<section>
					<div className="mb-4 font-semibold text-[#bbb] text-[11px] uppercase tracking-[0.15em]">
						Account
					</div>
					<div className="rounded-xl border border-[#e8e8e8] bg-[#fafafa] p-5">
						<p className="font-medium text-[#111] text-[14px]">
							{user?.firstName} {user?.lastName}
						</p>
						<p className="mt-1 text-[#999] text-[13px]">{user?.email}</p>
					</div>
				</section>
			</div>
		</div>
	);
}
