export function zScore(value: number, mean: number, stddev: number): number {
	if (stddev === 0) {
		return value === mean ? 0 : Number.POSITIVE_INFINITY;
	}
	return Math.abs((value - mean) / stddev);
}

export function mean(values: number[]): number {
	if (values.length === 0) return 0;
	return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function stddev(values: number[], populationMean?: number): number {
	if (values.length < 2) return 0;
	const m = populationMean ?? mean(values);
	const squaredDiffs = values.reduce((sum, v) => sum + (v - m) ** 2, 0);
	return Math.sqrt(squaredDiffs / (values.length - 1));
}

export function median(values: number[]): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	if (sorted.length % 2 === 0) {
		return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
	}
	return sorted[mid] ?? 0;
}

export function percentile(values: number[], p: number): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const idx = (p / 100) * (sorted.length - 1);
	const lower = Math.floor(idx);
	const upper = Math.ceil(idx);
	if (lower === upper) return sorted[lower] ?? 0;
	const weight = idx - lower;
	return (sorted[lower] ?? 0) * (1 - weight) + (sorted[upper] ?? 0) * weight;
}
