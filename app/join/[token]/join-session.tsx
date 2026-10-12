'use client';
import {useEffect,useState} from 'react';
export default function JoinSession({token}:{token:string}){
 const [info,setInfo]=useState<{id:string;title:string;host:string;status:string;joined:boolean}|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{fetch(`/api/invites?token=${encodeURIComponent(token)}`,{cache:'no-store'}).then(async r=>{const d=await r.json() as any;if(!r.ok)throw new Error(d.error);setInfo(d);}).catch(e=>setError(e.message));},[token]);
 async function join(){setBusy(true);setError('');try{const r=await fetch('/api/invites',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})}),d=await r.json() as any;if(!r.ok)throw new Error(d.error);window.location.assign(`/?session=${encodeURIComponent(d.id)}`);}catch(e){setError((e as Error).message);setBusy(false);}}
 return <main className="signin"><span className="eyebrow">STACKD</span><h1>{info?.title||'Join the table.'}</h1>{info&&<><p>Hosted by {info.host}. Your amounts are read-only; the host records your buy-ins, rebuys and cash-out.</p>{info.joined?<a className="primary-btn" href={`/?session=${info.id}`}>Open your session</a>:info.status==='active'?<button className="primary-btn" disabled={busy} onClick={()=>void join()}>{busy?'Joining…':'Join session'}</button>:<p>This session has ended. New players cannot join.</p>}</>}{!info&&!error&&<p>Loading invitation…</p>}{error&&<p className="error-banner" role="alert">{error}</p>}<a className="text-btn" href="/">Back to your ledger</a></main>;
}
