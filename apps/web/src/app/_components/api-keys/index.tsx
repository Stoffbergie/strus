"use client";

import { Suspense } from "react";
import { CreateDialog } from "./create-dialog";
import { KeyList, KeyListSkeleton } from "./key-list";

export default function ApiKeyManager() {
	return (
		<section className="space-y-4">
			<div className="flex items-start justify-between">
				<div>
					<div className="mb-2 font-semibold text-[#bbb] text-[11px] uppercase tracking-[0.15em]">
						API Keys
					</div>
					<p className="text-[#999] text-[13px]">
						Keys for the middleware library to authenticate with the ingestion
						endpoint.
					</p>
				</div>
				<CreateDialog />
			</div>
			<Suspense fallback={<KeyListSkeleton />}>
				<KeyList />
			</Suspense>
		</section>
	);
}
