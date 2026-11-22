const CACHE='shunx-pages-preview-v1';
const SHELL=['./','./index.html','./style.css','./app.js','./model.js','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('shunx-pages-preview-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(event.request.method!=='GET'||u.origin!==self.location.origin||!SHELL.some(p=>new URL(p,self.registration.scope).href===u.href))return;event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));});

self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil((async()=>{const url=new URL('./',self.registration.scope).href;const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});const client=clients.find(c=>c.url.startsWith(self.registration.scope));if(client){await client.focus();return;}await self.clients.openWindow(url);})());});