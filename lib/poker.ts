import { z } from 'zod';
export const currencies = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD'] as const;
const id = z.string().uuid();
const amount = z.number().int().min(0).max(10000000000);
const time = z.string().datetime();
const startDate = z.union([time,z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10)===v,'Invalid start date')]);
export const entrySchema = z.object({ id, amount: amount.positive(), at: time, kind: z.enum(['buyin', 'rebuy']) });
export const playerSchema = z.object({ id, name: z.string().trim().min(1).max(60), isSelf: z.boolean(), accountId:z.string().nullable().optional(), cashout: amount.nullable(), entries: z.array(entrySchema).min(0).max(100) });
export const sessionSchema = z.object({
 id, revision: z.number().int().min(0), title: z.string().trim().min(1).max(100), mode: z.enum(['personal','group']),
 venue: z.string().trim().max(100), game: z.string().trim().max(60), stakes: z.string().trim().max(60), notes: z.string().max(3000),
 currency: z.enum(currencies), start: startDate, end: time.nullable(), status: z.enum(['active','completed']), players: z.array(playerSchema).min(1).max(30),
});
export type Entry = z.infer<typeof entrySchema>;
export type Player = z.infer<typeof playerSchema>;
export type Session = z.infer<typeof sessionSchema> & {viewerIsHost?:boolean;roster?:{id:string;name:string;code:string|null}[];inviteToken?:string|null};
export type Profile = { name: string; currency: typeof currencies[number] };
export const profileSchema = z.object({name:z.string().trim().min(1).max(60),currency:z.enum(currencies)});
export const saveSchema = z.object({session:sessionSchema,operationId:id,acceptImbalance:z.boolean().optional()});
export function invested(p:Player) { return p.entries.reduce((a,e)=>a+e.amount,0); }
export function result(p:Player) { return p.cashout === null ? null : p.cashout-invested(p); }
export function balance(s:Session) { return s.players.reduce((a,p)=>a+(p.cashout??0)-invested(p),0); }
export function hours(s:Session) { return s.end && s.start.includes('T') ? (Date.parse(s.end)-Date.parse(s.start))/3600000 : 0; }
export function validateSession(s:Session,acceptImbalance=false) {
 const ids=[...s.players.map(p=>p.id),...s.players.flatMap(p=>p.entries.map(e=>e.id))];
 if(new Set(ids).size!==ids.length) throw new Error('Player and entry identifiers must be unique.');
 if(s.players.filter(p=>p.isSelf).length!==1) throw new Error('Mark exactly one player as you.');
 if(s.mode==='personal' && s.players.length!==1) throw new Error('Personal sessions have one player.');
 if(s.start.includes('T')?Date.parse(s.start)>Date.now()+60000:s.start>new Date(Date.now()+14*3600000).toISOString().slice(0,10)) throw new Error('The session cannot start in the future.');
 if(s.status==='active' && s.end!==null) throw new Error('An active session cannot have an end time.');
 if(s.status==='completed' && (s.end && Date.parse(s.end)<=Date.parse(s.start))) throw new Error('End time must be after start time.');
 if(s.end && Date.parse(s.end)>Date.now()+60000) throw new Error('End time cannot be in the future.');
 for(const p of s.players) {
  if(!p.entries.length){if(s.status==='completed') throw new Error('Record an initial buy-in for every player before finishing.');continue;}
  if(p.entries.filter(e=>e.kind==='buyin').length!==1) throw new Error('Each player needs exactly one initial buy-in.');
  const first=p.entries.find(e=>e.kind==='buyin')!;
  if(p.entries.some(e=>Date.parse(e.at)>Date.now()+60000)) throw new Error('Entry times cannot be in the future.');
  if(s.start.includes('T') && p.entries.some(e=>Date.parse(e.at)<Date.parse(s.start)||Date.parse(e.at)<Date.parse(first.at)||Date.parse(e.at)>Date.now()+60000||(s.end&&Date.parse(e.at)>Date.parse(s.end)))) throw new Error('Entry times must be within the session, with the initial buy-in first.');
  if(s.status==='completed' && p.cashout===null) throw new Error('Enter a cash-out for every player, including zero.');
 }
 if(s.status==='completed' && s.mode==='group' && balance(s)!==0 && !acceptImbalance) throw new Error('Cash-outs do not balance. Review the difference before finishing.');
 return s;
}
export function parseMoney(input:string):number {
 if(!/^\d+(\.\d{1,2})?$/.test(input.trim())) throw new Error('Enter an amount with up to two decimal places.');
 const [whole,decimal='']=input.trim().split('.');
 const n=Number(whole)*100+Number(decimal.padEnd(2,'0'));
 if(!Number.isSafeInteger(n)||n>10000000000) throw new Error('Amount is too large.');
 return n;
}
export function money(n:number,currency='INR') { return new Intl.NumberFormat(undefined,{style:'currency',currency,currencyDisplay:'narrowSymbol',maximumFractionDigits:2}).format(n/100); }
export function stats(sessions:Session[]) {
 const complete=sessions.filter(s=>s.status==='completed');
 const own=complete.map(s=>s.players.find(p=>p.isSelf)!);
 const profit=own.reduce((a,p)=>a+(result(p)??0),0);
 const timed=complete.filter(s=>hours(s)>0),duration=timed.reduce((a,s)=>a+hours(s),0),timedProfit=timed.reduce((a,s)=>a+(result(s.players.find(p=>p.isSelf)!)??0),0);
 return {profit,invested:own.reduce((a,p)=>a+invested(p),0),count:complete.length,hours:duration,hourly:duration?timedProfit/duration:null};
}
const csvCell=(value:unknown)=>{let s=String(value??''); if(/^[=+@\-\t\r]/.test(s)&&typeof value!=='number') s="'"+s; return '"'+s.replaceAll('"','""')+'"';};
export function csv(rows:unknown[][]) { return '\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n'); }
export function exportRows(sessions:Session[],entries=false):unknown[][] {
 if(entries) return [['Session ID','Session','Player','You','Currency','Entry ID','Type','Amount','Time'],...sessions.flatMap(s=>s.players.flatMap(p=>p.entries.map(e=>[s.id,s.title,p.name,p.isSelf?'Yes':'No',s.currency,e.id,e.kind,e.amount/100,e.at])))];
 return [['Session ID','Session','Status','Venue','Game','Stakes','Currency','Start','End','Hours','Player','You','Invested','Cash-out','Profit/loss','Notes'],...sessions.flatMap(s=>s.players.map(p=>[s.id,s.title,s.status,s.venue,s.game,s.stakes,s.currency,s.start,s.end,s.end?hours(s):'',p.name,p.isSelf?'Yes':'No',invested(p)/100,p.cashout===null?'':p.cashout/100,s.status==='completed'?(result(p)??0)/100:'',s.notes]))];
}
