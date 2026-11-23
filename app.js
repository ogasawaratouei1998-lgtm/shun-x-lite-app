import {filterSamples,canTest} from './model.js';
const $=id=>document.getElementById(id);
const isPublicPreview=!document.querySelector('script[src="./account.js"]');
function page(name){
 if(!['home','research','alerts','settings'].includes(name))return;
 for(const id of ['home','research','alerts','settings'])$(id).hidden=id!==name;
 for(const b of document.querySelectorAll('nav button')){
  if(b.dataset.page===name)b.setAttribute('aria-current','page');
  else b.removeAttribute('aria-current');
 }
 window.scrollTo?.({top:0,behavior:'instant'});
}
document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>page(b.dataset.page)));
document.querySelectorAll('[data-page-link]').forEach(b=>b.addEventListener('click',()=>page(b.dataset.pageLink)));
function sampleDetail(c){
 const box=$('details');box.replaceChildren();box.hidden=false;
 const h=document.createElement('h3');h.textContent=c.name+'（架空サンプル）';box.append(h);
 for(const [name,value] of [['株価',c.price+'円'],['PER参考値',c.per+'円'],['DCF参考値',c.dcf+'円'],['購入検討上限',c.limit+'円'],['100株概算',c.price*100+'円'],['本番判定','未実施']]){
  const row=document.createElement('div');row.className='metric';
  const label=document.createElement('span');label.textContent=name;
  const amount=document.createElement('b');amount.textContent=value;
  row.append(label,amount);box.append(row);
 }
 const warning=document.createElement('p');warning.textContent='公開プレビュー専用の架空データです。実際の投資判断には使えません。';box.append(warning);
}
function listSamples(){
 const box=$('companies');box.replaceChildren();$('details').hidden=true;
 for(const c of filterSamples($('query').value)){
  const item=document.createElement('button');item.type='button';item.className='company';
  const h=document.createElement('b');h.textContent=c.name;const s=document.createElement('span');s.textContent=c.code+' / 架空サンプル';
  item.append(h,s);item.addEventListener('click',()=>sampleDetail(c));box.append(item);
 }
 if(!box.children.length)box.textContent='該当する架空サンプルはありません。';
}
if(isPublicPreview){
 $('mode').textContent='PUBLIC DEMO';
 $('notice').textContent='公開プレビュー：本番の投資分析データは未接続です。端末登録・遠隔通知の診断は「設定」から利用できます。';
 $('hero-state').textContent='公開デモ';
 $('hero-message').textContent='本人専用の本番分析データはここには表示しません。';
 $('bottleneck').textContent='公開プレビューでは本番のボトルネックを表示しません。';
 $('companies').replaceChildren();
 $('query').addEventListener('input',listSamples);
 listSamples();
}else{
 $('companies').textContent='本人認証後に最新の評価記録を表示します。';
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
