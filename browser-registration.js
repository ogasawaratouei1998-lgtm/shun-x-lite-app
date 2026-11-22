// Staged browser adapter for dedicated SHUN-X push service; no secret storage.
const BASE='https://kdvkbkdfnrwvrbugpnaq.supabase.co/functions/v1/shunx-push';
const APP='shunx-lite';
const B64=/^[A-Za-z0-9_-]+$/;
function publicKey(value){
 if(typeof value!=='string'||value.length!==87||!B64.test(value))throw Error('PUBLIC_KEY');
 const b=Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='),v=>v.charCodeAt(0));
 if(b.length!==65||b[0]!==4)throw Error('PUBLIC_KEY');
 return b;
}
async function request(op,{fetcher=fetch,body}={}){
 const r=await fetcher(BASE+'/'+op,{method:body?'POST':'GET',credentials:'omit',cache:'no-store',redirect:'error',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw Error('BACKEND_'+r.status);
 return r.json();
}
export async function prepare(fetcher=fetch){
 const h=await request('health',{fetcher});
 if(h.ready!==true||h.signupsOpen!==true)throw Error('ENROLLMENT_UNAVAILABLE');
 return publicKey(h.vapidPublicKey);
}
export async function register({manager,key,code,permission,fetcher=fetch}){
 if(permission!=='granted'||!(key instanceof Uint8Array)||key.length!==65||typeof code!=='string'||code.length!==43||!B64.test(code))throw Error('SETUP_REQUIRED');
 // invoke subscribe immediately in the button gesture, after separate health and permission steps
 const sub=await manager.subscribe({userVisibleOnly:true,applicationServerKey:key});
 try{
  const actual=sub.options.applicationServerKey;
  if(!actual||new Uint8Array(actual).length!==key.length||new Uint8Array(actual).some((v,i)=>v!==key[i]))throw Error('KEY_MISMATCH');
  const v=await request('subscribe',{fetcher,body:{app:APP,code,subscription:sub.toJSON()}});
  if(v.registered!==true)throw Error('REGISTER_FAILED');
  return {registered:true};
 }catch(e){
  // No auto retry; local revocation prevents an ambiguously accepted old registration from receiving.
  try{await sub.unsubscribe();}catch{}
  throw e;
 }
}
export async function unregister({manager,fetcher=fetch}){
 const sub=await manager.getSubscription();
 if(!sub)return {localRevoked:true,serverConfirmed:false};
 let serverConfirmed=false,localRevoked=false;
 try{const v=await request('unsubscribe',{fetcher,body:{app:APP,endpoint:sub.endpoint}});serverConfirmed=v.removed===true;}catch{}
 try{localRevoked=await sub.unsubscribe();}catch{}
 return {localRevoked,serverConfirmed};
}
