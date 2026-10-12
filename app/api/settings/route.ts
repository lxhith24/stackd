import { database,loadLedger,HttpError } from '@/db/ledger';
import { user,json,failure,body } from '@/lib/api';
import { profileSchema } from '@/lib/poker';
export async function PUT(req:Request) { try {
 const u=await user(req),p=profileSchema.parse(await body(req)),db=database();
 const res=await db.prepare(`INSERT INTO profiles (owner,name,currency) VALUES (?,?,?) ON CONFLICT(owner) DO UPDATE SET name=excluded.name,currency=excluded.currency WHERE profiles.currency=excluded.currency OR NOT EXISTS(SELECT 1 FROM sessions WHERE owner=?)`).bind(u.userId,p.name,p.currency,u.userId).run();
 if(!res.meta.changes)throw new HttpError(409,'Currency is fixed while your ledger contains sessions.');
 await db.prepare('UPDATE accounts SET name=? WHERE id=?').bind(p.name,u.userId).run();
 return json(await loadLedger(u.userId));
 }catch(e){return failure(e);} }
