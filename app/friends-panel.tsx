'use client';
import {useState,useEffect} from 'react';
import {UserPlus} from 'lucide-react';
import {toast} from 'sonner';
export type FriendItem={id:string;accountId:string;name:string;code:string;status:'pending'|'accepted';incoming:boolean};
export type SocialData={me:{id:string;name:string;code:string};items:FriendItem[]};
export function useFriends(){
 const [social,setSocial]=useState<SocialData|null>(null),[socialError,setSocialError]=useState(''),[socialBusy,setSocialBusy]=useState(false);
 async function update(method='GET',body?:unknown){setSocialError('');setSocialBusy(true);try{const r=await fetch('/api/friends',{method,cache:'no-store',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined}),d=await r.json() as any;if(!r.ok)throw new Error(d.error||'Unable to load friends.');setSocial(d);return true;}catch(e){setSocialError((e as Error).message);return false;}finally{setSocialBusy(false);}}
 useEffect(()=>{void update();},[]);
 return {social,socialError,socialBusy,update};
}
export default function FriendsPanel({state}: {state:ReturnType<typeof useFriends>}) {
 const [code,setCode]=useState('');
 const {social,socialError,socialBusy,update}=state;
 const accepted=social?.items.filter(f=>f.status==='accepted')||[];
 const requests=social?.items.filter(f=>f.status==='pending')||[];
 async function send(){if(await update('POST',{code})){setCode('');toast.success('Friend request sent');}}
 function friendRow(f:FriendItem) {
  return <div className="friend-row" key={f.id}>
   <div><strong>{f.name}</strong><small>{f.code} · {f.status==='accepted'?'Friends':f.incoming?'Wants to add you':'Request sent'}</small></div>
   <div className="actions">
    {f.status==='pending'&&f.incoming&&<button className="primary-btn" disabled={socialBusy} onClick={()=>void update('PATCH',{id:f.id,action:'accept'})}>Accept</button>}
    <button className="text-btn" disabled={socialBusy} onClick={()=>void update('PATCH',{id:f.id,action:'remove'})}>{f.status==='accepted'?'Unfriend':f.incoming?'Decline':'Cancel'}</button>
   </div>
  </div>;
 }
 return <>
  <div className="pagehead"><div><h1>Gang</h1></div></div>
  <div className="friends-grid">
   <section className="panel form-stack">
    <h2>Add a friend</h2>
    <div className="friend-code-card"><span className="metadata">Your friend code</span><strong className="friend-code">{social?.me.code||'…'}</strong><p className="metadata">Share this code so another player can add you.</p></div>
    <form className="form-stack" onSubmit={e=>{e.preventDefault();void send();}}>
     <label className="field"><span>Enter another player’s code</span><input required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={code} onChange={e=>setCode(e.currentTarget.value.replace(/\D/g,''))} placeholder="0000"/></label>
     <button className="primary-btn add-player-btn" disabled={socialBusy||code.length!==4}><UserPlus size={16}/>Add friend</button>
    </form>
   </section>
   <div className="form-stack">
    {socialError&&<p className="error-banner" role="alert">{socialError}<button className="text-btn" disabled={socialBusy} onClick={()=>void update()}>Retry</button></p>}
    <section className="panel"><h2>Friends{social?` (${accepted.length})`:''}</h2><div className="friend-list friends-page-list">{accepted.length?accepted.map(friendRow):<p className="metadata">{!social&&!socialError?'Loading friends…':'Your friends will appear here once a request is accepted.'}</p>}</div></section>
    <section className="panel"><h2>Friend requests{social?` (${requests.length})`:''}</h2><div className="friend-list friends-page-list">{requests.length?requests.map(friendRow):<p className="metadata">No pending friend requests.</p>}</div></section>
   </div>
  </div>
 </>;
}
export function SessionRoster({roster,state}:{roster:{id:string;name:string;code:string|null}[];state:ReturnType<typeof useFriends>}){
 const {social,socialBusy,update,socialError}=state;
 return <section className="panel"><h2>Players at this table</h2><p className="metadata">Add a registered player as a friend.</p><div className="friend-list">{roster.map(p=>{const relation=social?.items.find(x=>x.accountId===p.id),self=social?.me.id===p.id;return <div className="friend-row" key={p.id}><strong>{p.name}{self?' · You':''}</strong>{!self&&(relation?<span className="subtle-tag">{relation.status==='accepted'?'Friends':relation.incoming?'Incoming request':'Request sent'}</span>:p.code&&<button className="secondary-btn" disabled={socialBusy} onClick={async()=>{if(await update('POST',{code:p.code}))toast.success('Friend request sent');}}>Add friend</button>)}</div>;})}</div>{socialError&&<p className="error-banner" role="alert">{socialError}</p>}</section>;
}
