function klDivergence(p: number[], q: number[]): number {
	let sum = 0;
	for (let i = 0; i < p.length; i++) {
		const pValue = p[i] ?? 0;
		const qValue = q[i] ?? 0;
		if (pValue > 0 && qValue > 0) {
			sum += pValue * Math.log2(pValue / qValue);
		}
	}
	return sum;
}

export function jensenShannonDivergence(
	p: Record<string, number>,
	q: Record<string, number>,
): number {
	const allKeys = new Set([...Object.keys(p), ...Object.keys(q)]);
	if (allKeys.size === 0) return 0;

	const pTotal = Object.values(p).reduce((s, v) => s + v, 0);
	const qTotal = Object.values(q).reduce((s, v) => s + v, 0);

	if (pTotal === 0 || qTotal === 0) return 1;

	const pNorm: number[] = [];
	const qNorm: number[] = [];
	const m: number[] = [];

	for (const key of allKeys) {
		const pVal = (p[key] || 0) / pTotal;
		const qVal = (q[key] || 0) / qTotal;
		pNorm.push(pVal);
		qNorm.push(qVal);
		m.push((pVal + qVal) / 2);
	}

	return (klDivergence(pNorm, m) + klDivergence(qNorm, m)) / 2;
}
