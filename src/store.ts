// Everything the site remembers. It lives in this browser (IndexedDB) and, once connected,
// in the owner's private GitHub repository: data/state.json plus one file per picture or recording.
import {useSyncExternalStore} from 'react';

export type Kind='story'|'moment'|'call'|'card'|'fan'|'quote'|'day';
export type Rec={id:string;kind:Kind;title:string;when:string;note:string;tags:string[];images:string[];audio?:string;link?:string;
 extra:Record<string,string|number>;order:number;fav:boolean;deleted?:boolean;created:number;updated:number};
export type Sticker={id:string;art:string;asset?:string;x:number;y:number;size:number;rot:number};
export type Home={wallpaper?:string;avatar?:string;stickers:Sticker[];updated:number};
export type Settings={theme:'day'|'night';me:string;updated:number};
export type Mark={at:string;updated:number;off?:boolean};
export type State={version:1;records:Rec[];home:Home;settings:Settings;marks:Record<string,Mark>};
export type SyncInfo={state:'local'|'idle'|'syncing'|'error';message:string;at:number};

const DB='kiro-phone',STORE='kv';
let dbp:Promise<IDBDatabase>|null=null;
const db=()=>dbp||(dbp=new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}));
const tx=async<T>(mode:IDBTransactionMode,run:(s:IDBObjectStore)=>IDBRequest<T>)=>{const d=await db();return new Promise<T>((res,rej)=>{const q=run(d.transaction(STORE,mode).objectStore(STORE));q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})};
const get=<T,>(k:string)=>tx<T|undefined>('readonly',s=>s.get(k));
const put=(k:string,v:unknown)=>tx('readwrite',s=>s.put(v,k));
const del=(k:string)=>tx('readwrite',s=>s.delete(k));
const keys=()=>tx<IDBValidKey[]>('readonly',s=>s.getAllKeys());

export const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const defaultStickers=():Sticker[]=>[['sun',13,11,70,-8],['star',87,12,48,12],['sparkle',33,8,28,0],['rabbit',24,52,96,-8],['bear',73,55,116,6],['chips',49,62,58,10],['heart',50,45,36,-8],['daisy',90,40,42,-10],['mic',10,39,50,-14]].map(([art,x,y,size,rot],i)=>({id:'d'+i,art:art as string,x:x as number,y:y as number,size:size as number,rot:rot as number}));
export const emptyState=():State=>({version:1,records:[{id:'seed-birthday',kind:'day',title:'周棋洛的生日',when:'',note:'',tags:[],images:[],extra:{date:'04-09',repeat:'每年'},order:0,fav:false,created:0,updated:0}],home:{stickers:defaultStickers(),updated:0},settings:{theme:'day',me:'',updated:0},marks:{}});

let state:State=emptyState(),ready=false,sync:SyncInfo={state:'local',message:'只保存在这台设备上',at:0};
const subs=new Set<()=>void>();
let snap={state,ready,sync};
const emit=()=>{snap={state,ready,sync};subs.forEach(f=>f())};
export function useStore(){return useSyncExternalStore(f=>{subs.add(f);return()=>subs.delete(f)},()=>snap,()=>snap)}
export const getState=()=>state;

const KINDS=['story','moment','call','card','fan','quote','day'];
// The After Class site also has records of kind "story"; its records carry a revision and a text timestamp.
const ours=(r:unknown)=>{const o=r as Record<string,unknown>|null;return !!o&&typeof o.id==='string'&&KINDS.includes(o.kind as string)&&!('revision' in o)&&typeof o.updated!=='string'};
const clean=(s:Partial<State>|undefined):State=>{const e=emptyState();if(!s||typeof s!=='object')return e;
 return {version:1,records:Array.isArray(s.records)?s.records.filter(ours).map(r=>({...r,tags:r.tags||[],images:r.images||[],extra:r.extra||{},note:r.note||'',when:r.when||'',title:r.title||''})):[],
  home:{...e.home,...(s.home||{}),stickers:Array.isArray(s.home?.stickers)?s.home!.stickers:e.home.stickers},settings:{...e.settings,...(s.settings||{})},marks:s.marks&&typeof s.marks==='object'?s.marks:{}}};

let saveTimer=0,pushTimer=0;
function commit(next:State){state=next;emit();clearTimeout(saveTimer);saveTimer=window.setTimeout(()=>put('state',state).catch(()=>{}),120);clearTimeout(pushTimer);pushTimer=window.setTimeout(()=>syncNow().catch(()=>{}),2500)}

// ── records ──
export const live=(kind:Kind)=>state.records.filter(r=>r.kind===kind&&!r.deleted).sort((a,b)=>a.order-b.order);
export function addRecord(kind:Kind,patch:Partial<Rec>,end=false){const same=state.records.filter(r=>r.kind===kind&&!r.deleted),orders=same.map(r=>r.order),now=Date.now();
 const rec:Rec={id:uid(),kind,title:'',when:'',note:'',tags:[],images:[],extra:{},fav:false,created:now,updated:now,...patch,order:same.length?(end?Math.max(...orders)+1:Math.min(...orders)-1):0};
 commit({...state,records:[...state.records,rec]});return rec}
export function updateRecord(id:string,patch:Partial<Rec>){commit({...state,records:state.records.map(r=>r.id===id?{...r,...patch,updated:Date.now()}:r)})}
export function removeRecord(id:string){updateRecord(id,{deleted:true})}
export function restoreRecord(id:string){updateRecord(id,{deleted:false})}
export function purgeRecord(id:string){const r=state.records.find(x=>x.id===id);if(!r)return;
 // keep a bare tombstone so other devices drop it too
 commit({...state,records:state.records.map(x=>x.id===id?{...x,title:'',note:'',images:[],audio:undefined,link:undefined,tags:[],extra:{purged:1},deleted:true,updated:Date.now()}:x)})}
// Put `id` just before/after `target` in its own list.
export function moveRecord(id:string,target:string,after:boolean){const me=state.records.find(r=>r.id===id);if(!me||id===target)return;
 const list=live(me.kind).filter(r=>r.id!==id),at=list.findIndex(r=>r.id===target);if(at<0)return;list.splice(at+(after?1:0),0,me);
 const pos=new Map(list.map((r,i)=>[r.id,i])),now=Date.now();
 commit({...state,records:state.records.map(r=>pos.has(r.id)&&r.order!==pos.get(r.id)?{...r,order:pos.get(r.id)!,updated:now}:r)})}
export function setHome(patch:Partial<Home>){commit({...state,home:{...state.home,...patch,updated:Date.now()}})}
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
// Lighting a catalogue entry. Unlighting keeps a tombstone so another device does not light it again.
export function setMarks(ids:string[],on:boolean,at?:string){const now=Date.now(),marks={...state.marks};for(const id of ids){const old=marks[id];if(on)marks[id]={at:at||(old&&!old.off?old.at:today()),updated:now};else if(old&&!old.off)marks[id]={at:old.at,updated:now,off:true}}commit({...state,marks})}
export function setSettings(patch:Partial<Settings>){commit({...state,settings:{...state.settings,...patch,updated:Date.now()}})}

// ── pictures and recordings ──
type Asset={blob:Blob;type:string;name:string};
const urls=new Map<string,string>(),waiting=new Map<string,Promise<string>>();
export async function saveAsset(blob:Blob,name=''){const id=uid()+(/\.(\w{2,5})$/.exec(name)?.[0]||'');await put('asset:'+id,{blob,type:blob.type,name} satisfies Asset);await markDirty(id);return id}
export function assetUrl(id:string):Promise<string>{if(urls.has(id))return Promise.resolve(urls.get(id)!);if(waiting.has(id))return waiting.get(id)!;
 const p=(async()=>{let a=await get<Asset>('asset:'+id);if(!a){const b=await fetchAsset(id);if(b){a={blob:b,type:b.type,name:id};await put('asset:'+id,a)}}if(!a)return '';const u=URL.createObjectURL(a.blob);urls.set(id,u);return u})();
 waiting.set(id,p);p.finally(()=>waiting.delete(id));return p}
export const assetBlob=async(id:string)=>(await get<Asset>('asset:'+id))?.blob||await fetchAsset(id);
async function markDirty(id:string){const d=(await get<string[]>('dirty'))||[];if(!d.includes(id))await put('dirty',[...d,id])}

// Shrink big photos so they travel well; keep transparency for cut-outs.
export async function prepareImage(file:Blob,max=2400):Promise<Blob>{if(!file.type.startsWith('image/')||file.type==='image/gif'||file.type==='image/svg+xml')return file;
 try{const bmp=await createImageBitmap(file),scale=Math.min(1,max/Math.max(bmp.width,bmp.height));if(scale===1&&file.size<1_600_000)return file;
  const c=document.createElement('canvas');c.width=Math.round(bmp.width*scale);c.height=Math.round(bmp.height*scale);c.getContext('2d')!.drawImage(bmp,0,0,c.width,c.height);
  const alpha=file.type==='image/png'||file.type==='image/webp';return await new Promise<Blob>(res=>c.toBlob(b=>res(b&&b.size<file.size?b:file),alpha?'image/webp':'image/jpeg',.9))}catch{return file}}

// ── GitHub ──
export type Remote={owner:string;repo:string;token:string};
let remote:Remote|null=null;
const api=(path:string,init:RequestInit={},raw=false)=>fetch(`https://api.github.com/repos/${remote!.owner}/${remote!.repo}/contents/${path}`,{cache:'no-store',...init,headers:{Authorization:`Bearer ${remote!.token}`,Accept:raw?'application/vnd.github.raw+json':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(init.headers||{})}});
const b64=(buf:ArrayBuffer)=>{let s='';const u=new Uint8Array(buf);for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode(...u.subarray(i,i+0x8000));return btoa(s)};
const utf8=(s:string)=>b64(new TextEncoder().encode(s).buffer as ArrayBuffer);
async function fetchAsset(id:string){if(!remote)return null;try{const r=await api('assets/'+encodeURIComponent(id),{},true);return r.ok?await r.blob():null}catch{return null}}
// On a tie the copy already in the repository wins, so every device settles on the same one.
// (Taking the local copy on a tie made two devices overwrite each other's untouched defaults forever.)
const newer=<T extends {updated:number}>(a:T,b:T|undefined)=>!b||a.updated>b.updated?a:b;
export function merge(mine:State,theirs:State):State{const by=new Map(theirs.records.map(r=>[r.id,r]));for(const r of mine.records)by.set(r.id,newer(r,by.get(r.id)));
 const marks:Record<string,Mark>={...theirs.marks};for(const k in mine.marks)marks[k]=newer(mine.marks[k],marks[k]);
 return {version:1,records:[...by.values()],home:newer(mine.home,theirs.home),settings:newer(mine.settings,theirs.settings),marks}}
// Two devices hold the same data with different key and record order; compare without it.
const canon=(s:State)=>{const sort=(v:unknown):unknown=>Array.isArray(v)?v.map(sort):v&&typeof v==='object'?Object.fromEntries(Object.keys(v as object).sort().map(k=>[k,sort((v as Record<string,unknown>)[k])])):v;
 return JSON.stringify(sort({...s,records:[...s.records].sort((a,b)=>a.id<b.id?-1:1)}))};
// This file layout (data/state.json) is shared with the After Class site. Writing into that site's repository
// replaces its data, so a file that is not ours is never merged and never written.
const FOREIGN='这个仓库里存的是另一个网站的数据，不能用来同步 🐻。请把仓库名改成 kiro-data，并使用为它生成的令牌。';
const foreign=(j:unknown)=>{if(!j||typeof j!=='object')return true;const o=j as Record<string,unknown>;if(o.app)return o.app!=='kiro-phone';
 return !Array.isArray(o.records)||(o.records as unknown[]).some(r=>!ours(r))||'chronology' in o||'wall' in o||'gone' in o};
class ForeignRepo extends Error{}
const setSync=(s:SyncInfo['state'],message:string)=>{sync={state:s,message,at:Date.now()};emit()};
let running:Promise<void>|null=null,again=false;
export function syncNow(quiet=false):Promise<void>{if(!remote)return Promise.resolve();if(running){again=true;return running}
 running=(async()=>{if(!quiet)setSync('syncing','正在同步…');try{let saved=false;
   for(let attempt=0;attempt<4&&!saved;attempt++){
    const head=await api('data/state.json');let sha:string|undefined,theirs:State|null=null;
    if(head.status===200){const j=await head.json();sha=j.sha;
     // small files come back inline; that keeps the text and its sha from the same moment
     const text=j.content?new TextDecoder().decode(Uint8Array.from(atob(String(j.content).replace(/\s/g,'')),c=>c.charCodeAt(0))):await (await api('data/state.json',{},true)).text();const parsed=JSON.parse(text);if(foreign(parsed))throw new ForeignRepo();theirs=clean(parsed)}
    else if(head.status!==404)throw new Error(head.status===401?'令牌失效了，请在设置里重新填写':head.status===403?'令牌没有这个仓库的读写权限':'读取失败（'+head.status+'）');
    const merged=theirs?merge(state,theirs):state,changedHere=canon(merged)!==canon(state);
    if(changedHere){state=merged;await put('state',state);emit()}
    const dirty=(await get<string[]>('dirty'))||[];
    for(const id of dirty){const a=await get<Asset>('asset:'+id);if(a){const r=await api('assets/'+encodeURIComponent(id),{method:'PUT',body:JSON.stringify({message:'add '+id,content:b64(await a.blob.arrayBuffer())})});if(!r.ok&&r.status!==422)throw new Error('有一个文件没传上去（'+r.status+'）')}
     await put('dirty',((await get<string[]>('dirty'))||[]).filter(x=>x!==id))}
    if(theirs&&canon(merged)===canon(theirs)){saved=true;break}
    const w=await api('data/state.json',{method:'PUT',body:JSON.stringify({message:'sync',content:utf8(JSON.stringify({app:'kiro-phone',...merged})),sha})});
    if(w.ok)saved=true;else if(w.status!==409&&w.status!==422)throw new Error('保存失败（'+w.status+'）')}
   if(!saved)throw new Error('另一台设备正在同时保存，过一会儿会再试');
   setSync('idle','已同步')}catch(e){if(e instanceof ForeignRepo){remote=null;await del('remote').catch(()=>{});setSync('error','已停止同步：'+FOREIGN)}else setSync('error',(e as Error).message||'同步失败，稍后会再试')}})().finally(()=>{running=null;if(again){again=false;syncNow().catch(()=>{})}});
 return running}
export async function connect(r:Remote){const probe=await fetch(`https://api.github.com/repos/${r.owner}/${r.repo}`,{headers:{Authorization:`Bearer ${r.token}`,Accept:'application/vnd.github+json'}});
 if(probe.status===401)throw new Error('令牌不对，或已经过期');if(probe.status===404)throw new Error('找不到这个仓库，或令牌没有选中它');if(!probe.ok)throw new Error('连接失败（'+probe.status+'）');
 const j=await probe.json();if(!j.permissions?.push)throw new Error('令牌只有读取权限，需要 Contents: Read and write');if(!j.private)throw new Error('这个仓库是公开的。为了不让内容被别人看到，请换一个私有仓库');
 const has=await fetch(`https://api.github.com/repos/${r.owner}/${r.repo}/contents/data/state.json`,{cache:'no-store',headers:{Authorization:`Bearer ${r.token}`,Accept:'application/vnd.github.raw+json'}});
 if(has.ok){let j:unknown=null;try{j=await has.json()}catch{}if(foreign(j))throw new Error(FOREIGN)}
 remote=r;await put('remote',r);await syncNow()}
// The connection can be carried to another device as one string, so the token never has to be found and typed again.
export const linkCode=()=>remote?'kiro1.'+btoa(JSON.stringify([remote.owner,remote.repo,remote.token])):'';
export const readLinkCode=(code:string):Remote|null=>{try{const m=/kiro1\.([A-Za-z0-9+/=]+)/.exec(code);if(!m)return null;const [owner,repo,token]=JSON.parse(atob(m[1]));return owner&&repo&&token?{owner,repo,token}:null}catch{return null}};
export async function disconnect(){remote=null;await del('remote');setSync('local','只保存在这台设备上')}
export const getRemote=()=>remote?{owner:remote.owner,repo:remote.repo}:null;

// ── backup ──
export async function exportBackup(){const used=new Set<string>();for(const r of state.records){r.images.forEach(i=>used.add(i));if(r.audio)used.add(r.audio)}if(state.home.wallpaper)used.add(state.home.wallpaper);if(state.home.avatar)used.add(state.home.avatar);state.home.stickers.forEach(s=>s.asset&&used.add(s.asset));
 const assets:Record<string,{type:string;data:string}>={};for(const id of used){const b=await assetBlob(id);if(b)assets[id]={type:b.type,data:b64(await b.arrayBuffer())}}
 return new Blob([JSON.stringify({app:'kiro-phone',exported:new Date().toISOString(),state,assets})],{type:'application/json'})}
export async function importBackup(file:Blob){const j=JSON.parse(await file.text());if(j.app!=='kiro-phone'||!j.state)throw new Error('这不是这个网站导出的备份');
 let added=0;for(const [id,a] of Object.entries(j.assets||{}) as [string,{type:string;data:string}][]){if(await get('asset:'+id))continue;const bin=atob(a.data),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);await put('asset:'+id,{blob:new Blob([u],{type:a.type}),type:a.type,name:id});await markDirty(id);added++}
 const before=state.records.length;commit(merge(state,clean(j.state)));return {records:state.records.length-before,assets:added}}

export async function boot(){try{const s=await get<State>('state');if(s)state=clean(s);remote=(await get<Remote>('remote'))||null;if(remote)sync={state:'idle',message:'已连接',at:0}}catch{}
 ready=true;emit();if(remote)syncNow().catch(()=>{});
 window.addEventListener('online',()=>syncNow().catch(()=>{}));document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')syncNow().catch(()=>{})});
 // the other device may be in use right now: look for its changes while this one is on screen
 setInterval(()=>{if(remote&&document.visibilityState==='visible'&&navigator.onLine!==false)syncNow(true).catch(()=>{})},20000);
 // so the last keystrokes are not lost when the tab closes
 window.addEventListener('pagehide',()=>{put('state',state).catch(()=>{})});
 void keys}
