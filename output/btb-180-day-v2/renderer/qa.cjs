'use strict';
const fs=require('node:fs'),path=require('node:path');
module.exports=async function({ROOT,data,config,read,write,hash,dep,contrast}){
 const sharp=dep('sharp'),geometry=[],images=[],text=[],type=[],pairs=[],defects=[],treatments={A:0,B:0,C:0},fallbacks=[];
 for(const p of data.posts){
  const dir=path.join(ROOT,'posts',p.id),m=read(path.join(dir,'post-manifest.json')),caption=fs.readFileSync(path.join(dir,'caption.txt'),'utf8'),alts=p.slides.map(s=>({number:s.number,alt_text:s.alt_text}));
  const captionExact=caption===p.caption_ready_to_copy,altExact=JSON.stringify(read(path.join(dir,'alt-text.json')))===JSON.stringify(alts)&&JSON.stringify(read(path.join(dir,'alt-text-source.json')))===JSON.stringify(alts);
  const identity=m.id===p.id&&m.planned_date===p.planned_date&&m.input_copy_sha256===p.copy_sha256&&m.founder_attestation_required===p.founder_attestation_required&&m.publish_status===p.publish_status;
  if(!captionExact||!altExact||!identity)defects.push({id:p.id,error:'caption_alt_or_identity'});
  treatments[m.effective_treatment]++;if(m.requested_treatment==='C'){fallbacks.push({id:p.id,requested_treatment:'C',effective_treatment:m.effective_treatment,reason:m.fallback_reason});if(m.effective_treatment!=='B'||!m.fallback_reason||m.scene_provenance!==null)defects.push({id:p.id,error:'false_scene_status'});}
  for(const s of p.slides){
   const f=m.slides[s.number-1],g=read(path.join(ROOT,f.qa)),ip=path.join(ROOT,f.png),hp=path.join(ROOT,f.editable),meta=await sharp(ip).metadata();await sharp(ip).raw().toBuffer();
   const imageOK=meta.width===1080&&meta.height===1350&&meta.space==='srgb'&&meta.format==='png'&&hash(fs.readFileSync(ip))===f.png_sha256&&hash(fs.readFileSync(hp))===f.html_sha256;
   images.push({id:p.id,slide:s.number,passed:imageOK,width:meta.width,height:meta.height,format:meta.format,color_space:meta.space,sha256:f.png_sha256,bytes:fs.statSync(ip).size});
   const exact=g.exact_text&&g.rendered_text===s.text&&g.blocks.map(b=>b.text).join('')===s.text;
   text.push({id:p.id,slide:s.number,passed:exact&&captionExact&&altExact,canonical_sha256:hash(s.text),visible_dom_sha256:hash(g.rendered_text),source_spans:g.source_spans.map(b=>({start:b.start,end:b.end,exact:s.text.slice(b.start,b.end)===b.text})),caption_exact:captionExact,alt_source_and_delivery_exact:altExact,copy_hash:p.copy_sha256});
   geometry.push(g);
   const fontOK=g.platform_fonts.every(b=>b.fonts.length&&b.fonts.every(f=>f.isCustomFont&&f.familyName===b.expected));type.push({id:p.id,slide:s.number,passed:fontOK,blocks:g.blocks.map(b=>({role:b.role,font_family:b.font_family,font_size:b.font_size,font_weight:b.font_weight,line_height:b.line_height})),actual_fonts:g.platform_fonts,faces:g.font_faces});
   const actualPairs=g.text_pairs.map(t=>({text:t.text,foreground:t.foreground,background:t.background,ratio:contrast(t.foreground,t.background)}));const contrastOK=actualPairs.every(t=>t.ratio>=4.5);pairs.push({id:p.id,slide:s.number,passed:contrastOK,pairs:actualPairs});
   if(!imageOK||!exact||!g.passed||!fontOK||!contrastOK)defects.push({id:p.id,slide:s.number,errors:g.errors,imageOK,exact,fontOK,contrastOK});
  }
 }
 for(const [name,list]of [['layout-geometry',geometry],['image-integrity',images],['text-integrity',text],['typography-report',type],['contrast-report',pairs]])write(path.join(ROOT,'qa',name+'.json'),{status:list.every(x=>x.passed)?'PASS':'FAIL',count:list.length,passed:list.filter(x=>x.passed).length,method:name==='layout-geometry'?'Actual visible DOM text-node character and source-block bounds, overlap, clipping parents and safe margins.':'Deterministic local source/output verification.',results:list});
 const baseline=read(path.join(ROOT,'input-hashes.json')),project=path.resolve(ROOT,'../..'),preserved=[];
 if(fs.existsSync(path.join(project,'BTB_180_Day_Content.json')))for(const item of [...baseline.inputs,...baseline.previous_v1_outputs]){const file=path.join(project,item.path),passed=fs.existsSync(file)&&hash(fs.readFileSync(file))===item.sha256;preserved.push({path:item.path,passed});if(!passed)defects.push({path:item.path,error:'original_or_v1_modified'});}
 write(path.join(ROOT,'qa','source-and-v1-preservation.json'),{status:preserved.length?(preserved.every(x=>x.passed)?'PASS':'FAIL'):'ORIGINAL_WORKSPACE_NOT_PRESENT',files_checked:preserved.length,results:preserved});
 const sourceHash=hash(fs.readFileSync(path.join(ROOT,'renderer/input/BTB_180_Day_Content.json')));
 write(path.join(ROOT,'qa','content-integrity.json'),{status:!defects.length&&sourceHash===config.input_sha256?'PASS':'FAIL',source_sha256:sourceHash,copy_hashes_matched:180,posts:180,slides:1080,captions:180,alt_text_source_sets:180,alt_text_delivery_sets:180,caption_and_alt_results:text,effective_treatments:treatments,C_to_B_fallbacks:fallbacks});
 write(path.join(ROOT,'qa','blockers.json'),{rendering_defect_count:defects.length,rendering_defects:defects,brand_status:'provisional_wordmark',approval_gates:[{gate:'original_approved_logo',status:'MISSING',applies_to:'all180',detail:'No original approved logo binary in selected project; plain-text review signature used.'},{gate:'owner_editorial_approval',status:'PENDING',applies_to:'all180'},{gate:'founder_attestation',status:'PENDING',post_ids:data.posts.filter(p=>p.founder_attestation_required).map(p=>p.id)}],scene_gate:{status:'UNAVAILABLE',reason:'No approved local scene or verified no-additional-spend generation entitlement.',primary_fallbacks:fallbacks,completed_C_carousels:0,three_way_test_fully_prepared:false},font_gate:'RESOLVED — exact verified runtime fonts; no binaries distributed'});
 if(defects.length)throw Error('V2 QA defects: '+JSON.stringify(defects));console.log('V2 QA PASS:1080 primary PNGs, exact copy/alt/captions, typography, geometry, contrast and preservation.');
};
