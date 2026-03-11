import { detectArrayCardinalityShifts } from "./detectors/array-cardinality";
import { detectEnumDistributionShifts } from "./detectors/enum-distribution";
import { detectErrorRateShifts } from "./detectors/error-rate";
import { detectNewValueShifts } from "./detectors/new-value";
import { detectNullRateShifts } from "./detectors/null-rate";
import type { Aggregate, Baseline, DetectorConfig, Shift } from "./types";
import { DEFAULT_DETECTOR_CONFIG } from "./types";

export function runDetectors(
	baseline: Baseline,
	currentAggregates: Aggregate[],
	configOverrides?: Partial<DetectorConfig>,
): Shift[] {
	const config = { ...DEFAULT_DETECTOR_CONFIG, ...configOverrides };

	const shifts: Shift[] = [
		...detectNullRateShifts(baseline, currentAggregates, config),
		...detectEnumDistributionShifts(baseline, currentAggregates, config),
		...detectArrayCardinalityShifts(baseline, currentAggregates, config),
		...detectErrorRateShifts(baseline, currentAggregates, config),
		...detectNewValueShifts(baseline, currentAggregates, config),
	];

	return shifts;
}
