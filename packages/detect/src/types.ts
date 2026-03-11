export type SignalType =
	| "null_rate"
	| "enum_distribution"
	| "array_cardinality"
	| "error_rate"
	| "new_value";

export type TimeRange = {
	start: Date;
	end: Date;
};

export type NullRateEntry = {
	fieldPath: string;
	totalCount: number;
	nullCount: number;
	rate: number;
};

export type EnumDistribution = {
	fieldPath: string;
	distribution: Record<string, number>;
	totalCount: number;
};

export type ArrayCardinalityEntry = {
	fieldPath: string;
	mean: number;
	median: number;
	stddev: number;
	p95: number;
	sampleCount: number;
};

export type Aggregate = {
	id: string;
	endpointId: string;
	userId: string;
	windowStart: Date;
	windowEnd: Date;
	eventCount: number;
	errorCount: number;
	errorRate: number;
	nullRates: NullRateEntry[];
	enumDistributions: EnumDistribution[];
	arrayCardinalities: ArrayCardinalityEntry[];
	observedValues: Record<string, string[]>;
};

export type BaselineSignals = {
	nullRates: Array<{
		fieldPath: string;
		mean: number;
		stddev: number;
		sampleCount: number;
	}>;
	enumDistributions: Array<{
		fieldPath: string;
		distribution: Record<string, number>;
		totalCount: number;
	}>;
	arrayCardinalities: Array<{
		fieldPath: string;
		mean: number;
		median: number;
		stddev: number;
		p95: number;
		sampleCount: number;
	}>;
	errorRate: {
		mean: number;
		stddev: number;
		totalEvents: number;
		totalErrors: number;
	};
	observedValues: Record<string, Set<string>>;
};

export type Baseline = {
	id: string;
	endpointId: string;
	userId: string;
	windowStart: Date;
	windowEnd: Date;
	windowDays: number;
	signals: BaselineSignals;
};

export type Shift = {
	endpointId: string;
	userId: string;
	signalType: SignalType;
	fieldName: string | null;
	baselineValue: unknown;
	currentValue: unknown;
	confidence: number;
};

export type DetectorConfig = {
	nullRateZThreshold: number;
	nullRateAbsoluteFloor: number;
	enumJsDivergenceThreshold: number;
	arrayCardinalityZThreshold: number;
	errorRateThreshold: number;
	newValueMinObservations: number;
};

export const DEFAULT_DETECTOR_CONFIG: DetectorConfig = {
	nullRateZThreshold: 3.0,
	nullRateAbsoluteFloor: 0.05,
	enumJsDivergenceThreshold: 0.15,
	arrayCardinalityZThreshold: 3.0,
	errorRateThreshold: 0.001,
	newValueMinObservations: 3,
};
