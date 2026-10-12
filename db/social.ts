import { HttpError } from '../lib/errors';

export type Account = { id: string; name: string; code: string };
export async function ensureAccount(db: D1Database, id: string, name: string): Promise<Account> {
  const existing = await db.prepare('SELECT * FROM accounts WHERE id=?').bind(id).first<Account>();
  if (existing) return existing;
  // Uniqueness is enforced in the database, including simultaneous first sign-ins.
  for (let attempt = 0; attempt < 32; attempt++) {
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 10000).padStart(4, '0');
    await db.prepare('INSERT OR IGNORE INTO accounts(id,name,code) VALUES(?,?,?)').bind(id, name.slice(0, 60) || 'Player', code).run();
    const account = await db.prepare('SELECT * FROM accounts WHERE id=?').bind(id).first<Account>();
    if (account) return account;
  }
  await db.prepare(`WITH RECURSIVE codes(n) AS (SELECT 0 UNION ALL SELECT n+1 FROM codes WHERE n<9999)
    INSERT OR IGNORE INTO accounts(id,name,code) SELECT ?,?,printf('%04d',n) FROM codes
    WHERE NOT EXISTS(SELECT 1 FROM accounts WHERE code=printf('%04d',n)) LIMIT 1`).bind(id,name.slice(0,60)||'Player').run();
  const account = await db.prepare('SELECT * FROM accounts WHERE id=?').bind(id).first<Account>();
  if (!account) throw new HttpError(503, 'All four-digit friend codes are assigned. Please contact the host.');
  return account;
}

export async function socialLimit(db: D1Database, owner: string, action: string, max = 15) {
  const window = Math.floor(Date.now() / 300000);
  const row = await db.prepare(`INSERT INTO social_limits(key,count,window) VALUES(?,1,?)
    ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window=excluded.window THEN count+1 ELSE 1 END,window=excluded.window
    RETURNING count`).bind(`${action}:${owner}`,window).first<{count:number}>();
  if (!row || row.count > max) throw new HttpError(429, 'Too many attempts. Please try again in five minutes.');
}

export async function friends(db: D1Database, owner: string) {
  const me = await db.prepare('SELECT * FROM accounts WHERE id=?').bind(owner).first<Account>();
  const list = await db.prepare(`SELECT f.id,f.status,f.requested_by AS requestedBy,a.id AS accountId,a.name,a.code
    FROM friendships f JOIN accounts a ON a.id=CASE WHEN f.a=? THEN f.b ELSE f.a END
    WHERE f.a=? OR f.b=? ORDER BY a.name`).bind(owner,owner,owner).all();
  return {me,items:list.results.map((x:any)=>({...x,incoming:x.requestedBy!==owner}))};
}

export async function requestFriend(db: D1Database, owner: string, code: string) {
  await socialLimit(db,owner,'friend');
  if (!/^\d{4}$/.test(code)) throw new HttpError(400,'Enter a four-digit friend code.');
  const target = await db.prepare('SELECT id FROM accounts WHERE code=?').bind(code).first<{id:string}>();
  if (!target) throw new HttpError(404,'No player found with this code.');
  if (target.id===owner) throw new HttpError(400,'This is your own friend code.');
  const [a,b]=[owner,target.id].sort();
  await db.prepare('INSERT OR IGNORE INTO friendships(id,a,b,requested_by,status) VALUES(?,?,?,?,?)')
    .bind(crypto.randomUUID(),a,b,owner,'pending').run();
  return friends(db,owner);
}

export async function changeFriend(db: D1Database, owner: string, id: string, action: string) {
  const row=await db.prepare('SELECT * FROM friendships WHERE id=? AND (a=? OR b=?)').bind(id,owner,owner).first<any>();
  if (!row) throw new HttpError(404,'Friend request not found.');
  if (action==='accept') {
    if(row.status!=='pending'||row.requested_by===owner) throw new HttpError(403,'Only the recipient can accept this request.');
    await db.prepare("UPDATE friendships SET status='accepted' WHERE id=? AND status='pending' AND requested_by<>?").bind(id,owner).run();
  } else if (action==='remove') {
    await db.prepare('DELETE FROM friendships WHERE id=? AND (a=? OR b=?)').bind(id,owner,owner).run();
  } else throw new HttpError(400,'Invalid friend action.');
  return friends(db,owner);
}

export async function areFriends(db:D1Database,a:string,b:string) {
  const [first,second]=[a,b].sort();
  return !!await db.prepare("SELECT id FROM friendships WHERE a=? AND b=? AND status='accepted'").bind(first,second).first();
}

export async function invitation(db:D1Database,owner:string,sessionId:string,rotate=false) {
  const session=await db.prepare("SELECT invite_token,status,mode FROM sessions WHERE id=? AND owner=?").bind(sessionId,owner).first<any>();
  if(!session) throw new HttpError(404,'Session not found.');
  if(session.status!=='active'||session.mode!=='group') throw new HttpError(400,'Only an active group session can accept players.');
  const token=rotate||!session.invite_token?crypto.randomUUID():session.invite_token;
  await db.prepare("UPDATE sessions SET invite_token=? WHERE id=? AND owner=? AND status='active' AND mode='group'").bind(token,sessionId,owner).run();
  return {token};
}

export async function inviteInfo(db:D1Database,owner:string,token:string) {
  const s=await db.prepare(`SELECT s.id,s.owner,s.title,s.currency,s.status,a.name AS host FROM sessions s
    JOIN accounts a ON a.id=s.owner WHERE s.invite_token=? AND s.mode='group'`).bind(token).first<any>();
  if(!s) throw new HttpError(404,'This invite link is invalid or has been replaced.');
  const joined= s.owner===owner || !!await db.prepare('SELECT id FROM players WHERE session_id=? AND account_id=?').bind(s.id,owner).first();
  return {...s,joined};
}

export async function joinSession(db:D1Database,owner:string,token:string) {
  await socialLimit(db,owner,'join',30);
  const s=await db.prepare("SELECT * FROM sessions WHERE invite_token=? AND mode='group'").bind(token).first<any>();
  if(!s) throw new HttpError(404,'This invite link is invalid or has been replaced.');
  if(s.owner===owner) return {id:s.id};
  const existing=await db.prepare('SELECT id FROM players WHERE session_id=? AND account_id=?').bind(s.id,owner).first();
  if(existing) return {id:s.id};
  if(s.status!=='active') throw new HttpError(409,'This session has ended. New players cannot join.');
  const account=await db.prepare('SELECT name FROM accounts WHERE id=?').bind(owner).first<{name:string}>();
  const res=await db.batch([
    db.prepare("INSERT OR IGNORE INTO profiles(owner,name,currency) VALUES(?,?,?)").bind(owner,account?.name||'Player',s.currency),
    db.prepare(`INSERT OR IGNORE INTO players(id,session_id,name,is_self,cashout,account_id)
      SELECT ?,id,?,0,NULL,? FROM sessions WHERE id=? AND invite_token=? AND status='active'
      AND (SELECT COUNT(*) FROM players WHERE session_id=?)<30`).bind(crypto.randomUUID(),account?.name||'Player',owner,s.id,token,s.id),
    db.prepare('UPDATE sessions SET revision=revision+1 WHERE id=? AND changes()>0').bind(s.id),
  ]);
  if(!res[1].meta.changes) {
    if(await db.prepare('SELECT id FROM players WHERE session_id=? AND account_id=?').bind(s.id,owner).first()) return {id:s.id};
    throw new HttpError(409,'The session is full, has ended, or its invite has changed.');
  }
  return {id:s.id};
}
