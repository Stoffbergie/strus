"use client";

import { Button } from "@strus/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@strus/ui/components/dialog";
import { Field, FieldError, FieldLabel } from "@strus/ui/components/field";
import { Input } from "@strus/ui/components/input";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { api } from "~/trpc/react";
import { KeyCreatedDialog } from "./key-created-dialog";

const createKeySchema = z.object({
	name: z.string().min(1, "A name is required"),
});

export function CreateDialog() {
	const [open, setOpen] = useState(false);
	const [createdKey, setCreatedKey] = useState<string | null>(null);

	const utils = api.useUtils();

	const create = api.apiKeys.create.useMutation({
		onSuccess: (data) => {
			setOpen(false);
			form.reset();
			setCreatedKey(data.key);
			void utils.apiKeys.list.invalidate();
		},
		onError: () => toast.error("Failed to create API key"),
	});

	const form = useForm({
		defaultValues: { name: "" },
		validators: { onSubmit: createKeySchema },
		onSubmit: ({ value }) => create.mutate({ name: value.name.trim() }),
	});

	function handleOpenChange(next: boolean) {
		setOpen(next);
		if (!next) form.reset();
	}

	return (
		<>
			<Dialog open={open} onOpenChange={handleOpenChange}>
				<DialogTrigger asChild>
					<Button>Create key</Button>
				</DialogTrigger>

				<DialogContent showCloseButton={false}>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
					>
						<DialogHeader>
							<DialogTitle>Create API key</DialogTitle>
						</DialogHeader>

						<div className="pt-6 pb-8">
							<form.Field
								name="name"
								children={(field) => (
									<Field>
										<FieldLabel htmlFor={field.name}>API key name</FieldLabel>
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
							/>
						</div>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setOpen(false)}
							>
								Cancel
							</Button>
							<form.Subscribe
								selector={(state) => [state.canSubmit, state.isSubmitting]}
								children={([canSubmit, isSubmitting]) => (
									<Button
										type="submit"
										loading={isSubmitting || create.isPending}
										disabled={!canSubmit}
									>
										Create key
									</Button>
								)}
							/>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<KeyCreatedDialog
				apiKey={createdKey}
				onClose={() => setCreatedKey(null)}
			/>
		</>
	);
}
