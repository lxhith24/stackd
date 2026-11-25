import { env } from "cloudflare:workers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { accountForIdentity, ensureAccount } from "@/db/social";

export type AppUser = {
  /** The Stackd account id (accounts.id). Existing accounts keep their original ids. */
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

/** Local integration tests only: honoured solely when ALLOW_TEST_IDENTITY=1 (never set in production). */
const TEST_IDENTITY_HEADER = "x-stackd-test-identity";
const TEST_NAME_HEADER = "x-stackd-test-name";

export async function getUser(): Promise<AppUser | null> {
  const requestHeaders = await headers();
  if (!env.DB) throw new Error("Cloudflare D1 binding `DB` is unavailable.");

  if (env.ALLOW_TEST_IDENTITY === "1") {
    const testId = requestHeaders.get(TEST_IDENTITY_HEADER);
    if (testId) {
      const name = safeDecode(requestHeaders.get(TEST_NAME_HEADER)) || "Player";
      const account = await ensureAccount(env.DB, testId, name);
      return { userId: account.id, displayName: name, email: "test@stakd.local", fullName: name };
    }
  }

  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) return null;
  const { user } = session;
  const account = await accountForIdentity(env.DB, {
    authUserId: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    name: user.name,
  });
  return { userId: account.id, displayName: user.name || user.email, email: user.email, fullName: user.name || null };
}

export async function requireUser(returnTo: string): Promise<AppUser> {
  const user = await getUser();
  if (user) return user;
  redirect(`/?return_to=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`);
}

/** Only same-origin relative paths are allowed as post-sign-in destinations. */
export function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";
  if (url.pathname.startsWith("/api/auth")) return "/";
  return `${url.pathname}${url.search}${url.hash}`;
}

function safeDecode(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
