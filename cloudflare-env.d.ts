declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BETTER_AUTH_SECRET?: string;
    BETTER_AUTH_URL?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    /** Local integration tests only. Never set in production. */
    ALLOW_TEST_IDENTITY?: string;
  }
}
