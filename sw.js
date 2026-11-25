// Public SHUN-X Lite PWA: only a generic material-alert banner, never confidential research.
const CACHE='shunx-pages-preview-v22';
const SHELL=['./','./index.html','./style.css?v=22','./app.js?v=22','./boot.js?v=22','./local-pin.js?v=22','./model.js?v=22','./enrollment.js?v=22','./browser-registration.js?v=22','./manifest.webmanifest','./icon.svg','./icon-180.png'];
const APP_HOME='https://ogasawaratouei1998-lgtm.github.io/shun-x-lite-app/';
const MATERIAL_TAG='shunx-material-alert-v1';
const APPROVAL_TAG='shunx-improvement-approval-v1';
const TEST_TAGS=new Set(['shunx-remote-connectivity-v2','shunx-remote-connectivity-v3']);

self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('shunx-pages-preview-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const u=new URL(event.request.url),home=new URL('./',self.registration.scope);
 if(event.request.method!=='GET'||u.origin!==home.origin)return;
 const appReload=event.request.mode==='navigate'&&u.pathname===home.pathname&&/^\?app=v[0-9]{1,4}$/.test(u.search);
 const shell=SHELL.some(p=>new URL(p,self.registration.scope).href===u.href);
 if(!appReload&&!shell)return;
 // Cache only the reviewed static shell. An update URL can fall back to
 // the installed index when offline; never cache private or API responses.
 const fallback=appReload?home.href:event.request;
 event.respondWith(fetch(event.request).catch(async()=>{
  const cache=await caches.open(CACHE);
  return (await cache.match(fallback))||Response.error();
 }));
});

self.addEventListener('push',event=>{
 let p;try{p=event.data?.json();}catch{return;}
 const n=p?.notification;
 if(p?.web_push===8030&&n?.title==='SHUN-X Lite'&&n?.navigate===APP_HOME&&n?.silent===false){
  if(n.tag===APPROVAL_TAG){
   event.waitUntil(self.registration.showNotification('SHUN-X Lite',{
    body:'確認が必要な改善案があります。アプリで内容をご確認ください。',
    tag:APPROVAL_TAG,renotify:false,data:{path:'./#approvals',kind:'IMPROVEMENT_APPROVAL_REQUIRED'}
   }));
   return;
  }
  if(n.tag===MATERIAL_TAG){
   // Do NOT render push-supplied text, ticker or valuations on an unlocked screen.
   event.waitUntil(self.registration.showNotification('SHUN-X Lite',{
    body:'重要な分析結果が更新されました。内容の確認には認証済みの分析画面が必要です。',
    tag:MATERIAL_TAG,renotify:false,
    data:{path:'./#alerts',kind:'MATERIAL_UPDATE'}
   }));
   return;
  }
  if(TEST_TAGS.has(n.tag)){
   const third=n.tag==='shunx-remote-connectivity-v3';
   event.waitUntil(self.registration.showNotification('SHUN-X Lite',{
    body:third?'購読復旧後の遠隔通知表示確認です。投資判断ではありません。':'遠隔通知の表示確認テストです。投資判断ではありません。',
    tag:third?'shunx-remote-connectivity-v3':'shunx-remote-connectivity-v2',
    data:{path:'./',kind:'CONNECTIVITY_TEST'}
   }));
   return;
  }
  // Unknown remote push kinds/tags are not silently relabeled as test or BUY.
  return;
 }
 if(!p||p.schema!==1||p.kind!=='REMOTE_CONNECTIVITY_TEST')return;
 event.waitUntil(self.registration.showNotification('SHUN-X Lite',{
  body:'遠隔接続テスト通知です。投資判断ではありません。',
  tag:'remote-connectivity-test',data:{path:'./',kind:'CONNECTIVITY_TEST'}
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil((async()=>{
  // WebKit declarative notifications may omit custom data on click.
  const material=event.notification.tag===MATERIAL_TAG;
  const approval=event.notification.tag===APPROVAL_TAG;
  const url=new URL(approval?'./#approvals':material?'./#alerts':'./',self.registration.scope).href;
  const instruction=approval?'SHUNX_OPEN_APPROVALS':'SHUNX_OPEN_ALERTS';
  const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const client=clients.find(c=>c.url.startsWith(self.registration.scope));
  if(client){
   if(material||approval){
    // Prefer navigation so the installed app opens the alert section after PIN unlock.
    try{
     if(typeof client.navigate!=='function'||!await client.navigate(url)){
      if(typeof client.postMessage==='function')client.postMessage({type:instruction});
     }
    }catch{if(typeof client.postMessage==='function')client.postMessage({type:instruction});}
   }
   await client.focus();
   return;
  }
  await self.clients.openWindow(url);
 })());
});
