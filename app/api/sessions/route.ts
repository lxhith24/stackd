import { database,loadLedger,saveSession,HttpError } from '@/db/ledger';
import { user,json,failure,body } from '@/lib/api';
import { saveSchema,validateSession } from '@/lib/poker';
async function save(req:Request,create:boolean) {try{
 const u=await user(req),input=saveSchema.parse(await body(req));
 try{validateSession(input.session,input.acceptImbalance);}catch(e){throw new HttpError(400,(e as Error).message);}
 await saveSession(u.userId,input.session,input.operationId,create);
 return json(await loadLedger(u.userId));
}catch(e){return failure(e);} }
export async function POST(req:Request){return save(req,true);}
export async function PUT(req:Request){return save(req,false);}
export async function DELETE(req:Request){try{
 const u=await user(req),url=new URL(req.url),id=url.searchParams.get('id'),revision=Number(url.searchParams.get('revision'));
 if(!id||!Number.isInteger(revision))throw new HttpError(400,'Invalid session.');
 const res=await database().prepare('DELETE FROM sessions WHERE id=? AND owner=? AND revision=?').bind(id,u.userId,revision).run();
 if(!res.meta.changes)throw new HttpError(409,'This session changed or was already removed. Reload your ledger.');
 return json(await loadLedger(u.userId));
}catch(e){return failure(e);}}
