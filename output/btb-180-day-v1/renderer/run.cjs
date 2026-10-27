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
function emphasis(p,s){
 const t=s.text;if(s.number===1)return esc(t);
 if(p.layout==='script'&&t.includes('“')&&t.includes('”'))return esc(t.slice(0,t.indexOf('“')))+'<span class="quote">'+esc(t.slice(t.indexOf('“'),t.indexOf('”')+1))+'</span>'+esc(t.slice(t.indexOf('”')+1));
 if(p.layout==='contrast'){const m=t.match(/^.+?[.!?](?:\s|$)/);if(m&&m[0].length<t.length)return '<span class="emphasis">'+esc(m[0])+'</span>'+esc(t.slice(m[0].length));}
 return esc(t);
}
function html(p,s){
 const dark=s.number===1||s.number===6||({editorial:[2],contrast:[3],script:[4],checklist:[],letter:[]}[p.layout]).includes(s.number);
 const quote=p.layout==='script'&&s.number!==1&&s.text.includes('“');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=1080"><title>'+p.id+' slide '+s.number+' — REVIEW</title><link rel="stylesheet" href="../../../renderer/styles.css"></head><body><article class="slide '+p.layout+(dark?' dark':'')+(s.number===1?' cover':'')+(quote?' has-quote':'')+'" aria-label="'+esc(s.alt_text)+'"><p class="series">'+esc(p.series)+'</p><div class="rule" aria-hidden="true"></div><main class="content"><p class="copy">'+emphasis(p,s)+'</p></main><div class="footer-rule" aria-hidden="true"></div><p class="brand">Broken to Balanced</p><p class="handle">@brokentobalanced</p><p class="folio">'+s.number+' / 6</p></article></body></html>\n';
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
async function geometry(page,p,s){
 return page.evaluate(({text,id,number})=>{
  const slide=document.querySelector('.slide'),copy=document.querySelector('.copy'),content=document.querySelector('.content');
  const rect=e=>{let r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
  const r=rect(copy),region=rect(content),errors=[],chars=[];
  const walker=document.createTreeWalker(copy,NodeFilter.SHOW_TEXT);let n;
  while(n=walker.nextNode()){for(let i=0;i<n.length;i++){if(/\s/.test(n.textContent[i]))continue;const range=document.createRange();range.setStart(n,i);range.setEnd(n,i+1);for(const b of range.getClientRects())chars.push({x:b.x,y:b.y,right:b.right,bottom:b.bottom});}}
  const lines=[];for(const b of chars){let row=lines.find(l=>Math.abs(l.y-b.y)<2);if(!row){row={y:b.y,x:b.x,right:b.right,bottom:b.bottom};lines.push(row)}row.x=Math.min(row.x,b.x);row.right=Math.max(row.right,b.right);row.bottom=Math.max(row.bottom,b.bottom)}
  const cs=getComputedStyle(copy),bg=getComputedStyle(slide).backgroundColor;
  if(copy.textContent!==text)errors.push('text_mismatch');
  if(chars.some(b=>b.x<region.x-.5||b.right>region.right+.5||b.y<region.y-.5||b.bottom>region.bottom+.5))errors.push('copy_outside_region');
  if(chars.some(b=>b.x<88||b.right>992||b.y<240||b.bottom>1130))errors.push('copy_safe_margin');
  const min=number===1?64:48,max=number===1?104:64;if(+parseFloat(cs.fontSize)<min||+parseFloat(cs.fontSize)>max)errors.push('font_size');
  const nodes=[...slide.querySelectorAll('p')];const bounds=nodes.map(e=>({role:e.className,...rect(e),font_size:parseFloat(getComputedStyle(e).fontSize),font_family:getComputedStyle(e).fontFamily,foreground:getComputedStyle(e).color,background:bg}));
  for(let i=0;i<bounds.length;i++){const a=bounds[i];if(a.x<88||a.right>992||a.y<80||a.bottom>1270)errors.push('unsafe_'+a.role);for(let j=i+1;j<bounds.length;j++){const b=bounds[j];if(a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y)errors.push('overlap_'+a.role+'_'+b.role)}}
  const expected=['copy','series','brand','handle','folio'];if(nodes.some(n=>!expected.includes(n.className)))errors.push('unexpected_artwork_text_node');
  if(slide.innerText.includes(id)||slide.innerText.includes('2026-')||slide.innerText.includes('2027-')||slide.innerText.includes('REVIEW'))errors.push('metadata_in_artwork');
  for(const e of [slide,...slide.querySelectorAll('*')])if(['hidden','clip'].includes(getComputedStyle(e).overflow))errors.push('hidden_overflow');
  const words=text.trim().split(/\s+/);const lastWidth=lines.length?lines.at(-1).right-lines.at(-1).x:0;
  const wordRows=[],wordWalker=document.createTreeWalker(copy,NodeFilter.SHOW_TEXT);let wordNode;while(wordNode=wordWalker.nextNode()){for(const m of wordNode.textContent.matchAll(/\S+/g)){const range=document.createRange();range.setStart(wordNode,m.index);range.setEnd(wordNode,m.index+m[0].length);const box=range.getBoundingClientRect();let row=wordRows.find(l=>Math.abs(l.y-box.y)<2);if(!row){row={y:box.y,words:0};wordRows.push(row)}row.words++}}wordRows.sort((a,b)=>a.y-b.y);
  const lastLineWords=wordRows.at(-1)?.words||0;
  if(wordRows.length>1&&lastLineWords===1)errors.push('isolated_final_word');
  const decorations=[...slide.querySelectorAll('.rule,.footer-rule')].map(rect),pseudo=getComputedStyle(content,'::before');
  if(pseudo.content!=='none'){const x=region.x+parseFloat(pseudo.left),y=region.y+parseFloat(pseudo.top),width=parseFloat(pseudo.width),height=parseFloat(pseudo.height);decorations.push({x,y,width,height,right:x+width,bottom:y+height})}
  if(decorations.some(a=>chars.some(b=>a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y)))errors.push('decorative_stroke_through_copy');
  return {id,slide:number,passed:errors.length===0,exact_text:copy.textContent===text,canonical_text:text,rendered_text:copy.textContent,copy:r,region,line_count:lines.length,lines,bounds,decorations,font_size:parseFloat(cs.fontSize),font_family:cs.fontFamily,last_line_width:lastWidth,last_line_words:lastLineWords,errors};
 },{text:s.text,id:p.id,number:s.number});
}
async function render(sample=false){
 validate();for(const k of ['headings','body']){if(!fs.existsSync(fontPath(k))||hash(fs.readFileSync(fontPath(k)))!==config.fonts[k].sha256)throw Error('Exact pinned font absent/mismatched: '+k);}
 const selected=sample?data.posts.filter(p=>config.sample_ids.includes(p.id)):data.posts;
 const server=await startServer(),url='http://127.0.0.1:'+server.address().port;let browser;
 try{
  browser=await launch();const page=await browser.newPage({viewport:{width:1080,height:1350},deviceScaleFactor:1,colorScheme:'light',reducedMotion:'reduce'});
  await page.route('**/*',route=>route.request().url().startsWith(url+'/')?route.continue():route.abort());
  const cdp=await page.context().newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');
  const checkpoints=[],failures=[];
  for(const p of selected){
   try{
   const dir=path.join(ROOT,'posts',p.id);fs.mkdirSync(path.join(dir,'editable'),{recursive:true});
   write(path.join(dir,'caption.txt'),p.caption_ready_to_copy);write(path.join(dir,'alt-text.json'),p.slides.map(s=>({number:s.number,alt_text:s.alt_text})));
   const records=[];
   for(const s of p.slides){
    const nn=String(s.number).padStart(2,'0'),rel=`posts/${p.id}/editable/${nn}.html`,hp=path.join(ROOT,rel),out=path.join(dir,nn+'.png');write(hp,html(p,s));
    let result;
    for(let attempt=1;attempt<=2;attempt++){
     try{
      await page.goto(url+'/'+rel,{waitUntil:'load'});
      const fontStatus=await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([document.fonts.load('500 92px "Playfair Display"'),document.fonts.load('400 62px Inter'),document.fonts.load('600 62px Inter')]);return [...document.fonts].map(f=>({family:f.family,status:f.status,weight:f.weight}));});
      if(fontStatus.some(f=>f.status!=='loaded'))throw Error('font_not_loaded');
      // Bounded typography adjustments avoid isolated final words without changing source text.
      await page.evaluate(cover=>{const e=document.querySelector('.copy');const candidates=cover?[92,90,88,86,84,82,80,78,76]:[62,60,58,56,54];for(const size of candidates){e.style.fontSize=size+'px';const rows=[],w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let node;while(node=w.nextNode()){for(const m of node.textContent.matchAll(/\S+/g)){const r=document.createRange();r.setStart(node,m.index);r.setEnd(node,m.index+m[0].length);const b=r.getBoundingClientRect();let row=rows.find(x=>Math.abs(x.y-b.y)<2);if(!row){row={y:b.y,words:0};rows.push(row)}row.words++}}rows.sort((a,b)=>a.y-b.y);if(e.getBoundingClientRect().height<=760&&(rows.length<2||rows.at(-1).words>1))break;}},s.number===1);
      result=await geometry(page,p,s);
      const dom=await cdp.send('DOM.getDocument'),node=await cdp.send('DOM.querySelector',{nodeId:dom.root.nodeId,selector:'.copy'});
      result.platform_fonts=(await cdp.send('CSS.getPlatformFontsForNode',{nodeId:node.nodeId})).fonts;
      const expected=s.number===1?'Playfair Display':'Inter';if(!result.platform_fonts.length||result.platform_fonts.some(f=>f.familyName!==expected||!f.isCustomFont))result.errors.push('unexpected_platform_font');
      result.font_faces=fontStatus;result.passed=result.errors.length===0;if(!result.passed)throw Error(result.errors.join(','));
      const adjusted=await page.$eval('.copy',e=>e.getAttribute('style'));if(adjusted)write(hp,html(p,s).replace('class="copy"','class="copy" style="'+esc(adjusted)+'"'));
      const key=hash(fs.readFileSync(hp))+':'+config.renderer_version+':'+config.fonts.headings.sha256+':'+config.fonts.body.sha256+':'+hash(fs.readFileSync(path.join(__dirname,'styles.css')));
      const cached=fs.existsSync(path.join(dir,'post-manifest.json'))?read(path.join(dir,'post-manifest.json')).slides.find(x=>x.number===s.number):null;
      if(!fs.existsSync(out)||cached?.render_key!==key||hash(fs.readFileSync(out))!==cached.png_sha256)await page.locator('.slide').screenshot({path:out,animations:'disabled',scale:'css'});
      result.png=`posts/${p.id}/${nn}.png`;result.editable=rel;result.png_sha256=hash(fs.readFileSync(out));result.html_sha256=hash(fs.readFileSync(hp));result.render_key=key;result.attempts=attempt;
      write(path.join(QA,'slides',p.id+'-'+nn+'.json'),result);break;
     }catch(e){if(attempt===2){write(path.join(QA,'failures',p.id+'-'+nn+'.json'),{id:p.id,slide:s.number,error:e.message,geometry:result});throw e;}}
    }
    records.push({number:s.number,png:result.png,editable:rel,png_sha256:result.png_sha256,html_sha256:result.html_sha256,render_key:result.render_key,qa_status:'PASS'});
   }
   const manifest={id:p.id,day:p.day,planned_date:p.planned_date,timezone:p.timezone,date_status:p.date_status,layout:p.layout,visual_brief:p.visual_brief,primary_cta:p.primary_cta,input_copy_sha256:p.copy_sha256,renderer_version:config.renderer_version,renderer_sha256:RENDERER_HASH,config_sha256:hash(fs.readFileSync(path.join(__dirname,'runtime-config.json'))),brand_status:'provisional_wordmark',original_logo:null,font_status:'exact_runtime_fonts_loaded',approval_gates:['original_approved_logo','owner_editorial_approval',...(p.founder_attestation_required?['founder_attestation']:[])],founder_attestation_required:p.founder_attestation_required,publish_status:p.publish_status,production_status:'REVIEW_RENDERED',qa_status:'PASS',caption:`posts/${p.id}/caption.txt`,caption_sha256:hash(fs.readFileSync(path.join(dir,'caption.txt'))),alt_text:`posts/${p.id}/alt-text.json`,alt_text_sha256:hash(fs.readFileSync(path.join(dir,'alt-text.json'))),slides:records};
   write(path.join(dir,'post-manifest.json'),manifest);checkpoints.push({id:p.id,slides:6,qa:'PASS'});
   write(path.join(QA,sample?'sample-checkpoint.json':'render-checkpoint.json'),{renderer_version:config.renderer_version,completed:checkpoints,failures,post_count:checkpoints.length,png_count:checkpoints.length*6});
   if(checkpoints.length%10===0||sample)console.log('Rendered',p.id,checkpoints.length+'/'+selected.length);
   }catch(e){failures.push({id:p.id,error:e.message});write(path.join(QA,sample?'sample-checkpoint.json':'render-checkpoint.json'),{renderer_version:config.renderer_version,completed:checkpoints,failures,post_count:checkpoints.length,png_count:checkpoints.length*6});console.error('Recorded failed post',p.id,e.message);}
  }
  write(path.join(__dirname,'runtime-lock.json'),{node:process.version,playwright:require(path.join(path.dirname(require.resolve(depPath('playwright'))),'package.json')).version,sharp:dep('sharp').versions,browser:browser.version(),browser_path:config.browser_path,renderer_sha256:hash(fs.readFileSync(__filename)),styles_sha256:hash(fs.readFileSync(path.join(__dirname,'styles.css'))),fonts:config.fonts});
  if(failures.length)throw Error('Failed posts: '+failures.map(f=>f.id).join(','));
 }finally{if(browser)await browser.close();server.close();}
}
function depPath(n){for(const r of moduleRoots){if(fs.existsSync(path.join(r,n)))return path.join(r,n)}return n;}
async function qa(){
 validate();const sharp=dep('sharp'),geometryResults=[],imageResults=[],textResults=[],contrastResults=[],fontResults=[],errors=[];
 for(const p of data.posts){
  const dir=path.join(ROOT,'posts',p.id),m=read(path.join(dir,'post-manifest.json'));
  let cap=fs.readFileSync(path.join(dir,'caption.txt'),'utf8')===p.caption_ready_to_copy,alt=read(path.join(dir,'alt-text.json'));
  if(!cap||JSON.stringify(alt)!==JSON.stringify(p.slides.map(s=>({number:s.number,alt_text:s.alt_text}))))errors.push(p.id+':caption_or_alt');
  for(const s of p.slides){const n=String(s.number).padStart(2,'0'),g=read(path.join(QA,'slides',p.id+'-'+n+'.json')),image=path.join(dir,n+'.png');geometryResults.push(g);
   const img=await sharp(image).metadata();await sharp(image).raw().toBuffer();const record=m.slides[s.number-1];
   const ok=img.width===1080&&img.height===1350&&img.format==='png'&&img.space==='srgb'&&hash(fs.readFileSync(image))===record.png_sha256&&hash(fs.readFileSync(path.join(ROOT,record.editable)))===record.html_sha256;
   imageResults.push({id:p.id,slide:s.number,passed:ok,width:img.width,height:img.height,format:img.format,color_space:img.space,sha256:hash(fs.readFileSync(image)),bytes:fs.statSync(image).size});
   const textOk=g.exact_text&&g.rendered_text===s.text;const htmlSource=fs.readFileSync(path.join(ROOT,record.editable),'utf8');
   textResults.push({id:p.id,slide:s.number,passed:textOk,canonical_sha256:hash(s.text),dom_sha256:hash(g.rendered_text),caption_exact:cap,html_contains_no_remote_urls:!htmlSource.includes('https://'),primary_cta_on_slide6:p.primary_cta});
   const pairs=g.bounds.map(b=>({role:b.role,foreground:b.foreground,background:b.background,ratio:contrast(b.foreground,b.background)}));const contrastOk=pairs.every(b=>b.ratio>=4.5);contrastResults.push({id:p.id,slide:s.number,passed:contrastOk,pairs,decorative_accent_not_text:true});
   const fontsOk=g.platform_fonts.length>0&&g.platform_fonts.every(f=>f.familyName===(s.number===1?'Playfair Display':'Inter')&&f.isCustomFont);fontResults.push({id:p.id,slide:s.number,passed:fontsOk,fonts:g.platform_fonts});
   if(!ok||!g.passed||!textOk||!contrastOk||!fontsOk)errors.push(p.id+'/'+n);
  }
 }
 for(const [file,results] of [['layout-geometry',geometryResults],['image-integrity',imageResults],['text-integrity',textResults],['contrast-report',contrastResults],['font-report',fontResults]])write(path.join(QA,file+'.json'),{status:errors.length?'FAIL':'PASS',method:file==='layout-geometry'?'DOM Range character bounds; allotted region; pairwise text-node overlap; safe margins; no clipping parents':'deterministic machine checks',count:results.length,passed:results.filter(r=>r.passed).length,results});
 write(path.join(QA,'blockers.json'),{rendering_defects:errors,rendering_defect_count:errors.length,brand_status:'provisional_wordmark',approval_gates:[{gate:'original_approved_logo',applies_to:'all 180',status:'MISSING',detail:'No approved binary exists in selected project; permitted plain-text review fallback used.'},{gate:'owner_editorial_approval',applies_to:'all 180',status:'PENDING'},{gate:'founder_attestation',status:'PENDING',post_ids:data.posts.filter(p=>p.founder_attestation_required).map(p=>p.id)}],font_gate:'RESOLVED: exact OFL runtime fonts loaded; binaries excluded from deliverables'});
 if(errors.length)throw Error('QA failures: '+errors.join(','));console.log('QA PASS: 1080 images, exact text, fonts, geometry and contrast');
}
async function review(){const make=require('./review.cjs');await make({ROOT,data,write,read,hash,dep});}
async function pack(){await qa();await review();execFileSync(process.execPath,[path.join(__dirname,'verify_review.cjs')],{stdio:'inherit'});execFileSync('python3',[path.join(__dirname,'package.py'),ROOT],{stdio:'inherit'});}
(async()=>{const command=process.argv[2];if(command==='validate:content'){validate();console.log('Content PASS')}else if(command==='render:sample')await render(true);else if(command==='render:all')await render(false);else if(command==='qa:visuals')await qa();else if(command==='qa:review')execFileSync(process.execPath,[path.join(__dirname,'verify_review.cjs')],{stdio:'inherit'});else if(command==='build:review')await review();else if(command==='package:exports')await pack();else if(command==='serve'){const s=await startServer(+(process.env.BTB_PORT||8000));console.log('Local review: http://127.0.0.1:'+s.address().port+'/review/index.html');}else throw Error('Use validate:content, render:sample, render:all, qa:visuals, qa:review, build:review, package:exports, serve');})().catch(e=>{console.error(e);process.exitCode=1});
