import {
	Body,
	Container,
	Head,
	Html,
	Preview,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";

interface ContactConfirmationEmailProps {
	name: string;
}

export function ContactConfirmationEmail({
	name,
}: ContactConfirmationEmailProps) {
	const firstName = name.split(" ")[0];

	return (
		<Html lang="en">
			<Head />
			<Preview>{`We received your inquiry, ${firstName}.`}</Preview>
			<Tailwind
				config={{
					theme: {
						extend: {
							colors: {
								primary: "#111",
								muted: "#666",
								subtle: "#999",
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

						<Text className="m-0 mb-5 text-[15px] text-primary leading-relaxed">
							Hi {firstName},
						</Text>

						<Text className="m-0 mb-4 font-light text-[15px] text-muted leading-relaxed">
							Thanks for reaching out. We received your inquiry and someone from
							our team will get back to you within one business day.
						</Text>

						<Text className="m-0 mb-4 font-light text-[15px] text-muted leading-relaxed">
							We will review the details you shared and reach out to schedule a
							short call to understand your needs. No prep required on your end.
						</Text>

						<Text className="m-0 mb-4 font-light text-[15px] text-muted leading-relaxed">
							If anything is urgent in the meantime, reply directly to this
							email.
						</Text>

						<Section className="mt-8">
							<Text className="m-0 font-medium text-[15px] text-primary">
								The Strus team
							</Text>
						</Section>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
}
