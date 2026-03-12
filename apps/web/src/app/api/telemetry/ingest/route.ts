import { NextResponse } from "next/server";

export async function POST() {
	return NextResponse.json(
		{
			error:
				"This endpoint has been deprecated. Use ingest.strus.io/v2/ingest instead.",
		},
		{ status: 410 },
	);
}
