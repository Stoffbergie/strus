"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { api } from "~/trpc/react";

const METHOD_COLORS: Record<string, string> = {
	GET: "bg-[#dbeafe] text-[#1e40af]",
	POST: "bg-[#d1fae5] text-[#065f46]",
	PUT: "bg-[#fef3c7] text-[#92400e]",
	PATCH: "bg-[#fed7aa] text-[#9a3412]",
	DELETE: "bg-[#fee2e2] text-[#991b1b]",
};

export default function MonitoringDetailPage() {
	const { id } = useParams<{ id: string }>();
	const { data: ep, isLoading } = api.endpoints.get.useQuery({ id });

	if (isLoading) {
		return (
			<div className="space-y-4">
				<div className="h-8 w-48 animate-pulse rounded-lg bg-[#fafafa]" />
				<div className="grid grid-cols-3 gap-4">
					{[1, 2, 3].map((i) => (
						<div
							key={i}
							className="h-24 animate-pulse rounded-xl bg-[#fafafa]"
						/>
					))}
				</div>
			</div>
		);
	}

	if (!ep) {
		return (
			<div className="pt-20 text-center">
				<p className="font-medium text-[#111] text-[15px]">
					Endpoint not found
				</p>
				<p className="mt-2 text-[#999] text-[13px]">
					This endpoint may have been removed or the link is invalid.
				</p>
			</div>
		);
	}

	return (
		<div>
			<Link
				href="/monitoring"
				className="mb-6 inline-flex items-center gap-1 text-[#999] text-[13px] no-underline transition-colors hover:text-[#666]"
			>
				← Back to monitoring
			</Link>

			<div className="flex items-center gap-3">
				<span
					className={`rounded px-2 py-1 font-semibold text-[11px] uppercase ${METHOD_COLORS[ep.method] || "bg-[#fafafa] text-[#666]"}`}
				>
					{ep.method}
				</span>
				<h1 className="font-bold font-mono text-[#111] text-[20px] tracking-tight">
					{ep.routePattern}
				</h1>
			</div>

			<div className="mt-8 grid grid-cols-3 gap-4">
				<div className="rounded-xl border border-[#e8e8e8] bg-[#fafafa] p-5">
					<div className="mb-2 font-semibold text-[#bbb] text-[11px] uppercase tracking-[0.15em]">
						Total events
					</div>
					<p className="font-bold text-[#111] text-[28px] tabular-nums">
						{ep.eventCount.toLocaleString()}
					</p>
				</div>
				<div className="rounded-xl border border-[#e8e8e8] bg-[#fafafa] p-5">
					<div className="mb-2 font-semibold text-[#bbb] text-[11px] uppercase tracking-[0.15em]">
						First seen
					</div>
					<p className="font-mono text-[#111] text-[14px]">
						{new Date(ep.firstSeenAt).toLocaleDateString()}
					</p>
				</div>
				<div className="rounded-xl border border-[#e8e8e8] bg-[#fafafa] p-5">
					<div className="mb-2 font-semibold text-[#bbb] text-[11px] uppercase tracking-[0.15em]">
						Last seen
					</div>
					<p className="font-mono text-[#111] text-[14px]">
						{new Date(ep.lastSeenAt).toLocaleDateString()}
					</p>
				</div>
			</div>
		</div>
	);
}
