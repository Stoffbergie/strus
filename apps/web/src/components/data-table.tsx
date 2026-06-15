"use client";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@strus/ui/components/table";
import { cn } from "@strus/ui/lib/utils";
import {
	type Column,
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";

declare module "@tanstack/react-table" {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	interface ColumnMeta<TData, TValue> {
		align?: "left" | "right";
	}
}

function alignClass(column: Column<unknown, unknown>) {
	return column.columnDef.meta?.align === "right" ? "text-right" : undefined;
}

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	onRowClick?: (row: TData) => void;
}

export function DataTable<TData, TValue>({
	columns,
	data,
	onRowClick,
}: DataTableProps<TData, TValue>) {
	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<Table>
			<TableHeader>
				{table.getHeaderGroups().map((headerGroup) => (
					<TableRow key={headerGroup.id}>
						{headerGroup.headers.map((header) => (
							<TableHead
								key={header.id}
								className={alignClass(
									header.column as Column<unknown, unknown>,
								)}
							>
								{header.isPlaceholder
									? null
									: flexRender(
											header.column.columnDef.header,
											header.getContext(),
										)}
							</TableHead>
						))}
					</TableRow>
				))}
			</TableHeader>
			<TableBody>
				{table.getRowModel().rows.length ? (
					table.getRowModel().rows.map((row) => (
						<TableRow
							key={row.id}
							data-state={row.getIsSelected() ? "selected" : undefined}
							onClick={onRowClick ? () => onRowClick(row.original) : undefined}
							className={onRowClick ? "cursor-pointer" : undefined}
						>
							{row.getVisibleCells().map((cell) => (
								<TableCell
									key={cell.id}
									className={alignClass(
										cell.column as Column<unknown, unknown>,
									)}
								>
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</TableCell>
							))}
						</TableRow>
					))
				) : (
					<TableRow>
						<TableCell colSpan={columns.length} className="h-24 text-center">
							No results.
						</TableCell>
					</TableRow>
				)}
			</TableBody>
		</Table>
	);
}

interface DataTableSkeletonProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	rows?: number;
}

export function DataTableSkeleton<TData, TValue>({
	columns,
	rows = 3,
}: DataTableSkeletonProps<TData, TValue>) {
	const table = useReactTable({
		data: [],
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	const allColumns = table.getAllColumns();

	return (
		<Table>
			<TableHeader>
				{table.getHeaderGroups().map((headerGroup) => (
					<TableRow key={headerGroup.id}>
						{headerGroup.headers.map((header) => (
							<TableHead
								key={header.id}
								className={alignClass(
									header.column as Column<unknown, unknown>,
								)}
							>
								{header.isPlaceholder
									? null
									: flexRender(
											header.column.columnDef.header,
											header.getContext(),
										)}
							</TableHead>
						))}
					</TableRow>
				))}
			</TableHeader>
			<TableBody>
				{Array.from({ length: rows }, (_, i) => (
					<TableRow key={i} className="hover:bg-transparent">
						{allColumns.map((column) => {
							const isRight = column.columnDef.meta?.align === "right";
							return (
								<TableCell
									key={column.id}
									className={alignClass(column as Column<unknown, unknown>)}
								>
									<div
										className={cn(
											"h-3.5 animate-pulse rounded bg-[#e8e8e8]",
											isRight ? "ml-auto w-16" : "w-2/3",
										)}
									/>
								</TableCell>
							);
						})}
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
