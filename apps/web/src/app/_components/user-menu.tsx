"use client";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@strus/ui/components/dropdown-menu";
import { signOut } from "@workos-inc/authkit-nextjs";
import { useAuth } from "@workos-inc/authkit-nextjs/components";

export default function UserMenu() {
	const { user, loading } = useAuth();

	if (loading) {
		return <div className="h-8 w-8 animate-pulse rounded-full bg-[#fafafa]" />;
	}

	if (!user) {
		return (
			<a
				href="/dashboard"
				className="rounded-lg bg-[#111] px-4 py-2 font-semibold text-[13px] text-white no-underline transition-colors hover:bg-[#333]"
			>
				Sign in
			</a>
		);
	}

	const initials =
		user.firstName && user.lastName
			? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
			: (user.email?.[0]?.toUpperCase() ?? "?");

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<button
						type="button"
						className="flex h-8 w-8 items-center justify-center rounded-full bg-[#111] font-semibold text-[11px] text-white transition-opacity hover:opacity-80"
					>
						{initials}
					</button>
				}
			/>
			<DropdownMenuContent align="end" className="w-48 bg-white">
				<DropdownMenuGroup>
					<DropdownMenuLabel className="text-[#999]">
						{user.email}
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						variant="destructive"
						onClick={async () => {
							await signOut();
						}}
					>
						Sign out
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
