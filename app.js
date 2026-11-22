import { samples, filterSamples, canTest } from './model.js';
const $=id=>document.getElementById(id);
function page(name){
  for(const id of ['home','research','alerts','settings']) $(id).hidden=id!==name;
  document.querySelectorAll('nav button').forEach(b=>{if(b.dataset.page===name)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
}
document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>page(b.dataset.page)));
function detail(c){
  const target=$('details');target.replaceChildren();target.hidden=false;
  const h=document.createElement('h3');h.textContent=c.name+'（模擬）';target.append(h);
  for(const [name,value] of [['株価',c.price+'円'],['PER参考評価',c.per+'円'],['DCF参考評価',c.dcf+'円'],['購入検討上限',c.limit+'円'],['100株概算',c.price*100+'円'],['本番判定','未実施'],['評価状態',c.status]]){
    const row=document.createElement('div');row.className='metric';const l=document.createElement('span');l.textContent=name;const v=document.createElement('b');v.textContent=value;row.append(l,v);target.append(row);
  }
  const p=document.createElement('p');p.textContent='これは架空の参考表示です。投資判断や実在企業の評価ではありません。';target.append(p);
}
function list(){
  $('companies').replaceChildren();$('details').hidden=true;
  for(const c of filterSamples($('query').value)){const b=document.createElement('button');b.className='company';const h=document.createElement('b');h.textContent=c.name;const s=document.createElement('span');s.textContent=c.code+' / '+c.status+' / 模擬';b.append(h,s);b.addEventListener('click',()=>detail(c));$('companies').append(b);}
  if(!$('companies').children.length)$('companies').textContent='該当するサンプルはありません。';
}
$('query').addEventListener('input',list);list();
let registration;
const supported=window.isSecureContext&&'serviceWorker' in navigator&&'Notification' in window;
function status(){
  $('push-status').textContent=!supported?'HTTPSまたは対応ブラウザが必要です。':!registration?'通知基盤を準備中、または未起動です。':Notification.permission==='granted'?'端末許可済み・遠隔登録の状態は上の欄をご確認ください':Notification.permission==='denied'?'拒否されています。端末設定をご確認ください。':'通知は未許可です。';
  $('enable').disabled=!supported||!registration||Notification.permission==='denied';
  $('test').disabled=!canTest(supported,Boolean(registration),supported?Notification.permission:'denied');
}
$('enable').addEventListener('click',async()=>{try{await Notification.requestPermission();window.dispatchEvent(new Event('shunx-notification-permission-changed'));}catch{ $('notice').textContent='通知許可の取得に失敗しました。'; }status();});
$('test').addEventListener('click',async()=>{try{if(!canTest(supported,Boolean(registration),Notification.permission))return;await registration.showNotification('SHUN-X Lite',{body:'端末内テスト通知です。本番の重要材料ではありません。',tag:'local-test',data:{path:'./'}});$('push-status').textContent='端末内テストを要求しました。実際の表示は端末で確認してください。';}catch{$('push-status').textContent='端末内テストに失敗しました。';}});
status();if(supported){navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(r=>{registration=r;status();}).catch(()=>{$('push-status').textContent='Service Workerを起動できません。';});}window.__shunxAppBooted=true;
