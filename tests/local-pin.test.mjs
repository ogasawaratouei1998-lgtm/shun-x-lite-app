import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
async function mount(storage=new Map()){
 const elements=new Map(),events={},bodyClasses=new Set(),transmissions=[];
 const get=id=>{
  if(!elements.has(id))elements.set(id,{
   value:'',hidden:false,disabled:false,textContent:'',dataset:{},events:{},
   addEventListener(name,fn){this.events[name]=fn;}
  });return elements.get(id);
 };
 const storageAPI={
  getItem:k=>storage.has(k)?storage.get(k):null,
  setItem:(k,v)=>storage.set(k,v),
  removeItem:k=>storage.delete(k)
 };
 const window={isSecureContext:true,confirm:()=>true,dispatchEvent:x=>events[x.type]=true};
 const document={getElementById:get,body:{classList:{add:x=>bodyClasses.add(x)}}};
 const ctx={window,document,crypto:webcrypto,localStorage:storageAPI,TextEncoder,Uint8Array,
  btoa,atob,Date,Event:class{constructor(type){this.type=type;}},fetch:()=>{transmissions.push(true);throw Error('no network allowed');}};
 vm.runInNewContext(read('local-pin.js'),ctx);
 const tap=async id=>get(id).events.click();
 return {get,tap,storage,bodyClasses,events,transmissions};
}
test('first use sets 4 digit local PIN, stores only salt + PBKDF2 hash',async()=>{
 const x=await mount();
 assert.equal(x.get('screen-pin-setup').hidden,false);
 x.get('screen-pin').value='4837';x.get('screen-pin-confirm').value='4837';
 await x.tap('screen-pin-submit');
 assert.equal(x.get('app-lock').hidden,true);
 assert.ok(x.bodyClasses.has('pin-unlocked'));
 assert.deepEqual(x.transmissions,[]);
 const raw=[...x.storage.values()].join(' ');
 assert.doesNotMatch(raw,/4837|owner@example|access_token|refresh_token/);
 const parsed=JSON.parse([...x.storage.values()][0]);
 assert.equal(parsed.v,1);assert.equal(parsed.hash.length,43);assert.equal(parsed.salt.length,22);
});
test('reload remains locked until same PIN provided, mismatch fails',async()=>{
 const storage=new Map(),a=await mount(storage);
 a.get('screen-pin').value='4837';a.get('screen-pin-confirm').value='4837';await a.tap('screen-pin-submit');
 const b=await mount(storage);
 assert.equal(b.get('screen-pin-setup').hidden,true);
 b.get('screen-pin').value='5894';await b.tap('screen-pin-submit');
 assert.equal(b.get('app-lock').hidden,false);
 assert.match(b.get('screen-pin-status').textContent,/コードが違います/);
 b.get('screen-pin').value='4837';await b.tap('screen-pin-submit');
 assert.equal(b.get('app-lock').hidden,true);
});
test('five failed attempts lock the local UI without network',async()=>{
 const storage=new Map(),a=await mount(storage);
 a.get('screen-pin').value='4837';a.get('screen-pin-confirm').value='4837';await a.tap('screen-pin-submit');
 const b=await mount(storage);
 for(let i=0;i<5;i++){b.get('screen-pin').value='5894';await b.tap('screen-pin-submit');}
 assert.match(b.get('screen-pin-status').textContent,/入力上限/);
 b.get('screen-pin').value='4837';await b.tap('screen-pin-submit');
 assert.equal(b.get('app-lock').hidden,false);
 assert.match(b.get('screen-pin-status').textContent,/15分後/);
 assert.equal(b.transmissions.length,0);
});
test('local reset removes only lock state and cannot unsubscribe notifications',async()=>{
 const storage=new Map(),a=await mount(storage);
 a.get('screen-pin').value='4837';a.get('screen-pin-confirm').value='4837';await a.tap('screen-pin-submit');
 const b=await mount(storage);
 storage.set('unrelated-push-marker','do-not-remove');
 await b.tap('screen-pin-reset');
 assert.equal(storage.get('unrelated-push-marker'),'do-not-remove');
 assert.equal(b.get('screen-pin-setup').hidden,false);
 assert.equal(b.transmissions.length,0);
});
test('no network or identity provider exists in lock and email form removed',()=>{
 const code=read('local-pin.js'),html=read('index.html'),sw=read('sw.js');
 assert.doesNotMatch(code,/\/auth\/|OTP|supabase|send-code|fetch\(|https?:\/\//i);
 assert.doesNotMatch(html,/id="email"|id="otp"|id="login-form"/);
 assert.match(html,/id="screen-pin"/);assert.match(html,/local-pin\.js\?v=22/);
 assert.match(sw,/local-pin\.js\?v=22/);
 assert.match(sw,/web_push===8030/);
});
