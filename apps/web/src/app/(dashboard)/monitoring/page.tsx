"use client";

import Link from "next/link";

import SetupGuide from "~/app/_components/setup-guide";
import { api } from "~/trpc/react";

const METHOD_COLORS: Record<string, string> = {
	GET: "bg-[#dbeafe] text-[#1e40af]",
	POST: "bg-[#d1fae5] text-[#065f46]",
	PUT: "bg-[#fef3c7] text-[#92400e]",
	PATCH: "bg-[#fed7aa] text-[#9a3412]",
	DELETE: "bg-[#fee2e2] text-[#991b1b]",
};

export default function MonitoringPage() {
	const { data: endpoints, isLoading } = api.endpoints.list.useQuery();

	return (
		<div>
			<div className="mb-8">
				<h1 className="font-bold text-[#111] text-[28px] tracking-[-0.035em]">
					Monitoring
				</h1>
				<p className="mt-1 text-[#999] text-[14px]">
					API endpoints discovered from your telemetry.
				</p>
			</div>

			{isLoading ? (
				<div className="space-y-3">
					{[1, 2, 3, 4, 5].map((i) => (
						<div
							key={i}
							className="h-14 animate-pulse rounded-xl bg-[#fafafa]"
						/>
					))}
				</div>
			) : !isLoading && endpoints && endpoints.length === 0 ? (
				<SetupGuide />
			) : endpoints && endpoints.length > 0 ? (
				<div className="overflow-hidden rounded-xl border border-[#e8e8e8]">
					<table className="w-full text-left">
						<thead>
							<tr className="border-[#e8e8e8] border-b bg-[#fafafa]">
								<th className="px-5 py-3 font-semibold text-[#bbb] text-[11px] uppercase tracking-[0.15em]">
									Method
								</th>
								<th className="px-5 py-3 font-semibold text-[#bbb] text-[11px] uppercase tracking-[0.15em]">
									Route
								</th>
								<th className="px-5 py-3 text-right font-semibold text-[#bbb] text-[11px] uppercase tracking-[0.15em]">
									Events
								</th>
								<th className="px-5 py-3 text-right font-semibold text-[#bbb] text-[11px] uppercase tracking-[0.15em]">
									Last seen
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[#f0f0f0]">
							{endpoints.map((ep) => (
								<tr
									key={ep.id}
									className="transition-colors hover:bg-[#fafafa]"
								>
									<td className="px-5 py-3">
										<span
											className={`inline-flex rounded px-1.5 py-0.5 font-semibold text-[10px] uppercase ${METHOD_COLORS[ep.method] || "bg-[#fafafa] text-[#666]"}`}
										>
											{ep.method}
										</span>
									</td>
									<td className="px-5 py-3">
										<Link
											href={`/monitoring/${ep.id}`}
											className="font-mono text-[#111] text-[13px] no-underline transition-colors hover:text-[#666]"
										>
											{ep.routePattern}
										</Link>
									</td>
									<td className="px-5 py-3 text-right font-mono text-[#999] text-[13px] tabular-nums">
										{ep.eventCount.toLocaleString()}
									</td>
									<td className="px-5 py-3 text-right font-mono text-[#bbb] text-[12px]">
										{new Date(ep.lastSeenAt).toLocaleDateString()}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : null}
		</div>
	);
}
