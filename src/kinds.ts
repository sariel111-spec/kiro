import type {Kind} from './store';
export type Extra={key:string;label:string;options?:string[];type?:'date'|'text';placeholder?:string};
export type KindDef={name:string;sub:string;add:string;title?:{label:string;placeholder:string;required?:boolean};when?:{label:string;placeholder:string};
 note?:{label:string;placeholder:string;required?:boolean};images?:{label:string;required?:boolean;single?:boolean};audio?:boolean;link?:{label:string;placeholder:string};
 extras:Extra[];filter?:string;empty:string};
export const kinds:Record<Kind,KindDef>={
 story:{name:'剧情',sub:'一段一段补回来的时间线',add:'记一段剧情',
  title:{label:'剧情名',placeholder:'例如：便利店的同一包薯片',required:true},when:{label:'在故事里的位置',placeholder:'例如：主线第 3 章 / 某张卡的约会'},
  note:{label:'摘抄和感想',placeholder:'想留住的台词、当时的心情…'},images:{label:'剧情截图'},link:{label:'录屏或原文链接',placeholder:'https://'},
  extras:[{key:'type',label:'类型',options:['主线','约会','活动','短篇','其他']},{key:'status',label:'进度',options:['看过了','正在补','想看']},{key:'seen',label:'哪天看的',type:'date'}],filter:'type',
  empty:'还没有记下任何剧情。从你最先看的那一段开始，之后随时可以拖动调整前后顺序。'},
 moment:{name:'朋友圈',sub:'他发过的，和你留的言',add:'存一条朋友圈',
  images:{label:'朋友圈截图'},note:{label:'配文（可不填）',placeholder:'想补一句说明就写在这里'},when:{label:'日期（可不填）',placeholder:'例如：情人节 / 2024.04.09'},
  extras:[],empty:'还没有朋友圈。把截图直接传进来就行，一次可以选很多张。'},
 call:{name:'通话',sub:'电话、短信和语音',add:'存一通',
  title:{label:'标题',placeholder:'例如：凌晨的来电',required:true},when:{label:'时间',placeholder:'例如：第 5 章之后'},images:{label:'截图'},audio:true,
  note:{label:'文字稿',placeholder:'把他说的话记下来…'},extras:[{key:'type',label:'类型',options:['通话','短信','语音','视频通话']}],filter:'type',
  empty:'还没有通话记录。可以放截图，也可以放录音。'},
 card:{name:'卡册',sub:'羁绊收藏',add:'收一张卡',
  title:{label:'卡名',placeholder:'这张羁绊的名字',required:true},images:{label:'卡面',required:true},when:{label:'得到的日子',placeholder:'例如：2024 生日池'},
  note:{label:'备注',placeholder:'抽了多少发、背后的故事…'},extras:[{key:'rarity',label:'稀有度',options:['R','SR','SSR','SP','UR','其他']}],filter:'rarity',
  empty:'卡册还是空的。把喜欢的卡面截图放进来。'},
 fan:{name:'同人',sub:'收藏的二创',add:'收一篇二创',
  title:{label:'标题',placeholder:'作品名或一句描述',required:true},images:{label:'图片'},link:{label:'出处链接',placeholder:'https://'},
  note:{label:'正文或感想',placeholder:'摘一段，或者写下喜欢它的理由'},extras:[{key:'type',label:'类型',options:['图','文','视频','其他']},{key:'author',label:'作者',type:'text',placeholder:'记得写上太太的名字'}],filter:'type',
  empty:'还没有收藏二创。记得写上作者和出处。'},
 quote:{name:'语录',sub:'想反复听的那几句',add:'记一句',
  note:{label:'这句话',placeholder:'他说的…',required:true},title:{label:'出处',placeholder:'哪段剧情、哪通电话'},extras:[],
  empty:'还没有语录。'},
 day:{name:'纪念日',sub:'数着日子',add:'加一个日子',
  title:{label:'这是什么日子',placeholder:'例如：入坑那天',required:true},note:{label:'备注',placeholder:''},
  extras:[{key:'date',label:'日期',type:'text',placeholder:'04-09 或 2024-04-09'},{key:'repeat',label:'重复',options:['每年','只这一次']}],
  empty:'还没有纪念日。'},
};
export const appOrder:Kind[]=['story','moment','call','card','fan','quote','day'];
// "04-09" or "2024-04-09" → how far away it is.
export function dayCount(date:string,repeat:string,now=new Date()){const m=/^(?:(\d{4})[-./])?(\d{1,2})[-./](\d{1,2})$/.exec((date||'').trim());if(!m)return null;
 const today=new Date(now.getFullYear(),now.getMonth(),now.getDate()),mo=+m[2]-1,d=+m[3],MS=86400000;
 if(repeat!=='只这一次'||!m[1]){let next=new Date(today.getFullYear(),mo,d);if(next<today)next=new Date(today.getFullYear()+1,mo,d);
  const left=Math.round((+next-+today)/MS),since=m[1]?Math.round((+today-+new Date(+m[1],mo,d))/MS):null;return {left,since,label:left===0?'就是今天':`还有 ${left} 天`}}
 const that=new Date(+m[1],mo,d),diff=Math.round((+that-+today)/MS);return {left:diff,since:-diff,label:diff===0?'就是今天':diff>0?`还有 ${diff} 天`:`已经 ${-diff} 天`}}
