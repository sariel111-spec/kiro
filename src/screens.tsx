import {useMemo,useRef,useState,type CSSProperties,type PointerEvent as RPE,type ReactNode} from 'react';
import {ChevronLeft,Plus,Search,Heart,Pencil,Trash2,GripVertical,ArrowUp,ArrowDown,Star,RotateCw,ExternalLink,Phone,MessageSquare,AudioLines,Video,Images,Shuffle,Link2} from 'lucide-react';
import {useStore,updateRecord,removeRecord,restoreRecord,moveRecord,type Rec,type Kind} from './store';
import {kinds,dayCount} from './kinds';
import {Img,Editor,Lightbox,Sheet,AudioPlayer,toast,type Shown} from './ui';
import {DefaultAvatar} from './art';

const statusClass:Record<string,string>={'看过了':'seen','正在补':'doing','想看':'todo'};
const callIcon:Record<string,ReactNode>={'通话':<Phone size={18}/>,'短信':<MessageSquare size={18}/>,'语音':<AudioLines size={18}/>,'视频通话':<Video size={18}/>};

export function Avatar({id}:{id?:string}){return <span className="avatar">{id?<Img id={id}/>:<DefaultAvatar/>}</span>}

export default function Screen({kind,onBack}:{kind:Kind;onBack:()=>void}){
 const {state}=useStore(),def=kinds[kind];
 const all=useMemo(()=>state.records.filter(r=>r.kind===kind&&!r.deleted).sort((a,b)=>a.order-b.order),[state.records,kind]);
 const [q,setQ]=useState(''),[pick,setPick]=useState('全部'),[favOnly,setFavOnly]=useState(false),[editing,setEditing]=useState<{rec?:Rec}|null>(null),[openId,setOpenId]=useState<string|null>(null),[shown,setShown]=useState<Shown>(null);
 const filterDef=def.extras.find(e=>e.key===def.filter),tags=useMemo(()=>[...new Set(all.flatMap(r=>r.tags))].slice(0,14),[all]);
 const list=all.filter(r=>(!favOnly||r.fav)&&(pick==='全部'||r.extra[def.filter||'']===pick||r.tags.includes(pick))&&(!q.trim()||[r.title,r.note,r.when,r.tags.join(' '),String(r.extra.author||'')].join(' ').toLowerCase().includes(q.trim().toLowerCase())));
 const open=all.find(r=>r.id===openId)||null;
 const remove=(r:Rec)=>{removeRecord(r.id);setOpenId(null);toast('已移到回收站',()=>restoreRecord(r.id))};
 const fav=(r:Rec)=>updateRecord(r.id,{fav:!r.fav});
 const view=(r:Rec,i=0)=>r.images.length&&setShown({images:r.images,at:i});
 // drag to reorder (剧情)
 const [drag,setDrag]=useState<string|null>(null),[drop,setDrop]=useState<{id:string;after:boolean}|null>(null),body=useRef<HTMLDivElement>(null);
 const under=(x:number,y:number)=>{const el=document.elementFromPoint(x,y)?.closest<HTMLElement>('[data-rec]');if(!el)return null;const b=el.getBoundingClientRect();return {id:el.dataset.rec!,after:y>b.top+b.height/2}};
 const grip=(id:string)=>({onPointerDown:(e:RPE)=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);setDrag(id)},
  onPointerMove:(e:RPE)=>{if(drag!==id)return;setDrop(under(e.clientX,e.clientY));const s=body.current;if(s){const b=s.getBoundingClientRect();if(e.clientY<b.top+70)s.scrollTop-=14;else if(e.clientY>b.bottom-70)s.scrollTop+=14}},
  onPointerUp:(e:RPE)=>{const d=under(e.clientX,e.clientY);if(drag&&d&&d.id!==drag)moveRecord(drag,d.id,d.after);setDrag(null);setDrop(null)},onPointerCancel:()=>{setDrag(null);setDrop(null)}});
 const step=(r:Rec,d:number)=>{const i=all.findIndex(x=>x.id===r.id),t=all[i+d];if(t)moveRecord(r.id,t.id,d>0)};
 const dragCls=(r:Rec)=>`${drag===r.id?'dragging':''} ${drop?.id===r.id&&drag!==r.id?(drop.after?'drop-after':'drop-before'):''}`;

 const counts=kind==='story'?{seen:all.filter(r=>r.extra.status==='看过了').length,doing:all.filter(r=>r.extra.status==='正在补').length,todo:all.filter(r=>r.extra.status==='想看').length}:null;
 return <div className={`screen screen-${kind}`}>
  <header className="screen-head"><button className="back" onClick={onBack} aria-label="回到桌面"><ChevronLeft size={22}/></button><div><h1>{def.name}</h1><p>{def.sub}</p></div><button className="add" onClick={()=>setEditing({})}><Plus size={18}/><span>{def.add}</span></button></header>
  <div className="screen-body" ref={body}>
   {counts&&all.length>0&&<div className="progress" aria-label="补档进度"><div className="bar"><i style={{flex:counts.seen}} className="seen"/><i style={{flex:counts.doing}} className="doing"/><i style={{flex:counts.todo}} className="todo"/></div><p><b>{counts.seen}</b> 段看过了<span>·</span><b>{counts.doing}</b> 段正在补<span>·</span><b>{counts.todo}</b> 段想看</p></div>}
   {all.length>0&&<div className="tools"><label className="search"><Search size={15}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder={`在${def.name}里找…`} aria-label="搜索"/></label>
    <div className="chips"><button aria-pressed={pick==='全部'&&!favOnly} onClick={()=>{setPick('全部');setFavOnly(false)}}>全部 {all.length}</button><button aria-pressed={favOnly} onClick={()=>setFavOnly(v=>!v)}><Heart size={12} fill={favOnly?'currentColor':'none'}/>喜欢</button>
     {filterDef?.options?.filter(o=>all.some(r=>r.extra[filterDef.key]===o)).map(o=><button key={o} aria-pressed={pick===o} onClick={()=>setPick(pick===o?'全部':o)}>{o}</button>)}{tags.map(t=><button key={'#'+t} aria-pressed={pick===t} onClick={()=>setPick(pick===t?'全部':t)}>#{t}</button>)}</div></div>}
   {!all.length?<div className="empty"><p>{def.empty}</p><button className="primary" onClick={()=>setEditing({})}><Plus size={16}/>{def.add}</button></div>
   :!list.length?<div className="empty"><p>没有找到。换个词，或者点「全部」。</p></div>

   :kind==='story'?<ol className="timeline">{list.map(r=><li key={r.id} data-rec={r.id} className={`${statusClass[String(r.extra.status)]||'seen'} ${dragCls(r)}`}>
     <button className="grip" aria-label={`拖动「${r.title}」调整顺序`} {...grip(r.id)} onKeyDown={e=>{if(e.key==='ArrowUp'){e.preventDefault();step(r,-1)}if(e.key==='ArrowDown'){e.preventDefault();step(r,1)}}}><GripVertical size={16}/></button><i className="node" aria-hidden="true"/>
     <article><header><em>{String(r.extra.type||'')}</em>{r.when&&<span>{r.when}</span>}<button className="status" onClick={()=>{const o=['看过了','正在补','想看'],n=o[(o.indexOf(String(r.extra.status))+1)%3];updateRecord(r.id,{extra:{...r.extra,status:n}})}} title="点一下切换进度">{String(r.extra.status||'看过了')}</button></header>
      <h3><button onClick={()=>setOpenId(r.id)}>{r.title}</button></h3>
      {r.images.length>0&&<div className="strip">{r.images.slice(0,5).map((id,i)=><button key={id} onClick={()=>view(r,i)} aria-label={`看第 ${i+1} 张截图`}><Img id={id}/>{i===4&&r.images.length>5&&<b>+{r.images.length-5}</b>}</button>)}</div>}
      {r.note&&<p className="note">{r.note}</p>}
      <footer><span className="stars" role="group" aria-label="评分">{[1,2,3,4,5].map(n=><button key={n} aria-label={`${n} 星`} aria-pressed={Number(r.extra.stars||0)>=n} onClick={()=>updateRecord(r.id,{extra:{...r.extra,stars:Number(r.extra.stars)===n?0:n}})}><Star size={15} fill={Number(r.extra.stars||0)>=n?'currentColor':'none'}/></button>)}</span>
       <button className="rewatch" onClick={()=>{updateRecord(r.id,{extra:{...r.extra,rewatch:Number(r.extra.rewatch||0)+1}});toast('又看了一遍')}}><RotateCw size={13}/>重温 {Number(r.extra.rewatch||0)||''}</button>
       {r.extra.seen&&<time>{String(r.extra.seen)}</time>}
       <span className="row-acts"><button onClick={()=>step(r,-1)} aria-label="往前挪一位"><ArrowUp size={15}/></button><button onClick={()=>step(r,1)} aria-label="往后挪一位"><ArrowDown size={15}/></button><button onClick={()=>fav(r)} aria-label={r.fav?'取消喜欢':'喜欢'} aria-pressed={r.fav}><Heart size={15} fill={r.fav?'currentColor':'none'}/></button><button onClick={()=>setEditing({rec:r})} aria-label="修改"><Pencil size={15}/></button></span></footer></article></li>)}</ol>

   :kind==='moment'?<div className="feed">{list.map(r=><article key={r.id} className="moment"><Avatar id={state.home.avatar}/><div><b className="who">周棋洛</b>{r.note&&<p>{r.note}</p>}
      {r.images.length>0&&<div className={`shots n${Math.min(r.images.length,4)}`}>{r.images.map((id,i)=><button key={id} onClick={()=>view(r,i)} aria-label="放大看"><Img id={id}/></button>)}</div>}
      <footer><time>{r.when||new Date(r.created).toLocaleDateString('zh-CN')}</time>{r.tags.map(t=><span key={t}>#{t}</span>)}<span className="row-acts"><button onClick={()=>fav(r)} aria-pressed={r.fav} aria-label={r.fav?'取消喜欢':'喜欢'}><Heart size={16} fill={r.fav?'currentColor':'none'}/></button><button onClick={()=>setEditing({rec:r})} aria-label="修改"><Pencil size={15}/></button><button onClick={()=>remove(r)} aria-label="删除"><Trash2 size={15}/></button></span></footer></div></article>)}</div>

   :kind==='call'?<ul className="calls">{list.map(r=><li key={r.id}><button className="call-row" onClick={()=>setOpenId(r.id)}><span className={`call-ico t-${['通话','短信','语音','视频通话'].indexOf(String(r.extra.type))}`}>{callIcon[String(r.extra.type)]||<Phone size={18}/>}</span><span className="call-main"><b>{r.title}</b><small>{String(r.extra.type||'通话')}{r.audio&&' · 有录音'}{r.images.length>0&&` · ${r.images.length} 张截图`}{r.note&&' · 有文字稿'}</small></span><time>{r.when}</time></button>
      <button className="call-fav" onClick={()=>fav(r)} aria-pressed={r.fav} aria-label={r.fav?'取消喜欢':'喜欢'}><Heart size={16} fill={r.fav?'currentColor':'none'}/></button></li>)}</ul>

   :kind==='card'?<div className="cards">{list.map(r=><button key={r.id} className="card" onClick={()=>setOpenId(r.id)} onPointerMove={e=>{if(e.pointerType==='touch')return;const b=e.currentTarget.getBoundingClientRect();e.currentTarget.style.setProperty('--rx',String((e.clientX-b.left)/b.width-.5));e.currentTarget.style.setProperty('--ry',String((e.clientY-b.top)/b.height-.5))}} onPointerLeave={e=>{e.currentTarget.style.removeProperty('--rx');e.currentTarget.style.removeProperty('--ry')}}>
      {r.images[0]?<Img id={r.images[0]}/>:<span className="card-blank"><Images size={26}/></span>}<i className="shine" aria-hidden="true"/>{r.extra.rarity&&<em>{String(r.extra.rarity)}</em>}{r.fav&&<Heart size={14} fill="currentColor" className="card-heart"/>}<b>{r.title}</b></button>)}</div>

   :kind==='fan'?<div className="masonry">{list.map(r=><article key={r.id} className="fanwork"><button onClick={()=>setOpenId(r.id)}>{r.images[0]&&<Img id={r.images[0]}/>}<h3>{r.title}</h3>{!r.images[0]&&r.note&&<p>{r.note}</p>}</button><footer><span>{String(r.extra.type||'')}{r.extra.author?` · ${r.extra.author}`:''}</span>{r.link&&<a href={r.link} target="_blank" rel="noreferrer" aria-label="去看原作"><Link2 size={14}/></a>}<button onClick={()=>fav(r)} aria-pressed={r.fav} aria-label={r.fav?'取消喜欢':'喜欢'}><Heart size={14} fill={r.fav?'currentColor':'none'}/></button></footer></article>)}</div>

   :kind==='quote'?<><button className="ghost shuffle" onClick={()=>{const r=list[Math.floor(Math.random()*list.length)],el=document.getElementById('q-'+r.id);el?.scrollIntoView({behavior:'smooth',block:'center'});el?.classList.remove('lit');void el?.offsetWidth;el?.classList.add('lit')}}><Shuffle size={15}/>随便翻到一句</button>
     <div className="quotes">{list.map((r,i)=><blockquote key={r.id} id={'q-'+r.id} style={{'--i':i%4} as CSSProperties}><p>{r.note}</p><footer>{r.title&&<cite>{r.title}</cite>}<span className="row-acts"><button onClick={()=>fav(r)} aria-pressed={r.fav} aria-label={r.fav?'取消喜欢':'喜欢'}><Heart size={15} fill={r.fav?'currentColor':'none'}/></button><button onClick={()=>setEditing({rec:r})} aria-label="修改"><Pencil size={14}/></button><button onClick={()=>remove(r)} aria-label="删除"><Trash2 size={14}/></button></span></footer></blockquote>)}</div></>

   :<div className="days">{list.map(r=>{const c=dayCount(String(r.extra.date||''),String(r.extra.repeat||'每年'));return <article key={r.id} className={c?.left===0?'today':''}><div><h3>{r.title}</h3><p>{String(r.extra.date||'还没填日期')}{r.extra.repeat==='每年'&&' · 每年'}{c?.since!=null&&c.since>0&&r.extra.repeat==='每年'&&` · 已经 ${c.since} 天`}</p>{r.note&&<small>{r.note}</small>}</div>
      <strong>{c?(c.left===0?'今天':<>{Math.abs(c.left)}<small>{c.left>0?'天后':'天了'}</small></>):'—'}</strong><span className="row-acts"><button onClick={()=>setEditing({rec:r})} aria-label="修改"><Pencil size={14}/></button><button onClick={()=>remove(r)} aria-label="删除"><Trash2 size={14}/></button></span></article>})}</div>}
  </div>

  {open&&<Sheet title={open.title||def.name} onClose={()=>setOpenId(null)} wide><div className="detail">
   <p className="meta">{def.extras.filter(e=>open.extra[e.key]).map(e=><span key={e.key}>{e.label}：{String(open.extra[e.key])}</span>)}{open.when&&<span>{open.when}</span>}{Number(open.extra.rewatch)>0&&<span>重温 {String(open.extra.rewatch)} 次</span>}</p>
   {open.audio&&<AudioPlayer id={open.audio}/>}
   {open.note&&<p className="text">{open.note}</p>}
   {open.images.length>0&&<div className="pics">{open.images.map((id,i)=><button key={id} onClick={()=>view(open,i)} aria-label="放大看"><Img id={id}/></button>)}</div>}
   {open.link&&<a className="ghost link" href={open.link} target="_blank" rel="noreferrer"><ExternalLink size={15}/>打开链接</a>}
   {open.tags.length>0&&<p className="tags">{open.tags.map(t=><span key={t}>#{t}</span>)}</p>}
   <footer><button className="ghost" onClick={()=>fav(open)} aria-pressed={open.fav}><Heart size={15} fill={open.fav?'currentColor':'none'}/>{open.fav?'已喜欢':'喜欢'}</button><button className="ghost" onClick={()=>{setEditing({rec:open});setOpenId(null)}}><Pencil size={15}/>修改</button><button className="ghost danger" onClick={()=>remove(open)}><Trash2 size={15}/>删除</button></footer>
  </div></Sheet>}
  {editing&&<Editor kind={kind} rec={editing.rec} onClose={()=>setEditing(null)}/>}
  <Lightbox shown={shown} onClose={()=>setShown(null)}/>
 </div>}
