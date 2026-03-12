"use client";

import { Button } from "@strus/ui/components/button";
import { Textarea } from "@strus/ui/components/textarea";
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
			<Textarea
				className="text-[13px]"
				placeholder="Optional note..."
				rows={2}
				value={note}
				onChange={(e) => setNote(e.target.value)}
			/>
			<div className="mt-3 flex gap-2">
				<Button
					variant="outline"
					className="flex-1"
					loading={verify.isPending}
					onClick={() => handleVerdict("intended")}
				>
					Intended
				</Button>
				<Button
					variant="destructive"
					className="flex-1"
					loading={verify.isPending}
					onClick={() => handleVerdict("unintended")}
				>
					Unintended
				</Button>
			</div>
		</div>
	);
}
