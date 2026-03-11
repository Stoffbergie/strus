import { cn } from "@strus/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

const textVariants = cva("", {
	variants: {
		variant: {
			heading:
				"font-bold text-[#111] text-[28px] leading-tight tracking-[-0.035em]",
			title: "font-semibold text-[#111] text-[17px] tracking-tight",
			body: "text-[#666] text-[15px] leading-relaxed",
			small: "text-[#666] text-[13px] leading-relaxed",
			label:
				"font-semibold text-[#bbb] text-[11px] uppercase tracking-[0.15em]",
			mono: "font-mono text-[#999] text-[12px]",
			muted: "text-[#999] text-[13px]",
		},
	},
	defaultVariants: {
		variant: "body",
	},
});

type TextVariant = NonNullable<VariantProps<typeof textVariants>["variant"]>;

const defaultElements: Record<TextVariant, keyof React.JSX.IntrinsicElements> =
	{
		heading: "h1",
		title: "h2",
		body: "p",
		small: "p",
		label: "span",
		mono: "span",
		muted: "p",
	};

function Text({
	variant = "body",
	as,
	className,
	children,
	...props
}: {
	as?: keyof React.JSX.IntrinsicElements;
	variant?: TextVariant;
	className?: string;
	children?: React.ReactNode;
} & Omit<React.ComponentProps<"div">, "ref">) {
	const Component = (as || defaultElements[variant]) as "div";
	return (
		<Component className={cn(textVariants({ variant }), className)} {...props}>
			{children}
		</Component>
	);
}

export { Text, textVariants };
