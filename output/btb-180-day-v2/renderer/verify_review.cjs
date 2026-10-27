'use strict';
// Independent v2 local-only review/output/visible-source checks. Run: node verify_review.cjs
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),http=require('node:http');
const {pathToFileURL,fileURLToPath}=require('node:url');
const ROOT=path.resolve(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'input','BTB_180_Day_Content.json'),'utf8'));
const config=JSON.parse(fs.readFileSync(path.join(__dirname,'runtime-config.json'),'utf8'));
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const dep=name=>{try{return require(name)}catch{}for(const root of [process.env.BTB_NODE_MODULES,'/Users/vikasshdalal/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'].filter(Boolean)){try{return require(path.join(root,name))}catch{}}throw new Error('Dependency unavailable: '+name);};
const errors=[],checks=[],pageErrors=[],blockedExternalRequests=[],responses=[],consoleErrors=[];
const countTreatments=items=>{const counts={A:0,B:0,C:0};for(const p of items)counts[p.effective_treatment]++;return counts;};
function check(name,passed,detail){const v={name,passed:!!passed};if(detail!==undefined)v.detail=detail;checks.push(v);if(!passed)errors.push(v);return !!passed;}
const decode=s=>s.replace(/&(?:amp|quot|#39|lt|gt);/g,c=>({'&amp;':'&','&quot;':'"','&#39;':"'",'&lt;':'<','&gt;':'>'}[c]));
function localRefs(file){
 const html=fs.readFileSync(file,'utf8'),refs=[];
 for(const m of html.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)){
  const ref=decode(m[1]),url=new URL(ref,pathToFileURL(file));
  if(url.protocol!=='file:'){refs.push({ref,local:false,exists:false});continue;}
  const target=fileURLToPath(url),inside=target.startsWith(ROOT+path.sep),exists=inside&&fs.existsSync(target)&&fs.statSync(target).isFile();
  refs.push({ref,local:true,inside,exists,target:path.relative(ROOT,target)});
 }
 return refs;
}
function startServer(){
 const server=http.createServer((req,res)=>{
  try{
   const url=new URL(req.url,'http://127.0.0.1'),decoded=decodeURIComponent(url.pathname);
   let target;
   if(decoded.startsWith('/__fonts/')){const key=decoded.split('/').pop();if(!['headings','body'].includes(key))throw Error('Unknown font');target=process.env[key==='headings'?'BTB_HEADING_FONT':'BTB_BODY_FONT']||config.fonts[key].path;}
   else{target=path.resolve(ROOT,'.'+decoded);if(!target.startsWith(ROOT+path.sep))throw Error('Outside output');}
   if(!fs.statSync(target).isFile())throw Error('Not a local file');
   const type={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8','.ttf':'font/ttf'}[path.extname(target)]||'application/octet-stream';
   res.setHeader('Content-Type',type);res.setHeader('Cache-Control','no-store');res.end(fs.readFileSync(target));
  }catch{res.statusCode=404;res.end('Not found');}
 });
 return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>resolve(server));});
}
function verifyInputsAndPreservation(){
 const source=fs.readFileSync(path.join(__dirname,'input','BTB_180_Day_Content.json'));
 check('canonical_input_bytes',digest(source)===config.input_sha256);
 const canonicalChecks=data.posts.map((p,i)=>({id:p.id,passed:p.id===`BTB-${String(i+1).padStart(3,'0')}`&&p.day===i+1&&p.planned_date===new Date(Date.UTC(2026,9,28+i)).toISOString().slice(0,10)&&p.slides.length===6&&digest(p.slides.map(s=>s.text).join('\n')+'\n'+p.caption)===p.copy_sha256&&p.performance_actuals===null&&p.publish_status.includes('unpublished')&&p.founder_attestation_required===(p.pillar_id==='P6')}));
 check('all180_canonical_hashes_ids_dates_metadata',data.posts.length===180&&canonicalChecks.every(p=>p.passed),canonicalChecks.filter(p=>!p.passed));
 const auditPath=path.join(ROOT,'qa','independent-content-audit.json'),audit=read(auditPath),packageRoot=path.resolve(ROOT,'..','..');
 const originalSource=path.join(packageRoot,'BTB_180_Day_Content.json');
 if(fs.existsSync(originalSource)){
  const originalManifestChecks=audit.source_manifest_files.map(entry=>{const original=path.join(packageRoot,entry.name);return {name:entry.name,passed:fs.existsSync(original)&&digest(fs.readFileSync(original))===entry.expected_sha256};});
  check('original16_package_files_preserved',originalManifestChecks.every(p=>p.passed),originalManifestChecks.filter(p=>!p.passed));
  check('original_content_snapshot_byte_equal',source.equals(fs.readFileSync(originalSource)));
  check('original_brand_snapshot_byte_equal',fs.readFileSync(path.join(__dirname,'input','Brand_Config.json')).equals(fs.readFileSync(path.join(packageRoot,'Brand_Config.json'))));
  const baseline=audit.v1_preservation_baseline;
  const preservation=baseline.records.map(entry=>{const original=path.resolve(packageRoot,entry.path);return {path:entry.path,passed:original.startsWith(path.join(packageRoot,'output')+path.sep)&&fs.existsSync(original)&&fs.statSync(original).size===entry.bytes&&digest(fs.readFileSync(original))===entry.sha256};});
  check('v1_baseline_files_preserved',preservation.every(p=>p.passed),{checked:preservation.length,changed:preservation.filter(p=>!p.passed)});
  audit.v1_preservation_baseline.status=preservation.every(p=>p.passed)?'PASS — all recorded v1 bytes preserved':'FAIL';
  audit.v1_preservation_baseline.final_checked_count=preservation.length;
  audit.v1_preservation_baseline.changed_files=preservation.filter(p=>!p.passed);
  audit.v2_revision.output_verification_status='See independent review-interface.json for generated-output and visible-source checks';
  audit.v2_revision.original16_package_files_still_match=originalManifestChecks.every(p=>p.passed);
  fs.writeFileSync(auditPath,JSON.stringify(audit,null,2)+'\n');
  return {original_package_recheck:'PERFORMED',v1_files_checked:preservation.length,v1_unchanged:preservation.every(p=>p.passed)};
 }
 return {original_package_recheck:'Original package absent from extracted output; use initial audit evidence',v1_files_checked:0};
}
function verifyPilot(manifests){
 const pilot=read(path.join(ROOT,'pilot','visual-test-assignments.json')),assignments=pilot.assignments;
 const actualRequested={A:0,B:0,C:0};for(const a of assignments)actualRequested[a.requested_treatment]++;
 check('pilot12_unique_assignments',assignments.length===12&&new Set(assignments.map(a=>a.id)).size===12);
 check('pilot_requested4_each',Object.values(actualRequested).every(n=>n===4),actualRequested);
 const effective=countTreatments(assignments),fallbacks=assignments.filter(a=>a.requested_treatment==='C'&&a.effective_treatment==='B');
 check('pilot_effective4A8B0C',effective.A===4&&effective.B===8&&effective.C===0,effective);
 check('pilot4C_fallbacks_honest',fallbacks.length===4&&fallbacks.every(a=>a.c_fallback===true&&a.fallback_reason&&a.scene_asset_path===null&&a.scene_proof_status==='UNAVAILABLE'));
 check('pilot_three_way_not_prepared',pilot.three_way_test_fully_prepared===false&&pilot.causal_experiment===false&&pilot.observational_comparison_only===true);
 const assignmentChecks=assignments.map(a=>{const p=data.posts.find(p=>p.id===a.id),m=manifests.find(m=>m.id===a.id);return {id:a.id,passed:!!p&&!!m&&a.day===p.day&&a.planned_date===p.planned_date&&a.input_copy_sha256===p.copy_sha256&&a.founder_attestation_required===p.founder_attestation_required&&a.owner_approval_status==='PENDING'&&a.publication_status==='UNPUBLISHED'&&a.measurement_state==='NOT_STARTED'&&Object.values(a.performance_actuals).every(v=>v===null)&&a.effective_treatment===m.effective_treatment&&a.requested_treatment===m.requested_treatment};});
 check('pilot_source_gates_actualsnull_and_manifest_match',assignmentChecks.every(a=>a.passed),assignmentChecks.filter(a=>!a.passed));
 return {assignments:assignments.length,requested:actualRequested,effective,c_fallbacks:fallbacks.length,actuals:'ALL_NULL',three_way_test_fully_prepared:pilot.three_way_test_fully_prepared};
}
async function visibleCopyCheck(page,p,s,manifestSlide,cdp){
 const state=await page.evaluate(({canonical})=>{
  const copy=document.querySelector('.copy'),region=document.querySelector('.content'),slide=document.querySelector('.slide'),blocks=[...document.querySelectorAll('.copy .copy-block')],fail=[];
  const rectangle=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
  if(document.querySelectorAll('.copy').length!==1||!copy||!region||!slide)return {passed:false,errors:['copy_structure']};
  const allotted=rectangle(region),background=getComputedStyle(slide).backgroundColor;
  if(copy.textContent!==canonical)fail.push('actual_copy_text_mismatch');
  if(blocks.map(b=>b.textContent).join('')!==canonical)fail.push('actual_blocks_sequence_mismatch');
  const blockDetails=[],actualPairs=[];let end=0,visibleCharacters=0;
  const rgb=s=>s.match(/[\d.]+/g).map(Number),luminance=rgb=>{const c=rgb.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
  function recordPair(element){const c=getComputedStyle(element),fg=rgb(c.color),bg=rgb(background),a=luminance(fg),b=luminance(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);actualPairs.push({foreground:c.color,background,contrast:ratio});if(ratio<4.5||(fg.length===4&&fg[3]!==1)||(bg.length===4&&bg[3]!==1))fail.push('actual_contrast_or_alpha');}
  for(const block of blocks){
   const a=Number(block.dataset.sourceStart),b=Number(block.dataset.sourceEnd),style=getComputedStyle(block),r=rectangle(block);
   if(a!==end||b<=a||block.textContent!==canonical.slice(a,b))fail.push('source_range_'+a);end=b;
   for(let e=block;e&&e!==document;e=e.parentElement){const c=getComputedStyle(e);if(c.display==='none'||c.visibility!=='visible'||+c.opacity<1||e.hidden||c.clipPath!=='none')fail.push('hidden_or_obscured_copy_'+a);if(['hidden','clip'].includes(c.overflowX)||['hidden','clip'].includes(c.overflowY))fail.push('clipped_copy_ancestor_'+a);}
   if(style.textTransform!=='none'||style.fontSynthesis!=='none')fail.push('transformed_or_synthetic_type_'+a);
   if(r.width<=0||r.height<=0)fail.push('zero_copy_geometry_'+a);
   let glyphs=0;const walker=document.createTreeWalker(block,NodeFilter.SHOW_TEXT);let node;
   while(node=walker.nextNode()){recordPair(node.parentElement);for(let i=0;i<node.textContent.length;i++){
    if(/\s/.test(node.textContent[i]))continue;
    const range=document.createRange();range.setStart(node,i);range.setEnd(node,i+1);
    const rects=[...range.getClientRects()].filter(r=>r.width>0&&r.height>0);
    if(!rects.length)fail.push('unrendered_character_'+(a+i));
    for(const r of rects)if(r.x<allotted.x-.5||r.right>allotted.right+.5||r.y<allotted.y-.5||r.bottom>allotted.bottom+.5||r.x<88||r.right>992||r.y<200||r.bottom>1120)fail.push('glyph_outside_region_'+a);
    glyphs++;
   }}
   for(const element of [block,...block.querySelectorAll('*')])for(const pseudo of ['::before','::after']){const content=getComputedStyle(element,pseudo).content;if(!['none','normal','""',"''"].includes(content))fail.push('added_pseudo_text_'+a);}
   visibleCharacters+=glyphs;blockDetails.push({start:a,end:b,text:block.textContent,font_family:style.fontFamily,font_size:parseFloat(style.fontSize),font_weight:style.fontWeight,foreground:style.color,background,rendered_nonspace_characters:glyphs});
   if(parseFloat(style.fontSize)<(block.dataset.role==='cover'?72:48))fail.push('type_floor_'+a);
  }
  if(end!==canonical.length)fail.push('incomplete_source_coverage');
  const visibleMeta=[...slide.querySelectorAll('.series,.brand,.folio')].map(e=>({role:e.className,text:e.textContent}));
  for(const e of slide.querySelectorAll('.series,.brand,.folio'))recordPair(e);
  if(slide.innerText.includes('REVIEW')||slide.innerText.includes('BTB-')||slide.innerText.includes('2026-')||slide.innerText.includes('2027-'))fail.push('review_metadata_in_artwork');
  return {passed:fail.length===0,errors:[...new Set(fail)],actual_copy:copy.textContent,blocks:blockDetails,actual_pairs:actualPairs,visible_nonspace_characters:visibleCharacters,metadata:visibleMeta,canvas:rectangle(slide),background,font_faces:[...document.fonts].map(f=>({family:f.family,status:f.status,weight:f.weight}))};
 },{canonical:s.text});
 const actualFonts=[];
 const doc=await cdp.send('DOM.getDocument'),nodes=await cdp.send('DOM.querySelectorAll',{nodeId:doc.root.nodeId,selector:'.copy .copy-block'});
 for(let i=0;i<nodes.nodeIds.length;i++){
  const result=await cdp.send('CSS.getPlatformFontsForNode',{nodeId:nodes.nodeIds[i]}),expected=(state.blocks[i].font_family.includes('Playfair')?'Playfair Display':'Inter');
  actualFonts.push({block:i,expected,fonts:result.fonts});
  if(!result.fonts.length||result.fonts.some(f=>f.familyName!==expected||f.glyphCount<=0||f.isCustomFont!==true)){state.passed=false;state.errors.push('actual_platform_font_'+i);}
 }
 if(state.canvas.width!==1080||state.canvas.height!==1350){state.passed=false;state.errors.push('actual_canvas_dimensions');}
 if(state.blocks.length!==manifestSlide.source_spans.length){state.passed=false;state.errors.push('manifest_source_range_count');}
 for(let i=0;i<state.blocks.length;i++){const actual=state.blocks[i],stored=manifestSlide.source_spans[i];if(!stored||actual.start!==stored.start||actual.end!==stored.end){state.passed=false;state.errors.push('manifest_source_range_'+i);}}
 const metadataExpected=[{role:'series',text:p.series},{role:'brand',text:'Broken to Balanced'},{role:'folio',text:s.number+' / 6'}];
 if(JSON.stringify(state.metadata)!==JSON.stringify(metadataExpected)){state.passed=false;state.errors.push('unexpected_metadata_words');}
 return {id:p.id,slide:s.number,passed:state.passed,errors:state.errors,visible_text_sha256:digest(state.actual_copy||''),source_ranges:state.blocks.map(b=>({start:b.start,end:b.end})),visible_nonspace_characters:state.visible_nonspace_characters,minimum_actual_contrast:Math.min(...state.actual_pairs.map(p=>p.contrast)),actual_fonts:actualFonts};
}
async function main(){
 const review=path.join(ROOT,'review','index.html');
 if(!fs.existsSync(review))throw new Error('Review is not built yet; run build:review first.');
 const preservation=verifyInputsAndPreservation();
 const htmlFiles=[review,...data.posts.map(p=>path.join(ROOT,'review','posts',p.id+'.html'))];
 const references=htmlFiles.map(file=>({page:path.relative(ROOT,file),references:fs.existsSync(file)?localRefs(file):[],exists:fs.existsSync(file)}));
 check('review_html_pages',references.length===181&&references.every(p=>p.exists));
 const badLinks=references.flatMap(p=>p.references.filter(r=>!r.local||!r.exists).map(r=>({page:p.page,...r})));
 check('all_review_href_src_are_existing_local_files',badLinks.length===0,badLinks);
 const outputs=[],manifests=[];
 let pngCount=0,editableCount=0,hashCount=0;
 for(const p of data.posts){
  const manifestPath=path.join(ROOT,'posts',p.id,'post-manifest.json'),m=read(manifestPath),postErrors=[];manifests.push(m);
  const pcheck=(ok,msg)=>{if(!ok)postErrors.push(msg);};
  pcheck(m.id===p.id&&m.day===p.day&&m.planned_date===p.planned_date,'input_identity');
  pcheck(m.input_copy_sha256===p.copy_sha256,'input_hash');
  pcheck(m.semantic_layout===p.layout,'semantic_layout');
  pcheck(['A','B','C'].includes(m.requested_treatment)&&['A','B'].includes(m.effective_treatment),'treatment_labels');
  if(m.requested_treatment==='C')pcheck(m.effective_treatment==='B'&&!!m.fallback_reason&&m.scene_provenance===null,'honest_C_to_B_fallback');
  pcheck(m.owner_approval_status==='PENDING'&&m.founder_attestation_status===(p.founder_attestation_required?'PENDING':'NOT_FLAGGED'),'separate_owner_founder_gates');
  pcheck(m.founder_attestation_required===p.founder_attestation_required,'founder_flag');
  pcheck(m.publish_status===p.publish_status,'unpublished_status');
  pcheck(m.approval_gates.includes('owner_editorial_approval')&&m.approval_gates.includes('original_approved_logo'),'approval_gates');
  if(p.founder_attestation_required)pcheck(m.approval_gates.includes('founder_attestation'),'founder_attestation_gate');
  const captionPath=path.join(ROOT,m.caption),altPath=path.join(ROOT,m.alt_text),altSourcePath=path.join(ROOT,m.alt_text_source),caption=fs.readFileSync(captionPath,'utf8'),alts=read(altPath),altSource=read(altSourcePath);
  pcheck(caption===p.caption_ready_to_copy,'caption_exact');
  pcheck(digest(fs.readFileSync(captionPath))===m.caption_sha256,'caption_hash');
  pcheck(digest(fs.readFileSync(altPath))===m.alt_text_sha256,'alt_hash');
  pcheck(digest(fs.readFileSync(altSourcePath))===m.alt_text_source_sha256,'alt_source_hash');hashCount+=3;
  pcheck(JSON.stringify(alts)===JSON.stringify(p.slides.map(s=>({number:s.number,alt_text:s.alt_text}))),'alt_text_exact');
  pcheck(JSON.stringify(altSource)===JSON.stringify(alts),'source_and_delivery_alt_equal_text_only');
  pcheck(m.slides.length===6,'six_manifest_slides');
  for(let n=0;n<m.slides.length;n++){
   const s=m.slides[n],pngPath=path.join(ROOT,s.png),editablePath=path.join(ROOT,s.editable),png=fs.readFileSync(pngPath),editable=fs.readFileSync(editablePath);
   pcheck(s.number===n+1,'slide_sequence_'+(n+1));
   pcheck(digest(png)===s.png_sha256,'png_hash_'+s.number);pcheck(digest(editable)===s.html_sha256,'html_hash_'+s.number);hashCount+=2;
   pcheck(png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&png.readUInt32BE(16)===1080&&png.readUInt32BE(20)===1350,'png_header_dimensions_'+s.number);
   pcheck(s.png===`posts/${p.id}/${String(s.number).padStart(2,'0')}.png`&&s.editable===`posts/${p.id}/editable/${String(s.number).padStart(2,'0')}.html`,'stable_paths_'+s.number);
   const qa=read(path.join(ROOT,s.qa)),canonical=p.slides[n].text;let end=0;
   for(const span of qa.source_spans){pcheck(span.start===end&&span.text===canonical.slice(span.start,span.end),'qa_exact_source_span_'+s.number);end=span.end;}
   pcheck(end===canonical.length&&qa.source_spans.map(x=>x.text).join('')===canonical&&qa.rendered_text===canonical,'qa_full_source_sequence_'+s.number);
   pcheck(qa.requested_treatment===m.requested_treatment&&qa.effective_treatment===m.effective_treatment,'slide_treatment_'+s.number);
   pcheck(s.scene===null,'no_invented_scene_'+s.number);
   pngCount++;editableCount++;
  }
  outputs.push({id:p.id,passed:postErrors.length===0,errors:postErrors});
 }
 check('all_post_manifest_files_hashes_caption_alt_values',outputs.every(p=>p.passed),outputs.filter(p=>!p.passed));
 const treatmentCounts=countTreatments(manifests);
 check('primary_effective_treatments4A176B0C',treatmentCounts.A===4&&treatmentCounts.B===176&&treatmentCounts.C===0,treatmentCounts);
 check('primary4_requestedC_fallbacks',manifests.filter(m=>m.requested_treatment==='C').length===4);
 const pilot=verifyPilot(manifests);
 check('output_counts',pngCount===1080&&editableCount===1080,{pngs:pngCount,editable:editableCount,hashed_files:hashCount});
 const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{const target=path.join(dir,e.name);return e.isDirectory()?walk(target):[target];});
 const forbidden=walk(ROOT).filter(f=>/\.(ttf|otf|woff2?|ttc)$/i.test(f)||/(?:^|\/)(?:node_modules|\.git|\.env|\.DS_Store|__pycache__|browser-profile|cache)(?:\/|$)/i.test(f)).map(f=>path.relative(ROOT,f));
 check('no_font_binaries_dependency_directories_or_secret_files',forbidden.length===0,forbidden);
 const server=await startServer(),origin='http://127.0.0.1:'+server.address().port;
 let browser,context;
 const postPages=[],filterTests=[],visibleSlides=[];
 let clipboard={};let fileOffline={};
 try{
  const {chromium}=dep('playwright'),executablePath=process.env.BTB_BROWSER||config.browser_path;
  browser=await chromium.launch({headless:true,executablePath,args:['--force-color-profile=srgb','--disable-lcd-text']});
  context=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1});
  await context.route('**/*',route=>{
   const url=route.request().url();
   if(url.startsWith(origin+'/'))return route.continue();
   if(url.startsWith('file:')&&fileURLToPath(url).startsWith(ROOT+path.sep))return route.continue();
   blockedExternalRequests.push(url);return route.abort();
  });
  const page=await context.newPage();
  page.on('pageerror',e=>pageErrors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)responses.push({url:r.url(),status:r.status()});});
  await page.goto(origin+'/review/index.html',{waitUntil:'load'});
  check('index_180_cards',await page.locator('.card').count()===180);
  const cards=await page.locator('.card').evaluateAll(cards=>cards.map(c=>({id:c.querySelector('h2').textContent,effective:c.dataset.treatment,requested:c.dataset.requestedTreatment,approval:c.dataset.approval})));
  check('card_treatment_and_approval_metadata',cards.every(c=>{const p=data.posts.find(p=>p.id===c.id),m=manifests.find(m=>m.id===c.id),gates=c.approval.split(/\s+/);return m&&c.effective===m.effective_treatment&&c.requested===m.requested_treatment&&gates.includes('owner_pending')&&gates.includes('logo_gate')&&gates.includes('founder_pending')===p.founder_attestation_required;}));
  const visibleIds=()=>page.locator('.card:not([hidden]) h2').allTextContents();
  async function testFilter(name,setup,expected){
   await page.locator('#query').fill('');await page.locator('#pillar').selectOption('');await page.locator('#layout').selectOption('');await page.locator('#founder').uncheck();await page.locator('#treatment').selectOption('');await page.locator('#approval').selectOption('');
   await setup();const actual=await visibleIds(),passed=JSON.stringify(actual)===JSON.stringify(expected);
   filterTests.push({name,passed,expected_count:expected.length,actual_count:actual.length});check(name,passed,passed?actual.length:{expected,actual});
  }
  await testFilter('search_by_id',()=>page.locator('#query').fill('BTB-142'),['BTB-142']);
  const series=data.posts.find(p=>p.pillar_id==='P3').series;
  await testFilter('search_by_series',()=>page.locator('#query').fill(series),data.posts.filter(p=>p.series===series).map(p=>p.id));
  await testFilter('search_by_date',()=>page.locator('#query').fill('2027-04-25'),['BTB-180']);
  for(const pillar of Object.keys(data.pillars))await testFilter('pillar_'+pillar,()=>page.locator('#pillar').selectOption(pillar),data.posts.filter(p=>p.pillar_id===pillar).map(p=>p.id));
  for(const layout of ['editorial','contrast','script','checklist','letter'])await testFilter('layout_'+layout,()=>page.locator('#layout').selectOption(layout),data.posts.filter(p=>p.layout===layout).map(p=>p.id));
  for(const treatment of ['A','B','C'])await testFilter('effective_treatment_'+treatment,()=>page.locator('#treatment').selectOption(treatment),manifests.filter(p=>p.effective_treatment===treatment).map(p=>p.id));
  for(const approval of ['owner_pending','logo_gate'])await testFilter('approval_'+approval,()=>page.locator('#approval').selectOption(approval),data.posts.map(p=>p.id));
  await testFilter('approval_founder_pending',()=>page.locator('#approval').selectOption('founder_pending'),data.posts.filter(p=>p.founder_attestation_required).map(p=>p.id));
  await testFilter('founder_12',()=>page.locator('#founder').check(),data.posts.filter(p=>p.founder_attestation_required).map(p=>p.id));
  await testFilter('combined_filters',async()=>{await page.locator('#pillar').selectOption('P3');await page.locator('#layout').selectOption('script');},data.posts.filter(p=>p.pillar_id==='P3'&&p.layout==='script').map(p=>p.id));
  await testFilter('empty_search_result',()=>page.locator('#query').fill('no-matching-post-123456'),[]);
  await testFilter('reset_all',async()=>{},data.posts.map(p=>p.id));
  for(const width of [360,390]){await page.setViewportSize({width,height:844});const indexMobile=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));check('mobile_index_no_horizontal_overflow_'+width,indexMobile.scroll<=indexMobile.viewport,indexMobile);}
  // Every post view is inspected in the actual browser, including exact textarea and six alt/src values.
  for(const p of data.posts){
   await page.goto(origin+'/review/posts/'+p.id+'.html',{waitUntil:'domcontentloaded'});
   const state=await page.evaluate(()=>({caption:document.querySelector('#caption').value,images:[...document.querySelectorAll('.slides img')].map(img=>({src:img.getAttribute('src'),alt:img.alt,width:img.width,height:img.height})),body:document.body.innerText,viewport:innerWidth,scroll:document.documentElement.scrollWidth}));
   const pErrors=[];
   if(state.caption!==p.caption_ready_to_copy)pErrors.push('caption_dom_exact');
   if(state.images.length!==6)pErrors.push('six_images');
   for(let n=0;n<state.images.length;n++)if(state.images[n].src!==`../../posts/${p.id}/${String(n+1).padStart(2,'0')}.png`||state.images[n].alt!==p.slides[n].alt_text)pErrors.push('ordered_src_alt_'+(n+1));
   const phone=[];for(const width of [360,390]){await page.setViewportSize({width,height:844});const geometry=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));phone.push(geometry);if(geometry.scroll>geometry.viewport)pErrors.push('mobile_horizontal_overflow_'+width);}
   if(!state.body.includes('unpublished / owner approval required'))pErrors.push('owner_status');
   if(!state.body.includes(p.copy_sha256))pErrors.push('copy_hash_visible');
   if(p.founder_attestation_required&&!state.body.includes('REQUIRED / PENDING'))pErrors.push('founder_pending');
   const manifest=manifests.find(m=>m.id===p.id);
   if(!state.body.includes('Effective treatment: '+manifest.effective_treatment)||!state.body.includes('Requested treatment: '+manifest.requested_treatment))pErrors.push('visible_treatment_labels');
   if(manifest.requested_treatment==='C'&&(!state.body.includes(manifest.fallback_reason)||!state.body.includes('B fallback')))pErrors.push('visible_C_fallback_reason');
   postPages.push({id:p.id,passed:pErrors.length===0,phone_geometry:phone,images:state.images.length,errors:pErrors});
   if(postPages.length%30===0)console.log('Review browser checked '+postPages.length+'/180 post pages');
  }
  check('all180_browser_post_views',postPages.every(p=>p.passed),postPages.filter(p=>!p.passed));
  const artPage=await context.newPage();await artPage.setViewportSize({width:1080,height:1350});
  artPage.on('pageerror',e=>pageErrors.push(String(e)));artPage.on('response',r=>{if(r.status()>=400)responses.push({url:r.url(),status:r.status()});});
  const cdp=await context.newCDPSession(artPage);await cdp.send('DOM.enable');await cdp.send('CSS.enable');
  for(const p of data.posts){
   const m=manifests.find(m=>m.id===p.id);
   for(let n=0;n<6;n++){
    const s=p.slides[n],ms=m.slides[n];await artPage.goto(origin+'/'+ms.editable,{waitUntil:'load'});
    await artPage.evaluate(async()=>{await document.fonts.ready;await Promise.all([document.fonts.load('500 84px "Playfair Display"'),document.fonts.load('400 60px Inter'),document.fonts.load('500 60px Inter')]);});
    visibleSlides.push(await visibleCopyCheck(artPage,p,s,ms,cdp));
   }
   if(visibleSlides.length%180===0)console.log('Visible styled source browser checked '+visibleSlides.length+'/1080 slides');
  }
  check('all1080_actual_visible_styled_source_sequences',visibleSlides.length===1080&&visibleSlides.every(s=>s.passed),visibleSlides.filter(s=>!s.passed));
  await artPage.close();
  await page.goto(origin+'/review/posts/BTB-001.html',{waitUntil:'load'});
  await context.grantPermissions(['clipboard-read','clipboard-write'],{origin});
  await page.locator('#copy').click();
  await page.waitForFunction(()=>document.querySelector('#copy-status').textContent==='Caption copied.');
  const copied=await page.evaluate(()=>navigator.clipboard.readText());
  clipboard.normal={passed:copied===data.posts[0].caption_ready_to_copy,status:await page.locator('#copy-status').textContent()};
  check('clipboard_exact_caption',clipboard.normal.passed);
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('QA forces unavailable clipboard');}}}));
  await page.locator('#copy').click();
  const fallback=await page.evaluate(()=>{const c=document.querySelector('#caption');return {start:c.selectionStart,end:c.selectionEnd,length:c.value.length,status:document.querySelector('#copy-status').textContent,focused:document.activeElement===c};});
  clipboard.fallback={...fallback,passed:fallback.start===0&&fallback.end===fallback.length&&fallback.focused&&fallback.status.includes('Caption selected.')};
  check('clipboard_plain_text_fallback',clipboard.fallback.passed,clipboard.fallback);
  try{
   await page.goto(pathToFileURL(review).href,{waitUntil:'load'});await page.locator('#founder').check();
   fileOffline={passed:(await visibleIds()).length===12,protocol:'file:',filtered_founders:(await visibleIds()).length};
  }catch(e){fileOffline={passed:false,error:String(e)};}
  check('offline_file_index_filters',fileOffline.passed,fileOffline);
  check('no_javascript_errors',pageErrors.length===0,pageErrors);
  check('no_failed_http_responses',responses.length===0,responses);
  check('no_external_requests',blockedExternalRequests.length===0,blockedExternalRequests);
 }finally{
  if(context)await context.close();if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));
 }
 const report={audit_version:'2.0',status:errors.length?'FAIL':'PASS',method:'Independent static reference/SHA-256/header checks, pilot/gate/source-preservation checks, and local-only Chromium checks of all180 review views at360/390px plus all1080 actual styled editable source slides at1080x1350. Actual visible text nodes, source ranges, character geometry, contrast and Chromium platform fonts verified. No owner approval inferred.',runtime:{node:process.version,playwright:dep('playwright/package.json').version,browser:config.browser_path},source_sha256:digest(fs.readFileSync(path.join(__dirname,'input','BTB_180_Day_Content.json'))),counts:{review_pages:htmlFiles.length,carousel_pngs:pngCount,editable_slides:editableCount,hashed_output_files:hashCount,post_pages_browser_checked:postPages.length,actual_visible_source_slides_browser_checked:visibleSlides.length,effective_treatments:treatmentCounts},preservation,pilot,checks,errors,filter_tests:filterTests,clipboard,offline_file:fileOffline,post_output_checks:outputs,browser_post_checks:postPages,actual_visible_source_checks:visibleSlides,link_checks:{pages:references.length,total_references:references.reduce((n,p)=>n+p.references.length,0),broken_or_external:badLinks},javascript_errors:pageErrors,console_errors:consoleErrors,failed_http_responses:responses,blocked_external_requests:blockedExternalRequests,limits:['Checks cover review UI, exact visible styled source and local output manifests, not personal attestation, clinical/legal sufficiency or audience results.','PNG headers and SHA-256 verified independently; full pixel decoding and color profile are separate image QA.','No font binaries, dependencies, browser profiles or private documents are included in this audit. Archive byte integrity is checked by package.py after this report exists.','No C scene exists; four requested-C pilot assignments are accurately treated as B, so the three-way test remains incomplete.']};
 fs.writeFileSync(path.join(ROOT,'qa','review-interface.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:report.status,counts:report.counts,errors:report.errors}));
 if(errors.length)process.exitCode=1;
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
