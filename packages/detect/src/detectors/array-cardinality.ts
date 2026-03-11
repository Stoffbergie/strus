import { mean as calcMean, zScore } from "../math/z-score";
import type { Aggregate, Baseline, DetectorConfig, Shift } from "../types";

export function detectArrayCardinalityShifts(
	baseline: Baseline,
	current: Aggregate[],
	config: DetectorConfig,
): Shift[] {
	const shifts: Shift[] = [];

	if (current.length === 0) return shifts;

	const currentMeans = new Map<string, number[]>();
	for (const agg of current) {
		for (const entry of agg.arrayCardinalities) {
			const existing = currentMeans.get(entry.fieldPath) || [];
			existing.push(entry.mean);
			currentMeans.set(entry.fieldPath, existing);
		}
	}

	for (const baselineEntry of baseline.signals.arrayCardinalities) {
		const currentValues = currentMeans.get(baselineEntry.fieldPath);
		if (!currentValues || currentValues.length === 0) continue;

		const currentMeanVal = calcMean(currentValues);
		const z = zScore(currentMeanVal, baselineEntry.mean, baselineEntry.stddev);

		if (z >= config.arrayCardinalityZThreshold) {
			shifts.push({
				endpointId: baseline.endpointId,
				userId: baseline.userId,
				signalType: "array_cardinality",
				fieldName: baselineEntry.fieldPath,
				baselineValue: {
					mean: baselineEntry.mean,
					stddev: baselineEntry.stddev,
					median: baselineEntry.median,
				},
				currentValue: { mean: currentMeanVal },
				confidence: Math.min(z / 10, 1),
			});
		}
	}

	return shifts;
}
