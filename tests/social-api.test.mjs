import assert from 'node:assert/strict';
import {stats,validateSession,sessionSchema} from '../lib/poker.ts';
import {writeFile,unlink} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const base='http://127.0.0.1:5180',host=`social-host-${crypto.randomUUID()}`,player=`social-player-${crypto.randomUUID()}`,other=`social-other-${crypto.randomUUID()}`,stranger=`social-stranger-${crypto.randomUUID()}`;
const ids=[host,player,other,stranger],sessionIds=[];
async function req(path,method='GET',body,identity=host,origin=base){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(origin?{Origin:origin}:{}),...(identity?{'oai-authenticated-user-id':identity,'oai-authenticated-user-email':'disposable@sites.test','oai-authenticated-user-full-name':encodeURIComponent(identity),'oai-authenticated-user-full-name-encoding':'percent-encoded-utf-8'}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:await r.json()};}
function session(){return {id:crypto.randomUUID(),revision:0,title:'Disposable shared table',mode:'group',venue:'Home',game:'Holdem',stakes:'10/20',notes:'Host private note',currency:'INR',start:'2026-01-01',end:null,status:'active',players:[{id:crypto.randomUUID(),name:'Host',isSelf:true,cashout:null,entries:[{id:crypto.randomUUID(),kind:'buyin',amount:10000,at:'2026-01-01T12:00:00.000Z'}]},{id:crypto.randomUUID(),name:'Guest',isSelf:false,cashout:null,entries:[{id:crypto.randomUUID(),kind:'buyin',amount:5000,at:'2026-01-01T12:00:00.000Z'}]}]};}
const save=(s,identity=host)=>req('/api/sessions',s.revision?'PUT':'POST',{session:s,operationId:crypto.randomUUID(),acceptImbalance:true},identity);
try{
 assert.equal((await req('/api/friends','GET',undefined,null)).status,401);
 assert.equal((await req('/api/friends','POST',{code:'0000'},host,'https://evil.example')).status,403);
 assert.equal((await req('/api/friends','POST',{code:'0000'},host,null)).status,403);
 const socials=[];for(const id of ids){const r=await req('/api/friends','GET',undefined,id);assert.equal(r.status,200,JSON.stringify(r));assert.match(r.body.me.code,/^\d{4}$/);socials.push(r.body);}
 assert.equal(new Set(socials.map(s=>s.me.code)).size,4,'unique codes');
 assert.equal((await req('/api/friends')).body.me.code,socials[0].me.code,'stable code');
 assert.equal((await req('/api/friends','POST',{code:socials[0].me.code})).status,400,'self friendship');
 let r=await req('/api/friends','POST',{code:socials[1].me.code});assert.equal(r.status,200);const friendId=r.body.items[0].id;
 assert.equal((await req('/api/friends','POST',{code:socials[1].me.code})).body.items.length,1,'duplicate request');
 assert.equal((await req('/api/friends','PATCH',{id:friendId,action:'accept'})).status,403,'sender cannot accept');
 assert.equal((await req('/api/friends','PATCH',{id:friendId,action:'accept'},other)).status,404,'outsider cannot accept');
 assert.equal((await req('/api/friends','PATCH',{id:friendId,action:'accept'},player)).status,200);
 await req('/api/settings','PUT',{name:'Host',currency:'INR'});
 let s=session();sessionIds.push(s.id);r=await save(s);assert.equal(r.status,200,JSON.stringify(r));s=r.body.sessions[0];
 assert.equal(s.start,'2026-01-01');assert.equal(s.viewerIsHost,true);
 assert.equal((await req('/api/ledger','GET',undefined,other)).body.sessions.length,0,'nonmember cannot read');
 assert.equal((await req('/api/invites','POST',{sessionId:s.id},player)).status,404,'only host can create links');
 r=await req('/api/invites','POST',{sessionId:s.id});assert.equal(r.status,200);const token=r.body.token;
 assert.equal((await req(`/api/invites?token=${token}`,'GET',undefined,null)).status,401);
 const anon=await fetch(`${base}/join/${token}`);const html=await anon.text();assert.match(html,/signin-with-chatgpt/);assert.match(html,/return_to=/,'sign-in returns to invite');
 assert.equal((await req(`/api/invites?token=${token}`,'GET',undefined,other)).body.joined,false);
 const stale=structuredClone(s);
 const joins=await Promise.all([req('/api/invites','PUT',{token},other),req('/api/invites','PUT',{token},other)]);assert.ok(joins.every(x=>x.status===200),JSON.stringify(joins));
 r=await req('/api/ledger','GET',undefined,other);let shared=r.body.sessions[0];assert.equal(r.body.profile.currency,'INR','first join creates profile');assert.equal(shared.players.length,1,'participant amounts only');assert.equal(shared.notes,'','host notes private');assert.equal(shared.viewerIsHost,false);assert.equal(shared.inviteToken,null);assert.equal(shared.roster.length,2,'host plus joined player');assert.equal(shared.players[0].entries.length,0,'waiting for host buy-in');
 assert.equal((await save(stale)).status,409,'join invalidates stale host editor');
 assert.equal((await save(shared,other)).status,404,'participant payload cannot update host session');
 s=(await req('/api/ledger')).body.sessions[0];assert.equal(s.players.length,3,'concurrent joins add only once');
 assert.equal((await save(s,other)).status,404,'participant cannot edit full session');
 assert.equal((await req(`/api/sessions?id=${s.id}&revision=${s.revision}`,'DELETE',undefined,other)).status,409,'participant cannot delete');
 const joined=s.players.find(p=>p.accountId===other);joined.entries=[{id:crypto.randomUUID(),kind:'buyin',amount:20000,at:'2026-01-01T12:00:00.000Z'},{id:crypto.randomUUID(),kind:'rebuy',amount:5000,at:'2026-01-01T13:00:00.000Z'}];
 // Host can add an accepted friend directly, but cannot forge an unrelated membership.
 const forged=structuredClone(s);forged.players.push({id:crypto.randomUUID(),accountId:stranger,name:'Forged',isSelf:false,cashout:null,entries:[]});assert.equal((await save(forged)).status,403);
 s.players.push({id:crypto.randomUUID(),accountId:player,name:'Friend',isSelf:false,cashout:null,entries:[]});r=await save(s);assert.equal(r.status,200,JSON.stringify(r));s=r.body.sessions[0];
 assert.equal((await req('/api/ledger','GET',undefined,player)).body.sessions[0].players.length,1);
 shared=(await req('/api/ledger','GET',undefined,other)).body.sessions[0];assert.equal(shared.players[0].entries.length,2,'host edits arrive in participant history');assert.ok(!JSON.stringify(shared).includes('Host private note'));
 r=await req('/api/friends','POST',{code:socials[2].me.code});assert.equal(r.status,200,'same session players can request friendship');
 assert.equal((await req('/api/friends','PATCH',{id:friendId,action:'remove'})).status,200);
 assert.equal((await req('/api/ledger','GET',undefined,player)).body.sessions.length,1,'unfriending preserves session history');
 r=await req('/api/invites','POST',{sessionId:s.id,rotate:true});assert.equal(r.status,200);assert.notEqual(r.body.token,token);assert.equal((await req('/api/invites','PUT',{token},stranger)).status,404,'old token revoked');const replacement=r.body.token;
 // Removing a player revokes that player's view without changing other players.
 s.players=s.players.filter(p=>p.accountId!==player);r=await save(s);assert.equal(r.status,200,JSON.stringify(r));s=r.body.sessions[0];assert.equal((await req('/api/ledger','GET',undefined,player)).body.sessions.length,0);
 s.status='completed';s.end=null;for(const p of s.players)p.cashout=p.entries.reduce((n,e)=>n+e.amount,0);r=await save(s);assert.equal(r.status,200,JSON.stringify(r));s=r.body.sessions[0];
 shared=(await req('/api/ledger','GET',undefined,other)).body.sessions[0];assert.equal(stats([shared]).invested,25000);assert.equal(stats([shared]).hourly,null,'untimed session excluded from hourly rate');assert.equal(stats([shared]).count,1);
 assert.equal((await req('/api/invites','PUT',{token:replacement},stranger)).status,409,'completed sessions reject new joins');
 assert.equal((await req('/api/invites','PUT',{token:replacement},other)).status,200,'existing member can reopen completed session');
 assert.equal((await req('/api/invites','POST',{sessionId:s.id})).status,400,'completed invites cannot be recreated');
 for(let i=0;i<16;i++)r=await req('/api/friends','POST',{code:'0000'},stranger);assert.equal(r.status,429,'lookup throttling');
 assert.throws(()=>sessionSchema.parse({...s,start:'2026-02-30'}),'impossible dates rejected');
 const pending=structuredClone(s);pending.players[0].entries=[];assert.throws(()=>validateSession(pending,true),/buy-in/);
 console.log('PASS: v2 API checks for unique codes, requests, invites, concurrent joins, permissions, privacy, host updates, direct friend adds, revocation, date-only sessions and rate limits.');
}finally{
 const sql=`DELETE FROM sessions WHERE owner IN (${ids.map(x=>`'${x}'`).join(',')});\nDELETE FROM friendships WHERE a IN (${ids.map(x=>`'${x}'`).join(',')}) OR b IN (${ids.map(x=>`'${x}'`).join(',')});\nDELETE FROM profiles WHERE owner IN (${ids.map(x=>`'${x}'`).join(',')});\nDELETE FROM accounts WHERE id IN (${ids.map(x=>`'${x}'`).join(',')});\nDELETE FROM social_limits WHERE key IN (${ids.flatMap(x=>['friend','join'].map(a=>`'${a}:${x}'`)).join(',')});`;
 const path='.sites-runtime/social-test-cleanup.sql';await writeFile(path,sql);const result=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state','--file',path],{encoding:'utf8'});await unlink(path);assert.equal(result.status,0,result.stderr);
}
