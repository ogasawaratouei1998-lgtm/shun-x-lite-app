// Standalone classic-script fallback: controls must explain failures even if modules fail to load.
(function(){
 function start(){
  const status=document.getElementById('enroll-status');
  if(!status)return;
  const report=()=>{
   if(window.__shunxEnrollmentBooted===true)return;
   status.textContent='通知画面のプログラムを読み込めません。アプリを一度終了して開き直してください。改善しない場合はSafariで最新版を開き、ホーム画面アプリを再起動してください。';
   const guidance=document.getElementById('enroll-guidance');
   if(guidance)guidance.textContent='通知登録 v6 が未起動です。秘密情報は入力しないでください。';
  };
  for(const id of ['push-prepare','push-enroll','push-remove']){
   const b=document.getElementById(id);
   if(b)b.addEventListener('click',report,true);
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
