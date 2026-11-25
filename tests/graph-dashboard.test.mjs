import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';import {validateProgress,requestUrl} from '../progress.mjs';
const load=n=>readFileSync(new URL('../'+n,import.meta.url),'utf8');
const data=()=>JSON.parse(load('public-progress.json'));
test('three main features, unique IDs, no synthetic chart or private data',()=>{
 const h=load('index.html'),s=load('style.css');
 for(const id of ['live-progress','ticker-request','ticker-submit','completion-meter','improvement-current','progress-status'])assert.ok(h.includes('id="'+id+'"'));
 assert.doesNotMatch(h,/id="graph-demo"/);
 const ids=[...h.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(ids).size,ids.length);
 for(const match of h.matchAll(/aria-(?:labelledby|controls)="([^"]+)"/g))for(const id of match[1].split(/\s+/))assert.ok(ids.includes(id),id);
 assert.match(s,/color-scheme:light/);assert.match(h,/日本株専用/);assert.doesNotMatch(h,/米国市場/);
});
test('real aggregate schema rejects extra data, fabricated stages and future times',()=>{
 const d=data(),now=Date.parse(d.observed_at);
 assert.equal(validateProgress(d,now).counts.annual,d.counts.annual);
 assert.equal(validateProgress(d,now+9*86400000).stale,true);
 for(const v of [{...d,secret:'x'},{...d,counts:{...d.counts,ticker:'x'}},{...d,counts:{...d.counts,annual:41}},{...d,counts:{...d.counts,buy:1,valued:0}},{...d,checks:[true,true,true,true,true,true],counts:{...d.counts,valued:0}},{...d,focus:'unknown'}])assert.throws(()=>validateProgress(v,now));
 assert.throws(()=>validateProgress(d,now-86400000));
});
test('only a valid Japanese code becomes an explicit private issue draft',()=>{
 for(const code of ['7203','100a']){const u=new URL(requestUrl(code));assert.equal(u.origin,'https://github.com');assert.equal(u.pathname,'/ogasawaratouei1998-lgtm/shun-x-lite/issues/new');assert.equal(u.searchParams.get('title'),'[SHUNX-TICKER] '+code.toUpperCase());assert.equal(u.searchParams.get('body'),'SHUNX_TICKER_REQUEST_V1\n ticker: '+code.toUpperCase()+'\n');}
 for(const code of ['AAPL','72030','12&3','7203\nX',''])assert.throws(()=>requestUrl(code));
});
test('offline shell excludes the live aggregate, version and private API',async()=>{
 const handlers={},lookups=[],opened=[];const home='https://example.test/shun-x-lite-app/';
 const self={location:{origin:new URL(home).origin},registration:{scope:home},addEventListener:(k,f)=>handlers[k]=f};
 vm.runInNewContext(load('sw.js'),{self,URL,Set,Promise,Response,fetch:async()=>{throw Error('offline')},caches:{open:async key=>{opened.push(key);return {match:async x=>{lookups.push(x);return 'cached-shell'}}}}});
 const run=async(url,mode='navigate')=>{let p;handlers.fetch({request:{url,method:'GET',mode},respondWith:x=>p=x});return p?await p:undefined};
 assert.equal(await run(home+'?app=v23'),'cached-shell');assert.deepEqual(lookups,[home]);assert.deepEqual(opened,['shunx-pages-preview-v23']);
 for(const path of ['version.json?check=1','public-progress.json?check=1','api/private','?secret=1'])assert.equal(await run(home+path,'cors'),undefined);
 assert.match(load('sw.js'),/progress\.mjs\?v=23/);assert.match(load('app.js'),/model\.js\?v=23/);
});
