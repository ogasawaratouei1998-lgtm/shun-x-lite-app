import {prepare,register,unregister,recoverSubscription,thirdDisplayTest,inspectRemote} from './browser-registration.js?v=15';
const $=id=>document.getElementById(id);
const iOS=/iPad|iPhone|iPod/.test(navigator.userAgent||'');
const standalone=window.matchMedia?.('(display-mode: standalone)')?.matches===true || navigator.standalone===true;
let reg=null,key=null,busy=false;
let last='通知登録 v15 を読み込みました。通知サーバーと端末の状態を確認しています。';
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
 $('push-repair').disabled=busy;
 $('push-remove').disabled=busy;
 $('push-remote-test').disabled=false; // Always clickable: diagnostic feedback is local and immediate.
 $('push-inspect').disabled=false;
 $('push-diagnose').disabled=false;
 $('pairing-code').disabled=busy;
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
// Restore on an explicit tap only. The new subscription is not sent any push during recovery.
$('push-repair').addEventListener('click',async()=>{
 if(busy)return;
 if(iOS&&!standalone){message('ホーム画面のSHUN-X Liteから操作してください。復旧は実行していません。');return;}
 if(!reg?.pushManager||!('Notification' in window)||Notification.permission!=='granted'){message('通知許可または端末の通知基盤を確認してください。復旧は実行していません。');return;}
 if(!key){message('先に「通知サーバーの状態を確認」を押してください。復旧は実行していません。');return;}
 const code=$('pairing-code').value;
 if(!/^[A-Za-z0-9_-]{43}$/.test(code)){message('初回端末登録用コード欄に43文字のコードを入力してください。復旧は実行していません。');return;}
 busy=true;paint();message('このiPhoneのプッシュ購読を再作成し、登録コードを使ってサーバーの購読を更新しています。通知は送信しません。');
 try{
  await recoverSubscription({manager:reg.pushManager,key,code,permission:Notification.permission});
  message('復旧登録が完了しました。手順3の診断で購読ありを確認し、手順4で登録照合してください。通知はまだ送信していません。');
 }catch(e){const v=e?.message||'';message('購読の復旧を確認できません（'+(v.startsWith('BACKEND_')?v:v==='KEY_MISMATCH'?'通知鍵が不一致':v==='SETUP_REQUIRED'?'設定不足':'端末または通信エラー')+'）。通知の自動送信・再登録は行いません。');}
 finally{$('pairing-code').value='';busy=false;paint();}
});
// Display feedback directly below the remote button for every branch; never initiate a send in startup hooks.
const remoteStatus=$('remote-test-status');
function remoteMessage(text){remoteStatus.textContent=text;remoteStatus.setAttribute?.('data-result','updated');}
// No network or remote send: confirm only local Apple permission, SW and subscription state.
$('push-diagnose').addEventListener('click',async()=>{
 const out=$('diagnose-status');out.textContent='iPhoneの通知の状態を確認しています。遠隔送信はしません。';
 if(iOS&&!standalone){out.textContent='ホーム画面のSHUN-X Liteアプリで開いてください。遠隔送信なし。';return;}
 if(!('Notification' in window)||Notification.permission!=='granted'){out.textContent='通知が許可されていません。iPhoneの設定でSHUN-X Liteの通知を許可してください。遠隔送信なし。';return;}
 if(!reg||!reg.pushManager){out.textContent='通知のService Workerが起動していません。アプリを閉じて起動し直してください。遠隔送信なし。';return;}
 try{
  const subscription=await reg.pushManager.getSubscription();
  if(!subscription){out.textContent='このiPhoneには有効なプッシュ購読がありません。手順2の初回端末登録用コードを入力して「このiPhoneの購読を復旧する」を押してください。遠隔送信なし。';return;}
  const found=typeof reg.getNotifications==='function'?await reg.getNotifications({tag:'shunx-remote-connectivity-v2'}):[];
  const count=Array.isArray(found)?found.length:0;
  out.textContent='通知許可済み・Apple向け端末購読あり。'+(count?'表示履歴の候補 '+count+' 件を端末で確認できます。':'現在表示中の改善版通知は未検出です。')+' iPhoneの「設定 → 通知 → SHUN-X Lite」と集中モード、通知センターも確認してください。遠隔送信なし。';
 }catch{out.textContent='端末購読を確認できません。通知設定とアプリの再起動をご確認ください。遠隔送信なし。';}
});
// Inspect the enrolled device by endpoint digest. It never triggers a push or retries a test.
$('push-inspect').addEventListener('click',async()=>{
 const out=$('inspect-status');out.textContent='端末とサーバーを照合しています。遠隔送信なし。';
 if(busy){out.textContent='別の処理が進行中です。完了後に照合してください。遠隔送信なし。';return;}
 if(iOS&&!standalone){out.textContent='ホーム画面のSHUN-X Liteから操作してください。遠隔送信なし。';return;}
 if(!('Notification' in window)||Notification.permission!=='granted'||!reg?.pushManager){out.textContent='端末通知が未許可または未起動です。遠隔送信なし。';return;}
 const code=$('remote-code').value;
 if(!/^[A-Za-z0-9_-]{43}$/.test(code)){out.textContent='遠隔テスト用コード43文字を入力してください。遠隔送信なし。';return;}
 busy=true;paint();
 try{
  const sub=await reg.pushManager.getSubscription();
  if(!sub){out.textContent='この端末にプッシュ購読がありません。再登録の要否を確認してください。遠隔送信なし。';return;}
  const state=await inspectRemote({code,endpoint:sub.endpoint});
  const label=s=>s==='accepted'?'Apple側受付済み':s==='not_attempted'?'未送信':s==='unknown'?'結果不明':s==='claimed'?'送信処理中':s==='gone'?'端末無効':'要確認';
  out.textContent=(state.deviceMatches?'このiPhoneの購読とサーバー登録は一致しています。':state.deviceRegistered?'サーバーの登録端末とこのiPhoneの購読が一致しません。再登録は原因確認後に行ってください。':'サーバーに登録端末がありません。')+' 第1回：'+label(state.tests.first)+'／第2回：'+label(state.tests.second)+'／第3回：'+label(state.tests.third)+'。受付はiPhone表示の確認ではありません。遠隔送信なし。';
 }catch(e){out.textContent='照合できませんでした（'+((e?.message||'').startsWith('BACKEND_')?e.message:'通信または設定')+'）。コードと通信を確認してください。遠隔送信なし。';}
 finally{busy=false;paint();}
});
$('push-remote-test').addEventListener('click',async()=>{
 remoteMessage('ボタン操作を受け付けました。端末と登録コードを確認しています。');
 if(busy){remoteMessage('通知サーバーの確認処理中です。処理完了後に押してください。まだ送信していません。');return;}
 if(iOS&&!standalone){remoteMessage('iPhoneではホーム画面に追加したSHUN-X Liteから操作してください。まだ送信していません。');return;}
 if(!reg||!reg.pushManager){remoteMessage('端末の通知機能が起動していません。アプリを再起動してください。まだ送信していません。');return;}
 if(!('Notification' in window)||Notification.permission!=='granted'){remoteMessage('通知が許可されていません。先に通知を許可してください。まだ送信していません。');return;}
 const code=$('remote-code').value;
 if(!/^[A-Za-z0-9_-]{43}$/.test(code)){remoteMessage('遠隔テスト用の専用入力欄に、Supabaseで設定した43文字のコードを再入力してください。まだ送信していません。');return;}
 busy=true;paint();
 remoteMessage('専用サーバーに接続テストを1回依頼しています。iPhoneへの配信完了はまだ確認できていません。');
 try{
   const sub=await reg.pushManager.getSubscription();
   if(!sub){remoteMessage('このiPhoneにプッシュ購読がありません。先に手順3の復旧を行ってください。通知は送信していません。');return;}
   const check=await inspectRemote({code,endpoint:sub.endpoint});
   if(!check.deviceMatches){remoteMessage('現在のiPhoneとサーバー登録が一致しません。再送せず、先に復旧してください。');return;}
   if(check.tests.third!=='not_attempted'){remoteMessage('第3回テストはすでに実行済み、または処理中です。重複送信はしません。');return;}
   const response=await thirdDisplayTest({code});
   if(response.alreadyAttempted)remoteMessage('この接続テストはすでに処理されています。重複送信は行いません。');
   else if(response.accepted)remoteMessage('サーバーは1回の送信を受理しました。実際にiPhoneに届いたか確認してください。');
   else remoteMessage('送信結果を確認できません。自動再送は行いません。');
 }catch(e){
   const v=e?.message||'';
   if(v==='BACKEND_403')remoteMessage('登録コードが一致しないか、送信が許可されていません。通知は送信していません。');
   else if(v==='BACKEND_409')remoteMessage('通知サーバーに登録済み端末が見つかりません。通知は送信していません。');
   else remoteMessage('通信または送信結果を確認できません（'+(v.startsWith('BACKEND_')?v:'NETWORK')+'）。送信された可能性もあるため自動再送はしません。');
 }finally{
   $('remote-code').value='';busy=false;paint();
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

// Set only after handlers are bound: the fallback script can detect incomplete initialization.
window.__shunxEnrollmentBooted=true;
