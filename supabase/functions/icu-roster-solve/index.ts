import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore CommonJS-compatible npm package supported by Deno.
import solver from "npm:javascript-lp-solver@0.4.24";

type Staff={id:string;level?:string;max?:number;eligible?:string[]};
type Shift={id:string;type:string;weekday?:number;weekend?:number;continuity?:boolean;overflowPriority?:number;overflowTarget?:number};
type Leave={person:string;from:string;to:string;status:string};
type Req={person:string;date:string;type:string;shift?:string};
type FreeReq={person:string;days:number;from:string;to:string;consecutive?:boolean;hard?:boolean};
type Rules={maxConsecutive?:number;nightRest?:boolean;maxAssignments?:number;maxNightCalls?:number;saudiWeekend?:boolean;minUnitBlock?:number;minNightGapDays?:number};

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:cors});
function isoDates(month:string){if(!/^\d{4}-\d{2}$/.test(month))throw new Error("Invalid month");const[y,m]=month.split('-').map(Number),out:string[]=[];for(let d=1;d<=31;d++){const x=new Date(Date.UTC(y,m-1,d));if(x.getUTCMonth()!==m-1)break;out.push(x.toISOString().slice(0,10));}return out;}
const dateObj=(d:string)=>new Date(d+"T00:00:00Z");
function splitRuns(idxs:number[]){const runs:number[][]=[];let cur:number[]=[];for(const i of idxs){if(!cur.length||i===cur[cur.length-1]+1)cur.push(i);else{runs.push(cur);cur=[i];}}if(cur.length)runs.push(cur);return runs;}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"POST required"},405);
  try{
    const body=await req.json();
    const month=String(body.month||"");
    const staff:Staff[]=Array.isArray(body.staff)?body.staff:[];
    const shifts:Shift[]=Array.isArray(body.shifts)?body.shifts:[];
    const leaves:Leave[]=Array.isArray(body.leaves)?body.leaves:[];
    const requests:Req[]=Array.isArray(body.requests)?body.requests:[];
    const freeRequests:FreeReq[]=Array.isArray(body.freeRequests)?body.freeRequests:[];
    const rules:Rules=body.rules||{};
    const lockedAssignments:Record<string,string>=body.lockedAssignments||{};
    const baseline:Record<string,string>|null=body.baselineAssignments||null;
    const preserve=!!body.preserve;
    if(!staff.length||staff.length>100)throw new Error("Staff list must contain 1–100 people");
    if(!shifts.length||shifts.length>40)throw new Error("Shift list must contain 1–40 shifts");
    const dates=isoDates(month),nD=dates.length,dIdx=new Map(dates.map((d,i)=>[d,i])),pIdx=new Map(staff.map((p,i)=>[p.id,i])),sMap=new Map(shifts.map(s=>[s.id,s]));
    const mandatory=shifts.filter(s=>!Number(s.overflowPriority||0)),dayShifts=mandatory.filter(s=>s.type==="day"),nightShifts=mandatory.filter(s=>s.type==="night");
    const minBlock=Math.max(1,Number(rules.minUnitBlock)||1),maxConsecutive=Math.max(1,Number(rules.maxConsecutive)||6);
    if(minBlock>maxConsecutive)throw new Error(`Minimum daytime continuity (${minBlock}) cannot exceed maximum consecutive work (${maxConsecutive}).`);
    const globalMax=Math.max(1,Number(rules.maxAssignments)||31),maxNight=Math.max(1,Number(rules.maxNightCalls)||31),minNightGap=Math.max(3,Number(rules.minNightGapDays)||3);
    const saudi=rules.saudiWeekend!==false,nightRest=rules.nightRest!==false;
    const dow=(i:number)=>dateObj(dates[i]).getUTCDay();
    const isWeekend=(i:number)=>saudi?(dow(i)===5||dow(i)===6):(dow(i)===6||dow(i)===0);
    const weekendStart=(i:number)=>{const d=dow(i);if(saudi){if(d===5)return i;if(d===6)return i-1;}else{if(d===6)return i;if(d===0)return i-1;}return -999;};
    const weekends=[...new Set(dates.map((_,i)=>isWeekend(i)?weekendStart(i):-999).filter(x=>x!==-999))];
    const weekendCap=Math.ceil(weekends.length/2);
    const reqCount=(s:Shift,i:number)=>Number(isWeekend(i)?s.weekend:s.weekday)||0;
    const credit=(sid:string)=>sMap.get(sid)?.type==="night"?2:1;
    const effMax=(p:Staff)=>Math.min(globalMax,Math.max(1,Number(p.max)||31));

    const leave=staff.map(()=>new Uint8Array(nD));
    for(const l of leaves){if(l.status!=="approved")continue;const pi=pIdx.get(l.person);if(pi==null)continue;for(let i=0;i<nD;i++)if(dates[i]>=l.from&&dates[i]<=l.to)leave[pi][i]=1;}

    function splitWeekend(pos:number,size:number,run:number[]){const cut=pos+size;if(cut<=0||cut>=run.length)return false;const a=run[cut-1],b=run[cut];return isWeekend(a)&&isWeekend(b)&&weekendStart(a)===weekendStart(b);}
    function partitionRun(run:number[]):number[][]{if(run.length<=minBlock)return[run];const memo=new Map<number,number[][]|null>();const rec=(pos:number):number[][]|null=>{if(pos===run.length)return[];if(memo.has(pos))return memo.get(pos)!;const rem=run.length-pos;if(rem<minBlock){memo.set(pos,null);return null;}const sizes:number[]=[];for(let size=minBlock;size<=Math.min(maxConsecutive,rem);size++){if(rem-size!==0&&rem-size<minBlock)continue;if(splitWeekend(pos,size,run))continue;sizes.push(size);}for(const size of sizes){const tail=rec(pos+size);if(tail){const ans=[run.slice(pos,pos+size),...tail];memo.set(pos,ans);return ans;}}memo.set(pos,null);return null;};return rec(0)||[run];}

    type Task={id:number;shift:string;dates:number[];kind:"night"|"day";lane:number;skippable:boolean};
    const tasks:Task[]=[];let tid=0;
    for(let i=0;i<nD;i++)for(const s of nightShifts)for(let lane=0;lane<reqCount(s,i);lane++)tasks.push({id:tid++,shift:s.id,dates:[i],kind:"night",lane,skippable:isWeekend(i)});
    for(const s of dayShifts){const maxNeed=Math.max(0,...dates.map((_,i)=>reqCount(s,i)));for(let lane=0;lane<maxNeed;lane++){const idxs=dates.map((_,i)=>reqCount(s,i)>lane?i:-1).filter(i=>i>=0);if(s.continuity!==false&&minBlock>1){for(const run of splitRuns(idxs))for(const block of partitionRun(run))tasks.push({id:tid++,shift:s.id,dates:block,kind:"day",lane,skippable:false});}else for(const i of idxs)tasks.push({id:tid++,shift:s.id,dates:[i],kind:"day",lane,skippable:false});}}
    if(tasks.length>500)throw new Error("Coverage model is too large");
    const estimatedIntegerVariables=tasks.length*staff.length;
    if(estimatedIntegerVariables>7000)return json({ok:false,infeasible:false,error:"This roster is intentionally handled by the browser solver to avoid server compute limits.",estimatedIntegerVariables},422);

    const model:any={optimize:"cost",opType:"min",constraints:{},variables:{},ints:{}};
    const varsByPersonDay=new Map<string,string[]>(),varsDayByPersonDay=new Map<string,string[]>(),varsNightByPersonDay=new Map<string,string[]>(),varsByPerson=new Map<string,string[]>();
    const varMeta=new Map<string,{task:Task;person:Staff}>(),skipMeta=new Map<string,Task>();
    const fixedLocked=Object.entries(lockedAssignments).filter(([,sid])=>!!sid);
    const prefOff=new Set(requests.filter(r=>r.type==="off").map(r=>r.person+"|"+r.date));
    const prefShift=new Map(requests.filter(r=>r.type==="prefer").map(r=>[r.person+"|"+r.date,r.shift||""]));
    const avoidShift=new Map(requests.filter(r=>r.type==="avoid").map(r=>[r.person+"|"+r.date,r.shift||""]));

    for(const t of tasks){
      const taskCn="task_"+t.id;model.constraints[taskCn]={equal:1};let candidates=0;
      for(const p of staff){const pi=pIdx.get(p.id)!;if(!p.eligible?.includes(t.shift))continue;if(t.dates.some(i=>leave[pi][i]))continue;let lockConflict=false;for(const i of t.dates){const lk=lockedAssignments[p.id+"|"+dates[i]];if(lk&&lk!==t.shift){lockConflict=true;break;}}if(lockConflict)continue;
        const vn=`x_${t.id}_${pi}`,props:any={cost:0,[taskCn]:1,["cap_"+pi]:credit(t.shift)*t.dates.length};if(t.kind==="night")props["nightcap_"+pi]=1;
        let cost=0;for(const i of t.dates){const k=p.id+"|"+dates[i];if(prefOff.has(k))cost+=120;if(prefShift.get(k)===t.shift)cost-=35;if(avoidShift.get(k)===t.shift)cost+=50;if(preserve&&baseline){const old=baseline[k]||"";if(old===t.shift)cost-=55;else if(old)cost+=15;}}
        if(t.kind==="day"&&!t.dates.some(isWeekend)&&p.eligible?.some(sid=>nightShifts.some(ns=>ns.id===sid)))cost+=4;props.cost=cost;
        for(const i of t.dates){const dk=`day_${pi}_${i}`;props[dk]=(props[dk]||0)+1;(varsByPersonDay.get(dk)||varsByPersonDay.set(dk,[]).get(dk)!).push(vn);if(t.kind==="day"){const dd=`dayshift_${pi}_${i}`;(varsDayByPersonDay.get(dd)||varsDayByPersonDay.set(dd,[]).get(dd)!).push(vn);}}
        if(t.kind==="night"){const nk=`nightday_${pi}_${t.dates[0]}`;props[nk]=1;(varsNightByPersonDay.get(nk)||varsNightByPersonDay.set(nk,[]).get(nk)!).push(vn);}
        (varsByPerson.get(String(pi))||varsByPerson.set(String(pi),[]).get(String(pi))!).push(vn);model.variables[vn]=props;model.ints[vn]=1;varMeta.set(vn,{task:t,person:p});candidates++;
      }
      if(t.skippable){const skip=`skip_${t.id}`;model.variables[skip]={cost:100000,[taskCn]:1};model.ints[skip]=1;skipMeta.set(skip,t);}else if(!candidates)return json({ok:false,infeasible:true,message:`No eligible staff can cover required task ${t.shift} on ${t.dates.map(i=>dates[i]).join(', ')}`});
    }

    for(let pi=0;pi<staff.length;pi++)for(let i=0;i<nD;i++)model.constraints[`day_${pi}_${i}`]={max:1};
    for(let pi=0;pi<staff.length;pi++){model.constraints["cap_"+pi]={max:effMax(staff[pi])};model.constraints["nightcap_"+pi]={max:maxNight};}
    if(nightRest)for(let pi=0;pi<staff.length;pi++)for(let i=0;i<nD-1;i++){const cn=`post_${pi}_${i}`;model.constraints[cn]={max:1};for(const v of varsNightByPersonDay.get(`nightday_${pi}_${i}`)||[])model.variables[v][cn]=(model.variables[v][cn]||0)+1;for(const v of varsByPersonDay.get(`day_${pi}_${i+1}`)||[])model.variables[v][cn]=(model.variables[v][cn]||0)+1;}
    for(let pi=0;pi<staff.length;pi++)for(let start=0;start<=nD-minNightGap;start++){const cn=`nightgap_${pi}_${start}`;model.constraints[cn]={max:1};for(let i=start;i<start+minNightGap;i++)for(const v of varsNightByPersonDay.get(`nightday_${pi}_${i}`)||[])model.variables[v][cn]=(model.variables[v][cn]||0)+1;}
    const win=maxConsecutive+1;if(win<=nD)for(let pi=0;pi<staff.length;pi++)for(let start=0;start<=nD-win;start++){const cn=`streak_${pi}_${start}`;model.constraints[cn]={max:maxConsecutive};for(let i=start;i<start+win;i++)for(const v of varsByPersonDay.get(`day_${pi}_${i}`)||[])model.variables[v][cn]=(model.variables[v][cn]||0)+1;}

    let softFlexNo=0;
    for(const fr of freeRequests.filter(x=>!x.hard)){const pi=pIdx.get(fr.person);if(pi==null)continue;const from=dIdx.get(fr.from),to=dIdx.get(fr.to),days=Math.max(1,Math.min(10,Number(fr.days)||1));if(from==null||to==null||to<from||to-from+1<days){softFlexNo++;continue;}if(fr.consecutive){const choose=`sflexchoose_${softFlexNo}`,fail=`sflexfail_${softFlexNo}`;model.constraints[choose]={equal:1};model.variables[fail]={cost:180,[choose]:1};model.ints[fail]=1;for(let start=from;start<=to-days+1;start++){const y=`sflexw_${softFlexNo}_${start}`;model.variables[y]={cost:0,[choose]:1};model.ints[y]=1;for(let i=start;i<start+days;i++){const cn=`sflexoff_${softFlexNo}_${start}_${i}`;model.constraints[cn]={max:1};model.variables[y][cn]=1;for(const v of varsByPersonDay.get(`day_${pi}_${i}`)||[])model.variables[v][cn]=(model.variables[v][cn]||0)+1;}}}else{const windowLen=to-from+1,cn=`sflexcount_${softFlexNo}`,slack=`sflexslack_${softFlexNo}`;model.constraints[cn]={max:windowLen-days};for(let i=from;i<=to;i++)for(const v of varsByPersonDay.get(`day_${pi}_${i}`)||[])model.variables[v][cn]=(model.variables[v][cn]||0)+1;model.variables[slack]={cost:120,[cn]:-1};model.ints[slack]=1;}softFlexNo++;}

    let hardFlexNo=0;
    for(const fr of freeRequests.filter(x=>x.hard)){const pi=pIdx.get(fr.person);if(pi==null)throw new Error('Approved flexible-day request belongs to an inactive staff member');const from=dIdx.get(fr.from),to=dIdx.get(fr.to),days=Math.max(1,Math.min(10,Number(fr.days)||1));if(from==null||to==null||to<from||to-from+1<days)throw new Error('Approved flexible-day request has an invalid date window');if(fr.consecutive){let n=0;for(let start=from;start<=to-days+1;start++){const y=`flexw_${hardFlexNo}_${start}`;model.variables[y]={cost:0,[`flexchoose_${hardFlexNo}`]:1};model.ints[y]=1;n++;for(let i=start;i<start+days;i++){const cn=`flexoff_${hardFlexNo}_${start}_${i}`;model.constraints[cn]={max:1};model.variables[y][cn]=1;for(const v of varsByPersonDay.get(`day_${pi}_${i}`)||[])model.variables[v][cn]=(model.variables[v][cn]||0)+1;}}if(!n)throw new Error('No valid consecutive free-day block exists in the requested window');model.constraints[`flexchoose_${hardFlexNo}`]={equal:1};}else{const cn=`flexcount_${hardFlexNo}`;model.constraints[cn]={max:(to-from+1)-days};for(let i=from;i<=to;i++)for(const v of varsByPersonDay.get(`day_${pi}_${i}`)||[])model.variables[v][cn]=(model.variables[v][cn]||0)+1;}hardFlexNo++;}

    // Weekend cap applies to every active rostered staff member. A weekend package is
    // either one weekend on-call OR both weekend daytime duties.
    for(let pi=0;pi<staff.length;pi++){model.constraints[`wcap_${pi}`]={max:weekendCap};for(const w of weekends){const inside=[w,w+1].filter(i=>i>=0&&i<nD);if(!inside.length)continue;if(inside.length<2){const y=`wboundary_${pi}_${w}`,cn=`wboundaryeq_${pi}_${w}`;model.constraints[cn]={equal:0};model.variables[y]={cost:0,[`wcap_${pi}`]:1,[cn]:-1};model.ints[y]=1;for(const i of inside)for(const v of varsByPersonDay.get(`day_${pi}_${i}`)||[])model.variables[v][cn]=(model.variables[v][cn]||0)+1;continue;}const yN=`wnight_${pi}_${w}`,yD=`wday_${pi}_${w}`,pkg=`wpkg_${pi}_${w}`;model.variables[yN]={cost:0,[`wcap_${pi}`]:1,[pkg]:1};model.variables[yD]={cost:0,[`wcap_${pi}`]:1,[pkg]:1};model.ints[yN]=1;model.ints[yD]=1;model.constraints[pkg]={max:1};const nightEq=`wnighteq_${pi}_${w}`;model.constraints[nightEq]={equal:0};model.variables[yN][nightEq]=-1;for(const i of inside)for(const v of varsNightByPersonDay.get(`nightday_${pi}_${i}`)||[])model.variables[v][nightEq]=(model.variables[v][nightEq]||0)+1;for(const i of inside){const dayEq=`wdayeq_${pi}_${w}_${i}`;model.constraints[dayEq]={equal:0};model.variables[yD][dayEq]=-1;for(const v of varsDayByPersonDay.get(`dayshift_${pi}_${i}`)||[])model.variables[v][dayEq]=(model.variables[v][dayEq]||0)+1;}}}

    for(const[k,sid]of fixedLocked){const[pid,d]=k.split('|'),pi=pIdx.get(pid),di=dIdx.get(d);if(pi==null||di==null)continue;const matches:string[]=[];for(const[vn,m]of varMeta)if(m.person.id===pid&&m.task.shift===sid&&m.task.dates.includes(di))matches.push(vn);if(!matches.length)return json({ok:false,infeasible:true,message:`Locked assignment ${pid} ${d} ${sid} cannot be represented under current rules`});const cn=`lock_${pi}_${di}_${sid}`;model.constraints[cn]={equal:1};for(const v of matches)model.variables[v][cn]=1;}

    const totalMandatoryCredits=tasks.reduce((sum,t)=>sum+credit(t.shift)*t.dates.length,0),target=totalMandatoryCredits/staff.length;
    for(let pi=0;pi<staff.length;pi++){const cn=`bal_${pi}`;model.constraints[cn]={equal:target};model.variables[`devp_${pi}`]={cost:1,[cn]:-1};model.variables[`devn_${pi}`]={cost:1,[cn]:1};for(const v of varsByPerson.get(String(pi))||[]){const t=varMeta.get(v)!.task;model.variables[v][cn]=(model.variables[v][cn]||0)+credit(t.shift)*t.dates.length;}}

    const started=Date.now(),result=solver.Solve(model),elapsedMs=Date.now()-started;
    if(!result?.feasible)return json({ok:false,infeasible:true,message:"No roster satisfies weekday coverage and all current hard rules. The browser fallback may explore alternate daytime continuity partitions.",elapsedMs});
    const assignments:Record<string,string>={};for(const[vn,m]of varMeta)if(Number(result[vn]||0)>0.5)for(const i of m.task.dates)assignments[m.person.id+"|"+dates[i]]=m.task.shift;
    const intentionalOpen:{date:string;shift:string}[]=[];for(const[skip,t]of skipMeta)if(Number(result[skip]||0)>0.5)intentionalOpen.push({date:dates[t.dates[0]],shift:t.shift});
    const open:any[]=[];for(let i=0;i<nD;i++)for(const s of mandatory){let have=0;for(const p of staff)if(assignments[p.id+"|"+dates[i]]===s.id)have++;for(let x=have;x<reqCount(s,i);x++)open.push({date:dates[i],shift:s.id});}
    const intendedCounts=new Map<string,number>();for(const x of intentionalOpen){const k=x.date+'|'+x.shift;intendedCounts.set(k,(intendedCounts.get(k)||0)+1);}for(const x of open){const k=x.date+'|'+x.shift,n=intendedCounts.get(k)||0;if(n<1)return json({ok:false,infeasible:true,message:"Solver returned an unexpected non-manual coverage gap",open,intentionalOpen,elapsedMs});intendedCounts.set(k,n-1);}
    return json({ok:true,assignments,intentionalOpen,elapsedMs,objective:result.result,totalMandatoryCredits,estimatedIntegerVariables,weekendCap,source:"server-v5"});
  }catch(e){return json({ok:false,error:e instanceof Error?e.message:String(e)},400);}
});
