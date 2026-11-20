// A home-screen web app is resumed from memory, not reloaded, so it can sit on an old build for days.
// Each time it comes back to the front, compare the running bundle with the one index.html now points to.
const mine=(document.querySelector('script[type=module][src*="assets/"]') as HTMLScriptElement|null)?.src.split('/').pop();
let last=0;
async function check(){
 if(!mine||Date.now()-last<30000)return;last=Date.now();
 try{
  const html=await (await fetch('./index.html?t='+Date.now(),{cache:'no-store'})).text(),next=/assets\/(index-[\w-]+\.js)/.exec(html)?.[1];
  if(!next||next===mine)return;
  // Never reload under an open editor or sheet, and never twice for the same build.
  if(document.querySelector('.sheet,.editor,.decor')||sessionStorage.getItem('kiro-build')===next){last=0;return}
  sessionStorage.setItem('kiro-build',next);
  // A new query string gets past the cached copy of index.html.
  location.replace(location.pathname+'?v='+next.slice(6,14)+location.hash);
 }catch{}
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check()});
window.addEventListener('pageshow',check);
setTimeout(check,4000);
