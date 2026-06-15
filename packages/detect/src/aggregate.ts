import { mean, median, percentile, stddev } from "./math/z-score";
import type {
	Aggregate,
	ArrayCardinalityEntry,
	EnumDistribution,
	NullRateEntry,
} from "./types";

type FieldSignalValue =
	| { type: "null_rate"; isNull: boolean }
	| { type: "enum_distribution"; value: string }
	| { type: "array_cardinality"; length: number }
	| { type: "new_value"; value: string };

type FieldSignal = {
	fieldPath: string;
	signalType: string;
	value: FieldSignalValue;
};

export type RawEvent = {
	id: string;
	endpointId: string;
	userId: string;
	statusCode: number;
	signals: FieldSignal[];
	receivedAt: Date;
};

export function bucketEvents(
	events: RawEvent[],
	windowMinutes: number,
): Aggregate[] {
	if (events.length === 0) return [];

	const buckets = new Map<string, RawEvent[]>();

	for (const event of events) {
		const windowStart = new Date(
			Math.floor(event.receivedAt.getTime() / (windowMinutes * 60_000)) *
				windowMinutes *
				60_000,
		);
		const key = `${event.endpointId}|${event.userId}|${windowStart.toISOString()}`;
		const bucket = buckets.get(key) || [];
		bucket.push(event);
		buckets.set(key, bucket);
	}

	const aggregates: Aggregate[] = [];

	for (const [key, bucketEvents] of buckets) {
		const [endpointId, userId, windowStartStr] = key.split("|");
		if (!endpointId || !userId || !windowStartStr) continue;

		const windowStart = new Date(windowStartStr);
		const windowEnd = new Date(windowStart.getTime() + windowMinutes * 60_000);

		const eventCount = bucketEvents.length;
		const errorCount = bucketEvents.filter((e) => e.statusCode >= 400).length;

		const nullRates = computeNullRates(bucketEvents);
		const enumDistributions = computeEnumDistributions(bucketEvents);
		const arrayCardinalities = computeArrayCardinalities(bucketEvents);
		const observedValues = computeObservedValues(bucketEvents);

		aggregates.push({
			id: `agg_${key}`,
			endpointId,
			userId,
			windowStart,
			windowEnd,
			eventCount,
			errorCount,
			errorRate: eventCount > 0 ? errorCount / eventCount : 0,
			nullRates,
			enumDistributions,
			arrayCardinalities,
			observedValues,
		});
	}

	return aggregates;
}

function computeNullRates(events: RawEvent[]): NullRateEntry[] {
	const fieldCounts = new Map<
		string,
		{ totalCount: number; nullCount: number }
	>();

	for (const event of events) {
		for (const signal of event.signals) {
			if (signal.signalType !== "null_rate") continue;
			const entry = fieldCounts.get(signal.fieldPath) || {
				totalCount: 0,
				nullCount: 0,
			};
			entry.totalCount++;
			if (signal.value.type === "null_rate" && signal.value.isNull) {
				entry.nullCount++;
			}
			fieldCounts.set(signal.fieldPath, entry);
		}
	}

	return [...fieldCounts.entries()].map(
		([fieldPath, { totalCount, nullCount }]) => ({
			fieldPath,
			totalCount,
			nullCount,
			rate: totalCount > 0 ? nullCount / totalCount : 0,
		}),
	);
}

function computeEnumDistributions(events: RawEvent[]): EnumDistribution[] {
	const fieldDistributions = new Map<
		string,
		{ distribution: Record<string, number>; totalCount: number }
	>();

	for (const event of events) {
		for (const signal of event.signals) {
			if (signal.signalType !== "enum_distribution") continue;
			if (signal.value.type !== "enum_distribution") continue;
			const entry = fieldDistributions.get(signal.fieldPath) || {
				distribution: {},
				totalCount: 0,
			};
			entry.distribution[signal.value.value] =
				(entry.distribution[signal.value.value] || 0) + 1;
			entry.totalCount++;
			fieldDistributions.set(signal.fieldPath, entry);
		}
	}

	return [...fieldDistributions.entries()].map(
		([fieldPath, { distribution, totalCount }]) => ({
			fieldPath,
			distribution,
			totalCount,
		}),
	);
}

function computeArrayCardinalities(
	events: RawEvent[],
): ArrayCardinalityEntry[] {
	const fieldLengths = new Map<string, number[]>();

	for (const event of events) {
		for (const signal of event.signals) {
			if (signal.signalType !== "array_cardinality") continue;
			if (signal.value.type !== "array_cardinality") continue;
			const lengths = fieldLengths.get(signal.fieldPath) || [];
			lengths.push(signal.value.length);
			fieldLengths.set(signal.fieldPath, lengths);
		}
	}

	return [...fieldLengths.entries()].map(([fieldPath, lengths]) => ({
		fieldPath,
		mean: mean(lengths),
		median: median(lengths),
		stddev: stddev(lengths),
		p95: percentile(lengths, 95),
		sampleCount: lengths.length,
	}));
}

function computeObservedValues(events: RawEvent[]): Record<string, string[]> {
	const fieldValues = new Map<string, Set<string>>();

	for (const event of events) {
		for (const signal of event.signals) {
			if (signal.signalType !== "new_value") continue;
			if (signal.value.type !== "new_value") continue;
			const values = fieldValues.get(signal.fieldPath) || new Set();
			values.add(signal.value.value);
			fieldValues.set(signal.fieldPath, values);
		}
	}

	const result: Record<string, string[]> = {};
	for (const [fieldPath, values] of fieldValues) {
		result[fieldPath] = [...values];
	}
	return result;
}
