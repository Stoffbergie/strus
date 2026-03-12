"use client";

import { Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@strus/ui/components/button";
import { createColumnHelper } from "@tanstack/react-table";
import { useState } from "react";
import { toast } from "sonner";

import { DataTable, DataTableSkeleton } from "~/components/data-table";
import { api, type RouterOutputs } from "~/trpc/react";

type ApiKey = RouterOutputs["apiKeys"]["list"][number];

const col = createColumnHelper<ApiKey>();

const columns = [
	col.accessor("name", {
		header: "Name",
		cell: (info) => (
			<span className="font-medium text-[#111]">{info.getValue()}</span>
		),
	}),
	col.accessor("keyPrefix", {
		header: "Key",
		cell: (info) => (
			<span className="font-mono text-[#999]">{info.getValue()}...</span>
		),
	}),
	col.accessor("createdAt", {
		header: "Created",
		meta: { align: "right" },
		cell: (info) => (
			<span className="font-mono text-[#bbb] text-[12px]">
				{new Date(info.getValue()).toLocaleDateString()}
			</span>
		),
	}),
	col.display({
		id: "actions",
		meta: { align: "right" },
		header: () => <span className="sr-only">Actions</span>,
		cell: ({ row }) => <DeleteButton keyId={row.original.id} />,
	}),
];

export function KeyListSkeleton() {
	return <DataTableSkeleton columns={columns} rows={3} />;
}

function DeleteButton({ keyId }: { keyId: string }) {
	const [deleting, setDeleting] = useState(false);
	const utils = api.useUtils();

	const deleteMutation = api.apiKeys.delete.useMutation({
		onMutate: () => setDeleting(true),
		onSuccess: () => {
			void utils.apiKeys.list.invalidate();
			toast.success("API key deleted");
		},
		onError: () => {
			setDeleting(false);
			toast.error("Failed to delete API key");
		},
	});

	return (
		<Button
			variant="destructive-ghost"
			size="icon-xs"
			loading={deleting}
			onClick={() => deleteMutation.mutate({ id: keyId })}
			aria-label="Delete API key"
		>
			<HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
		</Button>
	);
}

export function KeyList() {
	const [keys] = api.apiKeys.list.useSuspenseQuery();

	if (!keys.length) {
		return (
			<p className="text-[#999] text-[13px]">
				No API keys yet. Create one to start sending telemetry.
			</p>
		);
	}

	return <DataTable columns={columns} data={keys} />;
}
