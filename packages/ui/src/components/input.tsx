import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "@strus/ui/lib/utils";
import type * as React from "react";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
	return (
		<InputPrimitive
			type={type}
			data-slot="input"
			className={cn(
				"h-10 w-full min-w-0 rounded-lg border border-input bg-white px-4 py-2 text-foreground text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive dark:bg-input/30",
				className,
			)}
			{...props}
		/>
	);
}

export { Input };
