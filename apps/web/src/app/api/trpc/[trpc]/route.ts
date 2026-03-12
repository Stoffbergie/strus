import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { withAuth } from "@workos-inc/authkit-nextjs";
import type { NextRequest } from "next/server";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { wrapHandler } from "~/server/strus";

const createContext = async (req: NextRequest) => {
	const { user } = await withAuth();

	return createTRPCContext({
		headers: req.headers,
		userId: user?.id ?? null,
	});
};

const handler = wrapHandler((req) =>
	fetchRequestHandler({
		endpoint: "/api/trpc",
		req,
		router: appRouter,
		createContext: () => createContext(req as NextRequest),
		onError:
			process.env.NODE_ENV === "development"
				? ({ path, error }) => {
						console.error(
							`tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
						);
					}
				: undefined,
	}),
);

export { handler as GET, handler as POST };
