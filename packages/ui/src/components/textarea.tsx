import { cn } from "@strus/ui/lib/utils";
import type * as React from "react";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
	return (
		<textarea
			data-slot="textarea"
			className={cn(
				"field-sizing-content flex min-h-16 w-full rounded-lg border border-[#e0e0e0] bg-white px-4 py-3 text-[#111] text-sm outline-none transition-colors placeholder:text-[#bbb] focus:border-[#111] disabled:cursor-not-allowed disabled:opacity-50",
				className,
			)}
			{...props}
		/>
	);
}

export { Textarea };
