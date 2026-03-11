import { zScore } from "../math/z-score";
import type { Aggregate, Baseline, DetectorConfig, Shift } from "../types";

export function detectNullRateShifts(
	baseline: Baseline,
	current: Aggregate[],
	config: DetectorConfig,
): Shift[] {
	const shifts: Shift[] = [];

	if (current.length === 0) return shifts;

	const currentNullRates = new Map<
		string,
		{ totalCount: number; nullCount: number }
	>();
	for (const agg of current) {
		for (const entry of agg.nullRates) {
			const existing = currentNullRates.get(entry.fieldPath) || {
				totalCount: 0,
				nullCount: 0,
			};
			existing.totalCount += entry.totalCount;
			existing.nullCount += entry.nullCount;
			currentNullRates.set(entry.fieldPath, existing);
		}
	}

	for (const baselineEntry of baseline.signals.nullRates) {
		const currentEntry = currentNullRates.get(baselineEntry.fieldPath);
		if (!currentEntry || currentEntry.totalCount === 0) continue;

		const currentRate = currentEntry.nullCount / currentEntry.totalCount;
		const absoluteChange = Math.abs(currentRate - baselineEntry.mean);

		if (absoluteChange < config.nullRateAbsoluteFloor) continue;

		const z = zScore(currentRate, baselineEntry.mean, baselineEntry.stddev);

		if (z >= config.nullRateZThreshold) {
			shifts.push({
				endpointId: baseline.endpointId,
				userId: baseline.userId,
				signalType: "null_rate",
				fieldName: baselineEntry.fieldPath,
				baselineValue: {
					mean: baselineEntry.mean,
					stddev: baselineEntry.stddev,
				},
				currentValue: {
					rate: currentRate,
					sampleSize: currentEntry.totalCount,
				},
				confidence: Math.min(z / 10, 1),
			});
		}
	}

	return shifts;
}
