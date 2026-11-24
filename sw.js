// Public SHUN-X Lite PWA: only a generic material-alert banner, never confidential research.
const CACHE='shunx-pages-preview-v18';
const SHELL=['./','./index.html','./style.css?v=18','./app.js?v=18','./boot.js?v=18','./local-pin.js?v=18','./model.js','./enrollment.js?v=18','./browser-registration.js?v=18','./manifest.webmanifest','./icon.svg','./icon-180.png'];
const APP_HOME='https://ogasawaratouei1998-lgtm.github.io/shun-x-lite-app/';
const MATERIAL_TAG='shunx-material-alert-v1';
const TEST_TAGS=new Set(['shunx-remote-connectivity-v2','shunx-remote-connectivity-v3']);

self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('shunx-pages-preview-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(event.request.method!=='GET'||u.origin!==self.location.origin||!SHELL.some(p=>new URL(p,self.registration.scope).href===u.href))return;event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));});

self.addEventListener('push',event=>{
 let p;try{p=event.data?.json();}catch{return;}
 const n=p?.notification;
 if(p?.web_push===8030&&n?.title==='SHUN-X Lite'&&n?.navigate===APP_HOME&&n?.silent===false){
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
  const url=new URL(material?'./#alerts':'./',self.registration.scope).href;
  const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const client=clients.find(c=>c.url.startsWith(self.registration.scope));
  if(client){
   if(material){
    // Prefer navigation so the installed app opens the alert section after PIN unlock.
    try{
     if(typeof client.navigate!=='function'||!await client.navigate(url)){
      if(typeof client.postMessage==='function')client.postMessage({type:'SHUNX_OPEN_ALERTS'});
     }
    }catch{if(typeof client.postMessage==='function')client.postMessage({type:'SHUNX_OPEN_ALERTS'});}
   }
   await client.focus();
   return;
  }
  await self.clients.openWindow(url);
 })());
});
