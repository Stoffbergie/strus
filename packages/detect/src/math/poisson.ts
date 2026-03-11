export function poissonProbability(observed: number, expected: number): number {
	if (expected <= 0) {
		return observed === 0 ? 1 : 0;
	}

	let logProb = -expected + observed * Math.log(expected);
	for (let i = 1; i <= observed; i++) {
		logProb -= Math.log(i);
	}

	return Math.exp(logProb);
}

export function poissonSurvivalProbability(
	observed: number,
	expected: number,
): number {
	if (expected <= 0) {
		return observed === 0 ? 1 : 0;
	}

	let cumulativeProb = 0;
	for (let k = 0; k < observed; k++) {
		cumulativeProb += poissonProbability(k, expected);
	}

	return 1 - cumulativeProb;
}
