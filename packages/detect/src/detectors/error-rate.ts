import { poissonSurvivalProbability } from "../math/poisson";
import type { Aggregate, Baseline, DetectorConfig, Shift } from "../types";

export function detectErrorRateShifts(
	baseline: Baseline,
	current: Aggregate[],
	config: DetectorConfig,
): Shift[] {
	const shifts: Shift[] = [];

	if (current.length === 0) return shifts;

	let totalEvents = 0;
	let totalErrors = 0;
	for (const agg of current) {
		totalEvents += agg.eventCount;
		totalErrors += agg.errorCount;
	}

	if (totalEvents === 0) return shifts;

	const expectedErrors = baseline.signals.errorRate.mean * totalEvents;
	const survivalP = poissonSurvivalProbability(totalErrors, expectedErrors);

	if (survivalP < config.errorRateThreshold) {
		const currentRate = totalErrors / totalEvents;
		shifts.push({
			endpointId: baseline.endpointId,
			userId: baseline.userId,
			signalType: "error_rate",
			fieldName: null,
			baselineValue: {
				mean: baseline.signals.errorRate.mean,
				totalEvents: baseline.signals.errorRate.totalEvents,
			},
			currentValue: { rate: currentRate, totalEvents, totalErrors },
			confidence: Math.min(1 - survivalP, 1),
		});
	}

	return shifts;
}
