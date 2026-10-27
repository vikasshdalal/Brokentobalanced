'use strict';
async function fit(page){
 return page.evaluate(()=>{
  const content=document.querySelector('.content'),els=[...document.querySelectorAll('.copy-block')];
  function minimum(e){return e.dataset.role==='cover'?72:e.dataset.role==='cta'?48:e.dataset.role.startsWith('insight')?66:e.dataset.role==='script'?54:50}
  function rows(e){const out=[],w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode())for(const m of n.textContent.matchAll(/\S+/g)){const r=document.createRange();r.setStart(n,m.index);r.setEnd(n,m.index+m[0].length);const b=r.getBoundingClientRect();let row=out.find(x=>Math.abs(x.y-b.y)<3);if(!row){row={y:b.y,words:0,right:b.right};out.push(row)}row.words++;row.right=Math.max(row.right,b.right)}return out.sort((a,b)=>a.y-b.y)}
  for(const e of els){const base=+e.dataset.baseSize,min=minimum(e);for(let size=base;size>=min;size-=2){e.style.fontSize=size+'px';const rs=rows(e),r=e.getBoundingClientRect(),explicitWrap=e.dataset.intentionalLine==='true'&&rs.length>1,widow=rs.length>1&&rs.at(-1).words===1&&e.dataset.intentionalLine!=='true';if(rs.every(b=>b.right<=r.right+.5)&&!explicitWrap&&(!widow||size===min))break;}}
  for(let step=0;step<10;step++){
   const bottom=els.at(-1).getBoundingClientRect().bottom,limit=content.getBoundingClientRect().bottom;if(bottom<=limit)break;
   for(const e of els){const size=parseFloat(e.style.fontSize),min=minimum(e);e.style.fontSize=Math.max(min,size-2)+'px';const gap=parseFloat(e.style.marginTop);if(gap>24)e.style.marginTop=Math.max(24,gap-4)+'px';}
  }
  return els.map(e=>({font_size:parseFloat(e.style.fontSize),gap_before:parseFloat(e.style.marginTop)}));
 });
}
async function geometry(page,p,s,decision){
 return page.evaluate(({text,id,number,decision})=>{
  const slide=document.querySelector('.slide'),copy=document.querySelector('.copy'),content=document.querySelector('.content'),errors=[],warnings=[];
  const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
  const region=rect(content),background=getComputedStyle(slide).backgroundColor,blocks=[...copy.querySelectorAll('.copy-block')],chars=[],leafText=[];
  const walker=document.createTreeWalker(copy,NodeFilter.SHOW_TEXT);let node;
  while(node=walker.nextNode()){
   const parent=node.parentElement,cs=getComputedStyle(parent),glyphs=[];
   for(let i=0;i<node.length;i++){if(/\s/.test(node.textContent[i]))continue;const r=document.createRange();r.setStart(node,i);r.setEnd(node,i+1);for(const a of r.getClientRects())glyphs.push({x:a.x,y:a.y,right:a.right,bottom:a.bottom})}
   if(node.textContent.trim()&&(!glyphs.length||glyphs.some(g=>g.right<=g.x||g.bottom<=g.y)))errors.push('invisible_glyph');
   chars.push(...glyphs);leafText.push({text:node.textContent,foreground:cs.color,background,font_size:parseFloat(cs.fontSize),font_weight:cs.fontWeight,font_family:cs.fontFamily,glyph_count:glyphs.length});
   for(let e=parent;e&&e!==slide.parentElement;e=e.parentElement){const style=getComputedStyle(e);if(style.display==='none'||style.visibility!=='visible'||+style.opacity!==1)errors.push('hidden_or_translucent_copy');if(['hidden','clip'].includes(style.overflow)||['hidden','clip'].includes(style.overflowX)||['hidden','clip'].includes(style.overflowY))errors.push('clipping_parent');}
  }
  if(copy.textContent!==text)errors.push('visible_copy_mismatch');
  if(chars.some(r=>r.x<region.x-.5||r.right>region.right+.5||r.y<region.y-.5||r.bottom>region.bottom+.5))errors.push('copy_outside_region');
  if(chars.some(r=>r.x<88||r.right>992||r.y<250||r.bottom>1120))errors.push('copy_safe_margin');
  const blockReports=blocks.map((e,i)=>{
   const a=+e.dataset.sourceStart,z=+e.dataset.sourceEnd,cs=getComputedStyle(e),fontSize=parseFloat(cs.fontSize),role=e.dataset.role,bounds=rect(e),wordRows=[],w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let n;
   while(n=w.nextNode())for(const m of n.textContent.matchAll(/\S+/g)){const r=document.createRange();r.setStart(n,m.index);r.setEnd(n,m.index+m[0].length);const b=r.getBoundingClientRect();let row=wordRows.find(x=>Math.abs(x.y-b.y)<3);if(!row){row={y:b.y,words:[],x:b.x,right:b.right};wordRows.push(row)}row.words.push(m[0]);row.right=Math.max(row.right,b.right)}wordRows.sort((a,b)=>a.y-b.y);
   const limits=role==='cover'?[72,112]:role==='cta'?[48,56]:role.startsWith('insight')?[66,84]:role==='script'?[54,64]:[50,66];
   if(e.textContent!==text.slice(a,z))errors.push('source_span_mismatch_'+i);
   if(fontSize<limits[0]||fontSize>limits[1])errors.push('type_size_'+i);
   if(![400,450,500,550,600].includes(+cs.fontWeight))errors.push('type_weight_'+i);
   if(cs.fontSynthesis!=='none')errors.push('synthetic_font_allowed_'+i);
   if(wordRows.length>1&&wordRows.at(-1).words.length===1&&e.dataset.intentionalLine!=='true')warnings.push('single_word_final_line_block_'+i);
   if(wordRows.some(r=>r.words.length===1&&/^(Your|and)$/i.test(r.words[0])))errors.push('stranded_connector_'+i);
   if(bounds.bottom>region.bottom+.5)errors.push('block_outside_region_'+i);
   return {index:i,start:a,end:z,text:e.textContent,role,...bounds,font_size:fontSize,font_weight:+cs.fontWeight,font_family:cs.fontFamily,line_height:parseFloat(cs.lineHeight),gap_before:parseFloat(cs.marginTop),color:cs.color,lines:wordRows,intentional_line:e.dataset.intentionalLine==='true'};
  });
  if(blockReports.map(b=>text.slice(b.start,b.end)).join('')!==text)errors.push('noncontiguous_source_spans');
  for(let i=0;i<blockReports.length-1;i++){const a=blockReports[i],b=blockReports[i+1];if(a.bottom>b.y+.5)errors.push('block_overlap_'+i);}
  const metadata=[...slide.querySelectorAll('.series,.brand,.folio')].map(e=>{const cs=getComputedStyle(e);return {role:e.className,text:e.textContent,...rect(e),font_size:parseFloat(cs.fontSize),font_weight:+cs.fontWeight,font_family:cs.fontFamily,foreground:cs.color,background}});
  if(metadata.map(m=>m.text).join('|')!==[document.querySelector('.series').textContent,'Broken to Balanced',number+' / 6'].join('|'))errors.push('unexpected_metadata');
  for(const m of metadata){if(m.x<88||m.right>992||m.y<80||m.bottom>1262)errors.push('metadata_safe_'+m.role);if(m.font_size<28||m.font_size>30)errors.push('metadata_size');if(chars.some(c=>c.x<m.right&&c.right>m.x&&c.y<m.bottom&&c.bottom>m.y))errors.push('metadata_copy_overlap');}
  const deco=rect(slide.querySelector('.accent-rule'));if(chars.some(c=>c.x<deco.right&&c.right>deco.x&&c.y<deco.bottom&&c.bottom>deco.y))errors.push('decoration_crosses_copy');
  if(slide.innerText.includes(id)||/202[67]-\d\d-\d\d|REVIEW|provisional_wordmark/.test(slide.innerText))errors.push('private_metadata_in_artwork');
  const actualTop=chars.length?Math.min(...chars.map(c=>c.y)):0;
  return {id,slide:number,passed:errors.length===0,exact_text:copy.textContent===text,canonical_text:text,rendered_text:copy.textContent,source_spans:blockReports,copy:rect(copy),region,actual_message_top:actualTop,background,blocks:blockReports,text_pairs:[...leafText,...metadata],metadata,decoration:deco,font_faces:[],warnings,errors:[...new Set(errors)],emphasis_ranges:decision.emphasis};
 },{text:s.text,id:p.id,number:s.number,decision});
}
module.exports={fit,geometry};
