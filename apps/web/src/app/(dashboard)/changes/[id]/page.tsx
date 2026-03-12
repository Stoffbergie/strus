"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import SignalBadge from "~/app/_components/signal-badge";
import VerificationForm from "~/app/_components/verification-form";
import { api } from "~/trpc/react";

export default function ChangeDetailPage() {
	const { id } = useParams<{ id: string }>();
	const utils = api.useUtils();

	const { data: shift, isLoading } = api.shifts.get.useQuery({ id });

	if (isLoading) {
		return (
			<div className="space-y-4">
				<div className="h-8 w-48 animate-pulse rounded-lg bg-[#fafafa]" />
				<div className="grid grid-cols-2 gap-4">
					{[1, 2].map((i) => (
						<div
							key={i}
							className="h-48 animate-pulse rounded-xl bg-[#fafafa]"
						/>
					))}
				</div>
			</div>
		);
	}

	if (!shift) {
		return (
			<div className="pt-20 text-center">
				<p className="font-medium text-[#111] text-[15px]">Change not found</p>
				<p className="mt-2 text-[#999] text-[13px]">
					This change may have been removed or the link is invalid.
				</p>
			</div>
		);
	}

	const isResolved = shift.resolvedAt !== null;

	return (
		<div>
			<Link
				href="/changes"
				className="mb-6 inline-flex items-center gap-1 text-[#999] text-[13px] no-underline transition-colors hover:text-[#666]"
			>
				← Back to changes
			</Link>

			<div className="flex items-start justify-between gap-4">
				<div>
					<div className="flex items-center gap-2">
						<SignalBadge type={shift.signalType} />
						{isResolved && (
							<span className="rounded bg-[#d1fae5] px-1.5 py-0.5 font-semibold text-[#065f46] text-[10px] uppercase">
								Verified
							</span>
						)}
					</div>
					<h1 className="mt-3 font-bold text-[#111] text-[24px] tracking-[-0.035em]">
						{shift.fieldName || "Endpoint level change"}
					</h1>
					<p className="mt-1 font-mono text-[#bbb] text-[12px]">
						Detected {new Date(shift.detectedAt).toLocaleString()}
					</p>
				</div>
				<div className="text-right">
					<p className="font-bold text-[#111] text-[32px] tabular-nums">
						{Math.round(shift.confidence * 100)}%
					</p>
					<p className="text-[#bbb] text-[11px]">confidence</p>
				</div>
			</div>

			<div className="mt-8 grid grid-cols-2 gap-4">
				<div className="rounded-xl border border-[#e8e8e8] bg-[#fafafa] p-5">
					<div className="mb-3 font-semibold text-[#bbb] text-[11px] uppercase tracking-[0.15em]">
						Baseline
					</div>
					<pre className="overflow-auto rounded-lg bg-white p-6 font-mono text-[#111] text-[12px] leading-relaxed ring-1 ring-[#e8e8e8]">
						{JSON.stringify(shift.baselineValue, null, 2)}
					</pre>
				</div>
				<div className="rounded-xl border border-[#f59e0b]/20 bg-[#fffbeb] p-5">
					<div className="mb-3 font-semibold text-[#92400e] text-[11px] uppercase tracking-[0.15em]">
						Current
					</div>
					<pre className="overflow-auto rounded-lg bg-white/50 p-6 font-mono text-[#111] text-[12px] leading-relaxed ring-1 ring-[#f59e0b]/20">
						{JSON.stringify(shift.currentValue, null, 2)}
					</pre>
				</div>
			</div>

			{!isResolved && (
				<div className="mt-8">
					<VerificationForm
						shiftId={shift.id}
						onVerified={() => {
							void utils.shifts.get.invalidate({ id });
						}}
					/>
				</div>
			)}
		</div>
	);
}
