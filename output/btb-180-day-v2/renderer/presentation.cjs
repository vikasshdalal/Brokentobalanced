'use strict';
// V2 presentation layer for the existing v1 local renderer. All fragments are source slices.
const fs=require('node:fs'),path=require('node:path');
const TOKENS={charcoal:'#1A1A1A',off_white:'#F5F5F5',warm_ivory_v2:'#F3EEE6',warm_sand:'#C2A57B',bronze_text_v2:'#6C5134',deep_blue:'#2F4F6F',muted_olive:'#6E7F5F',dark_secondary_v2:'#BDB5AA',light_secondary_v2:'#59534B'};
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sentences=t=>[...new Intl.Segmenter('en',{granularity:'sentence'}).segment(t)].map(s=>({start:s.index,end:s.index+s.segment.length}));
function rangesAt(t,fragments){let i=0;return fragments.map(f=>{if(t.slice(i,i+f.length)!==f)throw Error('Exact fragment mismatch');const r={start:i,end:i+f.length};i+=f.length;return r}).map((r,n,a)=>{if(n===a.length-1&&r.end!==t.length)throw Error('Incomplete fragment map');return r});}
function block(start,end,role='body',extra={}){return {start,end,role,font_family:role==='cover'||role==='insight-serif'?'Playfair Display':'Inter',font_size:role==='cover'?94:role==='insight-serif'?72:role==='insight'?72:role==='cta'?52:role==='script'?58:60,font_weight:role==='cover'||role.startsWith('insight')?500:role==='script'?450:400,line_height:role==='cover'?1.1:role.startsWith('insight')?1.2:1.32,gap_before:0,...extra};}
function roleFor(p,s){if(s.number===1)return'cover';if(s.number===6)return'closing';if(p.layout==='letter')return'founder-letter';if(p.layout==='script'&&s.text.includes('“'))return'script-example';if(p.layout==='checklist'||/^(?:Choose |Make |Put |Write |Pick |Try |Start |Keep |Open |Use |Ask |Before |For today)/.test(s.text))return'practical';if(/\b(?:does not|doesn't|is not|isn't|not the same|doesn’t|isn’t|do not have)\b/.test(s.text))return'insight';return'recognition';}
function surface(p,s,role,effective){
 if(effective==='A')return {background:'charcoal',reason:'Requested dark editorial treatment; hierarchy and sentence grouping vary within the dark surface.'};
 if(p.id==='BTB-001')return {background:[1,3].includes(s.number)?'charcoal':'warm_ivory_v2',reason:'Exact BTB-001 v2 art direction.'};
 if(p.layout==='letter')return {background:'warm_ivory_v2',reason:'Founder note kept on warm paper for a consistent, restrained letter voice.'};
 if(role==='cover')return {background:p.layout==='checklist'?'warm_ivory_v2':'charcoal',reason:p.layout==='checklist'?'Practical opening starts on warm paper.':'Opening names the tension on the established charcoal surface.'};
 if(role==='insight'&&['editorial','contrast'].includes(p.layout)&&s.text.length<=132)return {background:'charcoal',reason:'The supplied distinction/negation is an insight; dark emphasis is chosen from meaning, not alternating slide numbers.'};
 return {background:'warm_ivory_v2',reason:role==='closing'?'Supportive ending and original action on warm paper.':'Practical, contextual or reassuring copy on warm paper.'};
}
function reference001(s){const t=s.text;let blocks=[],emphasis=[];
 if(s.number===1){const r=rangesAt(t,['The relationship ','ended. ','Your responsibilities ',"didn't."]);blocks=r.map((x,i)=>block(x.start,x.end,'cover',{font_size:84,gap_before:i===2?44:0,color:i>=2?'accent':null,explicit_line:true,group:i<2?0:1,intentional_single_word_line:i===1||i===3}));emphasis=[{start:r[2].start,end:t.length,method:'accent',reason:'Second complete sentence, including negation.'}];}
 if(s.number===2){const r=rangesAt(t,['You can be grieving and still have ','lunches to pack, ','work to finish, ','and bills to open.']);blocks=r.map((x,i)=>block(x.start,x.end,'body',{font_size:i?62:60,font_weight:i?500:400,gap_before:i===1?40:i>1?10:0,color:i?'accent':null,explicit_line:i>0,group:i?1:0}));emphasis=[{start:r[1].start,end:t.length,method:'bronze',reason:'The three existing responsibilities, with all connecting words retained.'}];}
 if(s.number===3){const r=sentences(t);blocks=r.map((x,i)=>block(x.start,x.end,i?'body':'insight-serif',{font_size:i?60:70,font_weight:i?400:500,gap_before:i?42:0,group:i}));emphasis=[{...r[0],method:'editorial_type',reason:'Whole distinction preserves does not mean.'}];}
 if(s.number===4){blocks=sentences(t).map((x,i)=>block(x.start,x.end,'body',{gap_before:i?42:0,group:i}));for(const phrase of ['what must happen','what can wait']){let start=t.indexOf(phrase);emphasis.push({start,end:start+phrase.length,method:'accent',reason:'Exact contrast phrase in the original sentence order.'});}}
 if(s.number===5){blocks=sentences(t).map((x,i)=>block(x.start,x.end,'body',{font_size:i===2?54:60,font_weight:i<2?500:400,gap_before:i?40:0,group:i}));}
 if(s.number===6){blocks=sentences(t).map((x,i)=>block(x.start,x.end,i?'cta':'insight-serif',{font_size:i?52:72,gap_before:i?52:0,group:i}));}
 return {blocks,emphasis,composition:['','two-thought-cover','responsibilities-sequence','insight-and-context','practical-distinction','two-actions-conclusion','reassurance-then-cta'][s.number]};
}
function generic(p,s,role){
 const t=s.text;let parts=sentences(t),blocks=[],emphasis=[],composition=role;
 if(role==='cover'){
  blocks=parts.map((x,i)=>block(x.start,x.end,'cover',{font_size:t.length>78?86:94,gap_before:i?42:0,group:i}));
 }else if(role==='script-example'&&t.includes('”')){
  const a=t.indexOf('“'),b=t.lastIndexOf('”')+1;const r=[{start:0,end:a,kind:'body'},{start:a,end:b,kind:'script'},{start:b,end:t.length,kind:'body'}].filter(x=>x.end>x.start&&t.slice(x.start,x.end).trim());
  // If a whitespace-only suffix exists, attach it to the preceding source slice.
  if(r.length&&r.at(-1).end<t.length)r.at(-1).end=t.length;
  blocks=r.map((x,i)=>block(x.start,x.end,x.kind,{font_size:x.kind==='script'?58:56,font_weight:x.kind==='script'?500:400,gap_before:i?28:0,group:i,indent:x.kind==='script'?24:0}));emphasis=[{start:a,end:b,method:'weight',reason:'Exact existing example sentence; framing and safety context preserved.'}];
 }else{
  if(role==='practical'&&parts.length===1&&t.includes('; ')){
   let last=0;parts=[];for(const m of t.matchAll(/;\s+/g)){parts.push({start:last,end:m.index+m[0].length});last=m.index+m[0].length}parts.push({start:last,end:t.length});
  }
  blocks=parts.map((x,i)=>{
   const len=t.slice(x.start,x.end).trim().length;
   let kind=role==='closing'&&i===parts.length-1?'cta':role==='insight'&&parts.length===1&&len<=95?'insight':role==='closing'&&parts.length>1&&i===0&&len<=100?'insight-serif':'body';
   return block(x.start,x.end,kind,{font_size:kind==='body'?(role==='founder-letter'?58:60):kind==='cta'?52:kind==='insight-serif'?70:72,font_weight:role==='practical'&&i<parts.length-1?500:kind.startsWith('insight')?500:400,gap_before:i?(role==='closing'?48:36):0,group:i});
  });
  if(p.layout==='contrast'&&blocks.length>1){blocks[0].font_weight=500;emphasis=[{start:blocks[0].start,end:blocks[0].end,method:'weight',reason:'First complete source sentence; no invented comparison labels.'}];}
 }
 return {blocks,emphasis,composition};
}
function build(data,pilot){
 const assignments=new Map((pilot?.assignments||[]).map(p=>[p.id,p]));
 const posts=data.posts.map(p=>{
  const assignment=assignments.get(p.id);const requested=assignment?.requested_treatment||'B',effective=requested==='C'?'B':requested;
  return {id:p.id,requested_treatment:requested,effective_treatment:effective,fallback_reason:requested==='C'?'No approved local scene asset or verified no-additional-spend generation entitlement; complete text-first B fallback.':null,semantic_layout:p.layout,treatment_reason:assignment?'Recorded exploratory pilot assignment; no performance conclusion.':'Warm editorial is the conservative default.',slides:p.slides.map(s=>{
   const role=roleFor(p,s),sf=surface(p,s,role,effective),details=p.id==='BTB-001'?reference001(s):generic(p,s,role);
   const d={number:s.number,role,background_token:sf.background,background_reason:sf.reason,main_top:s.number===1?300:320,region_bottom:1110,region_left:92,region_width:896,scene:null,...details};
   const concat=d.blocks.map(b=>s.text.slice(b.start,b.end)).join('');if(concat!==s.text)throw Error('Noncontiguous source spans '+p.id+'/'+s.number);
   return d;
  })};
 });
 return {version:'2.0.0',authority:'Codex_Visual_Production_Prompt_v2.md; presentation-only override',original_brand_config_modified:false,limited_overrides:['Warm ivory and accessible bronze/secondary tokens added.','Earlier message placement; source-slice sentence grouping and quieter footer.','Legacy blanket imagery ban superseded only for permitted optional illustrative scenes; none are available for this run.'],palette:TOKENS,default_treatment:'B',scene_capability_status:'UNAVAILABLE_COST_OR_ASSET_GATE',fonts:{headings:'Playfair Display',body:'Inter',synthetic_weights:false},footer:{brand:'Broken to Balanced',handle_on_artwork:false,folio:true,font_size:28,one_line_signature:true},posts};
}
function sliceHtml(t,b,emphasis,dark){
 const hits=emphasis.filter(e=>e.start<b.end&&e.end>b.start&&['accent','bronze'].includes(e.method));let i=b.start,out='';
 for(const h of hits.sort((a,b)=>a.start-b.start)){const a=Math.max(h.start,b.start),z=Math.min(h.end,b.end);if(a<i)throw Error('Overlapping emphasis');out+=esc(t.slice(i,a))+'<span class="emphasis" style="color:'+(dark?TOKENS.warm_sand:TOKENS.bronze_text_v2)+';font-weight:500" data-source-start="'+a+'" data-source-end="'+z+'">'+esc(t.slice(a,z))+'</span>';i=z;}
 return out+esc(t.slice(i,b.end));
}
function html(p,s,decision,rootRelative='../../../',fitted=null){
 const dark=decision.background_token==='charcoal',blocks=decision.blocks.map((b,i)=>{
  const f=fitted?.[i]||{},size=f.font_size||b.font_size,gap=f.gap_before===undefined?b.gap_before:f.gap_before;
  const color=b.color==='accent'?(dark?TOKENS.warm_sand:TOKENS.bronze_text_v2):(dark?TOKENS.off_white:TOKENS.charcoal);
  const style='font-family:'+b.font_family+';font-size:'+size+'px;font-weight:'+b.font_weight+';line-height:'+b.line_height+';margin-top:'+gap+'px;color:'+color+';'+(b.indent?'margin-left:'+b.indent+'px;width:calc(100% - '+b.indent+'px);':'');
  return '<span class="copy-block '+b.role+'" data-source-start="'+b.start+'" data-source-end="'+b.end+'" data-role="'+b.role+'" data-base-size="'+b.font_size+'" data-intentional-line="'+!!b.explicit_line+'" style="'+esc(style)+'">'+sliceHtml(s.text,b,decision.emphasis,dark)+'</span>';
 }).join('');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=1080"><title>'+p.id+' slide '+s.number+' — REVIEW v2</title><link rel="stylesheet" href="'+rootRelative+'renderer/styles.css"></head><body><article class="slide '+p.layout+(dark?' dark':' ivory')+' role-'+decision.role+'" data-background-token="'+decision.background_token+'" aria-label="'+esc(s.alt_text)+'"><p class="series">'+esc(p.series)+'</p><div class="accent-rule" aria-hidden="true"></div><main class="content" style="top:'+decision.main_top+'px;height:'+(decision.region_bottom-decision.main_top)+'px"><div class="copy">'+blocks+'</div></main><p class="brand">Broken to Balanced</p><p class="folio">'+s.number+' / 6</p></article></body></html>\n';
}
module.exports={build,html,TOKENS,sentences};
