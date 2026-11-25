// TEMPORARY: one-time production export for the move off ChatGPT Sites.
// Publish once to Sites, download the JSON while signed in, then delete this file.
import { createHash } from 'node:crypto';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/db/ledger';
import { failure } from '@/lib/api';
import { HttpError } from '@/lib/errors';

// SHA-256 of the owner's ChatGPT-verified email (lower-case). Not a secret, just not plain text.
const OWNER_EMAIL_SHA256 = '5d28141a37f1fe59828ce1b623affc9743a48eaeccff209bd44599d4f93aff55';
const TABLES = ['accounts', 'profiles', 'sessions', 'players', 'entries', 'friendships', 'social_limits'] as const;

export async function GET() {
  try {
    const u = await getChatGPTUser();
    if (!u) throw new HttpError(401, 'Please sign in.');
    const digest = createHash('sha256').update(u.email.trim().toLowerCase()).digest('hex');
    if (digest !== OWNER_EMAIL_SHA256) throw new HttpError(403, 'Not allowed.');
    const db = database();
    const results = await db.batch(TABLES.map(t => db.prepare(`SELECT * FROM ${t}`)));
    const tables = Object.fromEntries(TABLES.map((t, i) => [t, results[i].results]));
    const counts = Object.fromEntries(TABLES.map((t, i) => [t, results[i].results.length]));
    return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), exportedBy: u.userId, counts, tables }, null, 1), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store', 'Content-Disposition': 'attachment; filename="stackd-export.json"' },
    });
  } catch (e) { return failure(e); }
}
