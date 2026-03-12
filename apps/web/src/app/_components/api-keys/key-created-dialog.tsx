"use client";

import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@strus/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@strus/ui/components/dialog";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@strus/ui/components/input-group";
import { useCallback, useState } from "react";

export function KeyCreatedDialog({
	apiKey,
	onClose,
}: {
	apiKey: string | null;
	onClose: () => void;
}) {
	const [copied, setCopied] = useState(false);

	const handleCopy = useCallback(() => {
		if (!apiKey) return;
		navigator.clipboard.writeText(apiKey);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, [apiKey]);

	function handleOpenChange(next: boolean) {
		if (!next) {
			setCopied(false);
			onClose();
		}
	}

	return (
		<Dialog open={!!apiKey} onOpenChange={handleOpenChange}>
			<DialogContent showCloseButton={false}>
				<DialogHeader>
					<DialogTitle>Your API key</DialogTitle>
					<DialogDescription>
						This key is only shown once. Store it somewhere secure, like a
						password manager or secret store.
					</DialogDescription>
				</DialogHeader>

				<div className="py-2">
					<InputGroup>
						<InputGroupInput
							readOnly
							value={apiKey ?? ""}
							className="font-mono text-xs"
						/>
						<InputGroupAddon align="inline-end">
							<InputGroupButton
								onClick={handleCopy}
								aria-label={copied ? "Copied" : "Copy to clipboard"}
							>
								<HugeiconsIcon
									icon={copied ? Tick02Icon : Copy01Icon}
									strokeWidth={2}
								/>
							</InputGroupButton>
						</InputGroupAddon>
					</InputGroup>
				</div>

				<DialogFooter>
					<Button onClick={onClose}>Done</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
