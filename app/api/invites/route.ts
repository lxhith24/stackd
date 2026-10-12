import { database } from '@/db/ledger';
import { invitation,inviteInfo,joinSession } from '@/db/social';
import { user,json,failure,body } from '@/lib/api';
import { z } from 'zod';
export async function GET(req:Request){try{const u=await user(req),token=z.string().uuid().parse(new URL(req.url).searchParams.get('token'));return json(await inviteInfo(database(),u.userId,token));}catch(e){return failure(e);}}
export async function POST(req:Request){try{const u=await user(req),input=z.object({sessionId:z.string().uuid(),rotate:z.boolean().optional()}).parse(await body(req));return json(await invitation(database(),u.userId,input.sessionId,input.rotate));}catch(e){return failure(e);}}
export async function PUT(req:Request){try{const u=await user(req),input=z.object({token:z.string().uuid()}).parse(await body(req));return json(await joinSession(database(),u.userId,input.token));}catch(e){return failure(e);}}
