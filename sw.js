const CACHE='shunx-pages-preview-v14';
const SHELL=['./','./index.html','./style.css?v=14','./app.js?v=14','./boot.js?v=14','./model.js','./enrollment.js?v=14','./browser-registration.js?v=14','./manifest.webmanifest','./icon.svg','./icon-180.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('shunx-pages-preview-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(event.request.method!=='GET'||u.origin!==self.location.origin||!SHELL.some(p=>new URL(p,self.registration.scope).href===u.href))return;event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));});

self.addEventListener('push',event=>{
 let p;try{p=event.data?.json();}catch{return;}
 const n=p?.notification;
 if(p?.web_push===8030&&n?.title==='SHUN-X Lite'&&n?.navigate==='https://ogasawaratouei1998-lgtm.github.io/shun-x-lite-app/'&&n?.silent===false){
  event.waitUntil(self.registration.showNotification('SHUN-X Lite',{body:n.tag==='shunx-remote-connectivity-v3'?'購読復旧後の遠隔通知表示確認です。投資判断ではありません。':'遠隔通知の表示確認テストです。投資判断ではありません。',tag:n.tag==='shunx-remote-connectivity-v3'?'shunx-remote-connectivity-v3':'shunx-remote-connectivity-v2',data:{path:'./'}}));return;
 }
 if(!p||p.schema!==1||p.kind!=='REMOTE_CONNECTIVITY_TEST')return;
 event.waitUntil(self.registration.showNotification('SHUN-X Lite',{body:'遠隔接続テスト通知です。投資判断ではありません。',tag:'remote-connectivity-test',data:{path:'./'}}));
});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil((async()=>{const url=new URL('./',self.registration.scope).href;const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});const client=clients.find(c=>c.url.startsWith(self.registration.scope));if(client){await client.focus();return;}await self.clients.openWindow(url);})());});