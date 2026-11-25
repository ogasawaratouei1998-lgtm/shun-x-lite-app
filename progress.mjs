// Only public-safe operational totals, fixed keys and fixed labels. No private data or credentials.
export const milestones=Object.freeze(['実データで自動調査','同一銘柄の財務・株価の独立検証','正式な企業価値評価（VALUED）','BUY判定の本番検証','iPhoneで実通知を確認','連続自動稼働の完走']);
const focusLabels=Object.freeze({eps_fcff:'EPS・FCFFの同一銘柄原本照合、正式評価への接続',valuation:'正式な企業価値評価の検証',buy:'BUY判定・安全条件の検証',delivery:'アプリへの通知・実機受信検証',stability:'連続自動稼働・再発防止',complete:'完成条件を確認済み'});
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
export function validateProgress(raw,now=Date.now()){
 if(!exact(raw,['schema','observed_at','counts','checks','focus'])||raw.schema!==1||!exact(raw.counts,['research','annual','valued','buy','delivery'])||!Array.isArray(raw.checks)||raw.checks.length!==6||!raw.checks.every(x=>typeof x==='boolean')||!Object.hasOwn(focusLabels,raw.focus))throw Error('INVALID_PROGRESS');
 const stamp=Date.parse(raw.observed_at);
 if(typeof raw.observed_at!=='string'||!Number.isFinite(stamp)||new Date(stamp).toISOString()!==raw.observed_at||stamp>now+60000)throw Error('INVALID_DATE');
 const c=raw.counts;
 if(!Object.values(c).every(n=>Number.isSafeInteger(n)&&n>=0&&n<=40)||c.annual>c.research||c.valued>c.research||c.buy>c.valued||c.delivery>c.buy)throw Error('INVALID_COUNT');
 if(raw.checks[2]&&c.valued===0||raw.checks[3]&&c.buy===0||raw.checks[4]&&c.delivery===0||raw.focus==='complete'&&!raw.checks.every(Boolean))throw Error('INVALID_PROOF');
 return {counts:c,checks:raw.checks,focus:focusLabels[raw.focus],stamp,stale:now-stamp>8*86400000};
}
export function requestUrl(input){
 const ticker=String(input).trim().toUpperCase();
 if(!/^[0-9][0-9A-Z][0-9][0-9A-Z]$/.test(ticker))throw Error('INVALID_TICKER');
 const url=new URL('https://github.com/ogasawaratouei1998-lgtm/shun-x-lite/issues/new');
 url.searchParams.set('title','[SHUNX-TICKER] '+ticker);
 url.searchParams.set('body','SHUNX_TICKER_REQUEST_V1\n ticker: '+ticker+'\n');
 return url.href;
}
export function mount(doc,win,fetcher=fetch){
 const $=id=>doc.getElementById(id);
 const status=$('progress-status'),list=$('live-progress'),checklist=$('completion-checklist'),meter=$('completion-meter'),summary=$('completion-summary'),current=$('improvement-current'),refresh=$('progress-refresh');
 if(!status||!list||!checklist||!meter||!summary||!current||!refresh)return;
 const node=(tag,cls,value)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n;};
 let busy=false,last=null;
 function paint(data,failed=false){
  list.replaceChildren();checklist.replaceChildren();
  if(!data){status.textContent='実行集計を取得できません。未取得は0件ではありません。';meter.removeAttribute('value');summary.textContent='検証状況：未取得';current.textContent='未取得';return;}
  const c=data.counts;
  status.textContent=(failed?'通信失敗・前回取得値 / ':data.stale?'古い実行記録 / ':'実行記録 / ')+new Date(data.stamp).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',hour12:false})+' JST';
  for(const [label,value] of [['調査対象',c.research],['3年分の財務資料取得',c.annual],['正式VALUED',c.valued],['BUY判定',c.buy],['実通知確認',c.delivery]]){
   const row=node('div','stage-meter-row'),head=node('div','stage-meter-label'),name=node('span','',label),number=node('b','',value+'件');
   head.append(name,number);row.append(head);
   if(c.research>0){const bar=node('meter','stage-meter');bar.min=0;bar.max=c.research;bar.value=value;bar.setAttribute('aria-label',label+' '+value+'/'+c.research);row.append(bar);}
   list.append(row);
  }
  const n=data.checks.filter(Boolean).length;meter.value=n;summary.textContent=n+' / 6 条件を検証済み'+(failed||data.stale?'（前回記録）':'');
  milestones.forEach((label,i)=>{const line=node('div','completion-row'),labelNode=node('span','',label),flag=node('b',data.checks[i]?'verified':'pending',data.checks[i]?'確認済み':'未確認');line.append(labelNode,flag);checklist.append(line);});current.textContent=data.focus;
 }
 async function load(){
  if(busy)return;busy=true;refresh.disabled=true;
  try{const r=await fetcher('./public-progress.json?check='+Date.now(),{cache:'no-store',credentials:'omit',redirect:'error',signal:typeof AbortSignal!=='undefined'&&AbortSignal.timeout?AbortSignal.timeout(10000):undefined});if(!r.ok)throw Error('HTTP');last=validateProgress(await r.json());paint(last);}
  catch{paint(last,true);}finally{busy=false;refresh.disabled=false;}
 }
 refresh.addEventListener('click',load);doc.addEventListener('visibilitychange',()=>{if(!doc.hidden)load();});win.setInterval(()=>{if(!doc.hidden)load();},300000);load();
 const ticker=$('ticker-request'),submit=$('ticker-submit'),message=$('ticker-status');
 submit.addEventListener('click',()=>{try{const url=requestUrl(ticker.value);message.textContent='GitHubの非公開依頼画面を開きます。作成を確定するまでは未受付です。';win.open(url,'_blank','noopener,noreferrer');}catch{message.textContent='有効な4桁の日本株証券コードを入力してください。';}});
}
if(typeof document!=='undefined')mount(document,window);
