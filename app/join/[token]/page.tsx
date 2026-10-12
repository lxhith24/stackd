import { getChatGPTUser,chatGPTSignInPath } from '@/app/chatgpt-auth';
import JoinSession from './join-session';
export const dynamic='force-dynamic';
export default async function JoinPage({params}:{params:Promise<{token:string}>}){
 const {token}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(token)) return <main className="signin"><h1>Invalid invite.</h1><a href="/">Back to Stackd</a></main>;
 return <JoinContent token={token}/>;
}
async function JoinContent({token}:{token:string}){
 const u=await getChatGPTUser();
 if(!u)return <main className="signin"><span className="eyebrow">STACKD</span><h1>Join the table.</h1><p>Sign in to join this session and see your buy-ins and rebuys. The host manages all amounts.</p><a className="primary-btn" href={chatGPTSignInPath(`/join/${token}`)} target="_top">Sign in with ChatGPT</a></main>;
 return <JoinSession token={token}/>;
}
