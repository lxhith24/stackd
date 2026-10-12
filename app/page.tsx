import { getChatGPTUser,chatGPTSignInPath } from './chatgpt-auth';
import LedgerApp from './ledger-app';
import { Spade } from 'lucide-react';
export const dynamic='force-dynamic';
export default async function Home(){const user=await getChatGPTUser();if(!user)return <main className="signin"><span className="brandmark"><Spade size={26}/></span><span className="eyebrow">STACKD</span><h1>Your game.<br/>Your records.</h1><p>Keep every session, buy-in, and result in one private ledger. Host a game without making your guests sign up.</p><a className="primary-btn" href={chatGPTSignInPath('/')} target="_top">Sign in with ChatGPT</a><small>Access the same ledger on your phone and laptop.</small></main>;return <LedgerApp email={user.email} displayName={user.fullName??''}/>;}
