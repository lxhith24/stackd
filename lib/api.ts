import { getChatGPTUser } from '@/app/chatgpt-auth';
import { HttpError } from '@/db/ledger';
import { ensureAccount } from '@/db/social';
import { database } from '@/db/ledger';
import { ZodError } from 'zod';
export async function user(request:Request) {
 const origin=request.headers.get('origin');
 if((request.method!=='GET'&&!origin)||origin&&origin!==new URL(request.url).origin) throw new HttpError(403,'Request origin is not allowed.');
 const u=await getChatGPTUser(); if(!u) throw new HttpError(401,'Please sign in to access your ledger.'); await ensureAccount(database(),u.userId,u.fullName||'Player'); return u;
}
export async function body(request:Request) { const text=await request.text(); if(text.length>250000) throw new HttpError(413,'This session is too large.'); try{return JSON.parse(text);}catch{throw new HttpError(400,'Invalid request.');} }
export function json(data:unknown,status=200) { return Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}}); }
export function failure(e:unknown) { if(e instanceof HttpError)return json({error:e.message},e.status); if(e instanceof ZodError)return json({error:e.issues[0]?.message??'Check the entered values.'},400); console.error('Ledger request failed',e); return json({error:'Your ledger could not be saved or loaded. Your input is still here. Please retry.'},503); }
