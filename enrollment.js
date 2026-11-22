import {prepare,register,unregister} from './browser-registration.js?v=7';
window.__shunxEnrollmentBooted=true;
const $=id=>document.getElementById(id);
const iOS=/iPad|iPhone|iPod/.test(navigator.userAgent||'');
const standalone=window.matchMedia?.('(display-mode: standalone)')?.matches===true || navigator.standalone===true;
let reg=null,key=null,busy=false;
let last='通知登録 v7 を読み込みました。通知サーバーと端末の状態を確認しています。';
function hint(){
 if(!window.isSecureContext)return 'HTTPSで開いてください。';
 if(!('serviceWorker' in navigator))return 'このブラウザーではService Workerが使用できません。';
 if(iOS&&!standalone)return 'iPhoneではSafariで「ホーム画面に追加」したSHUN-X Liteから操作してください。';
 if(!('Notification' in window))return 'このブラウザーでは通知に対応していません。';
 if(!reg)return '端末の通知基盤が準備できていません。アプリを一度終了して再起動してください。';
 if(!reg.pushManager)return 'この端末では遠隔通知を利用できません。iOSのバージョン・ホーム画面アプリを確認してください。';
 if(Notification.permission==='denied')return '端末側で通知が拒否されています。iPhoneの設定から許可してください。';
 if(Notification.permission!=='granted')return '下の「通知の許可を確認」を押して許可してください。';
 if(!key)return '「通知サーバーの状態を確認」を押してください。';
 const code=$('pairing-code').value;
 if(!/^[A-Za-z0-9_-]{43}$/.test(code))return 'Supabaseで設定した43文字の端末登録コードを入力してください。';
 return '登録準備が整いました。「この端末を登録」を押してください。';
}
function paint(){
 $('enroll-status').textContent=last;
 $('enroll-guidance').textContent=hint();
 $('push-prepare').disabled=busy;
 $('push-enroll').disabled=busy;
 $('push-remove').disabled=busy;
 $('pairing-code').disabled=busy||!key;
}
function message(s){last=s;paint();}
async function check(){
 if(busy)return;
 busy=true;key=null;paint();
 message('専用通知サーバーを確認中です。');
 try{
  const k=await prepare();
  key=k;
  message('通知サーバーは正常で、端末登録を受け付けています。');
 }catch(e){
  const v=e?.message||'';
  message(v==='ENROLLMENT_UNAVAILABLE'?'サーバーが端末登録を受け付けていません。設定をご確認ください。':v.startsWith('BACKEND_')?'通知サーバーからエラーが返されました（'+v+'）。':'通知サーバーに接続できません。通信状態を確認してください。');
 }finally{busy=false;paint();}
}
$('push-prepare').addEventListener('click',check);
$('pairing-code').addEventListener('input',paint);
$('push-enroll').addEventListener('click',async()=>{
 if(busy)return;
 const problem=hint();
 if(problem!=='登録準備が整いました。「この端末を登録」を押してください。'){message('登録できません。'+problem);return;}
 const code=$('pairing-code').value,k=key;
 busy=true;paint();message('端末の購読登録中です。');
 try{
  await register({manager:reg.pushManager,key:k,code,permission:Notification.permission});
  key=null;
  message('端末登録に成功しました。遠隔通知の受信確認はこれから実施します。');
 }catch(e){
  const v=e?.message||'';
  message(v==='KEY_MISMATCH'?'以前の通知鍵の購読が残っていました。再度「通知サーバーの状態を確認」して登録してください。':v==='BACKEND_409'?'別の端末がすでに登録されています。サーバー側の登録をご確認ください。':'端末登録を確認できません。通知設定とサーバー接続を確認してください。');
 }finally{
  $('pairing-code').value='';busy=false;paint();
 }
});
$('push-remove').addEventListener('click',async()=>{
 if(busy)return;
 if(!reg){message('端末の通知基盤が未起動です。アプリを再起動してください。');return;}
 busy=true;paint();
 try{
  const result=await unregister({manager:reg.pushManager});
  message(result.localRevoked&&result.serverConfirmed?'この端末の通知登録を解除しました。':result.localRevoked?'端末の購読を解除しました。サーバー側の状態は未確認です。':'解除が確認できません。端末の設定をご確認ください。');
 }catch{message('解除処理に失敗しました。');}
 finally{busy=false;key=null;$('pairing-code').value='';paint();}
});
window.addEventListener('focus',paint);
window.addEventListener('shunx-notification-permission-changed',paint);
paint();
// Connectivity can be tested independently of Service Worker startup.
check();
if(!window.isSecureContext||!('serviceWorker' in navigator)||!('Notification' in window)){
 message('ブラウザーの通知機能を使用できません。'+hint());
}else{
 navigator.serviceWorker.register('./sw.js').then(r=>{
  reg=r;paint();
  if(!r.pushManager)message('Service Workerは起動しましたが、遠隔通知に対応していません。');
  return r.update().catch(()=>{});
 }).catch(()=>message('Service Workerの起動に失敗しました。アプリを終了して再起動してください。'));
}
