import {useEffect,useRef,useState,type ReactNode} from 'react';
import {X,ChevronLeft,ChevronRight,ImagePlus,Mic,Trash2,ArrowLeft,ArrowRight,Loader2} from 'lucide-react';
import {assetUrl,saveAsset,prepareImage,addRecord,updateRecord,type Rec,type Kind} from './store';
import {kinds} from './kinds';

export function useAsset(id?:string){const [url,setUrl]=useState('');useEffect(()=>{let on=true;setUrl('');if(id)assetUrl(id).then(u=>{if(on)setUrl(u)});return()=>{on=false}},[id]);return url}
export function Img({id,alt='',className,onClick}:{id:string;alt?:string;className?:string;onClick?:()=>void}){const url=useAsset(id);
 return url?<img src={url} alt={alt} className={className} onClick={onClick} draggable={false} loading="lazy"/>:<span className={`img-wait ${className||''}`} aria-hidden="true"/>}

// ── a small voice for confirmations ──
let pushToast:(t:{text:string;undo?:()=>void})=>void=()=>{};
export const toast=(text:string,undo?:()=>void)=>pushToast({text,undo});
export function Toasts(){const [t,setT]=useState<{text:string;undo?:()=>void;n:number}|null>(null);
 useEffect(()=>{pushToast=x=>setT({...x,n:Date.now()})},[]);useEffect(()=>{if(!t)return;const id=setTimeout(()=>setT(null),t.undo?6000:2600);return()=>clearTimeout(id)},[t]);
 return t?<div className="toast" role="status" key={t.n}><span>{t.text}</span>{t.undo&&<button onClick={()=>{t.undo!();setT(null)}}>撤销</button>}</div>:null}

// ── pictures, full screen ──
export type Shown={images:string[];at:number}|null;
export function Lightbox({shown,onClose}:{shown:Shown;onClose:()=>void}){const [at,setAt]=useState(0),[zoom,setZoom]=useState(false),start=useRef<number|null>(null);
 useEffect(()=>{if(shown){setAt(shown.at);setZoom(false)}},[shown]);
 const n=shown?.images.length||0,go=(d:number)=>{setZoom(false);setAt(v=>Math.max(0,Math.min(n-1,v+d)))};
 useEffect(()=>{if(!shown)return;const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();if(e.key==='ArrowRight')go(1);if(e.key==='ArrowLeft')go(-1)};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)});
 if(!shown)return null;
 return <div className={`lightbox ${zoom?'zoomed':''}`} role="dialog" aria-modal="true" aria-label="查看图片" onClick={e=>{if(e.target===e.currentTarget)onClose()}}
   onTouchStart={e=>{start.current=e.touches[0].clientX}} onTouchEnd={e=>{if(zoom||start.current===null)return;const dx=e.changedTouches[0].clientX-start.current;start.current=null;if(Math.abs(dx)>60)go(dx<0?1:-1)}}>
  <button className="lb-close" onClick={onClose} aria-label="关闭"><X size={20}/></button>
  <div className="lb-stage" onClick={e=>{if(e.target===e.currentTarget)onClose()}}><Img key={shown.images[at]} id={shown.images[at]} onClick={()=>setZoom(z=>!z)}/></div>
  {n>1&&<><button className="lb-nav prev" disabled={at===0} onClick={()=>go(-1)} aria-label="上一张"><ChevronLeft size={22}/></button><button className="lb-nav next" disabled={at===n-1} onClick={()=>go(1)} aria-label="下一张"><ChevronRight size={22}/></button><span className="lb-count">{at+1} / {n}</span></>}
 </div>}

// ── a sheet that rises from the bottom ──
export function Sheet({title,onClose,children,wide}:{title:string;onClose:()=>void;children:ReactNode;wide?:boolean}){
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[onClose]);
 return <div className="sheet-shade" onPointerDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className={`sheet ${wide?'wide':''}`} role="dialog" aria-modal="true" aria-label={title}>
  <header><i aria-hidden="true"/><h2>{title}</h2><button onClick={onClose} aria-label="关闭"><X size={18}/></button></header><div className="sheet-body">{children}</div></section></div>}

// ── add or edit one record ──
export function Editor({kind,rec,onClose}:{kind:Kind;rec?:Rec;onClose:()=>void}){const def=kinds[kind];
 const [title,setTitle]=useState(rec?.title||''),[when,setWhen]=useState(rec?.when||''),[note,setNote]=useState(rec?.note||''),[link,setLink]=useState(rec?.link||''),[tags,setTags]=useState((rec?.tags||[]).join('，'));
 const [extra,setExtra]=useState<Record<string,string|number>>(rec?.extra||Object.fromEntries(def.extras.filter(e=>e.options).map(e=>[e.key,e.options![0]])));
 const [images,setImages]=useState<string[]>(rec?.images||[]),[audio,setAudio]=useState(rec?.audio),[busy,setBusy]=useState(false),[each,setEach]=useState(true),[error,setError]=useState('');
 const pick=useRef<HTMLInputElement>(null),voice=useRef<HTMLInputElement>(null);
 const addFiles=async(files:FileList|null)=>{if(!files?.length)return;setBusy(true);setError('');try{const ids:string[]=[];for(const f of Array.from(files)){if(!f.type.startsWith('image/'))continue;ids.push(await saveAsset(await prepareImage(f),f.name))}setImages(v=>def.images?.single?ids.slice(0,1):[...v,...ids])}catch{setError('有图片没能读进来，再试一次')}finally{setBusy(false);if(pick.current)pick.current.value=''}};
 const addVoice=async(files:FileList|null)=>{const f=files?.[0];if(!f)return;if(f.size>20*1024*1024){setError('录音超过 20MB 了，同步不动。可以先压缩，或者只放链接');return}setBusy(true);try{setAudio(await saveAsset(f,f.name))}finally{setBusy(false)}};
 const shift=(i:number,d:number)=>setImages(v=>{const a=[...v],j=i+d;if(j<0||j>=a.length)return v;[a[i],a[j]]=[a[j],a[i]];return a});
 const save=()=>{if(def.title?.required&&!title.trim())return setError(`先写上${def.title.label}`);if(def.note?.required&&!note.trim())return setError(`先写上${def.note.label}`);if(def.images?.required&&!images.length&&kind!=='moment')return setError(`先放一张${def.images.label}`);
  if(kind==='moment'&&!images.length&&!note.trim())return setError('放一张截图，或者写一句配文');
  const base={title:title.trim(),when:when.trim(),note:note.trim(),link:link.trim()||undefined,tags:tags.split(/[,，\s]+/).map(t=>t.replace(/^#/,'').trim()).filter(Boolean).slice(0,12),extra,audio};
  if(rec)updateRecord(rec.id,{...base,images});
  else if(kind==='moment'&&each&&images.length>1)[...images].reverse().forEach(id=>addRecord(kind,{...base,images:[id]}));
  else addRecord(kind,{...base,images},kind==='story');
  onClose()};
 return <Sheet title={rec?'修改':def.add} onClose={onClose}><form className="editor" onSubmit={e=>{e.preventDefault();save()}}>
  {def.images&&<div className="field"><span>{def.images.label}</span><div className="thumbs">{images.map((id,i)=><figure key={id}><Img id={id}/><figcaption>{images.length>1&&<><button type="button" onClick={()=>shift(i,-1)} disabled={i===0} aria-label="往前"><ArrowLeft size={13}/></button><button type="button" onClick={()=>shift(i,1)} disabled={i===images.length-1} aria-label="往后"><ArrowRight size={13}/></button></>}<button type="button" onClick={()=>setImages(v=>v.filter(x=>x!==id))} aria-label="拿掉这张"><Trash2 size={13}/></button></figcaption></figure>)}
    <button type="button" className="thumb-add" onClick={()=>pick.current?.click()} disabled={busy}>{busy?<Loader2 size={20} className="spin"/>:<ImagePlus size={22}/>}<small>{def.images.single?'选一张':'可以一次选很多张'}</small></button></div>
   <input ref={pick} type="file" accept="image/*" multiple={!def.images.single} hidden onChange={e=>addFiles(e.target.files)}/>
   {kind==='moment'&&!rec&&images.length>1&&<label className="check"><input type="checkbox" checked={each} onChange={e=>setEach(e.target.checked)}/>每张截图单独存成一条</label>}</div>}
  {def.title&&<label className="field"><span>{def.title.label}</span><input value={title} onChange={e=>setTitle(e.target.value)} placeholder={def.title.placeholder} maxLength={80}/></label>}
  {def.extras.length>0&&<div className="field-row">{def.extras.map(x=><label className="field" key={x.key}><span>{x.label}</span>{x.options?<select value={String(extra[x.key]??x.options[0])} onChange={e=>setExtra(v=>({...v,[x.key]:e.target.value}))}>{x.options.map(o=><option key={o}>{o}</option>)}</select>:<input type={x.type==='date'?'date':'text'} value={String(extra[x.key]??'')} placeholder={x.placeholder} onChange={e=>setExtra(v=>({...v,[x.key]:e.target.value}))}/>}</label>)}</div>}
  {def.when&&<label className="field"><span>{def.when.label}</span><input value={when} onChange={e=>setWhen(e.target.value)} placeholder={def.when.placeholder} maxLength={60}/></label>}
  {def.audio&&<div className="field"><span>录音</span>{audio?<div className="voice-row"><AudioPlayer id={audio}/><button type="button" onClick={()=>setAudio(undefined)} aria-label="拿掉录音"><Trash2 size={15}/></button></div>:<button type="button" className="ghost" onClick={()=>voice.current?.click()}><Mic size={15}/>放一段录音</button>}<input ref={voice} type="file" accept="audio/*,video/mp4" hidden onChange={e=>addVoice(e.target.files)}/></div>}
  {def.note&&<label className="field"><span>{def.note.label}</span><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder={def.note.placeholder} rows={kind==='quote'?3:5}/></label>}
  {def.link&&<label className="field"><span>{def.link.label}</span><input type="url" inputMode="url" value={link} onChange={e=>setLink(e.target.value)} placeholder={def.link.placeholder}/></label>}
  {kind!=='day'&&kind!=='quote'&&<label className="field"><span>标签</span><input value={tags} onChange={e=>setTags(e.target.value)} placeholder="用逗号或空格隔开"/></label>}
  {error&&<p className="form-error" role="alert">{error}</p>}
  <footer><button type="button" className="ghost" onClick={onClose}>取消</button><button type="submit" className="primary" disabled={busy}>{rec?'保存修改':'保存'}</button></footer>
 </form></Sheet>}

export function AudioPlayer({id}:{id:string}){const url=useAsset(id);return url?<audio controls src={url} preload="metadata"/>:<span className="img-wait audio-wait"/>}
