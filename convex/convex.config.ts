// convex/convex.config.ts
import { defineApp } from "convex/server";
import rag from "@convex-dev/rag/convex.config";
import betterAuth from "@convex-dev/better-auth/convex.config";

const app = defineApp();

app.use(rag);
app.use(betterAuth);

export default app;