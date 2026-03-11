"use client";

import { Input } from "@strus/ui/components/input";
import { useState } from "react";
import { toast } from "sonner";

import { api } from "~/trpc/react";

export default function ApiKeyManager() {
	const [name, setName] = useState("");
	const [newKey, setNewKey] = useState<string | null>(null);

	const utils = api.useUtils();

	const { data: keys, isLoading } = api.apiKeys.list.useQuery();

	const create = api.apiKeys.create.useMutation({
		onSuccess: (data) => {
			setNewKey(data.key);
			setName("");
			void utils.apiKeys.list.invalidate();
			toast.success("API key created");
		},
		onError: () => {
			toast.error("Failed to create API key");
		},
	});

	const revoke = api.apiKeys.revoke.useMutation({
		onSuccess: () => {
			void utils.apiKeys.list.invalidate();
			toast.success("API key revoked");
		},
		onError: () => {
			toast.error("Failed to revoke API key");
		},
	});

	return (
		<div className="space-y-4">
			<div className="flex gap-2">
				<Input
					placeholder="Key name (e.g. production, staging)"
					value={name}
					onChange={(e) => setName(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") create.mutate({ name: name.trim() });
					}}
					className="flex-1"
				/>
				<button
					type="button"
					onClick={() => create.mutate({ name: name.trim() })}
					disabled={create.isPending || !name.trim()}
					className="shrink-0 rounded-lg bg-[#111] px-4 py-2 font-semibold text-[13px] text-white transition-colors hover:bg-[#333] disabled:opacity-50"
				>
					Create key
				</button>
			</div>

			{newKey && (
				<div className="rounded-xl border border-[#f59e0b]/30 bg-[#fffbeb] p-4">
					<p className="mb-2 font-medium text-[#92400e] text-[13px]">
						Copy this key now. It will not be shown again.
					</p>
					<div className="flex items-center gap-2">
						<code className="flex-1 overflow-hidden rounded-lg bg-white px-3 py-2 font-mono text-[#111] text-[12px] ring-1 ring-[#f59e0b]/20">
							<span className="block truncate">{newKey}</span>
						</code>
						<button
							type="button"
							onClick={() => {
								navigator.clipboard.writeText(newKey);
								toast.success("Copied to clipboard");
							}}
							className="shrink-0 rounded-lg border border-[#e8e8e8] bg-white px-3 py-2 font-medium text-[#111] text-[12px] transition-colors hover:bg-[#fafafa]"
						>
							Copy
						</button>
					</div>
				</div>
			)}

			{isLoading ? (
				<div className="space-y-2">
					{[1, 2].map((i) => (
						<div
							key={i}
							className="h-14 animate-pulse rounded-xl bg-[#fafafa]"
						/>
					))}
				</div>
			) : (
				<div className="space-y-2">
					{keys?.map((key) => (
						<div
							key={key.id}
							className="flex items-center justify-between rounded-xl border border-[#e8e8e8] bg-[#fafafa] p-4"
						>
							<div>
								<p className="font-medium text-[#111] text-[14px]">
									{key.name}
								</p>
								<p className="mt-0.5 font-mono text-[#bbb] text-[11px]">
									{key.keyPrefix}... · Created{" "}
									{new Date(key.createdAt).toLocaleDateString()}
								</p>
							</div>
							<button
								type="button"
								onClick={() => revoke.mutate({ id: key.id })}
								className="rounded-lg px-3 py-1.5 font-medium text-[#dc2626] text-[12px] transition-colors hover:bg-[#fee2e2]"
							>
								Revoke
							</button>
						</div>
					))}
					{keys?.length === 0 && (
						<p className="text-[#999] text-[13px]">
							No API keys yet. Create one to start sending telemetry.
						</p>
					)}
				</div>
			)}
		</div>
	);
}
