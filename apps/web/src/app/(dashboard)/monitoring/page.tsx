"use client";

import { Input } from "@strus/ui/components/input";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, type RouterOutputs } from "~/trpc/react";

type Endpoint = RouterOutputs["endpoints"]["list"]["items"][number];

const METHOD_COLORS: Record<string, string> = {
	GET: "bg-[#dbeafe] text-[#1e40af]",
	POST: "bg-[#d1fae5] text-[#065f46]",
	PUT: "bg-[#fef3c7] text-[#92400e]",
	PATCH: "bg-[#fed7aa] text-[#9a3412]",
	DELETE: "bg-[#fee2e2] text-[#991b1b]",
};

function useDebounce<T>(value: T, delayMs: number): T {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delayMs);
		return () => clearTimeout(timer);
	}, [value, delayMs]);
	return debounced;
}

export default function MonitoringPage() {
	const router = useRouter();
	const [search, setSearch] = useQueryState("q", {
		defaultValue: "",
		shallow: false,
	});
	const debouncedSearch = useDebounce(search, 200);
	const parentRef = useRef<HTMLDivElement>(null);

	const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
		api.endpoints.list.useInfiniteQuery(
			{
				limit: 50,
				search: debouncedSearch || undefined,
			},
			{
				getNextPageParam: (lastPage) => lastPage.nextCursor,
			},
		);

	const allEndpoints = useMemo(
		() => data?.pages.flatMap((p) => p.items) ?? [],
		[data],
	);

	const virtualizer = useVirtualizer({
		count: allEndpoints.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 41,
		overscan: 20,
	});

	const virtualItems = virtualizer.getVirtualItems();
	const lastItem = virtualItems[virtualItems.length - 1];
	const shouldFetch =
		lastItem !== undefined &&
		lastItem.index >= allEndpoints.length - 10 &&
		hasNextPage &&
		!isFetchingNextPage;

	useEffect(() => {
		if (shouldFetch) fetchNextPage();
	}, [shouldFetch, fetchNextPage]);

	const handleRowClick = useCallback(
		(ep: Endpoint) => router.push(`/monitoring/${ep.id}`),
		[router],
	);

	return (
		<div>
			<div className="mb-6 flex items-end justify-between gap-4">
				<div>
					<h1 className="font-bold text-[#111] text-[28px] tracking-[-0.035em]">
						Monitoring
					</h1>
					<p className="mt-1 text-[#999] text-[14px]">
						API endpoints discovered from your telemetry.
					</p>
				</div>
				<Input
					placeholder="Search endpoints..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="h-9 w-56 font-mono text-[13px]"
				/>
			</div>

			{isLoading ? (
				<div className="overflow-hidden rounded-xl border border-[#e8e8e8]">
					<table className="w-full text-left text-sm">
						<thead className="border-[#e8e8e8] border-b bg-[#fafafa]">
							<tr>
								<th className="w-[72px] px-5 py-3 font-semibold text-[#bbb] text-[11px] uppercase tracking-[0.15em]" />
								<th className="px-5 py-3 font-semibold text-[#bbb] text-[11px] uppercase tracking-[0.15em]">
									Route
								</th>
								<th className="w-[80px] px-5 py-3 text-right font-semibold text-[#bbb] text-[11px] uppercase tracking-[0.15em]">
									Events
								</th>
								<th className="w-[90px] px-5 py-3 text-right font-semibold text-[#bbb] text-[11px] uppercase tracking-[0.15em]">
									Last seen
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[#f0f0f0]">
							{Array.from({ length: 8 }, (_, i) => (
								<tr key={i}>
									<td className="px-5 py-3">
										<div className="h-4 w-10 animate-pulse rounded bg-[#f0f0f0]" />
									</td>
									<td className="px-5 py-3">
										<div className="h-3 w-2/3 animate-pulse rounded bg-[#f0f0f0]" />
									</td>
									<td className="px-5 py-3 text-right">
										<div className="ml-auto h-3 w-10 animate-pulse rounded bg-[#f0f0f0]" />
									</td>
									<td className="px-5 py-3 text-right">
										<div className="ml-auto h-3 w-14 animate-pulse rounded bg-[#f0f0f0]" />
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : allEndpoints.length === 0 ? (
				<div className="rounded-xl border border-[#e8e8e8] px-4 py-16 text-center">
					<p className="text-[#ccc] text-[13px]">
						{debouncedSearch
							? "No endpoints match your search."
							: "No endpoints discovered yet."}
					</p>
				</div>
			) : (
				<div className="overflow-hidden rounded-xl border border-[#e8e8e8]">
					<table className="w-full text-left text-sm">
						<thead className="border-[#e8e8e8] border-b bg-[#fafafa]">
							<tr>
								<th className="w-[72px] px-5 py-3 font-semibold text-[#bbb] text-[11px] uppercase tracking-[0.15em]" />
								<th className="px-5 py-3 font-semibold text-[#bbb] text-[11px] uppercase tracking-[0.15em]">
									Route
								</th>
								<th className="w-[80px] px-5 py-3 text-right font-semibold text-[#bbb] text-[11px] uppercase tracking-[0.15em]">
									Events
								</th>
								<th className="w-[90px] px-5 py-3 text-right font-semibold text-[#bbb] text-[11px] uppercase tracking-[0.15em]">
									Last seen
								</th>
							</tr>
						</thead>
					</table>
					<div ref={parentRef} className="max-h-[600px] overflow-auto">
						<table className="w-full text-left text-sm">
							<tbody
								className="relative"
								style={{
									height: `${virtualizer.getTotalSize()}px`,
									display: "block",
								}}
							>
								{virtualItems.map((virtualRow) => {
									const ep = allEndpoints[virtualRow.index];
									if (!ep) return null;
									return (
										<tr
											key={ep.id}
											data-index={virtualRow.index}
											ref={virtualizer.measureElement}
											onClick={() => handleRowClick(ep)}
											className="absolute top-0 left-0 flex w-full cursor-pointer border-[#f0f0f0] border-b transition-colors hover:bg-[#fafafa]"
											style={{
												transform: `translateY(${virtualRow.start}px)`,
											}}
										>
											<td className="flex w-[72px] shrink-0 items-center px-5 py-2.5">
												<span
													className={`rounded px-1.5 py-0.5 font-semibold text-[10px] uppercase ${METHOD_COLORS[ep.method] ?? "bg-[#fafafa] text-[#666]"}`}
												>
													{ep.method}
												</span>
											</td>
											<td className="flex min-w-0 flex-1 items-center px-5 py-2.5">
												<span
													className="block max-w-full truncate font-mono text-[#111] text-[13px]"
													title={ep.routePattern}
												>
													{ep.routePattern}
												</span>
											</td>
											<td className="flex w-[80px] shrink-0 items-center justify-end px-5 py-2.5">
												<span className="font-mono text-[#999] text-[12px] tabular-nums">
													{ep.eventCount.toLocaleString()}
												</span>
											</td>
											<td className="flex w-[90px] shrink-0 items-center justify-end px-5 py-2.5">
												<span className="font-mono text-[#bbb] text-[11px]">
													{new Date(ep.lastSeenAt).toLocaleDateString()}
												</span>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
					{isFetchingNextPage && (
						<div className="border-[#e8e8e8] border-t px-3 py-2 text-center font-mono text-[#bbb] text-[11px]">
							loading...
						</div>
					)}
				</div>
			)}
		</div>
	);
}
