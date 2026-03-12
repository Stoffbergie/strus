"use client";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@strus/ui/components/dropdown-menu";
import { signOut } from "@workos-inc/authkit-nextjs";
import { useAuth } from "@workos-inc/authkit-nextjs/components";

export default function UserMenu() {
	const { user, loading } = useAuth();

	if (loading) {
		return <div className="h-7 w-7 animate-pulse rounded-full bg-[#fafafa]" />;
	}

	if (!user) {
		return (
			<a
				href="/dashboard"
				className="rounded-lg px-3 py-1.5 font-medium text-[#999] text-[13px] no-underline transition-colors hover:text-[#111]"
			>
				Sign in
			</a>
		);
	}

	const initials =
		user.firstName && user.lastName
			? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
			: (user.email?.[0]?.toUpperCase() ?? "?");

	const displayName =
		user.firstName && user.lastName
			? `${user.firstName} ${user.lastName}`
			: null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<button
						type="button"
						className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-[#e8e8e8] bg-[#fafafa] font-medium text-[#999] text-[11px] transition-colors hover:border-[#ccc] hover:text-[#666]"
					>
						{user.profilePictureUrl ? (
							<img
								src={user.profilePictureUrl}
								alt=""
								className="h-full w-full object-cover"
								referrerPolicy="no-referrer"
							/>
						) : (
							initials
						)}
					</button>
				}
			/>
			<DropdownMenuContent align="end" className="w-52">
				<DropdownMenuGroup>
					<div className="px-2.5 py-2">
						{displayName && (
							<p className="truncate font-medium text-[#111] text-[13px]">
								{displayName}
							</p>
						)}
						<p className="truncate text-[#999] text-[12px]">{user.email}</p>
					</div>
					<DropdownMenuSeparator />
					<DropdownMenuItem
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
