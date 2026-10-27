'use strict';
// Independent local-only review/output checks. Run: node verify_review.cjs
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),http=require('node:http');
const {pathToFileURL,fileURLToPath}=require('node:url');
const ROOT=path.resolve(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'input','BTB_180_Day_Content.json'),'utf8'));
const config=JSON.parse(fs.readFileSync(path.join(__dirname,'runtime-config.json'),'utf8'));
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const dep=name=>{try{return require(name)}catch{}for(const root of [process.env.BTB_NODE_MODULES,'/Users/vikasshdalal/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'].filter(Boolean)){try{return require(path.join(root,name))}catch{}}throw new Error('Dependency unavailable: '+name);};
const errors=[],checks=[],pageErrors=[],blockedExternalRequests=[],responses=[],consoleErrors=[];
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
   const url=new URL(req.url,'http://127.0.0.1'),decoded=decodeURIComponent(url.pathname),target=path.resolve(ROOT,'.'+decoded);
   if(!target.startsWith(ROOT+path.sep)||!fs.statSync(target).isFile())throw Error('Not a local file');
   const type={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8'}[path.extname(target)]||'application/octet-stream';
   res.setHeader('Content-Type',type);res.setHeader('Cache-Control','no-store');res.end(fs.readFileSync(target));
  }catch{res.statusCode=404;res.end('Not found');}
 });
 return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>resolve(server));});
}
async function main(){
 const review=path.join(ROOT,'review','index.html');
 if(!fs.existsSync(review))throw new Error('Review is not built yet; run build:review first.');
 const htmlFiles=[review,...data.posts.map(p=>path.join(ROOT,'review','posts',p.id+'.html'))];
 const references=htmlFiles.map(file=>({page:path.relative(ROOT,file),references:fs.existsSync(file)?localRefs(file):[],exists:fs.existsSync(file)}));
 check('review_html_pages',references.length===181&&references.every(p=>p.exists));
 const badLinks=references.flatMap(p=>p.references.filter(r=>!r.local||!r.exists).map(r=>({page:p.page,...r})));
 check('all_review_href_src_are_existing_local_files',badLinks.length===0,badLinks);
 const outputs=[];
 let pngCount=0,editableCount=0,hashCount=0;
 for(const p of data.posts){
  const manifestPath=path.join(ROOT,'posts',p.id,'post-manifest.json'),m=read(manifestPath),postErrors=[];
  const pcheck=(ok,msg)=>{if(!ok)postErrors.push(msg);};
  pcheck(m.id===p.id&&m.day===p.day&&m.planned_date===p.planned_date,'input_identity');
  pcheck(m.input_copy_sha256===p.copy_sha256,'input_hash');
  pcheck(m.founder_attestation_required===p.founder_attestation_required,'founder_flag');
  pcheck(m.publish_status===p.publish_status,'unpublished_status');
  pcheck(m.approval_gates.includes('owner_editorial_approval')&&m.approval_gates.includes('original_approved_logo'),'approval_gates');
  if(p.founder_attestation_required)pcheck(m.approval_gates.includes('founder_attestation'),'founder_attestation_gate');
  const captionPath=path.join(ROOT,m.caption),altPath=path.join(ROOT,m.alt_text),caption=fs.readFileSync(captionPath,'utf8'),alts=read(altPath);
  pcheck(caption===p.caption_ready_to_copy,'caption_exact');
  pcheck(digest(fs.readFileSync(captionPath))===m.caption_sha256,'caption_hash');
  pcheck(digest(fs.readFileSync(altPath))===m.alt_text_sha256,'alt_hash');hashCount+=2;
  pcheck(JSON.stringify(alts)===JSON.stringify(p.slides.map(s=>({number:s.number,alt_text:s.alt_text}))),'alt_text_exact');
  pcheck(m.slides.length===6,'six_manifest_slides');
  for(let n=0;n<m.slides.length;n++){
   const s=m.slides[n],pngPath=path.join(ROOT,s.png),editablePath=path.join(ROOT,s.editable),png=fs.readFileSync(pngPath),editable=fs.readFileSync(editablePath);
   pcheck(s.number===n+1,'slide_sequence_'+(n+1));
   pcheck(digest(png)===s.png_sha256,'png_hash_'+s.number);pcheck(digest(editable)===s.html_sha256,'html_hash_'+s.number);hashCount+=2;
   pcheck(png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&png.readUInt32BE(16)===1080&&png.readUInt32BE(20)===1350,'png_header_dimensions_'+s.number);
   pcheck(s.png===`posts/${p.id}/${String(s.number).padStart(2,'0')}.png`&&s.editable===`posts/${p.id}/editable/${String(s.number).padStart(2,'0')}.html`,'stable_paths_'+s.number);
   pngCount++;editableCount++;
  }
  outputs.push({id:p.id,passed:postErrors.length===0,errors:postErrors});
 }
 check('all_post_manifest_files_hashes_caption_alt_values',outputs.every(p=>p.passed),outputs.filter(p=>!p.passed));
 check('output_counts',pngCount===1080&&editableCount===1080,{pngs:pngCount,editable:editableCount,hashed_files:hashCount});
 const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{const target=path.join(dir,e.name);return e.isDirectory()?walk(target):[target];});
 const forbidden=walk(ROOT).filter(f=>/\.(ttf|otf|woff2?|ttc)$/i.test(f)||/(?:^|\/)(?:node_modules|\.git|\.env|\.DS_Store|__pycache__|browser-profile|cache)(?:\/|$)/i.test(f)).map(f=>path.relative(ROOT,f));
 check('no_font_binaries_dependency_directories_or_secret_files',forbidden.length===0,forbidden);
 const server=await startServer(),origin='http://127.0.0.1:'+server.address().port;
 let browser,context;
 const postPages=[],filterTests=[];
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
  const visibleIds=()=>page.locator('.card:not([hidden]) h2').allTextContents();
  async function testFilter(name,setup,expected){
   await page.locator('#query').fill('');await page.locator('#pillar').selectOption('');await page.locator('#layout').selectOption('');await page.locator('#founder').uncheck();
   await setup();const actual=await visibleIds(),passed=JSON.stringify(actual)===JSON.stringify(expected);
   filterTests.push({name,passed,expected_count:expected.length,actual_count:actual.length});check(name,passed,passed?actual.length:{expected,actual});
  }
  await testFilter('search_by_id',()=>page.locator('#query').fill('BTB-142'),['BTB-142']);
  const series=data.posts.find(p=>p.pillar_id==='P3').series;
  await testFilter('search_by_series',()=>page.locator('#query').fill(series),data.posts.filter(p=>p.series===series).map(p=>p.id));
  await testFilter('search_by_date',()=>page.locator('#query').fill('2027-04-25'),['BTB-180']);
  for(const pillar of Object.keys(data.pillars))await testFilter('pillar_'+pillar,()=>page.locator('#pillar').selectOption(pillar),data.posts.filter(p=>p.pillar_id===pillar).map(p=>p.id));
  for(const layout of ['editorial','contrast','script','checklist','letter'])await testFilter('layout_'+layout,()=>page.locator('#layout').selectOption(layout),data.posts.filter(p=>p.layout===layout).map(p=>p.id));
  await testFilter('founder_12',()=>page.locator('#founder').check(),data.posts.filter(p=>p.founder_attestation_required).map(p=>p.id));
  await testFilter('combined_filters',async()=>{await page.locator('#pillar').selectOption('P3');await page.locator('#layout').selectOption('script');},data.posts.filter(p=>p.pillar_id==='P3'&&p.layout==='script').map(p=>p.id));
  await testFilter('empty_search_result',()=>page.locator('#query').fill('no-matching-post-123456'),[]);
  await testFilter('reset_all',async()=>{},data.posts.map(p=>p.id));
  await page.setViewportSize({width:390,height:844});
  const indexMobile=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));
  check('mobile_index_no_horizontal_overflow',indexMobile.scroll<=indexMobile.viewport,indexMobile);
  // Every post view is inspected in the actual browser, including exact textarea and six alt/src values.
  for(const p of data.posts){
   await page.goto(origin+'/review/posts/'+p.id+'.html',{waitUntil:'domcontentloaded'});
   const state=await page.evaluate(()=>({caption:document.querySelector('#caption').value,images:[...document.querySelectorAll('.slides img')].map(img=>({src:img.getAttribute('src'),alt:img.alt,width:img.width,height:img.height})),body:document.body.innerText,viewport:innerWidth,scroll:document.documentElement.scrollWidth}));
   const pErrors=[];
   if(state.caption!==p.caption_ready_to_copy)pErrors.push('caption_dom_exact');
   if(state.images.length!==6)pErrors.push('six_images');
   for(let n=0;n<state.images.length;n++)if(state.images[n].src!==`../../posts/${p.id}/${String(n+1).padStart(2,'0')}.png`||state.images[n].alt!==p.slides[n].alt_text)pErrors.push('ordered_src_alt_'+(n+1));
   if(state.scroll>state.viewport)pErrors.push('mobile_horizontal_overflow');
   if(!state.body.includes('REVIEW — unpublished / owner approval required.'))pErrors.push('owner_status');
   if(!state.body.includes(p.copy_sha256))pErrors.push('copy_hash_visible');
   if(p.founder_attestation_required&&!state.body.includes('REQUIRED / PENDING'))pErrors.push('founder_pending');
   postPages.push({id:p.id,passed:pErrors.length===0,mobile_viewport:state.viewport,mobile_document_width:state.scroll,images:state.images.length,errors:pErrors});
   if(postPages.length%30===0)console.log('Review browser checked '+postPages.length+'/180 post pages');
  }
  check('all180_browser_post_views',postPages.every(p=>p.passed),postPages.filter(p=>!p.passed));
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
 const report={audit_version:'1.0',status:errors.length?'FAIL':'PASS',method:'Independent static reference and SHA-256/header checks plus local-only Chromium browser review-interface tests. No owner approval inferred.',runtime:{node:process.version,playwright:dep('playwright/package.json').version,browser:config.browser_path},source_sha256:digest(fs.readFileSync(path.join(__dirname,'input','BTB_180_Day_Content.json'))),counts:{review_pages:htmlFiles.length,carousel_pngs:pngCount,editable_slides:editableCount,hashed_output_files:hashCount,post_pages_browser_checked:postPages.length},checks,errors,filter_tests:filterTests,clipboard,offline_file:fileOffline,post_output_checks:outputs,browser_post_checks:postPages,link_checks:{pages:references.length,total_references:references.reduce((n,p)=>n+p.references.length,0),broken_or_external:badLinks},javascript_errors:pageErrors,console_errors:consoleErrors,failed_http_responses:responses,blocked_external_requests:blockedExternalRequests,limits:['Checks cover review UI and local output manifests, not personal attestation, clinical/legal sufficiency or audience results.','PNG headers and SHA-256 verified independently; full pixel decoding, color profile and detailed geometry checks are separate image/layout QA.','No font binaries, dependencies, browser profiles or private documents are included in this audit. Archive byte integrity is checked by package.py after this report exists.']};
 fs.writeFileSync(path.join(ROOT,'qa','review-interface.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:report.status,counts:report.counts,errors:report.errors}));
 if(errors.length)process.exitCode=1;
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
