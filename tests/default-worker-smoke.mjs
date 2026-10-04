// Smoke test for the browser fallback solver using tests/default-payload.json.
// The default data is deliberately tight (weekend caps fully used, credit capacity == demand,
// only some staff on-call capable), so it is a worst case for the fallback. We therefore check:
//  1. a slightly less constrained roster (+6 on-call-capable staff) solves quickly, and
//  2. the tight default either solves or fails with the explanatory "very tightly constrained" message.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {solveRosterFast}=require('../roster-solver-worker.js');
const base=JSON.parse(fs.readFileSync(new URL('./default-payload.json',import.meta.url),'utf8'));
let failed=0;
const check=(name,ok,detail='')=>{console.log((ok?'PASS ':'FAIL ')+name+(detail?' - '+detail:''));if(!ok)failed++;};

const relaxed=JSON.parse(JSON.stringify(base));
const template=relaxed.staff.filter(s=>s.level==='R2');
for(let i=0;i<6;i++)relaxed.staff.push({...template[i%template.length],id:'extra'+i,name:'Extra Resident '+(i+1),eligible:[...template[i%template.length].eligible]});
let t=Date.now();
try{
  const r=solveRosterFast(relaxed);
  check('relaxed roster solves',r.ok&&Object.keys(r.assignments).length>0,`${Date.now()-t} ms, ${Object.keys(r.assignments).length} assignments`);
}catch(e){check('relaxed roster solves',false,e.message);}

t=Date.now();
try{
  const r=solveRosterFast(base);
  check('tight default solves',r.ok,`${Date.now()-t} ms`);
}catch(e){
  check('tight default fails with explanatory message',/very tightly constrained/.test(e.message),e.message.slice(0,90));
}
if(failed){console.error(failed+' smoke check(s) failed');process.exit(1);}
console.log('fallback solver smoke checks passed');
