import {useEffect,useRef,useState,type CSSProperties,type PointerEvent as RPE} from 'react';
import {Sun,Moon,ChevronLeft,Cloud,CloudOff,Loader2,Download,Upload,Trash2,RotateCcw,ImagePlus,Check,Sparkles,Wallpaper,UserRound,TriangleAlert} from 'lucide-react';
import {useStore,setHome,setSettings,saveAsset,prepareImage,connect,disconnect,getRemote,syncNow,exportBackup,importBackup,restoreRecord,purgeRecord,uid,type Kind,type Sticker} from './store';
import {kinds,appOrder} from './kinds';
import Trace from './trace';
import {stickers as art,appIcons} from './art';
import Screen,{Avatar} from './screens';
import {Img,Toasts,toast,useAsset} from './ui';

const BUILD=(document.querySelector('script[type=module][src*="assets/"]') as HTMLScriptElement|null)?.src.split('/').pop()?.slice(6,14)||'本地';
type Route=Kind|'settings'|'trace'|'home';
const routeOf=():Route=>{const h=location.hash.replace(/^#\/?/,'');return ([...appOrder,'settings','trace'] as string[]).includes(h)?h as Route:'home'};
const pad=(n:number)=>String(n).padStart(2,'0');

export default function App(){
 const {state,ready,sync}=useStore(),[route,setRoute]=useState<Route>(routeOf),[decor,setDecor]=useState(false),[now,setNow]=useState(()=>new Date());
 useEffect(()=>{const on=()=>setRoute(routeOf());window.addEventListener('hashchange',on);return()=>window.removeEventListener('hashchange',on)},[]);
 useEffect(()=>{const t=setInterval(()=>setNow(new Date()),20000);return()=>clearInterval(t)},[]);
 useEffect(()=>{document.documentElement.dataset.theme=state.settings.theme;document.querySelector('meta[name=theme-color]')?.setAttribute('content',state.settings.theme==='night'?'#0f1424':'#ffd66b')},[state.settings.theme]);
 const open=(r:Route,from?:HTMLElement)=>{const root=document.documentElement,dev=document.querySelector('.device')?.getBoundingClientRect();if(from&&dev){const b=from.getBoundingClientRect();root.style.setProperty('--ox',((b.left+b.width/2-dev.left)/dev.width*100).toFixed(1)+'%');root.style.setProperty('--oy',((b.top+b.height/2-dev.top)/dev.height*100).toFixed(1)+'%')}location.hash=r==='home'?'':'/'+r};
 const home=()=>open('home');
 if(!ready)return <div className="stage"><div className="device booting"><Loader2 className="spin" size={26}/></div></div>;
 return <div className={`stage ${route==='home'?'at-home':'in-app'}`}>
  <div className="device">
   {route==='home'?<HomeScreen now={now} decor={decor} setDecor={setDecor} open={open} syncState={sync.state}/>
   :route==='settings'?<Settings onBack={home} decorate={()=>{setDecor(true);home()}}/>
   :route==='trace'?<Trace onBack={home}/>
   :<Screen key={route} kind={route} onBack={home}/>}
  </div>
  <Toasts/>
 </div>}

// ── the home screen: only looks, plus the way in ──
function HomeScreen({now,decor,setDecor,open,syncState}:{now:Date;decor:boolean;setDecor:(v:boolean)=>void;open:(r:Route,from?:HTMLElement)=>void;syncState:string}){
 const {state}=useStore(),h=state.home,wall=useAsset(h.wallpaper),night=state.settings.theme==='night';
 const [sel,setSel]=useState<string|null>(null),board=useRef<HTMLDivElement>(null),hold=useRef<{id:string;dx:number;dy:number}|null>(null);
 const patch=(id:string,p:Partial<Sticker>)=>setHome({stickers:h.stickers.map(s=>s.id===id?{...s,...p}:s)});
 const down=(e:RPE,s:Sticker)=>{if(!decor)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);const b=board.current!.getBoundingClientRect();hold.current={id:s.id,dx:e.clientX-(b.left+b.width*s.x/100),dy:e.clientY-(b.top+b.height*s.y/100)};setSel(s.id)};
 const move=(e:RPE)=>{const g=hold.current;if(!g)return;const b=board.current!.getBoundingClientRect();patch(g.id,{x:Math.max(2,Math.min(98,(e.clientX-g.dx-b.left)/b.width*100)),y:Math.max(2,Math.min(98,(e.clientY-g.dy-b.top)/b.height*100))})};
 const chosen=h.stickers.find(s=>s.id===sel);
 const days=['日','一','二','三','四','五','六'];
 return <div className={`home ${decor?'decorating':''}`} style={wall?{backgroundImage:`url(${wall})`} as CSSProperties:undefined} data-wall={wall?'own':'default'}>
  {!wall&&<div className="sky" aria-hidden="true"><i/><i/><i/></div>}
  <div className="board" ref={board}>{h.stickers.map((s,i)=><div key={s.id} className={`sticker ${sel===s.id&&decor?'picked':''}`} style={{left:s.x+'%',top:s.y+'%',width:s.size,rotate:s.rot+'deg','--i':i} as CSSProperties} onPointerDown={e=>down(e,s)} onPointerMove={move} onPointerUp={()=>{hold.current=null}} onPointerCancel={()=>{hold.current=null}}>{s.asset?<Img id={s.asset}/>:art[s.art]?.art}</div>)}</div>
  <div className="statusbar"><span>{pad(now.getHours())}:{pad(now.getMinutes())}</span><span className="island" aria-hidden="true"/><span className="status-right">{syncState==='syncing'?<Loader2 size={13} className="spin"/>:syncState==='local'?<CloudOff size={13}/>:syncState==='error'?<TriangleAlert size={13}/>:<Cloud size={13}/>}
   <button onClick={()=>setSettings({theme:night?'day':'night'})} aria-label={night?'切到白天':'切到夜里'} title={night?'切到白天':'切到夜里'}>{night?<Moon size={15}/>:<Sun size={15}/>}</button></span></div>
  {decor?<Decorator chosen={chosen} patch={patch} done={()=>{setDecor(false);setSel(null)}} clearSel={()=>setSel(null)}/>
  :<>
   <div className="clock" aria-hidden="true"><b>{pad(now.getHours())}<i>:</i>{pad(now.getMinutes())}</b><span>{now.getMonth()+1}月{now.getDate()}日 星期{days[now.getDay()]}</span></div>
   <div className="namecard"><Avatar id={h.avatar}/><div><b>周棋洛</b><span>{night?'Key · 在线':'今天也是晴天'}</span></div></div>
   <nav className="apps" aria-label="应用">{(['trace','fan','quote','day','settings'] as Route[]).map((k,i)=><AppIcon key={k} k={k} i={i} open={open}/>)}</nav>
   <nav className="dock" aria-label="常用">{(['story','moment','call','card'] as Route[]).map((k,i)=><AppIcon key={k} k={k} i={i+4} open={open} dock/>)}</nav>
  </>}
 </div>}
function AppIcon({k,i,open,dock}:{k:Route;i:number;open:(r:Route,from?:HTMLElement)=>void;dock?:boolean}){const {state}=useStore(),name=k==='settings'?'设置':k==='trace'?'痕迹':kinds[k as Kind].name,n=k==='settings'||k==='trace'?0:state.records.filter(r=>r.kind===k&&!r.deleted).length;
 return <button className="app" style={{'--i':i} as CSSProperties} onClick={e=>open(k,e.currentTarget)}><span className="app-ico">{appIcons[k]}{n>0&&!dock&&<em>{n}</em>}</span><span className="app-name">{name}</span></button>}

// White rim around a transparent cut-out, so it reads as a sticker.
async function rim(blob:Blob,r=12){const bmp=await createImageBitmap(blob),scale=Math.min(1,900/Math.max(bmp.width,bmp.height)),w=Math.round(bmp.width*scale),h=Math.round(bmp.height*scale),p=r+6;
 const c=document.createElement('canvas');c.width=w+p*2;c.height=h+p*2;const x=c.getContext('2d')!;for(let a=0;a<Math.PI*2;a+=Math.PI/14)x.drawImage(bmp,p+Math.cos(a)*r,p+Math.sin(a)*r,w,h);
 x.globalCompositeOperation='source-in';x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.globalCompositeOperation='source-over';x.drawImage(bmp,p,p,w,h);
 return new Promise<Blob>(res=>c.toBlob(b=>res(b||blob),'image/png'))}
function Decorator({chosen,patch,done,clearSel}:{chosen?:Sticker;patch:(id:string,p:Partial<Sticker>)=>void;done:()=>void;clearSel:()=>void}){
 const {state}=useStore(),h=state.home,own=useRef<HTMLInputElement>(null),wallIn=useRef<HTMLInputElement>(null),[white,setWhite]=useState(true),[cut,setCut]=useState(false),[busy,setBusy]=useState('');
 const add=(s:Partial<Sticker>)=>setHome({stickers:[...h.stickers,{id:uid(),art:'',x:50,y:40,size:90,rot:0,...s}]});
 const upload=async(files:FileList|null)=>{if(!files?.length)return;try{for(const f of Array.from(files)){let b:Blob=f;
    if(cut){setBusy('正在抠图，第一次会比较久…');try{const lib='https://esm.sh/@imgly/background-removal@1.6.0',m=await import(/* @vite-ignore */lib) as {removeBackground:(x:Blob)=>Promise<Blob>};b=await m.removeBackground(f)}catch{toast('自动抠图这次没成功，先按原图放上去了')}}
    setBusy('正在做成贴纸…');if(white)b=await rim(b);else b=await prepareImage(b,900);add({asset:await saveAsset(b,'sticker.png'),size:120})}}catch{toast('这张图没能读进来')}finally{setBusy('');if(own.current)own.current.value=''}};
 const wallpaper=async(files:FileList|null)=>{const f=files?.[0];if(!f)return;setBusy('正在换壁纸…');try{setHome({wallpaper:await saveAsset(await prepareImage(f,2000),f.name)})}finally{setBusy('')}};
 return <div className="decor" onPointerDown={e=>{if(e.target===e.currentTarget)clearSel()}}>
  <div className="decor-top"><b>装饰桌面</b><span>拖动贴纸摆位置</span><button className="primary" onClick={done}><Check size={15}/>完成</button></div>
  <div className="decor-tray">
   {chosen?<div className="decor-edit"><label>大小<input type="range" min={28} max={260} value={chosen.size} onChange={e=>patch(chosen.id,{size:+e.target.value})}/></label><label>角度<input type="range" min={-45} max={45} value={chosen.rot} onChange={e=>patch(chosen.id,{rot:+e.target.value})}/></label>
     <button className="ghost danger" onClick={()=>{setHome({stickers:h.stickers.filter(s=>s.id!==chosen.id)});clearSel()}}><Trash2 size={14}/>拿掉</button></div>
   :<><div className="palette">{Object.entries(art).map(([k,v])=><button key={k} onClick={()=>add({art:k,x:30+Math.random()*40,y:30+Math.random()*30})} aria-label={`加一个${v.name}`} title={v.name}>{v.art}</button>)}</div>
    <div className="decor-own"><button className="ghost" onClick={()=>own.current?.click()} disabled={!!busy}><ImagePlus size={15}/>放自己的贴纸</button><label className="check"><input type="checkbox" checked={white} onChange={e=>setWhite(e.target.checked)}/>加白边</label><label className="check"><input type="checkbox" checked={cut} onChange={e=>setCut(e.target.checked)}/><Sparkles size={12}/>自动抠图（试验）</label>
     <button className="ghost" onClick={()=>wallIn.current?.click()} disabled={!!busy}><Wallpaper size={15}/>换壁纸</button>{h.wallpaper&&<button className="ghost" onClick={()=>setHome({wallpaper:undefined})}>用回默认壁纸</button>}</div>
    {busy&&<p className="decor-busy"><Loader2 size={14} className="spin"/>{busy}</p>}</>}
  </div>
  <input ref={own} type="file" accept="image/png,image/webp,image/*" multiple hidden onChange={e=>upload(e.target.files)}/><input ref={wallIn} type="file" accept="image/*" hidden onChange={e=>wallpaper(e.target.files)}/>
 </div>}

// ── settings ──
function Settings({onBack,decorate}:{onBack:()=>void;decorate:()=>void}){
 const {state,sync}=useStore(),remote=getRemote(),[owner,setOwner]=useState(()=>/^([\w-]+)\.github\.io$/.exec(location.hostname)?.[1]||''),[repo,setRepo]=useState(()=>(location.hostname.endsWith('.github.io')&&location.pathname.split('/').filter(Boolean)[0]||'kiro')+'-data'),[token,setToken]=useState(''),[busy,setBusy]=useState(false),[err,setErr]=useState(''),file=useRef<HTMLInputElement>(null),face=useRef<HTMLInputElement>(null);
 const trash=state.records.filter(r=>r.deleted&&!r.extra.purged).sort((a,b)=>b.updated-a.updated),night=state.settings.theme==='night';
 const link=async()=>{setErr('');if(!owner.trim()||!repo.trim()||!token.trim())return setErr('三项都要填');setBusy(true);try{await connect({owner:owner.trim(),repo:repo.trim(),token:token.trim()});setToken('');toast('连上了，内容会自动同步')}catch(e){setErr((e as Error).message)}finally{setBusy(false)}};
 const backup=async()=>{setBusy(true);try{const b=await exportBackup(),a=document.createElement('a'),d=new Date();a.href=URL.createObjectURL(b);a.download=`🐻-备份-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000);toast('备份已下载')}finally{setBusy(false)}};
 const restore=async(files:FileList|null)=>{const f=files?.[0];if(!f)return;setBusy(true);try{const r=await importBackup(f);toast(`导入完成：新增 ${r.records} 条记录、${r.assets} 个文件`)}catch(e){toast((e as Error).message||'这个文件读不了')}finally{setBusy(false);if(file.current)file.current.value=''}};
 const avatar=async(files:FileList|null)=>{const f=files?.[0];if(f)setHome({avatar:await saveAsset(await prepareImage(f,600),f.name)})};
 return <div className="screen screen-settings"><header className="screen-head"><button className="back" onClick={onBack} aria-label="回到桌面"><ChevronLeft size={22}/></button><div><h1>设置</h1><p>外观、同步和备份</p></div></header>
  <div className="screen-body settings">
   <section><h2>外观</h2>
    <div className="seg" role="group" aria-label="主题"><button aria-pressed={!night} onClick={()=>setSettings({theme:'day'})}><Sun size={15}/>白天</button><button aria-pressed={night} onClick={()=>setSettings({theme:'night'})}><Moon size={15}/>夜里（Key）</button></div>
    <div className="rowbtns"><button className="ghost" onClick={decorate}><Sparkles size={15}/>装饰桌面</button><button className="ghost" onClick={()=>face.current?.click()}><UserRound size={15}/>换他的头像</button>{state.home.avatar&&<button className="ghost" onClick={()=>setHome({avatar:undefined})}>用回默认头像</button>}</div>
    <input ref={face} type="file" accept="image/*" hidden onChange={e=>avatar(e.target.files)}/></section>
   <section><h2>同步</h2>
    <p className="device-line">这台设备：{remote?'已连接':'还没连接'} · {sync.at?'上次同步 '+new Date(sync.at).toLocaleTimeString('zh-CN',{hour12:false}):'还没同步过'} · {state.records.filter(r=>!r.deleted).length} 条记录 · 痕迹点亮 {Object.values(state.marks).filter(m=>!m.off).length} · 版本 {BUILD}</p>
    {remote?<><p className={`sync-line ${sync.state}`}>{sync.state==='syncing'?<Loader2 size={15} className="spin"/>:sync.state==='error'?<TriangleAlert size={15}/>:<Cloud size={15}/>}{sync.message}<small>{remote.owner}/{remote.repo}</small></p>
     <div className="rowbtns"><button className="ghost" onClick={()=>syncNow()}>现在同步一次</button><button className="ghost danger" onClick={()=>{disconnect();toast('已断开，这台设备上的内容还在')}}>断开</button></div></>
    :<><p className="hint">现在内容只存在这台设备的浏览器里。连上你自己的私有 GitHub 仓库后，手机和电脑会自动同步，换设备也不会丢。</p>
     <ol className="steps"><li>私有仓库已经建好，用户名和仓库名也填好了，不用动。</li><li>到 GitHub 生成一个只选中这个仓库的 fine-grained 令牌，权限选 Contents: Read and write。</li><li>把令牌粘贴到下面，点「连接」。令牌只保存在这台设备上，每台设备各填一次。</li></ol>
     <div className="field-row"><label className="field"><span>GitHub 用户名</span><input value={owner} onChange={e=>setOwner(e.target.value)} autoCapitalize="off" autoCorrect="off"/></label><label className="field"><span>私有仓库名</span><input value={repo} onChange={e=>setRepo(e.target.value)} autoCapitalize="off" autoCorrect="off"/></label></div>
     <label className="field"><span>令牌</span><input type="password" value={token} onChange={e=>setToken(e.target.value)} autoComplete="off" placeholder="github_pat_…"/></label>
     {err&&<p className="form-error" role="alert">{err}</p>}<button className="primary" onClick={link} disabled={busy}>{busy?<Loader2 size={15} className="spin"/>:<Cloud size={15}/>}连接</button></>}</section>
   <section><h2>备份</h2><p className="hint">备份文件里有全部记录和图片。导入不会覆盖现有内容，只补上缺的。</p>
    <div className="rowbtns"><button className="ghost" onClick={backup} disabled={busy}><Download size={15}/>导出备份</button><button className="ghost" onClick={()=>file.current?.click()} disabled={busy}><Upload size={15}/>导入备份</button></div><input ref={file} type="file" accept="application/json,.json" hidden onChange={e=>restore(e.target.files)}/></section>
   <section><h2>回收站</h2>{!trash.length?<p className="hint">空的。删掉的东西会先放在这里。</p>:<ul className="trash">{trash.map(r=><li key={r.id}><span><b>{r.title||r.note.slice(0,20)||kinds[r.kind].name}</b><small>{kinds[r.kind].name}</small></span><button className="ghost" onClick={()=>restoreRecord(r.id)}><RotateCcw size={14}/>放回去</button><button className="ghost danger" onClick={()=>{if(confirm('彻底删除后找不回来，确定吗？'))purgeRecord(r.id)}}><Trash2 size={14}/>彻底删除</button></li>)}</ul>}</section>
  </div></div>}
