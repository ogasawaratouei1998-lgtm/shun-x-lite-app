import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const load=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const script=load('enrollment.js');
const body=script.replace(/^import[^\n]*\n/,'');
const evaluate=new Function('document','navigator','window','Notification','prepare','register','unregister','secondDisplayTest','inspectRemote',body);
async function screen({standalone=true,permission='granted',health=true}={}){
 const ids=['push-prepare','push-enroll','push-remove','push-remote-test','push-inspect','push-diagnose','pairing-code','remote-code','enroll-status','enroll-guidance','remote-test-status','inspect-status','diagnose-status'];
 const elements=Object.fromEntries(ids.map(id=>[id,{id,value:'',textContent:'',disabled:false,callbacks:{},setAttribute(){},addEventListener(type,fn){this.callbacks[type]=fn;}}]));
 const document={getElementById:id=>elements[id]};
 const manager={subscribe:async()=>({}),getSubscription:async()=>({endpoint:'https://web.push.apple.com/synthetic'})};
 const reg={pushManager:manager,update:async()=>{},getNotifications:async()=>[]};
 const navigator={userAgent:'Mozilla iPhone',standalone,serviceWorker:{register:async()=>reg}};
 const Notification={permission};
 const window={isSecureContext:true,Notification,matchMedia:()=>({matches:standalone}),addEventListener(){}};
 let count=0,received=null,remote=0,inspections=0;
 evaluate(document,navigator,window,Notification,async()=>{if(!health)throw Error('ENROLLMENT_UNAVAILABLE');return new Uint8Array(65)},async args=>{count++;received=args;return {registered:true}},async()=>({localRevoked:true,serverConfirmed:true}),async({code})=>{remote++;assert.equal(code,'A'.repeat(43));return {accepted:true,deliveryConfirmed:false}},async({code,endpoint})=>{inspections++;assert.equal(code,'A'.repeat(43));assert.match(endpoint,/web.push.apple.com/);return {deviceRegistered:true,deviceMatches:true,tests:{first:'accepted',second:'not_attempted'},deliveryConfirmed:false};});
 await new Promise(r=>setImmediate(r));
 return {elements,window,getCount:()=>count,getReceived:()=>received,getRemote:()=>remote,getInspections:()=>inspections,click:async id=>elements[id].callbacks.click()};
}
test('notification controls are always interactive and report missing steps',async()=>{
 const v=await screen({permission:'default'});
 assert.equal(v.elements['push-enroll'].disabled,false);
 await v.click('push-enroll');
 assert.match(v.elements['enroll-status'].textContent,/通知の許可|登録できません/);
 assert.equal(v.getCount(),0);
});
test('iPhone Safari tab explains requirement instead of silent button',async()=>{
 const v=await screen({standalone:false});
 await v.click('push-enroll');
 assert.match(v.elements['enroll-status'].textContent,/ホーム画面に追加/);
 assert.equal(v.getCount(),0);
});
test('standalone granted app sends only explicitly entered pairing code',async()=>{
 const v=await screen();
 assert.equal(v.elements['push-prepare'].disabled,false);
 assert.equal(v.elements['pairing-code'].disabled,false);
 v.elements['pairing-code'].value='A'.repeat(43);
 v.elements['pairing-code'].callbacks.input();
 await v.click('push-enroll');
 assert.equal(v.getCount(),1);
 assert.equal(v.getReceived().code,'A'.repeat(43));
 assert.equal(v.elements['pairing-code'].value,'');
 assert.match(v.elements['enroll-status'].textContent,/登録に成功/);
});
test('server closed remains visible without submitting enrollment',async()=>{
 const v=await screen({health:false});
 assert.match(v.elements['enroll-status'].textContent,/登録を受け付けていません/);
 await v.click('push-enroll');
 assert.equal(v.getCount(),0);
});
test('public shell matches versioned script, cache and module and exposes no server secrets',()=>{
 const html=load('index.html'),sw=load('sw.js');
 assert.match(html,/boot\.js/);assert.match(html,/enrollment\.js\?v=10/);
 assert.match(sw,/shunx-pages-preview-v11/);
 assert.match(sw,/browser-registration\.js/);
 assert.match(sw,/boot\.js/);
 for(const t of [html,sw,script,load('boot.js')])assert.doesNotMatch(t,/SHUNX_PUSH_SEED|SUPABASE_SERVICE_ROLE_KEY|SHUNX_PUSH_DISPATCH/);
});

test('iPhone form labels and actions have explicit block layout and versioned assets',()=>{const css=load('style.css'),html=load('index.html'),sw=load('sw.js');assert.match(css,/#settings \.panel label\{display:block/);assert.match(css,/#settings \.panel button\{display:block;width:100%/);assert.match(html,/アプリ版：v11/);assert.match(html,/id="reload-app"/);assert.match(html,/id="enable"/);assert.match(sw,/self\.skipWaiting\(\)/);});

test('remote delivery is never triggered by startup or by merely registering',async()=>{const v=await screen();assert.equal(v.getRemote(),0);v.elements['pairing-code'].value='A'.repeat(43);await v.click('push-enroll');assert.equal(v.getRemote(),0);});
test('remote physical delivery test requires explicit button and pairing code',async()=>{const v=await screen();await v.click('push-remote-test');assert.equal(v.getRemote(),0);v.elements['remote-code'].value='A'.repeat(43);await v.click('push-remote-test');assert.equal(v.getRemote(),1);assert.match(v.elements['remote-test-status'].textContent,/iPhoneに届いたか/);assert.equal(v.elements['remote-code'].value,'');});
test('remote physical test refuses unapproved notification permission',async()=>{const v=await screen({permission:'default'});v.elements['remote-code'].value='A'.repeat(43);await v.click('push-remote-test');assert.equal(v.getRemote(),0);});

test('missing remote test code is reported adjacent to the button and never triggers dispatch',async()=>{const v=await screen();await v.click('push-remote-test');assert.equal(v.getRemote(),0);assert.match(v.elements['remote-test-status'].textContent,/43文字|まだ送信していません/);assert.doesNotMatch(v.elements['remote-test-status'].textContent,/送信を受理/);});
test('remote test reports iPhone non-standalone restriction in the nearby status',async()=>{const v=await screen({standalone:false});v.elements['remote-code'].value='A'.repeat(43);await v.click('push-remote-test');assert.equal(v.getRemote(),0);assert.match(v.elements['remote-test-status'].textContent,/ホーム画面/);});
test('remote test has independent dedicated input and always-on fallback',()=>{const h=load('index.html'),b=load('boot.js'),e=load('enrollment.js');assert.match(h,/id="remote-code"/);assert.match(h,/for="remote-code"/);assert.match(b,/push-remote-test/);assert.match(b,/remote-test-status/);assert.match(e,/remoteMessage\('ボタン操作を受け付けました/);});

test('local notification diagnostics never dispatch a remote message',async()=>{const v=await screen();await v.click('push-diagnose');assert.equal(v.getRemote(),0);assert.match(v.elements['diagnose-status'].textContent,/通知許可済み|遠隔送信なし/);});
test('declarative WebKit push has an explicit matching service worker display path',()=>{const sw=load('sw.js');assert.ok(sw.includes('p?.web_push===8030'));assert.match(sw,/shunx-remote-connectivity-v2/);assert.match(sw,/showNotification/);});
test('PWA frontend uses separate owner-initiated second display attempt',()=>{const adapter=load('browser-registration.js'),en=load('enrollment.js'),html=load('index.html');assert.match(adapter,/export async function secondDisplayTest/);assert.match(adapter,/testVersion:2/);assert.ok(en.includes('secondDisplayTest({code})'));assert.match(html,/id="push-diagnose"/);});


test('owner device inspection compares server registration without sending notification',async()=>{
 const v=await screen();
 await v.click('push-inspect');assert.equal(v.getInspections(),0);assert.match(v.elements['inspect-status'].textContent,/43文字/);
 v.elements['remote-code'].value='A'.repeat(43);
 await v.click('push-inspect');assert.equal(v.getInspections(),1);assert.equal(v.getRemote(),0);
 assert.match(v.elements['inspect-status'].textContent,/一致しています/);assert.match(v.elements['inspect-status'].textContent,/第2回：未送信/);
 assert.match(v.elements['inspect-status'].textContent,/遠隔送信なし/);
});
test('inspection control is included in startup fallback and versioned shell',()=>{const h=load('index.html'),s=load('sw.js'),b=load('boot.js');assert.match(h,/id="push-inspect"/);assert.match(h,/id="inspect-status"/);assert.match(b,/push-inspect/);assert.match(s,/shunx-pages-preview-v11/);});
