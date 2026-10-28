'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),http=require('node:http');
const {execFileSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..'),INPUT=path.join(__dirname,'input'),QA=path.join(ROOT,'qa');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const RENDERER_HASH=hash(fs.readFileSync(__filename));
const write=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n')};
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const data=read(path.join(INPUT,'BTB_180_Day_Content.json')),brand=read(path.join(INPUT,'Brand_Config.json'));
const moduleRoots=[process.env.BTB_NODE_MODULES,'/Users/vikasshdalal/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'].filter(Boolean);
function dep(name){try{return require(name)}catch{}for(const r of moduleRoots){try{return require(path.join(r,name))}catch{}}throw Error('Install pinned dependency '+name+' or set BTB_NODE_MODULES');}
const config=read(path.join(__dirname,'runtime-config.json'));
const fontPath=k=>process.env[k==='headings'?'BTB_HEADING_FONT':'BTB_BODY_FONT']||config.fonts[k].path;
function validate(){
 let errors=[],posts=[];const add=(test,id)=>{if(!test)errors.push(id)};
 const schema=read(path.join(__dirname,'content-schema.json'));
 // Validate every keyword used by our explicitly scoped JSON Schema (no remote refs).
 function schemaCheck(value,s,loc){
  if(s.$ref)s=s.$ref.split('/').slice(1).reduce((o,k)=>o[k],schema);
  if('const'in s&&value!==s.const)errors.push(loc+':const');
  if(s.enum&&!s.enum.includes(value))errors.push(loc+':enum');
  const type=value===null?'null':Array.isArray(value)?'array':typeof value;
  if(s.type&&(s.type==='integer'?!Number.isInteger(value):type!==s.type)){errors.push(loc+':type');return;}
  if(type==='string'){if(s.minLength&&value.length<s.minLength)errors.push(loc+':minLength');if(s.pattern&&!new RegExp(s.pattern).test(value))errors.push(loc+':pattern');}
  if(type==='number'){if(s.minimum!==undefined&&value<s.minimum)errors.push(loc+':minimum');if(s.maximum!==undefined&&value>s.maximum)errors.push(loc+':maximum');}
  if(type==='array'){if(s.minItems&&value.length<s.minItems)errors.push(loc+':minItems');if(s.maxItems!==undefined&&value.length>s.maxItems)errors.push(loc+':maxItems');if(s.items)value.forEach((x,i)=>schemaCheck(x,s.items,loc+'/'+i));}
  if(type==='object'){for(const k of s.required||[])if(!(k in value))errors.push(loc+':required:'+k);for(const [k,rule]of Object.entries(s.properties||{}))if(k in value)schemaCheck(value[k],rule,loc+'/'+k);}
 }
 schemaCheck(data,schema,'root');
 add(data.schema_version==='1.0','schema');add(data.posts.length===180,'post_count');
 let pillars={};
 for(let i=0;i<data.posts.length;i++){
  const p=data.posts[i];let e=[];const check=(v,k)=>{if(!v)e.push(k)};
  check(p.id===`BTB-${String(i+1).padStart(3,'0')}`,'id');check(p.day===i+1,'day');
  check(p.planned_date===new Date(Date.UTC(2026,9,28+i)).toISOString().slice(0,10),'date');
  for(const k of ['caption','caption_ready_to_copy','series','visual_brief','copy_sha256','publish_status'])check(typeof p[k]==='string'&&p[k].length>0,k);
  check(brand.layouts.includes(p.layout),'layout');check(p.slides.length===6,'slide_count');
  for(let j=0;j<p.slides.length;j++){const s=p.slides[j];check(s.number===j+1&&typeof s.text==='string'&&s.text.length>0&&typeof s.alt_text==='string'&&s.alt_text.length>0,'slide_'+(j+1));}
  const calculated=hash(p.slides.map(s=>s.text).join('\n')+'\n'+p.caption);check(calculated===p.copy_sha256,'copy_hash');
  check(p.caption_ready_to_copy===p.caption+'\n\n'+p.hashtags.join(' '),'caption_composition');
  check(p.performance_actuals===null,'unknown_performance');check(p.timezone==='America/Toronto','timezone');
  pillars[p.pillar_id]=(pillars[p.pillar_id]||0)+1;posts.push({id:p.id,passed:e.length===0,input_copy_sha256:p.copy_sha256,calculated_copy_sha256:calculated,slides:p.slides.map(s=>({number:s.number,text_sha256:hash(s.text),alt_text_sha256:hash(s.alt_text)})),errors:e});errors.push(...e.map(x=>p.id+':'+x));
 }
 add(JSON.stringify(Object.entries(pillars).sort())===JSON.stringify(Object.entries({P1:36,P2:36,P3:30,P4:30,P5:36,P6:12}).sort()),'pillar_counts');
 add(data.posts.filter(p=>p.founder_attestation_required).length===12,'founder_count');
 const source=fs.readFileSync(path.join(INPUT,'BTB_180_Day_Content.json'));
 add(hash(source)===config.input_sha256,'source_file_hash');
 const result={status:errors.length?'FAIL':'PASS',input_file_sha256:hash(source),posts:180,slides:1080,founder_posts:data.posts.filter(p=>p.founder_attestation_required).map(p=>p.id),pillar_counts:pillars,results:posts,errors};
 write(path.join(QA,'content-validation.json'),result);if(errors.length)throw Error('Content validation failed '+errors.join(','));return result;
}
function startServer(port=0){
 const server=http.createServer((req,res)=>{
  try{let u=decodeURIComponent(new URL(req.url,'http://localhost').pathname),p;
   if(u.startsWith('/__fonts/')){const k=u.split('/').pop();if(!['headings','body'].includes(k))throw Error();p=fontPath(k);res.setHeader('Content-Type','font/ttf');}
   else{if(u==='/')u='/review/index.html';p=path.resolve(ROOT,'.'+u);if(!p.startsWith(ROOT+path.sep))throw Error();const ext=path.extname(p);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.json':'application/json','.png':'image/png','.txt':'text/plain; charset=utf-8'})[ext]||'application/octet-stream');}
   res.setHeader('Cache-Control','no-store');res.setHeader('Access-Control-Allow-Origin','*');res.end(fs.readFileSync(p));
  }catch{res.statusCode=404;res.end('Not found');}
 });return new Promise(resolve=>server.listen(port,'127.0.0.1',()=>resolve(server)));
}
async function launch(){const {chromium}=dep('playwright');let executablePath=process.env.BTB_BROWSER||config.browser_path;if(!fs.existsSync(executablePath))executablePath=chromium.executablePath();return chromium.launch({executablePath,headless:true,args:['--force-color-profile=srgb','--disable-lcd-text']});}
function contrast(a,b){const l=h=>{const rgb=h.startsWith('rgb')?h.match(/[\d.]+/g).slice(0,3).map(Number):h.replace('#','').match(/\w\w/g).map(x=>parseInt(x,16));const c=rgb.map(x=>x/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722};let x=l(a),y=l(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
const layout=require('./scene-layout.cjs');
const POST=data.posts.find(p=>p.id==='BTB-001');
async function prepareBackgrounds(){
 const sharp=dep('sharp'),scenePlan=read(path.join(ROOT,'scene-plan.json')),provenance=[];
 const seen=new Set();
 for(const scene of scenePlan.scenes){
  const n=String(scene.slide).padStart(2,'0'),raw=path.join(ROOT,'assets/BTB-001/backgrounds/'+n+'-raw.png');
  if(!fs.existsSync(raw))throw Error('BLOCKED_IMAGE_ASSETS: missing real background '+n);
  const meta=await sharp(raw).metadata(),rawHash=hash(fs.readFileSync(raw));if(seen.has(rawHash))throw Error('Repeated raw scene');seen.add(rawHash);
  const top=scene.slide===5?60:0,height=meta.height-top,width=Math.min(meta.width,Math.round(height*.8)),left=Math.floor((meta.width-width)/2),crop={left,top,width,height};
  const target='assets/BTB-001/backgrounds/'+n+'-crop.png';
  await sharp(raw).extract(crop).resize(1080,1350,{fit:'cover',position:'centre'}).toColourspace('srgb').png().toFile(path.join(ROOT,target));
  scene.crop={source_width:meta.width,source_height:meta.height,extract:crop,output_width:1080,output_height:1350,fit:'cover',stretch:false,reason:scene.slide===5?'Exclude non-identifying chin edge; preserve shoulder-down adults, mugs and bag.':'Minimal centred4:5crop from actual supported portrait output.'};scene.cropped_background=target;scene.cropped_sha256=hash(fs.readFileSync(path.join(ROOT,target)));
  let receipt=null;const workerReceipt=path.join(ROOT,'assets/BTB-001/generation-briefs/'+n+'-generation.json');const mainReceipt=path.join(ROOT,'assets/BTB-001/generation-briefs/'+n+'-tool-receipt.json');if(fs.existsSync(workerReceipt))receipt=path.relative(ROOT,workerReceipt);else if(fs.existsSync(mainReceipt))receipt=path.relative(ROOT,mainReceipt);
  provenance.push({slide:scene.slide,origin:'native AI-generated illustration',raw_path:path.relative(ROOT,raw),raw_sha256:rawHash,raw_bytes:fs.statSync(raw).size,raw_dimensions:{width:meta.width,height:meta.height},crop:scene.crop,cropped_path:target,cropped_sha256:scene.cropped_sha256,continuity_reference:scene.slide>1?'assets/BTB-001/backgrounds/01-raw.png':null,tool:'image_gen__imagegen',model:null,seed:null,receipt_path:receipt,attempts:1,paid_API_or_fallback:false,source_file_preserved:true,credentials_note:'Raw native file preserved byte-for-byte. Content credentials not exposed/verified; derived export credential survival is not claimed.'});
 }
 write(path.join(ROOT,'scene-plan.json'),scenePlan);write(path.join(ROOT,'assets/BTB-001/provenance.json'),{unique_generated_backgrounds:provenance.length,origin:'Six distinct native generated fictional illustrative scenes; no founder/documentary photographs.',assets:provenance});return scenePlan;
}
function luminance(r,g,b){const c=[r,g,b].map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
async function rasterContrast(buffer,regions){
 const sharp=dep('sharp'),raw=await sharp(buffer).removeAlpha().raw().toBuffer({resolveWithObject:true}),reports=[];
 for(const region of regions){const rgb=region.foreground.match(/[\d.]+/g).slice(0,3).map(Number),fg=luminance(...rgb),x0=Math.max(0,Math.floor(region.x)-1),x1=Math.min(1080,Math.ceil(region.right)+1),y0=Math.max(0,Math.floor(region.y)-1),y1=Math.min(1350,Math.ceil(region.bottom)+1);let worst=Infinity,location=null,pixels=0;
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=(y*raw.info.width+x)*raw.info.channels,colour=[raw.data[i],raw.data[i+1],raw.data[i+2]],bg=luminance(...colour),ratio=(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);pixels++;if(ratio<worst){worst=ratio;location={x,y,RGB:colour};}}
  reports.push({role:region.role,foreground:region.foreground,rectangle:{x:x0,y:y0,width:x1-x0,height:y1-y0},pixels_tested:pixels,worst_ratio:worst,worst_pixel:location,passed:worst>=4.5});
 }
 return {passed:reports.every(r=>r.passed),worst_ratio:Math.min(...reports.map(r=>r.worst_ratio)),pixels_tested:reports.reduce((n,r)=>n+r.pixels_tested,0),method:'Exhaustive every-pixel scan of conservative actual visible-copy line rectangles and metadata rectangles (expanded1px) in final cropped photo+local-scrim raster before lettering. No global colour average or arbitrary sample points.',limitations:'Nominal opaque foreground colour versus underlying raster; conservative rectangles include whitespace. Not a formal accessibility certification; antialiased edge-pixel contrast is not separately asserted.',regions:reports};
}
async function renderPrototype(){
 validate();for(const k of ['headings','body'])if(hash(fs.readFileSync(fontPath(k)))!==config.fonts[k].sha256)throw Error('Pinned font mismatch '+k);
 const scenes=await prepareBackgrounds(),decisions=layout.plan(POST),dir=path.join(ROOT,'prototype/BTB-001');
 write(path.join(dir,'caption.txt'),POST.caption_ready_to_copy);write(path.join(dir,'alt-text-source.json'),POST.slides.map(s=>({number:s.number,alt_text:s.alt_text})));
 const sceneAlt=[
  'AI illustration of an anonymous adult preparing a lunch bag in a home kitchen, with an empty chair and closed laptop visible.',
  'AI illustration of a lunch container, plain lunch bag, closed laptop and blank envelope on a wooden kitchen table.',
  'AI illustration of an anonymous adult viewed from behind pausing at a wooden desk beside an open laptop.',
  'AI illustration of a blank notebook and pen on a wooden work surface, with papers set aside in a tray.',
  'AI illustration of two anonymous adults partly visible at a kitchen table, with two mugs and a closed lunch bag.',
  'AI illustration of two anonymous adults seen from behind walking side by side along a park path.'
 ];
 write(path.join(dir,'alt-text.json'),POST.slides.map((s,i)=>({number:s.number,alt_text:sceneAlt[i]+' '+s.text,source_alt_text_unchanged_in:'alt-text-source.json',derived_reason:'Describe actual illustrative AI background and retain complete canonical slide wording.'})));
 const server=await startServer(),origin='http://127.0.0.1:'+server.address().port;let browser;const outputs=[],failures=[];
 try{
  browser=await launch();const page=await browser.newPage({viewport:{width:1080,height:1350},deviceScaleFactor:1,colorScheme:'light',reducedMotion:'reduce'});await page.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());const cdp=await page.context().newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');
  for(const s of POST.slides){
   try{
    const n=String(s.number).padStart(2,'0'),d=decisions[s.number-1],htmlRel='prototype/BTB-001/editable/'+n+'.html',htmlPath=path.join(ROOT,htmlRel);let result,contrastReport,acceptedAlpha=null,fitted,underlay;
    for(const alpha of [.40,.46,.52,.58,.64,.70]){
     write(htmlPath,layout.html(POST,s,d,alpha));await page.goto(origin+'/'+htmlRel,{waitUntil:'load'});
     const fonts=await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([document.fonts.load('500 56px Inter'),document.fonts.load('600 84px Inter'),document.fonts.load('700 84px Inter'),document.fonts.load('500 74px "Playfair Display"')]);await Promise.all([...document.images].map(i=>i.decode()));return[...document.fonts].map(f=>({family:f.family,status:f.status,weight:f.weight}));});if(fonts.some(f=>f.status!=='loaded'))throw Error('Font not loaded');
     fitted=await layout.fit(page);result=await layout.geometry(page,s);result.font_faces=fonts;if(!result.passed)throw Error(result.errors.join(','));
     await page.addStyleTag({content:'.copy,.handle,.disclosure,.folio{visibility:hidden!important}'});underlay=await page.locator('.slide').screenshot({animations:'disabled',scale:'css'});contrastReport=await rasterContrast(underlay,result.contrast_regions);
     if(contrastReport.passed){acceptedAlpha=alpha;break;}
    }
    if(acceptedAlpha===null)throw Error('Raster contrast cannot pass without stronger redesign');
    write(htmlPath,layout.html(POST,s,d,acceptedAlpha,fitted));await page.goto(origin+'/'+htmlRel,{waitUntil:'load'});await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});result=await layout.geometry(page,s);if(!result.passed)throw Error(result.errors.join(','));
    const dom=await cdp.send('DOM.getDocument');result.actual_fonts=[];
    for(const selector of ['.copy','.handle','.disclosure','.folio']){const node=await cdp.send('DOM.querySelector',{nodeId:dom.root.nodeId,selector}),fonts=(await cdp.send('CSS.getPlatformFontsForNode',{nodeId:node.nodeId})).fonts;result.actual_fonts.push({selector,fonts});if(!fonts.length||fonts.some(f=>f.familyName!=='Inter'||!f.isCustomFont))throw Error('Actual font fallback '+selector);}
    const pngRel='prototype/BTB-001/'+n+'.png',pngPath=path.join(ROOT,pngRel);await page.locator('.slide').screenshot({path:pngPath,animations:'disabled',scale:'css'});
    const underlayRel='assets/BTB-001/backgrounds/'+n+'-underlay.png';fs.writeFileSync(path.join(ROOT,underlayRel),underlay);
    const clearFraction=(d.overlay.start+(.20/acceptedAlpha)*(d.overlay.full_by-d.overlay.start))/1350;
    const record={number:s.number,png:pngRel,png_sha256:hash(fs.readFileSync(pngPath)),editable:htmlRel,html_sha256:hash(fs.readFileSync(htmlPath)),background:scenes.scenes[s.number-1].cropped_background,background_sha256:scenes.scenes[s.number-1].cropped_sha256,raw_background:scenes.scenes[s.number-1].result_path,raw_background_sha256:scenes.scenes[s.number-1].result_sha256,crop:scenes.scenes[s.number-1].crop,underlay:underlayRel,underlay_sha256:hash(underlay),layout:{...d,overlay:{...d.overlay,alpha:acceptedAlpha},fitted_typography:fitted},image_area_with_scrim_alpha_at_most_point2:clearFraction,contrast_worst:contrastReport.worst_ratio,qa:'qa/slides/'+n+'.json',qa_status:'PASS'};
    result.contrast=contrastReport;result.overlay=record.layout.overlay;result.passed=true;result.png=pngRel;result.editable=htmlRel;write(path.join(ROOT,record.qa),result);write(path.join(QA,'contrast-slides',n+'.json'),contrastReport);outputs.push(record);
    scenes.scenes[s.number-1].composition_qa='PASS';scenes.scenes[s.number-1].composite_path=pngRel;
    write(path.join(QA,'checkpoint.json'),{prototype_revision:'v3-phase-A-r1',completed:outputs.map(o=>o.number),missing:[1,2,3,4,5,6].filter(n=>!outputs.some(o=>o.number===n)),failures,unique_generated_backgrounds:6,phase_B_started:false});console.log('Rendered scene-led BTB-001 slide',s.number,'alpha',acceptedAlpha,'contrast',contrastReport.worst_ratio.toFixed(3));
   }catch(e){failures.push({slide:s.number,error:e.message});write(path.join(QA,'failures',String(s.number).padStart(2,'0')+'.json'),{slide:s.number,error:e.message});console.error('Slide failed',s.number,e.message);}
  }
  write(path.join(ROOT,'scene-plan.json'),scenes);write(path.join(dir,'post-manifest.json'),{id:POST.id,day:POST.day,planned_date:POST.planned_date,timezone:POST.timezone,input_copy_sha256:POST.copy_sha256,prototype_revision:'v3-phase-A-r1',renderer_version:config.renderer_version,renderer_sha256:RENDERER_HASH,scene_layout_sha256:hash(fs.readFileSync(path.join(__dirname,'scene-layout.cjs'))),styles_sha256:hash(fs.readFileSync(path.join(__dirname,'styles.css'))),semantic_layout:POST.layout,visual_brief_override:'V3 requires meaningful generated scene on every slide; v1/v2 plain-card and optional-scene defaults superseded.',caption:'prototype/BTB-001/caption.txt',caption_sha256:hash(fs.readFileSync(path.join(dir,'caption.txt'))),alt_text_source:'prototype/BTB-001/alt-text-source.json',alt_text:'prototype/BTB-001/alt-text.json',font_status:'Exact Inter used with genuine500/600/700 variable weights; Playfair verified available, not forced into the direct cover.',brand_status:'provisional_wordmark',identity_on_artwork:'@brokentobalanced plain-text fallback',original_logo:null,production_status:failures.length?'INCOMPLETE_PROTOTYPE':'PROTOTYPE_RENDERED',design_approval:'PENDING',owner_editorial_approval:'PENDING',founder_attestation_required:POST.founder_attestation_required,publish_status:POST.publish_status,illustration_origin:'Six native AI-generated fictional scenes, not founder photographs or documented events.',disclosure:'Illustrative AI scene',phase_B_authorized:false,slides:outputs,failures});
  write(path.join(__dirname,'runtime-lock.json'),{node:process.version,playwright:dep('playwright/package.json').version,sharp:dep('sharp').versions,browser:browser.version(),browser_path:config.browser_path,renderer_sha256:RENDERER_HASH,scene_layout_sha256:hash(fs.readFileSync(path.join(__dirname,'scene-layout.cjs'))),styles_sha256:hash(fs.readFileSync(path.join(__dirname,'styles.css'))),fonts:config.fonts});if(failures.length)throw Error('Unresolved prototype slides:'+failures.map(f=>f.slide).join(','));
 }finally{if(browser)await browser.close();server.close();}
}
async function qaPrototype(){return require('./qa.cjs')({ROOT,data,POST,config,read,write,hash,dep});}
async function review(){return require('./review.cjs')({ROOT,POST,read,write,hash,dep});}
(async()=>{const cmd=process.argv[2];if(cmd==='validate:content'){validate();console.log('All180canonical hashes PASS')}else if(cmd==='prepare:backgrounds')await prepareBackgrounds();else if(cmd==='render:prototype')await renderPrototype();else if(cmd==='qa:prototype')await qaPrototype();else if(cmd==='build:review')await review();else if(cmd==='package:prototype'){await qaPrototype();await review();execFileSync('python3',[path.join(__dirname,'package.py'),ROOT],{stdio:'inherit'});}else if(cmd==='serve'){const s=await startServer(+(process.env.BTB_PORT||8000));console.log('Review:http://127.0.0.1:'+s.address().port+'/review/index.html')}else throw Error('PhaseAonly:validate:content,prepare:backgrounds,render:prototype,qa:prototype,build:review,package:prototype,serve. PhaseBnotauthorized.');})().catch(e=>{console.error(e);process.exitCode=1});
