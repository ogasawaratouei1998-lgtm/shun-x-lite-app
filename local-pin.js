// SHUN-X local display lock only. No identity provider, server authentication,
// email, personal account, device registration or external PIN transmission.
// This lock is cosmetic privacy; public HTML and assets remain publicly accessible.
const KEY='shunx-local-screen-pin-v1';
const LOCK='shunx-local-screen-pin-attempts-v1';
const ITERATIONS=160000;
const MAX_FAILS=5;
const LOCK_MS=15*60*1000;
const $=id=>document.getElementById(id);
const pin=$('screen-pin'), confirmPin=$('screen-pin-confirm'), submit=$('screen-pin-submit');
const status=$('screen-pin-status'),subtitle=$('screen-pin-subtitle'),label=$('screen-pin-label');
const setup=$('screen-pin-setup'),reset=$('screen-pin-reset'),gate=$('app-lock');
const encoder=new TextEncoder();
const valid=v=>typeof v==='string'&&/^\d{4}$/.test(v);
const base64=b=>btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const bytes=t=>Uint8Array.from(atob(t.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-t.length%4)%4)),c=>c.charCodeAt(0));
const weak=new Set(['0000','1111','2222','3333','4444','5555','6666','7777','8888','9999','1234','4321','0123','9876','1212','2580']);
async function digest(code,salt){
 const material=await crypto.subtle.importKey('raw',encoder.encode(code),'PBKDF2',false,['deriveBits']);
 const derived=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:ITERATIONS,hash:'SHA-256'},material,256);
 return new Uint8Array(derived);
}
function matches(a,b){
 if(a.length!==b.length)return false;
 let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0;
}
function read(){
 try{
  const value=localStorage.getItem(KEY);if(!value)return null;
  const record=JSON.parse(value);
  if(record?.v!==1||typeof record.salt!=='string'||typeof record.hash!=='string')return null;
  if(bytes(record.salt).length!==16||bytes(record.hash).length!==32)return null;
  return record;
 }catch{return null;}
}
function attempts(){
 try{
  const a=JSON.parse(localStorage.getItem(LOCK)||'null');
  return Number.isSafeInteger(a?.count)&&Number.isSafeInteger(a?.until)?a:{count:0,until:0};
 }catch{return {count:0,until:0};}
}
function info(message,kind='info'){
 status.textContent=message;
 status.dataset.state=kind;
}
function mode(){
 const configured=Boolean(read());
 setup.hidden=configured;
 label.textContent=configured?'4桁のパスコード':'設定する4桁のパスコード';
 subtitle.textContent=configured?'このiPhone内だけでロックを解除します。':'初回のみ4桁コードを2回入力して設定します。';
 submit.textContent=configured?'ロック解除':'この端末に設定する';
 reset.hidden=!configured;
 pin.value='';confirmPin.value='';
 info(configured?'4桁の数字を入力してください。':'PINはこの端末にのみ保存し、外部へ送信しません。');
}
function lockOpen(){
 document.body.classList.add('pin-unlocked');
 gate.hidden=true;
 pin.value='';confirmPin.value='';
 window.dispatchEvent(new Event('shunx-local-screen-unlocked'));
}
async function handle(){
 const code=pin.value;
 if(!valid(code)){info('数字4桁を入力してください。','error');return;}
 if(!window.isSecureContext||!crypto.subtle){info('安全なブラウザ環境が必要です。','error');return;}
 const record=read();
 submit.disabled=true;
 try{
  if(!record){
   if(code!==confirmPin.value){info('確認用コードが一致しません。','error');return;}
   if(weak.has(code)){info('1234や0000など推測しやすいコードは使用できません。','error');return;}
   const salt=crypto.getRandomValues(new Uint8Array(16));
   const hash=await digest(code,salt);
   localStorage.setItem(KEY,JSON.stringify({v:1,salt:base64(salt),hash:base64(hash)}));
   localStorage.removeItem(LOCK);
   lockOpen();return;
  }
  const current=attempts();
  if(current.until>Date.now()){
   info('連続入力が上限に達しました。15分後に再入力してください。','error');return;
  }
  const computed=await digest(code,bytes(record.salt));
  if(matches(computed,bytes(record.hash))){
   localStorage.removeItem(LOCK);lockOpen();return;
  }
  const count=current.count+1;
  const until=count>=MAX_FAILS?Date.now()+LOCK_MS:0;
  localStorage.setItem(LOCK,JSON.stringify({count,until}));
  info(until?'入力上限に達しました。15分後に再入力できます。': 'コードが違います。残り'+(MAX_FAILS-count)+'回。','error');
 }catch{
  info('端末内ロックを保存・確認できません。Safariの保存設定をご確認ください。','error');
 }finally{
  pin.value='';confirmPin.value='';
  submit.disabled=false;
 }
}
submit.addEventListener('click',handle);
for(const input of [pin,confirmPin]){
 input.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();handle();}});
}
reset.addEventListener('click',()=>{
 if(!window.confirm('この端末の画面ロック設定だけをリセットします。通知購読は変更しません。続けますか？'))return;
 try{
  localStorage.removeItem(KEY);
  localStorage.removeItem(LOCK);
  mode();
 }catch{info('ロック設定をリセットできません。','error');}
});
mode();
