import {useMemo,useState,type ReactNode} from 'react';
import {ChevronLeft,ChevronDown,Sun,Play,PenLine,ExternalLink,Undo2,Search} from 'lucide-react';
import {useStore,setMarks,addRecord,type Mark} from './store';
import {seasons,dated,storyCards,rCards,late,sources,videos,datedThrough,type Chapter,type Season,type Group} from './catalog';
import {Sheet,toast} from './ui';

type Tab='main'|'cards'|'trail';
type Vid={label:string;page:string;embed:string;by?:string};
type Info={id:string;title:string;sub:string;when:string;type:'主线'|'约会';ids:string[];vids:Vid[];q:string;part?:Chapter};
const CUT='kiloの苹果箱';
const dot=(d:string)=>d.replace(/-/g,'.');
const short=(d:string)=>d.slice(5).replace('-','.');
const partIds=(c:Chapter)=>[...(c.stages||[]).map(s=>c.id+'.'+s),...(c.extras||[]).map((_,i)=>c.id+'.x'+i)];
const hisCount=(c:Chapter)=>(c.stages?.length||0)+(c.extras?.length||0);
const isHis=(c:Chapter)=>hisCount(c)>0||!!c.kiro;
const yearOf=(d:string)=>d.slice(0,4);
// "3.12" is part 12 of videos[3]; a bare BV id is a single video.
const vid=(ref:string,label:string,by?:string):Vid=>{const m=/^(\d+)\.(\d+)$/.exec(ref),bv=m?videos[+m[1]]:ref,p=m?m[2]:'1';
 if(m&&!by)by=+m[1]<=4?CUT:+m[1]<=8?'Love_Kilo':undefined;
 return {label,by,page:`https://www.bilibili.com/video/${bv}${m?'?p='+p:''}`,embed:`https://player.bilibili.com/player.html?bvid=${bv}&p=${p}&autoplay=0`}};
const finders=(q:string)=>[['B站',`https://search.bilibili.com/all?keyword=${encodeURIComponent(q)}`],['小红书',`https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(q)}`],['抖音',`https://www.douyin.com/search/${encodeURIComponent(q)}`]];
const rars=['全部','UR','SP','SSR','SR','ER'];
const chapters=seasons.flatMap(s=>s.groups.flatMap(g=>g.chapters.map(c=>({c,g,s}))));
// Everything that counts toward the total. Single stages are steps inside a chapter, not entries of their own.
const units=[...chapters.map(x=>x.c.id),...dated.map(x=>x.id),...late.map(x=>x.id),...storyCards.map(x=>x.id),...rCards.map(x=>x.id)];
const unitSet=new Set(units);
const labels=new Map<string,string>();
for(const {c,s} of chapters){labels.set(c.id,s.name+' '+c.n+(c.title?' '+c.title:''));
 (c.stages||[]).forEach(st=>labels.set(c.id+'.'+st,s.name+' '+(c.num??c.n)+'-'+st));(c.extras||[]).forEach((e,i)=>labels.set(c.id+'.x'+i,s.name+' '+c.n+' · '+e))}
for(const d of [...dated,...late])labels.set(d.id,d.name+(d.meet&&d.meet!==d.name?' · '+d.meet:''));
for(const k of storyCards)labels.set(k.id,k.name);for(const r of rCards)labels.set(r.id,r.name);

const chapterInfo=(c:Chapter,g:Group,s:Season):Info=>({id:c.id,title:c.n+(c.title?' '+c.title:''),sub:s.name+(g.date?' · '+g.name+' · '+dot(g.date):''),when:s.name+' '+c.n,type:'主线',ids:[c.id,...partIds(c)],
 vids:[...(c.v?[vid(c.v,'整章')]:[]),...(c.hv?[vid(c.hv,c.v?'只看他的':'他的 cut',CUT)]:[])],q:s.id==='xy'?'周棋洛 西月国 剧情':`恋与制作人 ${s.name}主线 ${c.n} ${c.title}`});
const partInfo=(c:Chapter,s:Season,id:string,name:string,ref?:string):Info=>({id,title:s.name+' '+name,sub:c.n+(c.title?' '+c.title:''),when:s.name+' '+name,type:'主线',ids:[id],part:c,
 vids:ref?[vid(ref,'这一段')]:[],q:`周棋洛 主线 ${s.name} ${c.n}`});

function Toggle({on,onClick,label}:{on:boolean;onClick:()=>void;label:string}){
 return <button className="tr-sun" aria-pressed={on} aria-label={(on?'取消点亮：':'点亮：')+label} onClick={onClick}><Sun size={18}/></button>}
function Go({onClick,label,has}:{onClick:()=>void;label:string;has:boolean}){
 return <button className={`tr-play ${has?'':'none'}`} onClick={onClick} aria-label={(has?'去看：':'去找：')+label}>{has?<Play size={15}/>:<Search size={15}/>}</button>}

export default function Trace({onBack}:{onBack:()=>void}){
 const {state}=useStore(),marks=state.marks;
 const [tab,setTab]=useState<Tab>('main'),[season,setSeason]=useState('s1'),[hisOnly,setHisOnly]=useState(false),[open,setOpen]=useState<string|null>(null);
 const [rar,setRar]=useState('全部'),[todo,setTodo]=useState(false),[info,setInfo]=useState<Info|null>(null),[pick,setPick]=useState(0);
 const show=(i:Info)=>{setPick(0);setInfo(i)};
 const lit=(id:string):Mark|null=>{const m=marks[id];return m&&!m.off?m:null};
 const done=useMemo(()=>units.filter(id=>{const m=marks[id];return m&&!m.off}).length,[marks]);
 const flip=(ids:string[],on:boolean,name:string)=>{setMarks(ids,on);if(on)toast('补上了：'+name,()=>setMarks(ids,false))};
 const flipChapter=(c:Chapter)=>{const ids=[c.id,...partIds(c)];flip(ids,!lit(c.id),c.n+(c.title?' '+c.title:''))};
 const flipPart=(c:Chapter,id:string)=>{const on=!lit(id),rest=partIds(c).filter(x=>x!==id);
  if(on&&rest.every(x=>lit(x))&&!lit(c.id))setMarks([id,c.id],true);else setMarks([id],on)};

 const cur=seasons.find(s=>s.id===season)!;
 const main=<>
  <div className="tr-tools">
   <div className="chips">{seasons.map(s=>{const all=s.groups.flatMap(g=>g.chapters),n=all.filter(c=>lit(c.id)).length;return <button key={s.id} aria-pressed={season===s.id} onClick={()=>{setSeason(s.id);setOpen(null)}}>{s.name}<i>{n}/{all.length}</i></button>})}
    <button aria-pressed={hisOnly} onClick={()=>setHisOnly(!hisOnly)}>只看有他的章节</button></div>
   {cur.note&&<p className="tr-note">{cur.note}</p>}
  </div>
  {cur.groups.map(g=>{const list=g.chapters.filter(c=>!hisOnly||isHis(c));if(!list.length)return null;const n=g.chapters.filter(c=>lit(c.id)).length;
   return <section key={g.id} className="tr-group">
    <header><h2>{g.name}</h2><span>{dot(g.date)}</span><em>{n}/{g.chapters.length}</em></header>
    <ol className="tr-list">{list.map(c=>{const m=lit(c.id),parts=partIds(c),got=parts.filter(p=>lit(p)).length,cnt=hisCount(c),isOpen=open===c.id,ci=chapterInfo(c,g,cur);
     return <li key={c.id} className={`tr-row ${m?'lit':''} ${c.special?'special':''}`}>
      <Toggle on={!!m} onClick={()=>flipChapter(c)} label={c.n}/>
      <div className="tr-main">
       <div className="tr-line"><button className="tr-title" onClick={()=>parts.length?setOpen(isOpen?null:c.id):show(ci)} aria-expanded={parts.length?isOpen:undefined}>
        <b>{c.n}</b><span>{c.title||(c.special||cur.id==='xy'?'':'章节名待补')}</span>
        {cnt>0&&<i className={cnt>=8?'much':''}>{got>0?`他的 ${got}/${cnt}`:`他出场 ${cnt} 处`}</i>}{cnt===0&&c.kiro&&<i>有他</i>}
        {parts.length>0&&<ChevronDown size={16} className="tr-chev"/>}
       </button><Go has={ci.vids.length>0} label={c.n} onClick={()=>show(ci)}/></div>
       {m&&<p className="tr-at">补于 {dot(m.at)}</p>}
       {isOpen&&<div className="tr-parts">
        {c.note&&<p>{c.note}</p>}
        <div>{(c.stages||[]).map((st,i)=>{const id=c.id+'.'+st,name=(c.num??'')+'-'+st;return <span key={st} className="tr-chip" data-on={!!lit(id)}><button aria-pressed={!!lit(id)} onClick={()=>flipPart(c,id)}>{name}</button>
          {c.sv?.[i]&&<button className="go" aria-label={'看 '+name} onClick={()=>show(partInfo(c,cur,id,name,c.sv![i]))}><Play size={12}/></button>}</span>})}
         {(c.extras||[]).map((e,i)=>{const id=c.id+'.x'+i;return <span key={e} className="tr-chip wide" data-on={!!lit(id)}><button aria-pressed={!!lit(id)} onClick={()=>flipPart(c,id)}>{e}</button>
          {c.xv?.[i]&&<button className="go" aria-label={'看 '+e} onClick={()=>show(partInfo(c,cur,id,c.n+' · '+e,c.xv![i]))}><Play size={12}/></button>}</span>})}</div>
       </div>}
      </div>
     </li>})}</ol>
   </section>})}
  {season==='s3'&&<p className="tr-note">第 9–12 章的章节名还没查到；第 3–8 章和第 10–12 章他出场的关卡没有现成的 cut，只列到合集里有的部分。</p>}
 </>;

 const years=useMemo(()=>[...new Set(dated.map(d=>yearOf(d.date)))],[]);
 const pass=(r:string,id:string)=>(rar==='全部'||r===rar)&&(!todo||!lit(id));
 const cardRow=(x:{id:string;name:string;rar?:string;q?:boolean;v?:string;by?:string},sub:string,when:string,q:string,type:'约会'|'主线',right?:string,flag='名字待核')=>{const m=lit(x.id),
  i:Info={id:x.id,title:x.name,sub:[x.rar,sub].filter(Boolean).join(' · '),when,type,ids:[x.id],vids:x.v?[vid(x.v,type==='约会'?'约会':'传闻秘事',x.by)]:[],q};
  return <li key={x.id} className={`tr-row ${m?'lit':''}`}>
   <Toggle on={!!m} onClick={()=>flip([x.id],!m,x.name)} label={x.name}/>
   <div className="tr-main"><div className="tr-line"><button className="tr-title kb" onClick={()=>show(i)}>
    {x.rar&&<em data-r={x.rar}>{x.rar}</em>}<span>{x.name}{x.q&&<small>{flag}</small>}</span>{right&&<time>{right}</time>}</button><Go has={!!x.v} label={x.name} onClick={()=>show(i)}/></div>
    {sub&&<p className="tr-sub">{sub}</p>}{m&&<p className="tr-at">补于 {dot(m.at)}</p>}</div></li>};
 const cards=<>
  <div className="tr-tools"><div className="chips">{rars.map(r=><button key={r} aria-pressed={rar===r} onClick={()=>setRar(r)}>{r}</button>)}<button aria-pressed={todo} onClick={()=>setTodo(!todo)}>只看没补的</button></div></div>
  {years.map(y=>{const all=dated.filter(d=>yearOf(d.date)===y),list=all.filter(d=>pass(d.rar,d.id));if(!list.length)return null;
   return <section key={y} className="tr-group">
    <header><h2>{y}</h2><span>{all.length} 张有约会的羁绊</span><em>{all.filter(d=>lit(d.id)).length}/{all.length}</em></header>
    <ol className="tr-list">{list.map(d=>{const own=d.meet===d.name;return cardRow(d,(own?'':d.meet+' · ')+d.via,dot(d.date)+' · '+d.via,`周棋洛 ${d.name}${own?'':' '+d.meet.split('/')[0]}`,'约会',short(d.date))})}</ol>
   </section>})}
  {rar==='全部'&&late.filter(l=>!todo||!lit(l.id)).length>0&&<section className="tr-group"><header><h2>2026 下半年</h2><span>7 月之后新上线的，日期和稀有度待补</span><em>{late.filter(l=>lit(l.id)).length}/{late.length}</em></header>
   <ol className="tr-list">{late.filter(l=>!todo||!lit(l.id)).map(l=>cardRow(l,l.meet+' · '+l.via,l.via,`周棋洛 ${l.name} ${l.meet}`,'约会'))}</ol></section>}
  {(()=>{const list=storyCards.filter(k=>pass(k.rar,k.id));if(!list.length)return null;
   return <section className="tr-group"><header><h2>主线配套</h2><span>跟着主线出的羁绊，大多带一段传闻秘事</span><em>{storyCards.filter(k=>lit(k.id)).length}/{storyCards.length}</em></header>
    <ol className="tr-list">{list.map(k=>cardRow(k,k.rumor?'传闻秘事「'+k.rumor+'」':'','主线配套',`周棋洛 ${k.name} 传闻秘事`,'主线',undefined,'位置待核'))}</ol></section>})()}
  {(rar==='全部')&&<section className="tr-group"><header><h2>R 卡</h2><span>没有单独的约会，前 {rCards.filter(r=>!r.q).length} 张按上线先后排</span><em>{rCards.filter(r=>lit(r.id)).length}/{rCards.length}</em></header>
   <div className="tr-parts loose"><div>{rCards.filter(r=>!todo||!lit(r.id)).map(r=><span key={r.id} className="tr-chip wide" data-on={!!lit(r.id)}><button aria-pressed={!!lit(r.id)} onClick={()=>flip([r.id],!lit(r.id),r.name)}>{r.name}</button>
    <button className="go" aria-label={'去找 '+r.name} onClick={()=>show({id:r.id,title:r.name,sub:'R 卡',when:'R 卡',type:'约会',ids:[r.id],vids:[],q:`周棋洛 ${r.name}`})}><Search size={12}/></button></span>)}</div></div></section>}
  <p className="tr-note">有约会的羁绊按上线日期整理到 {dot(datedThrough)}，之后的只收了已经有人上传剧情的几张。</p>
 </>;

 const rows=useMemo(()=>{const by=new Map<string,{id:string;kind:'ch'|'card'}[]>();const put=(y:string,v:{id:string;kind:'ch'|'card'})=>{if(!by.has(y))by.set(y,[]);by.get(y)!.push(v)};
  for(const {c,g} of chapters)if(g.date)put(yearOf(g.date),{id:c.id,kind:'ch'});for(const d of dated)put(yearOf(d.date),{id:d.id,kind:'card'});for(const l of late)put('2026',{id:l.id,kind:'card'});return [...by.entries()].sort((a,b)=>a[0].localeCompare(b[0]))},[]);
 const days=useMemo(()=>{const by=new Map<string,string[]>();for(const id in marks){const m=marks[id];if(!m||m.off||!labels.has(id))continue;if(!by.has(m.at))by.set(m.at,[]);by.get(m.at)!.push(id)}
  return [...by.entries()].sort((a,b)=>b[0].localeCompare(a[0])).slice(0,30)},[marks]);
 const trail=<>
  <section className="tr-sum"><p><b>{done}</b><span>/ {units.length} 条已经补上</span></p><div className="tr-bar"><i style={{width:(done/units.length*100).toFixed(2)+'%'}}/></div>
   <small>主线 {chapters.filter(x=>lit(x.c.id)).length}/{chapters.length} · 约会羁绊 {[...dated,...late].filter(d=>lit(d.id)).length}/{dated.length+late.length} · 主线配套 {storyCards.filter(k=>lit(k.id)).length}/{storyCards.length} · R 卡 {rCards.filter(r=>lit(r.id)).length}/{rCards.length}</small></section>
  <section className="tr-group"><header><h2>这些年</h2><span>方块是主线章节，圆点是羁绊，按上线先后排</span></header>
   <div className="tr-years">{rows.map(([y,list])=>{const n=list.filter(v=>lit(v.id)).length;return <div key={y} className="tr-year"><b>{y}</b><p>{list.map(v=><i key={v.id} className={`${v.kind} ${lit(v.id)?'on':''}`} title={labels.get(v.id)}/>)}</p><em>{n}/{list.length}</em></div>})}</div></section>
  <section className="tr-group"><header><h2>最近补上的</h2></header>
   {days.length?<ol className="tr-days">{days.map(([d,ids])=>{const big=ids.filter(id=>unitSet.has(id)),small=ids.length-big.length;return <li key={d}><time>{dot(d)}</time><p>{big.slice(0,12).map(id=>labels.get(id)).join('、')}{big.length>12?` 等 ${big.length} 条`:''}{small>0&&<span>{big.length?'，另外':''}看了 {small} 处他出场的关卡</span>}</p></li>})}</ol>
   :<p className="tr-note">还没有点亮的条目。去「主线」或「羁绊」里点一下名字前面的小太阳，这里就会记下是哪一天补上的。</p>}</section>
  <section className="tr-group"><header><h2>资料和视频来源</h2></header>
   <ul className="tr-src">{sources.map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.name}<ExternalLink size={13}/></a><p>{s.what}</p></li>)}</ul></section>
 </>;

 const tabs:[Tab,string,ReactNode][]=[['main','主线',main],['cards','羁绊',cards],['trail','痕迹',trail]];
 const im=info?lit(info.id):null,v=info?.vids[Math.min(pick,info.vids.length-1)];
 const mark=(on:boolean)=>{if(!info)return;if(info.part){if(!!lit(info.id)!==on)flipPart(info.part,info.id)}else setMarks(info.ids,on)};
 return <div className="screen" data-kind="trace">
  <header className="screen-head"><button className="back" onClick={onBack} aria-label="回到桌面"><ChevronLeft size={22}/></button>
   <div><h1>痕迹</h1><p>补上 {done} 条 · 共 {units.length} 条</p></div></header>
  <div className="screen-body">
   <div className="seg seg3" role="tablist">{tabs.map(([k,name])=><button key={k} role="tab" aria-selected={tab===k} aria-pressed={tab===k} onClick={()=>setTab(k)}>{name}</button>)}</div>
   <div className="tr-body" key={tab}>{tabs.find(t=>t[0]===tab)![2]}</div>
  </div>
  {info&&<Sheet title={info.title} onClose={()=>setInfo(null)} wide>
   <p className="tr-sheet-sub">{info.sub}</p>
   {v?<>
    {info.vids.length>1&&<div className="seg tr-pick">{info.vids.map((x,i)=><button key={x.label} aria-pressed={pick===i} onClick={()=>setPick(i)}>{x.label}</button>)}</div>}
    <div className="tr-player"><iframe key={v.embed} src={v.embed} title={info.title} allow="fullscreen; picture-in-picture" allowFullScreen/></div>
    <p className="tr-credit"><span>{v.by?'视频来自 B站 UP 主 '+v.by:'视频来自 B站'}</span><a href={v.page} target="_blank" rel="noreferrer">在 B站打开<ExternalLink size={13}/></a></p>
   </>:<p className="tr-note">这一条还没找到现成的剧情视频，可以直接去搜。</p>}
   <div className="tr-find"><span>{v?'换个地方找':'去搜'}</span>{finders(info.q).map(([name,url])=><a key={name} href={url} target="_blank" rel="noreferrer">{name}</a>)}</div>
   <div className="tr-sheet-act">
    {im?<button className="ghost" onClick={()=>mark(false)}><Undo2 size={16}/>取消点亮</button>:<button className="primary" onClick={()=>{mark(true);toast('补上了：'+info.title)}}><Sun size={16}/>看完了，点亮</button>}
    <button className="ghost" onClick={()=>{const at=im?.at||new Date().toLocaleDateString('sv');addRecord('story',{title:info.title,when:info.when,link:v?.page,extra:{type:info.type,status:'看过了',seen:at}},true);if(!im)mark(true);setInfo(null);toast('已放进「剧情」，可以去补感想和截图')}}><PenLine size={16}/>写成一条剧情记录</button>
   </div>
   {im&&<label className="field tr-date"><span>补上的日子</span><input type="date" value={im.at} onChange={e=>{if(e.target.value)setMarks(info.part?[info.id]:info.ids.filter(id=>id===info.id||lit(id)),true,e.target.value)}}/></label>}
  </Sheet>}
 </div>}
