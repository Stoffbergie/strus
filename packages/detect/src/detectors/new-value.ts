import type { Aggregate, Baseline, DetectorConfig, Shift } from "../types";

export function detectNewValueShifts(
	baseline: Baseline,
	current: Aggregate[],
	config: DetectorConfig,
): Shift[] {
	const shifts: Shift[] = [];

	if (current.length === 0) return shifts;

	const currentValues = new Map<string, Map<string, number>>();
	for (const agg of current) {
		for (const [fieldPath, values] of Object.entries(agg.observedValues)) {
			const existing = currentValues.get(fieldPath) || new Map();
			for (const value of values) {
				existing.set(value, (existing.get(value) || 0) + 1);
			}
			currentValues.set(fieldPath, existing);
		}
	}

	for (const [fieldPath, valueCounts] of currentValues) {
		const baselineSet = baseline.signals.observedValues[fieldPath];
		if (!baselineSet) continue;

		for (const [value, count] of valueCounts) {
			if (!baselineSet.has(value) && count >= config.newValueMinObservations) {
				const confidence = Math.min(count / 50, 1);
				shifts.push({
					endpointId: baseline.endpointId,
					userId: baseline.userId,
					signalType: "new_value",
					fieldName: fieldPath,
					baselineValue: { knownValues: [...baselineSet] },
					currentValue: { newValue: value, observedCount: count },
					confidence,
				});
			}
		}
	}

	return shifts;
}
