const sharp=require('sharp'),fs=require('node:fs/promises'),{inspect}=require('../lib/engine.cjs'),{assess}=require('../lib/review.cjs');
(async()=>{
 await require('./fixtures.cjs')();
 await sharp('test-output/demo.jpg').linear(3,100).jpeg({quality:100}).toFile('test-output/overexposed.jpg');
 await sharp('test-output/demo.jpg').blur(24).jpeg({quality:100}).toFile('test-output/blurred.jpg');
 const results={};for(const name of ['demo','overexposed','blurred']){console.log('Evaluating '+name);const photo=await inspect('test-output/'+name+'.jpg','photo');results[name]=await assess({photo,base:'http://localhost:11434',model:'qwen3-vl:30b-a3b-instruct'});await fs.writeFile('test-output/critical-regression.json',JSON.stringify(results,null,2));console.log(JSON.stringify({name,exposure:results[name].exposure.score,focus:results[name].focus.score,white:results[name].measurements.whitePercent}));}
 if(results.overexposed.exposure.score>=results.demo.exposure.score)throw new Error('La surexposition délibérée n’est pas pénalisée.');
 if(results.blurred.focus.score>=results.demo.focus.score)throw new Error('Le flou délibéré n’est pas pénalisé.');
 console.log('Regression visuelle validée.');
})().catch(e=>{console.error(e);process.exitCode=1;});
