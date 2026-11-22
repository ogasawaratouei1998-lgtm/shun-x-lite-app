// Standalone classic-script fallback: controls must explain failures even if modules fail to load.
(function(){
 function start(){
  const reload=document.getElementById('reload-app');
  if(reload)reload.addEventListener('click',async()=>{
    reload.disabled=true;reload.textContent='更新を確認しています';
    try{const registration=await navigator.serviceWorker?.getRegistration();await registration?.update();}catch{}
    window.location.assign('./?app=v12');
  });
  if('serviceWorker' in navigator){
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      const code=document.getElementById('pairing-code');
      if(code?.value||document.getElementById('remote-code')?.value){if(reload)reload.textContent='新版があります。入力後に更新';return;}
      if(!window.__shunxControllerReloaded){window.__shunxControllerReloaded=true;window.location.reload();}
    });
    navigator.serviceWorker.getRegistration().then(registration=>registration?.update()).catch(()=>{});
  }
  const status=document.getElementById('enroll-status');
  if(!status)return;
  const report=()=>{
   if(window.__shunxEnrollmentBooted===true)return;
   status.textContent='通知画面のプログラムを読み込めません。アプリを一度終了して開き直してください。改善しない場合はSafariで最新版を開き、ホーム画面アプリを再起動してください。';
   const guidance=document.getElementById('enroll-guidance');
   if(guidance)guidance.textContent='通知登録 v12 が未起動です。秘密情報は入力しないでください。';
  };
  for(const id of ['push-prepare','push-enroll','push-repair','push-remove','push-remote-test','push-inspect','push-diagnose']){
   const b=document.getElementById(id);
   if(b)b.addEventListener('click',()=>{if((id==='push-remote-test'||id==='push-inspect'||id==='push-diagnose')&&window.__shunxEnrollmentBooted!==true){const field=document.getElementById(id==='push-diagnose'?'diagnose-status':id==='push-inspect'?'inspect-status':'remote-test-status');if(field)field.textContent='通知登録プログラムを読み込めません。接続テストは送信していません。最新版に更新してください。';}report();},true);
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
