import { database } from '@/db/ledger';
import { friends, requestFriend, changeFriend } from '@/db/social';
import { user,json,failure,body } from '@/lib/api';
import { z } from 'zod';
export async function GET(req:Request){try{const u=await user(req);return json(await friends(database(),u.userId));}catch(e){return failure(e);}}
export async function POST(req:Request){try{const u=await user(req),input=z.object({code:z.string().regex(/^\d{4}$/)}).parse(await body(req));return json(await requestFriend(database(),u.userId,input.code));}catch(e){return failure(e);}}
export async function PATCH(req:Request){try{const u=await user(req),input=z.object({id:z.string().uuid(),action:z.enum(['accept','remove'])}).parse(await body(req));return json(await changeFriend(database(),u.userId,input.id,input.action));}catch(e){return failure(e);}}
