"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import UserMenu from "./user-menu";

export default function Header() {
	const pathname = usePathname();

	const links = [
		{ href: "/changes", label: "Changes" },
		{ href: "/monitoring", label: "Monitoring" },
		{ href: "/settings", label: "Settings" },
	] as const;

	return (
		<header className="border-[#e8e8e8] border-b bg-white">
			<div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
				<div className="flex items-center gap-8">
					<Link
						href="/changes"
						className="font-bold text-[#111] text-[17px] tracking-tight no-underline"
					>
						strus
					</Link>
					<nav className="flex items-center gap-1" aria-label="Main">
						{links.map(({ href, label }) => {
							const isActive = pathname.startsWith(href);
							return (
								<Link
									key={href}
									href={href}
									className={`rounded-lg px-3 py-1.5 font-medium text-[13px] no-underline transition-colors ${
										isActive
											? "bg-[#fafafa] text-[#111]"
											: "text-[#999] hover:text-[#666]"
									}`}
								>
									{label}
								</Link>
							);
						})}
					</nav>
				</div>
				<UserMenu />
			</div>
		</header>
	);
}
