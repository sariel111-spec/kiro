import {useMemo,useState,type ReactNode} from 'react';
import {ChevronLeft,ChevronDown,Sun,Ellipsis,PenLine,ExternalLink,Undo2} from 'lucide-react';
import {useStore,setMarks,addRecord,type Mark} from './store';
import {seasons,dated,storyCards,rCards,sources,datedThrough,type Chapter} from './catalog';
import {Sheet,toast} from './ui';

type Tab='main'|'cards'|'trail';
type Info={id:string;title:string;sub:string;kind:'story'|'card';when:string;ids:string[]};
const dot=(d:string)=>d.replace(/-/g,'.');
const short=(d:string)=>d.slice(5).replace('-','.');
const partIds=(c:Chapter)=>[...(c.stages||[]).map(s=>c.id+'.'+s),...(c.extras||[]).map((_,i)=>c.id+'.x'+i)];
const hisCount=(c:Chapter)=>(c.stages?.length||0)+(c.extras?.length||0);
const isHis=(c:Chapter)=>hisCount(c)>0||!!c.kiro;
const yearOf=(d:string)=>d.slice(0,4);
const rars=['全部','UR','SP','SSR','SR','ER'];
const chapters=seasons.flatMap(s=>s.groups.flatMap(g=>g.chapters.map(c=>({c,g,s}))));
// Everything that counts toward the total. Single stages are steps inside a chapter, not entries of their own.
const units=[...chapters.map(x=>x.c.id),...dated.map(x=>x.id),...storyCards.map(x=>x.id),...rCards.map(x=>x.id)];
const unitSet=new Set(units);
const labels=new Map<string,string>();
for(const {c,s} of chapters){const base=s.name+' '+c.n+(c.title?' '+c.title:'');labels.set(c.id,base);
 (c.stages||[]).forEach(st=>labels.set(c.id+'.'+st,s.name+' '+(c.num??c.n)+'-'+st));(c.extras||[]).forEach((e,i)=>labels.set(c.id+'.x'+i,s.name+' '+c.n+' · '+e))}
for(const d of dated)labels.set(d.id,d.name+(d.meet&&d.meet!==d.name?' · '+d.meet:''));
for(const k of storyCards)labels.set(k.id,k.name);for(const r of rCards)labels.set(r.id,r.name);

function Toggle({on,onClick,label}:{on:boolean;onClick:()=>void;label:string}){
 return <button className="tr-sun" aria-pressed={on} aria-label={(on?'取消点亮：':'点亮：')+label} onClick={onClick}><Sun size={18}/></button>}

export default function Trace({onBack}:{onBack:()=>void}){
 const {state}=useStore(),marks=state.marks;
 const [tab,setTab]=useState<Tab>('main'),[season,setSeason]=useState('s1'),[hisOnly,setHisOnly]=useState(false),[open,setOpen]=useState<string|null>(null);
 const [rar,setRar]=useState('全部'),[todo,setTodo]=useState(false),[info,setInfo]=useState<Info|null>(null);
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
  </div>
  {cur.groups.map(g=>{const list=g.chapters.filter(c=>!hisOnly||isHis(c));if(!list.length)return null;const n=g.chapters.filter(c=>lit(c.id)).length;
   return <section key={g.id} className="tr-group">
    <header><h2>{g.name}</h2><span>{dot(g.date)}</span><em>{n}/{g.chapters.length}</em></header>
    <ol className="tr-list">{list.map(c=>{const m=lit(c.id),parts=partIds(c),got=parts.filter(p=>lit(p)).length,cnt=hisCount(c),isOpen=open===c.id;
     return <li key={c.id} className={`tr-row ${m?'lit':''} ${c.special?'special':''}`}>
      <Toggle on={!!m} onClick={()=>flipChapter(c)} label={c.n}/>
      <div className="tr-main">
       <button className="tr-title" onClick={()=>parts.length?setOpen(isOpen?null:c.id):setInfo({id:c.id,title:c.n+(c.title?' '+c.title:''),sub:cur.name+' · '+g.name,kind:'story',when:cur.name+' '+c.n,ids:[c.id,...parts]})} aria-expanded={parts.length?isOpen:undefined}>
        <b>{c.n}</b><span>{c.title||(c.special?'':'章节名待补')}</span>
        {cnt>0&&<i className={cnt>=8?'much':''}>{got>0?`他的 ${got}/${cnt}`:`他出场 ${cnt} 处`}</i>}{cnt===0&&c.kiro&&<i>有他</i>}
        {parts.length>0&&<ChevronDown size={16} className="tr-chev"/>}
       </button>
       {m&&<p className="tr-at">补于 {dot(m.at)}</p>}
       {isOpen&&<div className="tr-parts">
        {c.note&&<p>{c.note}</p>}
        <div>{(c.stages||[]).map(st=><button key={st} aria-pressed={!!lit(c.id+'.'+st)} onClick={()=>flipPart(c,c.id+'.'+st)}>{c.num??''}-{st}</button>)}
         {(c.extras||[]).map((e,i)=><button key={e} className="wide" aria-pressed={!!lit(c.id+'.x'+i)} onClick={()=>flipPart(c,c.id+'.x'+i)}>{e}</button>)}</div>
        <button className="tr-more" onClick={()=>setInfo({id:c.id,title:c.n+(c.title?' '+c.title:''),sub:cur.name+' · '+g.name,kind:'story',when:cur.name+' '+c.n,ids:[c.id,...parts]})}><Ellipsis size={16}/>改日期 / 写成记录</button>
       </div>}
      </div>
     </li>})}</ol>
   </section>})}
  {season==='s3'&&<p className="tr-note">第 9–12 章的章节名还没查到，第 10–12 章他出场的关卡也只抄到一部分。</p>}
 </>;

 const years=useMemo(()=>[...new Set(dated.map(d=>yearOf(d.date)))],[]);
 const pass=(r:string,id:string)=>(rar==='全部'||r===rar)&&(!todo||!lit(id));
 const cards=<>
  <div className="tr-tools"><div className="chips">{rars.map(r=><button key={r} aria-pressed={rar===r} onClick={()=>setRar(r)}>{r}</button>)}<button aria-pressed={todo} onClick={()=>setTodo(!todo)}>只看没补的</button></div></div>
  {years.map(y=>{const all=dated.filter(d=>yearOf(d.date)===y),list=all.filter(d=>pass(d.rar,d.id));if(!list.length)return null;
   return <section key={y} className="tr-group">
    <header><h2>{y}</h2><span>{all.length} 张有约会的羁绊</span><em>{all.filter(d=>lit(d.id)).length}/{all.length}</em></header>
    <ol className="tr-list">{list.map(d=>{const m=lit(d.id),own=d.meet===d.name;
     return <li key={d.id} className={`tr-row ${m?'lit':''}`}>
      <Toggle on={!!m} onClick={()=>flip([d.id],!m,d.name)} label={d.name}/>
      <div className="tr-main"><button className="tr-title kb" onClick={()=>setInfo({id:d.id,title:d.name,sub:[d.rar,own?'':d.meet,d.via,dot(d.date)+' 上线'].filter(Boolean).join(' · '),kind:'card',when:dot(d.date)+' · '+d.via,ids:[d.id]})}>
       <em data-r={d.rar}>{d.rar}</em><span>{d.name}{d.q&&<small>名字待核</small>}</span><time>{short(d.date)}</time></button>
       <p className="tr-sub">{own?'':d.meet+' · '}{d.via}</p>{m&&<p className="tr-at">补于 {dot(m.at)}</p>}</div>
     </li>})}</ol>
   </section>})}
  {(()=>{const list=storyCards.filter(k=>pass(k.rar,k.id));if(!list.length)return null;
   return <section className="tr-group"><header><h2>主线配套</h2><span>跟着主线出的羁绊，大多带一段传闻秘事</span><em>{storyCards.filter(k=>lit(k.id)).length}/{storyCards.length}</em></header>
    <ol className="tr-list">{list.map(k=>{const m=lit(k.id);return <li key={k.id} className={`tr-row ${m?'lit':''}`}>
     <Toggle on={!!m} onClick={()=>flip([k.id],!m,k.name)} label={k.name}/>
     <div className="tr-main"><button className="tr-title kb" onClick={()=>setInfo({id:k.id,title:k.name,sub:[k.rar,k.rumor?'传闻秘事「'+k.rumor+'」':''].filter(Boolean).join(' · '),kind:'card',when:'主线配套',ids:[k.id]})}>
      <em data-r={k.rar}>{k.rar}</em><span>{k.name}{k.q&&<small>位置待核</small>}</span></button>
      {k.rumor&&<p className="tr-sub">传闻秘事「{k.rumor}」</p>}{m&&<p className="tr-at">补于 {dot(m.at)}</p>}</div></li>})}</ol></section>})()}
  {(rar==='全部')&&<section className="tr-group"><header><h2>R 卡</h2><span>没有单独的约会，前 {rCards.filter(r=>!r.q).length} 张按上线先后排</span><em>{rCards.filter(r=>lit(r.id)).length}/{rCards.length}</em></header>
   <div className="tr-parts loose"><div>{rCards.filter(r=>!todo||!lit(r.id)).map(r=><button key={r.id} className="wide" aria-pressed={!!lit(r.id)} onClick={()=>flip([r.id],!lit(r.id),r.name)}>{r.name}</button>)}</div></div></section>}
  <p className="tr-note">有约会的羁绊整理到 {dot(datedThrough)}，之后上线的还没收进来。</p>
 </>;

 const rows=useMemo(()=>{const by=new Map<string,{id:string;kind:'ch'|'card'}[]>();const put=(y:string,v:{id:string;kind:'ch'|'card'})=>{if(!by.has(y))by.set(y,[]);by.get(y)!.push(v)};
  for(const {c,g} of chapters)put(yearOf(g.date),{id:c.id,kind:'ch'});for(const d of dated)put(yearOf(d.date),{id:d.id,kind:'card'});return [...by.entries()].sort((a,b)=>a[0].localeCompare(b[0]))},[]);
 const days=useMemo(()=>{const by=new Map<string,string[]>();for(const id in marks){const m=marks[id];if(!m||m.off||!labels.has(id))continue;if(!by.has(m.at))by.set(m.at,[]);by.get(m.at)!.push(id)}
  return [...by.entries()].sort((a,b)=>b[0].localeCompare(a[0])).slice(0,30)},[marks]);
 const trail=<>
  <section className="tr-sum"><p><b>{done}</b><span>/ {units.length} 条已经补上</span></p><div className="tr-bar"><i style={{width:(done/units.length*100).toFixed(2)+'%'}}/></div>
   <small>主线 {chapters.filter(x=>lit(x.c.id)).length}/{chapters.length} · 约会羁绊 {dated.filter(d=>lit(d.id)).length}/{dated.length} · 主线配套 {storyCards.filter(k=>lit(k.id)).length}/{storyCards.length} · R 卡 {rCards.filter(r=>lit(r.id)).length}/{rCards.length}</small></section>
  <section className="tr-group"><header><h2>这些年</h2><span>方块是主线章节，圆点是羁绊，按上线先后排</span></header>
   <div className="tr-years">{rows.map(([y,list])=>{const n=list.filter(v=>lit(v.id)).length;return <div key={y} className="tr-year"><b>{y}</b><p>{list.map(v=><i key={v.id} className={`${v.kind} ${lit(v.id)?'on':''}`} title={labels.get(v.id)}/>)}</p><em>{n}/{list.length}</em></div>})}</div></section>
  <section className="tr-group"><header><h2>最近补上的</h2></header>
   {days.length?<ol className="tr-days">{days.map(([d,ids])=>{const big=ids.filter(id=>unitSet.has(id)),small=ids.length-big.length;return <li key={d}><time>{dot(d)}</time><p>{big.slice(0,12).map(id=>labels.get(id)).join('、')}{big.length>12?` 等 ${big.length} 条`:''}{small>0&&<span>{big.length?'，另外':''}看了 {small} 处他出场的关卡</span>}</p></li>})}</ol>
   :<p className="tr-note">还没有点亮的条目。去「主线」或「羁绊」里点一下名字前面的小太阳，这里就会记下是哪一天补上的。</p>}</section>
  <section className="tr-group"><header><h2>资料来源</h2></header>
   <ul className="tr-src">{sources.map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.name}<ExternalLink size={13}/></a><p>{s.what}</p></li>)}</ul></section>
 </>;

 const tabs:[Tab,string,ReactNode][]=[['main','主线',main],['cards','羁绊',cards],['trail','痕迹',trail]];
 const im=info?lit(info.id):null;
 return <div className="screen" data-kind="trace">
  <header className="screen-head"><button className="back" onClick={onBack} aria-label="回到桌面"><ChevronLeft size={22}/></button>
   <div><h1>痕迹</h1><p>补上 {done} 条 · 共 {units.length} 条</p></div></header>
  <div className="screen-body">
   <div className="seg seg3" role="tablist">{tabs.map(([k,name])=><button key={k} role="tab" aria-selected={tab===k} aria-pressed={tab===k} onClick={()=>setTab(k)}>{name}</button>)}</div>
   <div className="tr-body" key={tab}>{tabs.find(t=>t[0]===tab)![2]}</div>
  </div>
  {info&&<Sheet title={info.title} onClose={()=>setInfo(null)}>
   <p className="tr-sheet-sub">{info.sub}</p>
   <label className="field"><span>补上的日子</span><input type="date" value={im?.at||''} onChange={e=>{if(e.target.value)setMarks(info.ids.filter(id=>id===info.id||lit(id)||!im),true,e.target.value)}}/></label>
   <div className="tr-sheet-act">
    <button className="primary" onClick={()=>{const at=im?.at||new Date().toLocaleDateString('sv');addRecord('story',{title:info.title,when:info.when,extra:{type:info.kind==='story'?'主线':'约会',status:'看过了',seen:at}},true);if(!im)setMarks(info.ids,true);setInfo(null);toast('已放进「剧情」，可以去补感想和截图')}}><PenLine size={16}/>写成一条剧情记录</button>
    {im&&<button className="ghost" onClick={()=>{setMarks(info.ids,false);setInfo(null)}}><Undo2 size={16}/>取消点亮</button>}
   </div>
  </Sheet>}
 </div>}
