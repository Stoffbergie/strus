"use client";

import { useState } from "react";
import { toast } from "sonner";

function CopyButton({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);

	return (
		<button
			type="button"
			onClick={() => {
				navigator.clipboard.writeText(text);
				setCopied(true);
				toast.success("Copied");
				setTimeout(() => setCopied(false), 2000);
			}}
			className="rounded-md bg-white/10 px-2 py-1 font-mono text-[#555] text-[11px] transition-colors hover:bg-white/20 hover:text-[#999]"
		>
			{copied ? "Copied" : "Copy"}
		</button>
	);
}

function getInstallCmd(pm: PackageManager) {
	const pkg = "strus-middleware";
	switch (pm) {
		case "npm":
			return `npm install ${pkg}`;
		case "pnpm":
			return `pnpm add ${pkg}`;
		case "yarn":
			return `yarn add ${pkg}`;
		case "bun":
			return `bun add ${pkg}`;
	}
}

function getExpressSnippet(apiKey: string) {
	return `import { StrusClient } from "strus-middleware"
import { strusExpress } from "strus-middleware/express"

const strus = new StrusClient({
  apiKey: "${apiKey}",
})

app.use(strusExpress(strus))`;
}

function getHonoSnippet(apiKey: string) {
	return `import { StrusClient } from "strus-middleware"
import { strusHono } from "strus-middleware/hono"

const strus = new StrusClient({
  apiKey: "${apiKey}",
})

app.use("*", strusHono(strus))`;
}

function getFastifySnippet(apiKey: string) {
	return `import { StrusClient } from "strus-middleware"
import { strusFastify } from "strus-middleware/fastify"

const strus = new StrusClient({
  apiKey: "${apiKey}",
})

fastify.register(strusFastify(strus))`;
}

function getGenericSnippet(apiKey: string) {
	return `import { StrusClient } from "strus-middleware"

const strus = new StrusClient({
  apiKey: "${apiKey}",
})

strus.observe({
  method: "GET",
  path: "/api/patients",
  statusCode: 200,
  responseBody: data,
})`;
}

type Framework = "express" | "hono" | "fastify" | "generic";
type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

const FRAMEWORKS: Record<Framework, { label: string; file: string }> = {
	express: { label: "Express", file: "app.ts" },
	hono: { label: "Hono", file: "app.ts" },
	fastify: { label: "Fastify", file: "server.ts" },
	generic: { label: "Other", file: "server.ts" },
};

const PM_LABELS: Record<PackageManager, string> = {
	npm: "npm",
	pnpm: "pnpm",
	yarn: "yarn",
	bun: "bun",
};

function getSnippet(framework: Framework, apiKey: string) {
	switch (framework) {
		case "express":
			return getExpressSnippet(apiKey);
		case "hono":
			return getHonoSnippet(apiKey);
		case "fastify":
			return getFastifySnippet(apiKey);
		case "generic":
			return getGenericSnippet(apiKey);
	}
}

export default function SetupGuide({ apiKey }: { apiKey?: string }) {
	const [framework, setFramework] = useState<Framework>("express");
	const [pm, setPm] = useState<PackageManager>("npm");

	const key = apiKey || "your_api_key";
	const installCmd = getInstallCmd(pm);
	const snippet = getSnippet(framework, key);
	return (
		<div className="space-y-8">
			<div>
				<h2 className="font-bold text-[#111] text-[24px] tracking-[-0.035em]">
					Get started
				</h2>
				<p className="mt-1 text-[#999] text-[14px]">
					Add Strus to your API in two steps. Response bodies are analyzed
					locally and only field-level signals are sent to Strus (with PHI/PII
					fields automatically excluded).
				</p>
			</div>

			<div className="flex items-start gap-6">
				<div className="flex flex-col items-center">
					<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#111] font-semibold text-[12px] text-white">
						1
					</div>
					<div className="mt-2 h-full w-px bg-[#e8e8e8]" />
				</div>
				<div className="flex-1 pb-8">
					<p className="mb-1 font-semibold text-[#111] text-[15px]">
						Install the middleware
					</p>
					<p className="mb-3 text-[#999] text-[13px]">
						Open source. Audit the extraction logic at any time.
					</p>
					<div className="overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1a1a1a]">
						<div className="flex items-center justify-between border-[#2a2a2a] border-b px-1">
							<div className="flex">
								{(Object.entries(PM_LABELS) as [PackageManager, string][]).map(
									([key, label]) => (
										<button
											key={key}
											type="button"
											onClick={() => setPm(key)}
											className={`px-3 py-2 font-mono text-[12px] transition-colors ${
												pm === key
													? "border-white/20 border-b text-white"
													: "text-[#555] hover:text-[#999]"
											}`}
										>
											{label}
										</button>
									),
								)}
							</div>
							<div className="pr-2">
								<CopyButton text={installCmd} />
							</div>
						</div>
						<pre className="overflow-x-auto px-4 py-3 font-mono text-[#e4e4e4] text-[13px] leading-relaxed">
							{installCmd}
						</pre>
					</div>
				</div>
			</div>

			<div className="flex items-start gap-6">
				<div className="flex flex-col items-center">
					<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#111] font-semibold text-[12px] text-white">
						2
					</div>
					<div className="mt-2 h-full w-px bg-[#e8e8e8]" />
				</div>
				<div className="flex-1 pb-8">
					<p className="mb-1 font-semibold text-[#111] text-[15px]">
						Add the middleware to your server
					</p>
					<p className="mb-3 text-[#999] text-[13px]">
						One line of middleware. Response bodies are processed in-process and
						only structural signals (null rates, enum distributions, array
						sizes) are sent.
					</p>
					<div className="overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1a1a1a]">
						<div className="flex items-center justify-between border-[#2a2a2a] border-b px-1">
							<div className="flex">
								{(
									Object.entries(FRAMEWORKS) as [
										Framework,
										(typeof FRAMEWORKS)[Framework],
									][]
								).map(([key, { label }]) => (
									<button
										key={key}
										type="button"
										onClick={() => setFramework(key)}
										className={`px-3 py-2 font-mono text-[12px] transition-colors ${
											framework === key
												? "border-white/20 border-b text-white"
												: "text-[#555] hover:text-[#999]"
										}`}
									>
										{label}
									</button>
								))}
							</div>
							<div className="pr-2">
								<CopyButton text={snippet} />
							</div>
						</div>
						<pre className="overflow-x-auto px-4 py-3 font-mono text-[#e4e4e4] text-[13px] leading-relaxed">
							{snippet}
						</pre>
					</div>
					{!apiKey && (
						<p className="mt-3 text-[#f59e0b] text-[12px]">
							Create an API key in Settings to get your actual key here.
						</p>
					)}
				</div>
			</div>

			<div className="flex items-start gap-6">
				<div className="flex flex-col items-center">
					<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#111] font-semibold text-[12px] text-white">
						3
					</div>
				</div>
				<div className="flex-1">
					<p className="mb-1 font-semibold text-[#111] text-[15px]">
						Send some traffic
					</p>
					<p className="text-[#999] text-[13px] leading-relaxed">
						Start your server and make a few requests. Strus will discover your
						endpoints automatically and begin building baselines from the first
						few hours of traffic. This page will update when we receive the
						first event.
					</p>
				</div>
			</div>
		</div>
	);
}
