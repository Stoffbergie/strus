import {
	Body,
	Container,
	Head,
	Hr,
	Html,
	Link,
	Preview,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";

interface ContactFormEmailProps {
	name: string;
	email: string;
	company: string;
	message?: string;
}

export function ContactFormEmail({
	name,
	email,
	company,
	message,
}: ContactFormEmailProps) {
	return (
		<Html lang="en">
			<Head />
			<Preview>{`New inquiry from ${name} at ${company}`}</Preview>
			<Tailwind
				config={{
					theme: {
						extend: {
							colors: {
								primary: "#111",
								muted: "#666",
								subtle: "#999",
								border: "#e0e0e0",
								label: "#bbb",
							},
						},
					},
				}}
			>
				<Body className="mx-auto bg-white font-['Figtree',-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif]">
					<Container className="mx-auto max-w-[480px] px-6 pt-12 pb-12">
						<Text className="m-0 mb-10 font-bold text-[17px] text-primary tracking-tight">
							strus
						</Text>

						<Text className="m-0 mb-7 font-semibold text-[18px] text-primary tracking-tight">
							New inquiry
						</Text>

						<Section className="mb-4">
							<Text className="m-0 mb-1 font-semibold text-[11px] text-label uppercase tracking-widest">
								Name
							</Text>
							<Text className="m-0 text-[15px] text-primary leading-normal">
								{name}
							</Text>
						</Section>

						<Section className="mb-4">
							<Text className="m-0 mb-1 font-semibold text-[11px] text-label uppercase tracking-widest">
								Email
							</Text>
							<Link
								href={`mailto:${email}`}
								className="text-[15px] text-primary underline underline-offset-2"
							>
								{email}
							</Link>
						</Section>

						<Section className="mb-4">
							<Text className="m-0 mb-1 font-semibold text-[11px] text-label uppercase tracking-widest">
								Company
							</Text>
							<Text className="m-0 text-[15px] text-primary leading-normal">
								{company}
							</Text>
						</Section>

						{message && (
							<>
								<Hr className="my-6 border-border" />
								<Section>
									<Text className="m-0 mb-1 font-semibold text-[11px] text-label uppercase tracking-widest">
										Message
									</Text>
									<Text className="m-0 font-light text-[15px] text-muted leading-relaxed">
										{message}
									</Text>
								</Section>
							</>
						)}

						<Hr className="my-6 border-border" />

						<Text className="m-0 font-light text-[13px] text-subtle leading-normal">
							Reply directly to respond to {name.split(" ")[0]} at{" "}
							<Link
								href={`mailto:${email}`}
								className="text-subtle underline underline-offset-2"
							>
								{email}
							</Link>
							.
						</Text>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
}
