import { env } from 'cloudflare:workers';
import type { Session, Profile } from '@/lib/poker';
import { HttpError } from '@/lib/errors';
import { areFriends } from './social';
export function database():D1Database { if(!env.DB) throw new Error('Database unavailable'); return env.DB; }
export async function loadLedger(owner:string) {
 const db=database(),visible="(s.owner=? OR EXISTS(SELECT 1 FROM players member WHERE member.session_id=s.id AND member.account_id=?))";
 const [profile,sessions,players,entries]=await db.batch([
 db.prepare('SELECT name,currency FROM profiles WHERE owner=?').bind(owner),
 db.prepare(`SELECT s.* FROM sessions s WHERE ${visible} ORDER BY s.start DESC`).bind(owner,owner),
 db.prepare(`SELECT p.*,COALESCE(p.account_id,CASE WHEN p.is_self=1 THEN s.owner END) AS linked_id,a.code FROM players p JOIN sessions s ON s.id=p.session_id LEFT JOIN accounts a ON a.id=COALESCE(p.account_id,CASE WHEN p.is_self=1 THEN s.owner END) WHERE ${visible} ORDER BY p.is_self DESC,p.rowid`).bind(owner,owner),
 db.prepare(`SELECT e.* FROM entries e JOIN sessions s ON s.id=e.session_id JOIN players p ON p.id=e.player_id WHERE ${visible} AND (s.owner=? OR p.account_id=?) ORDER BY e.at,e.rowid`).bind(owner,owner,owner,owner)]);
 return {profile:(profile.results[0]??null) as Profile|null,sessions:sessions.results.map((s:any)=>{
  const host=s.owner===owner,all=players.results.filter((p:any)=>p.session_id===s.id) as any[];
  return {id:s.id,title:s.title,mode:s.mode,venue:s.venue,game:s.game,stakes:s.stakes,notes:host?s.notes:'',currency:s.currency,start:s.start,end:s.end,status:s.status,revision:s.revision,viewerIsHost:host,inviteToken:host?s.invite_token:null,
   roster:all.filter(p=>p.linked_id).map(p=>({id:p.linked_id,name:p.name,code:p.code})),
   players:all.filter(p=>host||p.linked_id===owner).map(p=>({id:p.id,name:p.name,isSelf:host?!!p.is_self:p.linked_id===owner,accountId:p.linked_id??null,cashout:p.cashout,entries:entries.results.filter((e:any)=>e.player_id===p.id).map((e:any)=>({id:e.id,kind:e.kind,amount:e.amount,at:e.at}))}))};
 }) as Session[]};
}
export { HttpError } from '@/lib/errors';
export async function saveSession(owner:string,s:Session,op:string,create:boolean) {
 const db=database();
 const previous=await db.prepare('SELECT owner,last_write,revision FROM sessions WHERE id=?').bind(s.id).first<any>();
 if(previous && previous.owner!==owner) throw new HttpError(404,'Session not found.');
 if(previous?.last_write===op) return;
 if(create&&previous) throw new HttpError(409,'This session already exists. Refresh your ledger.');
 if(!create&&(!previous||previous.revision!==s.revision)) throw new HttpError(409,'This session changed on another device. Reload the ledger before editing it again.');
 const profile=await db.prepare('SELECT currency FROM profiles WHERE owner=?').bind(owner).first<any>();
 if(!profile) throw new HttpError(400,'Choose your name and currency first.');
 if(profile.currency!==s.currency) throw new HttpError(400,'Use your ledger currency.');
 const oldPlayers=previous?(await db.prepare('SELECT * FROM players WHERE session_id=?').bind(s.id).all()).results as any[]:[];
 const linked=new Set<string>();
 for(const p of s.players) {
  const old=oldPlayers.find(x=>x.id===p.id),oldAccount=old?.account_id??(old?.is_self?owner:null);
  p.accountId=p.isSelf?owner:(p.accountId??null);
  if(p.accountId) {
   if(linked.has(p.accountId)) throw new HttpError(400,'A registered player can appear only once in a session.');
   linked.add(p.accountId);
   if(p.accountId===owner&&!p.isSelf) throw new HttpError(400,'Mark the host as you.');
   if(p.accountId!==owner && oldAccount!==p.accountId && !await areFriends(db,owner,p.accountId)) throw new HttpError(403,'Add an accepted friend, or invite this player through the session link.');
   const account=await db.prepare('SELECT name FROM accounts WHERE id=?').bind(p.accountId).first<{name:string}>();
   if(!account) throw new HttpError(400,'Player account not found.');
   if(!p.isSelf)p.name=account.name;
  }
  if(oldAccount && oldAccount!==p.accountId) throw new HttpError(400,'Remove the registered player before replacing them.');
 }
 const guard='EXISTS (SELECT 1 FROM sessions WHERE id=? AND owner=? AND last_write=?)';
 const statements:D1PreparedStatement[]=[];
 const vals=[s.title,s.mode,s.venue,s.game,s.stakes,s.notes,s.currency,s.start,s.end,s.status];
 if(create) statements.push(db.prepare('INSERT INTO sessions (id,owner,title,mode,venue,game,stakes,notes,currency,start,end,status,revision,last_write) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,?)').bind(s.id,owner,...vals,op));
 else statements.push(db.prepare('UPDATE sessions SET title=?,mode=?,venue=?,game=?,stakes=?,notes=?,currency=?,start=?,end=?,status=?,revision=revision+1,last_write=? WHERE id=? AND owner=? AND revision=?').bind(...vals,op,s.id,owner,s.revision));
 if(!create) {
  statements.push(db.prepare(`DELETE FROM entries WHERE session_id=? AND ${guard}`).bind(s.id,s.id,owner,op));
  statements.push(db.prepare(`DELETE FROM players WHERE session_id=? AND ${guard}`).bind(s.id,s.id,owner,op));
 }
 for(const p of s.players) {
  statements.push(db.prepare(`INSERT INTO players (id,session_id,name,is_self,cashout,account_id) SELECT ?,?,?,?,?,? WHERE ${guard}`).bind(p.id,s.id,p.name,p.isSelf?1:0,p.cashout,p.accountId??null,s.id,owner,op));
  for(const e of p.entries) statements.push(db.prepare(`INSERT INTO entries (id,session_id,player_id,kind,amount,at) SELECT ?,?,?,?,?,? WHERE ${guard}`).bind(e.id,s.id,p.id,e.kind,e.amount,e.at,s.id,owner,op));
 }
 try {
  const res=await db.batch(statements);
  if(!res[0].meta.changes) throw new HttpError(409,'This session changed on another device. Reload before editing.');
 } catch(e) {
  if(e instanceof HttpError) throw e;
  if(String(e).includes('UNIQUE constraint failed: sessions.owner')) throw new HttpError(409,'Finish your active session before starting another.');
  throw e;
 }
}
