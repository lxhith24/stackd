import assert from 'node:assert/strict';
const base='http://127.0.0.1:5180',owner=`test-${crypto.randomUUID()}`,other=`other-${crypto.randomUUID()}`;
async function req(path,method='GET',body,identity=owner){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json','Origin':base,...(identity?{'oai-authenticated-user-id':identity,'oai-authenticated-user-email':'test@sites.test'}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:await r.json()};}
function game(){return {id:crypto.randomUUID(),revision:0,title:'Disposable integration test',mode:'group',venue:'Test table',game:'Holdem',stakes:'10/20',notes:'',currency:'USD',start:'2026-01-01T23:00:00.000Z',end:null,status:'active',players:[{id:crypto.randomUUID(),name:'Host',isSelf:true,cashout:null,entries:[{id:crypto.randomUUID(),kind:'buyin',amount:200000,at:'2026-01-01T23:00:00.000Z'}]},{id:crypto.randomUUID(),name:'Guest',isSelf:false,cashout:null,entries:[{id:crypto.randomUUID(),kind:'buyin',amount:200000,at:'2026-01-01T23:00:00.000Z'}]}]};}
assert.equal((await req('/api/ledger','GET',undefined,null)).status,401,'anonymous access');
assert.equal((await req('/api/settings','PUT',{name:'Tester',currency:'USD'})).status,200,'profile saved');
let s=game(),op=crypto.randomUUID();
let r=await req('/api/sessions','POST',{session:s,operationId:op});assert.equal(r.status,200,JSON.stringify(r));s=r.body.sessions[0];assert.equal(s.players.length,2);assert.equal(s.revision,1);
r=await req('/api/sessions','POST',{session:{...s,revision:0},operationId:op});assert.equal(r.status,200);assert.equal(r.body.sessions.length,1,'retry idempotent');
assert.equal((await req('/api/sessions','POST',{session:game(),operationId:crypto.randomUUID()})).status,409,'one active session');
assert.equal((await req('/api/ledger','GET',undefined,other)).body.sessions.length,0,'owner isolation');
assert.equal((await req('/api/sessions','PUT',{session:s,operationId:crypto.randomUUID()},other)).status,404,'cross-account writes rejected');
assert.equal((await req('/api/sessions','DELETE',undefined,other)).status,400);
assert.equal((await req('/api/settings','PUT',{name:'Tester',currency:'INR'})).status,409,'currency locked');
const previous=structuredClone(s);s.players[0].entries.push({id:crypto.randomUUID(),kind:'rebuy',amount:100000,at:'2026-01-02T00:00:00.000Z'});
r=await req('/api/sessions','PUT',{session:s,operationId:crypto.randomUUID()});assert.equal(r.status,200,JSON.stringify(r));s=r.body.sessions[0];assert.equal(s.revision,2);assert.equal(s.players[0].entries.length,2);
assert.equal((await req('/api/sessions','PUT',{session:previous,operationId:crypto.randomUUID()})).status,409,'stale writes rejected');
s.status='completed';s.end='2026-01-02T01:00:00.000Z';
assert.equal((await req('/api/sessions','PUT',{session:s,operationId:crypto.randomUUID()})).status,400,'cashout required');
s.players[0].cashout=450000;s.players[1].cashout=0;
assert.equal((await req('/api/sessions','PUT',{session:s,operationId:crypto.randomUUID()})).status,400,'imbalance acknowledgement');
s.players[1].cashout=50000;r=await req('/api/sessions','PUT',{session:s,operationId:crypto.randomUUID()});assert.equal(r.status,200,JSON.stringify(r));s=r.body.sessions[0];assert.equal(s.status,'completed');
const reread=await req('/api/ledger');assert.equal(reread.body.sessions[0].players[0].cashout,450000,'reload persistence');
assert.equal((await req(`/api/sessions?id=${s.id}&revision=1`,'DELETE')).status,409,'stale delete protected');
assert.equal((await req(`/api/sessions?id=${s.id}&revision=${s.revision}`,'DELETE',undefined,other)).status,409,'cross-account delete protected');
r=await req(`/api/sessions?id=${s.id}&revision=${s.revision}`,'DELETE');assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.body.sessions.length,0);
console.log('PASS: 18 API scenarios: auth, isolation, cloud persistence, buy-ins, edits, duplicate saves, conflicts, zero cash-out, balance, currency locking, deletion.');
