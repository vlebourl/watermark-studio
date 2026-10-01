const fs=require('node:fs/promises');
const {inspect,render}=require('../lib/engine.cjs');
const {suggest}=require('../lib/ollama.cjs');
(async()=>{await require('./fixtures.cjs')();const photo=await inspect('test-output/demo.jpg','photo'),mark=await inspect('test-output/signature.png','mark');let current=null;
 for(const comment of ['', 'Place la signature en bas à gauche, plus petite.']){
 const start=Date.now();current=await suggest({base:'http://localhost:11434',model:'qwen3-vl:8b-instruct',photo,mark,mode:'discret',comment,current});console.log(JSON.stringify({seconds:(Date.now()-start)/1000,comment,...current}));}
 await fs.writeFile('test-output/ollama-result.json',JSON.stringify(current,null,2));await fs.writeFile('test-output/ollama-export.jpg',await render(photo,mark,current));
})().catch(e=>{console.error(e);process.exitCode=1;});
