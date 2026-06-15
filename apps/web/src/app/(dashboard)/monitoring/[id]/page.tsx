"use client";

import { Button } from "@strus/ui/components/button";
import { Input } from "@strus/ui/components/input";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { api } from "~/trpc/react";

type TimeRange = "1h" | "6h" | "24h" | "7d" | "30d";
type JsonFilter = { path: string; value: string };

type Signal = {
	fieldPath?: string;
	signalType?: string;
	value?: { type?: string; isNull?: boolean; value?: unknown; length?: number };
};

type TelemetryEvent = {
	id: string;
	statusCode: number;
	durationMs: number | null;
	requestBody: unknown;
	responseBody: unknown;
	metadata: unknown;
	receivedAt: Date;
};

const TIME_RANGES: { value: TimeRange; label: string }[] = [
	{ value: "1h", label: "1H" },
	{ value: "6h", label: "6H" },
	{ value: "24h", label: "24H" },
	{ value: "7d", label: "7D" },
	{ value: "30d", label: "30D" },
];

const METHOD_COLORS: Record<string, string> = {
	GET: "bg-[#dbeafe] text-[#1e40af]",
	POST: "bg-[#d1fae5] text-[#065f46]",
	PUT: "bg-[#fef3c7] text-[#92400e]",
	PATCH: "bg-[#fed7aa] text-[#9a3412]",
	DELETE: "bg-[#fee2e2] text-[#991b1b]",
};

function getStatusColor(code: number) {
	const prefix = String(code)[0];
	switch (prefix) {
		case "2":
			return "text-[#16a34a]";
		case "3":
			return "text-[#2563eb]";
		case "4":
			return "text-[#d97706]";
		case "5":
			return "text-[#dc2626]";
		default:
			return "text-[#999]";
	}
}

function getStatusBg(code: number) {
	const prefix = String(code)[0];
	switch (prefix) {
		case "2":
			return "bg-[#d1fae5]";
		case "3":
			return "bg-[#dbeafe]";
		case "4":
			return "bg-[#fef3c7]";
		case "5":
			return "bg-[#fee2e2]";
		default:
			return "bg-[#f0f0f0]";
	}
}

function Histogram({
	buckets,
	isLoading,
}: {
	buckets: { bucket: string; count: number; errorCount: number }[];
	isLoading: boolean;
}) {
	if (isLoading) {
		return (
			<div className="flex h-16 items-end gap-[1px]">
				{Array.from({ length: 48 }, (_, i) => (
					<div
						key={i}
						className="flex-1 animate-pulse bg-[#e8e8e8]"
						style={{ height: `${15 + Math.random() * 70}%` }}
					/>
				))}
			</div>
		);
	}

	if (!buckets.length) {
		return (
			<div className="flex h-16 items-center justify-center">
				<p className="text-[#ccc] text-[12px]">No events in this range</p>
			</div>
		);
	}

	const maxCount = Math.max(...buckets.map((b) => b.count), 1);
	const labelCount = Math.min(buckets.length, 6);
	const labelIndices = new Set(
		Array.from({ length: labelCount }, (_, i) =>
			Math.round((i / (labelCount - 1)) * (buckets.length - 1)),
		),
	);

	function formatBucketTime(iso: string, showDate: boolean) {
		const d = new Date(iso);
		const hh = String(d.getHours()).padStart(2, "0");
		const mm = String(d.getMinutes()).padStart(2, "0");
		if (!showDate) return `${hh}:${mm}`;
		const mon = d.toLocaleString("en", { month: "short" });
		return `${mon} ${d.getDate()} ${hh}:${mm}`;
	}

	const firstBucket = buckets[0];
	if (!firstBucket) return null;
	const lastBucket = buckets[buckets.length - 1] ?? firstBucket;
	const first = new Date(firstBucket.bucket);
	const last = new Date(lastBucket.bucket);
	const spansDays = first.toDateString() !== last.toDateString();

	return (
		<div>
			<div className="flex h-16 items-end gap-[1px]">
				{buckets.map((b) => {
					const totalHeight = Math.max(
						(b.count / maxCount) * 100,
						b.count > 0 ? 2 : 0,
					);
					const hasErrors = b.errorCount > 0;
					const time = formatBucketTime(b.bucket, false);

					return (
						<div
							key={b.bucket}
							className="relative flex flex-1 flex-col justify-end"
							style={{ height: "100%" }}
							title={`${time}: ${b.count} req${b.errorCount > 0 ? `, ${b.errorCount} err` : ""}`}
						>
							<div
								className={`w-full transition-opacity ${hasErrors ? "bg-[#dc2626]" : "bg-[#111]"} opacity-80 hover:opacity-100`}
								style={{
									height: `${totalHeight}%`,
									minHeight: b.count > 0 ? 1 : 0,
								}}
							/>
						</div>
					);
				})}
			</div>
			<div className="relative h-5">
				{buckets.map((b, i) =>
					labelIndices.has(i) ? (
						<span
							key={b.bucket}
							className="absolute top-1.5 whitespace-nowrap font-mono text-[#ccc] text-[10px]"
							style={{
								left: `${(i / (buckets.length - 1)) * 100}%`,
								transform:
									i === 0
										? "none"
										: i === buckets.length - 1
											? "translateX(-100%)"
											: "translateX(-50%)",
							}}
						>
							{formatBucketTime(b.bucket, spansDays)}
						</span>
					) : null,
				)}
			</div>
		</div>
	);
}

function JsonFilterBar({
	filters,
	onAdd,
	onRemove,
}: {
	filters: JsonFilter[];
	onAdd: (filter: JsonFilter) => void;
	onRemove: (index: number) => void;
}) {
	const [path, setPath] = useState("");
	const [value, setValue] = useState("");

	const handleAdd = useCallback(() => {
		if (!path.trim() || !value.trim()) return;
		onAdd({ path: path.trim(), value: value.trim() });
		setPath("");
		setValue("");
	}, [path, value, onAdd]);

	return (
		<div className="flex items-center gap-2">
			{filters.map((f, i) => (
				<span
					key={`${f.path}-${f.value}`}
					className="inline-flex items-center gap-1 rounded border border-[#e8e8e8] bg-[#fafafa] px-2 py-0.5 font-mono text-[#666] text-[11px]"
				>
					{f.path}={f.value}
					<button
						type="button"
						onClick={() => onRemove(i)}
						className="ml-0.5 text-[#bbb] hover:text-[#666]"
					>
						×
					</button>
				</span>
			))}
			<Input
				placeholder="path"
				value={path}
				onChange={(e) => setPath(e.target.value)}
				className="h-7 w-28 font-mono text-[11px]"
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						handleAdd();
					}
				}}
			/>
			<Input
				placeholder="value"
				value={value}
				onChange={(e) => setValue(e.target.value)}
				className="h-7 w-24 font-mono text-[11px]"
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						handleAdd();
					}
				}}
			/>
			<Button
				variant="outline"
				size="sm"
				onClick={handleAdd}
				disabled={!path.trim() || !value.trim()}
				className="h-7 px-2 text-[11px]"
			>
				Add
			</Button>
		</div>
	);
}

function SignalPills({ signals }: { signals: Signal[] }) {
	const grouped = useMemo(() => {
		const nullFields: string[] = [];
		const presentFields: string[] = [];
		const enums: { path: string; value: string }[] = [];
		const arrays: { path: string; length: number }[] = [];
		const newValues: { path: string; value: string }[] = [];

		for (const s of signals) {
			const path = s.fieldPath ?? "?";
			switch (s.signalType) {
				case "null_rate":
					if (s.value?.isNull) nullFields.push(path);
					else presentFields.push(path);
					break;
				case "enum_distribution":
					enums.push({ path, value: String(s.value?.value ?? "") });
					break;
				case "array_cardinality":
					arrays.push({ path, length: s.value?.length ?? 0 });
					break;
				case "new_value":
					newValues.push({ path, value: String(s.value?.value ?? "") });
					break;
			}
		}
		return { nullFields, presentFields, enums, arrays, newValues };
	}, [signals]);

	return (
		<span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
			{grouped.enums.map((e) => (
				<span key={`e-${e.path}`} className="whitespace-nowrap">
					<span className="text-[#999]">{e.path}</span>
					<span className="text-[#999]">=</span>
					<span className="text-[#f59e0b]">{e.value}</span>
				</span>
			))}
			{grouped.arrays.map((a) => (
				<span key={`a-${a.path}`} className="whitespace-nowrap">
					<span className="text-[#999]">{a.path}</span>
					<span className="text-[#005cc5]">[{a.length}]</span>
				</span>
			))}
			{grouped.nullFields.map((f) => (
				<span key={`n-${f}`} className="whitespace-nowrap">
					<span className="text-[#999]">{f}</span>
					<span className="text-[#dc2626]">: null</span>
				</span>
			))}
			{grouped.newValues.map((nv) => (
				<span key={`nv-${nv.path}`} className="whitespace-nowrap">
					<span className="text-[#999]">{nv.path}</span>
					<span className="text-[#999]">=</span>
					<span className="text-[#22863a]">{nv.value}</span>
					<span className="ml-0.5 rounded bg-[#d1fae5] px-1 py-px text-[#065f46] text-[8px] uppercase">
						new
					</span>
				</span>
			))}
			{grouped.presentFields.length > 0 &&
				grouped.enums.length === 0 &&
				grouped.arrays.length === 0 &&
				grouped.nullFields.length === 0 &&
				grouped.newValues.length === 0 && (
					<span className="text-[#ccc]">
						{grouped.presentFields.slice(0, 4).join(", ")}
						{grouped.presentFields.length > 4 &&
							` +${grouped.presentFields.length - 4}`}
					</span>
				)}
		</span>
	);
}

function compactPreview(data: unknown, maxLen = 80): string {
	if (data === null || data === undefined) return "";
	const raw = JSON.stringify(data);
	if (raw.length <= maxLen) return raw;
	return `${raw.slice(0, maxLen - 1)}…`;
}

function EventSummary({ event }: { event: TelemetryEvent }) {
	if (event.metadata && typeof event.metadata === "object") {
		if (Array.isArray(event.metadata) && event.metadata.length > 0) {
			return <SignalPills signals={event.metadata as Signal[]} />;
		}
		const metaKeys = Object.keys(event.metadata as Record<string, unknown>);
		const respKeys =
			event.responseBody &&
			typeof event.responseBody === "object" &&
			!Array.isArray(event.responseBody)
				? Object.keys(event.responseBody as Record<string, unknown>)
				: [];
		const isDuplicate =
			metaKeys.length > 0 &&
			metaKeys.length === respKeys.length &&
			metaKeys.every((k) => respKeys.includes(k));

		if (metaKeys.length > 0 && !isDuplicate) {
			return (
				<span className="text-[#999]">{compactPreview(event.metadata)}</span>
			);
		}
	}

	if (event.responseBody !== null && event.responseBody !== undefined) {
		return (
			<span className="text-[#999]">{compactPreview(event.responseBody)}</span>
		);
	}

	if (event.requestBody !== null && event.requestBody !== undefined) {
		return (
			<span className="text-[#ccc]">{compactPreview(event.requestBody)}</span>
		);
	}

	return null;
}

function formatTime(date: Date): string {
	const d = new Date(date);
	return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

function formatDateTime(date: Date): string {
	const d = new Date(date);
	const mon = d.toLocaleString("en", { month: "short" });
	const day = d.getDate();
	const hh = String(d.getHours()).padStart(2, "0");
	const mm = String(d.getMinutes()).padStart(2, "0");
	const ss = String(d.getSeconds()).padStart(2, "0");
	return `${mon} ${day}, ${hh}:${mm}:${ss}`;
}

function JsonField({
	name,
	value,
	isLast,
}: {
	name: string;
	value: unknown;
	isLast: boolean;
}) {
	const rendered = renderJsonValue(value);

	return (
		<div className="ml-4">
			<span className="text-[#111]">"{name}"</span>
			<span className="text-[#999]">: </span>
			{rendered}
			{!isLast && <span className="text-[#ddd]">,</span>}
		</div>
	);
}

function renderJsonValue(value: unknown): React.ReactNode {
	if (value === null || value === undefined) {
		return <span className="text-[#999]">null</span>;
	}

	if (typeof value === "string") {
		const truncated = value.length > 60 ? `${value.slice(0, 57)}...` : value;
		return <span className="text-[#22863a]">"{truncated}"</span>;
	}

	if (typeof value === "number") {
		return <span className="text-[#005cc5]">{value}</span>;
	}

	if (typeof value === "boolean") {
		return <span className="text-[#005cc5]">{String(value)}</span>;
	}

	if (Array.isArray(value)) {
		if (value.length === 0) return <span className="text-[#999]">[]</span>;
		return (
			<span>
				<span className="text-[#999]">[</span>
				<div className="ml-4">
					{value.map((item, i) => (
						<div key={i}>
							{renderJsonValue(item)}
							{i < value.length - 1 && <span className="text-[#ddd]">,</span>}
						</div>
					))}
				</div>
				<span className="text-[#999]">]</span>
			</span>
		);
	}

	if (typeof value === "object") {
		const entries = Object.entries(value as Record<string, unknown>);
		if (entries.length === 0) {
			return <span className="text-[#999]">{"{}"}</span>;
		}
		return (
			<span>
				<span className="text-[#999]">{"{"}</span>
				{entries.map(([key, val], i) => (
					<JsonField
						key={key}
						name={key}
						value={val}
						isLast={i === entries.length - 1}
					/>
				))}
				<span className="text-[#999]">{"}"}</span>
			</span>
		);
	}

	return <span>{String(value)}</span>;
}

function PayloadPanel({ label, data }: { label: string; data: unknown }) {
	if (data === null || data === undefined) return null;

	const isObject = typeof data === "object" && !Array.isArray(data);
	const entries = isObject
		? Object.entries(data as Record<string, unknown>)
		: null;

	return (
		<div className="overflow-hidden rounded-lg border border-[#e8e8e8] bg-[#fafafa]">
			<div className="border-[#e8e8e8] border-b px-4 py-2">
				<span className="font-semibold text-[#999] text-[10px] uppercase tracking-wider">
					{label}
				</span>
			</div>
			<div className="overflow-x-auto p-4 font-mono text-[11px] leading-relaxed">
				{entries ? (
					<>
						<div className="text-[#999]">{"{"}</div>
						{entries.map(([key, val], i) => (
							<JsonField
								key={key}
								name={key}
								value={val}
								isLast={i === entries.length - 1}
							/>
						))}
						<div className="text-[#999]">{"}"}</div>
					</>
				) : (
					<div>{renderJsonValue(data)}</div>
				)}
			</div>
		</div>
	);
}

function DurationBar({
	durationMs,
	maxMs,
}: {
	durationMs: number;
	maxMs: number;
}) {
	const pct = Math.min((durationMs / maxMs) * 100, 100);
	const slow = durationMs > 500;
	return (
		<div className="flex items-center gap-2">
			<div className="h-1.5 w-full max-w-32 overflow-hidden rounded-full bg-[#f0f0f0]">
				<div
					className={`h-full rounded-full ${slow ? "bg-[#f59e0b]" : "bg-[#111]"}`}
					style={{ width: `${Math.max(pct, 2)}%` }}
				/>
			</div>
			<span
				className={`font-mono text-[12px] tabular-nums ${slow ? "text-[#92400e]" : "text-[#999]"}`}
			>
				{durationMs}ms
			</span>
		</div>
	);
}

function EventSidePanel({
	event,
	method,
	route,
	maxDuration,
	onClose,
}: {
	event: TelemetryEvent;
	method: string;
	route: string;
	maxDuration: number;
	onClose: () => void;
}) {
	const hasRequest =
		event.requestBody !== null && event.requestBody !== undefined;
	const hasResponse =
		event.responseBody !== null && event.responseBody !== undefined;
	const metadataIsDuplicate =
		hasResponse &&
		event.metadata !== null &&
		event.metadata !== undefined &&
		JSON.stringify(event.metadata) === JSON.stringify(event.responseBody);
	const hasMetadata =
		!metadataIsDuplicate &&
		event.metadata !== null &&
		event.metadata !== undefined &&
		typeof event.metadata === "object" &&
		(Array.isArray(event.metadata)
			? event.metadata.length > 0
			: Object.keys(event.metadata as Record<string, unknown>).length > 0);
	const hasPayload = hasRequest || hasResponse || hasMetadata;

	return (
		<div className="fixed inset-y-0 right-0 z-40 flex w-[320px] flex-col border-[#e8e8e8] border-l bg-white shadow-lg lg:w-[360px]">
			<div className="flex items-center justify-between border-[#e8e8e8] border-b px-5 py-3">
				<div className="flex min-w-0 items-center gap-2">
					<span
						className={`shrink-0 rounded px-1.5 py-0.5 font-semibold text-[10px] uppercase ${getStatusBg(event.statusCode)} ${getStatusColor(event.statusCode)}`}
					>
						{event.statusCode}
					</span>
					<span className="truncate font-mono text-[#111] text-[13px]">
						{method} {route}
					</span>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="shrink-0 rounded p-1.5 text-[#bbb] transition-colors hover:bg-[#f0f0f0] hover:text-[#666]"
				>
					<svg
						width="14"
						height="14"
						viewBox="0 0 14 14"
						fill="none"
						role="img"
						aria-label="Close panel"
					>
						<path
							d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
						/>
					</svg>
				</button>
			</div>

			<div className="flex-1 overflow-y-auto">
				<div className="flex flex-col gap-4 p-5">
					<div className="font-mono text-[#999] text-[12px]">
						{formatDateTime(event.receivedAt)}
					</div>

					{event.durationMs !== null && (
						<div>
							<div className="mb-1.5 font-semibold text-[#bbb] text-[10px] uppercase tracking-wider">
								Execution time
							</div>
							<DurationBar durationMs={event.durationMs} maxMs={maxDuration} />
						</div>
					)}

					{hasRequest && (
						<PayloadPanel label="Request" data={event.requestBody} />
					)}

					{hasResponse && (
						<PayloadPanel label="Response" data={event.responseBody} />
					)}

					{hasMetadata && (
						<PayloadPanel label="Metadata" data={event.metadata} />
					)}

					{!hasPayload && event.durationMs === null && (
						<div className="rounded-lg border border-[#e8e8e8] bg-[#fafafa] px-4 py-8 text-center">
							<p className="text-[#ccc] text-[13px]">
								No payload data recorded for this event.
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function VirtualizedEventLog({
	events,
	hasNextPage,
	isFetchingNextPage,
	fetchNextPage,
	selectedId,
	onSelect,
}: {
	events: TelemetryEvent[];
	hasNextPage: boolean;
	isFetchingNextPage: boolean;
	fetchNextPage: () => void;
	selectedId: string | null;
	onSelect: (event: TelemetryEvent) => void;
}) {
	const parentRef = useRef<HTMLDivElement>(null);

	const virtualizer = useVirtualizer({
		count: events.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 28,
		overscan: 20,
	});

	const virtualItems = virtualizer.getVirtualItems();
	const lastItem = virtualItems[virtualItems.length - 1];
	const shouldFetch =
		lastItem !== undefined &&
		lastItem.index >= events.length - 20 &&
		hasNextPage &&
		!isFetchingNextPage;

	useEffect(() => {
		if (shouldFetch) fetchNextPage();
	}, [shouldFetch, fetchNextPage]);

	return (
		<div
			ref={parentRef}
			className="max-h-[600px] overflow-auto rounded-lg border border-[#e8e8e8]"
		>
			<div
				className="relative w-full"
				style={{ height: `${virtualizer.getTotalSize()}px` }}
			>
				{virtualItems.map((virtualRow) => {
					const event = events[virtualRow.index];
					if (!event) return null;
					const isSelected = event.id === selectedId;

					return (
						<div
							key={event.id}
							data-index={virtualRow.index}
							ref={virtualizer.measureElement}
							className="absolute top-0 left-0 w-full"
							style={{
								transform: `translateY(${virtualRow.start}px)`,
							}}
						>
							<button
								type="button"
								onClick={() => onSelect(event)}
								className={`group/row flex w-full items-center border-[#f0f0f0] border-b px-2 text-left font-mono leading-none transition-colors ${
									isSelected
										? "bg-[#f0f4ff]"
										: "cursor-pointer hover:bg-[#fafafa]"
								}`}
							>
								<span className="w-[68px] shrink-0 py-[6px] pr-3 text-right text-[#ccc] text-[11px]">
									{formatTime(event.receivedAt)}
								</span>
								<span
									className={`w-[32px] shrink-0 py-[6px] text-center font-semibold text-[11px] ${getStatusColor(event.statusCode)}`}
								>
									{event.statusCode}
								</span>
								<span className="w-[60px] shrink-0 py-[6px] pr-2 pl-2 text-right text-[10px]">
									{event.durationMs === null ? (
										<span className="text-[#e8e8e8]">&mdash;</span>
									) : event.durationMs === 0 ? (
										<span className="inline-flex items-center gap-0.5 text-[#ccc]">
											<svg
												width="10"
												height="10"
												viewBox="0 0 16 16"
												fill="none"
												role="img"
												aria-label="Instant"
											>
												<path
													d="M8.5 1L3 9.5H7.5L7 15L13 6.5H8.5L8.5 1Z"
													fill="currentColor"
												/>
											</svg>
											instant
										</span>
									) : (
										<span className="text-[#ccc]">{event.durationMs}ms</span>
									)}
								</span>
								<span className="min-w-0 flex-1 truncate py-[6px] pl-5 text-[11px]">
									<EventSummary event={event} />
								</span>
								<span className="hidden shrink-0 px-2 py-[6px] text-[#ccc] text-[9px] group-hover/row:inline">
									→
								</span>
							</button>
						</div>
					);
				})}
			</div>
			{isFetchingNextPage && (
				<div className="border-[#f0f0f0] border-t px-3 py-2 text-center font-mono text-[#bbb] text-[11px]">
					loading...
				</div>
			)}
		</div>
	);
}

export default function MonitoringDetailPage() {
	const router = useRouter();
	const { id } = useParams<{ id: string }>();
	const [timeRange, setTimeRange] = useState<TimeRange>("24h");
	const [statusCode, setStatusCode] = useState<number | undefined>();
	const [jsonFilters, setJsonFilters] = useState<JsonFilter[]>([]);
	const [showFilters, setShowFilters] = useState(false);
	const [selectedEvent, setSelectedEvent] = useState<TelemetryEvent | null>(
		null,
	);

	const { data: ep, isLoading: epLoading } = api.endpoints.get.useQuery({
		id,
	});

	const filterInput = useMemo(
		() => ({
			endpointId: id,
			timeRange,
			statusCode,
			jsonFilters: jsonFilters.length > 0 ? jsonFilters : undefined,
		}),
		[id, timeRange, statusCode, jsonFilters],
	);

	const { data: histogramData, isLoading: histLoading } =
		api.telemetry.histogram.useQuery(filterInput);

	const {
		data: eventsData,
		isLoading: eventsLoading,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = api.telemetry.list.useInfiniteQuery(
		{ ...filterInput, limit: 100 },
		{
			getNextPageParam: (lastPage) => lastPage.nextCursor,
		},
	);

	const { data: statusCodes } = api.telemetry.statusCodes.useQuery({
		endpointId: id,
		timeRange,
	});

	const allEvents = useMemo(
		() => eventsData?.pages.flatMap((p) => p.events) ?? [],
		[eventsData],
	);

	const maxDuration = useMemo(
		() => Math.max(...allEvents.map((e) => e.durationMs ?? 0), 100),
		[allEvents],
	);

	const addJsonFilter = useCallback((filter: JsonFilter) => {
		setJsonFilters((prev) => [...prev, filter]);
	}, []);

	const removeJsonFilter = useCallback((index: number) => {
		setJsonFilters((prev) => prev.filter((_, i) => i !== index));
	}, []);

	const triggerNextPage = useCallback(() => {
		if (hasNextPage && !isFetchingNextPage) {
			fetchNextPage();
		}
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	if (epLoading) {
		return (
			<div className="space-y-6">
				<div className="h-5 w-32 animate-pulse rounded bg-[#f0f0f0]" />
				<div className="h-16 animate-pulse rounded bg-[#f0f0f0]" />
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

	const totalInRange =
		histogramData?.buckets.reduce((sum, b) => sum + b.count, 0) ?? 0;
	const errorsInRange =
		histogramData?.buckets.reduce((sum, b) => sum + b.errorCount, 0) ?? 0;

	return (
		<div>
			<div className="mb-6">
				<button
					type="button"
					onClick={() => router.back()}
					className="text-[#bbb] text-[12px] transition-colors hover:text-[#999]"
				>
					← monitoring
				</button>
				<div className="mt-3 flex items-baseline gap-3">
					<span
						className={`rounded px-1.5 py-0.5 font-semibold text-[10px] uppercase ${METHOD_COLORS[ep.method] || "bg-[#fafafa] text-[#666]"}`}
					>
						{ep.method}
					</span>
					<h1 className="font-mono font-semibold text-[#111] text-[18px] tracking-tight">
						{ep.routePattern}
					</h1>
					<span className="font-mono text-[#bbb] text-[12px]">
						{ep.eventCount.toLocaleString()} total
					</span>
				</div>
			</div>

			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="flex rounded-md border border-[#e8e8e8]">
						{TIME_RANGES.map((r, i) => (
							<button
								key={r.value}
								type="button"
								onClick={() => setTimeRange(r.value)}
								className={`px-2.5 py-1 font-mono text-[11px] transition-colors ${
									i > 0 ? "border-[#e8e8e8] border-l" : ""
								} ${
									timeRange === r.value
										? "bg-[#111] text-white"
										: "text-[#999] hover:bg-[#fafafa] hover:text-[#666]"
								}`}
							>
								{r.label}
							</button>
						))}
					</div>
					{statusCodes && statusCodes.length > 1 && (
						<div className="flex items-center gap-1">
							<button
								type="button"
								onClick={() => setStatusCode(undefined)}
								className={`rounded px-2 py-1 font-mono text-[11px] transition-colors ${
									!statusCode
										? "bg-[#111] text-white"
										: "text-[#bbb] hover:text-[#666]"
								}`}
							>
								all
							</button>
							{statusCodes.map((sc) => (
								<button
									key={sc.statusCode}
									type="button"
									onClick={() =>
										setStatusCode(
											statusCode === sc.statusCode ? undefined : sc.statusCode,
										)
									}
									className={`rounded px-2 py-1 font-mono text-[11px] transition-colors ${
										statusCode === sc.statusCode
											? "bg-[#111] text-white"
											: "text-[#bbb] hover:text-[#666]"
									}`}
								>
									{sc.statusCode}
								</button>
							))}
						</div>
					)}
				</div>
				<div className="flex items-center gap-4">
					{!histLoading && (
						<span className="font-mono text-[#bbb] text-[11px]">
							{totalInRange.toLocaleString()} req
							{errorsInRange > 0 && (
								<>
									{" · "}
									<span className="text-[#dc2626]">{errorsInRange} err</span>
								</>
							)}
						</span>
					)}
					<button
						type="button"
						onClick={() => setShowFilters(!showFilters)}
						className={`rounded px-2 py-1 font-mono text-[11px] transition-colors ${
							showFilters || jsonFilters.length > 0
								? "bg-[#111] text-white"
								: "text-[#bbb] hover:text-[#666]"
						}`}
					>
						filter{jsonFilters.length > 0 ? ` (${jsonFilters.length})` : ""}
					</button>
				</div>
			</div>

			<div className="mt-3">
				<Histogram
					buckets={histogramData?.buckets ?? []}
					isLoading={histLoading}
				/>
			</div>

			{showFilters && (
				<div className="mt-3">
					<JsonFilterBar
						filters={jsonFilters}
						onAdd={addJsonFilter}
						onRemove={removeJsonFilter}
					/>
				</div>
			)}

			<div className="mt-4">
				{eventsLoading ? (
					<div className="overflow-hidden rounded-lg border border-[#e8e8e8]">
						{Array.from({ length: 20 }, (_, i) => (
							<div
								key={i}
								className="flex items-center gap-3 border-[#f0f0f0] border-b px-3 py-[7px] last:border-b-0"
							>
								<div className="h-3 w-16 animate-pulse rounded bg-[#f0f0f0]" />
								<div className="h-3 w-6 animate-pulse rounded bg-[#f0f0f0]" />
								<div className="h-3 flex-1 animate-pulse rounded bg-[#f0f0f0]" />
							</div>
						))}
					</div>
				) : allEvents.length === 0 ? (
					<div className="overflow-hidden rounded-lg border border-[#e8e8e8] px-4 py-16 text-center">
						<p className="text-[#ccc] text-[13px]">
							No events match the current filters.
						</p>
					</div>
				) : (
					<VirtualizedEventLog
						events={allEvents}
						hasNextPage={hasNextPage ?? false}
						isFetchingNextPage={isFetchingNextPage}
						fetchNextPage={triggerNextPage}
						selectedId={selectedEvent?.id ?? null}
						onSelect={setSelectedEvent}
					/>
				)}
			</div>

			{selectedEvent && (
				<EventSidePanel
					event={selectedEvent}
					method={ep.method}
					route={ep.routePattern}
					maxDuration={maxDuration}
					onClose={() => setSelectedEvent(null)}
				/>
			)}
		</div>
	);
}
