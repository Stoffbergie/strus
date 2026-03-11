"use client";

import Link from "next/link";
import { useState } from "react";

import SetupGuide from "~/app/_components/setup-guide";
import SignalBadge from "~/app/_components/signal-badge";
import { api } from "~/trpc/react";

export default function ChangesPage() {
	const [filter, setFilter] = useState<"active" | "resolved" | "all">("active");

	const { data: shifts, isLoading: shiftsLoading } = api.shifts.list.useQuery({
		status: filter,
		limit: 50,
	});

	const { data: endpoints, isLoading: endpointsLoading } =
		api.endpoints.list.useQuery();

	const { data: apiKeys } = api.apiKeys.list.useQuery();

	const endpointCount = endpoints?.length ?? 0;
	const hasNoData = !endpointsLoading && endpointCount === 0;
	const latestKey = apiKeys?.[0];

	if (hasNoData) {
		return (
			<SetupGuide
				apiKey={latestKey?.keyPrefix ? `${latestKey.keyPrefix}...` : undefined}
			/>
		);
	}

	const activeCount = shifts?.filter((s) => !s.resolvedAt).length ?? 0;

	return (
		<div>
			<div className="mb-8 flex items-end justify-between">
				<div>
					<h1 className="font-bold text-[#111] text-[28px] tracking-[-0.035em]">
						Changes
					</h1>
					<p className="mt-1 text-[#999] text-[14px]">
						Behavioral changes detected across your endpoints.
					</p>
				</div>
				<div className="flex items-center gap-4 text-[12px]">
					<span className="text-[#bbb]">
						{endpointCount} endpoint{endpointCount !== 1 ? "s" : ""} monitored
					</span>
					{activeCount > 0 && (
						<span className="rounded bg-[#fef3c7] px-2 py-1 font-semibold text-[#92400e]">
							{activeCount} need{activeCount !== 1 ? "" : "s"} review
						</span>
					)}
				</div>
			</div>

			<div className="mb-6 flex gap-1">
				{(["active", "resolved", "all"] as const).map((status) => (
					<button
						key={status}
						type="button"
						onClick={() => setFilter(status)}
						className={`rounded-lg px-3 py-1.5 font-medium text-[13px] transition-colors ${
							filter === status
								? "bg-[#111] text-white"
								: "text-[#999] hover:text-[#666]"
						}`}
					>
						{status.charAt(0).toUpperCase() + status.slice(1)}
					</button>
				))}
			</div>

			<div className="space-y-3">
				{shiftsLoading ? (
					<div className="space-y-3">
						{[1, 2, 3].map((i) => (
							<div
								key={i}
								className="h-20 animate-pulse rounded-xl bg-[#fafafa]"
							/>
						))}
					</div>
				) : shifts && shifts.length > 0 ? (
					shifts.map((s) => {
						const isResolved = s.resolvedAt !== null;
						const confidencePercent = Math.round(s.confidence * 100);

						return (
							<Link
								key={s.id}
								href={`/changes/${s.id}`}
								className={`block rounded-xl border p-5 no-underline transition-colors ${
									isResolved
										? "border-[#e8e8e8] bg-white hover:bg-[#fafafa]"
										: "border-[#f59e0b]/20 bg-[#fffbeb] hover:bg-[#fef3c7]/30"
								}`}
							>
								<div className="flex items-start justify-between gap-4">
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<SignalBadge type={s.signalType} />
											{isResolved && (
												<span className="rounded bg-[#d1fae5] px-1.5 py-0.5 font-semibold text-[#065f46] text-[10px] uppercase">
													Verified
												</span>
											)}
										</div>
										<p className="mt-2 truncate font-medium text-[#111] text-[15px]">
											{s.fieldName || "Endpoint level change"}
										</p>
										<p className="mt-0.5 font-mono text-[#bbb] text-[11px]">
											{new Date(s.detectedAt).toLocaleString()}
										</p>
									</div>
									<div className="text-right">
										<p className="font-bold text-[#111] text-[24px] tabular-nums">
											{confidencePercent}%
										</p>
										<p className="text-[#bbb] text-[11px]">confidence</p>
									</div>
								</div>
							</Link>
						);
					})
				) : (
					<div className="rounded-xl border border-[#e8e8e8] bg-[#fafafa] p-12 text-center">
						{filter === "active" ? (
							<>
								<p className="font-medium text-[#111] text-[15px]">
									No changes need review
								</p>
								<p className="mt-2 text-[#999] text-[13px]">
									Your system is behaving as expected. Strus is monitoring{" "}
									{endpointCount} endpoint{endpointCount !== 1 ? "s" : ""}.
								</p>
							</>
						) : (
							<>
								<p className="font-medium text-[#111] text-[15px]">
									No changes found
								</p>
								<p className="mt-2 text-[#999] text-[13px]">
									No behavioral changes match this filter.
								</p>
							</>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
