import Header from "~/app/_components/header";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="min-h-svh bg-white">
			<Header />
			<main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
		</div>
	);
}
