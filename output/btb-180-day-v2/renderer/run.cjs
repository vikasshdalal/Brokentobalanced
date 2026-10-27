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
const presentation=require('./presentation.cjs'),measure=require('./measure.cjs');
function prepareDesign(){
 const pilot=read(path.join(ROOT,'pilot','visual-test-assignments.json'));
 const design=presentation.build(data,pilot);
 write(path.join(ROOT,'Visual_Design_Overrides_v2.json'),design);
 return design;
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
async function render(mode='all'){
 validate();for(const k of ['headings','body'])if(!fs.existsSync(fontPath(k))||hash(fs.readFileSync(fontPath(k)))!==config.fonts[k].sha256)throw Error('Exact pinned font absent/mismatched: '+k);
 const design=prepareDesign(),selected=mode==='all'?data.posts:data.posts.filter(p=>config.sample_ids.includes(p.id));
 const jobs=selected.map(p=>({p,plan:design.posts.find(x=>x.id===p.id),dir:mode==='all'||p.id==='BTB-001'?'posts/'+p.id:'proofs/representative/'+p.id}));
 if(mode!=='all')for(const treatment of ['A','B']){const p=data.posts[0],source=design.posts[0],plan=JSON.parse(JSON.stringify(source));plan.requested_treatment=treatment;plan.effective_treatment=treatment;plan.fallback_reason=null;for(const slide of plan.slides)if(treatment==='A'){slide.background_token='charcoal';slide.background_reason='Dark editorial comparison; same exact reference source spans.'}jobs.push({p,plan,dir:'proofs/BTB-001/'+treatment});}
 const server=await startServer(),url='http://127.0.0.1:'+server.address().port;let browser;
 try{
  browser=await launch();const page=await browser.newPage({viewport:{width:1080,height:1350},deviceScaleFactor:1,colorScheme:'light',reducedMotion:'reduce'});
  await page.route('**/*',route=>route.request().url().startsWith(url+'/')?route.continue():route.abort());
  const cdp=await page.context().newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');
  const completed=[],failures=[];
  for(const {p,plan,dir:relativeDir}of jobs){
   try{
    const dir=path.join(ROOT,relativeDir);fs.mkdirSync(path.join(dir,'editable'),{recursive:true});
    write(path.join(dir,'caption.txt'),p.caption_ready_to_copy);const alts=p.slides.map(s=>({number:s.number,alt_text:s.alt_text}));write(path.join(dir,'alt-text-source.json'),alts);write(path.join(dir,'alt-text.json'),alts);
    const records=[];
    for(const slide of p.slides){
     const n=String(slide.number).padStart(2,'0'),rel=relativeDir+'/editable/'+n+'.html',hp=path.join(ROOT,rel),out=path.join(dir,n+'.png'),decision=plan.slides[slide.number-1],prefix=path.relative(path.dirname(hp),ROOT).split(path.sep).join('/')+'/';
     let result,fitted;
     write(hp,presentation.html(p,slide,decision,prefix));
     for(let attempt=1;attempt<=2;attempt++){
      try{
       await page.goto(url+'/'+rel,{waitUntil:'load'});
       const faces=await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([document.fonts.load('500 94px "Playfair Display"'),document.fonts.load('400 60px Inter'),document.fonts.load('450 58px Inter'),document.fonts.load('500 60px Inter')]);return [...document.fonts].map(f=>({family:f.family,status:f.status,weight:f.weight}));});
       if(faces.some(f=>f.status!=='loaded'))throw Error('font_not_loaded');
       fitted=await measure.fit(page);result=await measure.geometry(page,p,slide,decision);result.font_faces=faces;result.platform_fonts=[];
       const dom=await cdp.send('DOM.getDocument');
       for(let i=0;i<decision.blocks.length;i++){
        const node=await cdp.send('DOM.querySelector',{nodeId:dom.root.nodeId,selector:'.copy-block:nth-child('+(i+1)+')'}),fonts=(await cdp.send('CSS.getPlatformFontsForNode',{nodeId:node.nodeId})).fonts,expected=decision.blocks[i].font_family;
        result.platform_fonts.push({block:i,expected,fonts});if(!fonts.length||fonts.some(f=>f.familyName!==expected||!f.isCustomFont))result.errors.push('unexpected_platform_font_'+i);
       }
       result.passed=result.errors.length===0;if(!result.passed)throw Error(result.errors.join(','));
       write(hp,presentation.html(p,slide,decision,prefix,fitted));
       const key=hash(fs.readFileSync(hp))+':'+config.renderer_version+':'+config.fonts.headings.sha256+':'+config.fonts.body.sha256+':'+hash(fs.readFileSync(path.join(__dirname,'styles.css')));
       const cached=fs.existsSync(path.join(dir,'post-manifest.json'))?read(path.join(dir,'post-manifest.json')).slides.find(x=>x.number===slide.number):null;
       if(!fs.existsSync(out)||cached?.render_key!==key||hash(fs.readFileSync(out))!==cached.png_sha256)await page.locator('.slide').screenshot({path:out,animations:'disabled',scale:'css'});
       result.png=relativeDir+'/'+n+'.png';result.editable=rel;result.png_sha256=hash(fs.readFileSync(out));result.html_sha256=hash(fs.readFileSync(hp));result.render_key=key;result.attempts=attempt;
       result.requested_treatment=plan.requested_treatment;result.effective_treatment=plan.effective_treatment;
       const qaRel=relativeDir.startsWith('posts/')?'qa/slides/'+p.id+'-'+n+'.json':relativeDir+'/qa/'+n+'.json';write(path.join(ROOT,qaRel),result);
       records.push({number:slide.number,png:result.png,editable:rel,png_sha256:result.png_sha256,html_sha256:result.html_sha256,render_key:key,qa_status:'PASS',qa:qaRel,background_token:decision.background_token,background_reason:decision.background_reason,role:decision.role,composition:decision.composition,source_spans:decision.blocks,emphasis_ranges:decision.emphasis,fitted_typography:fitted,scene:null});break;
      }catch(e){if(attempt===2){write(path.join(QA,'failures',p.id+'-'+n+'-'+plan.requested_treatment+'.json'),{id:p.id,slide:slide.number,directory:relativeDir,error:e.message,geometry:result});throw e;}}
     }
    }
    const manifest={id:p.id,day:p.day,planned_date:p.planned_date,timezone:p.timezone,date_status:p.date_status,input_copy_sha256:p.copy_sha256,semantic_layout:p.layout,layout:p.layout,visual_brief:p.visual_brief,requested_treatment:plan.requested_treatment,effective_treatment:plan.effective_treatment,fallback_reason:plan.fallback_reason,scene_provenance:null,primary_cta:p.primary_cta,renderer_version:config.renderer_version,renderer_sha256:RENDERER_HASH,presentation_sha256:hash(fs.readFileSync(path.join(__dirname,'presentation.cjs'))),measurement_sha256:hash(fs.readFileSync(path.join(__dirname,'measure.cjs'))),config_sha256:hash(fs.readFileSync(path.join(__dirname,'runtime-config.json'))),brand_status:'provisional_wordmark',original_logo:null,font_status:'exact_runtime_fonts_loaded',approval_gates:['original_approved_logo','owner_editorial_approval',...(p.founder_attestation_required?['founder_attestation']:[])],founder_attestation_required:p.founder_attestation_required,founder_attestation_status:p.founder_attestation_required?'PENDING':'NOT_FLAGGED',owner_approval_status:'PENDING',design_review_status:'AUTOMATED_QA_PASSED_VISUAL_REVIEW_SEPARATE',publish_status:p.publish_status,production_status:'REVIEW_RENDERED',qa_status:'PASS',caption:relativeDir+'/caption.txt',caption_sha256:hash(fs.readFileSync(path.join(dir,'caption.txt'))),alt_text_source:relativeDir+'/alt-text-source.json',alt_text_source_sha256:hash(fs.readFileSync(path.join(dir,'alt-text-source.json'))),alt_text:relativeDir+'/alt-text.json',alt_text_sha256:hash(fs.readFileSync(path.join(dir,'alt-text.json'))),slides:records};
    write(path.join(dir,'post-manifest.json'),manifest);completed.push({id:p.id,directory:relativeDir,slides:6,qa:'PASS'});
    write(path.join(QA,mode==='all'?'render-checkpoint.json':'proof-checkpoint.json'),{renderer_version:config.renderer_version,completed,failures,post_count:completed.length,png_count:completed.length*6});
    if(completed.length%10===0||mode!=='all')console.log('Rendered',relativeDir,completed.length+'/'+jobs.length);
   }catch(e){failures.push({id:p.id,directory:relativeDir,error:e.message});write(path.join(QA,mode==='all'?'render-checkpoint.json':'proof-checkpoint.json'),{renderer_version:config.renderer_version,completed,failures,post_count:completed.length,png_count:completed.length*6});console.error('Recorded failed post',p.id,e.message);}
  }
  write(path.join(__dirname,'runtime-lock.json'),{node:process.version,playwright:require(path.join(path.dirname(require.resolve(depPath('playwright'))),'package.json')).version,sharp:dep('sharp').versions,browser:browser.version(),browser_path:config.browser_path,renderer_sha256:RENDERER_HASH,styles_sha256:hash(fs.readFileSync(path.join(__dirname,'styles.css'))),presentation_sha256:hash(fs.readFileSync(path.join(__dirname,'presentation.cjs'))),measurement_sha256:hash(fs.readFileSync(path.join(__dirname,'measure.cjs'))),fonts:config.fonts});
  if(mode!=='all')write(path.join(ROOT,'proofs','BTB-001','C-unavailable.json'),{requested_treatment:'C',effective_treatment:'B',status:'SCENE_UNAVAILABLE',reason:'No approved local scene or verified no-additional-spend native generation entitlement.',actual_scene_assets:0,fallback:'proofs/BTB-001/B/01.png'});
  if(failures.length)throw Error('Failed posts: '+failures.map(f=>f.id).join(','));
 }finally{if(browser)await browser.close();server.close();}
}
function depPath(n){for(const r of moduleRoots){if(fs.existsSync(path.join(r,n)))return path.join(r,n)}return n;}
async function qa(){validate();await require('./qa.cjs')({ROOT,data,config,read,write,hash,dep,contrast});}
async function review(){const make=require('./review.cjs');await make({ROOT,data,write,read,hash,dep});}
async function pack(){await qa();await review();execFileSync(process.execPath,[path.join(__dirname,'verify_review.cjs')],{stdio:'inherit'});execFileSync('python3',[path.join(__dirname,'package.py'),ROOT],{stdio:'inherit'});}
(async()=>{const command=process.argv[2];if(command==='validate:content'){validate();console.log('Content PASS')}else if(command==='design:prepare'){prepareDesign();console.log('V2 source-span decisions prepared')}else if(command==='render:sample')await render('sample');else if(command==='render:all')await render('all');else if(command==='proofs:build')await require('./proofs.cjs')({ROOT,data,write,read,hash,dep});else if(command==='qa:visuals')await qa();else if(command==='qa:review')execFileSync(process.execPath,[path.join(__dirname,'verify_review.cjs')],{stdio:'inherit'});else if(command==='build:review')await review();else if(command==='package:exports')await pack();else if(command==='serve'){const s=await startServer(+(process.env.BTB_PORT||8000));console.log('Local review: http://127.0.0.1:'+s.address().port+'/review/index.html');}else throw Error('Use validate:content, render:sample, render:all, qa:visuals, qa:review, build:review, package:exports, serve');})().catch(e=>{console.error(e);process.exitCode=1});
