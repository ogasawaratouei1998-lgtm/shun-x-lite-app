import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const ROOT='https://ogasawaratouei1998-lgtm.github.io/shun-x-lite-app/';
const worker=readFileSync(new URL('../sw.js',import.meta.url),'utf8');

function fixture({hasClient=true,canNavigate=true}={}){
 const handlers={},shown=[],windows=[],navigations=[],messages=[];
 let focuses=0;
 const client={
  url:ROOT+'?app=v19',
  async navigate(url){if(!canNavigate)throw Error('NAVIGATION_BLOCKED');navigations.push(url);return this;},
  async focus(){focuses++;return this;},
  postMessage(v){messages.push(v);}
 };
 const self={
  location:{origin:new URL(ROOT).origin},
  registration:{
   scope:ROOT,
   async showNotification(title,options){shown.push({title,options});}
  },
  clients:{
   async matchAll(){return hasClient?[client]:[];},
   async openWindow(url){windows.push(url);}
  },
  addEventListener(name,fn){handlers[name]=fn;},
  async skipWaiting(){}
 };
 vm.runInNewContext(worker,{self,caches:{},URL,Set,Promise,fetch(){}});
 async function push(payload){
  let pending;
  handlers.push({
   data:{json(){return payload;}},
   waitUntil(p){pending=p;}
  });
  if(pending)await pending;
 }
 async function click(notification){
  let pending;
  handlers.notificationclick({
   notification:{...notification,close(){}},
   waitUntil(p){pending=p;}
  });
  if(pending)await pending;
 }
 return {push,click,shown,windows,navigations,messages,focuses:()=>focuses};
}
const material=(patch={})=>({
 web_push:8030,
 notification:{
  title:'SHUN-X Lite',
  body:'Should not be rendered: 9434 BUY ¥199',
  navigate:ROOT,tag:'shunx-material-alert-v1',silent:false,
  ...patch
 }
});
const testPush=(tag)=>material({
 body:'遠隔通知の表示確認テストです。投資判断ではありません。',
 tag
});

test('material push shows private-safe fixed wording, not connectivity or ticker',async()=>{
 const f=fixture();
 await f.push(material());
 assert.equal(f.shown.length,1);
 assert.equal(f.shown[0].title,'SHUN-X Lite');
 assert.equal(f.shown[0].options.tag,'shunx-material-alert-v1');
 assert.equal(f.shown[0].options.data.path,'./#alerts');
 assert.match(f.shown[0].options.body,/重要な分析結果/);
 assert.doesNotMatch(f.shown[0].options.body,/9434|BUY|199|テスト|株価|¥/);
});

test('push click routes an installed app to alerts, even after new content',async()=>{
 const f=fixture();
 await f.push(material());
 await f.click({tag:'shunx-material-alert-v1',data:f.shown[0].options.data});
 assert.deepEqual(f.navigations,[ROOT+'#alerts']);
 assert.equal(f.focuses(),1);
 assert.deepEqual(f.windows,[]);
});

test('push click opens alert route when app has no existing window',async()=>{
 const f=fixture({hasClient:false});
 await f.click({tag:'shunx-material-alert-v1',data:{path:'./#alerts'}});
 assert.deepEqual(f.windows,[ROOT+'#alerts']);
});

test('blocked navigation sends only fixed local UI instruction',async()=>{
 const f=fixture({canNavigate:false});
 await f.click({tag:'shunx-material-alert-v1',data:{path:'./#alerts'}});
 assert.equal(f.messages.length,1);
 assert.equal(f.messages[0].type,'SHUNX_OPEN_ALERTS');
 assert.equal(f.focuses(),1);
});

test('connectivity tests retain test label and never become material',async()=>{
 for(const tag of ['shunx-remote-connectivity-v2','shunx-remote-connectivity-v3']){
  const f=fixture();
  await f.push(testPush(tag));
  assert.equal(f.shown.length,1);
  assert.equal(f.shown[0].options.tag,tag);
  assert.match(f.shown[0].options.body,/テスト|表示確認/);
  assert.equal(f.shown[0].options.data.kind,'CONNECTIVITY_TEST');
 }
});

test('unknown or mismatched push cannot be labeled material or test',async()=>{
 const f=fixture();
 for(const payload of [
  material({tag:'shunx-unknown-type'}),
  material({title:'INVESTMENT BUY'}),
  material({navigate:'https://example.com/'}),
  material({silent:true}),
  {kind:'BUY_CANDIDATE',schema:1},
  {web_push:8030,notification:{tag:'shunx-material-alert-v1'}},
 ]){
  await f.push(payload);
 }
 assert.equal(f.shown.length,0);
});

test('legacy connectivity event still shows explicit diagnostic only',async()=>{
 const f=fixture();
 await f.push({schema:1,kind:'REMOTE_CONNECTIVITY_TEST'});
 assert.equal(f.shown.length,1);
 assert.match(f.shown[0].options.body,/テスト/);
 assert.equal(f.shown[0].options.tag,'remote-connectivity-test');
});

test('app exposes alert-route handler but no public valuation API',()=>{
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.match(app,/openMaterialAlertSection/);
 assert.match(app,/hashchange/);
 assert.match(app,/SHUNX_OPEN_ALERTS/);
 assert.doesNotMatch(app,/fetch\('\/api\/research|service_role|SUPABASE_SERVICE_ROLE_KEY/);
});

test('approval notice uses distinct fixed text and only opens approval route',async()=>{const f=fixture();await f.push(material({tag:'shunx-improvement-approval-v1',body:'secret proposal'}));assert.equal(f.shown.length,1);assert.equal(f.shown[0].options.data.kind,'IMPROVEMENT_APPROVAL_REQUIRED');assert.doesNotMatch(f.shown[0].options.body,/secret proposal/);await f.click({tag:'shunx-improvement-approval-v1'});assert.deepEqual(f.navigations,[ROOT+'#approvals']);});
test('approval click navigation fallback never executes approval',async()=>{const f=fixture({canNavigate:false});await f.click({tag:'shunx-improvement-approval-v1'});assert.equal(f.messages[0].type,'SHUNX_OPEN_APPROVALS');});
