import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { apiKeysRouter } from "./routers/api-keys";
import { baselinesRouter } from "./routers/baselines";
import { contactRouter } from "./routers/contact";
import { endpointsRouter } from "./routers/endpoints";
import { shiftsRouter } from "./routers/shifts";

export const appRouter = createTRPCRouter({
	apiKeys: apiKeysRouter,
	baselines: baselinesRouter,
	contact: contactRouter,
	endpoints: endpointsRouter,
	shifts: shiftsRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
