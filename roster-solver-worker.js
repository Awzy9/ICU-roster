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
  const month=String(body.month||''),dates=isoDates(month),nD=dates.length;
  const staff=Array.isArray(body.staff)?body.staff:[],shifts=Array.isArray(body.shifts)?body.shifts:[];
  const leaves=Array.isArray(body.leaves)?body.leaves:[],requests=Array.isArray(body.requests)?body.requests:[],freeRequests=Array.isArray(body.freeRequests)?body.freeRequests:[];
  const rules=body.rules||{},locked=body.lockedAssignments||{},baseline=body.baselineAssignments||null,preserve=!!body.preserve;
  if(!staff.length)throw new Error('Add active staff before generating the roster.');
  const minBlock=Math.max(1,Number(rules.minUnitBlock)||3),maxConsecutive=Math.max(1,Number(rules.maxConsecutive)||6),maxNight=Math.max(1,Number(rules.maxNightCalls)||31),globalMax=Math.max(1,Number(rules.maxAssignments)||31),minNightGap=Math.max(3,Number(rules.minNightGapDays)||3),nightRest=rules.nightRest!==false,saudi=rules.saudiWeekend!==false;
  if(minBlock>maxConsecutive)throw new Error(`Minimum daytime continuity (${minBlock} days) cannot exceed maximum consecutive work (${maxConsecutive} days).`);
  const dIndex=new Map(dates.map((d,i)=>[d,i])),pIndex=new Map(staff.map((p,i)=>[p.id,i])),sMap=new Map(shifts.map(s=>[s.id,s]));
  const mandatory=shifts.filter(s=>!Number(s.overflowPriority||0)),dayShifts=mandatory.filter(s=>s.type==='day'),nightShifts=mandatory.filter(s=>s.type==='night');
  if(!dayShifts.length||!nightShifts.length)throw new Error('Fast scheduler requires both mandatory daytime and on-call coverage rules.');
  const isWeekendIdx=i=>{const d=dateObj(dates[i]).getUTCDay();return saudi?(d===5||d===6):(d===6||d===0);};
  const weekendStartIdx=i=>{const d=dateObj(dates[i]).getUTCDay();if(saudi){if(d===5)return i;if(d===6)return i-1;}else{if(d===6)return i;if(d===0)return i-1;}return -999;};
  const weekendKeys=[...new Set(dates.map((_,i)=>isWeekendIdx(i)?weekendStartIdx(i):null).filter(x=>x!==null))].sort((a,b)=>a-b);
  const weekendCap=Math.ceil(weekendKeys.length/2);
  const isResident=p=>p.level==='R1'||p.level==='R2'||p.level==='R3';
  const isRotator=p=>p.level==='Rotator';
  const isFellow=p=>p.level==='Fellow';
  const cap=p=>Math.min(globalMax,Math.max(1,Number(p.max)||31));
  const req=(s,i)=>Math.max(0,Number(isWeekendIdx(i)?s.weekend:s.weekday)||0);

  const daySlotsByDate=dates.map((_,i)=>dayShifts.reduce((n,s)=>n+req(s,i),0));
  const originalNightSlotIdsByDate=dates.map((_,i)=>{const out=[];for(const s of nightShifts)for(let k=0;k<req(s,i);k++)out.push(s.id);return out;});
  const daySlots=daySlotsByDate[0];
  if(!daySlotsByDate.every(x=>x===daySlots))throw new Error('This roster has daytime mandatory coverage counts that vary by date. Use manual blocks/Fix This Day for this custom pattern; the fast monthly generator currently requires constant daytime counts.');
  // Each mandatory daytime unit must have a constant requirement across the month so
  // one unit block can cover the whole interval without breaking continuity.
  for(const s of dayShifts){const a=dates.map((_,i)=>req(s,i));if(!a.every(x=>x===a[0]))throw new Error(`Fast monthly generation requires ${s.id} to have the same weekday/weekend requirement.`);}
  const daySlotIds=[];for(const s of dayShifts)for(let k=0;k<req(s,0);k++)daySlotIds.push(s.id);

  // Weekend capacity can be lower than mandatory demand when every staff member is
  // strictly capped at 2 weekends in a 4-weekend month (or 3 in a 5-weekend month).
  // In that situation we still generate the safest possible roster: all weekday
  // coverage and all weekend daytime packages remain mandatory, while the minimum
  // number of weekend ON-CALL slots are intentionally left OPEN for the coordinator
  // to assign manually. The generator itself never gives anyone an automatic extra
  // weekend beyond the hard cap.
  let requiredWeekendPackages=0;
  for(const wk of weekendKeys){
    const inds=[];for(let i=0;i<nD;i++)if(isWeekendIdx(i)&&weekendStartIdx(i)===wk)inds.push(i);
    if(!inds.length)continue;
    const maxDay=Math.max(...inds.map(i=>daySlotsByDate[i]));
    const nightPackages=inds.reduce((n,i)=>n+originalNightSlotIdsByDate[i].length,0);
    requiredWeekendPackages+=maxDay+nightPackages;
  }
  const weekendCapacity=staff.length*weekendCap;
  const weekendDeficit=Math.max(0,requiredWeekendPackages-weekendCapacity);
  const plannedOpen=[];
  if(weekendDeficit){
    const lockedNightCounts=new Map();
    for(const [k,sid] of Object.entries(locked)){
      if(!sid||sMap.get(sid)?.type!=='night')continue;
      const sep=k.indexOf('|');if(sep<0)continue;const d=k.slice(sep+1),di=dIndex.get(d);if(di==null)continue;
      const lk=di+'|'+sid;lockedNightCounts.set(lk,(lockedNightCounts.get(lk)||0)+1);
    }
    const candidates=[];
    // Prefer concentrating manual gaps into the latest weekend(s), but spread them
    // across the two weekend dates before leaving multiple gaps on the same date.
    for(const wk of [...weekendKeys].sort((a,b)=>b-a)){
      const inds=[];for(let i=0;i<nD;i++)if(isWeekendIdx(i)&&weekendStartIdx(i)===wk)inds.push(i);
      const perDate=inds.map(i=>{
        const occurrence=new Map(),arr=[];
        const sorted=originalNightSlotIdsByDate[i].slice().sort((a,b)=>{
          const ea=staff.filter(p=>p.eligible?.includes(a)).length,eb=staff.filter(p=>p.eligible?.includes(b)).length;
          return eb-ea||String(a).localeCompare(String(b));
        });
        for(const sid of sorted){const n=(occurrence.get(sid)||0)+1;occurrence.set(sid,n);const lockedN=lockedNightCounts.get(i+'|'+sid)||0;if(n>lockedN)arr.push({di:i,sid,date:dates[i],wk});}
        return arr;
      });
      const rounds=Math.max(0,...perDate.map(a=>a.length));
      for(let r=0;r<rounds;r++)for(const arr of perDate)if(arr[r])candidates.push(arr[r]);
    }
    if(candidates.length<weekendDeficit)throw new Error(`Weekend capacity is short by ${weekendDeficit} package${weekendDeficit===1?'':'s'}, but only ${candidates.length} unlocked weekend on-call slot${candidates.length===1?' is':'s are'} available to leave open. Unlock weekend on-call cells or add staff.`);
    plannedOpen.push(...candidates.slice(0,weekendDeficit).map(x=>({date:x.date,shift:x.sid}))); 
  }
  const nightSlotIdsByDate=originalNightSlotIdsByDate.map(a=>a.slice());
  for(const x of plannedOpen){const di=dIndex.get(x.date),arr=nightSlotIdsByDate[di],j=arr.indexOf(x.shift);if(j>=0)arr.splice(j,1);}
  const nightSlotsByDate=nightSlotIdsByDate.map(a=>a.length);
  const totalDay=daySlots*nD,totalCalls=nightSlotsByDate.reduce((n,x)=>n+x,0),totalCredits=totalDay+2*totalCalls;
  const totalCapacity=staff.reduce((n,p)=>n+cap(p),0),tightCapacity=totalCapacity===totalCredits;if(totalCapacity<totalCredits)throw new Error(`Roster is mathematically understaffed even after reserving ${plannedOpen.length} weekend on-call slot${plannedOpen.length===1?'':'s'} for manual assignment: ${totalCredits} scheduled shift credits are required but staff caps provide only ${totalCapacity}.`);

  // Approved leave matrix.
  const leave=staff.map(()=>new Uint8Array(nD));
  for(const l of leaves){if(l.status!=='approved')continue;const pi=pIndex.get(l.person);if(pi==null)continue;for(let i=0;i<nD;i++)if(dates[i]>=l.from&&dates[i]<=l.to)leave[pi][i]=1;}

  // Locked assignments split into day/night requirements.
  const lockedDay=staff.map(()=>new Map()),lockedNight=staff.map(()=>new Map());
  for(const [k,sid] of Object.entries(locked)){if(!sid)continue;const sep=k.indexOf('|');if(sep<0)continue;const pid=k.slice(0,sep),d=k.slice(sep+1),pi=pIndex.get(pid),di=dIndex.get(d),sh=sMap.get(sid);if(pi==null||di==null||!sh)continue;if(sh.type==='night')lockedNight[pi].set(di,sid);else lockedDay[pi].set(di,sid);}
  const nightGapOk=set=>{const a=[...set].sort((x,y)=>x-y);for(let i=1;i<a.length;i++)if(a[i]-a[i-1]<minNightGap)return false;return true;};
  for(let pi=0;pi<staff.length;pi++){const lockedN=[...lockedNight[pi].keys()].sort((a,b)=>a-b);if(!nightGapOk(new Set(lockedN)))throw new Error(`${staff[pi].id} has locked on-call duties less than ${minNightGap} calendar days apart. Unlock one of the conflicting calls or change the roster.`);}

  const callCapable=staff.map((p,pi)=>({p,pi})).filter(x=>nightShifts.some(s=>x.p.eligible?.includes(s.id)));
  if(callCapable.length*maxNight<totalCalls)throw new Error(`Not enough on-call capacity: ${totalCalls} calls are required, but eligible staff can cover at most ${callCapable.length*maxNight}.`);

  // Fair target credits are only an optimization score; coverage/rules remain hard.
  function fairTargets(){
    const targets=new Array(staff.length).fill(0),open=new Set(staff.map((_,i)=>i));let remaining=totalCredits;
    while(open.size){const share=remaining/open.size;let fixed=false;for(const i of [...open]){const c=cap(staff[i]);if(c<=share+1e-9){targets[i]=c;remaining-=c;open.delete(i);fixed=true;}}if(!fixed){for(const i of open)targets[i]=share;break;}}
    return targets;
  }
  const targetCredit=fairTargets(),avgCalls=totalCalls/Math.max(1,callCapable.length);

  // Generate weekend-safe block partitions. We never cut between the two days of a
  // complete weekend, which means a resident daytime block cannot create a half-weekend.
  const prohibitedCuts=new Set();
  for(let i=0;i<nD-1;i++)if(isWeekendIdx(i)&&isWeekendIdx(i+1)&&weekendStartIdx(i)===weekendStartIdx(i+1))prohibitedCuts.add(i+1); // cut position after i
  const preferredCuts=new Set();
  for(let pi=0;pi<staff.length;pi++){
    const ds=[...lockedDay[pi].keys()].sort((a,b)=>a-b);if(!ds.length)continue;let st=ds[0],pr=ds[0];
    for(let j=1;j<=ds.length;j++){const cur=ds[j];if(cur===pr+1){pr=cur;continue;}if(st>0)preferredCuts.add(st);if(pr+1<nD)preferredCuts.add(pr+1);st=cur;pr=cur;}
  }
  const partitions=[];
  function partRec(pos,lens){if(partitions.length>3000)return;if(pos===nD){if(lens.length>=Math.max(5,Math.floor(nD/maxConsecutive))&&lens.length<=Math.ceil(nD/minBlock))partitions.push(lens.slice());return;}for(let L=minBlock;L<=maxConsecutive;L++){const next=pos+L;if(next>nD)continue;if(next<nD&&prohibitedCuts.has(next))continue;lens.push(L);partRec(next,lens);lens.pop();}}
  partRec(0,[]);
  if(!partitions.length)throw new Error('Could not build valid daytime continuity blocks for this month.');
  partitions.sort((a,b)=>{
    const cuts=x=>{let p=0,n=0;for(const L of x){p+=L;if(preferredCuts.has(p))n++;}return n;};
    const ideal=Math.round(nD/4),sa=Math.abs(a.length-ideal)*10-cuts(a)*3+Math.abs(Math.max(...a)-4),sb=Math.abs(b.length-ideal)*10-cuts(b)*3+Math.abs(Math.max(...b)-4);return sa-sb;
  });
  // Put a flexible 3/4/6-day template first. These templates give residents and
  // rotators several ways to reach 6/8/10/16 daytime credits without creating long
  // work streaks. Different permutations are kept so Friday/Saturday is never split.
  const templates={28:[3,3,4,4,4,4,6],29:[3,3,3,4,4,6,6],30:[3,3,3,3,4,4,4,6],31:[3,3,3,4,4,4,4,6]};
  const tpl=templates[nD];if(tpl){const sig=tpl.slice().sort((a,b)=>a-b).join(',');const promoted=partitions.filter(x=>x.slice().sort((a,b)=>a-b).join(',')===sig),rest=partitions.filter(x=>x.slice().sort((a,b)=>a-b).join(',')!==sig);partitions.splice(0,partitions.length,...promoted,...rest);}

  function intervalsFrom(lens){const out=[];let p=0;for(const L of lens){out.push(Array.from({length:L},(_,j)=>p+j));p+=L;}return out;}
  function personWeekendCountFromDays(pi,daySet){const set=new Set();for(const i of daySet)if(isWeekendIdx(i))set.add(weekendStartIdx(i));return set.size;}
  function daysFromMask(mask,intervals){const arr=[];for(let b=0;b<intervals.length;b++)if(mask&(1<<b))arr.push(...intervals[b]);return arr;}
  function hasHardFlexPotential(pi,daySet){
    for(const fr of freeRequests.filter(x=>x.hard&&x.person===staff[pi].id)){
      const from=dIndex.get(fr.from),to=dIndex.get(fr.to),need=Math.max(1,Math.min(10,Number(fr.days)||1));if(from==null||to==null||to<from)return false;
      const free=[];for(let i=from;i<=to;i++)if(!daySet.has(i)&&!leave[pi][i])free.push(i);
      if(fr.consecutive){let best=0,cur=0,prev=-9;for(const i of free){cur=i===prev+1?cur+1:1;best=Math.max(best,cur);prev=i;}if(best<need)return false;}else if(free.length<need)return false;
    }
    return true;
  }
  function optionCost(pi,calls,daySet){let c=Math.abs((daySet.size+2*calls)-targetCredit[pi])*6+Math.abs(calls-avgCalls)*2;const pid=staff[pi].id,p=staff[pi],wk=personWeekendCountFromDays(pi,daySet);
    c+=wk*10;
    if(preserve&&baseline){for(let i=0;i<nD;i++){const old=baseline[pid+'|'+dates[i]]||'';if(!old)continue;const oldSh=sMap.get(old);if(oldSh?.type==='day'&&!daySet.has(i))c+=2;if(oldSh?.type==='night')c+=0.2;}}
    for(const r of requests.filter(r=>r.person===pid)){const di=dIndex.get(r.date);if(di==null)continue;if(r.type==='off'&&daySet.has(di))c+=15;}
    return c;
  }
  function generateOptions(lens,intervals,pi){
    const p=staff[pi],B=intervals.length,opts=[],canCall=nightShifts.some(s=>p.eligible?.includes(s.id)),lockedN=[...lockedNight[pi].keys()];
    let minCalls=lockedN.length,maxCallsP=canCall?Math.min(maxNight,Math.floor(cap(p)/2)):0;
    if(!canCall&&lockedN.length) return [];
    const around=canCall?clamp(Math.round(avgCalls),0,maxCallsP):0;
    let callValues=[];if(canCall){for(let c=Math.max(minCalls,around-2);c<=Math.min(maxCallsP,around+2);c++)callValues.push(c);if(!callValues.includes(minCalls)&&minCalls<=maxCallsP)callValues.push(minCalls);if(!callValues.includes(maxCallsP))callValues.push(maxCallsP);}else callValues=[0];
    for(const calls of [...new Set(callValues)].sort((a,b)=>a-b)){
      const residual=cap(p)-2*calls;if(residual<0)continue;
      for(let mask=0;mask<(1<<B);mask++){
        const days=daysFromMask(mask,intervals),daySet=new Set(days);if(days.length>residual)continue;if(tightCapacity&&days.length!==residual)continue;if(!tightCapacity){const tc=days.length+2*calls,tg=targetCredit[pi],lo=Math.floor(tg+1e-9),hi=Math.ceil(tg-1e-9);if(tc<lo||tc>hi)continue;}
        if(maxRun(days)>maxConsecutive)continue;
        let bad=false;for(const i of days)if(leave[pi][i]){bad=true;break;}if(bad)continue;
        // Locked day cells must be inside a selected interval; locked nights and their
        // protected next day must stay outside daytime blocks.
        for(const i of lockedDay[pi].keys())if(!daySet.has(i)){bad=true;break;}if(bad)continue;
        for(const i of lockedN){if(daySet.has(i)||(nightRest&&i+1<nD&&daySet.has(i+1))){bad=true;break;}}if(bad)continue;
        const wkCount=personWeekendCountFromDays(pi,daySet);
        if(wkCount>weekendCap)continue;
        if(!hasHardFlexPotential(pi,daySet))continue;
        opts.push({mask,calls,dayCount:days.length,cost:optionCost(pi,calls,daySet)});
      }
    }
    if(!opts.length)return opts;
    // Retain a broad, diverse set. Keep best options in every call-count/day-count bin
    // so feasibility is not sacrificed for fairness scoring.
    const bins=new Map();for(const o of opts){const k=o.calls+'|'+o.dayCount;if(!bins.has(k))bins.set(k,[]);bins.get(k).push(o);}
    const keep=[];for(const arr of bins.values()){arr.sort((a,b)=>a.cost-b.cost);keep.push(...arr.slice(0,24));}
    keep.sort((a,b)=>a.cost-b.cost);return keep.slice(0,180);
  }

  function dayLocalSearch(lens,intervals,rng,tries=12,iters=12000){
    const B=intervals.length,options=staff.map((_,pi)=>generateOptions(lens,intervals,pi));if(options.some(x=>!x.length))return null;
    const choices=new Array(staff.length),counts=new Array(B).fill(0);let calls=0,cost=0;
    const hardEnergy=()=>{let e=Math.abs(calls-totalCalls);for(let b=0;b<B;b++)e+=Math.abs(counts[b]-daySlots);return e;};
    let best=null,bestE=1e9;
    for(let tr=0;tr<tries&&!timedOut();tr++){
      counts.fill(0);calls=0;cost=0;
      for(let pi=0;pi<staff.length;pi++){const arr=options[pi],pick=arr[Math.floor(rng()*Math.min(arr.length,Math.max(6,Math.floor(arr.length*.55))))];choices[pi]=pick;calls+=pick.calls;cost+=pick.cost;for(let b=0;b<B;b++)if(pick.mask&(1<<b))counts[b]++;}
      let e=hardEnergy(),temp=4;
      for(let it=0;it<iters&&!timedOut();it++){
        if(e===0)return{choices:choices.map(x=>({...x})),options};
        const pi=Math.floor(rng()*staff.length),arr=options[pi],old=choices[pi],neu=arr[Math.floor(rng()*arr.length)];if(neu===old)continue;
        for(let b=0;b<B;b++){if(old.mask&(1<<b))counts[b]--;if(neu.mask&(1<<b))counts[b]++;}calls+=neu.calls-old.calls;
        const e2=hardEnergy(),delta=(e2-e)*50+(neu.cost-old.cost)*.05;
        if(delta<=0||rng()<Math.exp(-delta/Math.max(.03,temp))){choices[pi]=neu;e=e2;cost+=neu.cost-old.cost;}else{for(let b=0;b<B;b++){if(neu.mask&(1<<b))counts[b]--;if(old.mask&(1<<b))counts[b]++;}calls+=old.calls-neu.calls;}
        temp*=.9995;
      }
      if(e<bestE){bestE=e;best={e,choices:choices.map(x=>({...x}))};}
    }
    return best?.e===0?{choices:best.choices,options}:null;
  }


  function rebalanceWeekendChoices(ds,intervals){ return ds; }

  function chooseHardFlexPlan(pi,daySet,rng){
    const reserved=new Set();
    for(const fr of freeRequests.filter(x=>x.hard&&x.person===staff[pi].id)){
      const from=dIndex.get(fr.from),to=dIndex.get(fr.to),need=Math.max(1,Math.min(10,Number(fr.days)||1));const free=[];for(let i=from;i<=to;i++)if(!daySet.has(i)&&!leave[pi][i])free.push(i);
      if(fr.consecutive){const runs=[];let cur=[];for(const i of free){if(!cur.length||i===cur[cur.length-1]+1)cur.push(i);else{runs.push(cur);cur=[i];}}if(cur.length)runs.push(cur);const valid=runs.filter(r=>r.length>=need);if(!valid.length)return null;valid.sort((a,b)=>a.length-b.length);const run=valid[Math.floor(rng()*Math.min(3,valid.length))];for(const i of run.slice(0,need))reserved.add(i);}else{if(free.length<need)return null;for(const i of shuffled(free,rng).slice(0,need))reserved.add(i);}
    }
    return reserved;
  }

  function matchSlots(workers,slotIds,kind,interval,rng){
    // workers are staff indexes. Locked cells constrain their slot when present.
    const forced=new Map();
    for(const pi of workers){const map=kind==='day'?lockedDay[pi]:lockedNight[pi];const vals=new Set();if(kind==='day'){for(const i of interval)if(map.has(i))vals.add(map.get(i));}else{const i=interval[0];if(map.has(i))vals.add(map.get(i));}if(vals.size>1)return null;if(vals.size===1)forced.set(pi,[...vals][0]);}
    const slotObjs=slotIds.map((sid,j)=>({sid,j})),used=new Set(),ans=new Map();
    slotObjs.sort((a,b)=>{
      const ca=workers.filter(pi=>staff[pi].eligible?.includes(a.sid)&&(!forced.has(pi)||forced.get(pi)===a.sid)).length;
      const cb=workers.filter(pi=>staff[pi].eligible?.includes(b.sid)&&(!forced.has(pi)||forced.get(pi)===b.sid)).length;return ca-cb;
    });
    function pref(pi,sid){let c=0;const pid=staff[pi].id;if(kind==='day'&&preserve&&baseline){for(const i of interval)if((baseline[pid+'|'+dates[i]]||'')===sid)c-=5;}if(kind==='day'){for(const i of interval){for(const r of requests){if(r.person!==pid||dIndex.get(r.date)!==i)continue;if(r.type==='prefer'&&r.shift===sid)c-=4;if(r.type==='avoid'&&r.shift===sid)c+=6;}}}return c+rng()*.01;}
    function rec(pos){if(pos===slotObjs.length)return true;const sid=slotObjs[pos].sid;let cand=workers.filter(pi=>!used.has(pi)&&staff[pi].eligible?.includes(sid)&&(!forced.has(pi)||forced.get(pi)===sid));cand.sort((a,b)=>pref(a,sid)-pref(b,sid));for(const pi of cand){used.add(pi);ans.set(pi,sid);if(rec(pos+1))return true;used.delete(pi);ans.delete(pi);}return false;}
    return rec(0)?ans:null;
  }

  function buildDayAssignments(lens,intervals,dayChoices,rng){
    const out={},daySets=staff.map(()=>new Set());
    for(let pi=0;pi<staff.length;pi++)for(let b=0;b<intervals.length;b++)if(dayChoices[pi].mask&(1<<b))for(const i of intervals[b])daySets[pi].add(i);
    for(let b=0;b<intervals.length;b++){
      const workers=[];for(let pi=0;pi<staff.length;pi++)if(dayChoices[pi].mask&(1<<b))workers.push(pi);if(workers.length!==daySlots)return null;
      const matched=matchSlots(workers,daySlotIds,'day',intervals[b],rng);if(!matched)return null;
      for(const [pi,sid] of matched)for(const i of intervals[b])out[staff[pi].id+'|'+dates[i]]=sid;
    }
    return{assignments:out,daySets};
  }

  function validNightPattern(pi,set,need,daySet,reserved){
    if(set.size!==need)return false;for(const i of lockedNight[pi].keys())if(!set.has(i))return false;
    const p=staff[pi],work=new Set(daySet);
    for(const i of set){if(i<0||i>=nD||leave[pi][i]||daySet.has(i)||reserved.has(i))return false;if(!nightSlotIdsByDate[i].some(sid=>p.eligible?.includes(sid)))return false;if(nightRest&&i+1<nD&&daySet.has(i+1))return false;work.add(i);}
    if(nightRest){for(const i of set)if(set.has(i+1))return false;}
    if(!nightGapOk(set))return false;
    if(maxRun([...work])>maxConsecutive)return false;
    {
      const used=new Set();for(const i of daySet)if(isWeekendIdx(i))used.add(weekendStartIdx(i));
      for(const wk of weekendKeys){const inds=[];for(let i=0;i<nD;i++)if(isWeekendIdx(i)&&weekendStartIdx(i)===wk)inds.push(i);const nc=inds.filter(i=>set.has(i)).length,dc=inds.some(i=>daySet.has(i));if(dc&&nc)return false;if(nc>1)return false;if(nc)used.add(wk);}if(used.size>weekendCap)return false;
    }
    return true;
  }
  function makeNightPattern(pi,need,daySet,reserved,rng){
    const reqLocked=[...lockedNight[pi].keys()];let set=new Set(reqLocked);if(reqLocked.length>need||!validNightPatternPartial(pi,set,daySet,reserved))return null;
    while(set.size<need){const cands=[];for(let i=0;i<nD;i++){if(set.has(i))continue;const test=new Set(set);test.add(i);if(validNightPatternPartial(pi,test,daySet,reserved))cands.push(i);}if(!cands.length)return null;cands.sort((a,b)=>{const ga=[...set].reduce((n,x)=>n+(Math.abs(x-a)<5?1:0),0),gb=[...set].reduce((n,x)=>n+(Math.abs(x-b)<5?1:0),0);const covered=new Set();for(const x of daySet)if(isWeekendIdx(x))covered.add(weekendStartIdx(x));for(const x of set)if(isWeekendIdx(x))covered.add(weekendStartIdx(x));const fa=isFellow(staff[pi])&&isWeekendIdx(a)&&!covered.has(weekendStartIdx(a))?-6:0,fb=isFellow(staff[pi])&&isWeekendIdx(b)&&!covered.has(weekendStartIdx(b))?-6:0;return (ga+fa)-(gb+fb)+(rng()-.5)*2;});set.add(cands[Math.floor(rng()*Math.min(8,cands.length))]);}
    return validNightPattern(pi,set,need,daySet,reserved)?set:null;
  }
  function validNightPatternPartial(pi,set,daySet,reserved){
    const p=staff[pi],work=new Set(daySet);for(const i of set){if(i<0||i>=nD||leave[pi][i]||daySet.has(i)||reserved.has(i))return false;if(!nightSlotIdsByDate[i].some(sid=>p.eligible?.includes(sid)))return false;if(nightRest&&i+1<nD&&daySet.has(i+1))return false;work.add(i);}if(nightRest)for(const i of set)if(set.has(i+1))return false;if(!nightGapOk(set))return false;if(maxRun([...work])>maxConsecutive)return false;{const used=new Set();for(const i of daySet)if(isWeekendIdx(i))used.add(weekendStartIdx(i));for(const wk of weekendKeys){let nc=0,dc=false;for(let i=0;i<nD;i++)if(isWeekendIdx(i)&&weekendStartIdx(i)===wk){if(set.has(i))nc++;if(daySet.has(i))dc=true;}if(dc&&nc)return false;if(nc>1)return false;if(nc)used.add(wk);}if(used.size>weekendCap)return false;}return true;
  }

  function buildNightSchedule(daySets,choices,reservedByPerson,rng){
    const callers=staff.map((p,pi)=>({p,pi,need:choices[pi].calls})).filter(x=>x.need>0);
    for(let pi=0;pi<staff.length;pi++)if(choices[pi].calls===0&&lockedNight[pi].size)return null;
    const allIdx=Array.from({length:nD},(_,i)=>i);
    const err=(counts)=>counts.reduce((n,c,i)=>n+Math.abs(c-nightSlotsByDate[i]),0);

    // A direct constructive/repair scheduler is much faster than pre-generating a large
    // pool of complete monthly call patterns. Each caller starts with one valid pattern;
    // then individual call dates are moved from over-covered to under-covered dates.
    for(let attempt=0;attempt<28&&!timedOut();attempt++){
      const chosen=new Map(),counts=new Array(nD).fill(0);let initOk=true;
      for(const x of callers){
        let pat=null;for(let t=0;t<28&&!pat;t++)pat=makeNightPattern(x.pi,x.need,daySets[x.pi],reservedByPerson[x.pi],rng);
        if(!pat){initOk=false;break;}chosen.set(x.pi,new Set(pat));for(const i of pat)counts[i]++;
      }
      if(!initOk)continue;
      let e=err(counts);
      for(let it=0;it<6500&&e&&!timedOut();it++){
        const over=[],under=[];for(let i=0;i<nD;i++){if(counts[i]>nightSlotsByDate[i])over.push(i);else if(counts[i]<nightSlotsByDate[i])under.push(i);}let moved=false;
        for(const a of shuffled(over,rng)){
          const persons=shuffled(callers.filter(x=>chosen.get(x.pi)?.has(a)),rng);
          for(const x of persons){
            for(const b of shuffled(under,rng)){
              if(chosen.get(x.pi).has(b))continue;const ns=new Set(chosen.get(x.pi));ns.delete(a);ns.add(b);
              if(validNightPattern(x.pi,ns,x.need,daySets[x.pi],reservedByPerson[x.pi])){chosen.set(x.pi,ns);counts[a]--;counts[b]++;e=err(counts);moved=true;break;}
            }
            if(moved)break;
          }
          if(moved)break;
        }
        if(moved)continue;
        // Neutral perturbation to escape a local minimum without changing call counts.
        const x=callers[Math.floor(rng()*callers.length)],cur=chosen.get(x.pi),vals=[...cur];if(!vals.length)continue;const a=vals[Math.floor(rng()*vals.length)];
        for(const b of shuffled(allIdx,rng).slice(0,24)){
          if(cur.has(b))continue;const ns=new Set(cur);ns.delete(a);ns.add(b);if(!validNightPattern(x.pi,ns,x.need,daySets[x.pi],reservedByPerson[x.pi]))continue;
          const oldE=e,oa=counts[a],ob=counts[b];counts[a]--;counts[b]++;const ne=err(counts);
          if(ne<=oldE+2||rng()<.035){chosen.set(x.pi,ns);e=ne;}else{counts[a]=oa;counts[b]=ob;}break;
        }
      }
      if(e)continue;

      // Exact date counts are now correct. Repair any per-shift eligibility problem
      // (for example a day with three R1s cannot cover KA) by swapping whole calls
      // between two staff members on two dates, preserving all monthly call totals.
      let matchedAll=false;
      for(let rep=0;rep<220&&!timedOut();rep++){
        const bad=[];for(let i=0;i<nD;i++){const workers=callers.filter(x=>chosen.get(x.pi).has(i)).map(x=>x.pi);if(!matchSlots(workers,nightSlotIdsByDate[i],'night',[i],rng))bad.push(i);}if(!bad.length){matchedAll=true;break;}
        const d=bad[Math.floor(rng()*bad.length)],onD=callers.filter(x=>chosen.get(x.pi).has(d));let fixed=false;
        for(const B of shuffled(callers.filter(x=>!chosen.get(x.pi).has(d)),rng)){
          for(const A of shuffled(onD,rng)){
            const workersD=onD.map(x=>x.pi).filter(pi=>pi!==A.pi).concat(B.pi);if(!matchSlots(workersD,nightSlotIdsByDate[d],'night',[d],rng))continue;
            for(const e2 of shuffled([...chosen.get(B.pi)],rng)){
              if(chosen.get(A.pi).has(e2))continue;
              const workersE=callers.filter(x=>chosen.get(x.pi).has(e2)).map(x=>x.pi).filter(pi=>pi!==B.pi).concat(A.pi);if(!matchSlots(workersE,nightSlotIdsByDate[e2],'night',[e2],rng))continue;
              const na=new Set(chosen.get(A.pi)),nb=new Set(chosen.get(B.pi));na.delete(d);na.add(e2);nb.delete(e2);nb.add(d);
              if(validNightPattern(A.pi,na,A.need,daySets[A.pi],reservedByPerson[A.pi])&&validNightPattern(B.pi,nb,B.need,daySets[B.pi],reservedByPerson[B.pi])){chosen.set(A.pi,na);chosen.set(B.pi,nb);fixed=true;break;}
            }
            if(fixed)break;
          }
          if(fixed)break;
        }
        if(!fixed)break;
      }
      if(!matchedAll)continue;
      const out={};let finalOk=true;
      for(let i=0;i<nD;i++){const workers=callers.filter(x=>chosen.get(x.pi).has(i)).map(x=>x.pi),m=matchSlots(workers,nightSlotIdsByDate[i],'night',[i],rng);if(!m){finalOk=false;break;}for(const [pi,sid] of m)out[staff[pi].id+'|'+dates[i]]=sid;}
      if(finalOk)return out;
    }
    return null;
  }

  const maxPartitions=Math.min(180,partitions.length);
  for(let ptry=0;ptry<maxPartitions&&!timedOut();ptry++){
    const lens=partitions[ptry],intervals=intervalsFrom(lens);
    for(let seedTry=0;seedTry<5&&!timedOut();seedTry++){
      const rng=makeRng(0x123456+(ptry+1)*1009+seedTry*7919+nD*17);
      let ds=dayLocalSearch(lens,intervals,rng,10,9000);if(!ds)continue;
      ds=rebalanceWeekendChoices(ds,intervals);
      const built=buildDayAssignments(lens,intervals,ds.choices,rng);if(!built)continue;
      const reservedByPerson=staff.map((_,pi)=>chooseHardFlexPlan(pi,built.daySets[pi],rng));if(reservedByPerson.some(x=>x===null))continue;
      const nights=buildNightSchedule(built.daySets,ds.choices,reservedByPerson,rng);if(!nights)continue;
      const assignments={...built.assignments,...nights};
      // Locked assignments are an exact hard requirement.
      let lockOk=true;for(const [k,sid] of Object.entries(locked))if(sid&&(assignments[k]||'')!==sid){lockOk=false;break;}if(!lockOk)continue;
      return{ok:true,assignments,elapsedMs:Date.now()-started,engine:'fast-constraint',partition:lens,totalMandatoryCredits:totalCredits,plannedOpen,weekendDeficit};
    }
  }
  if(timedOut())throw new Error('Fast scheduler reached its 8.5-second safety limit. The roster was not changed. This staffing/leave/locked-block combination is very tightly constrained (for example weekend caps fully used and staff at their credit caps). Use the server solver, add on-call-capable staff or raise caps, or relax locks and leave.');
  throw new Error('No roster was found under the current hard rules. The roster was not changed. Check staff eligibility, approved leave, locked assignments, credit caps, on-call caps, and weekend limits.');
}

if(typeof self!=='undefined'&&typeof self.postMessage==='function'){
  self.onmessage=e=>{try{self.postMessage({__solverEnvelope:true,status:200,data:solveRosterFast(e.data||{})});}catch(err){self.postMessage({__solverEnvelope:true,status:400,data:{ok:false,error:err instanceof Error?err.message:String(err)}});}};
}
if(typeof module!=='undefined'&&module.exports)module.exports={solveRosterFast};
