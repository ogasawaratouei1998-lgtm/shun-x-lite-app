import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const load=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const script=load('enrollment.js');
const body=script.replace(/^import[^\n]*\n/,'');
const evaluate=new Function('document','navigator','window','Notification','prepare','register','unregister',body);
async function screen({standalone=true,permission='granted',health=true}={}){
 const ids=['push-prepare','push-enroll','push-remove','pairing-code','enroll-status','enroll-guidance'];
 const elements=Object.fromEntries(ids.map(id=>[id,{id,value:'',textContent:'',disabled:false,callbacks:{},addEventListener(type,fn){this.callbacks[type]=fn;}}]));
 const document={getElementById:id=>elements[id]};
 const manager={subscribe:async()=>({})};
 const reg={pushManager:manager,update:async()=>{}};
 const navigator={userAgent:'Mozilla iPhone',standalone,serviceWorker:{register:async()=>reg}};
 const Notification={permission};
 const window={isSecureContext:true,Notification,matchMedia:()=>({matches:standalone}),addEventListener(){}};
 let count=0,received=null;
 evaluate(document,navigator,window,Notification,async()=>{if(!health)throw Error('ENROLLMENT_UNAVAILABLE');return new Uint8Array(65)},async args=>{count++;received=args;return {registered:true}},async()=>({localRevoked:true,serverConfirmed:true}));
 await new Promise(r=>setImmediate(r));
 return {elements,window,getCount:()=>count,getReceived:()=>received,click:async id=>elements[id].callbacks.click()};
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
 assert.match(html,/boot\.js/);assert.match(html,/enrollment\.js\?v=6/);
 assert.match(sw,/shunx-pages-preview-v6/);
 assert.match(sw,/browser-registration\.js/);
 assert.match(sw,/boot\.js/);
 for(const t of [html,sw,script,load('boot.js')])assert.doesNotMatch(t,/SHUNX_PUSH_SEED|SUPABASE_SERVICE_ROLE_KEY|SHUNX_PUSH_DISPATCH/);
});
