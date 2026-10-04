/* ICU Roster Planner v10.8.2 fast constraint scheduler.
   Purpose-built for the ICU monthly roster instead of a generic MILP engine.
   It runs entirely in a Web Worker, has no CDN/runtime dependencies, and is
   intentionally bounded so Auto-Generate cannot hang the browser for minutes. */
'use strict';

function makeRng(seed){
  let x=(Number(seed)||0x9e3779b9)>>>0;
  return function(){x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};
}
function shuffled(a,rng){const x=a.slice();for(let i=x.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[x[i],x[j]]=[x[j],x[i]];}return x;}
function dateObj(d){return new Date(d+'T00:00:00Z');}
function addDays(d,n){const x=dateObj(d);x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10);}
function isoDates(month){
  if(!/^\d{4}-\d{2}$/.test(month))throw new Error('Invalid month');
  const [y,m]=month.split('-').map(Number),out=[];for(let d=1;d<=31;d++){const x=new Date(Date.UTC(y,m-1,d));if(x.getUTCMonth()!==m-1)break;out.push(x.toISOString().slice(0,10));}return out;
}
function maxRun(indices){if(!indices.length)return 0;const a=[...indices].sort((x,y)=>x-y);let best=1,cur=1;for(let i=1;i<a.length;i++){if(a[i]===a[i-1]+1){cur++;if(cur>best)best=cur;}else cur=1;}return best;}
function popcount(n){let c=0;while(n){n&=n-1;c++;}return c;}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

function solveRosterFast(body){
  const started=Date.now(),DEADLINE=started+8500;
  const timedOut=()=>Date.now()>DEADLINE;
  con¶»§q«^