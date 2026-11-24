import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const load=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

async function screen({server=17,code='',failFetch=false,failWorker=false}={}){
 const events={},requests=[],navigation=[];
 const elements={
  'reload-app':{disabled:false,textContent:'',callbacks:{},addEventListener(type,fn){this.callbacks[type]=fn;}},
  'update-status':{dataset:{},textContent:''},
  'app-version':{textContent:''},
  'pairing-code':{value:code},
  'remote-code':{value:''}
 };
 let workerUpdates=0;
 const registration={update:async()=>{workerUpdates++;if(failWorker)throw Error('SW_UPDATE_FAILED');}};
 const worker={getRegistration:async()=>registration,addEventListener:(name,fn)=>{events[name]=fn;}};
 const document={readyState:'complete',getElementById:id=>elements[id]||null,querySelectorAll:()=>[]};
 const window={location:{href:'https://example.test/shun-x-lite-app/',assign:dest=>navigation.push(dest)}};
 const fetcher=async(url,options)=>{
  requests.push({url,options});
  if(failFetch)throw Error('OFFLINE');
  return {ok:true,json:async()=>({app:'shun-x-lite-app',version:server})};
 };
 vm.runInNewContext(load('boot.js'),{document,window,navigator:{serviceWorker:worker},fetch:fetcher,Date,URL,Number,setTimeout:()=>0});
 await new Promise(resolve=>setImmediate(resolve));
 return {elements,requests,navigation,events,workerUpdates:()=>workerUpdates,
  tap:async()=>elements['reload-app'].callbacks.click()};
}
test('startup checks current version online, no automatic reload or push changes',async()=>{
 const s=await screen();
 assert.equal(s.elements['app-version'].textContent,'アプリ版：v17');
 assert.match(s.elements['update-status'].textContent,/最新版です/);
 assert.equal(s.elements['update-status'].dataset.state,'current');
 assert.equal(s.workerUpdates(),0);assert.deepEqual(s.navigation,[]);
 assert.equal(s.requests.length,1);
 assert.match(s.requests[0].url,/version\.json\?check=/);
 assert.equal(s.requests[0].options.cache,'no-store');
 assert.equal(s.requests[0].options.credentials,'omit');
});
test('new server version displays update and installs only on explicit tap',async()=>{
 const s=await screen({server:18});
 assert.match(s.elements['update-status'].textContent,/新しいv18/);
 assert.equal(s.elements['update-status'].dataset.state,'available');
 assert.equal(s.workerUpdates(),0);assert.deepEqual(s.navigation,[]);
 await s.tap();
 assert.equal(s.workerUpdates(),1);assert.deepEqual(s.navigation,['./?app=v18']);
});
test('active pairing code defers updating without losing registration state',async()=>{
 const s=await screen({server:18,code:'A'.repeat(43)});
 await s.tap();
 assert.equal(s.workerUpdates(),0);assert.deepEqual(s.navigation,[]);
 assert.match(s.elements['update-status'].textContent,/登録コードが入力中/);
});
test('network outage shows error rather than claiming newest',async()=>{
 const s=await screen({failFetch:true});
 assert.equal(s.elements['update-status'].dataset.state,'error');
 assert.match(s.elements['update-status'].textContent,/更新確認に失敗/);
 assert.deepEqual(s.navigation,[]);
});
test('stale server version is not mislabeled as newest',async()=>{
 const s=await screen({server:13});
 assert.equal(s.elements['update-status'].dataset.state,'error');
 assert.match(s.elements['update-status'].textContent,/判定できません/);
});
test('failed worker update does not navigate or report success',async()=>{
 const s=await screen({server:18,failWorker:true});
 await s.tap();
 assert.equal(s.workerUpdates(),1);
 assert.equal(s.elements['update-status'].dataset.state,'error');
 assert.deepEqual(s.navigation,[]);
});
test('remote push receiver, install scope, CSP and uncached version endpoint are preserved',()=>{
 const html=load('index.html'),sw=load('sw.js'),metadata=JSON.parse(load('version.json'));
 const manifest=JSON.parse(load('manifest.webmanifest'));
 assert.deepEqual(metadata,{app:'shun-x-lite-app',version:17});
 assert.match(html,/id="update-status"/);
 assert.match(html,/connect-src 'self' https:\/\/kdvkbkdfnrwvrbugpnaq\.supabase\.co\/functions\/v1\/shunx-push\//);
 assert.match(html,/enrollment\.js\?v=16/);
 assert.match(sw,/shunx-pages-preview-v17/);
 assert.doesNotMatch(sw,/SHELL=\[[^\]]*version\.json/);
 assert.match(sw,/web_push===8030/);assert.match(sw,/REMOTE_CONNECTIVITY_TEST/);
 assert.equal(manifest.id,'./');assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');
});
