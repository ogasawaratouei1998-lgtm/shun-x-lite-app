import {prepare,register,unregister} from './browser-registration.mjs';
const $=id=>document.getElementById(id);
const status=s=>{$('enroll-status').textContent=s;};
let reg=null,key=null,busy=false;
const supported=isSecureContext&&'serviceWorker' in navigator&&'Notification' in window&&'PushManager' in window;
function controls(){const ok=!!reg&&!busy;$('push-prepare').disabled=!ok;$('push-remove').disabled=!ok;$('pairing-code').disabled=!ok||!key;$('push-enroll').disabled=!ok||!key||Notification.permission!=='granted'||!(/^[A-Za-z0-9_-]{43}$/.test($('pairing-code').value));}
async function refresh(){if(!reg||busy)return;busy=true;key=null;$('pairing-code').value='';controls();status('通知サーバーを確認しています。');try{key=await prepare();status('登録受付中です。通知を許可し、初回登録コードを入力してください。');}catch{status('専用通知サーバーは準備中、または接続できません。端末登録は無効です。');}finally{busy=false;controls();}}
$('push-prepare').addEventListener('click',refresh);
$('pairing-code').addEventListener('input',controls);
$('enable').addEventListener('click',()=>setTimeout(controls,1000));
window.addEventListener('focus',controls);
$('push-enroll').addEventListener('click',async()=>{if(!reg||busy||!key||Notification.permission!=='granted')return;const code=$('pairing-code').value;const vapid=key;busy=true;$('pairing-code').value='';controls();try{await register({manager:reg.pushManager,key:vapid,code,permission:Notification.permission});key=null;status('端末登録に成功しました。実際の遠隔通知が届くかは受信テストで確認します。');}catch{status('登録完了を確認できません。再確認してください。');}finally{busy=false;controls();}});
$('push-remove').addEventListener('click',async()=>{if(!reg||busy)return;busy=true;key=null;$('pairing-code').value='';controls();try{const r=await unregister({manager:reg.pushManager});status(r.localRevoked&&r.serverConfirmed?'端末登録を解除しました。':r.localRevoked?'端末の購読は解除済みです。サーバー登録の状態を別途ご確認ください。':'解除を確認できません。');}catch{status('解除を確認できません。');}finally{busy=false;controls();}});
if(supported){navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(r=>{if(new URL(r.scope).pathname!=='/shun-x-lite-app/')throw Error('SCOPE');reg=r;controls();return refresh();}).catch(()=>status('通知基盤を起動できません。'));}else status('iPhoneではホーム画面に追加したアプリで操作してください。');
