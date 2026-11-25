import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
const load=n=>readFileSync(new URL('../'+n,import.meta.url),'utf8');
test('graph preview is opt-in and live counts are unknown; identifiers are unique',()=>{
 const h=load('index.html'),a=load('app.js'),s=load('style.css');
 assert.match(h,/id="graph-demo" hidden/);assert.match(h,/架空のグラフ見本/);assert.match(h,/アプリ内の実データ表示は未接続/);
 for(const id of ['stat-leads','stat-evaluated','stat-buy','stat-alerts'])assert.match(h,new RegExp('id="'+id+'">—<'));
 const ids=[...h.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(ids).size,ids.length);
 for(const match of h.matchAll(/aria-(?:labelledby|controls)="([^"]+)"/g))for(const id of match[1].split(/\s+/))assert.ok(ids.includes(id),id);
 assert.match(a,/graphToggle\.addEventListener/);assert.match(s,/color-scheme:light/);
 assert.match(h,/日本株専用/);assert.doesNotMatch(h,/米国市場/);
});
test('versioned static shell supports offline reload but excludes API/version endpoint',async()=>{
 const handlers={},lookups=[],opened=[];const home='https://example.test/shun-x-lite-app/';
 const self={location:{origin:new URL(home).origin},registration:{scope:home},addEventListener:(k,f)=>handlers[k]=f};
 vm.runInNewContext(load('sw.js'),{self,URL,Set,Promise,Response,fetch:async()=>{throw Error('offline')},caches:{open:async key=>{opened.push(key);return {match:async x=>{lookups.push(x);return 'cached-shell'}}}}});
 const run=async(url,mode='navigate')=>{let p;handlers.fetch({request:{url,method:'GET',mode},respondWith:x=>p=x});return p?await p:undefined};
 assert.equal(await run(home+'?app=v22'),'cached-shell');assert.deepEqual(lookups,[home]);assert.deepEqual(opened,['shunx-pages-preview-v22']);
 assert.equal(await run(home+'version.json?check=1','cors'),undefined);assert.equal(await run(home+'api/private'),undefined);assert.equal(await run(home+'?secret=1'),undefined);
 assert.match(load('sw.js'),/model\.js\?v=22/);assert.match(load('app.js'),/model\.js\?v=22/);
});

test('live report links only to existing private GitHub access boundary, no browser secrets',()=>{const h=load('index.html');assert.match(h,/href="https:\/\/github\.com\/ogasawaratouei1998-lgtm\/shun-x-lite\/issues\/156" target="_blank" rel="noopener noreferrer"/);assert.match(h,/GitHub認証が必要/);assert.doesNotMatch(load('app.js'),/api\.github\.com|Authorization|localStorage/);});
