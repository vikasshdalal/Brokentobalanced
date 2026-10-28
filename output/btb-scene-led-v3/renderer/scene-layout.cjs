'use strict';
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function split(t,parts){let pos=0;return parts.map((part,i)=>{if(t.slice(pos,pos+part.length)!==part)throw Error('Source slice mismatch');let b={start:pos,end:pos+part.length};pos+=part.length;if(i===parts.length-1&&pos!==t.length)throw Error('Incomplete slice map');return b});}
function sentences(t){return [...new Intl.Segmenter('en',{granularity:'sentence'}).segment(t)].map(p=>({start:p.index,end:p.index+p.segment.length}));}
function plan(p){return p.slides.map(s=>{
 let spans=sentences(s.text),top=[0,870,805,750,760,760,830][s.number];
 if(s.number===2)spans=split(s.text,['You can be grieving and still have ','lunches to pack, ','work to finish, ','and bills to open.']);
 const groups=spans.map((r,i)=>({ ...r,font_family:'Inter',font_size:s.number===1?84:s.number===2?(i?58:54):s.number===6?(i?50:60):s.number===5?(i===2?50:56):(i?50:56),font_weight:s.number===1?(i?700:600):s.number===5&&i<2?600:500,line_height:s.number===1?1.09:1.25,gap_before:i?(s.number===2?(i===1?18:6):24):0,role:s.number===1?'cover':(s.number===6&&i===1)||s.number===5&&i===2||i>0&&![2,5].includes(s.number)?'support':'main'}));
 const keep=[];if(s.number===1)keep.push('Your responsibilities');if(s.number===4)keep.push('what must happen','what can wait');
 return {number:s.number,main_top:top,text_region:{x:80,y:top,width:920,bottom:1202},groups,keep_ranges:keep.map(t=>({start:s.text.indexOf(t),end:s.text.indexOf(t)+t.length})),overlay:{start:top-110,full_by:top-10,color:'#1A1A1A',alpha:null},image_region_protected:'Meaningful action and relevant props remain above the text; verified visually against each actual asset.'};
 });}
function html(p,s,d,alpha,fitted=null){
 const fragments=d.groups.map((g,i)=>{
  let text='',cursor=g.start;for(const k of d.keep_ranges.filter(k=>k.start>=g.start&&k.end<=g.end).sort((a,b)=>a.start-b.start)){text+=esc(s.text.slice(cursor,k.start))+'<span class="keep-phrase">'+esc(s.text.slice(k.start,k.end))+'</span>';cursor=k.end}text+=esc(s.text.slice(cursor,g.end));
  const size=fitted?.[i]?.font_size||g.font_size,gap=fitted?.[i]?.gap_before??g.gap_before;
  return '<span class="message-group" data-source-start="'+g.start+'" data-source-end="'+g.end+'" data-role="'+g.role+'" data-base-size="'+g.font_size+'" style="font-size:'+size+'px;font-weight:'+g.font_weight+';line-height:'+g.line_height+';margin-top:'+gap+'px">'+text+'</span>';
 }).join('');
 const transition=100*(d.overlay.full_by-d.overlay.start)/(1350-d.overlay.start);
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=1080"><title>BTB-001 v3 slide '+s.number+' — review</title><link rel="stylesheet" href="../../../renderer/styles.css"></head><body><article class="slide '+(s.number===1?'cover':'interior')+'"><img class="scene" src="../../../assets/BTB-001/backgrounds/'+String(s.number).padStart(2,'0')+'-crop.png" alt=""><div class="local-scrim" style="top:'+d.overlay.start+'px;background:linear-gradient(to bottom,rgba(26,26,26,0)0%,rgba(26,26,26,'+alpha+')'+transition+'%,rgba(26,26,26,'+alpha+')100%)"></div><main class="content" style="top:'+d.main_top+'px"><div class="copy">'+fragments+'</div></main><p class="handle">@brokentobalanced</p><p class="disclosure">Illustrative AI scene</p><p class="folio">'+s.number+' / 6</p></article></body></html>\n';
}
async function fit(page){return page.evaluate(()=>{
 const groups=[...document.querySelectorAll('.message-group')],region=document.querySelector('.content').getBoundingClientRect();
 const minimum=e=>e.dataset.role==='cover'?68:e.dataset.role==='support'?48:52;
 for(let pass=0;pass<10;pass++){
  if(groups.at(-1).getBoundingClientRect().bottom<=region.bottom)break;
  for(const e of groups){e.style.fontSize=Math.max(minimum(e),parseFloat(e.style.fontSize)-2)+'px';const gap=parseFloat(e.style.marginTop);if(gap>18)e.style.marginTop=Math.max(18,gap-2)+'px';}
 }
 return groups.map(e=>({font_size:parseFloat(e.style.fontSize),gap_before:parseFloat(e.style.marginTop)}));
});}
async function geometry(page,s){return page.evaluate(({text,number})=>{
 const slide=document.querySelector('.slide'),copy=document.querySelector('.copy'),content=document.querySelector('.content'),errors=[],glyphs=[],nodes=[],rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
 const region=rect(content),walk=document.createTreeWalker(copy,NodeFilter.SHOW_TEXT);let n;
 while(n=walk.nextNode()){
  const cs=getComputedStyle(n.parentElement),chars=[];
  for(let i=0;i<n.length;i++){if(/\s/.test(n.textContent[i]))continue;const r=document.createRange();r.setStart(n,i);r.setEnd(n,i+1);for(const b of r.getClientRects())chars.push({x:b.x,y:b.y,right:b.right,bottom:b.bottom})}
  if(n.textContent.trim()&&!chars.length)errors.push('invisible_copy');glyphs.push(...chars);nodes.push({text:n.textContent,font_family:cs.fontFamily,font_size:parseFloat(cs.fontSize),font_weight:+cs.fontWeight,color:cs.color,glyphs:chars});
  for(let e=n.parentElement;e&&e!==slide.parentElement;e=e.parentElement){const c=getComputedStyle(e);if(c.display==='none'||c.visibility!=='visible'||+c.opacity!==1)errors.push('hidden_copy');if(['hidden','clip'].includes(c.overflow))errors.push('clipping_parent');if(c.fontSynthesis!=='none')errors.push('synthetic_font');}
 }
 if(copy.textContent!==text)errors.push('exact_visible_copy');
 if(glyphs.some(g=>g.x<region.x-.5||g.right>region.right+.5||g.y<region.y-.5||g.bottom>region.bottom+.5))errors.push('copy_outside_region');
 if(glyphs.some(g=>g.x<72||g.right>1008||g.y<70||g.bottom>1208))errors.push('copy_unsafe');
 const groups=[...document.querySelectorAll('.message-group')].map((e,i)=>{const cs=getComputedStyle(e),a=+e.dataset.sourceStart,b=+e.dataset.sourceEnd,rs=[];const w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let nn;while(nn=w.nextNode())for(const m of nn.textContent.matchAll(/\S+/g)){const r=document.createRange();r.setStart(nn,m.index);r.setEnd(nn,m.index+m[0].length);const g=r.getBoundingClientRect();let line=rs.find(v=>Math.abs(v.y-g.y)<3);if(!line){line={y:g.y,words:[],x:g.x,right:g.right};rs.push(line)}line.words.push(m[0]);line.right=Math.max(line.right,g.right)}rs.sort((a,b)=>a.y-b.y);if(rs.some(l=>l.words.length===1&&/^(Your|and|not)$/i.test(l.words[0])))errors.push('stranded_connector');if(e.textContent!==text.slice(a,b))errors.push('source_span');const size=parseFloat(cs.fontSize);if(size<(e.dataset.role==='cover'?68:48))errors.push('type_below_floor');return{index:i,start:a,end:b,text:e.textContent,role:e.dataset.role,...rect(e),font_family:cs.fontFamily,font_size:size,font_weight:+cs.fontWeight,line_height:parseFloat(cs.lineHeight),lines:rs};});
 for(let i=1;i<groups.length;i++)if(groups[i-1].bottom>groups[i].y+.5)errors.push('copy_group_overlap');
 const metadata=[...document.querySelectorAll('.handle,.disclosure,.folio')].map(e=>{const cs=getComputedStyle(e);return{role:e.className,text:e.textContent,...rect(e),font_family:cs.fontFamily,font_size:parseFloat(cs.fontSize),font_weight:+cs.fontWeight,color:cs.color}});
 if(metadata.map(m=>m.text).join('|')!==['@brokentobalanced','Illustrative AI scene',number+' / 6'].join('|'))errors.push('metadata_or_disclosure');
 for(let i=0;i<metadata.length;i++){const m=metadata[i];if(m.x<72||m.right>1008||m.bottom>1280)errors.push('footer_safe');if(glyphs.some(g=>g.x<m.right&&g.right>m.x&&g.y<m.bottom&&g.bottom>m.y))errors.push('footer_collision');for(let j=i+1;j<metadata.length;j++){const q=metadata[j];if(m.x<q.right&&m.right>q.x&&m.y<q.bottom&&m.bottom>q.y)errors.push('metadata_overlap')}}
 const lines=[];for(const node of nodes){for(const g of node.glyphs){let row=lines.find(r=>Math.abs(r.y-g.y)<3&&r.foreground===node.color);if(!row){row={x:g.x,y:g.y,right:g.right,bottom:g.bottom,foreground:node.color};lines.push(row)}row.x=Math.min(row.x,g.x);row.y=Math.min(row.y,g.y);row.right=Math.max(row.right,g.right);row.bottom=Math.max(row.bottom,g.bottom)}}
 const contrast_regions=[...lines.map((l,i)=>({...l,role:'copy_line_'+i})),...metadata.map(m=>({...m,foreground:m.color}))];
 const image=document.querySelector('.scene');if(!image.complete||image.naturalWidth!==1080||image.naturalHeight!==1350)errors.push('image_not_decoded');
 return {slide:number,passed:!errors.length,errors:[...new Set(errors)],canonical_text:text,visible_text:copy.textContent,exact_text:copy.textContent===text,source_spans:groups,metadata,region,contrast_regions,image:{natural_width:image.naturalWidth,natural_height:image.naturalHeight,complete:image.complete},actual_copy_bounds:{x:Math.min(...glyphs.map(g=>g.x)),y:Math.min(...glyphs.map(g=>g.y)),right:Math.max(...glyphs.map(g=>g.right)),bottom:Math.max(...glyphs.map(g=>g.bottom))}};
 },{text:s.text,number:s.number});}
module.exports={plan,html,fit,geometry};
