"use client";

import { createColumnHelper } from "@tanstack/react-table";
import Link from "next/link";
import { DataTable, DataTableSkeleton } from "~/components/data-table";
import { api, type RouterOutputs } from "~/trpc/react";

type Endpoint = RouterOutputs["endpoints"]["list"][number];

const METHOD_COLORS: Record<string, string> = {
	GET: "bg-[#dbeafe] text-[#1e40af]",
	POST: "bg-[#d1fae5] text-[#065f46]",
	PUT: "bg-[#fef3c7] text-[#92400e]",
	PATCH: "bg-[#fed7aa] text-[#9a3412]",
	DELETE: "bg-[#fee2e2] text-[#991b1b]",
};

const col = createColumnHelper<Endpoint>();

const columns = [
	col.accessor("method", {
		header: "Method",
		cell: (info) => {
			const method = info.getValue();
			return (
				<span
					className={`inline-flex rounded px-1.5 py-0.5 font-semibold text-[10px] uppercase ${METHOD_COLORS[method] ?? "bg-[#fafafa] text-[#666]"}`}
				>
					{method}
				</span>
			);
		},
	}),
	col.accessor("routePattern", {
		header: "Route",
		cell: (info) => (
			<Link
				href={`/monitoring/${info.row.original.id}`}
				className="font-mono text-[#111] text-[13px] no-underline transition-colors hover:text-[#666]"
			>
				{info.getValue()}
			</Link>
		),
	}),
	col.accessor("eventCount", {
		header: "Events",
		meta: { align: "right" },
		cell: (info) => (
			<span className="font-mono text-[#999] tabular-nums">
				{info.getValue().toLocaleString()}
			</span>
		),
	}),
	col.accessor("lastSeenAt", {
		header: "Last seen",
		meta: { align: "right" },
		cell: (info) => (
			<span className="font-mono text-[#bbb] text-[12px]">
				{new Date(info.getValue()).toLocaleDateString()}
			</span>
		),
	}),
];

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
				<DataTableSkeleton columns={columns} rows={5} />
			) : (
				<DataTable columns={columns} data={endpoints ?? []} />
			)}
		</div>
	);
}
