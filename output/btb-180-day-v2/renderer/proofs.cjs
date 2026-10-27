'use strict';
const path=require('node:path'),fs=require('node:fs');
module.exports=async function({ROOT,data,write,read,hash,dep}){
 const sharp=dep('sharp'),root=path.join(ROOT,'proofs'),labels=(text,w,h)=>Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'"><rect width="100%" height="100%" fill="white"/><text x="12" y="25" font-family="Arial" font-size="20" fill="#1A1A1A">'+text+'</text></svg>');
 const old=path.resolve(ROOT,'../btb-180-day-v1/posts/BTB-001'),compare=[],comparisonFile=path.join(root,'BTB-001-comparison.png'),canCompare=fs.existsSync(path.join(old,'01.png'));
 if(canCompare){
 for(const [row,dir,title]of [[0,old,'v1 — prior presentation'],[1,path.join(root,'BTB-001/A'),'v2 A — dark editorial'],[2,path.join(root,'BTB-001/B'),'v2 B — warm editorial reference']]){
  compare.push({input:labels(title,1620,38),left:0,top:row*376});for(let i=0;i<6;i++)compare.push({input:await sharp(path.join(dir,String(i+1).padStart(2,'0')+'.png')).resize(270,338).toBuffer(),left:i*270,top:row*376+38});
 }
 await sharp({create:{width:1620,height:1128,channels:3,background:'#fff'}}).composite(compare).png().toFile(comparisonFile);
 }else if(!fs.existsSync(comparisonFile))throw Error('Original v1 files and cached actual comparison are both absent; no comparison placeholder created.');
 for(const width of [360,390]){
  const h=Math.round(width*1.25),layers=[];
  for(let i=0;i<6;i++)layers.push({input:await sharp(path.join(root,'BTB-001/B',String(i+1).padStart(2,'0')+'.png')).resize(width,h).toBuffer(),left:i%3*width,top:Math.floor(i/3)*h});
  await sharp({create:{width:width*3,height:h*2,channels:3,background:'#fff'}}).composite(layers).png().toFile(path.join(root,'BTB-001-phone-'+width+'.png'));
 }
 const crops=[];for(const [name,left,top,width,height]of [['square',0,135,1080,1080],['3x4',34,0,1012,1350]]){
  const output=path.join(root,'BTB-001-cover-crop-'+name+'.png');await sharp(path.join(root,'BTB-001/B/01.png')).extract({left,top,width,height}).png().toFile(output);
  const g=read(path.join(ROOT,'qa/slides/BTB-001-01.json'));const hook=g.blocks.every(b=>b.x>=left&&b.right<=left+width&&b.y>=top&&b.bottom<=top+height);crops.push({name,path:path.relative(ROOT,output),crop:{left,top,width,height},hook_text_bounds_preserved:hook,scope:'Stress test only; footer/header may be excluded by a crop.'});
 }
 const representative=data.posts.filter(p=>['BTB-002','BTB-003','BTB-005','BTB-014','BTB-142','BTB-175'].includes(p.id)),layers=[];
 for(let row=0;row<representative.length;row++){
  const p=representative[row];layers.push({input:labels(p.id+' · '+p.layout,1620,38),left:0,top:row*376});for(let i=0;i<6;i++)layers.push({input:await sharp(path.join(root,'representative',p.id,String(i+1).padStart(2,'0')+'.png')).resize(270,338).toBuffer(),left:i*270,top:row*376+38});
 }
 await sharp({create:{width:1620,height:representative.length*376,channels:3,background:'#fff'}}).composite(layers).png().toFile(path.join(root,'representative-sequences.png'));
 const manifests=[...['A','B'].map(t=>read(path.join(root,'BTB-001',t,'post-manifest.json'))),...representative.map(p=>read(path.join(root,'representative',p.id,'post-manifest.json')))];
 const files=manifests.flatMap(m=>m.slides.map(s=>({id:m.id,treatment:m.effective_treatment,path:s.png,sha256:s.png_sha256})));
 write(path.join(root,'proof-manifest.json'),{proof_primary_size_pngs:files.length,reference_A_pngs:6,reference_B_pngs:6,representative_pngs:representative.length*6,completed_C_scene_pngs:0,C_fallback_reference:'proofs/BTB-001/B/01.png',C_gate:'No approved local scene or verified no-additional-spend native generation entitlement.',v1_comparison:{path:'proofs/BTB-001-comparison.png',sha256:hash(fs.readFileSync(comparisonFile)),reused_actual_cached_comparison:!canCompare},comparison_derivatives:['proofs/BTB-001-comparison.png','proofs/BTB-001-phone-360.png','proofs/BTB-001-phone-390.png','proofs/representative-sequences.png'],crop_stress_tests:crops,files});
 console.log('Proofs built: 48 full-size PNGs; 0 scene proofs; comparison, phone and crop derivatives separate.');
};
