"use client";

import { useState } from "react";
import { toast } from "sonner";

import { api } from "~/trpc/react";

export default function VerificationForm({
	shiftId,
	onVerified,
}: {
	shiftId: string;
	onVerified: () => void;
}) {
	const [note, setNote] = useState("");

	const verify = api.shifts.verify.useMutation({
		onSuccess: (_data, variables) => {
			toast.success(
				variables.verdict === "intended"
					? "Marked as intended. Baseline will update."
					: "Marked as unintended. Investigating.",
			);
			onVerified();
		},
		onError: () => {
			toast.error("Failed to submit verification.");
		},
	});

	function handleVerdict(verdict: "intended" | "unintended") {
		verify.mutate({ shiftId, verdict, note: note || undefined });
	}

	return (
		<div className="rounded-xl border border-[#e8e8e8] bg-[#fafafa] p-5">
			<div className="mb-1 font-semibold text-[#111] text-[15px]">
				Is this intended?
			</div>
			<p className="mb-4 text-[#999] text-[13px]">
				Verify whether this behavioral change was expected.
			</p>
			<textarea
				className="w-full rounded-lg border border-[#e0e0e0] bg-white px-4 py-3 text-[#111] text-[13px] outline-none transition-colors placeholder:text-[#bbb] focus:border-[#111]"
				placeholder="Optional note..."
				rows={2}
				value={note}
				onChange={(e) => setNote(e.target.value)}
			/>
			<div className="mt-3 flex gap-2">
				<button
					type="button"
					disabled={verify.isPending}
					onClick={() => handleVerdict("intended")}
					className="flex-1 rounded-lg border border-[#e8e8e8] bg-white px-4 py-2.5 font-semibold text-[#111] text-[13px] transition-colors hover:bg-[#fafafa] disabled:opacity-50"
				>
					Intended
				</button>
				<button
					type="button"
					disabled={verify.isPending}
					onClick={() => handleVerdict("unintended")}
					className="flex-1 rounded-lg bg-[#dc2626] px-4 py-2.5 font-semibold text-[13px] text-white transition-colors hover:bg-[#b91c1c] disabled:opacity-50"
				>
					Unintended
				</button>
			</div>
		</div>
	);
}
