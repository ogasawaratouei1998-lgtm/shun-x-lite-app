// Public app update controller and fail-safe boot. No stored secrets or push registration mutations.
(function(){
 'use strict';
 const CURRENT_VERSION=16;
 function start(){
  const reload=document.getElementById('reload-app');
  const status=document.getElementById('update-status');
  const version=document.getElementById('app-version');
  if(version)version.textContent='アプリ版：v'+CURRENT_VERSION;
  let latest=null,checking=null,applying=false,navigated=false;
  const inputs=()=>Boolean(document.getElementById('pairing-code')?.value||document.getElementById('remote-code')?.value);
  function paint(state,message,label){
   if(status){status.dataset.state=state;status.textContent=message;}
   if(reload)reload.textContent=label;
  }
  function navigate(){
   if(navigated)return;
   navigated=true;
   window.location.assign('./?app=v'+(latest&&latest>CURRENT_VERSION?latest:CURRENT_VERSION));
  }
  async function checkVersion(){
   if(checking)return checking;
   paint('checking','配信サーバーの最新版を確認しています…','確認中');
   if(reload)reload.disabled=true;
   checking=(async()=>{
    try{
     const url=new URL('./version.json',window.location.href);
     url.searchParams.set('check',String(Date.now()));
     const r=await fetch(url.href,{cache:'no-store',credentials:'omit',redirect:'error',signal:typeof AbortSignal!=='undefined'&&AbortSignal.timeout?AbortSignal.timeout(10000):undefined});
     if(!r.ok)throw Error('VERSION_HTTP');
     const info=await r.json();
     if(!info||info.app!=='shun-x-lite-app'||!Number.isSafeInteger(info.version)||info.version<1||info.version>9999)throw Error('VERSION_INVALID');
     latest=info.version;
     if(latest>CURRENT_VERSION){
      paint('available','新しいv'+latest+'が利用できます。','アップデートする');
     }else if(latest===CURRENT_VERSION){
      paint('current','最新版です（v'+CURRENT_VERSION+'）。','最新版を確認');
     }else{
      latest=null;
      paint('error','配信情報が古いため、最新版を判定できません。','再確認する');
     }
    }catch{
     latest=null;
     paint('error','更新確認に失敗しました。通信状態をご確認ください。','再確認する');
    }finally{
     if(reload&&!applying)reload.disabled=false;
    }
   })();
   try{await checking;}finally{checking=null;}
  }
  if(reload)reload.addEventListener('click',async()=>{
   if(applying)return;
   if(checking)await checking;
   if(latest===null||latest<=CURRENT_VERSION){await checkVersion();return;}
   if(inputs()){
    paint('available','登録コードが入力中です。入力を完了・消去してから更新してください。','入力後に更新');
    return;
   }
   applying=true;reload.disabled=true;
   paint('checking','最新版を安全に準備しています…','更新中');
   try{
    const registration=await navigator.serviceWorker?.getRegistration();
    await registration?.update();
    navigate();
   }catch{
    applying=false;reload.disabled=false;
    paint('error','更新に失敗しました。通信を確認して再度お試しください。','再確認する');
    latest=null;
   }
  });
  if('serviceWorker' in navigator){
   navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(inputs()){
     paint('available','アプリが更新されました。コード入力後に画面を再読み込みしてください。','更新を適用');
     return;
    }
    // A background worker activation must not clear the user's active page unexpectedly.
    if(applying)navigate();
    else if(status)paint('available','更新されたアプリが準備されました。内容を確認してください。','最新版を確認');
   });
  }
  // Startup check is read-only. No push dispatch, subscription reset or forced app reload.
  checkVersion();

  // Keep offline startup diagnostics for the existing remote-notification controls.
  const enroll=document.getElementById('enroll-status');
  if(!enroll)return;
  const report=()=>{
   if(window.__shunxEnrollmentBooted===true)return;
   enroll.textContent='通知画面のプログラムを読み込めません。アプリを一度終了して開き直してください。改善しない場合はSafariで最新版を開き、ホーム画面アプリを再起動してください。';
   const guidance=document.getElementById('enroll-guidance');
   if(guidance)guidance.textContent='通知登録 v16 が未起動です。秘密情報は入力しないでください。';
  };
  for(const id of ['push-prepare','push-enroll','push-repair','push-remove','push-remote-test','push-inspect','push-diagnose']){
   const b=document.getElementById(id);
   if(b)b.addEventListener('click',()=>{
    if((id==='push-remote-test'||id==='push-inspect'||id==='push-diagnose')&&window.__shunxEnrollmentBooted!==true){
     const field=document.getElementById(id==='push-diagnose'?'diagnose-status':id==='push-inspect'?'inspect-status':'remote-test-status');
     if(field)field.textContent='通知登録プログラムを読み込めません。接続テストは送信していません。最新版に更新してください。';
    }
    report();
   },true);
  }
  for(const b of document.querySelectorAll('nav button')){
   b.addEventListener('click',()=>{
    if(window.__shunxAppBooted===true)return;
    for(const id of ['home','research','alerts','settings']){
     const section=document.getElementById(id);
     if(section)section.hidden=id!==b.dataset.page;
    }
    for(const item of document.querySelectorAll('nav button')){
     if(item===b)item.setAttribute('aria-current','page');
     else item.removeAttribute('aria-current');
    }
    if(b.dataset.page==='settings')report();
   },true);
  }
  setTimeout(report,3500);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);
 else start();
})();
