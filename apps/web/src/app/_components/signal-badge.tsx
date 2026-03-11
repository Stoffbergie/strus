type SignalType =
	| "null_rate"
	| "enum_distribution"
	| "array_cardinality"
	| "error_rate"
	| "new_value";

const SIGNAL_CONFIG: Record<SignalType, { label: string; className: string }> =
	{
		null_rate: {
			label: "Null Rate",
			className: "bg-[#fef3c7] text-[#92400e]",
		},
		enum_distribution: {
			label: "Enum Shift",
			className: "bg-[#ede9fe] text-[#5b21b6]",
		},
		array_cardinality: {
			label: "Array Size",
			className: "bg-[#dbeafe] text-[#1e40af]",
		},
		error_rate: {
			label: "Error Rate",
			className: "bg-[#fee2e2] text-[#991b1b]",
		},
		new_value: {
			label: "New Value",
			className: "bg-[#d1fae5] text-[#065f46]",
		},
	};

export default function SignalBadge({ type }: { type: string }) {
	const config = SIGNAL_CONFIG[type as SignalType] || {
		label: type,
		className: "bg-[#fafafa] text-[#666]",
	};

	return (
		<span
			className={`inline-flex items-center rounded px-1.5 py-0.5 font-semibold text-[10px] uppercase tracking-wide ${config.className}`}
		>
			{config.label}
		</span>
	);
}
