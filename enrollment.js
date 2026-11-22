// Notification-only enrollment. Never transmit or persist raw subscription data.
const $=id=>document.getElementById(id);
const status=s=>{$('enroll-status').textContent=s;};
const utf=new TextEncoder();
const info=utf.encode('shunx-device-envelope-v1');
const b64=v=>btoa(String.fromCharCode(...new Uint8Array(v))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
function bytes(s){
  if(typeof s!=='string'||!/^[A-Za-z0-9_-]{87}$/.test(s))throw Error('PUBLIC_KEY');
  const v=Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='),x=>x.charCodeAt(0));
  if(v.length!==65||v[0]!==4||b64(v)!==s)throw Error('PUBLIC_KEY');
  return v;
}
let reg,config,envelope='';
const allowed=window.isSecureContext&&'serviceWorker' in navigator&&'Notification' in window&&'PushManager' in window&&!!crypto.subtle;
function clear(){config=null;envelope='';$('push-enroll').disabled=true;$('push-copy').disabled=true;}
$('push-config').addEventListener('input',clear);
if(allowed){navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(r=>{reg=r;$('push-prepare').disabled=false;$('push-remove').disabled=false;}).catch(()=>status('通知基盤を起動できません。'));}else status('ホーム画面に追加した対応アプリが必要です。');
$('push-prepare').addEventListener('click',async()=>{
  clear();
  try{
    if(Notification.permission!=='granted')throw Error('PERMISSION');
    const p=JSON.parse($('push-config').value.trim());
    if(p.version!==1||Object.keys(p).sort().join(',')!=='enrollmentPublicKey,vapidPublicKey,version'||p.enrollmentPublicKey===p.vapidPublicKey)throw Error('CONFIG');
    const vapid=bytes(p.vapidPublicKey);
    await crypto.subtle.importKey('raw',vapid,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
    const recipient=await crypto.subtle.importKey('raw',bytes(p.enrollmentPublicKey),{name:'ECDH',namedCurve:'P-256'},false,[]);
    config={vapid,recipient};$('push-enroll').disabled=false;status('公開鍵を確認しました。端末購読を準備してください。');
  }catch{status('公開鍵設定または端末通知の許可を確認してください。');}
});
async function encrypt(sub,recipient){
  const ephemeral=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
  const shared=await crypto.subtle.deriveBits({name:'ECDH',public:recipient},ephemeral.privateKey,256);
  const base=await crypto.subtle.importKey('raw',shared,'HKDF',false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:new Uint8Array(32),info},base,{name:'AES-GCM',length:256},false,['encrypt']);
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:info,tagLength:128},key,utf.encode(JSON.stringify(sub.toJSON())));
  return JSON.stringify({v:1,epk:b64(await crypto.subtle.exportKey('raw',ephemeral.publicKey)),iv:b64(iv),ct:b64(ct)});
}
$('push-enroll').addEventListener('click',async()=>{
  const c=config;if(!c||!reg)return;$('push-enroll').disabled=true;$('push-copy').disabled=true;envelope='';
  try{
    // subscribe is invoked directly from the user gesture.
    const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:c.vapid});
    const existing=sub.options.applicationServerKey;
    if(!existing||b64(existing)!==b64(c.vapid))throw Error('KEY_MISMATCH');
    const encrypted=await encrypt(sub,c.recipient);
    if(config!==c)return;
    envelope=encrypted;$('push-copy').disabled=false;status('暗号化しました。登録データをコピーし、非公開リポジトリの秘密設定へ登録してください。');
  }catch{status('購読に失敗しました。通知の許可や既存購読・公開鍵を確認してください。');if(config===c)$('push-enroll').disabled=false;}
});
$('push-copy').addEventListener('click',async()=>{try{if(!envelope)return;await navigator.clipboard.writeText(envelope);envelope='';$('push-copy').disabled=true;status('暗号化データをコピーしました。SHUNX_DEVICE_ENVELOPE に登録してください。');}catch{status('コピーできませんでした。');}});
$('push-remove').addEventListener('click',async()=>{clear();try{const sub=await reg.pushManager.getSubscription();if(sub&&!await sub.unsubscribe())throw Error('FAILED');status('端末の購読を解除しました。非公開リポジトリの登録Secretも削除してください。');}catch{status('購読解除を確認できません。');}});
