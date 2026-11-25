import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import * as authSchema from "@/db/auth-schema";

type AuthEnv = {
  DB?: D1Database;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
};

function createAuth() {
  const e: AuthEnv = env;
  if (!e.DB) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  if (!e.BETTER_AUTH_SECRET) throw new Error("BETTER_AUTH_SECRET is not set.");
  return betterAuth({
    database: drizzleAdapter(drizzle(e.DB, { schema: authSchema }), { provider: "sqlite", schema: authSchema }),
    secret: e.BETTER_AUTH_SECRET,
    baseURL: e.BETTER_AUTH_URL,
    socialProviders: {
      google: {
        clientId: e.GOOGLE_CLIENT_ID ?? "",
        clientSecret: e.GOOGLE_CLIENT_SECRET ?? "",
        prompt: "select_account",
      },
    },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    advanced: { useSecureCookies: e.BETTER_AUTH_URL?.startsWith("https://") ?? false },
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

/** Worker bindings are fixed for the isolate's lifetime, so one instance is safe to reuse. */
export function getAuth() {
  instance ??= createAuth();
  return instance;
}
