'use strict';
const path=require('node:path');
module.exports=async function(ROOT,sharp){
 const ids=['BTB-001','BTB-002','BTB-003','BTB-005','BTB-014','BTB-142','BTB-147'],composite=[];
 for(let r=0;r<ids.length;r++)for(let c=0;c<6;c++)composite.push({input:await sharp(path.join(ROOT,'posts',ids[r],String(c+1).padStart(2,'0')+'.png')).resize(270,338).toBuffer(),left:c*270,top:r*338});
 await sharp({create:{width:1620,height:2366,channels:3,background:'#fff'}}).composite(composite).png().toFile(path.join(ROOT,'review','sample-all-slides.png'));
 const previews=[],chosen=[['BTB-001',1],['BTB-002',3],['BTB-003',5],['BTB-005',3],['BTB-014',5],['BTB-142',4]];
 for(let i=0;i<chosen.length;i++)previews.push({input:await sharp(path.join(ROOT,'posts',chosen[i][0],String(chosen[i][1]).padStart(2,'0')+'.png')).resize(390,488).toBuffer(),left:i%3*390,top:Math.floor(i/3)*488});
 await sharp({create:{width:1170,height:976,channels:3,background:'#fff'}}).composite(previews).png().toFile(path.join(ROOT,'review','sample-phone-previews.png'));
};
