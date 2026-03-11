import { jensenShannonDivergence } from "../math/js-divergence";
import type { Aggregate, Baseline, DetectorConfig, Shift } from "../types";

export function detectEnumDistributionShifts(
	baseline: Baseline,
	current: Aggregate[],
	config: DetectorConfig,
): Shift[] {
	const shifts: Shift[] = [];

	if (current.length === 0) return shifts;

	const currentDistributions = new Map<string, Record<string, number>>();
	for (const agg of current) {
		for (const entry of agg.enumDistributions) {
			const existing = currentDistributions.get(entry.fieldPath) || {};
			for (const [value, count] of Object.entries(entry.distribution)) {
				existing[value] = (existing[value] || 0) + count;
			}
			currentDistributions.set(entry.fieldPath, existing);
		}
	}

	for (const baselineEntry of baseline.signals.enumDistributions) {
		const currentDist = currentDistributions.get(baselineEntry.fieldPath);
		if (!currentDist) continue;

		const totalCurrent = Object.values(currentDist).reduce((s, v) => s + v, 0);
		if (totalCurrent === 0) continue;

		const jsd = jensenShannonDivergence(
			baselineEntry.distribution,
			currentDist,
		);

		if (jsd >= config.enumJsDivergenceThreshold) {
			shifts.push({
				endpointId: baseline.endpointId,
				userId: baseline.userId,
				signalType: "enum_distribution",
				fieldName: baselineEntry.fieldPath,
				baselineValue: baselineEntry.distribution,
				currentValue: currentDist,
				confidence: Math.min(jsd / 0.5, 1),
			});
		}
	}

	return shifts;
}
