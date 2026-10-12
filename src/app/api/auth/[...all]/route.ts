// src/app/api/auth/[...all]/route.ts
// Route handler de Better Auth (/api/auth/*).
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth";

export const { POST, GET } = toNextJsHandler(auth);
