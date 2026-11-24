import {filterSamples,canTest} from './model.js';
const $=id=>document.getElementById(id);
const isPublicPreview=!document.querySelector('script[src="./account.js"]');
function page(name){
 if(!['home','research','operations','alerts','settings'].includes(name))return;
 for(const id of ['home','research','operations','alerts','settings'])$(id).hidden=id!==name;
 for(const b of document.querySelectorAll('nav button')){
  if(b.dataset.page===name)b.setAttribute('aria-current','page');
  else b.removeAttribute('aria-current');
 }
 window.scrollTo?.({top:0,behavior:'instant'});
}
document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>page(b.dataset.page)));
function operationTab(name){
 if(!['universe','pipeline','improve'].includes(name))return;
 for(const b of document.querySelectorAll('[data-op-tab]'))b.setAttribute('aria-pressed',String(b.dataset.opTab===name));
 for(const p of document.querySelectorAll('[data-op-panel]'))p.hidden=p.dataset.opPanel!==name;
}
document.querySelectorAll('[data-op-tab]').forEach(b=>b.addEventListener('click',()=>operationTab(b.dataset.opTab)));
document.querySelectorAll('[data-page-link]').forEach(b=>b.addEventListener('click',()=>{page(b.dataset.pageLink);if(b.dataset.operationTarget)operationTab(b.dataset.operationTarget);}));
function openMaterialAlertSection(){
 if(window.location?.hash!=='#alerts')return;
 page('alerts');
 // A public notification shell cannot reveal the owner's private valuations.
 if(isPublicPreview)$('alerts-summary').textContent='重要通知から開きました。この公開プレビューでは非公開の分析詳細を閲覧できません。認証済みの分析画面が必要です。';
}
window.addEventListener?.('hashchange',openMaterialAlertSection);
if('serviceWorker' in navigator){
 navigator.serviceWorker.addEventListener?.('message',event=>{
  if(event.data?.type==='SHUNX_OPEN_ALERTS'){
   page('alerts');
   if(isPublicPreview)$('alerts-summary').textContent='重要通知から開きました。非公開の分析詳細はこの公開プレビューに表示されません。';
  }
 });
}
openMaterialAlertSection();
function sampleDetail(c){
 const box=$('details');box.replaceChildren();box.hidden=false;
 const h=document.createElement('h3');h.textContent=c.name+'（架空サンプル）';box.append(h);
 for(const [name,value] of [['株価',c.price+'円'],['PER参考値',c.per+'円'],['DCF参考値',c.dcf+'円'],['購入検討上限',c.limit+'円'],['100株概算',c.price*100+'円'],['本番判定','未実施']]){
  const row=document.createElement('div');row.className='metric';
  const label=document.createElement('span');label.textContent=name;
  const amount=document.createElement('b');amount.textContent=value;
  row.append(label,amount);box.append(row);
 }
 const chart=document.createElement('section');chart.className='valuation-chart';
 const title=document.createElement('h4');title.textContent='価格と評価額の比較（架空）';chart.append(title);
 const max=Math.max(c.price,c.per,c.dcf,c.limit);
 for(const [name,value] of [['株価',c.price],['購入検討上限',c.limit],['PER参考値',c.per],['DCF参考値',c.dcf]]){
  const line=document.createElement('div');line.className='chart-line';
  const label=document.createElement('span');label.textContent=name+' '+value.toLocaleString('ja-JP')+'円';
  const bar=document.createElement('meter');bar.min=0;bar.max=max;bar.value=value;bar.setAttribute('aria-label',label.textContent);line.append(label,bar);chart.append(line);
 }
 box.append(chart);
 const close=document.createElement('button');close.type='button';close.textContent='詳細を閉じる';close.className='detail-close';close.addEventListener('click',()=>{box.hidden=true;$('query').focus();});box.append(close);
 const warning=document.createElement('p');warning.textContent='公開プレビュー専用の架空データです。実際の投資判断には使えません。';box.append(warning);
}
function listSamples(){
 const box=$('companies');box.replaceChildren();$('details').hidden=true;
 for(const c of filterSamples($('query').value)){
  const item=document.createElement('button');item.type='button';item.className='company';
  const h=document.createElement('b');h.textContent=c.name;const s=document.createElement('span');s.textContent=c.code+' / 架空サンプル';
  item.append(h,s);item.addEventListener('click',()=>{sampleDetail(c);$('details').scrollIntoView?.({block:'start'});});box.append(item);
 }
 if(!box.children.length)box.textContent='該当する架空サンプルはありません。';
}
if(isPublicPreview){
 $('mode').textContent='PUBLIC DEMO';
 $('notice').textContent='公開プレビュー：本番の投資分析データは未接続です。端末登録・遠隔通知の診断は「設定」から利用できます。';
 $('hero-state').textContent='リサーチ端末';
 $('hero-message').textContent='日次・週次の実行記録に接続できます。アプリ内の非公開データ表示は未接続です。';
 $('bottleneck').textContent='稼働・改善画面から、最新の実行結果と改善課題を確認してください。';
 $('companies').replaceChildren();
 $('query').addEventListener('input',listSamples);
 $('toggle-demo').addEventListener('click',()=>{
  const show=$('demo-research').hidden;
  $('demo-research').hidden=!show;
  $('toggle-demo').setAttribute('aria-expanded',String(show));
  $('toggle-demo').textContent=show?'架空サンプルを閉じる':'架空サンプルを表示（操作確認用）';
  if(show)listSamples();
 });
}else{
 $('companies').textContent='公開版は本番研究データに接続していません。';
}
let registration;
const supported=window.isSecureContext&&'serviceWorker' in navigator&&'Notification' in window;
function status(){
 $('push-status').textContent=!supported?'HTTPSのホーム画面アプリまたは対応ブラウザが必要です。'
 :!registration?'通知基盤の起動状態を確認中です。'
 :Notification.permission==='granted'?'この端末の通知は許可済みです。遠隔通知の状態は別途診断できます。'
 :Notification.permission==='denied'?'通知が拒否されています。端末設定をご確認ください。':'この端末では通知がまだ許可されていません。';
 $('enable').disabled=!supported||!registration||Notification.permission==='denied';
 $('test').disabled=!canTest(supported,Boolean(registration),supported?Notification.permission:'denied');
}
$('enable').addEventListener('click',async()=>{
 try{await Notification.requestPermission();window.dispatchEvent(new Event('shunx-notification-permission-changed'));}
 catch{$('notice').textContent='通知許可を取得できませんでした。';}
 status();
});
$('test').addEventListener('click',async()=>{
 try{
  if(!canTest(supported,Boolean(registration),Notification.permission))return;
  await registration.showNotification('SHUN-X',{body:'端末内テスト通知です。投資判断ではありません。',tag:'local-test',data:{path:'./'}});
  $('push-status').textContent='端末内テストを要求しました。表示は実機で確認してください。';
 }catch{$('push-status').textContent='端末内テストに失敗しました。';}
});
status();
if(supported){
 navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(r=>{registration=r;status();})
  .catch(()=>{$('push-status').textContent='Service Workerの起動に失敗しました。';});
}

window.__shunxAppBooted=true;
