"use client";

import { Button } from "@strus/ui/components/button";
import { Input } from "@strus/ui/components/input";
import { Textarea } from "@strus/ui/components/textarea";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { api } from "~/trpc/react";

const PLATFORMS = [
	"Datadog",
	"CloudWatch",
	"New Relic",
	"Grafana",
	"PagerDuty",
	"Splunk",
] as const;

const MONITORING_DATA = [
	3, 3, 3, 4, 3, 3, 3, 4, 3, 3, 3, 3, 4, 3, 3, 3, 4, 3, 3, 3, 3, 4, 3, 3,
];
const BEHAVIOR_DATA = [
	3, 3, 4, 3, 3, 4, 3, 4, 3, 3, 4, 3, 9, 11, 10, 12, 11, 10, 11, 12, 11, 10, 11,
	12,
];

function useCyclingText(items: readonly string[], intervalMs: number) {
	const [index, setIndex] = useState(0);
	const [visible, setVisible] = useState(true);

	useEffect(() => {
		const timer = setInterval(() => {
			setVisible(false);
			setTimeout(() => {
				setIndex((prev) => (prev + 1) % items.length);
				setVisible(true);
			}, 300);
		}, intervalMs);
		return () => clearInterval(timer);
	}, [items.length, intervalMs]);

	return { text: items[index], visible };
}

interface PayloadField {
	name: string;
	value: string;
	sensitive?: boolean;
	tracked?: boolean;
}

function PayloadCard({
	industry,
	endpoint,
	fields,
}: {
	industry: string;
	endpoint: string;
	fields: PayloadField[];
}) {
	return (
		<div className="overflow-hidden rounded-xl border border-[#e8e8e8] bg-[#fafafa]">
			<div className="flex items-center justify-between border-[#e8e8e8] border-b px-4 py-3">
				<span className="font-semibold text-[#111] text-[13px]">
					{industry}
				</span>
				<span className="font-mono text-[#bbb] text-[11px]">{endpoint}</span>
			</div>
			<div className="p-6 font-mono text-[12px] leading-relaxed">
				<div className="text-[#999]">{"{"}</div>
				{fields.map((field, i) => (
					<div key={field.name} className="ml-4 flex items-center gap-1">
						{field.sensitive ? (
							<span className="text-[#ccc] line-through decoration-[#ccc]">
								"{field.name}": {field.value}
							</span>
						) : (
							<>
								<span className="text-[#111]">"{field.name}"</span>
								<span className="text-[#999]">:</span>
								<span className="ml-1 text-[#f59e0b]">{field.value}</span>
								<span className="ml-2 rounded bg-[#fef3c7] px-1 py-0.5 font-sans font-semibold text-[#92400e] text-[9px] uppercase tracking-wide">
									tracked
								</span>
							</>
						)}
						{i < fields.length - 1 && <span className="text-[#ddd]">,</span>}
					</div>
				))}
				<div className="text-[#999]">{"}"}</div>
			</div>
		</div>
	);
}

function HeroGraph() {
	const max = Math.max(...BEHAVIOR_DATA);
	const h = 100;

	function toPoints(data: number[]) {
		return data
			.map((v, i) => {
				const x = (i / (data.length - 1)) * 100;
				const y = h - (v / max) * h;
				return `${x},${y}`;
			})
			.join(" ");
	}

	function toFill(data: number[]) {
		return `0,${h} ${toPoints(data)} 100,${h}`;
	}

	const deployX = (12 / (BEHAVIOR_DATA.length - 1)) * 100;

	return (
		<div className="rounded-xl border border-[#e8e8e8] bg-[#fafafa] p-6">
			<div className="mb-4 flex items-center gap-6">
				<div className="flex items-center gap-2">
					<div className="h-2 w-4 rounded-sm bg-[#22c55e]" />
					<span className="text-[#999] text-[11px]">HTTP status (200)</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="h-2 w-4 rounded-sm bg-[#f59e0b]" />
					<span className="text-[#999] text-[11px]">
						categoryCode null rate
					</span>
				</div>
			</div>

			<div className="relative" style={{ height: `${h}px` }}>
				<svg
					viewBox={`0 0 100 ${h}`}
					className="absolute inset-0 w-full"
					preserveAspectRatio="none"
					style={{ height: `${h}px` }}
					role="img"
					aria-label="Overlay graph showing HTTP status flat while null rate spikes"
				>
					<polygon
						points={toFill(MONITORING_DATA)}
						fill="#22c55e"
						opacity="0.08"
					/>
					<polyline
						points={toPoints(MONITORING_DATA)}
						fill="none"
						stroke="#22c55e"
						strokeWidth="1.5"
						vectorEffect="non-scaling-stroke"
						opacity="0.5"
					/>

					<polygon
						points={toFill(BEHAVIOR_DATA)}
						fill="#f59e0b"
						opacity="0.12"
					/>
					<polyline
						points={toPoints(BEHAVIOR_DATA)}
						fill="none"
						stroke="#f59e0b"
						strokeWidth="2"
						vectorEffect="non-scaling-stroke"
					/>

					<line
						x1={deployX}
						y1="0"
						x2={deployX}
						y2={h}
						stroke="#f59e0b"
						strokeWidth="1"
						strokeDasharray="3,3"
						vectorEffect="non-scaling-stroke"
						opacity="0.6"
					/>
				</svg>
			</div>

			<div className="mt-3 flex items-center justify-between">
				<span className="font-mono text-[#ccc] text-[10px]">Mon 09:00</span>
				<div className="flex items-center gap-1.5">
					<div className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />
					<span className="font-mono text-[#92400e] text-[11px]">
						deploy 14:32 · null rate 1.2% → 38.4%
					</span>
				</div>
				<span className="font-mono text-[#ccc] text-[10px]">Fri 17:00</span>
			</div>
		</div>
	);
}

function AnomalyMock() {
	return (
		<div className="rounded-xl border border-[#e8e8e8] bg-[#fafafa]">
			<div className="border-[#e8e8e8] border-b px-6 py-4">
				<div className="mb-1 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<span className="font-medium text-[#111] text-[13px]">
							Active shifts
						</span>
						<span className="rounded bg-[#fef3c7] px-1.5 py-0.5 font-semibold text-[#92400e] text-[10px] uppercase">
							2 need review
						</span>
					</div>
					<span className="text-[#bbb] text-[12px]">Last 24 hours</span>
				</div>
			</div>

			<div className="divide-y divide-[#f0f0f0]">
				<div className="bg-[#fffbeb] px-6 py-5">
					<div className="mb-3 flex items-start gap-3">
						<span className="mt-0.5 shrink-0 rounded bg-[#fef3c7] px-1.5 py-0.5 font-semibold text-[#92400e] text-[10px] uppercase">
							Shift
						</span>
						<div>
							<div className="font-medium text-[#111] text-[13px]">
								Required field started returning empty
							</div>
							<div className="mt-0.5 font-mono text-[#999] text-[12px]">
								POST /api/v1/requests → response.categoryCode
							</div>
						</div>
					</div>
					<div className="grid grid-cols-[1fr_auto_1fr] items-end gap-4">
						<div>
							<div className="mb-2 text-[#bbb] text-[10px] uppercase tracking-wider">
								7 day baseline
							</div>
							<div
								className="flex items-end gap-[3px]"
								style={{ height: "66px" }}
							>
								{[2, 1, 3, 1, 2, 1, 2, 1, 1, 3, 2, 1].map((h, idx) => (
									<div
										key={`bl-${idx.toString()}`}
										className="flex-1 rounded-sm bg-[#d1d5db]"
										style={{ height: `${h * 6}px` }}
									/>
								))}
							</div>
							<div className="mt-1 font-mono text-[#999] text-[11px]">
								1.2% null
							</div>
						</div>
						<div className="mb-6 text-[#ccc] text-[16px]">→</div>
						<div>
							<div className="mb-2 text-[#bbb] text-[10px] uppercase tracking-wider">
								Since deploy
							</div>
							<div
								className="flex items-end gap-[3px]"
								style={{ height: "66px" }}
							>
								{[2, 1, 3, 8, 10, 9, 11, 10, 9, 10, 11, 10].map((h, idx) => (
									<div
										key={`cu-${idx.toString()}`}
										className="flex-1 rounded-sm"
										style={{
											height: `${h * 6}px`,
											backgroundColor: idx >= 3 ? "#f59e0b" : "#d1d5db",
										}}
									/>
								))}
							</div>
							<div className="mt-1 font-mono text-[#92400e] text-[11px]">
								38.4% null
							</div>
						</div>
					</div>
				</div>

				<div className="bg-[#fffbeb] px-6 py-5">
					<div className="mb-3 flex items-start gap-3">
						<span className="mt-0.5 shrink-0 rounded bg-[#fef3c7] px-1.5 py-0.5 font-semibold text-[#92400e] text-[10px] uppercase">
							Shift
						</span>
						<div>
							<div className="font-medium text-[#111] text-[13px]">
								Outcome ratio inverted
							</div>
							<div className="mt-0.5 font-mono text-[#999] text-[12px]">
								GET /api/v1/decisions → response.outcome
							</div>
						</div>
					</div>
					<div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
						<div>
							<div className="mb-2 text-[#bbb] text-[10px] uppercase tracking-wider">
								7 day baseline
							</div>
							<div className="space-y-1.5">
								<div>
									<div className="mb-0.5 flex items-center justify-between">
										<span className="text-[#999] text-[9px]">approved</span>
										<span className="text-[#bbb] text-[9px]">72%</span>
									</div>
									<div className="h-2 overflow-hidden rounded-full bg-[#f0f0f0]">
										<div
											className="h-full rounded-full bg-[#86efac]"
											style={{ width: "72%" }}
										/>
									</div>
								</div>
								<div>
									<div className="mb-0.5 flex items-center justify-between">
										<span className="text-[#999] text-[9px]">denied</span>
										<span className="text-[#bbb] text-[9px]">24%</span>
									</div>
									<div className="h-2 overflow-hidden rounded-full bg-[#f0f0f0]">
										<div
											className="h-full rounded-full bg-[#fca5a5]"
											style={{ width: "24%" }}
										/>
									</div>
								</div>
								<div>
									<div className="mb-0.5 flex items-center justify-between">
										<span className="text-[#999] text-[9px]">pending</span>
										<span className="text-[#bbb] text-[9px]">4%</span>
									</div>
									<div className="h-2 overflow-hidden rounded-full bg-[#f0f0f0]">
										<div
											className="h-full rounded-full bg-[#d1d5db]"
											style={{ width: "4%" }}
										/>
									</div>
								</div>
							</div>
						</div>
						<div className="text-[#ccc] text-[16px]">→</div>
						<div>
							<div className="mb-2 text-[#bbb] text-[10px] uppercase tracking-wider">
								Since deploy
							</div>
							<div className="space-y-1.5">
								<div>
									<div className="mb-0.5 flex items-center justify-between">
										<span className="text-[#999] text-[9px]">approved</span>
										<span className="text-[#92400e] text-[9px]">41%</span>
									</div>
									<div className="h-2 overflow-hidden rounded-full bg-[#f0f0f0]">
										<div
											className="h-full rounded-full bg-[#86efac]"
											style={{ width: "41%" }}
										/>
									</div>
								</div>
								<div>
									<div className="mb-0.5 flex items-center justify-between">
										<span className="text-[#999] text-[9px]">denied</span>
										<span className="text-[#92400e] text-[9px]">48%</span>
									</div>
									<div className="h-2 overflow-hidden rounded-full bg-[#f0f0f0]">
										<div
											className="h-full rounded-full bg-[#fca5a5]"
											style={{ width: "48%" }}
										/>
									</div>
								</div>
								<div>
									<div className="mb-0.5 flex items-center justify-between">
										<span className="text-[#999] text-[9px]">pending</span>
										<span className="text-[#bbb] text-[9px]">11%</span>
									</div>
									<div className="h-2 overflow-hidden rounded-full bg-[#f0f0f0]">
										<div
											className="h-full rounded-full bg-[#d1d5db]"
											style={{ width: "11%" }}
										/>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className="px-6 py-5">
					<div className="flex items-start justify-between gap-4">
						<div className="flex items-start gap-3">
							<span className="mt-0.5 shrink-0 rounded bg-[#d1fae5] px-1.5 py-0.5 font-semibold text-[#065f46] text-[10px] uppercase">
								Verified
							</span>
							<div>
								<div className="font-medium text-[#111] text-[13px]">
									Response list size decreased
								</div>
								<div className="mt-0.5 font-mono text-[#999] text-[12px]">
									POST /api/v1/claims → response.lineItems[]
								</div>
								<div className="mt-1 text-[#999] text-[11px]">
									Average dropped from 3.1 to 1.0. Team confirmed: intentional.
								</div>
							</div>
						</div>
						<div className="shrink-0 text-[#bbb] text-[11px]">R. Patel</div>
					</div>
				</div>

				<div className="px-6 py-5">
					<div className="flex items-start justify-between gap-4">
						<div className="flex items-start gap-3">
							<span className="mt-0.5 shrink-0 rounded bg-[#d1fae5] px-1.5 py-0.5 font-semibold text-[#065f46] text-[10px] uppercase">
								Verified
							</span>
							<div>
								<div className="font-medium text-[#111] text-[13px]">
									New value appeared in routing field
								</div>
								<div className="mt-0.5 font-mono text-[#999] text-[12px]">
									POST /api/v1/intake → response.queueAssignment
								</div>
								<div className="mt-1 text-[#999] text-[11px]">
									"PHARMACY_REVIEW" never seen before on this endpoint. Team
									confirmed: new workflow.
								</div>
							</div>
						</div>
						<div className="shrink-0 text-[#bbb] text-[11px]">S. Chen</div>
					</div>
				</div>
			</div>

			<div className="border-[#e8e8e8] border-t px-6 py-3">
				<div className="flex items-center justify-between text-[12px]">
					<span className="text-[#bbb]">142 endpoints monitored</span>
					<span className="text-[#bbb]">2 verified · 2 need review</span>
				</div>
			</div>
		</div>
	);
}

export default function LandingPage() {
	const [submitted, setSubmitted] = useState(false);
	const platform = useCyclingText(PLATFORMS, 2500);

	const submitContact = api.contact.submit.useMutation({
		onSuccess: () => {
			setSubmitted(true);
		},
		onError: () => {
			toast.error("Something went wrong. Please try again.");
		},
	});

	function handleSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const form = e.currentTarget;
		const data = new FormData(form);

		submitContact.mutate({
			name: data.get("name") as string,
			email: data.get("email") as string,
			company: data.get("company") as string,
			message: (data.get("message") as string) || undefined,
		});
	}

	return (
		<div className="min-h-svh bg-white text-[#111] antialiased">
			<nav
				className="mx-auto flex max-w-3xl items-center justify-between px-6 py-7"
				aria-label="Main"
			>
				<div className="font-bold text-[17px] tracking-tight">strus</div>
				<a
					href="#contact"
					className="rounded-lg bg-[#111] px-6 py-2.5 font-semibold text-[13px] text-white no-underline transition-colors hover:bg-[#333]"
				>
					Talk to us
				</a>
			</nav>

			<section className="mx-auto max-w-3xl px-6 pt-20 pb-20">
				<h1 className="mb-5 max-w-2xl font-bold text-[#111] text-[42px] leading-[1.1] tracking-[-0.035em]">
					<span
						className="inline-block transition-all duration-300"
						style={{
							opacity: platform.visible ? 1 : 0,
							transform: platform.visible ? "translateY(0)" : "translateY(4px)",
						}}
					>
						{platform.text}
					</span>{" "}
					says all clear.
					<br />
					<span className="text-[#999]">That's not enough.</span>
				</h1>
				<p className="mb-10 max-w-md text-[#666] text-[17px] leading-relaxed">
					That doesn't mean it{" "}
					<strong className="font-semibold text-[#111]">behaves</strong> the
					same as yesterday.
				</p>
				<HeroGraph />
			</section>

			<section className="mx-auto max-w-3xl px-6 pt-4 pb-4">
				<p className="text-center font-[Newsreader] text-[#666] text-[19px] italic leading-relaxed">
					We built authorization systems, payment platforms, and clinical
					workflows for companies with $50M+ in revenue. We know what breaks
					silently because we've been paged for it.
				</p>
			</section>

			<section className="mx-auto max-w-3xl px-6 pt-24">
				<div className="mb-5 font-semibold text-[#bbb] text-[11px] uppercase tracking-[0.15em]">
					What Strus actually sees
				</div>
				<div className="grid gap-5 sm:grid-cols-2">
					<PayloadCard
						industry="Healthcare"
						endpoint="POST /api/v1/requests"
						fields={[
							{ name: "patientName", value: '"Jane Smith"', sensitive: true },
							{ name: "ssn", value: '"987-65-4321"', sensitive: true },
							{ name: "dateOfBirth", value: '"1990-03-14"', sensitive: true },
							{ name: "diagnosisCode", value: '"F41.1"', tracked: true },
							{ name: "categoryCode", value: '"urgent"', tracked: true },
							{
								name: "lineItems",
								value: "[{...}, {...}, {...}]",
								tracked: true,
							},
							{
								name: "providerNotes",
								value: '"Patient reports..."',
								sensitive: true,
							},
						]}
					/>
					<PayloadCard
						industry="Financial services"
						endpoint="POST /api/v1/transactions"
						fields={[
							{ name: "accountNumber", value: '"****4521"', sensitive: true },
							{ name: "holderName", value: '"Carlos Mendes"', sensitive: true },
							{ name: "amount", value: "2847.50", sensitive: true },
							{ name: "routingCode", value: '"ACH_STANDARD"', tracked: true },
							{ name: "approvalStatus", value: '"approved"', tracked: true },
							{ name: "fees", value: "[{...}, {...}]", tracked: true },
							{ name: "merchantId", value: '"mch_8f2k..."', sensitive: true },
						]}
					/>
				</div>
				<div className="mt-4 text-center text-[#bbb] text-[12px]">
					Structural metadata only. No PHI. No PII. Nothing sensitive leaves
					your system.
				</div>
			</section>

			<section className="mx-auto max-w-3xl px-6 pt-24">
				<div className="mb-5 font-semibold text-[#bbb] text-[11px] uppercase tracking-[0.15em]">
					What Strus catches
				</div>
				<AnomalyMock />
			</section>

			<section className="mx-auto max-w-3xl px-6 pt-28" id="contact">
				{submitted ? (
					<div>
						<div className="font-medium text-[#111] text-base">
							We'll be in touch.
						</div>
						<div className="mt-2 font-light text-[#888] text-sm">
							Expect to hear from us within a few hours.
						</div>
					</div>
				) : (
					<>
						<div className="mb-2 font-semibold text-[#111] text-xl tracking-tight">
							Talk to us
						</div>
						<div className="mb-9 text-[#999] text-sm leading-snug">
							Tell us what you're building. We'll tell you what Strus would
							catch.
						</div>
						<form className="grid gap-4" onSubmit={handleSubmit}>
							<Input
								type="text"
								name="name"
								placeholder="Name"
								required
								aria-label="Name"
							/>
							<Input
								type="email"
								name="email"
								placeholder="Work email"
								required
								aria-label="Work email"
							/>
							<Input
								type="text"
								name="company"
								placeholder="Company"
								required
								aria-label="Company"
							/>
							<Textarea
								className="min-h-20 resize-y"
								name="message"
								placeholder="Anything we should know? (optional)"
								aria-label="Additional context"
							/>
							<Button
								type="submit"
								loading={submitContact.isPending}
								className="justify-self-start"
							>
								Send
							</Button>
						</form>
					</>
				)}
			</section>

			<section className="mx-auto max-w-3xl px-6 pt-28 pb-20">
				<div className="mb-5 font-semibold text-[#bbb] text-[11px] uppercase tracking-[0.15em]">
					FAQ
				</div>
				<div className="divide-y divide-[#e8e8e8] border-[#e8e8e8] border-y">
					<details className="group">
						<summary className="flex cursor-pointer items-center justify-between py-5 [&::-webkit-details-marker]:hidden">
							<span className="font-semibold text-[#111] text-[15px] tracking-tight">
								How much work is this to integrate?
							</span>
							<div className="flex items-center gap-3">
								<span className="text-[#ccc] text-[12px]">Engineering</span>
								<span className="shrink-0 text-[#ccc] transition-transform duration-200 group-open:rotate-45">
									+
								</span>
							</div>
						</summary>
						<div className="pb-5 text-[#888] text-[13px] leading-relaxed">
							A single story point for one engineer. Strus ships as middleware
							that wraps your existing API layer. No schema definitions, no
							threshold configuration, no rule files. It learns what normal
							looks like from your live traffic and starts surfacing shifts
							automatically.
						</div>
					</details>
					<details className="group">
						<summary className="flex cursor-pointer items-center justify-between py-5 [&::-webkit-details-marker]:hidden">
							<span className="font-semibold text-[#111] text-[15px] tracking-tight">
								Will our security team approve this?
							</span>
							<div className="flex items-center gap-3">
								<span className="text-[#ccc] text-[12px]">Security</span>
								<span className="shrink-0 text-[#ccc] transition-transform duration-200 group-open:rotate-45">
									+
								</span>
							</div>
						</summary>
						<div className="pb-5 text-[#888] text-[13px] leading-relaxed">
							The library is open source. Your engineers can read every line of
							code before it goes anywhere near production. It extracts
							structural metadata only: field names, types, null rates, enum
							values, array lengths. No request bodies, no PHI, no PII. Your
							security team reviews it once and moves on.
						</div>
					</details>
					<details className="group">
						<summary className="flex cursor-pointer items-center justify-between py-5 [&::-webkit-details-marker]:hidden">
							<span className="font-semibold text-[#111] text-[15px] tracking-tight">
								What's the risk?
							</span>
							<div className="flex items-center gap-3">
								<span className="text-[#ccc] text-[12px]">Risk</span>
								<span className="shrink-0 text-[#ccc] transition-transform duration-200 group-open:rotate-45">
									+
								</span>
							</div>
						</summary>
						<div className="pb-5 text-[#888] text-[13px] leading-relaxed">
							None. Strus is purely observational. It never modifies a request,
							blocks a response, or sits in your critical path. It reads traffic
							and reports on what changed. If you decide it's not for you,
							removing it is one PR.
						</div>
					</details>
					<details className="group">
						<summary className="flex cursor-pointer items-center justify-between py-5 [&::-webkit-details-marker]:hidden">
							<span className="font-semibold text-[#111] text-[15px] tracking-tight">
								Does this replace our existing monitoring?
							</span>
							<div className="flex items-center gap-3">
								<span className="text-[#ccc] text-[12px]">Operations</span>
								<span className="shrink-0 text-[#ccc] transition-transform duration-200 group-open:rotate-45">
									+
								</span>
							</div>
						</summary>
						<div className="pb-5 text-[#888] text-[13px] leading-relaxed">
							No. Strus sits alongside your existing stack. Keep Datadog,
							CloudWatch, whatever you have. They monitor uptime and
							infrastructure. Strus monitors behavioral changes in your actual
							data. Different layer, same team.
						</div>
					</details>
					<details className="group">
						<summary className="flex cursor-pointer items-center justify-between py-5 [&::-webkit-details-marker]:hidden">
							<span className="font-semibold text-[#111] text-[15px] tracking-tight">
								How does pricing work?
							</span>
							<div className="flex items-center gap-3">
								<span className="text-[#ccc] text-[12px]">Pricing</span>
								<span className="shrink-0 text-[#ccc] transition-transform duration-200 group-open:rotate-45">
									+
								</span>
							</div>
						</summary>
						<div className="pb-5 text-[#888] text-[13px] leading-relaxed">
							Pricing is on an individual basis. We only work with enterprise
							customers and scope each engagement to the size and complexity of
							your platform. Reach out and we'll give you a straight answer.
						</div>
					</details>
				</div>
			</section>
		</div>
	);
}
