"use client";

import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@strus/ui/components/button";
import { Field, FieldError, FieldLabel } from "@strus/ui/components/field";
import { Input } from "@strus/ui/components/input";
import { useForm } from "@tanstack/react-form";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createHighlighter, type Highlighter } from "shiki";
import { toast } from "sonner";
import { z } from "zod";

import { api } from "~/trpc/react";
import { KeyCreatedDialog } from "./api-keys/key-created-dialog";

type Framework = "nextjs" | "express" | "hono" | "fastify" | "generic";
type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

const STORAGE_KEY = "strus_setup_key";

function storeSetupKey(rawKey: string) {
	try {
		sessionStorage.setItem(STORAGE_KEY, btoa(rawKey));
	} catch {
		// silent
	}
}

function readSetupKey(): string | null {
	try {
		const encoded = sessionStorage.getItem(STORAGE_KEY);
		if (!encoded) return null;
		return atob(encoded);
	} catch {
		return null;
	}
}

const FRAMEWORKS: Record<Framework, { label: string }> = {
	nextjs: { label: "Next.js" },
	express: { label: "Express" },
	hono: { label: "Hono" },
	fastify: { label: "Fastify" },
	generic: { label: "Other" },
};

const PM_LABELS: Record<PackageManager, string> = {
	npm: "npm",
	pnpm: "pnpm",
	yarn: "yarn",
	bun: "bun",
};

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

function getSnippet(framework: Framework, apiKey: string) {
	switch (framework) {
		case "nextjs":
			return `// app/api/patients/route.ts
import { StrusClient } from "strus-middleware"
import { strusNextjs } from "strus-middleware/nextjs"

const strus = new StrusClient({
  apiKey: "${apiKey}",
})
const { wrapHandler } = strusNextjs(strus)

export const GET = wrapHandler(async (req) => {
  const patients = await getPatients()
  return Response.json({ patients })
})`;
		case "express":
			return `import { StrusClient } from "strus-middleware"
import { strusExpress } from "strus-middleware/express"

const strus = new StrusClient({
  apiKey: "${apiKey}",
})

app.use(strusExpress(strus))`;
		case "hono":
			return `import { StrusClient } from "strus-middleware"
import { strusHono } from "strus-middleware/hono"

const strus = new StrusClient({
  apiKey: "${apiKey}",
})

app.use("*", strusHono(strus))`;
		case "fastify":
			return `import { StrusClient } from "strus-middleware"
import { strusFastify } from "strus-middleware/fastify"

const strus = new StrusClient({
  apiKey: "${apiKey}",
})

fastify.register(strusFastify(strus))`;
		case "generic":
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
}

const createKeySchema = z.object({
	name: z.string().min(1, "Give this key a name"),
});

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighterSingleton() {
	if (!highlighterPromise) {
		highlighterPromise = createHighlighter({
			themes: ["vitesse-dark"],
			langs: ["shellscript", "typescript"],
		});
	}
	return highlighterPromise;
}

function useHighlighter() {
	const [hl, setHl] = useState<Highlighter | null>(null);

	useEffect(() => {
		getHighlighterSingleton().then(setHl);
	}, []);

	return hl;
}

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

function StepIndicator({
	step,
	state,
}: {
	step: number;
	state: "completed" | "active" | "upcoming";
}) {
	if (state === "completed") {
		return (
			<div className="zoom-in-50 flex h-7 w-7 shrink-0 animate-in items-center justify-center rounded-full bg-emerald-500 text-white duration-300">
				<HugeiconsIcon
					icon={CheckmarkCircle02Icon}
					size={16}
					strokeWidth={2.5}
				/>
			</div>
		);
	}

	if (state === "active") {
		return (
			<div className="relative flex h-7 w-7 shrink-0 items-center justify-center">
				<div className="absolute inset-0 animate-pulse rounded-full bg-[#111]/5" />
				<div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-[#111] font-semibold text-[12px] text-white">
					{step}
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#e0e0e0] font-semibold text-[#ccc] text-[12px]">
			{step}
		</div>
	);
}

function HighlightedCode({
	code,
	lang,
	highlighter,
}: {
	code: string;
	lang: "shellscript" | "typescript";
	highlighter: Highlighter | null;
}) {
	const html = useMemo(() => {
		if (!highlighter) return null;
		return highlighter.codeToHtml(code, {
			lang,
			theme: "vitesse-dark",
		});
	}, [code, lang, highlighter]);

	if (!html) {
		return (
			<pre className="overflow-x-auto px-4 py-3 font-mono text-[#e4e4e4] text-[13px] leading-relaxed">
				{code}
			</pre>
		);
	}

	return (
		<div
			className="[&_pre]:!bg-transparent [&_code]:font-mono [&_pre]:overflow-x-auto [&_pre]:px-4 [&_pre]:py-3 [&_pre]:font-mono [&_pre]:text-[13px] [&_pre]:leading-relaxed"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: shiki generates deterministic HTML from code strings
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
}

function CodeBlock({
	tabs,
	activeTab,
	onTabChange,
	code,
	lang,
	highlighter,
}: {
	tabs: { key: string; label: string }[];
	activeTab: string;
	onTabChange: (key: string) => void;
	code: string;
	lang: "shellscript" | "typescript";
	highlighter: Highlighter | null;
}) {
	return (
		<div className="overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1a1a1a]">
			<div className="flex items-center justify-between border-[#2a2a2a] border-b px-1">
				<div className="flex">
					{tabs.map((tab) => (
						<button
							key={tab.key}
							type="button"
							onClick={() => onTabChange(tab.key)}
							className={`px-3 py-2 font-mono text-[12px] transition-colors ${
								activeTab === tab.key
									? "border-white/20 border-b text-white"
									: "text-[#555] hover:text-[#999]"
							}`}
						>
							{tab.label}
						</button>
					))}
				</div>
				<div className="pr-2">
					<CopyButton text={code} />
				</div>
			</div>
			<HighlightedCode code={code} lang={lang} highlighter={highlighter} />
		</div>
	);
}

function CreateKeyStep({
	hasKey,
	keyPrefix,
	onKeyCreated,
}: {
	hasKey: boolean;
	keyPrefix?: string;
	onKeyCreated: (rawKey: string) => void;
}) {
	const utils = api.useUtils();

	const create = api.apiKeys.create.useMutation({
		onSuccess: (data) => {
			form.reset();
			storeSetupKey(data.key);
			onKeyCreated(data.key);
			void utils.apiKeys.list.invalidate();
		},
		onError: () => toast.error("Failed to create API key"),
	});

	const form = useForm({
		defaultValues: { name: "" },
		validators: { onSubmit: createKeySchema },
		onSubmit: ({ value }) => create.mutate({ name: value.name.trim() }),
	});

	if (hasKey) {
		return (
			<div className="flex items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50/50 px-4 py-3">
				<div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
					<HugeiconsIcon
						icon={CheckmarkCircle02Icon}
						size={12}
						strokeWidth={2.5}
					/>
				</div>
				<span className="text-[13px] text-emerald-800">API key created</span>
				{keyPrefix && (
					<code className="ml-auto rounded bg-emerald-100 px-2 py-0.5 font-mono text-[11px] text-emerald-700">
						{keyPrefix}...
					</code>
				)}
			</div>
		);
	}

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
			className="flex items-end gap-3"
		>
			<div className="flex-1">
				<form.Field name="name">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>Key name</FieldLabel>
							<Input
								id={field.name}
								name={field.name}
								placeholder="e.g. production, staging"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								autoFocus
							/>
							{field.state.meta.isTouched &&
								field.state.meta.errors.length > 0 && (
									<FieldError>
										{typeof field.state.meta.errors[0] === "string"
											? field.state.meta.errors[0]
											: field.state.meta.errors[0]?.message}
									</FieldError>
								)}
						</Field>
					)}
				</form.Field>
			</div>
			<form.Subscribe
				selector={(state) => [state.canSubmit, state.isSubmitting]}
			>
				{([canSubmit, isSubmitting]) => (
					<Button
						type="submit"
						loading={isSubmitting || create.isPending}
						disabled={!canSubmit}
					>
						Create key
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}

function WaitingForEvents() {
	const utils = api.useUtils();

	useEffect(() => {
		const interval = setInterval(() => {
			void utils.endpoints.list.invalidate();
		}, 5000);
		return () => clearInterval(interval);
	}, [utils]);

	return (
		<div className="flex items-center gap-3 rounded-lg border border-[#e8e8e8] bg-[#fafafa] px-4 py-3">
			<div className="relative flex h-3 w-3">
				<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#111] opacity-40" />
				<span className="relative inline-flex h-3 w-3 rounded-full bg-[#111]" />
			</div>
			<span className="text-[#999] text-[13px]">
				Listening for the first event. Start your server and make a few
				requests.
			</span>
		</div>
	);
}

export default function SetupGuide() {
	const [framework, setFramework] = useState<Framework>("nextjs");
	const [pm, setPm] = useState<PackageManager>("npm");
	const [createdKey, setCreatedKey] = useState<string | null>(null);

	const { data: apiKeys } = api.apiKeys.list.useQuery();
	const { data: endpoints } = api.endpoints.list.useQuery();
	const highlighter = useHighlighter();

	const hasKey = (apiKeys?.length ?? 0) > 0;
	const hasEvents = (endpoints?.items.length ?? 0) > 0;
	const latestKey = apiKeys?.[0];

	const sessionKey = useRef<string | null>(null);
	if (sessionKey.current === null) {
		if (typeof window !== "undefined") {
			sessionKey.current = readSetupKey();
		}
	}
	if (createdKey) {
		sessionKey.current = createdKey;
	}

	const keyForSnippet = sessionKey.current || "your_api_key";

	const installCmd = getInstallCmd(pm);
	const snippet = getSnippet(framework, keyForSnippet);

	const getStepState = useCallback(
		(step: number): "completed" | "active" | "upcoming" => {
			if (step === 1) return hasKey ? "completed" : "active";
			if (step === 2)
				return hasKey ? (hasEvents ? "completed" : "active") : "upcoming";
			if (step === 3)
				return hasKey ? (hasEvents ? "completed" : "active") : "upcoming";
			if (step === 4)
				return hasEvents ? "completed" : hasKey ? "active" : "upcoming";
			return "upcoming";
		},
		[hasKey, hasEvents],
	);

	return (
		<div className="mx-auto w-full max-w-xl">
			<div className="mb-10 text-center">
				<p className="mb-2 font-mono text-[#bbb] text-[11px] uppercase tracking-[0.2em]">
					Setup
				</p>
				<h1 className="font-bold text-[#111] text-[28px] tracking-[-0.035em]">
					Connect your API
				</h1>
				<p className="mt-2 text-[#999] text-[14px]">
					Response bodies are analyzed locally. Only field level signals are
					sent to Strus, with PHI/PII fields automatically excluded.
				</p>
			</div>

			<div className="space-y-0">
				{/* Step 1: Create API key */}
				<div className="group relative flex gap-5">
					<div className="flex flex-col items-center">
						<StepIndicator step={1} state={getStepState(1)} />
						<div className="mt-2 w-px flex-1 bg-[#e8e8e8] transition-colors group-first:mt-2" />
					</div>
					<div className="flex-1 pb-8">
						<p
							className={`mb-1 font-semibold text-[15px] transition-colors ${
								getStepState(1) === "upcoming" ? "text-[#ccc]" : "text-[#111]"
							}`}
						>
							Create an API key
						</p>
						<p
							className={`mb-4 text-[13px] transition-colors ${
								getStepState(1) === "upcoming" ? "text-[#ddd]" : "text-[#999]"
							}`}
						>
							Used by the middleware to authenticate with the ingestion
							endpoint.
						</p>
						<CreateKeyStep
							hasKey={hasKey}
							keyPrefix={latestKey?.keyPrefix}
							onKeyCreated={setCreatedKey}
						/>
					</div>
				</div>

				{/* Step 2: Install middleware */}
				<div className="group relative flex gap-5">
					<div className="flex flex-col items-center">
						<StepIndicator step={2} state={getStepState(2)} />
						<div className="mt-2 w-px flex-1 bg-[#e8e8e8]" />
					</div>
					<div
						className={`flex-1 pb-8 transition-opacity ${
							getStepState(2) === "upcoming"
								? "pointer-events-none opacity-40"
								: "opacity-100"
						}`}
					>
						<p
							className={`mb-1 font-semibold text-[15px] transition-colors ${
								getStepState(2) === "upcoming" ? "text-[#ccc]" : "text-[#111]"
							}`}
						>
							Install the middleware
						</p>
						<p
							className={`mb-4 text-[13px] transition-colors ${
								getStepState(2) === "upcoming" ? "text-[#ddd]" : "text-[#999]"
							}`}
						>
							Open source. Audit the extraction logic at any time.
						</p>
						<CodeBlock
							tabs={Object.entries(PM_LABELS).map(([key, label]) => ({
								key,
								label,
							}))}
							activeTab={pm}
							onTabChange={(key) => setPm(key as PackageManager)}
							code={installCmd}
							lang="shellscript"
							highlighter={highlighter}
						/>
					</div>
				</div>

				{/* Step 3: Add to server */}
				<div className="group relative flex gap-5">
					<div className="flex flex-col items-center">
						<StepIndicator step={3} state={getStepState(3)} />
						<div className="mt-2 w-px flex-1 bg-[#e8e8e8]" />
					</div>
					<div
						className={`flex-1 pb-8 transition-opacity ${
							getStepState(3) === "upcoming"
								? "pointer-events-none opacity-40"
								: "opacity-100"
						}`}
					>
						<p
							className={`mb-1 font-semibold text-[15px] transition-colors ${
								getStepState(3) === "upcoming" ? "text-[#ccc]" : "text-[#111]"
							}`}
						>
							Add the middleware to your server
						</p>
						<p
							className={`mb-4 text-[13px] transition-colors ${
								getStepState(3) === "upcoming" ? "text-[#ddd]" : "text-[#999]"
							}`}
						>
							A few lines of setup. Response bodies are processed in your server
							and only structural signals are sent.
						</p>
						<CodeBlock
							tabs={Object.entries(FRAMEWORKS).map(([key, { label }]) => ({
								key,
								label,
							}))}
							activeTab={framework}
							onTabChange={(key) => setFramework(key as Framework)}
							code={snippet}
							lang="typescript"
							highlighter={highlighter}
						/>
					</div>
				</div>

				{/* Step 4: Send traffic */}
				<div className="group relative flex gap-5">
					<div className="flex flex-col items-center">
						<StepIndicator step={4} state={getStepState(4)} />
					</div>
					<div
						className={`flex-1 transition-opacity ${
							getStepState(4) === "upcoming"
								? "pointer-events-none opacity-40"
								: "opacity-100"
						}`}
					>
						<p
							className={`mb-1 font-semibold text-[15px] transition-colors ${
								getStepState(4) === "upcoming" ? "text-[#ccc]" : "text-[#111]"
							}`}
						>
							Send some traffic
						</p>
						<p
							className={`mb-4 text-[13px] transition-colors ${
								getStepState(4) === "upcoming" ? "text-[#ddd]" : "text-[#999]"
							}`}
						>
							Strus will discover your endpoints automatically and begin
							building baselines from the first few hours of traffic.
						</p>
						{hasKey && !hasEvents && <WaitingForEvents />}
					</div>
				</div>
			</div>

			<KeyCreatedDialog
				apiKey={createdKey}
				onClose={() => setCreatedKey(null)}
			/>
		</div>
	);
}
