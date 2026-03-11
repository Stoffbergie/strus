import { mean, stddev } from "./math/z-score";
import type { Aggregate, Baseline, BaselineSignals } from "./types";

export function computeBaseline(
	aggregates: Aggregate[],
	endpointId: string,
	userId: string,
	windowDays: number,
): Baseline | null {
	if (aggregates.length === 0) return null;

	const now = new Date();
	const windowStart = new Date(
		now.getTime() - windowDays * 24 * 60 * 60 * 1000,
	);

	const windowAggregates = aggregates.filter(
		(a) =>
			a.endpointId === endpointId &&
			a.userId === userId &&
			a.windowStart >= windowStart,
	);

	if (windowAggregates.length === 0) return null;

	const signals = computeBaselineSignals(windowAggregates);

	return {
		id: `baseline_${endpointId}_${userId}_${Date.now()}`,
		endpointId,
		userId,
		windowStart,
		windowEnd: now,
		windowDays,
		signals,
	};
}

function computeBaselineSignals(aggregates: Aggregate[]): BaselineSignals {
	return {
		nullRates: computeNullRateBaseline(aggregates),
		enumDistributions: computeEnumBaseline(aggregates),
		arrayCardinalities: computeArrayBaseline(aggregates),
		errorRate: computeErrorRateBaseline(aggregates),
		observedValues: computeObservedValuesBaseline(aggregates),
	};
}

function computeNullRateBaseline(aggregates: Aggregate[]) {
	const fieldRates = new Map<string, number[]>();
	const fieldCounts = new Map<string, number>();

	for (const agg of aggregates) {
		for (const entry of agg.nullRates) {
			const rates = fieldRates.get(entry.fieldPath) || [];
			rates.push(entry.rate);
			fieldRates.set(entry.fieldPath, rates);
			fieldCounts.set(
				entry.fieldPath,
				(fieldCounts.get(entry.fieldPath) || 0) + entry.totalCount,
			);
		}
	}

	return [...fieldRates.entries()].map(([fieldPath, rates]) => ({
		fieldPath,
		mean: mean(rates),
		stddev: stddev(rates),
		sampleCount: fieldCounts.get(fieldPath) || 0,
	}));
}

function computeEnumBaseline(aggregates: Aggregate[]) {
	const fieldDistributions = new Map<
		string,
		{ distribution: Record<string, number>; totalCount: number }
	>();

	for (const agg of aggregates) {
		for (const entry of agg.enumDistributions) {
			const existing = fieldDistributions.get(entry.fieldPath) || {
				distribution: {},
				totalCount: 0,
			};
			for (const [value, count] of Object.entries(entry.distribution)) {
				existing.distribution[value] =
					(existing.distribution[value] || 0) + count;
			}
			existing.totalCount += entry.totalCount;
			fieldDistributions.set(entry.fieldPath, existing);
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

function computeArrayBaseline(aggregates: Aggregate[]) {
	const fieldMeans = new Map<string, number[]>();
	const fieldMedians = new Map<string, number[]>();
	const fieldP95s = new Map<string, number[]>();
	const fieldCounts = new Map<string, number>();

	for (const agg of aggregates) {
		for (const entry of agg.arrayCardinalities) {
			const means = fieldMeans.get(entry.fieldPath) || [];
			means.push(entry.mean);
			fieldMeans.set(entry.fieldPath, means);

			const medians = fieldMedians.get(entry.fieldPath) || [];
			medians.push(entry.median);
			fieldMedians.set(entry.fieldPath, medians);

			const p95s = fieldP95s.get(entry.fieldPath) || [];
			p95s.push(entry.p95);
			fieldP95s.set(entry.fieldPath, p95s);

			fieldCounts.set(
				entry.fieldPath,
				(fieldCounts.get(entry.fieldPath) || 0) + entry.sampleCount,
			);
		}
	}

	return [...fieldMeans.entries()].map(([fieldPath, means]) => ({
		fieldPath,
		mean: mean(means),
		median: mean(fieldMedians.get(fieldPath) || []),
		stddev: stddev(means),
		p95: mean(fieldP95s.get(fieldPath) || []),
		sampleCount: fieldCounts.get(fieldPath) || 0,
	}));
}

function computeErrorRateBaseline(aggregates: Aggregate[]) {
	const rates = aggregates.map((a) => a.errorRate);
	const totalEvents = aggregates.reduce((sum, a) => sum + a.eventCount, 0);
	const totalErrors = aggregates.reduce((sum, a) => sum + a.errorCount, 0);

	return {
		mean: mean(rates),
		stddev: stddev(rates),
		totalEvents,
		totalErrors,
	};
}

function computeObservedValuesBaseline(aggregates: Aggregate[]) {
	const fieldValues: Record<string, Set<string>> = {};

	for (const agg of aggregates) {
		for (const [fieldPath, values] of Object.entries(agg.observedValues)) {
			if (!fieldValues[fieldPath]) {
				fieldValues[fieldPath] = new Set();
			}
			for (const value of values) {
				fieldValues[fieldPath].add(value);
			}
		}
	}

	return fieldValues;
}
