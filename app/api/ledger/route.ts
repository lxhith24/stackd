import { loadLedger } from '@/db/ledger';
import { user,json,failure } from '@/lib/api';
export async function GET(req:Request) { try{ const u=await user(req); return json(await loadLedger(u.userId)); }catch(e){return failure(e);} }
