(()=>{
'use strict';

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const KEY='icuRosterPlannerV4';
const DAY_NAMES=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const SUPABASE_URL='https://jjoyrvyjwozrxefagjhx.supabase.co';
const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impqb3lydnlqd296cnhlZmFnamh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1ODYzOTQsImV4cCI6MjEwMzE2MjM5NH0.DpRCdrDTJaJQd3mGFVvcp3bYE2s7qDJ1MVQKSnvi7us';
const SUPABASE_SOLVER_URL=SUPABASE_URL+'/functions/v1/icu-roster-solve';

const allShiftIds=['sA','sB','sT','sG','sK','sS','sN','sR','sP','sER','sCC','sMT','sGR','sKA'];
const dayShiftIds=['sA','sB','sT','sG','sK','sS','sN','sR','sP','sER','sCC'];
const standardNightIds=['sMT','sGR','sKA'];

function sampleStaff(){
  const phones=['1460','1498','1485','1447','0560858186','1514','1472','2732','1499','1506','9321','9436','9533','3122','504877822','559908833','535561115','0590002331','9271','9382','556665845','555432214','554122334','055274414','0555966862','0576274474','0554950112','0563286813','562285006','541619344','592309100','552318376','591526694','507475448','506657077','541600436','556006526'];
  let idx=0;
  const nextPager=()=>phones[idx++]||('05'+String(10000000+idx).padStart(8,'0'));
  const out=[];
  for(let i=1;i<=8;i++)out.push({id:'r2'+i,name:`R2 Resident ${String(i).padStart(2,'0')}`,level:'R2',group:'ICU Residents',max:18,pager:nextPager(),eligible:[...allShiftIds]});
  for(let i=1;i<=8;i++)out.push({id:'r1'+i,name:`R1 Resident ${String(i).padStart(2,'0')}`,level:'R1',group:'ICU Residents',max:18,pager:nextPager(),eligible:[...dayShiftIds,'sMT','sGR']});
  for(let i=1;i<=2;i++)out.push({id:'fel'+i,name:`Fellow ${String(i).padStart(2,'0')}`,level:'Fellow',group:'Fellows',max:16,pager:nextPager(),eligible:[...allShiftIds]});
  for(let i=1;i<=4;i++)out.push({id:'er'+i,name:`ER Rotator ${String(i).padStart(2,'0')}`,level:'Rotator',group:'ER Rotators',max:16,pager:nextPager(),eligible:[...dayShiftIds]});
  for(let i=1;i<=4;i++)out.push({id:'im'+i,name:`IM Rotator ${String(i).padStart(2,'0')}`,level:'Rotator',group:'IM Rotators',max:16,pager:nextPager(),eligible:[...dayShiftIds]});
  for(let i=1;i<=2;i++)out.push({id:'gs'+i,name:`GS Rotator ${String(i).padStart(2,'0')}`,level:'Rotator',group:'GS Rotators',max:16,pager:nextPager(),eligible:[...dayShiftIds]});
  return out;
}

const defaultState=()=>{
  const staff=sampleStaff();
  return({
  version:'10.8.2',
  month:'2026-09',
  published:false,
  rules:{maxConsecutive:6,nightRest:true,maxAssignments:18,maxNightCalls:6,minNightGapDays:3,fairGap:3,saudiWeekend:true,minUnitBlock:3},
  shifts:[
    {id:'sA',code:'A',name:'MICU - Team A',type:'day',weekday:1,weekend:1,continuity:true},
    {id:'sB',code:'B',name:'MICU - Team B',type:'day',weekday:1,weekend:1,continuity:true},
    {id:'sT',code:'T',name:'TICU',type:'day',weekday:1,weekend:1,continuity:true},
    {id:'sG',code:'G',name:'GICU',type:'day',weekday:1,weekend:1,continuity:true},
    {id:'sK',code:'K',name:'KASCH ICU - Morning',type:'day',weekday:1,weekend:1,continuity:true},
    {id:'sS',code:'S',name:'SICU - Morning',type:'day',weekday:1,weekend:1,continuity:true},
    {id:'sN',code:'N',name:'NICU / Neuro ICU - Morning',type:'day',weekday:1,weekend:1,continuity:true},
    {id:'sR',code:'R',name:'RICU - Respiratory ICU Morning',type:'day',weekday:1,weekend:1,continuity:true},
    {id:'sP',code:'P',name:'PRU - Progressive Care Unit',type:'day',weekday:2,weekend:2,continuity:true},
    {id:'sER',code:'ER',name:'ER Extra Coverage',type:'day',weekday:0,weekend:0,continuity:false,overflowPriority:1,overflowTarget:1},
    {id:'sCC',code:'CC',name:'CCRT Extra Coverage',type:'day',weekday:0,weekend:0,continuity:false,overflowPriority:2,overflowTarget:1},
    {id:'sMT',code:'MT',name:'Night: MICU / ICU / ER',type:'night',weekday:1,weekend:1,continuity:false},
    {id:'sGR',code:'GR',name:'Night: GICU / RICU / NCCU',type:'night',weekday:1,weekend:1,continuity:false},
    {id:'sKA',code:'KA',name:'Night: KASCH',type:'night',weekday:1,weekend:1,continuity:false}
  ],
  staff,
  leaves:[
    {id:'l1',person:'r22',from:'2026-09-08',to:'2026-09-10',status:'approved'},
    {id:'l2',person:'r15',from:'2026-09-20',to:'2026-09-23',status:'approved'}
  ],
  requests:[
    {id:'q1',person:'r21',date:'2026-09-12',type:'off',shift:''},
    {id:'q2',person:'r24',date:'2026-09-18',type:'prefer',shift:'sGR'},
    {id:'q3',person:'r13',date:'2026-09-05',type:'avoid',shift:'sMT'}
  ],
  freeRequests:[
    {id:'f1',person:'r26',days:3,from:'2026-09-14',to:'2026-09-24',consecutive:true}
  ],
  swaps:[],
  assignments:{},
  locks:{},
  activity:[],
  counterSettings:{baseShifts:20},
  activeStaffIds:staff.map(p=>p.id),
  remotePortal:null,
  monthStore:{}
  });
};

let state=load();
let editingCell=null;
let editingStaff=null;
let editingShift=null;
const selectedStaffIds=new Set();

function load(){
  try{
    const raw=localStorage.getItem(KEY);
    if(!raw)return defaultState();
    return normalizeState(JSON.parse(raw));
  }catch(e){return defaultState();}
}

function normalizeState(s){
  const d=defaultState();
  const out={...d,...s};
  out.version=d.version;
  out.rules={...d.rules,...(s.rules||{})};
  out.shifts=Array.isArray(s.shifts)?s.shifts:d.shifts;
  out.staff=Array.isArray(s.staff)?s.staff:d.staff;
  out.staff=out.staff.map(p=>({pager:'',...p,pager:(p?.pager||d.staff.find(x=>x.id===p.id)?.pager||'')}));
  out.leaves=Array.isArray(s.leaves)?s.leaves:[];
  out.requests=Array.isArray(s.requests)?s.requests:[];
  out.freeRequests=Array.isArray(s.freeRequests)?s.freeRequests:[];
  out.swaps=Array.isArray(s.swaps)?s.swaps:[];
  out.assignments=s.assignments||{};
  out.locks=s.locks||{};
  out.activity=Array.isArray(s.activity)?s.activity:[];
  out.counterSettings={...d.counterSettings,...(s.counterSettings||{})};
  const masterIds=out.staff.map(p=>p.id);
  out.activeStaffIds=Array.isArray(s.activeStaffIds)?s.activeStaffIds.filter(id=>masterIds.includes(id)):[...masterIds];
  out.remotePortal=(s.remotePortal&&typeof s.remotePortal==='object')?s.remotePortal:null;
  out.monthStore=(s.monthStore&&typeof s.monthStore==='object')?s.monthStore:{};
  for(const snap of Object.values(out.monthStore)){
    if(!snap||typeof snap!=='object')continue;
    snap.activeStaffIds=Array.isArray(snap.activeStaffIds)?snap.activeStaffIds.filter(id=>masterIds.includes(id)):[...masterIds];
    snap.remotePortal=cloneRemotePortal(snap.remotePortal);
  }
  if(!out.monthStore[out.month]&&(Object.keys(out.assignments).length||Object.keys(out.locks).length||out.swaps.length||out.published)){
    out.monthStore[out.month]={assignments:{...out.assignments},locks:{...out.locks},swaps:JSON.parse(JSON.stringify(out.swaps||[])),published:!!out.published,activeStaffIds:Array.isArray(out.activeStaffIds)?[...out.activeStaffIds]:null,remotePortal:cloneRemotePortal(out.remotePortal)};
  }
  out.shifts.forEach(sh=>{if(sh.continuity===undefined)sh.continuity=sh.type==='day';});
  return out;
}

function cloneRemotePortal(rp){return rp?{...rp,staffTokens:rp.staffTokens&&typeof rp.staffTokens==='object'?{...rp.staffTokens}:{}}:null;}
function currentMonthSnapshot(){return{assignments:{...state.assignments},locks:{...state.locks},swaps:JSON.parse(JSON.stringify(state.swaps||[])),published:!!state.published,activeStaffIds:[...currentActiveStaffIds()],remotePortal:cloneRemotePortal(state.remotePortal)};}
function storeCurrentMonth(){if(!state.monthStore||typeof state.monthStore!=='object')state.monthStore={};state.monthStore[state.month]=currentMonthSnapshot();}
function loadMonthSnapshot(value){const snap=state.monthStore?.[value]||{assignments:{},locks:{},swaps:[],published:false,activeStaffIds:state.staff.map(p=>p.id),remotePortal:null};state.assignments={...(snap.assignments||{})};state.locks={...(snap.locks||{})};state.swaps=JSON.parse(JSON.stringify(snap.swaps||[]));state.published=!!snap.published;state.activeStaffIds=Array.isArray(snap.activeStaffIds)?snap.activeStaffIds.filter(id=>state.staff.some(p=>p.id===id)):state.staff.map(p=>p.id);state.remotePortal=cloneRemotePortal(snap.remotePortal);}
function invalidateAllPublished(){state.published=false;for(const snap of Object.values(state.monthStore||{}))snap.published=false;}
function invalidatePublishedRange(from,to){const a=String(from||'').slice(0,7),b=String(to||'').slice(0,7);if(!a||!b)return;for(const [m,snap] of Object.entries(state.monthStore||{}))if(m>=a&&m<=b)snap.published=false;if(state.month>=a&&state.month<=b)state.published=false;}
function save(){try{storeCurrentMonth();localStorage.setItem(KEY,JSON.stringify(state));}catch(e){/* local file storage may be disabled */}queuePortalSync();}
function uid(prefix){return prefix+Math.random().toString(36).slice(2,10);}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function logAction(action,detail){state.activity.unshift({id:uid('a'),when:new Date().toLocaleString(),action,detail});state.activity=state.activity.slice(0,120);}

function monthDates(){
  const [y,m]=state.month.split('-').map(Number),d=new Date(Date.UTC(y,m-1,1)),arr=[];
  while(d.getUTCMonth()===m-1){arr.push(d.toISOString().slice(0,10));d.setUTCDate(d.getUTCDate()+1);}
  return arr;
}
function monthBounds(){const d=monthDates();return{first:d[0],last:d[d.length-1]};}
function dateObj(date){return new Date(date+'T00:00:00Z');}
function addDays(date,n){const d=dateObj(date);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
function prevDate(date){return addDays(date,-1);}
function nextDate(date){return addDays(date,1);}
function dayName(date){return DAY_NAMES[dateObj(date).getUTCDay()];}
function formatMonthLabel(value){const [y,m]=value.split('-').map(Number);return new Date(Date.UTC(y,m-1,1)).toLocaleString('en-US',{month:'long',year:'numeric',timeZone:'UTC'});} 
function displayGroupName(group){
  const g=(group||'').trim();
  if(g==='ICU Residents')return 'ICU RESIDENTS';
  if(g==='Fellows')return 'FELLOWS';
  if(g==='GS Rotators')return 'ROTATOR – GS';
  if(g==='ER Rotators')return 'ROTATOR – ER';
  if(g==='IM Rotators')return 'ROTATOR – IM';
  return g?g.toUpperCase():'UNGROUPED';
}
function legendDisplayName(shift){
  if(!shift)return '';
  if(shift.id==='sER')return 'ER';
  if(shift.id==='sCC')return 'CCRT';
  return shift.name;
}
function monthValueOffset(value,delta){
  const [y,m]=value.split('-').map(Number);
  const d=new Date(Date.UTC(y,m-1+delta,1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;
}
function setRosterMonth(value){
  if(!/^\d{4}-\d{2}$/.test(value)||value===state.month)return;
  const previous=state.month;
  storeCurrentMonth();
  state.month=value;
  loadMonthSnapshot(value);remoteRequests=[];
  logAction('Changed roster month',`${previous} → ${value}`);
  const toolbarPicker=$('#monthPicker');if(toolbarPicker)toolbarPicker.value=value;
  renderAll();
}
function isWeekend(date){const day=dateObj(date).getUTCDay();return state.rules.saudiWeekend?(day===5||day===6):(day===0||day===6);}
function isFriday(date){return dateObj(date).getUTCDay()===5;}
function isSaturday(date){return dateObj(date).getUTCDay()===6;}
function weekendStart(date){
  if(!isWeekend(date))return'';
  const day=dateObj(date).getUTCDay();
  if(state.rules.saudiWeekend)return day===5?date:prevDate(date); // Friday + Saturday
  return day===6?date:prevDate(date); // Saturday + Sunday
}
function weekendPairDates(start){return[start,nextDate(start)];}
let weekendCalendarCache={key:'',blocks:[],cap:0};
function weekendCalendar(){
  const cacheKey=state.month+'|'+(state.rules.saudiWeekend?'SA':'STD');
  if(weekendCalendarCache.key===cacheKey)return weekendCalendarCache;
  const set=new Set();
  for(const d of monthDates())if(isWeekend(d))set.add(weekendStart(d));
  const blocks=[...set].sort();
  weekendCalendarCache={key:cacheKey,blocks,cap:Math.ceil(blocks.length/2)};
  return weekendCalendarCache;
}
function weekendBlocksInMonth(){return weekendCalendar().blocks;}
function weekendCap(){return weekendCalendar().cap;}
function weekendCapApplies(person){return !!person;}
function weekendCapacityAnalysis(){
  const blocks=weekendBlocksInMonth();
  let requiredPackages=0;
  for(const start of blocks){
    const inside=weekendPairDates(start).filter(d=>d.startsWith(state.month));
    if(!inside.length)continue;
    const dayNeeds=inside.map(d=>mandatoryShifts().filter(s=>s.type==='day').reduce((n,s)=>n+requiredCount(s,d),0));
    const nightNeeds=inside.map(d=>mandatoryShifts().filter(s=>s.type==='night').reduce((n,s)=>n+requiredCount(s,d),0));
    requiredPackages+=Math.max(...dayNeeds)+nightNeeds.reduce((a,b)=>a+b,0);
  }
  const weekendShiftIds=new Set(mandatoryShifts().filter(s=>monthDates().some(d=>isWeekend(d)&&requiredCount(s,d)>0)).map(s=>s.id));
  const eligiblePeople=activeStaff().filter(p=>(p.eligible||[]).some(id=>weekendShiftIds.has(id)));
  const strictCapacity=eligiblePeople.length*weekendCap();
  return{weekends:blocks.length,requiredPackages,strictCapacity,eligibleStaff:eligiblePeople.length,deficit:Math.max(0,requiredPackages-strictCapacity)};
}
function workedWeekendStarts(person,assignments=state.assignments){
  const set=new Set();
  for(const [k,v] of Object.entries(assignments)){
    if(!v||!k.startsWith(person+'|'))continue;
    const d=k.split('|')[1];if(isWeekend(d))set.add(weekendStart(d));
  }
  return set;
}
function weekendDutyDetails(person,assignments=state.assignments){
  const details=[];
  for(const start of weekendBlocksInMonth()){
    const pair=weekendPairDates(start),inside=pair.filter(d=>d.startsWith(state.month));
    const worked=inside.map(d=>({date:d,shift:assigned(person,d,assignments)})).filter(x=>x.shift);
    if(!worked.length)continue;
    const nights=worked.filter(x=>isNight(x.shift)),days=worked.filter(x=>!isNight(x.shift));
    const boundary=inside.length<2;
    const valid=boundary||((nights.length===1&&days.length===0)||(nights.length===0&&days.length===2));
    let type='Incomplete / mixed';
    if(nights.length===1&&days.length===0)type='1 weekend on-call';
    else if(nights.length===0&&days.length===2)type='2 weekend day shifts';
    else if(boundary)type='Month-boundary weekend';
    details.push({start,inside,worked,nights,days,boundary,valid,type});
  }
  return details;
}
function assignmentCredit(shiftId){return isNight(shiftId)?2:1;}
function shiftById(id){return state.shifts.find(s=>s.id===id);}
function personById(id){return state.staff.find(p=>p.id===id);}
function currentActiveStaffIds(){
  if(!Array.isArray(state.activeStaffIds))state.activeStaffIds=state.staff.map(p=>p.id);
  state.activeStaffIds=state.activeStaffIds.filter(id=>state.staff.some(p=>p.id===id));
  return state.activeStaffIds;
}
function activeStaff(){const ids=new Set(currentActiveStaffIds());return state.staff.filter(p=>ids.has(p.id));}
function isActiveStaff(id){return currentActiveStaffIds().includes(id);}
function key(person,date){return person+'|'+date;}
function assigned(person,date,assignments=state.assignments){return assignments[key(person,date)]||'';}
function isNight(shiftId){return shiftById(shiftId)?.type==='night';}
function onApprovedLeave(person,date){return state.leaves.some(l=>l.person===person&&l.status==='approved'&&date>=l.from&&date<=l.to);}
function requestFor(person,date,type){return state.requests.filter(r=>r.person===person&&r.date===date&&(!type||r.type===type));}
function requiredCount(shift,date){if(isOverflowShift(shift))return 0;return Number(isWeekend(date)?shift.weekend:shift.weekday)||0;}
function isOverflowShift(shift){return Number(shift?.overflowPriority||0)>0;}
function overflowTarget(shift){return Math.max(1,Number(shift?.overflowTarget)||1);}
function mandatoryShifts(){return state.shifts.filter(s=>!isOverflowShift(s));}
function overflowShifts(){return state.shifts.filter(isOverflowShift).sort((a,b)=>Number(a.overflowPriority)-Number(b.overflowPriority));}
function mandatoryOpenOnDate(assignments,date){return mandatoryShifts().some(s=>countShiftDate(assignments,date,s.id)<requiredCount(s,date));}
function overflowCoveredCount(assignments){let n=0;for(const d of monthDates())for(const s of overflowShifts())n+=Math.min(overflowTarget(s),countShiftDate(assignments,d,s.id));return n;}
function countShiftDate(assignments,date,shiftId){let n=0;for(const [k,v] of Object.entries(assignments)){if(v!==shiftId||!k.endsWith('|'+date))continue;const pid=k.slice(0,k.indexOf('|'));if(isActiveStaff(pid))n++;}return n;}
function peopleOnShiftDate(assignments,date,shiftId){const out=[];for(const [k,v] of Object.entries(assignments)){if(v!==shiftId||!k.endsWith('|'+date))continue;const pid=k.slice(0,k.indexOf('|'));if(isActiveStaff(pid))out.push(pid);}return out;}

function effectiveMax(person){
  const individual=Math.max(1,Number(person?.max)||31);
  const globalCap=Math.max(1,Number(state.rules.maxAssignments)||31);
  return Math.min(individual,globalCap);
}
function maxNightCalls(){return Math.max(1,Number(state.rules.maxNightCalls)||31);}
function minimumNightGapDays(){return Math.max(3,Number(state.rules.minNightGapDays)||3);}
function validateRuleSet(rules=state.rules){
  const minBlock=Math.max(1,Number(rules?.minUnitBlock)||1),maxConsecutive=Math.max(1,Number(rules?.maxConsecutive)||1);
  if(minBlock>maxConsecutive)return{ok:false,message:`Minimum daytime continuity (${minBlock} days) cannot exceed the maximum consecutive-work limit (${maxConsecutive} days).`};
  if(Number(rules?.maxAssignments)<1)return{ok:false,message:'Maximum monthly shift credits must be at least 1.'};
  if(Number(rules?.maxNightCalls)<1)return{ok:false,message:'Maximum monthly on-calls must be at least 1.'};
  if(Number(rules?.minNightGapDays||3)<3)return{ok:false,message:'On-call spacing must be at least 3 calendar days (for example, a call on the 1st cannot be followed by another on the 2nd or 3rd).'};
  return{ok:true,message:''};
}

function countsFor(person,assignments=state.assignments){
  let total=0,raw=0,nights=0,weekendDays=0,fridays=0,saturdays=0;
  const weekendSet=new Set();
  for(const [k,v] of Object.entries(assignments)){
    if(!v||!k.startsWith(person+'|'))continue;
    raw++;
    total+=assignmentCredit(v); // Day duty = 1 credit; on-call/night duty = 2 credits.
    if(isNight(v))nights++;
    const date=k.split('|')[1];
    if(isWeekend(date)){weekendDays++;weekendSet.add(weekendStart(date));}
    if(isFriday(date))fridays++;
    if(isSaturday(date))saturdays++;
  }
  return{total,raw,nights,weekends:weekendSet.size,weekendDays,fridays,saturdays};
}

function approvedLeaveDaysInCurrentMonth(person){
  return monthDates().filter(d=>onApprovedLeave(person,d)).length;
}
function adjustedShiftTarget(base,periodDays,leaveDays){
  const b=Math.max(0,Number(base)||0),days=Math.max(1,Number(periodDays)||1),leave=Math.max(0,Math.min(days,Number(leaveDays)||0));
  return Math.max(0,Math.round(b-((b/days)*leave)));
}
function updateStaffSelectionButtons(){
  const ids=[...selectedStaffIds].filter(id=>state.staff.some(p=>p.id===id)),n=ids.length,activeSelected=ids.filter(isActiveStaff).length;
  for(const id of ['deleteSelectedStaffBtn','sheetDeleteSelectedBtn']){const b=$('#'+id);if(b){b.disabled=n===0;b.textContent=`Delete Permanently Selected (${n})`;}}
  for(const id of ['removeSelectedStaffBtn','sheetRemoveSelectedBtn']){const b=$('#'+id);if(b){b.disabled=activeSelected===0;b.textContent=`Remove Selected from Month (${activeSelected})`;}}
}
function removeSelectedStaffFromMonth(){
  const ids=[...selectedStaffIds].filter(id=>state.staff.some(p=>p.id===id)&&isActiveStaff(id));if(!ids.length)return;
  const names=ids.map(id=>personById(id)?.name||id);
  if(!confirm(`Remove ${ids.length} selected staff member${ids.length===1?'':'s'} from ${formatMonthLabel(state.month)}?

Their master staff records and all other months will be preserved. Current-month assignments and locks for them will be cleared.`))return;
  removeStaffIdsFromCurrentMonth(ids);selectedStaffIds.clear();logAction('Removed selected staff from month',`${formatMonthLabel(state.month)}: ${names.join(', ')}`);renderAll();syncCurrentPortalAfterStaffChange();
}
function deleteSelectedStaff(){
  const ids=[...selectedStaffIds].filter(id=>state.staff.some(p=>p.id===id));
  if(!ids.length)return;
  const names=ids.map(id=>personById(id)?.name||id);
  if(!confirm(`PERMANENTLY delete ${ids.length} selected staff member${ids.length===1?'':'s'} from the master list?

This destructive action removes their leave, requests, swaps, assignments, locks, and saved-month roster entries across ALL months. Use "Remove from Month" instead if they are only leaving the current rotation.`))return;
  purgeStaffIds(ids);selectedStaffIds.clear();invalidateAllPublished();logAction('Permanently deleted selected staff',names.join(', '));renderAll();syncKnownPortalsAfterPermanentStaffDelete();
}

function consecutiveAround(person,date,assignments){
  let before=0,after=0,d=prevDate(date);
  for(let i=0;i<15;i++){if(assigned(person,d,assignments)){before++;d=prevDate(d);}else break;}
  d=nextDate(date);
  for(let i=0;i<15;i++){if(assigned(person,d,assignments)){after++;d=nextDate(d);}else break;}
  return before+1+after;
}

function candidateHard(person,date,shiftId,assignments){
  if(!person.eligible.includes(shiftId))return false;
  if(onApprovedLeave(person.id,date))return false;
  if(assigned(person.id,date,assignments))return false;
  const counts=countsFor(person.id,assignments),credit=assignmentCredit(shiftId);
  if(counts.total+credit>effectiveMax(person))return false;
  if(isNight(shiftId)&&counts.nights>=maxNightCalls())return false;
  if(isNight(shiftId)){
    const gap=minimumNightGapDays();
    for(let delta=1;delta<gap;delta++){
      const before=assigned(person.id,addDays(date,-delta),assignments),after=assigned(person.id,addDays(date,delta),assignments);
      if((before&&isNight(before))||(after&&isNight(after)))return false;
    }
  }
  if(consecutiveAround(person.id,date,assignments)>Number(state.rules.maxConsecutive))return false;

  // Hard all-staff weekend rule: maximum 2 weekends in a 4-weekend month, or 3 in a
  // 5-weekend month. A weekend package must be either one weekend on-call OR both
  // weekend day shifts (Friday + Saturday when Saudi weekend mode is on).
  if(isWeekend(date)&&weekendCapApplies(person)){
    const wk=weekendStart(date),worked=workedWeekendStarts(person.id,assignments);
    if(!worked.has(wk)&&worked.size>=weekendCap())return false;
    const pair=weekendPairDates(wk),inside=pair.filter(d=>d.startsWith(state.month));
    if(inside.length===2){
      const other=inside.find(d=>d!==date),otherShift=assigned(person.id,other,assignments);
      if(isNight(shiftId)){
        // One weekend on-call is the complete weekend package; do not mix it with a
        // daytime weekend duty on the other day.
        if(otherShift)return false;
      }else{
        // A daytime weekend package requires both weekend days and cannot be mixed
        // with a weekend on-call. Leave on the paired day makes this person unsuitable.
        if(otherShift&&isNight(otherShift))return false;
        if(onApprovedLeave(person.id,other))return false;
      }
    }
  }

  if(state.rules.nightRest){
    const prev=assigned(person.id,prevDate(date),assignments);
    if(prev&&isNight(prev))return false;
    if(isNight(shiftId)){
      const nxt=assigned(person.id,nextDate(date),assignments);
      if(nxt)return false;
    }
  }
  return true;
}

function dateWindow(req){
  const {first,last}=monthBounds();
  const from=req.from&&req.from>first?req.from:first;
  const to=req.to&&req.to<last?req.to:last;
  return monthDates().filter(d=>d>=from&&d<=to);
}

function splitRuns(dates){
  const runs=[];let cur=[];
  for(const d of dates){
    if(!cur.length||d===nextDate(cur[cur.length-1]))cur.push(d);
    else{runs.push(cur);cur=[d];}
  }
  if(cur.length)runs.push(cur);
  return runs;
}

function freeRequestResult(req,assignments=state.assignments){
  const days=Math.max(1,Number(req.days)||1);
  const available=dateWindow(req).filter(d=>!assigned(req.person,d,assignments)&&!onApprovedLeave(req.person,d));
  let granted=[];
  if(req.consecutive){
    const runs=splitRuns(available).sort((a,b)=>b.length-a.length);
    const run=runs.find(r=>r.length>=days);
    if(run)granted=run.slice(0,days);
  }else granted=available.slice(0,days);
  return{met:granted.length>=days,granted,requested:days};
}

function grantedFlexDatesForPerson(person,assignments=state.assignments){
  const set=new Set();
  for(const r of state.freeRequests.filter(x=>x.person===person)){
    const res=freeRequestResult(r,assignments);
    if(res.met)res.granted.forEach(d=>set.add(d));
  }
  return set;
}

function preferenceStats(assignments=state.assignments){
  let met=0,total=0;
  const {first:monthFirst,last:monthLast}=monthBounds();
  const visibleRequests=state.requests.filter(r=>r.date.startsWith(state.month));
  for(const r of visibleRequests){
    total++;
    const v=assigned(r.person,r.date,assignments);
    if(r.type==='off'&&!v)met++;
    if(r.type==='prefer'&&v===r.shift)met++;
    if(r.type==='avoid'&&v!==r.shift)met++;
  }
  const visibleFreeRequests=state.freeRequests.filter(r=>r.to>=monthFirst&&r.from<=monthLast);
  for(const r of visibleFreeRequests){total++;if(freeRequestResult(r,assignments).met)met++;}
  return{met,total,unmet:total-met};
}

function buildFlexPlan(attempt,baseline){
  const byPerson={};
  state.freeRequests.forEach((r,idx)=>{
    const days=Math.max(1,Number(r.days)||1);
    const dates=dateWindow(r).filter(d=>!onApprovedLeave(r.person,d));
    let chosen=[];
    if(r.consecutive){
      const candidates=[];
      for(const run of splitRuns(dates)){
        for(let i=0;i<=run.length-days;i++){
          const block=run.slice(i,i+days);
          let cost=0;
          if(baseline)cost+=block.filter(d=>assigned(r.person,d,baseline)).length*12;
          cost-=block.filter(isWeekend).length*2;
          cost+=((i+idx+attempt)%7)*0.05;
          candidates.push({block,cost});
        }
      }
      candidates.sort((a,b)=>a.cost-b.cost);
      if(candidates.length){const pick=candidates[Math.min(candidates.length-1,attempt%candidates.length)];chosen=pick.block;}
    }else{
      chosen=[...dates].sort((a,b)=>{
        const ca=(baseline&&assigned(r.person,a,baseline)?12:0)-(isWeekend(a)?2:0)+((Number(a.slice(8))+attempt)%5)*0.05;
        const cb=(baseline&&assigned(r.person,b,baseline)?12:0)-(isWeekend(b)?2:0)+((Number(b.slice(8))+attempt)%5)*0.05;
        return ca-cb;
      }).slice(0,days);
    }
    if(!byPerson[r.person])byPerson[r.person]=new Set();
    chosen.forEach(d=>byPerson[r.person].add(d));
  });
  return byPerson;
}

function candidateScore(person,date,shiftId,assignments,flexPlan,baseline,rand){
  const c=countsFor(person.id,assignments),s=shiftById(shiftId);
  // Base fairness: shift credits and calls remain the main burden measures.
  let score=c.total*11+c.nights*(s?.type==='night'?9:1);
  if(isWeekend(date)){
    // Weekend burden applies to EVERYONE, including rotators. This prevents the old
    // behavior where rotators were automatically selected for nearly every weekend.
    score+=c.weekendDays*34+c.weekends*18+c.fridays*5+c.saturdays*5;
  }
  const reqs=requestFor(person.id,date);
  if(reqs.some(r=>r.type==='off'))score+=170;
  if(reqs.some(r=>r.type==='prefer'&&r.shift===shiftId))score-=55;
  if(reqs.some(r=>r.type==='avoid'&&r.shift===shiftId))score+=75;
  if(flexPlan?.[person.id]?.has(date))score+=190;
  if(isWeekend(date)&&weekendCapApplies(person)){
    const wk=weekendStart(date),worked=workedWeekendStarts(person.id,assignments);
    if(worked.has(wk))score-=45; // strongly prefer completing an already-started weekend package
    else score+=worked.size*30;  // spread weekend packages before opening another one
  }
  if(s?.type==='day'){
    const prev=assigned(person.id,prevDate(date),assignments);
    if(prev===shiftId)score-=12;
    const projectedStreak=consecutiveAround(person.id,date,assignments);
    if(projectedStreak>3)score+=(projectedStreak-3)*55;
    if(!isOverflowShift(s)){
      // Call-capable ICU residents should be preserved for nights, but NOT so strongly
      // on weekends that every weekend day is pushed onto rotators. On weekdays the
      // preservation penalty remains high; on weekends it is intentionally modest.
      if(person.eligible.includes('sKA'))score+=isWeekend(date)?0:360;
      else if(standardNightIds.some(id=>person.eligible.includes(id)))score+=isWeekend(date)?0:300;
    }
  }else if(s?.type==='night'){
    let gap=99;
    for(let i=1;i<=10;i++){
      const prev=assigned(person.id,addDays(date,-i),assignments);
      if(prev&&isNight(prev)){gap=i;break;}
    }
    if(gap<3)score+=700;
    else if(gap===3)score+=260;
    else if(gap===4)score+=110;
    else if(gap===5)score+=25;
    score+=c.nights*14;
  }
  if(baseline){
    const old=assigned(person.id,date,baseline);
    if(old===shiftId)score-=85;
    else if(old)score+=25;
  }
  score+=rand()*3;
  return score;
}

function continuityEnabled(shift){
  return shift.type==='day'&&!isOverflowShift(shift)&&shift.continuity!==false&&Math.max(Number(shift.weekday)||0,Number(shift.weekend)||0)>0&&Number(state.rules.minUnitBlock)>1;
}

function partitionRun(run,min,attempt){
  if(run.length<=min)return[run];
  const max=Math.max(min,Number(state.rules.maxConsecutive)||6);
  const memo=new Map();
  const splitWeekend=(pos,size)=>{
    const cut=pos+size;
    if(cut<=0||cut>=run.length)return false;
    const a=run[cut-1],b=run[cut];
    return isWeekend(a)&&isWeekend(b)&&weekendStart(a)===weekendStart(b);
  };
  const solve=pos=>{
    if(pos===run.length)return[];
    if(memo.has(pos))return memo.get(pos);
    const remaining=run.length-pos;
    if(remaining<min){memo.set(pos,null);return null;}
    const sizes=[];
    for(let size=min;size<=Math.min(max,remaining);size++){
      if(remaining-size>0&&remaining-size<min)continue;
      if(splitWeekend(pos,size))continue;
      sizes.push(size);
    }
    if(!sizes.length){memo.set(pos,null);return null;}
    // Rotate acceptable sizes across attempts so the generator still explores
    // different 3–6 day partitions without ever splitting Fri/Sat weekend pairs.
    const rot=(attempt+pos)%sizes.length;
    const ordered=sizes.slice(rot).concat(sizes.slice(0,rot));
    for(const size of ordered){
      const rest=solve(pos+size);
      if(rest!==null){const ans=[run.slice(pos,pos+size),...rest];memo.set(pos,ans);return ans;}
    }
    memo.set(pos,null);return null;
  };
  return solve(0)||[run];
}

function continuityBlocks(attempt){
  const min=Math.max(1,Number(state.rules.minUnitBlock)||1),blocks=[];
  for(const s of state.shifts.filter(continuityEnabled)){
    const maxNeed=Math.max(...monthDates().map(d=>requiredCount(s,d)),0);
    for(let lane=0;lane<maxNeed;lane++){
      const requiredDates=monthDates().filter(d=>requiredCount(s,d)>lane);
      for(const run of splitRuns(requiredDates))for(const dates of partitionRun(run,min,attempt))blocks.push({shift:s.id,dates,lane});
    }
  }
  return blocks;
}

function canCoverBlock(person,blockDates,shiftId,assignments){
  const temp={...assignments};
  for(const date of blockDates){
    if(assigned(person.id,date,temp))return false;
    if(!candidateHard(person,date,shiftId,temp))return false;
    temp[key(person.id,date)]=shiftId;
  }
  return true;
}

function blockScore(person,dates,shiftId,assignments,flexPlan,baseline){
  let score=0,temp={...assignments};
  const weekendBlock=dates.some(isWeekend),shift=shiftById(shiftId);
  for(const d of dates){
    let part=candidateScore(person,d,shiftId,temp,flexPlan,baseline,Math.random);
    // Continuity blocks that INCLUDE a weekend used to be assigned almost exclusively
    // to rotators because their third day was often a weekday, which triggered the
    // large "preserve ICU residents for on-call" penalty. Neutralize most of that
    // penalty for the whole weekend-containing block so residents and rotators share it.
    if(weekendBlock&&shift?.type==='day'&&!isOverflowShift(shift)&&!isWeekend(d)){
      if(person.eligible.includes('sKA'))part-=360;
      else if(standardNightIds.some(id=>person.eligible.includes(id)))part-=300;
    }
    score+=part;temp[key(person.id,d)]=shiftId;
  }
  return score;
}

function expectedIndividualSlots(assignments){
  const out=[];
  for(const date of monthDates())for(const s of state.shifts){
    if(continuityEnabled(s))continue;
    const need=requiredCount(s,date),have=countShiftDate(assignments,date,s.id);
    for(let i=have;i<need;i++)out.push({date,shift:s.id});
  }
  return out;
}

function assignContinuityBlocks(assignments,attempt,flexPlan,baseline){
  const raw=continuityBlocks(attempt);
  const groups=new Map();
  for(const block of raw){
    const gkey=block.dates.join(',');
    if(!groups.has(gkey))groups.set(gkey,[]);
    groups.get(gkey).push(block);
  }
  // Schedule the most constrained date blocks first rather than simply working from
  // the start of the month. This prevents late-month blocks from being stranded after
  // everybody has already used their monthly capacity elsewhere.
  const groupScarcity=entry=>{
    const blocks=entry[1];
    let min=Infinity,total=0;
    for(const block of blocks){
      const n=activeStaff().filter(p=>p.eligible.includes(block.shift)&&canCoverBlock(p,block.dates,block.shift,assignments)).length;
      min=Math.min(min,n);total+=n;
    }
    return{min:min===Infinity?0:min,total};
  };
  const ordered=[...groups.entries()]
    .map(entry=>({entry,scarcity:groupScarcity(entry),weekend:entry[1][0].dates.some(isWeekend)}))
    .sort((a,b)=>(b.weekend?1:0)-(a.weekend?1:0)||a.scarcity.min-b.scarcity.min||a.scarcity.total-b.scarcity.total||a.entry[1][0].dates[0].localeCompare(b.entry[1][0].dates[0]))
    .map(x=>x.entry);

  for(const [,blocks] of ordered){
    const info=blocks.map(block=>{
      const shiftId=block.shift;
      const missing=block.dates.filter(d=>countShiftDate(assignments,d,shiftId)<=block.lane);
      let candidates=[];
      if(missing.length){
        candidates=activeStaff().filter(p=>p.eligible.includes(shiftId)&&canCoverBlock(p,missing,shiftId,assignments));
        candidates.sort((a,b)=>blockScore(a,missing,shiftId,assignments,flexPlan,baseline)-blockScore(b,missing,shiftId,assignments,flexPlan,baseline));
      }
      return{block,shiftId,missing,candidates};
    });

    // Blocks with the fewest feasible residents are matched first. The augmenting-path
    // matcher prevents PRU's two lanes (and the other simultaneous units) from greedily
    // consuming the same small pool of residents.
    const order=info.map((_,i)=>i).filter(i=>info[i].missing.length).sort((a,b)=>info[a].candidates.length-info[b].candidates.length||info[a].block.lane-info[b].block.lane);
    const personToBlock=new Map(),blockToPerson=new Map();
    const tryMatch=(bi,seen)=>{
      for(const p of info[bi].candidates){
        if(seen.has(p.id))continue;
        seen.add(p.id);
        const old=personToBlock.get(p.id);
        if(old===undefined||tryMatch(old,seen)){
          personToBlock.set(p.id,bi);
          blockToPerson.set(bi,p.id);
          return true;
        }
      }
      return false;
    };
    for(const bi of order)tryMatch(bi,new Set());

    for(const bi of order){
      const pid=blockToPerson.get(bi);
      if(!pid)continue;
      for(const d of info[bi].missing)assignments[key(pid,d)]=info[bi].shiftId;
    }
  }
}

function assignOverflowCoverage(assignments,flexPlan,baseline){
  const extras=overflowShifts();
  if(!extras.length)return;
  const mandatoryAudit=auditAssignments(assignments);
  if(mandatoryAudit.open.length||mandatoryAudit.violations.length)return;
  for(const date of monthDates()){

    if(mandatoryOpenOnDate(assignments,date))continue;
    // ER/CCRT are optional overflow. Do not open an additional weekend package just
    // for overflow coverage under the strict all-staff weekend cap.
    if(isWeekend(date))continue;
    let previousCovered=true;
    for(const s of extras){
      if(!previousCovered)break;
      const target=overflowTarget(s);
      while(countShiftDate(assignments,date,s.id)<target){
        const cand=activeStaff().filter(p=>candidateHard(p,date,s.id,assignments));
        if(!cand.length)break;
        cand.sort((p,q)=>candidateScore(p,date,s.id,assignments,flexPlan,baseline,Math.random)-candidateScore(q,date,s.id,assignments,flexPlan,baseline,Math.random));
        assignments[key(cand[0].id,date)]=s.id;
      }
      previousCovered=countShiftDate(assignments,date,s.id)>=target;
    }
  }
}

function assignmentRun(personId,date,assignments){
  const shiftId=assigned(personId,date,assignments);if(!shiftId)return[];
  const out=[date];let d=prevDate(date);
  while(assigned(personId,d,assignments)===shiftId){out.unshift(d);d=prevDate(d);}
  d=nextDate(date);while(assigned(personId,d,assignments)===shiftId){out.push(d);d=nextDate(d);}
  return out;
}

function repairNightCoverage(assignments,flexPlan,baseline){
  let changed=true,passes=0;
  while(changed&&passes++<10){
    changed=false;
    const audit=auditAssignments(assignments);
    const nightOpen=audit.open.filter(x=>isNight(x.shift));
    if(!nightOpen.length)break;
    for(const slot of nightOpen){
      const direct=activeStaff().filter(p=>candidateHard(p,slot.date,slot.shift,assignments));
      if(direct.length){
        direct.sort((a,b)=>candidateScore(a,slot.date,slot.shift,assignments,flexPlan,baseline,Math.random)-candidateScore(b,slot.date,slot.shift,assignments,flexPlan,baseline,Math.random));
        assignments[key(direct[0].id,slot.date)]=slot.shift;changed=true;continue;
      }

      // Repair capacity/rest conflicts by moving one complete daytime continuity run
      // away from an on-call-capable resident. This can free the post-call day, free
      // 1–3 shift credits (night duty costs 2), or clear the same weekend package.
      const people=activeStaff().filter(p=>p.eligible.includes(slot.shift)&&!onApprovedLeave(p.id,slot.date)&&!assigned(p.id,slot.date,assignments)&&countsFor(p.id,assignments).nights<maxNightCalls());
      let repaired=false;
      for(const p of people){
        const prev=assigned(p.id,prevDate(slot.date),assignments);if(state.rules.nightRest&&prev&&isNight(prev))continue;
        const runMap=new Map();
        for(const d of monthDates()){
          const sh=assigned(p.id,d,assignments),info=shiftById(sh);
          if(!sh||!info||info.type!=='day'||!continuityEnabled(info))continue;
          const run=assignmentRun(p.id,d,assignments).filter(x=>x.startsWith(state.month));
          if(run.length<Math.max(1,Number(state.rules.minUnitBlock)||1))continue;
          runMap.set(sh+'|'+run.join(','),{shift:sh,run});
        }
        const targetWeekend=isWeekend(slot.date)?weekendStart(slot.date):'';
        const post=nextDate(slot.date);
        const runs=[...runMap.values()].sort((a,b)=>{
          const aPost=a.run.includes(post)?0:1,bPost=b.run.includes(post)?0:1;if(aPost!==bPost)return aPost-bPost;
          const aW=targetWeekend&&a.run.some(d=>isWeekend(d)&&weekendStart(d)===targetWeekend)?0:1;
          const bW=targetWeekend&&b.run.some(d=>isWeekend(d)&&weekendStart(d)===targetWeekend)?0:1;if(aW!==bW)return aW-bW;
          return a.run.length-b.run.length;
        });
        for(const item of runs){
          const temp={...assignments};for(const d of item.run)delete temp[key(p.id,d)];
          const replacements=activeStaff().filter(q=>q.id!==p.id&&q.eligible.includes(item.shift)&&canCoverBlock(q,item.run,item.shift,temp));
          replacements.sort((a,b)=>blockScore(a,item.run,item.shift,temp,flexPlan,baseline)-blockScore(b,item.run,item.shift,temp,flexPlan,baseline));
          for(const q of replacements.slice(0,4)){
            const temp2={...temp};for(const d of item.run)temp2[key(q.id,d)]=item.shift;
            if(!candidateHard(p,slot.date,slot.shift,temp2))continue;
            temp2[key(p.id,slot.date)]=slot.shift;
            const after=auditAssignments(temp2);if(after.violations.length)continue;
            Object.keys(assignments).forEach(k=>delete assignments[k]);Object.assign(assignments,temp2);
            changed=true;repaired=true;break;
          }
          if(repaired)break;
        }
        if(repaired)break;
      }
    }
  }
}

function changeCount(oldA,newA){
  if(!oldA)return 0;
  let n=0;
  for(const p of activeStaff())for(const d of monthDates())if((oldA[key(p.id,d)]||'')!==(newA[key(p.id,d)]||''))n++;
  return n;
}

let generationBusy=false;
function setGenerationBusy(busy,label='Optimizing roster…'){
  generationBusy=busy;
  for(const id of ['generateBtn','reoptimizeBtn','autoBalanceBtn','fixDayBtn']){const el=$('#'+id);if(el)el.disabled=busy;}
  const g=$('#generateBtn');if(g)g.textContent=busy?label:'Auto-Generate';
  const r=$('#reoptimizeBtn');if(r)r.textContent=busy?'Please wait…':'Re-optimize / Keep Current';
  if(busy){const banner=$('#auditBanner');if(banner){banner.classList.remove('hidden','ok','bad');banner.classList.add('warn');banner.textContent='Building the roster with the exact server solver (browser fallback available). If the strict weekend cap makes full coverage impossible, only the minimum weekend on-call slots will be left open for manual assignment. Your current roster is unchanged until the result is audited.';}}
}
function lockedMandatoryAssignments(){
  const out={},optional=[];
  for(const [k,v] of Object.entries(state.assignments)){if(!state.locks[k]||!v)continue;const sh=shiftById(v);if(sh&&isOverflowShift(sh))optional.push({key:k,shift:v});else out[k]=v;}
  return{out,optional};
}
function buildSolverPayload(preserve=false){
  const {out:locked,optional}=lockedMandatoryAssignments();
  if(optional.length)throw new Error('Unlock optional ER/CCRT cells before auto-generation. Optional coverage is added only after every mandatory slot is solved.');
  const {first,last}=monthBounds(),activeIds=new Set(activeStaff().map(p=>p.id));
  return{
    month:state.month,
    staff:activeStaff().map(p=>({id:p.id,level:p.level,max:p.max,eligible:[...(p.eligible||[])]})),
    shifts:state.shifts.map(s=>({id:s.id,type:s.type,weekday:Number(s.weekday)||0,weekend:Number(s.weekend)||0,continuity:s.continuity!==false,overflowPriority:Number(s.overflowPriority)||0,overflowTarget:Number(s.overflowTarget)||0})),
    leaves:state.leaves.filter(l=>activeIds.has(l.person)&&l.status==='approved'&&l.to>=first&&l.from<=last).map(l=>({person:l.person,from:l.from,to:l.to,status:l.status})),
    requests:state.requests.filter(r=>activeIds.has(r.person)&&r.date.startsWith(state.month)).map(r=>({person:r.person,date:r.date,type:r.type,shift:r.shift||''})),
    freeRequests:state.freeRequests.filter(r=>activeIds.has(r.person)&&r.to>=first&&r.from<=last).map(r=>({person:r.person,days:Number(r.days)||1,from:r.from,to:r.to,consecutive:!!r.consecutive,hard:!!r.hard})),
    rules:{...state.rules},
    lockedAssignments:locked,
    baselineAssignments:preserve?{...state.assignments}:null,
    preserve:!!preserve
  };
}
function callBrowserRosterSolver(payload){
  return new Promise((resolve,reject)=>{
    if(typeof Worker==='undefined')return reject(new Error('Browser worker is unavailable.'));
    let finished=false;const worker=new Worker('roster-solver-worker.js?v=10.8.2');
    const done=(err,data)=>{if(finished)return;finished=true;clearTimeout(timer);worker.terminate();err?reject(err):resolve(data);};
    const timer=setTimeout(()=>done(new Error('Fast browser scheduler timed out after 12 seconds. The roster was not changed.')),12000);
    worker.onmessage=e=>{const env=e.data||{};const data=env.data||env;if(env.__solverEnvelope&&Number(env.status)>=400)return done(new Error(data?.message||data?.error||`Fast browser scheduler failed (${env.status}).`));if(!data?.ok)return done(new Error(data?.message||data?.error||'Fast browser scheduler could not find a roster under the current hard rules.'));done(null,data);};
    worker.onerror=e=>done(new Error(e?.message||'Fast browser scheduler worker failed.'));
    worker.postMessage(payload);
  });
}
async function callServerRosterSolver(payload){
  const response=await fetch(SUPABASE_SOLVER_URL,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':`Bearer ${SUPABASE_ANON_KEY}`},body:JSON.stringify(payload)});
  const text=await response.text();let data={};try{data=text?JSON.parse(text):{};}catch{data={error:text};}
  if(!response.ok||!data?.ok)throw new Error(data?.message||data?.error||`Server scheduler failed (${response.status}).`);
  return {...data,plannedOpen:Array.isArray(data.plannedOpen)?data.plannedOpen:(Array.isArray(data.intentionalOpen)?data.intentionalOpen:[])};
}
async function callHeuristicRosterSolver(preserve=false){
  const {out:locked}=lockedMandatoryAssignments(),baseline=preserve?{...state.assignments}:null;
  let best=null,bestScore=Infinity;const started=Date.now();
  for(let attempt=0;attempt<18;attempt++){
    const assignments={...locked},flexPlan=buildFlexPlan(attempt,baseline);
    const slots=[];
    for(const date of monthDates())for(const sh of mandatoryShifts().filter(x=>x.type==='night')){
      const need=Math.max(0,requiredCount(sh,date)-countShiftDate(assignments,date,sh.id));
      for(let i=0;i<need;i++)slots.push({date,shift:sh.id});
    }
    let failed=false;
    while(slots.length){
      let chosen=-1,chosenCandidates=null;
      for(let i=0;i<slots.length;i++){
        const slot=slots[i],cands=activeStaff().filter(p=>candidateHard(p,slot.date,slot.shift,assignments));
        if(!cands.length){chosen=i;chosenCandidates=[];break;}
        if(chosen<0||cands.length<chosenCandidates.length){chosen=i;chosenCandidates=cands;if(cands.length===1)break;}
      }
      if(chosen<0||!chosenCandidates?.length){failed=true;break;}
      const slot=slots[chosen];
      chosenCandidates.sort((a,b)=>candidateScore(a,slot.date,slot.shift,assignments,flexPlan,baseline,Math.random)-candidateScore(b,slot.date,slot.shift,assignments,flexPlan,baseline,Math.random));
      assignments[key(chosenCandidates[0].id,slot.date)]=slot.shift;slots.splice(chosen,1);
    }
    if(!failed){
      assignContinuityBlocks(assignments,attempt,flexPlan,baseline);
      repairNightCoverage(assignments,flexPlan,baseline);
      const audit=auditAssignments(assignments),score=audit.open.length*1000+audit.violations.length*500+preferenceStats(assignments).unmet*2;
      if(score<bestScore){bestScore=score;best={...assignments};}
      if(!audit.open.length&&!audit.violations.length)return{ok:true,assignments,elapsedMs:Date.now()-started,heuristic:true};
    }
    if(attempt%3===2)await new Promise(r=>setTimeout(r,0));
  }
  const a=best?auditAssignments(best):null;
  throw new Error(a?`Browser fallback could not complete the roster (${a.open.length} open slot(s), ${a.violations.length} hard violation(s)).`:'Browser fallback could not construct a feasible roster.');
}
async function callRosterSolver(preserve=false){
  const ruleCheck=validateRuleSet();if(!ruleCheck.ok)throw new Error(ruleCheck.message);
  const payload=buildSolverPayload(preserve);
  // v10.8.2: use the deployed exact solver first. The browser worker remains a bounded fallback
  // for transient network/server failures; every candidate still has to pass the independent local audit.
  try{return await callServerRosterSolver(payload);}catch(serverError){
    try{return await callBrowserRosterSolver(payload);}catch(browserError){
      throw new Error(`Exact server solver failed: ${serverError.message} Browser fallback also failed: ${browserError.message}`);
    }
  }
}
async function generate(preserve=false,options={}){
  if(generationBusy)return{ok:false,error:'Scheduler is already running.'};
  if(!activeStaff().length||!state.shifts.length){if(!options.silent)alert('Add active staff members and coverage rules first.');return{ok:false,error:'No staff or shifts'};}
  const wc=weekendCapacityAnalysis();
  const before={...state.assignments};
  setGenerationBusy(true,preserve?'Re-optimizing…':'Auto-generating…');
  try{
    const solved=await callRosterSolver(preserve);
    const candidate={...(solved.assignments||{})};
    const plannedOpen=Array.isArray(solved.plannedOpen)?solved.plannedOpen.map(x=>({date:String(x.date||''),shift:String(x.shift||'')})).filter(x=>x.date&&x.shift):[];
    const expectedCounts=new Map();for(const x of plannedOpen){const k=x.date+'|'+x.shift;expectedCounts.set(k,(expectedCounts.get(k)||0)+1);}
    const mandatoryAudit=auditAssignments(candidate);
    const unexpectedOpen=[];const intentionalOpen=[];const seen=new Map();
    for(const x of mandatoryAudit.open){const k=x.date+'|'+x.shift,n=(seen.get(k)||0)+1;seen.set(k,n);if(n<=(expectedCounts.get(k)||0))intentionalOpen.push(x);else unexpectedOpen.push(x);}
    if(unexpectedOpen.length||mandatoryAudit.violations.length)throw new Error(`The scheduler did not pass the local safety audit (${unexpectedOpen.length} unexpected open slot(s), ${mandatoryAudit.violations.length} hard violation(s)). The current roster was kept unchanged.`);
    // Optional ER/CCRT is added only when every mandatory slot is filled. A roster
    // intentionally left with weekend on-call gaps remains a Draft for manual completion.
    if(!mandatoryAudit.open.length)assignOverflowCoverage(candidate,buildFlexPlan(0,preserve?before:null),preserve?before:null);
    const finalAudit=auditAssignments(candidate);
    const finalSeen=new Map(),finalUnexpected=[];const finalIntentional=[];
    for(const x of finalAudit.open){const k=x.date+'|'+x.shift,n=(finalSeen.get(k)||0)+1;finalSeen.set(k,n);if(n<=(expectedCounts.get(k)||0))finalIntentional.push(x);else finalUnexpected.push(x);}
    if(finalUnexpected.length||finalAudit.violations.length)throw new Error(`The candidate roster failed final validation (${finalUnexpected.length} unexpected open slot(s), ${finalAudit.violations.length} hard violation(s)).`);
    const changes=changeCount(before,candidate),partial=finalIntentional.length>0;
    if(options.dryRun)return{ok:true,assignments:candidate,audit:finalAudit,changes,elapsedMs:solved.elapsedMs||0,partial,plannedOpen:finalIntentional};
    state.assignments=candidate;state.published=false;
    const openText=partial?` ${finalIntentional.length} weekend on-call slot${finalIntentional.length===1?' was':'s were'} intentionally left OPEN for manual assignment so Auto-Generate does not give anyone an extra weekend.`:' Mandatory coverage is complete with 0 hard-rule violations.';
    logAction(preserve?'Re-optimized roster':'Generated roster',`${changes} assignment cell${changes===1?'':'s'} changed.${openText}${solved.elapsedMs?` · solver ${Math.round(solved.elapsedMs/100)/10}s`:''}`);
    if(!options.silent){
      renderAll();showAudit(finalAudit);
      if(partial){const b=$('#auditBanner');if(b){b.classList.remove('hidden','ok','bad');b.classList.add('warn');const examples=finalIntentional.slice(0,6).map(x=>`${x.date} ${shiftById(x.shift)?.code||x.shift}`).join(', ');b.textContent=`Roster generated safely under the weekend cap. ${finalIntentional.length} weekend on-call slot${finalIntentional.length===1?' is':'s are'} intentionally OPEN for you to assign manually${examples?`: ${examples}`:''}. Publish remains blocked until you complete them.`;}}
    }
    return{ok:true,assignments:candidate,audit:finalAudit,changes,elapsedMs:solved.elapsedMs||0,partial,plannedOpen:finalIntentional};
  }catch(e){
    if(!options.silent){renderAll();const b=$('#auditBanner');if(b){b.classList.remove('hidden','ok','warn');b.classList.add('bad');b.textContent=`Roster unchanged: ${e.message}`;}alert(`Roster was not changed.\n\n${e.message}`);}
    return{ok:false,error:e.message||String(e)};
  }finally{setGenerationBusy(false);if(!options.silent)updateStats();}
}

function continuityAudit(assignments){
  const hard=[],warnings=[],min=Math.max(1,Number(state.rules.minUnitBlock)||1),dates=monthDates(),first=dates[0],last=dates[dates.length-1];
  if(min<=1)return{hard,warnings};
  for(const s of state.shifts.filter(continuityEnabled)){
    for(const p of activeStaff()){
      const work=dates.filter(d=>assigned(p.id,d,assignments)===s.id);
      for(const run of splitRuns(work)){
        if(run.length>=min)continue;
        const msg=`${p.name} covers ${s.code} for only ${run.length} consecutive day${run.length===1?'':'s'} (${run[0]}${run.length>1?' to '+run[run.length-1]:''}); minimum is ${min}.`;
        if(run[0]===first||run[run.length-1]===last)warnings.push('Month-boundary review: '+msg);
        else hard.push(msg);
      }
    }
  }
  return{hard,warnings};
}

function auditAssignments(assignments){
  const open=[];let totalSlots=0;
  for(const date of monthDates())for(const s of state.shifts){
    const need=requiredCount(s,date),have=countShiftDate(assignments,date,s.id);totalSlots+=need;
    if(have<need)for(let i=have;i<need;i++)open.push({date,shift:s.id});
  }

  const violations=[],warnings=[];
  const activeIds=new Set(activeStaff().map(p=>p.id)),knownStaff=new Set(state.staff.map(p=>p.id)),knownShifts=new Set(state.shifts.map(sh=>sh.id));
  for(const [k,v] of Object.entries(assignments||{})){
    if(!v)continue;const sep=k.indexOf('|');if(sep<1)continue;const pid=k.slice(0,sep),d=k.slice(sep+1);if(!d.startsWith(state.month))continue;
    if(!knownStaff.has(pid))violations.push(`Unknown staff assignment reference ${pid} on ${d}.`);
    else if(!activeIds.has(pid))violations.push(`${personById(pid)?.name||pid} is inactive for ${state.month} but still has an assignment on ${d}. Inactive staff cannot satisfy coverage.`);
    if(!knownShifts.has(v))violations.push(`Unknown shift assignment reference ${v} for ${pid} on ${d}.`);
  }
  for(const p of activeStaff()){
    let streak=0;
    for(const d of monthDates()){
      const v=assigned(p.id,d,assignments);
      if(!v){streak=0;continue;}
      streak++;
      if(onApprovedLeave(p.id,d))violations.push(`${p.name} is assigned during approved leave on ${d}.`);
      if(!p.eligible.includes(v))violations.push(`${p.name} is not eligible for ${shiftById(v)?.code||v} on ${d}.`);
      if(state.rules.nightRest){
        const prev=assigned(p.id,prevDate(d),assignments);
        if(prev&&isNight(prev))violations.push(`${p.name} is assigned ${shiftById(v)?.code||v} on ${d}, but ${d} is the protected post-call day after night duty on ${prevDate(d)}.`);
      }
      if(streak>Number(state.rules.maxConsecutive))violations.push(`${p.name} exceeds the ${state.rules.maxConsecutive}-day consecutive-work limit on ${d}.`);
    }
    const nightDates=monthDates().filter(d=>{const sid=assigned(p.id,d,assignments);return sid&&isNight(sid);});
    for(let i=1;i<nightDates.length;i++){const delta=Math.round((dateObj(nightDates[i])-dateObj(nightDates[i-1]))/86400000);if(delta<minimumNightGapDays())violations.push(`${p.name} has on-call spacing of only ${delta} calendar day${delta===1?'':'s'} (${nightDates[i-1]} → ${nightDates[i]}). Minimum spacing is ${minimumNightGapDays()} calendar days.`);}
    const c=countsFor(p.id,assignments);
    const cap=effectiveMax(p);
    if(c.total>cap)violations.push(`${p.name} has ${c.total} shift credits and exceeds the effective monthly maximum of ${cap} (day = 1, on-call = 2).`);
    if(c.nights>maxNightCalls())violations.push(`${p.name} has ${c.nights} on-calls and exceeds the monthly on-call maximum of ${maxNightCalls()}.`);
    if(weekendCapApplies(p)){
      const wcap=weekendCap(),details=weekendDutyDetails(p.id,assignments);
      if(c.weekends>wcap)violations.push(`${p.name} covers ${c.weekends} weekends; the hard maximum for every staff member in this ${weekendBlocksInMonth().length}-weekend month is ${wcap}.`);
      for(const w of details){
        if(w.boundary){warnings.push(`Month-boundary weekend review for ${p.name} around ${w.start}; only one weekend date is inside this roster month.`);continue;}
        if(!w.valid)violations.push(`${p.name} has an incomplete/mixed weekend package starting ${w.start}. Weekend coverage must be either one on-call OR both weekend day shifts.`);
      }
    }
  }

  const cont=continuityAudit(assignments);violations.push(...cont.hard);warnings.push(...cont.warnings);

  const {first:monthFirst,last:monthLast}=monthBounds();
  for(const r of state.requests.filter(r=>r.date.startsWith(state.month))){
    const p=personById(r.person),v=assigned(r.person,r.date,assignments),code=shiftById(r.shift)?.code||'';
    if(r.type==='off'&&v)warnings.push(`${p?.name||'Staff'} requested ${r.date} free but is assigned ${shiftById(v)?.code||v}.`);
    if(r.type==='prefer'&&v!==r.shift)warnings.push(`${p?.name||'Staff'} preferred ${code} on ${r.date}; request not met.`);
    if(r.type==='avoid'&&v===r.shift)warnings.push(`${p?.name||'Staff'} preferred to avoid ${code} on ${r.date}; request not met.`);
  }
  for(const r of state.freeRequests.filter(r=>r.to>=monthFirst&&r.from<=monthLast)){if(!freeRequestResult(r,assignments).met)warnings.push(`${personById(r.person)?.name||'Staff'} did not receive the requested ${r.days}${r.consecutive?' consecutive':''} flexible free day${Number(r.days)===1?'':'s'}.`);}

  const wc=weekendCapacityAnalysis();
  if(wc.deficit>0){
    const extraStaff=Math.ceil(wc.deficit/Math.max(1,weekendCap()));
    warnings.push(`Weekend staffing capacity is short by ${wc.deficit} package${wc.deficit===1?'':'s'} under the hard all-staff weekend limit (${wc.requiredPackages} required vs ${wc.strictCapacity} automatic capacity). Auto-Generate will leave the minimum ${wc.deficit} weekend on-call slot${wc.deficit===1?'':'s'} OPEN for manual assignment instead of automatically giving anyone an extra weekend.`);
  }
  const fm=fairnessMetrics(assignments);
  if(!fm.ok)warnings.push(`Fairness review: group gaps are shift credits ${fm.total}, calls ${fm.nights}, Fridays ${fm.fridays}, Saturdays ${fm.saturdays}, weekends ${fm.weekends}; target is ${fm.limit} or less.`);
  return{open,violations,warnings,totalSlots,continuityViolations:cont.hard,continuityWarnings:cont.warnings};
}

function auditSchedule(show=true){const a=auditAssignments(state.assignments);if(show)showAudit(a);return a;}
function showAudit(a){
  const b=$('#auditBanner');b.classList.remove('hidden','ok','warn','bad');
  if(!a.open.length&&!a.violations.length&&!a.warnings.length){b.classList.add('ok');b.textContent='✓ Fully covered. All hard rules, continuity rules, and current requests are satisfied.';}
  else if(!a.open.length&&!a.violations.length){b.classList.add('warn');b.textContent=`Coverage and hard rules are safe. ${a.warnings.length} preference/fairness warning${a.warnings.length===1?' remains':'s remain'}. Review Coverage & Safety for details.`;}
  else{
    b.classList.add('bad');
    const examples=a.open.slice(0,3).map(x=>`${x.date} ${shiftById(x.shift)?.code||''}`).join(', ');
    b.textContent=`Publish blocked: ${a.open.length} open slot${a.open.length===1?'':'s'} and ${a.violations.length} hard-rule violation${a.violations.length===1?'':'s'}. ${examples?`Open examples: ${examples}.`:''}`;
  }
  updateStats();renderSafety();
}

function coverageReason(date,shiftId){
  const eligible=activeStaff().filter(p=>p.eligible.includes(shiftId));
  if(!eligible.length)return'No staff member is eligible for this unit/shift.';
  const leave=eligible.filter(p=>onApprovedLeave(p.id,date)).length;
  const assignedElsewhere=eligible.filter(p=>assigned(p.id,date)).length;
  const atMax=eligible.filter(p=>countsFor(p.id).total+assignmentCredit(shiftId)>effectiveMax(p)).length;
  const atCallMax=isNight(shiftId)?eligible.filter(p=>countsFor(p.id).nights>=maxNightCalls()).length:0;
  const rest=eligible.filter(p=>{if(!state.rules.nightRest)return false;const prev=assigned(p.id,prevDate(date));const nxt=assigned(p.id,nextDate(date));return (prev&&isNight(prev))||(isNight(shiftId)&&!!nxt);}).length;
  const parts=[];
  if(leave)parts.push(`${leave} on approved leave`);
  if(assignedElsewhere)parts.push(`${assignedElsewhere} already assigned that day`);
  if(rest)parts.push(`${rest} blocked by protected post-call day rule`);
  if(atMax)parts.push(`${atMax} at monthly shift-credit maximum`);
  if(atCallMax)parts.push(`${atCallMax} at monthly on-call maximum`);
  if(continuityEnabled(shiftById(shiftId)))parts.push('3-day unit-continuity/availability may constrain this slot');
  return parts.length?parts.join('; '):'No feasible candidate under the current combined rules.';
}


let remoteRequests=[];
let portalSyncTimer=null;

function workloadInfo(person,assignments=state.assignments){
  const c=countsFor(person.id,assignments),max=effectiveMax(person),creditRatio=max?c.total/max:0,callMax=maxNightCalls(),callRatio=callMax?c.nights/callMax:0;
  const wkApplies=weekendCapApplies(person),wkMax=wkApplies?weekendCap():null,wkRatio=wkApplies&&wkMax?c.weekends/wkMax:0;
  const worst=Math.max(creditRatio,callRatio,wkRatio);
  let cls='green';
  const over=c.total>max||c.nights>callMax||(wkApplies&&c.weekends>wkMax);
  const at=c.total===max||c.nights===callMax||(wkApplies&&c.weekends===wkMax);
  if(over)cls='critical';else if(at)cls='red';else if(worst>=0.82||c.total>=Math.max(0,max-2))cls='amber';
  const pieces=[`${c.total}/${max} credits`,`${c.nights}/${callMax} calls`];if(wkApplies)pieces.push(`${c.weekends}/${wkMax} weekends`);
  return{...c,max,ratio:worst,cls,label:pieces.join(' · '),callMax,wkMax};
}

function renderNewMonthWizard(){
  const box=$('#wizardStaffList');if(!box)return;
  const target=$('#wizardMonth')?.value||monthValueOffset(state.month,1);
  const snap=state.monthStore?.[target];
  const selected=new Set(Array.isArray(snap?.activeStaffIds)?snap.activeStaffIds:activeStaff().map(p=>p.id));
  box.innerHTML=state.staff.map(p=>`<label class="wizard-person"><input type="checkbox" value="${p.id}" ${selected.has(p.id)?'checked':''}><span><b>${esc(p.name)}</b><small>${esc(p.level)} · ${esc(p.group||'')}</small></span></label>`).join('');
}
function openNewMonthWizard(){
  const w=$('#newMonthWizard');if(!w)return;
  $('#wizardMonth').value=monthValueOffset(state.month,1);w.classList.remove('hidden');renderNewMonthWizard();w.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function createMonthFromWizard(){
  const target=$('#wizardMonth')?.value;if(!target)return alert('Choose a month.');
  const ids=$$('#wizardStaffList input:checked').map(x=>x.value).filter(id=>state.staff.some(p=>p.id===id));
  if(!ids.length)return alert('Select at least one active staff member for the new month.');
  if(state.monthStore?.[target]&&(Object.keys(state.monthStore[target].assignments||{}).length||state.monthStore[target].published)){
    if(!confirm(`${formatMonthLabel(target)} already has roster data. Replace that month's roster with a new blank draft?`))return;
  }
  storeCurrentMonth();
  state.monthStore[target]={assignments:{},locks:{},swaps:[],published:false,activeStaffIds:[...ids],remotePortal:null};
  const previous=state.month;state.month=target;loadMonthSnapshot(target);state.published=false;
  logAction('Created new month',`${formatMonthLabel(target)} created from master staff/rules with ${ids.length} active staff; assignments start blank.`);
  $('#newMonthWizard').classList.add('hidden');
  const toolbarPicker=$('#monthPicker');if(toolbarPicker)toolbarPicker.value=target;
  renderAll();
}


function balanceObjective(assignments){
  let score=0;
  const groups=[...new Set(activeStaff().map(p=>p.group))];
  for(const g of groups){
    const members=activeStaff().filter(p=>p.group===g);if(members.length<2)continue;
    const vals=members.map(p=>countsFor(p.id,assignments));
    for(const [field,weight] of [['total',1],['nights',5],['weekends',4],['fridays',2],['saturdays',2]]){
      const arr=vals.map(v=>v[field]);const mean=arr.reduce((a,b)=>a+b,0)/arr.length;
      score+=arr.reduce((n,v)=>n+Math.pow(v-mean,2)*weight,0);
    }
  }
  return score;
}
function moveUnitForBalance(from,to,date,shiftId,assignments){
  const info=shiftById(shiftId);if(!info)return null;
  let dates=[date];
  if(continuityEnabled(info))dates=assignmentRun(from.id,date,assignments).filter(d=>d.startsWith(state.month));
  if(!dates.length||dates.some(d=>state.locks[key(from.id,d)]))return null;
  const temp={...assignments};for(const d of dates)delete temp[key(from.id,d)];
  if(dates.length>1){if(!canCoverBlock(to,dates,shiftId,temp))return null;for(const d of dates)temp[key(to.id,d)]=shiftId;}
  else{if(!candidateHard(to,date,shiftId,temp))return null;temp[key(to.id,date)]=shiftId;}
  return temp;
}
function autoBalanceUnlocked(){
  if(!Object.keys(state.assignments).length)return alert('Generate or enter a roster first.');
  const gate=auditAssignments(state.assignments);if(gate.open.length||gate.violations.length)return alert('Auto-Balance is disabled until mandatory coverage is complete and all hard-rule violations are fixed. Use Auto-Generate or Fix This Day first.');
  let current={...state.assignments},moves=0;
  const originalAudit=gate;let currentObjective=balanceObjective(current),currentPref=preferenceStats(current).unmet;
  // Deliberately bounded: this is an interactive repair tool, not a full solver.
  // It searches the most overloaded and underloaded people first and stops after a
  // small number of safe improvements so the browser remains responsive.
  for(let pass=0;pass<12;pass++){
    let best=null,bestObj=currentObjective,bestPref=currentPref;
    const groups=[...new Set(activeStaff().map(p=>p.group))];
    for(const g of groups){
      const sorted=activeStaff().filter(p=>p.group===g).sort((a,b)=>countsFor(b.id,current).total-countsFor(a.id,current).total);
      const overloaded=sorted.slice(0,2),underloaded=[...sorted].reverse().slice(0,3);
      for(const from of overloaded){
        const assignedDates=monthDates().filter(d=>assigned(from.id,d,current)&&!state.locks[key(from.id,d)]).slice(0,18);
        for(const d of assignedDates){
          const sh=assigned(from.id,d,current);if(!sh)continue;
          for(const to of underloaded){
            if(to.id===from.id||countsFor(to.id,current).total>=countsFor(from.id,current).total)continue;
            const proposal=moveUnitForBalance(from,to,d,sh,current);if(!proposal)continue;
            const au=auditAssignments(proposal);if(au.open.length>originalAudit.open.length||au.violations.length>originalAudit.violations.length)continue;
            const pref=preferenceStats(proposal).unmet;if(pref>currentPref)continue;
            const obj=balanceObjective(proposal);
            if(obj+0.01<bestObj){best=proposal;bestObj=obj;bestPref=pref;}
          }
        }
      }
    }
    if(!best)break;current=best;currentObjective=bestObj;currentPref=bestPref;moves++;if(moves>=8)break;
  }
  if(!moves)return alert('No safe fairness improvement was found without changing locked assignments, coverage, or hard rules.');
  state.assignments=current;state.published=false;logAction('Auto-balanced unlocked roster',`${moves} safe workload move${moves===1?'':'s'} applied without changing daily coverage or locked cells.`);renderAll();showAudit(auditSchedule(false));
}
function assignmentDiff(oldA,newA){
  const rows=[];
  for(const p of activeStaff())for(const d of monthDates()){
    const a=oldA[key(p.id,d)]||'',b=newA[key(p.id,d)]||'';if(a===b)continue;
    rows.push(`${d.slice(8)} ${p.name}: ${shiftById(a)?.code||'OFF'} → ${shiftById(b)?.code||'OFF'}`);
  }
  return rows;
}
function cascadeFixDaySlot(assignments,date,slot){
  const target=shiftById(slot.shift);if(!target)return null;
  const candidates=activeStaff().filter(p=>p.eligible.includes(slot.shift)&&!onApprovedLeave(p.id,date));
  for(const p of candidates){
    const currentShift=assigned(p.id,date,assignments);
    if(!currentShift){if(candidateHard(p,date,slot.shift,assignments)){const t={...assignments};t[key(p.id,date)]=slot.shift;return t;}continue;}
    if(state.locks[key(p.id,date)]||currentShift===slot.shift)continue;
    const oldInfo=shiftById(currentShift);let run=[date];
    if(oldInfo&&continuityEnabled(oldInfo))run=assignmentRun(p.id,date,assignments).filter(d=>d.startsWith(state.month));
    if(run.some(d=>state.locks[key(p.id,d)]))continue;
    const base={...assignments};for(const d of run)delete base[key(p.id,d)];
    const replacements=activeStaff().filter(q=>q.id!==p.id&&q.eligible.includes(currentShift));
    for(const q of replacements){
      const t={...base};
      let ok=true;
      if(run.length>1){if(!canCoverBlock(q,run,currentShift,t))ok=false;else for(const d of run)t[key(q.id,d)]=currentShift;}
      else{if(!candidateHard(q,date,currentShift,t))ok=false;else t[key(q.id,date)]=currentShift;}
      if(!ok||!candidateHard(p,date,slot.shift,t))continue;
      t[key(p.id,date)]=slot.shift;
      const au=auditAssignments(t);if(au.violations.length>auditAssignments(assignments).violations.length)continue;
      return t;
    }
  }
  return null;
}
function fixThisDay(date){
  if(!date||!date.startsWith(state.month))return alert('Choose a date in the displayed month.');
  const baseline={...state.assignments},baseAudit=auditAssignments(baseline),before=baseAudit.open.filter(x=>x.date===date);
  if(!before.length)return alert(`${date} is already fully covered.`);
  let temp={...baseline};
  const flexPlan=buildFlexPlan(0,baseline);
  let passes=0;
  while(passes++<5){
    let missing=auditAssignments(temp).open.filter(x=>x.date===date);if(!missing.length)break;
    let changed=false;
    missing.sort((a,b)=>(isNight(b.shift)?1:0)-(isNight(a.shift)?1:0));
    for(const slot of missing){
      const cand=activeStaff().filter(p=>candidateHard(p,date,slot.shift,temp)).sort((a,b)=>candidateScore(a,date,slot.shift,temp,flexPlan,baseline,Math.random)-candidateScore(b,date,slot.shift,temp,flexPlan,baseline,Math.random));
      if(cand.length){temp[key(cand[0].id,date)]=slot.shift;changed=true;continue;}
      const cascaded=cascadeFixDaySlot(temp,date,slot);if(cascaded){temp=cascaded;changed=true;}
    }
    if(auditAssignments(temp).open.some(x=>x.date===date&&isNight(x.shift))){const copy={...temp};repairNightCoverage(copy,flexPlan,baseline);if(auditAssignments(copy).open.filter(x=>x.date===date).length<auditAssignments(temp).open.filter(x=>x.date===date).length){temp=copy;changed=true;}}
    if(!changed)break;
  }
  const afterAudit=auditAssignments(temp),remaining=afterAudit.open.filter(x=>x.date===date);
  if(remaining.length){
    const details=remaining.map(x=>`${shiftById(x.shift)?.code||x.shift}: ${coverageReason(date,x.shift)}`).join('\n');
    return alert(`I could not safely fix every mandatory slot on ${date} without breaking another hard rule.\n\nStill missing:\n${details}`);
  }
  if(afterAudit.open.length>baseAudit.open.length||afterAudit.violations.length>baseAudit.violations.length)return alert('A safe repair was not found without creating a new problem elsewhere.');
  const diffs=assignmentDiff(baseline,temp);const preview=diffs.slice(0,12).join('\n')+(diffs.length>12?`\n…and ${diffs.length-12} more change(s)`:``);
  if(!confirm(`Fix ${date}?\n\n${diffs.length} assignment change${diffs.length===1?'':'s'}:\n${preview}`))return;
  state.assignments=temp;state.published=false;logAction('Fixed coverage day',`${date}: ${diffs.length} assignment change${diffs.length===1?'':'s'} applied.`);renderAll();showAudit(auditSchedule(false));
}

function randomToken(){
  const a=new Uint8Array(32);crypto.getRandomValues(a);return Array.from(a,b=>b.toString(16).padStart(2,'0')).join('');
}
function uuid4(){if(typeof crypto.randomUUID==='function')return crypto.randomUUID();const a=new Uint8Array(16);crypto.getRandomValues(a);a[6]=(a[6]&15)|64;a[8]=(a[8]&63)|128;const h=[...a].map(b=>b.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;}
function portalExpiryForMonth(month){const [y,m]=month.split('-').map(Number),d=new Date(Date.UTC(y,m,8,23,59,59));return d.toISOString();}
function ensurePortalIdentity(){
  if(!state.remotePortal||!state.remotePortal.portalId||!state.remotePortal.adminToken)state.remotePortal={portalId:uuid4(),adminToken:randomToken(),month:state.month,lastSync:null,staffTokens:{},active:true,expiresAt:portalExpiryForMonth(state.month)};
  const rp=state.remotePortal;if(!rp.staffTokens||typeof rp.staffTokens!=='object')rp.staffTokens={};if(!rp.expiresAt)rp.expiresAt=portalExpiryForMonth(state.month);if(rp.active===undefined)rp.active=true;
  for(const p of activeStaff())if(!rp.staffTokens[p.id])rp.staffTokens[p.id]=randomToken();
  return rp;
}
async function supabaseRpc(name,args){
  const r=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':`Bearer ${SUPABASE_ANON_KEY}`},body:JSON.stringify(args)});
  const text=await r.text();let data={};try{data=text?JSON.parse(text):{};}catch{data={error:text};}
  if(!r.ok)throw new Error(data?.message||data?.error||data?.hint||`Request failed (${r.status})`);return data;
}
function portalBaseUrl(){if(location.protocol==='http:'||location.protocol==='https:')return location.href.replace(/[^/?#]+(?:[?#].*)?$/,'');return '';}
function portalPersonalLink(staffId){const rp=state.remotePortal,token=rp?.staffTokens?.[staffId];if(!rp?.portalId||!token||!staffId)return'';const q=`portal=${encodeURIComponent(rp.portalId)}&staff=${encodeURIComponent(staffId)}&token=${encodeURIComponent(token)}`;const base=portalBaseUrl();return base?`${base}request.html#${q}`:`request.html#${q}`;}
function portalLink(){return portalPersonalLink($('#portalStaffSelect')?.value||activeStaff()[0]?.id||'');}
function portalAssignmentPayload(){const out={};for(const p of activeStaff())for(const d of monthDates()){const v=assigned(p.id,d);if(v)out[key(p.id,d)]=v;}return out;}
async function syncStaffPortal(showStatus=true,active=true){
  clearTimeout(portalSyncTimer);portalSyncTimer=null;
  let rp=null;
  try{
    rp=ensurePortalIdentity();if(rp.month!==state.month){rp.month=state.month;rp.expiresAt=portalExpiryForMonth(state.month);}rp.active=!!active;rp.syncState='syncing';rp.syncError='';if(!rp.expiresAt)rp.expiresAt=portalExpiryForMonth(state.month);
    if(showStatus){const el=$('#portalStatus');if(el){el.textContent=active?'Syncing personal staff links and roster…':'Deactivating staff request portal…';el.className='muted portal-status';}}
    await supabaseRpc('icu_roster_sync_portal',{p_portal_id:rp.portalId,p_admin_token:rp.adminToken,p_month:state.month,p_roster_name:`ICU Roster — ${formatMonthLabel(state.month)}`,p_staff:activeStaff().map(p=>({id:p.id,name:p.name,group:p.group,level:p.level})),p_assignments:portalAssignmentPayload(),p_shifts:state.shifts.map(s=>({id:s.id,code:s.code,name:s.name,type:s.type})),p_staff_tokens:rp.staffTokens,p_active:!!active,p_expires_at:rp.expiresAt});
    rp.lastSync=new Date().toISOString();rp.syncState='ok';rp.syncError='';try{storeCurrentMonth();localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}renderPortalStatus();if(showStatus)await refreshRemoteRequests();return true;
  }catch(e){if(rp){rp.syncState='error';rp.syncError=e.message||String(e);try{storeCurrentMonth();localStorage.setItem(KEY,JSON.stringify(state));}catch(_){}}const el=$('#portalStatus');if(el){el.textContent=`Portal out of sync: ${e.message}. Use Create / Sync Portal to retry.`;el.className='portal-status bad';}return false;}
}
function queuePortalSync(){
  if(!state.remotePortal?.portalId||state.remotePortal?.active===false)return;
  state.remotePortal.syncState='pending';state.remotePortal.syncError='';renderPortalStatus();
  clearTimeout(portalSyncTimer);portalSyncTimer=setTimeout(()=>syncStaffPortal(false,true),1200);
}
function syncCurrentPortalAfterStaffChange(){
  if(!state.remotePortal?.portalId||state.remotePortal?.active===false)return;
  clearTimeout(portalSyncTimer);portalSyncTimer=null;void syncStaffPortal(false,true);
}
async function syncStoredPortalSnapshot(month,snap){
  const rp=snap?.remotePortal;if(!rp?.portalId||!rp.adminToken||rp.active===false)return true;
  const ids=new Set(Array.isArray(snap.activeStaffIds)?snap.activeStaffIds:[]),staffPayload=state.staff.filter(p=>ids.has(p.id)).map(p=>({id:p.id,name:p.name,group:p.group,level:p.level}));
  const assignments={};for(const [k,v] of Object.entries(snap.assignments||{})){const pid=k.split('|')[0];if(ids.has(pid)&&state.staff.some(p=>p.id===pid))assignments[k]=v;}
  try{await supabaseRpc('icu_roster_sync_portal',{p_portal_id:rp.portalId,p_admin_token:rp.adminToken,p_month:month,p_roster_name:`ICU Roster — ${formatMonthLabel(month)}`,p_staff:staffPayload,p_assignments:assignments,p_shifts:state.shifts.map(s=>({id:s.id,code:s.code,name:s.name,type:s.type})),p_staff_tokens:rp.staffTokens||{},p_active:true,p_expires_at:rp.expiresAt||portalExpiryForMonth(month)});rp.lastSync=new Date().toISOString();rp.syncState='ok';rp.syncError='';return true;}catch(e){rp.syncState='error';rp.syncError=e.message||String(e);return false;}
}
async function syncKnownPortalsAfterPermanentStaffDelete(){
  const jobs=[];if(state.remotePortal?.portalId&&state.remotePortal.active!==false)jobs.push(syncStaffPortal(false,true));
  for(const [month,snap] of Object.entries(state.monthStore||{}))if(month!==state.month&&snap?.remotePortal?.portalId)jobs.push(syncStoredPortalSnapshot(month,snap));
  if(jobs.length)await Promise.allSettled(jobs);try{storeCurrentMonth();localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}
}
function populatePortalStaffSelect(){const sel=$('#portalStaffSelect');if(!sel)return;const old=sel.value;sel.innerHTML=activeStaff().map(p=>`<option value="${esc(p.id)}">${esc(p.name)}${p.level?` — ${esc(p.level)}`:''}</option>`).join('');if(activeStaff().some(p=>p.id===old))sel.value=old;}
function renderPortalStatus(){
  const input=$('#staffRequestLink'),status=$('#portalStatus');if(!input||!status)return;populatePortalStaffSelect();
  if(!state.remotePortal?.portalId){input.value='';status.textContent='Not synced yet. Create the portal after deploying this site.';status.className='muted portal-status';return;}
  ensurePortalIdentity();input.value=portalLink();const local=location.protocol!=='http:'&&location.protocol!=='https:',active=state.remotePortal.active!==false;
  if(!active){status.textContent=`Portal is deactivated for ${formatMonthLabel(state.month)}. Personal links no longer accept requests.`;status.className='portal-status bad';return;}
  if(state.remotePortal.syncState==='error'){status.textContent=`Portal out of sync${state.remotePortal.syncError?': '+state.remotePortal.syncError:''}. Press Create / Sync Portal to retry before relying on staff links.`;status.className='portal-status bad';return;}
  if(state.remotePortal.syncState==='pending'||state.remotePortal.syncState==='syncing'){status.textContent=state.remotePortal.syncState==='pending'?'Local roster changed — portal sync pending…':'Syncing personal staff links and roster…';status.className='portal-status warn';return;}
  const exp=state.remotePortal.expiresAt?new Date(state.remotePortal.expiresAt).toLocaleDateString():'';
  status.textContent=local?'Personal links are configured, but deploy the site before sharing them.':`Personal staff links active for ${formatMonthLabel(state.month)}${exp?' · expire '+exp:''}${state.remotePortal.lastSync?' · last synced '+new Date(state.remotePortal.lastSync).toLocaleString():''}.`;
  status.className='portal-status '+(local?'':'ok');
}
async function regenerateStaffLinks(){if(!confirm('Regenerate every personal staff request link for this month? Previously shared links will stop working after the next sync.'))return;const rp=ensurePortalIdentity();rp.staffTokens={};for(const p of activeStaff())rp.staffTokens[p.id]=randomToken();rp.active=true;const ok=await syncStaffPortal(true,true);if(ok){logAction('Regenerated staff request links',`${activeStaff().length} personal links rotated for ${state.month}.`);renderPortalStatus();}}
async function deactivateStaffPortal(){if(!state.remotePortal?.portalId)return alert('No staff request portal exists for this month.');if(!confirm('Deactivate this month\'s staff request portal? Existing personal links will stop accepting requests until you reactivate/sync it.'))return;const ok=await syncStaffPortal(true,false);if(ok){logAction('Deactivated staff request portal',formatMonthLabel(state.month));renderPortalStatus();}}
async function refreshRemoteRequests(){
  if(!state.remotePortal?.portalId){remoteRequests=[];renderRemoteRequests();return;}
  try{const data=await supabaseRpc('icu_roster_list_requests',{p_portal_id:state.remotePortal.portalId,p_admin_token:state.remotePortal.adminToken});remoteRequests=Array.isArray(data.requests)?data.requests:[];renderRemoteRequests();renderPortalStatus();}
  catch(e){const el=$('#portalStatus');if(el){el.textContent=`Could not refresh staff requests: ${e.message}`;el.className='portal-status bad';}}
}
function remoteRequestSummary(r){
  const p=r.payload||{};
  if(r.request_type==='flex_days')return `${p.days||1} free day${Number(p.days||1)===1?'':'s'} · ${p.from||'—'} → ${p.to||'—'}${p.consecutive?' · consecutive':''}`;
  return `${p.dateA||'—'} (${r.staff_name}) ⇄ ${p.dateB||'—'} (${p.personBName||personById(p.personB)?.name||'staff'})`;
}
let remoteRequestBusy='';
function renderRemoteRequests(){
  const t=$('#remoteRequestsTable');if(!t)return;
  let h='<thead><tr><th>Staff</th><th>Type</th><th>Request</th><th>Submitted</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
  if(!remoteRequests.length)h+='<tr><td colspan="6" class="empty">No staff requests received yet.</td></tr>';
  else for(const r of remoteRequests){const pending=r.status==='pending',busy=remoteRequestBusy===r.id;h+=`<tr><td><b>${esc(r.staff_name)}</b></td><td><span class="remote-badge ${r.request_type==='swap'?'swap':'flex'}">${r.request_type==='swap'?'Swap':'Flexible days'}</span></td><td class="remote-request-summary">${esc(remoteRequestSummary(r))}</td><td>${esc(new Date(r.created_at).toLocaleString())}</td><td><span class="status-pill ${r.status==='approved'?'ok':r.status==='rejected'?'bad':'warn'}">${esc(r.status)}</span></td><td>${pending?`<button class="mini-btn good remote-approve" data-id="${r.id}" ${busy?'disabled':''}>${busy?'Processing…':'Review & Apply'}</button><button class="mini-btn danger remote-reject" data-id="${r.id}" ${busy?'disabled':''}>Reject</button>`:'—'}</td></tr>`;}
  h+='</tbody>';t.innerHTML=h;
  t.querySelectorAll('.remote-approve').forEach(b=>b.onclick=()=>approveRemoteRequest(b.dataset.id));t.querySelectorAll('.remote-reject').forEach(b=>b.onclick=()=>rejectRemoteRequest(b.dataset.id));
}
function requestPreviewText(before,after){const diffs=assignmentDiff(before,after),preview=diffs.slice(0,14).join('\n')+(diffs.length>14?`
…and ${diffs.length-14} more change(s)`:``);return{diffs,preview};}
async function approveRemoteRequest(id){
  if(remoteRequestBusy)return;const r=remoteRequests.find(x=>x.id===id);if(!r)return;const active=activeStaff().some(p=>p.id===r.staff_id);if(!active)return alert('This request belongs to a staff member who is no longer active in this month. Reject it or reactivate the staff member first.');
  remoteRequestBusy=id;renderRemoteRequests();
  const beforeAssignments={...state.assignments},beforeFree=JSON.parse(JSON.stringify(state.freeRequests)),beforeSwaps=JSON.parse(JSON.stringify(state.swaps));
  try{
    let candidate=null,localObject=null;
    if(r.request_type==='flex_days'){
      const p=r.payload||{};localObject={id:uid('f'),person:r.staff_id,days:Math.max(1,Number(p.days)||1),from:p.from,to:p.to,consecutive:!!p.consecutive,hard:true,remoteRequestId:r.id};state.freeRequests.push(localObject);
      const solved=await generate(true,{silent:true,dryRun:true});if(!solved.ok)throw new Error(solved.error||'The roster cannot grant this request under the current hard rules.');candidate=solved.assignments;if(!freeRequestResult(localObject,candidate).met)throw new Error('The solver could not create the requested free-day pattern.');
    }else{
      const p=r.payload||{};localObject={id:uid('sw'),personA:r.staff_id,dateA:p.dateA,personB:p.personB,dateB:p.dateB,status:'pending',remoteRequestId:r.id};const val=validateSwap(localObject);if(!val.ok)throw new Error(val.message);candidate=val.temp;
    }
    const pv=requestPreviewText(beforeAssignments,candidate);const audit=auditAssignments(candidate);if(audit.open.length||audit.violations.length)throw new Error('The proposed change would create a mandatory coverage or hard-rule problem.');
    const question=`Approve ${r.staff_name}'s ${r.request_type==='swap'?'swap':'flexible-day'} request?

This will change ${pv.diffs.length} roster cell${pv.diffs.length===1?'':'s'}.

${pv.preview||'No assignment cells need to change.'}`;
    if(!confirm(question)){state.assignments=beforeAssignments;state.freeRequests=beforeFree;state.swaps=beforeSwaps;renderAll();return;}
    state.assignments={...candidate};state.published=false;if(r.request_type==='swap'){localObject.status='approved';localObject.approvedAt=new Date().toLocaleString();state.swaps.push(localObject);}
    await supabaseRpc('icu_roster_set_request_status',{p_portal_id:state.remotePortal.portalId,p_admin_token:state.remotePortal.adminToken,p_request_id:r.id,p_status:'approved',p_admin_note:`Approved after preview; ${pv.diffs.length} roster cell change(s)`});
    logAction('Approved staff portal request',`${r.staff_name}: ${remoteRequestSummary(r)} · ${pv.diffs.length} roster cell change(s).`);renderAll();await syncStaffPortal(false,true);await refreshRemoteRequests();showAudit(auditSchedule(false));
  }catch(e){state.assignments=beforeAssignments;state.freeRequests=beforeFree;state.swaps=beforeSwaps;renderAll();alert(`Could not approve this request automatically:

${e.message}`);}
  finally{remoteRequestBusy='';renderRemoteRequests();setGenerationBusy(false);}
}
async function rejectRemoteRequest(id){
  if(remoteRequestBusy)return;const r=remoteRequests.find(x=>x.id===id);if(!r)return;if(!confirm(`Reject ${r.staff_name}'s request?`))return;remoteRequestBusy=id;renderRemoteRequests();
  try{await supabaseRpc('icu_roster_set_request_status',{p_portal_id:state.remotePortal.portalId,p_admin_token:state.remotePortal.adminToken,p_request_id:r.id,p_status:'rejected',p_admin_note:''});logAction('Rejected staff portal request',`${r.staff_name}: ${remoteRequestSummary(r)}`);await refreshRemoteRequests();}
  catch(e){alert(e.message);}finally{remoteRequestBusy='';renderRemoteRequests();}
}

function populateUnitBlockControls(){
  const staffSel=$('#unitBlockStaff'),unitSel=$('#unitBlockUnit'),start=$('#unitBlockStart');if(!staffSel||!unitSel||!start)return;
  const oldStaff=staffSel.value;staffSel.innerHTML=activeStaff().map(p=>`<option value="${esc(p.id)}">${esc(p.name)}${p.level?` — ${esc(p.level)}`:''}</option>`).join('');if(activeStaff().some(p=>p.id===oldStaff))staffSel.value=oldStaff;
  const person=personById(staffSel.value)||activeStaff()[0];const oldUnit=unitSel.value;
  const dayUnits=state.shifts.filter(sh=>sh.type==='day'&&!isOverflowShift(sh)&&person?.eligible?.includes(sh.id));
  unitSel.innerHTML=dayUnits.map(sh=>`<option value="${esc(sh.id)}">${esc(sh.code)} — ${esc(sh.name)}${isOverflowShift(sh)?' (optional)':''}</option>`).join('');if(dayUnits.some(sh=>sh.id===oldUnit))unitSel.value=oldUnit;
  const {first,last}=monthBounds();start.min=first;start.max=last;if(!start.value||start.value<first||start.value>last)start.value=first;
  updateUnitBlockPreview();
}
function unitBlockRequestedDates(){const start=$('#unitBlockStart')?.value,len=Number($('#unitBlockLength')?.value)||3;if(!start)return[];return Array.from({length:len},(_,i)=>addDays(start,i));}
function unitBlockWeekendSafe(dates){
  if(!dates.length)return true;
  const set=new Set(dates);
  for(const wk of weekendBlocksInMonth()){
    const pair=weekendPairDates(wk),inside=pair.filter(d=>d.startsWith(state.month));
    if(inside.length<2)continue; // month-boundary partial weekend is allowed
    const touched=inside.filter(d=>set.has(d)).length;
    if(touched===1)return false;
  }
  return true;
}
function nearestWeekendSafeUnitBlock(person,requested){
  if(!weekendCapApplies(person)||unitBlockWeekendSafe(requested))return{dates:requested,adjusted:false};
  const len=requested.length,{first,last}=monthBounds(),wantedStart=requested[0];
  const candidates=[];
  for(const start of monthDates()){
    const dates=Array.from({length:len},(_,i)=>addDays(start,i));
    if(dates[dates.length-1]>last||dates[0]<first||!unitBlockWeekendSafe(dates))continue;
    const overlap=dates.filter(d=>requested.includes(d)).length;
    const distance=Math.abs((dateObj(start)-dateObj(wantedStart))/86400000);
    candidates.push({dates,overlap,distance});
  }
  candidates.sort((a,b)=>b.overlap-a.overlap||a.distance-b.distance||a.dates[0].localeCompare(b.dates[0]));
  return candidates.length?{dates:candidates[0].dates,adjusted:true}:{dates:requested,adjusted:false,unsafe:true};
}
function unitBlockPlan(){
  const person=personById($('#unitBlockStaff')?.value),requested=unitBlockRequestedDates();
  if(!person)return{person:null,requested,dates:requested,adjusted:false};
  const safe=nearestWeekendSafeUnitBlock(person,requested);return{person,requested,...safe};
}
function updateUnitBlockPreview(){
  const box=$('#unitBlockPreview');if(!box)return;const person=personById($('#unitBlockStaff')?.value),shift=shiftById($('#unitBlockUnit')?.value),plan=unitBlockPlan(),dates=plan.dates||[];
  if(!person||!shift||!dates.length){box.textContent='Choose staff, a daytime unit, start date, and 3 or 4 days.';return;}
  const outside=dates.some(d=>!d.startsWith(state.month));
  if(outside){box.textContent='The selected block crosses outside the current month. Choose an earlier start date.';return;}
  if(plan.unsafe){box.textContent='This block touches only one day of a full weekend and no same-length weekend-safe adjustment is available.';return;}
  box.textContent=plan.adjusted
    ?`${person.name}: weekend-safe adjustment ${plan.requested[0]}–${plan.requested[plan.requested.length-1]} → ${dates[0]}–${dates[dates.length-1]} (${dates.length} days), keeping Fri/Sat together.`
    :`${person.name}: ${shift.code} for ${dates[0]} → ${dates[dates.length-1]} (${dates.length} consecutive daytime shifts).`;
}
function openUnitBlockPanel(){const f=$('#unitBlockPanel');if(!f)return;f.classList.remove('hidden');populateUnitBlockControls();f.scrollIntoView({behavior:'smooth',block:'nearest'});}
function applyUnitBlock(){
  const person=personById($('#unitBlockStaff')?.value),shift=shiftById($('#unitBlockUnit')?.value),plan=unitBlockPlan(),dates=plan.dates||[],lockBlock=$('#unitBlockLock')?.checked===true;
  if(!person||!shift)return alert('Choose a staff member and daytime unit.');
  if(shift.type!=='day')return alert('Block assignment only supports daytime units. On-call/night shifts cannot be assigned with this tool.');
  if(!person.eligible?.includes(shift.id))return alert(`${person.name} is not eligible for ${shift.code}.`);
  if(![3,4].includes(dates.length))return alert('Choose either 3 or 4 consecutive days.');
  if(plan.unsafe)return alert('The selected block would split a full weekend, and no 3–4 day weekend-safe block is available. Choose a different start date.');
  if(dates.some(d=>!d.startsWith(state.month)))return alert('The 3–4 day block must stay inside the current roster month.');
  for(const d of dates){
    if(onApprovedLeave(person.id,d))return alert(`${person.name} is on approved leave on ${d}.`);
    const existing=assigned(person.id,d),k=key(person.id,d);
    if(existing&&isNight(existing))return alert(`${person.name} already has an on-call/night assignment (${shiftById(existing)?.code||existing}) on ${d}. This tool will never overwrite an on-call.`);
    if(state.locks[k]&&existing!==shift.id)return alert(`${person.name}'s assignment on ${d} is locked. Unlock it first.`);
  }
  const before={...state.assignments},temp={...before};for(const d of dates)temp[key(person.id,d)]=shift.id;
  const beforeAudit=auditAssignments(before),after=auditAssignments(temp);
  const newHard=after.violations.filter(v=>!beforeAudit.violations.includes(v));
  const openCounts=list=>{const m=new Map();for(const x of list){const k=x.date+'|'+x.shift;m.set(k,(m.get(k)||0)+1);}return m;};
  const bo=openCounts(beforeAudit.open),ao=openCounts(after.open);const newGap=[...ao.entries()].find(([k,n])=>n>(bo.get(k)||0));
  if(newGap){const [k]=newGap,[d,sid]=k.split('|');return alert(`This block would create a new mandatory coverage gap: ${d} ${shiftById(sid)?.code||sid}. Clear/reassign the affected coverage first.`);}
  if(newHard.length)return alert(`This block would break a hard roster rule:\n\n${newHard[0]}`);
  const changes=dates.filter(d=>(before[key(person.id,d)]||'')!==shift.id);
  if(!changes.length)return alert(`${person.name} is already assigned to ${shift.code} for all selected days.`);
  const preview=dates.map(d=>`${d}: ${shiftById(before[key(person.id,d)])?.code||'OFF'} → ${shift.code}`).join('\n');
  const adjustment=plan.adjusted?`\n\nWeekend rule adjustment: the requested ${plan.requested[0]}–${plan.requested[plan.requested.length-1]} block was shifted to ${dates[0]}–${dates[dates.length-1]} so Friday and Saturday remain together.`:'';
  if(!confirm(`Assign ${person.name} to ${shift.code} for ${dates.length} consecutive days?${adjustment}\n\n${preview}${lockBlock?'\n\nThese cells will also be locked.':''}`))return;
  state.assignments=temp;for(const d of dates){const k=key(person.id,d);if(lockBlock)state.locks[k]=true;}
  state.published=false;logAction('Assigned unit block',`${person.name}: ${shift.code} · ${dates[0]} to ${dates[dates.length-1]} (${dates.length} days)${plan.adjusted?' · weekend-safe adjusted':''}${lockBlock?' · locked':''}.`);$('#unitBlockPanel').classList.add('hidden');renderAll();showAudit(auditSchedule(false));
}

function renderAll(){
  renderTabs();renderLegend();renderSchedule();renderStaff();renderStaffSheet();renderShifts();renderRequests();renderSwaps();renderCounter();renderRules();renderSafety();renderFairness();updateStats();populatePersonSelects();populateRequestShifts();syncDateInputs();updateSwapPreviews();updatePublish();renderPortalStatus();renderRemoteRequests();
  const ub=$('#unitBlockPanel');if(ub&&!ub.classList.contains('hidden'))populateUnitBlockControls();
  save();
}

function renderTabs(){
  $$('.tab').forEach(b=>b.onclick=()=>{
    $$('.tab').forEach(x=>x.classList.remove('active'));$$('.tab-panel').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');$('#tab-'+b.dataset.tab).classList.add('active');if(b.dataset.tab==='requests'&&state.remotePortal?.portalId)refreshRemoteRequests();
  });
}

function renderLegend(){
  const day=$('#dayLegendTable'),night=$('#nightLegendTable');
  if(!day||!night)return;
  const primaryOrder=['sA','sP','sB','sR','sT','sK','sG','sS','sN','sER','sCC'];
  const dayShifts=primaryOrder.map(id=>shiftById(id)).filter(Boolean);
  const pairs=[];
  for(let i=0;i<dayShifts.length;i+=2)pairs.push(dayShifts.slice(i,i+2));
  day.innerHTML=pairs.map(pair=>{
    const a=pair[0],b=pair[1];
    return `<div class="legend-item-box">${esc(legendDisplayName(a))}</div><div class="legend-code-box">${esc(a?.code||'')}</div><div class="legend-item-box">${esc(legendDisplayName(b))}</div><div class="legend-code-box">${esc(b?.code||'')}</div>`;
  }).join('');
  const nightIds=['sMT','sGR','sKA'];
  const nights=nightIds.map(id=>shiftById(id)).filter(Boolean);
  night.innerHTML=nights.map(s=>`<div class="legend-item-box">${esc(s.name.replace(/^Night:\s*/,''))}</div><div class="legend-code-box">${esc(s.code)}</div>`).join('');
  const m=$('#officialMonth');if(m)m.textContent=formatMonthLabel(state.month);
  const officialPicker=$('#officialMonthPicker');if(officialPicker)officialPicker.value=state.month;
  const toolbarPicker=$('#monthPicker');if(toolbarPicker)toolbarPicker.value=state.month;
  const status=$('#officialStatusBadge');if(status){status.textContent=state.published?'Final':'Draft';status.className='official-status '+(state.published?'published':'draft');}
}

function renderSchedule(){
  const t=$('#scheduleTable'),dates=monthDates();
  let h='<tbody>';
  const groups=[...new Set(activeStaff().map(p=>p.group))];
  for(const g of groups){
    h+=`<tr class="group-band"><th class="name-col">${esc(displayGroupName(g||'Ungrouped'))}</th>`;
    for(const d of dates)h+=`<th class="day-head ${isWeekend(d)?'weekend':''}"><span class="date-num">${Number(d.slice(8))}</span><span class="dow">${dayName(d)}</span></th>`;
    h+=`<th class="pager-col">PAGER/PHONE</th></tr>`;
    for(const p of activeStaff().filter(x=>x.group===g)){
      const flexDays=grantedFlexDatesForPerson(p.id);
      const wi=workloadInfo(p);h+=`<tr><td class="name-col"><div class="name-main">${esc(p.name)} <span class="workload-pill ${wi.cls}" title="${wi.total} of ${wi.max} shift credits">${wi.label}</span></div><div class="name-sub">${esc(p.level)} · ${wi.nights} on-call${wi.nights===1?'':'s'} · ${wi.weekends} weekend${wi.weekends===1?'':'s'}</div></td>`;
      for(const d of dates){
        const v=assigned(p.id,d),s=shiftById(v),leave=onApprovedLeave(p.id,d),off=requestFor(p.id,d,'off').length>0,lock=!!state.locks[key(p.id,d)],flex=flexDays.has(d)&&!v&&!leave;
        let shiftClass='';if(s)shiftClass='shift-'+String(s.code).replace(/[^A-Za-z0-9]+/g,'');
        let cls='day-cell '+(isWeekend(d)?'weekend ':'')+(leave?'leave ':'')+(off?'request-off ':'')+(flex?'flex-free ':'')+(lock?'locked ':'')+(s?(s.type==='night'?'code-night ':'code-day '):'empty-slot ')+shiftClass;
        let txt=leave?'LV':flex?'FD':v?(s?.code||'?'):' ';
        const tips=[];if(leave)tips.push('Approved leave');if(flex)tips.push('Granted flexible free day');if(off)tips.push('Exact free-day request');if(s)tips.push(s.name);if(lock)tips.push('Locked');
        h+=`<td class="${cls}" data-person="${p.id}" data-date="${d}" title="${esc(tips.join(' • ')||'Empty')}">${txt}</td>`;
      }
      h+=`<td class="pager-col"><span class="pager-text">${esc(p.pager||'—')}</span></td></tr>`;
    }
  }
  h+='</tbody>';t.innerHTML=h;
  t.querySelectorAll('td[data-person]').forEach(td=>td.addEventListener('click',()=>openEditor(td.dataset.person,td.dataset.date)));
}

function openEditor(person,date){
  editingCell={person,date};const p=personById(person);$('#editorTitle').textContent=`${p?.name||''} — ${date}`;
  const notes=[];if(onApprovedLeave(person,date))notes.push('Approved leave');if(requestFor(person,date,'off').length)notes.push('Requested free day');if(grantedFlexDatesForPerson(person).has(date))notes.push('Granted flexible free day');
  $('#editorMeta').textContent=notes.join(' • ')||'Manual edit';
  const sel=$('#editorShift');sel.innerHTML='<option value="">— No assignment —</option>'+state.shifts.filter(s=>p?.eligible?.includes(s.id)).map(s=>`<option value="${s.id}">${esc(s.code)} — ${esc(s.name)}</option>`).join('');
  sel.value=assigned(person,date);$('#editorLock').checked=!!state.locks[key(person,date)];$('#cellEditor').classList.remove('hidden');
}
function closeEditor(){editingCell=null;$('#cellEditor').classList.add('hidden');}

function inferredBulkProfile(name,defaults,autoDetect=true){
  let level=defaults.level,group=defaults.group;
  const text=String(name||'').trim();
  if(autoDetect){
    if(/\bR2\b/i.test(text)){level='R2';group='ICU Residents';}
    else if(/\bR1\b/i.test(text)){level='R1';group='ICU Residents';}
    else if(/\bFellow\b/i.test(text)){level='Fellow';group='Fellows';}
    else if(/\bER\b/i.test(text)){level='Rotator';group='ER Rotators';}
    else if(/\bIM\b/i.test(text)){level='Rotator';group='IM Rotators';}
    else if(/\bGS\b/i.test(text)){level='Rotator';group='GS Rotators';}
  }
  return{level,group};
}
function defaultEligibilityFor(level){
  if(level==='R2'||level==='Fellow')return[...allShiftIds];
  if(level==='R1')return[...dayShiftIds,'sMT','sGR'];
  return[...dayShiftIds];
}
function parseBulkStaffText(text){
  const defaults={level:$('#bulkStaffLevel')?.value||'R2',group:$('#bulkStaffGroup')?.value.trim()||'ICU Residents',max:Math.max(1,Math.min(31,Number($('#bulkStaffMax')?.value)||18))};
  const autoDetect=$('#bulkAutoDetect')?.checked!==false;
  const rows=[];
  for(const raw of String(text||'').split(/\r?\n/)){
    let line=raw.trim();if(!line)continue;
    if(/^name\b/i.test(line)&&/(pager|phone|level|group)/i.test(line))continue;
    let fields=line.includes('\t')?line.split(/\t+/):line.includes(',')?line.split(/\s*,\s*/):line.split(/\s{2,}/);
    fields=fields.map(x=>x.trim()).filter(Boolean);
    let name=fields[0]||'',pager='',explicitLevel='',explicitGroup='';
    if(fields.length===1){
      const m=name.match(/^(.*?)(?:\s+)(\+?\d[\d\s-]{2,})$/);
      if(m){name=m[1].trim();pager=m[2].replace(/\s+/g,' ');}
    }else{
      for(const f of fields.slice(1)){
        if(/^(R1|R2|Fellow|Rotator)$/i.test(f))explicitLevel=f.replace(/^r/i,'R').replace(/^fellow$/i,'Fellow').replace(/^rotator$/i,'Rotator');
        else if(/^\+?[0-9][0-9\s-]{2,}$/.test(f))pager=f;
        else if(!explicitGroup)explicitGroup=f;
      }
    }
    name=name.trim();if(!name)continue;
    const inferred=inferredBulkProfile(name,defaults,autoDetect);
    const level=explicitLevel||inferred.level;
    const group=explicitGroup||inferred.group;
    rows.push({name,level,group,pager,max:defaults.max,eligible:defaultEligibilityFor(level)});
  }
  return rows;
}
function renderBulkStaffPreview(){
  const box=$('#bulkStaffPreview');if(!box)return;
  const rows=parseBulkStaffText($('#bulkStaffText')?.value||'');
  if(!rows.length){box.innerHTML='Paste names above to see how they will be interpreted.';return;}
  const sample=rows.slice(0,8).map(r=>`${esc(r.name)} → ${esc(r.level)} / ${esc(r.group)}${r.pager?` / ${esc(r.pager)}`:''}`).join('<br>');
  box.innerHTML=`<strong>${rows.length} staff member${rows.length===1?'':'s'} detected.</strong><br>${sample}${rows.length>8?`<br>…and ${rows.length-8} more`:''}`;
}
function normalizedStaffName(name){return String(name||'').trim().replace(/\s+/g,' ').toLowerCase();}
function staffNameConflict(name,excludeId=''){const nk=normalizedStaffName(name);return !!nk&&state.staff.some(p=>p.id!==excludeId&&normalizedStaffName(p.name)===nk);}
function eligibilityMatchesDefault(eligible,level){const a=[...(eligible||[])].sort(),b=defaultEligibilityFor(level).sort();return a.length===b.length&&a.every((v,i)=>v===b[i]);}
function addStaffToCurrentMonth(person,active=true){
  if(!person?.id)throw new Error('Staff ID required');
  if(staffNameConflict(person.name,person.id))throw new Error('A staff member with this name already exists.');
  state.staff.push({...person,eligible:[...(person.eligible||defaultEligibilityFor(person.level))]});
  const ids=currentActiveStaffIds();if(active&&!ids.includes(person.id))ids.push(person.id);
  state.published=false;
  return person;
}
function removeStaffIdsFromCurrentMonth(ids){
  const set=new Set((ids||[]).filter(id=>state.staff.some(p=>p.id===id)));if(!set.size)return 0;
  state.activeStaffIds=currentActiveStaffIds().filter(id=>!set.has(id));
  for(const k of Object.keys(state.assignments))if(set.has(k.split('|')[0]))delete state.assignments[k];
  for(const k of Object.keys(state.locks))if(set.has(k.split('|')[0]))delete state.locks[k];
  state.swaps=(state.swaps||[]).filter(x=>!set.has(x.personA)&&!set.has(x.personB));
  if(state.remotePortal?.staffTokens)for(const id of set)delete state.remotePortal.staffTokens[id];
  state.published=false;
  return set.size;
}
function setStaffActiveForCurrentMonth(id,active){
  if(!state.staff.some(p=>p.id===id))return false;
  if(active){const ids=currentActiveStaffIds();if(!ids.includes(id))ids.push(id);if(state.remotePortal?.staffTokens)delete state.remotePortal.staffTokens[id];state.published=false;return true;}
  return removeStaffIdsFromCurrentMonth([id])>0;
}

function purgeStaffIds(ids){
  const set=new Set(ids);if(!set.size)return;
  state.staff=state.staff.filter(p=>!set.has(p.id));
  state.activeStaffIds=currentActiveStaffIds().filter(id=>!set.has(id));
  if(state.remotePortal?.staffTokens)for(const id of set)delete state.remotePortal.staffTokens[id];
  state.leaves=state.leaves.filter(x=>!set.has(x.person));
  state.requests=state.requests.filter(x=>!set.has(x.person));
  state.freeRequests=state.freeRequests.filter(x=>!set.has(x.person));
  state.swaps=state.swaps.filter(x=>!set.has(x.personA)&&!set.has(x.personB));
  for(const k of Object.keys(state.assignments))if(set.has(k.split('|')[0]))delete state.assignments[k];
  for(const k of Object.keys(state.locks))if(set.has(k.split('|')[0]))delete state.locks[k];
  for(const snap of Object.values(state.monthStore||{})){
    for(const k of Object.keys(snap.assignments||{}))if(set.has(k.split('|')[0]))delete snap.assignments[k];
    for(const k of Object.keys(snap.locks||{}))if(set.has(k.split('|')[0]))delete snap.locks[k];
    snap.swaps=(snap.swaps||[]).filter(x=>!set.has(x.personA)&&!set.has(x.personB));if(Array.isArray(snap.activeStaffIds))snap.activeStaffIds=snap.activeStaffIds.filter(id=>!set.has(id));if(snap.remotePortal?.staffTokens)for(const id of set)delete snap.remotePortal.staffTokens[id];snap.published=false;
  }
}
function importBulkStaff(){
  const rows=parseBulkStaffText($('#bulkStaffText')?.value||'');
  if(!rows.length)return alert('Paste at least one staff name first.');
  const skipDup=$('#bulkSkipDuplicates')?.checked!==false;
  const existing=new Set(state.staff.map(p=>p.name.trim().toLowerCase()));
  let added=0,skipped=0;
  for(const r of rows){
    const nk=r.name.trim().toLowerCase();
    if(skipDup&&existing.has(nk)){skipped++;continue;}
    const person={id:uid('p'),...r};addStaffToCurrentMonth(person);existing.add(nk);added++;
  }
  if(!added)return alert(`No staff were added. ${skipped} duplicate name${skipped===1?' was':'s were'} skipped.`);
  state.published=false;
  logAction('Bulk staff import',`${added} staff added${skipped?`; ${skipped} duplicate${skipped===1?'':'s'} skipped`:''}.`);
  $('#bulkStaffText').value='';renderBulkStaffPreview();$('#bulkStaffForm').classList.add('hidden');renderAll();
  alert(`${added} staff member${added===1?'':'s'} added${skipped?`. ${skipped} duplicate${skipped===1?'':'s'} skipped.`:'.'}`);
}

function renderStaff(){
  const t=$('#staffTable');
  for(const id of [...selectedStaffIds])if(!state.staff.some(p=>p.id===id))selectedStaffIds.delete(id);
  const allSelected=state.staff.length>0&&state.staff.every(p=>selectedStaffIds.has(p.id));
  let h=`<thead><tr><th class="select-col"><input id="selectAllStaffRows" type="checkbox" ${allSelected?'checked':''} aria-label="Select all staff"></th><th>Name</th><th>Active This Month</th><th>Level</th><th>Group</th><th>Pager / Phone</th><th>Monthly Max Credits</th><th>Eligible For</th><th class="actions">Actions</th></tr></thead><tbody>`;
  for(const p of state.staff){
    const active=isActiveStaff(p.id),elig=(p.eligible||[]).map(id=>esc(shiftById(id)?.code||id)).join(', ');
    h+=`<tr class="${active?'':'staff-inactive'}"><td class="select-col"><input class="staff-select" type="checkbox" data-id="${p.id}" ${selectedStaffIds.has(p.id)?'checked':''} aria-label="Select ${esc(p.name)}"></td><td>${esc(p.name)}</td><td><span class="${active?'coverage-ok':'muted'}">${active?'Active':'Inactive'}</span></td><td>${esc(p.level)}</td><td>${esc(p.group||'')}</td><td>${esc(p.pager||'—')}</td><td>${p.max}</td><td>${elig||'<span class="coverage-bad">None</span>'}</td><td class="actions"><button class="mini-btn edit-staff" data-id="${p.id}">Edit</button><button class="mini-btn ${active?'secondary':'primary'} toggle-month-staff" data-id="${p.id}" data-active="${active?'1':'0'}">${active?'Remove from Month':'Activate This Month'}</button><button class="mini-btn danger del-staff" data-id="${p.id}">Delete Permanently</button></td></tr>`;
  }
  h+='</tbody>';t.innerHTML=h;
  t.querySelectorAll('.edit-staff').forEach(b=>b.onclick=()=>openStaffForm(b.dataset.id));
  t.querySelectorAll('.toggle-month-staff').forEach(b=>b.onclick=()=>toggleStaffForCurrentMonth(b.dataset.id,b.dataset.active!=='1'));
  t.querySelectorAll('.del-staff').forEach(b=>b.onclick=()=>deleteStaff(b.dataset.id));
  t.querySelectorAll('.staff-select').forEach(ch=>ch.onchange=()=>{ch.checked?selectedStaffIds.add(ch.dataset.id):selectedStaffIds.delete(ch.dataset.id);renderStaffSheet();updateStaffSelectionButtons();});
  const all=$('#selectAllStaffRows');if(all)all.onchange=()=>{if(all.checked)state.staff.forEach(p=>selectedStaffIds.add(p.id));else selectedStaffIds.clear();renderStaff();renderStaffSheet();};
  updateStaffSelectionButtons();
}

function renderStaffSheet(){
  const t=$('#staffSheetTable');if(!t)return;
  let h='<thead><tr><th class="select-col">✓</th><th>Name</th><th>Level</th><th>Group</th><th>Pager / Phone</th><th>Max Credits</th><th>Eligibility</th></tr></thead><tbody>';
  state.staff.forEach((p,rowIndex)=>{
    h+=`<tr data-staff-id="${p.id}"><td class="select-col"><input class="sheet-staff-select" type="checkbox" data-id="${p.id}" ${selectedStaffIds.has(p.id)?'checked':''}></td>`+
      `<td><input class="sheet-cell" data-row="${rowIndex}" data-field="name" value="${esc(p.name)}"></td>`+
      `<td><select class="sheet-cell" data-row="${rowIndex}" data-field="level"><option ${p.level==='R1'?'selected':''}>R1</option><option ${p.level==='R2'?'selected':''}>R2</option><option ${p.level==='Fellow'?'selected':''}>Fellow</option><option ${p.level==='Rotator'?'selected':''}>Rotator</option></select></td>`+
      `<td><input class="sheet-cell" data-row="${rowIndex}" data-field="group" value="${esc(p.group||'')}"></td>`+
      `<td><input class="sheet-cell pager-sheet-cell" data-row="${rowIndex}" data-field="pager" value="${esc(p.pager||'')}"></td>`+
      `<td><input class="sheet-cell max-sheet-cell" data-row="${rowIndex}" data-field="max" type="number" min="1" max="40" value="${Number(p.max)||16}"></td>`+
      `<td class="eligibility-summary">${p.eligible.map(id=>esc(shiftById(id)?.code||id)).join(', ')}</td></tr>`;
  });
  h+='</tbody>';t.innerHTML=h;
  t.querySelectorAll('.sheet-staff-select').forEach(ch=>ch.onchange=()=>{ch.checked?selectedStaffIds.add(ch.dataset.id):selectedStaffIds.delete(ch.dataset.id);renderStaff();updateStaffSelectionButtons();});
  t.querySelectorAll('.sheet-cell').forEach(cell=>cell.addEventListener('paste',handleStaffSheetPaste));
  updateStaffSelectionButtons();
}
function handleStaffSheetPaste(e){
  const target=e.currentTarget,text=e.clipboardData?.getData('text/plain')||'';
  if(!text.includes('\n')&&!text.includes('\t'))return;
  e.preventDefault();
  const fields=['name','level','group','pager','max'];
  const startRow=Number(target.dataset.row)||0,startCol=Math.max(0,fields.indexOf(target.dataset.field));
  const rows=text.replace(/\r/g,'').split('\n').filter(r=>r.trim().length).map(r=>r.split('\t'));
  rows.forEach((cols,ri)=>cols.forEach((value,ci)=>{
    const row=startRow+ri,col=startCol+ci;if(row>=state.staff.length||col>=fields.length)return;
    const cell=$(`#staffSheetTable .sheet-cell[data-row="${row}"][data-field="${fields[col]}"]`);if(!cell)return;
    const v=String(value).trim();
    if(cell.tagName==='SELECT'){const opt=[...cell.options].find(o=>o.value.toLowerCase()===v.toLowerCase());if(opt)cell.value=opt.value;}
    else cell.value=v;
  }));
}
function saveStaffSheetChanges(){
  const drafts=state.staff.map((p,row)=>{const get=field=>$(`#staffSheetTable .sheet-cell[data-row="${row}"][data-field="${field}"]`);return{p,row,name:get('name')?.value.trim()||p.name,level:get('level')?.value||p.level,group:get('group')?.value.trim()||p.group,pager:get('pager')?.value.trim()||'',max:Math.max(1,Math.min(40,Number(get('max')?.value)||p.max||16))};});
  const seen=new Map();for(const d of drafts){const nk=normalizedStaffName(d.name);if(seen.has(nk))return alert(`Duplicate staff name: ${d.name}. Each master staff member must have a unique name.`);seen.set(nk,d.p.id);}
  let changed=0;
  for(const d of drafts){const {p,name,level,group,pager,max}=d;if(name!==p.name||level!==p.level||group!==p.group||pager!==p.pager||max!==p.max){const oldLevel=p.level,oldEligible=[...(p.eligible||[])],levelChanged=level!==oldLevel;p.name=name;p.level=level;p.group=group;p.pager=pager;p.max=max;if(levelChanged&&eligibilityMatchesDefault(oldEligible,oldLevel))p.eligible=defaultEligibilityFor(level);changed++;}}
  if(changed){state.published=false;logAction('Updated staff sheet',`${changed} staff row${changed===1?'':'s'} updated.`);}renderAll();
}

function syncStaffEligibleAllState(){
  const master=$('#staffEligibleAll');
  if(!master)return;
  const boxes=$$('#staffEligible input[type="checkbox"]');
  const checked=boxes.filter(x=>x.checked).length;
  master.checked=boxes.length>0&&checked===boxes.length;
  master.indeterminate=checked>0&&checked<boxes.length;
}

function applyEligibilityChecks(ids){const set=new Set(ids||[]);$$('#staffEligible input[type="checkbox"]').forEach(x=>x.checked=set.has(x.value));syncStaffEligibleAllState();}
function openStaffForm(id=null){
  editingStaff=id;const p=id?personById(id):null,level=p?.level||'R1';$('#staffFormTitle').textContent=p?'Edit Staff Member':'Add Staff Member';
  $('#staffName').value=p?.name||'';$('#staffLevel').value=level;$('#staffGroup').value=p?.group||'ICU Residents';$('#staffMax').value=p?.max||16;$('#staffPager').value=p?.pager||'';$('#staffActiveMonth').checked=p?isActiveStaff(p.id):true;
  const eligible=p?.eligible||defaultEligibilityFor(level);$('#staffEligible').innerHTML=state.shifts.map(s=>`<label class="chip"><input type="checkbox" value="${s.id}" ${eligible.includes(s.id)?'checked':''}>${esc(s.code)}</label>`).join('');
  $('#staffLevel').dataset.previousLevel=level;syncStaffEligibleAllState();$('#staffForm').classList.remove('hidden');
}
function toggleStaffForCurrentMonth(id,activate){
  const p=personById(id);if(!p)return;
  if(!activate){const assignedCount=Object.keys(state.assignments).filter(k=>k.startsWith(id+'|')&&state.assignments[k]).length;if(!confirm(`Remove ${p.name} from ${formatMonthLabel(state.month)}?${assignedCount?`

${assignedCount} current-month assignment${assignedCount===1?'':'s'} will be cleared.`:''}

Their master record and all other months will be preserved.`))return;}
  setStaffActiveForCurrentMonth(id,activate);logAction(activate?'Activated staff for month':'Removed staff from month',`${p.name} · ${formatMonthLabel(state.month)}`);renderAll();syncCurrentPortalAfterStaffChange();
}
function deleteStaff(id){
  const p=personById(id);if(!p)return;
  if(!confirm(`PERMANENTLY delete ${p.name} from the master staff list?

This destructive action erases this person's related roster data across ALL saved months. If they are only leaving ${formatMonthLabel(state.month)}, use "Remove from Month" instead.`))return;
  purgeStaffIds([id]);selectedStaffIds.delete(id);invalidateAllPublished();logAction('Permanently deleted staff member',p.name);renderAll();syncKnownPortalsAfterPermanentStaffDelete();
}

function renderShifts(){
  const t=$('#shiftTable');let h='<thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Role</th><th>Weekdays</th><th>Weekends</th><th>Continuity</th><th>Coverage This Month</th><th class="actions">Actions</th></tr></thead><tbody>';
  for(const s of state.shifts){
    const need=monthDates().reduce((n,d)=>n+requiredCount(s,d),0),have=Object.values(state.assignments).filter(v=>v===s.id).length;
    const role=isOverflowShift(s)?`Overflow #${s.overflowPriority}`:'Required';
    const cov=isOverflowShift(s)?`${have} assigned when capacity allows`:`${have}/${need}`;
    const covClass=isOverflowShift(s)?'coverage-ok':(have>=need?'coverage-ok':'coverage-bad');
    h+=`<tr><td><b>${esc(s.code)}</b></td><td>${esc(s.name)}</td><td>${s.type==='night'?'Night':'Day'}</td><td>${esc(role)}</td><td>${s.weekday}</td><td>${s.weekend}</td><td>${continuityEnabled(s)?`Min ${state.rules.minUnitBlock} days`:'—'}</td><td class="${covClass}">${esc(cov)}</td><td class="actions"><button class="mini-btn edit-shift" data-id="${s.id}">Edit</button><button class="mini-btn danger del-shift" data-id="${s.id}">Delete</button></td></tr>`;
  }
  h+='</tbody>';t.innerHTML=h;
  t.querySelectorAll('.edit-shift').forEach(b=>b.onclick=()=>openShiftForm(b.dataset.id));t.querySelectorAll('.del-shift').forEach(b=>b.onclick=()=>deleteShift(b.dataset.id));
}

function openShiftForm(id=null){
  editingShift=id;const s=id?shiftById(id):null;$('#shiftFormTitle').textContent=s?'Edit Unit / Shift':'Add Unit / Shift';$('#shiftCode').value=s?.code||'';$('#shiftName').value=s?.name||'';$('#shiftType').value=s?.type||'day';$('#shiftWeekday').value=s?.weekday??1;$('#shiftWeekend').value=s?.weekend??1;$('#shiftContinuity').checked=s?.continuity??true;syncShiftContinuityControl();$('#shiftForm').classList.remove('hidden');
}
function syncShiftContinuityControl(){const night=$('#shiftType').value==='night';$('#shiftContinuity').disabled=night;if(night)$('#shiftContinuity').checked=false;}
function deleteShift(id){
  if(!confirm('Delete this unit/shift from rules, eligibility, assignments, and requests?'))return;
  const code=shiftById(id)?.code||id;state.shifts=state.shifts.filter(s=>s.id!==id);state.staff.forEach(p=>p.eligible=p.eligible.filter(x=>x!==id));for(const k of Object.keys(state.assignments))if(state.assignments[k]===id){delete state.assignments[k];delete state.locks[k];}for(const snap of Object.values(state.monthStore||{})){for(const k of Object.keys(snap.assignments||{}))if(snap.assignments[k]===id){delete snap.assignments[k];if(snap.locks)delete snap.locks[k];}snap.published=false;}state.requests=state.requests.filter(r=>r.shift!==id);invalidateAllPublished();logAction('Deleted unit/shift',code);renderAll();
}

function populatePersonSelects(){
  const opts=activeStaff().map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
  ['leavePerson','requestPerson','freePerson','swapPersonA','swapPersonB'].forEach(id=>{const el=$('#'+id);if(!el)return;const v=el.value;el.innerHTML=opts;if(activeStaff().some(p=>p.id===v))el.value=v;});
}
function populateRequestShifts(){const el=$('#requestShift'),v=el.value;el.innerHTML='<option value="">— Not specified —</option>'+state.shifts.map(s=>`<option value="${s.id}">${esc(s.code)} — ${esc(s.name)}</option>`).join('');if(state.shifts.some(s=>s.id===v))el.value=v;}

function renderRequests(){
  let t=$('#leaveTable'),h='<thead><tr><th colspan="7">Leave</th></tr><tr><th>Staff Member</th><th>From</th><th>To</th><th>Status</th><th>Days</th><th>Effect</th><th>Actions</th></tr></thead><tbody>';
  const {first:monthFirst,last:monthLast}=monthBounds();
  const visibleLeaves=state.leaves.filter(l=>l.to>=monthFirst&&l.from<=monthLast);
  for(const l of visibleLeaves){const days=Math.round((dateObj(l.to)-dateObj(l.from))/86400000)+1;h+=`<tr><td>${esc(personById(l.person)?.name||'—')}</td><td>${l.from}</td><td>${l.to}</td><td><span class="status-pill ${l.status==='approved'?'ok':'warn'}">${l.status==='approved'?'Approved':'Pending'}</span></td><td>${days}</td><td>${l.status==='approved'?'Hard unavailable':'Does not block roster yet'}</td><td><button class="mini-btn ${l.status==='approved'?'':'good'} toggle-leave" data-id="${l.id}">${l.status==='approved'?'Set Pending':'Approve'}</button><button class="mini-btn danger del-leave" data-id="${l.id}">Delete</button></td></tr>`;}
  h+='</tbody>';t.innerHTML=h;
  t.querySelectorAll('.toggle-leave').forEach(b=>b.onclick=()=>{const l=state.leaves.find(x=>x.id===b.dataset.id);if(!l)return;l.status=l.status==='approved'?'pending':'approved';if(l.status==='approved')invalidatePublishedRange(l.from,l.to);else state.published=false;logAction('Leave status changed',`${personById(l.person)?.name||'Staff'}: ${l.status}`);renderAll();});
  t.querySelectorAll('.del-leave').forEach(b=>b.onclick=()=>{state.leaves=state.leaves.filter(x=>x.id!==b.dataset.id);state.published=false;renderAll();});

  const hasRoster=Object.keys(state.assignments).length>0;
  t=$('#requestTable');h='<thead><tr><th colspan="6">Exact Day / Shift Requests</th></tr><tr><th>Staff Member</th><th>Date</th><th>Type</th><th>Shift</th><th>Current Result</th><th>Actions</th></tr></thead><tbody>';
  const visibleRequests=state.requests.filter(r=>r.date.startsWith(state.month));
  for(const r of visibleRequests){const v=assigned(r.person,r.date),met=r.type==='off'?!v:r.type==='prefer'?v===r.shift:v!==r.shift;const result=hasRoster?(met?'Met':'Not met'):'Awaiting generation';const cls=!hasRoster?'warn':met?'ok':'warn';h+=`<tr><td>${esc(personById(r.person)?.name||'—')}</td><td>${r.date}</td><td>${r.type==='off'?'Prefer free day':r.type==='prefer'?'Prefer shift':'Avoid shift'}</td><td>${esc(shiftById(r.shift)?.code||'—')}</td><td><span class="request-result ${cls}">${result}</span></td><td><button class="mini-btn danger del-req" data-id="${r.id}">Delete</button></td></tr>`;}
  h+='</tbody>';t.innerHTML=h;t.querySelectorAll('.del-req').forEach(b=>b.onclick=()=>{state.requests=state.requests.filter(x=>x.id!==b.dataset.id);state.published=false;renderAll();});

  t=$('#freeRequestTable');h='<thead><tr><th colspan="7">Flexible Free-Day Requests</th></tr><tr><th>Staff Member</th><th>Requested</th><th>Window</th><th>Consecutive</th><th>Generated Free Dates</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
  const visibleFreeRequests=state.freeRequests.filter(r=>r.to>=monthFirst&&r.from<=monthLast);
  for(const r of visibleFreeRequests){const res=freeRequestResult(r);const result=hasRoster?(res.met?'Granted':'Needs re-optimization'):'Awaiting generation';const dates=hasRoster&&res.granted.length?res.granted.map(d=>Number(d.slice(8))).join(', '):'—';h+=`<tr><td>${esc(personById(r.person)?.name||'—')}</td><td>${r.days} day${Number(r.days)===1?'':'s'}</td><td>${r.from} → ${r.to}</td><td>${r.consecutive?'Yes':'No'}</td><td>${dates}</td><td><span class="request-result ${res.met&&hasRoster?'ok':'warn'}">${result}</span></td><td><button class="mini-btn danger del-free" data-id="${r.id}">Delete</button></td></tr>`;}
  h+='</tbody>';t.innerHTML=h;t.querySelectorAll('.del-free').forEach(b=>b.onclick=()=>{state.freeRequests=state.freeRequests.filter(x=>x.id!==b.dataset.id);state.published=false;renderAll();});
}

function syncDateInputs(){
  const {first,last}=monthBounds();
  const lf=$('#leaveFrom'),lt=$('#leaveTo');
  if(lf){lf.removeAttribute('min');lf.removeAttribute('max');if(!lf.value)lf.value=first;}
  if(lt){lt.removeAttribute('min');lt.removeAttribute('max');if(!lt.value)lt.value=last;}
  ['requestDate','freeFrom','freeTo','swapDateA','swapDateB','fixDayDate'].forEach(id=>{const el=$('#'+id);if(!el)return;el.min=first;el.max=last;if(!el.value||el.value<first||el.value>last)el.value=id==='freeTo'?last:first;});
}

function updateSwapPreviews(){
  const show=(personId,date,id)=>{const el=$(id);if(!el)return;const p=personById(personId),v=personId&&date?assigned(personId,date):'',s=shiftById(v);el.textContent=p&&date?(s?`${s.code} — ${s.name}`:'OFF / no assignment'):'Select a person and date';};
  show($('#swapPersonA')?.value,$('#swapDateA')?.value,'#swapCurrentA');show($('#swapPersonB')?.value,$('#swapDateB')?.value,'#swapCurrentB');
}

function validateSwap(sw){
  const A=personById(sw.personA),B=personById(sw.personB);if(!A||!B)return{ok:false,message:'Staff member no longer exists.'};if(A.id===B.id)return{ok:false,message:'Choose two different staff members.'};
  const ka=key(A.id,sw.dateA),kb=key(B.id,sw.dateB),shiftA=state.assignments[ka]||'',shiftB=state.assignments[kb]||'';
  if(!shiftA&&!shiftB)return{ok:false,message:'Neither selected source has an assignment to swap.'};
  const destA=key(B.id,sw.dateA),destB=key(A.id,sw.dateB);
  const affected=[ka,kb,destA,destB];if(affected.some(k=>state.locks[k]))return{ok:false,message:'A locked assignment is involved. Unlock it before swapping.'};
  if(sw.dateA!==sw.dateB&&assigned(B.id,sw.dateA))return{ok:false,message:`${B.name} already has an assignment on ${sw.dateA}.`};
  if(sw.dateA!==sw.dateB&&assigned(A.id,sw.dateB))return{ok:false,message:`${A.name} already has an assignment on ${sw.dateB}.`};
  const temp={...state.assignments};delete temp[ka];delete temp[kb];
  if(shiftA)temp[destA]=shiftA;if(shiftB)temp[destB]=shiftB;
  const before=auditAssignments(state.assignments),after=auditAssignments(temp);
  const newHard=after.violations.filter(v=>!before.violations.includes(v));
  if(after.open.length>before.open.length)return{ok:false,message:'This swap would create a new coverage gap.'};
  if(newHard.length)return{ok:false,message:newHard[0]};
  return{ok:true,message:'Valid: no new hard-rule or coverage problem detected.',temp,shiftA,shiftB};
}

function renderSwaps(){
  const t=$('#swapTable');let h='<thead><tr><th>Staff A</th><th>Date A</th><th>Staff B</th><th>Date B</th><th>Status</th><th>Validation</th><th>Actions</th></tr></thead><tbody>';
  for(const sw of state.swaps){const val=sw.status==='approved'?{ok:true,message:'Approved and applied.'}:validateSwap(sw);h+=`<tr><td>${esc(personById(sw.personA)?.name||'—')}</td><td>${sw.dateA}</td><td>${esc(personById(sw.personB)?.name||'—')}</td><td>${sw.dateB}</td><td><span class="status-pill ${sw.status==='approved'?'ok':'warn'}">${sw.status==='approved'?'Approved':'Pending'}</span></td><td class="${val.ok?'coverage-ok':'coverage-bad'}">${esc(val.message)}</td><td>${sw.status==='pending'&&val.ok?`<button class="mini-btn good approve-swap" data-id="${sw.id}">Approve</button>`:''}<button class="mini-btn danger del-swap" data-id="${sw.id}">Delete</button></td></tr>`;}
  h+='</tbody>';t.innerHTML=h;
  t.querySelectorAll('.approve-swap').forEach(b=>b.onclick=()=>approveSwap(b.dataset.id));t.querySelectorAll('.del-swap').forEach(b=>b.onclick=()=>{state.swaps=state.swaps.filter(x=>x.id!==b.dataset.id);renderAll();});
}

function approveSwap(id){
  const sw=state.swaps.find(x=>x.id===id);if(!sw)return;const val=validateSwap(sw);if(!val.ok)return alert(val.message);state.assignments=val.temp;sw.status='approved';sw.approvedAt=new Date().toLocaleString();state.published=false;logAction('Approved swap',`${personById(sw.personA)?.name||'Staff'} (${sw.dateA}) ⇄ ${personById(sw.personB)?.name||'Staff'} (${sw.dateB})`);renderAll();showAudit(auditSchedule(false));
}

function renderCounter(){
  const table=$('#shiftCounterTable');if(!table)return;
  const base=Math.max(0,Number(state.counterSettings?.baseShifts)||20),days=monthDates().length;
  const baseInput=$('#counterBaseShifts');if(baseInput&&document.activeElement!==baseInput)baseInput.value=base;
  const monthInput=$('#calcMonthDays');if(monthInput&&!monthInput.dataset.userEdited)monthInput.value=days;
  let h='<thead><tr><th>Staff</th><th>Group</th><th>Morning / Day Duties</th><th>On-Calls</th><th>Total Shift Credits</th><th>Approved Leave / TRA Days</th><th>Adjusted Required Credits</th><th>Difference</th><th>Max Credit Cap</th><th>Weekend Duties</th></tr></thead><tbody>';
  for(const p of activeStaff()){
    const c=countsFor(p.id),morning=c.raw-c.nights,leave=approvedLeaveDaysInCurrentMonth(p.id),target=adjustedShiftTarget(base,days,leave),diff=c.total-target;
    const diffText=diff===0?'On target':diff>0?`+${diff} over`:`${Math.abs(diff)} remaining`;
    const cls=diff===0?'coverage-ok':diff>0?'coverage-warn':'';
    const wi=workloadInfo(p);h+=`<tr><td><div class="counter-workload"><b>${esc(p.name)}</b><span class="workload-pill ${wi.cls}">${wi.label}</span></div></td><td>${esc(p.group||'')}</td><td>${morning}</td><td>${c.nights}</td><td><b>${c.total}</b></td><td>${leave}</td><td>${target}</td><td class="${cls}">${diffText}</td><td>${effectiveMax(p)}</td><td>${c.weekends}</td></tr>`;
  }
  h+='</tbody>';table.innerHTML=h;
  updateLeaveCalculator();
}
function updateLeaveCalculator(){
  const days=Math.max(1,Number($('#calcMonthDays')?.value)||monthDates().length),avg=Math.max(0,Number($('#calcAverageShifts')?.value)||0),leave=Math.max(0,Number($('#calcLeaveDays')?.value)||0);
  const result=adjustedShiftTarget(avg,days,leave);const out=$('#calcResult');if(out)out.textContent=result;
}

function renderRules(){
  $('#ruleMinUnitBlock').value=state.rules.minUnitBlock;
  $('#ruleConsecutive').value=state.rules.maxConsecutive;
  $('#ruleMaxAssignments').value=state.rules.maxAssignments;
  $('#ruleMaxNightCalls').value=state.rules.maxNightCalls;
  $('#ruleMinNightGapDays').value=minimumNightGapDays();
  $('#ruleNightRest').checked=state.rules.nightRest;
  $('#ruleFairGap').value=state.rules.fairGap;
  $('#ruleSaudiWeekend').checked=state.rules.saudiWeekend;
  const wc=$('#weekendCapSummary');if(wc)wc.textContent=`${weekendBlocksInMonth().length} weekends this month → hard max ${weekendCap()} per staff member`;
  const ww=$('#weekendPackageSummary');if(ww)ww.textContent=state.rules.saudiWeekend?'1 weekend on-call OR both Friday + Saturday day shifts':'1 weekend on-call OR both Saturday + Sunday day shifts';
}

function fairnessMetrics(assignments=state.assignments){
  const groups=[...new Set(activeStaff().map(p=>p.group))];
  const metrics={total:0,nights:0,fridays:0,saturdays:0,weekends:0};
  for(const g of groups){
    const members=activeStaff().filter(p=>p.group===g);
    if(members.length<2)continue;
    const vals=members.map(p=>countsFor(p.id,assignments));
    for(const k of Object.keys(metrics)){
      const arr=vals.map(v=>k==='nights'?v.nights:v[k]);
      if(k==='nights'){
        const eligible=members.filter(p=>standardNightIds.some(id=>p.eligible.includes(id)));
        if(eligible.length<2)continue;
        const ev=eligible.map(p=>countsFor(p.id,assignments).nights);
        metrics[k]=Math.max(metrics[k],Math.max(...ev)-Math.min(...ev));
      }else metrics[k]=Math.max(metrics[k],Math.max(...arr)-Math.min(...arr));
    }
  }
  const limit=Math.max(0,Number(state.rules.fairGap)||0);
  const ok=Object.values(metrics).every(v=>v<=limit);
  const penalty=Object.values(metrics).reduce((n,v)=>n+Math.max(0,v-limit),0);
  return{...metrics,limit,ok,penalty};
}

function renderFairness(){
  const t=$('#fairnessTable');let h='<thead><tr><th>Staff Member</th><th>Level</th><th>Shift Credits</th><th>Credit Cap</th><th>Raw Duties</th><th>On-Calls</th><th>Call Cap</th><th>Fridays</th><th>Saturdays</th><th>Weekend Days</th><th>Weekends Covered</th><th>Weekend Cap</th><th>Weekend Package</th><th>Flexible Requests</th></tr></thead><tbody>';
  for(const p of activeStaff()){
    const c=countsFor(p.id),fr=state.freeRequests.filter(r=>r.person===p.id),met=fr.filter(r=>freeRequestResult(r).met).length;
    const details=weekendDutyDetails(p.id),bad=details.filter(x=>!x.valid&&!x.boundary).length;
    const pkg=details.length?(bad?`${bad} needs review`:'Valid'):'—';
    h+=`<tr><td>${esc(p.name)}</td><td>${esc(p.level)}</td><td><b>${c.total}</b></td><td>${effectiveMax(p)}</td><td>${c.raw}</td><td>${c.nights}</td><td>${maxNightCalls()}</td><td>${c.fridays}</td><td>${c.saturdays}</td><td>${c.weekendDays}</td><td>${c.weekends}</td><td>${weekendCap()}</td><td>${esc(pkg)}</td><td>${fr.length?`${met}/${fr.length} granted`:'—'}</td></tr>`;
  }
  h+='</tbody>';t.innerHTML=h;
}

function renderSafety(){
  const audit=auditAssignments(state.assignments),pref=preferenceStats(),fm=fairnessMetrics();
  const hardNonCont=audit.violations.length-audit.continuityViolations.length;
  const items=[
    {title:'Daily Coverage',ok:audit.open.length===0,text:audit.open.length?`${audit.open.length} required slot${audit.open.length===1?'':'s'} open`:'All required slots covered'},
    {title:'Hard Safety Rules',ok:hardNonCont===0,text:hardNonCont?`${hardNonCont} hard violation${hardNonCont===1?'':'s'}`:'Leave, eligibility, post-call rest, and limits safe'},
    {title:'Shift-Credit Caps',ok:!activeStaff().some(p=>{const c=countsFor(p.id);return c.total>effectiveMax(p)||c.nights>maxNightCalls();}),text:`Day = 1 credit, on-call = 2 credits. Global max ${state.rules.maxAssignments} credits / ${state.rules.maxNightCalls} on-calls; lower individual caps still apply`},
    {title:'Weekend Limit — All Staff',ok:!activeStaff().some(p=>countsFor(p.id).weekends>weekendCap()||weekendDutyDetails(p.id).some(w=>!w.valid&&!w.boundary)),text:`${weekendBlocksInMonth().length}-weekend month → hard max ${weekendCap()} weekends for every staff member; each weekend = 1 on-call OR both weekend day shifts`},
    {title:'Weekend Capacity',ok:weekendCapacityAnalysis().deficit===0,warn:true,text:(()=>{const w=weekendCapacityAnalysis();return w.deficit?`${w.requiredPackages} weekend packages required vs ${w.strictCapacity} automatic capacity. Auto-Generate leaves ${w.deficit} weekend on-call slot${w.deficit===1?'':'s'} open for manual completion rather than assigning an automatic extra weekend.`:`The hard all-staff weekend cap is feasible with current weekend demand`;})()},
    {title:'Unit Continuity',ok:audit.continuityViolations.length===0,text:audit.continuityViolations.length?`${audit.continuityViolations.length} short rotation block${audit.continuityViolations.length===1?'':'s'}`:`Minimum ${state.rules.minUnitBlock}-day daytime blocks satisfied, including both PRU residents`},
    {title:'Overflow Priority',ok:!audit.open.length||overflowCoveredCount(state.assignments)===0,warn:true,text:audit.open.length?`${overflowCoveredCount(state.assignments)} overflow assignments; should be 0 until mandatory coverage is complete`:`${overflowCoveredCount(state.assignments)} ER/CCRT extra assignment${overflowCoveredCount(state.assignments)===1?'':'s'} added only after full mandatory coverage`},
    {title:'Requests',ok:pref.met===pref.total,warn:true,text:pref.total?`${pref.met}/${pref.total} preferences met`:'No requests entered'},
    {title:'Fairness',ok:fm.ok,warn:true,text:`Max group gaps — credits ${fm.total}, calls ${fm.nights}, Fri ${fm.fridays}, Sat ${fm.saturdays}, weekends ${fm.weekends} (target ≤ ${fm.limit})`},
    {title:'Publish Gate',ok:!audit.open.length&&!audit.violations.length,text:!audit.open.length&&!audit.violations.length?'Hard publish gate passed':'Resolve hard issues before publishing'}
  ];
  $('#safetyChecklist').innerHTML=items.map(i=>`<div class="safety-item ${i.ok?'ok':i.warn?'warn':'bad'}"><strong>${esc(i.title)}</strong><span>${esc(i.text)}</span></div>`).join('');

  const t=$('#coverageTable');let h='<thead><tr><th>Date</th><th>Day</th><th>Required</th><th>Covered</th><th>Missing</th><th>Overflow</th><th>Status / Reason</th><th>Action</th></tr></thead><tbody>';
  for(const d of monthDates()){
    let req=0,covered=0,missing=[];for(const s of mandatoryShifts()){const n=requiredCount(s,d),have=countShiftDate(state.assignments,d,s.id);req+=n;covered+=Math.min(n,have);if(have<n)for(let i=have;i<n;i++)missing.push(s.id);}
    const overflow=overflowShifts().map(s=>`${s.code}: ${countShiftDate(state.assignments,d,s.id)>=overflowTarget(s)?'covered':'—'}`).join(' → ')||'—';
    const status=missing.length?`<span class="status-pill bad">OPEN</span>`:`<span class="status-pill ok">Covered</span>`;
    const reason=missing.length?missing.map(id=>`${shiftById(id)?.code||id}: ${coverageReason(d,id)}`).join(' | '):'All mandatory units covered; ER is filled first when spare capacity exists, then CCRT.';
    h+=`<tr><td>${d}</td><td>${dayName(d)}</td><td>${req}</td><td>${covered}</td><td>${missing.map(id=>esc(shiftById(id)?.code||id)).join(', ')||'—'}</td><td>${esc(overflow)}</td><td>${status} <span class="muted">${esc(reason)}</span></td><td>${missing.length?`<button class="mini-btn good fix-coverage-day" data-date="${d}">Fix This Day</button>`:'—'}</td></tr>`;
  }
  h+='</tbody>';t.innerHTML=h;t.querySelectorAll('.fix-coverage-day').forEach(b=>b.onclick=()=>fixThisDay(b.dataset.date));

  const a=$('#activityTable');let ah='<thead><tr><th>Time</th><th>Action</th><th>Details</th></tr></thead><tbody>';
  if(!state.activity.length)ah+='<tr><td colspan="3" class="empty">No activity logged yet.</td></tr>';else for(const x of state.activity)ah+=`<tr><td>${esc(x.when)}</td><td><b>${esc(x.action)}</b></td><td>${esc(x.detail||'')}</td></tr>`;
  ah+='</tbody>';a.innerHTML=ah;
}

function updateStats(){
  const audit=auditAssignments(state.assignments),total=audit.totalSlots,open=audit.open.length,pref=preferenceStats(),hasRoster=Object.keys(state.assignments).length>0;
  $('#coverageStat').textContent=total?Math.round((total-open)*100/total)+'%':'100%';$('#coverageSub').textContent=`${total-open} of ${total} required slots covered`;$('#openStat').textContent=open;
  $('#continuityStat').textContent=!hasRoster?'—':audit.continuityViolations.length?'Needs Review':'Good';$('#continuitySub').textContent=!hasRoster?'Generate a roster to evaluate':audit.continuityViolations.length?`${audit.continuityViolations.length} short block${audit.continuityViolations.length===1?'':'s'}`:`≥ ${state.rules.minUnitBlock} days per daytime unit block`;
  $('#requestStat').textContent=!hasRoster?'—':pref.total?`${Math.round(pref.met*100/pref.total)}%`:'—';$('#requestSub').textContent=!hasRoster?'Generate a roster to evaluate':pref.total?`${pref.met}/${pref.total} requests met`:'No requests entered';
  const fm=fairnessMetrics();$('#fairnessStat').textContent=fm.ok?'Good':'Needs Review';$('#fairnessSub').textContent=`Group gaps — credits ${fm.total}, calls ${fm.nights}, Fri ${fm.fridays}, Sat ${fm.saturdays}`;
  $('#reoptimizeBtn').disabled=!Object.keys(state.assignments).length;
}

function updatePublish(){const b=$('#publishBadge');b.textContent=state.published?'Final':'Draft';b.className='badge '+(state.published?'published':'draft');$('#publishBtn').textContent=state.published?'Reopen Draft':'Publish Final Roster';}

async function clearAllShifts(){
  const total=Object.keys(state.assignments||{}).length;
  if(!total)return alert(`There are no roster assignments to clear for ${formatMonthLabel(state.month)}.`);
  const locked=Object.keys(state.locks||{}).filter(k=>state.locks[k]).length;
  const warning=`Clear ALL ${total} roster assignment${total===1?'':'s'} for ${formatMonthLabel(state.month)}?\n\nThis cannot be undone unless you restore a backup. It will also remove ${locked} cell lock${locked===1?'':'s'} and reopen the roster as Draft.\n\nStaff names, pager/phone numbers, leave/TRA, requests, rules, and other months will NOT be deleted.`;
  if(!confirm(warning))return;
  state.assignments={};state.locks={};state.published=false;editingCell=null;closeEditor();
  logAction('Cleared all shifts',`${formatMonthLabel(state.month)}: ${total} assignment${total===1?'':'s'} and ${locked} lock${locked===1?'':'s'} removed.`);
  renderAll();
  if(state.remotePortal?.portalId&&state.remotePortal?.active!==false){
    const ok=await syncStaffPortal(true,true);
    if(!ok)alert('The local roster was cleared, but the staff request portal is out of sync. Press Create / Sync Portal when the network is available.');
  }
}

function secureBackupPayload(){
  storeCurrentMonth();
  const copy=JSON.parse(JSON.stringify(state));
  // Request-portal credentials are deliberately excluded from exported backups.
  // If a backup is restored, the coordinator must explicitly create/sync new personal links.
  copy.remotePortal=null;
  for(const snap of Object.values(copy.monthStore||{}))if(snap&&typeof snap==='object')snap.remotePortal=null;
  copy.backupMeta={createdAt:new Date().toISOString(),portalCredentialsIncluded:false,notice:'Contains confidential roster/staff/leave data. Staff-request tokens are excluded.'};
  return copy;
}
function downloadBackup(){
  const warning='Download a roster backup?\n\nThe file contains confidential staff names, pager/phone numbers, leave/TRA, requests, and roster history. Store it securely.\n\nFor safety, staff-request portal admin/personal tokens will NOT be included; after restoring a backup you must create/sync new personal request links.';
  if(!confirm(warning))return;
  const payload=JSON.stringify(secureBackupPayload(),null,2),blob=new Blob([payload],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`ICU-Roster-Backup-${state.month}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  logAction('Downloaded secure backup',`${state.month}; portal credentials excluded.`);save();
}
function validateBackupState(parsed){
  if(!parsed||!Array.isArray(parsed.staff)||!Array.isArray(parsed.shifts))return{ok:false,message:'Invalid roster backup: staff and shift lists are required.'};
  const staffIds=new Set(parsed.staff.map(p=>p?.id).filter(Boolean)),shiftIds=new Set(parsed.shifts.map(sh=>sh?.id).filter(Boolean));
  if(staffIds.size!==parsed.staff.length)return{ok:false,message:'Invalid roster backup: every staff member must have a unique ID.'};
  if(shiftIds.size!==parsed.shifts.length)return{ok:false,message:'Invalid roster backup: every shift must have a unique ID.'};
  const checkAssignments=(assignments,label,activeIds)=>{
    for(const [k,sid] of Object.entries(assignments||{})){if(!sid)continue;const sep=k.indexOf('|');if(sep<1)return`Invalid assignment key in ${label}: ${k}`;const pid=k.slice(0,sep);if(!staffIds.has(pid))return`Unknown staff ${pid} referenced in ${label}.`;if(!shiftIds.has(sid))return`Unknown shift ${sid} referenced in ${label}.`;if(activeIds&&activeIds.size&&!activeIds.has(pid))return`Inactive staff ${pid} still has an assignment in ${label}.`; }return'';
  };
  const currentActive=Array.isArray(parsed.activeStaffIds)?new Set(parsed.activeStaffIds):null;let err=checkAssignments(parsed.assignments,'current roster',currentActive);if(err)return{ok:false,message:err};
  for(const [month,snap] of Object.entries(parsed.monthStore||{})){const active=Array.isArray(snap?.activeStaffIds)?new Set(snap.activeStaffIds):null;err=checkAssignments(snap?.assignments||{},`saved month ${month}`,active);if(err)return{ok:false,message:err};}
  const ruleCheck=validateRuleSet({...defaultState().rules,...(parsed.rules||{})});if(!ruleCheck.ok)return{ok:false,message:`Invalid roster rules in backup: ${ruleCheck.message}`};
  return{ok:true,message:''};
}
function restoreBackupFile(file){
  if(!file)return;
  const reader=new FileReader();reader.onload=()=>{try{const parsed=JSON.parse(String(reader.result||'')),valid=validateBackupState(parsed);if(!valid.ok)throw new Error(valid.message);if(!confirm('Restore this backup? Current local roster data will be replaced.'))return;state=normalizeState(parsed);loadMonthSnapshot(state.month);editingCell=null;editingStaff=null;editingShift=null;logAction('Restored backup',state.month);renderAll();}catch(e){alert('Could not restore backup: '+e.message);}};reader.readAsText(file);
}

function bind(){
  $('#monthPicker').addEventListener('change',e=>setRosterMonth(e.target.value));
  $('#officialMonthPicker').addEventListener('change',e=>setRosterMonth(e.target.value));
  $('#prevMonthBtn').addEventListener('click',()=>setRosterMonth(monthValueOffset(state.month,-1)));
  $('#nextMonthBtn').addEventListener('click',()=>setRosterMonth(monthValueOffset(state.month,1)));
  $('#generateBtn').onclick=()=>generate(false);$('#reoptimizeBtn').onclick=()=>generate(true);$('#autoBalanceBtn').onclick=autoBalanceUnlocked;$('#clearAllShiftsBtn').onclick=clearAllShifts;$('#newMonthBtn').onclick=openNewMonthWizard;$('#closeNewMonthBtn').onclick=()=>$('#newMonthWizard').classList.add('hidden');$('#wizardMonth').addEventListener('change',renderNewMonthWizard);$('#wizardSelectAll').onclick=()=>$$('#wizardStaffList input').forEach(x=>x.checked=true);$('#wizardClearAll').onclick=()=>$$('#wizardStaffList input').forEach(x=>x.checked=false);$('#createMonthBtn').onclick=createMonthFromWizard;$('#fixDayBtn').onclick=()=>fixThisDay($('#fixDayDate').value);$('#auditBtn').onclick=()=>auditSchedule(true);$('#printBtn').onclick=()=>window.print();
  $('#unitBlockBtn').onclick=openUnitBlockPanel;$('#closeUnitBlockBtn').onclick=()=>$('#unitBlockPanel').classList.add('hidden');$('#applyUnitBlockBtn').onclick=applyUnitBlock;['unitBlockStaff','unitBlockUnit','unitBlockStart','unitBlockLength'].forEach(id=>$('#'+id)?.addEventListener('change',()=>{if(id==='unitBlockStaff')populateUnitBlockControls();else updateUnitBlockPreview();}));
  $('#backupBtn').onclick=downloadBackup;$('#restoreBtn').onclick=()=>$('#restoreInput').click();$('#restoreInput').addEventListener('change',e=>{restoreBackupFile(e.target.files?.[0]);e.target.value='';});
  $('#publishBtn').onclick=()=>{const a=auditSchedule(false);if(!state.published&&(a.open.length||a.violations.length))return alert('Cannot publish yet. Resolve all open coverage slots and hard-rule violations first. Soft preferences may remain unmet.');state.published=!state.published;logAction(state.published?'Published roster':'Unpublished roster',state.month);renderAll();};
  $('#resetBtn').onclick=()=>{if(confirm('Reset all local data to the updated sample roster?')){state=defaultState();editingCell=null;logAction('Reset sample data','Restored default ICU units, rules, staff, and sample requests.');$('#monthPicker').value=state.month;renderAll();if(!Object.keys(state.assignments).length)generate(false);}};

  $('#saveCellBtn').onclick=()=>{if(!editingCell)return;const k=key(editingCell.person,editingCell.date),v=$('#editorShift').value,old=state.assignments[k]||'';if(v)state.assignments[k]=v;else delete state.assignments[k];if($('#editorLock').checked&&v)state.locks[k]=true;else delete state.locks[k];state.published=false;logAction('Manual roster edit',`${personById(editingCell.person)?.name||'Staff'} ${editingCell.date}: ${shiftById(old)?.code||'OFF'} → ${shiftById(v)?.code||'OFF'}${state.locks[k]?' (locked)':''}`);closeEditor();renderAll();};
  $('#clearCellBtn').onclick=()=>{if(!editingCell)return;const k=key(editingCell.person,editingCell.date),old=state.assignments[k]||'';delete state.assignments[k];delete state.locks[k];state.published=false;logAction('Cleared assignment',`${personById(editingCell.person)?.name||'Staff'} ${editingCell.date}: ${shiftById(old)?.code||'OFF'}`);closeEditor();renderAll();};$('#closeEditorBtn').onclick=closeEditor;

  $('#staffSheetBtn').onclick=()=>{const f=$('#staffSheetForm');f.classList.toggle('hidden');if(!f.classList.contains('hidden'))renderStaffSheet();};
  $('#closeStaffSheetBtn').onclick=()=>$('#staffSheetForm').classList.add('hidden');
  $('#saveStaffSheetBtn').onclick=saveStaffSheetChanges;
  $('#removeSelectedStaffBtn').onclick=removeSelectedStaffFromMonth;$('#sheetRemoveSelectedBtn').onclick=removeSelectedStaffFromMonth;$('#deleteSelectedStaffBtn').onclick=deleteSelectedStaff;$('#sheetDeleteSelectedBtn').onclick=deleteSelectedStaff;
  $('#sheetSelectAllBtn').onclick=()=>{state.staff.forEach(p=>selectedStaffIds.add(p.id));renderStaff();renderStaffSheet();};
  $('#sheetClearSelectionBtn').onclick=()=>{selectedStaffIds.clear();renderStaff();renderStaffSheet();};
  $('#bulkStaffBtn').onclick=()=>{const f=$('#bulkStaffForm');f.classList.toggle('hidden');if(!f.classList.contains('hidden')){$('#bulkStaffText').focus();renderBulkStaffPreview();}};
  $('#bulkStaffText').addEventListener('input',renderBulkStaffPreview);
  ['bulkStaffLevel','bulkStaffGroup','bulkStaffMax','bulkAutoDetect'].forEach(id=>$('#'+id).addEventListener('change',renderBulkStaffPreview));
  $('#importBulkStaffBtn').onclick=importBulkStaff;
  $('#clearBulkStaffBtn').onclick=()=>{$('#bulkStaffText').value='';renderBulkStaffPreview();$('#bulkStaffText').focus();};
  $('#cancelBulkStaffBtn').onclick=()=>$('#bulkStaffForm').classList.add('hidden');
  $('#addStaffBtn').onclick=()=>openStaffForm();$('#cancelStaffBtn').onclick=()=>$('#staffForm').classList.add('hidden');
  $('#staffEligibleAll').addEventListener('change',e=>{$$('#staffEligible input[type="checkbox"]').forEach(x=>x.checked=e.target.checked);e.target.indeterminate=false;});
  $('#staffEligible').addEventListener('change',syncStaffEligibleAllState);
  $('#staffLevel').addEventListener('change',()=>{const next=$('#staffLevel').value,prev=$('#staffLevel').dataset.previousLevel||next,current=$$('#staffEligible input:checked').map(x=>x.value);if(!editingStaff||eligibilityMatchesDefault(current,prev))applyEligibilityChecks(defaultEligibilityFor(next));$('#staffLevel').dataset.previousLevel=next;});
  $('#saveStaffBtn').onclick=()=>{const name=$('#staffName').value.trim();if(!name)return alert('Enter a staff member name.');if(staffNameConflict(name,editingStaff||''))return alert('A staff member with this name already exists. Use a unique name or edit the existing staff record.');const eligible=$$('#staffEligible input:checked').map(x=>x.value);if(!eligible.length&&!confirm(`${name} has no eligible units or shifts and cannot be scheduled. Save anyway?`))return;const activeThisMonth=$('#staffActiveMonth').checked,obj={id:editingStaff||uid('p'),name,level:$('#staffLevel').value,group:$('#staffGroup').value.trim(),pager:$('#staffPager').value.trim(),max:Math.max(1,Math.min(31,Number($('#staffMax').value)||16)),eligible};if(editingStaff){const wasActive=isActiveStaff(editingStaff),assignedCount=Object.keys(state.assignments).filter(k=>k.startsWith(editingStaff+'|')&&state.assignments[k]).length;if(wasActive&&!activeThisMonth&&assignedCount&&!confirm(`Mark ${name} inactive for ${formatMonthLabel(state.month)}?

${assignedCount} current-month assignment${assignedCount===1?'':'s'} will be cleared. Other months remain unchanged.`))return;const i=state.staff.findIndex(x=>x.id===editingStaff);state.staff[i]=obj;setStaffActiveForCurrentMonth(obj.id,activeThisMonth);logAction('Updated staff member',`${name}${activeThisMonth?' · active this month':' · inactive this month'}`);}else{addStaffToCurrentMonth(obj,activeThisMonth);logAction('Added staff member',`${name}${activeThisMonth?' · active this month':' · master list only'}`);}state.published=false;$('#staffForm').classList.add('hidden');editingStaff=null;renderAll();syncCurrentPortalAfterStaffChange();};

  $('#addShiftBtn').onclick=()=>openShiftForm();$('#cancelShiftBtn').onclick=()=>$('#shiftForm').classList.add('hidden');$('#shiftType').addEventListener('change',syncShiftContinuityControl);
  $('#saveShiftBtn').onclick=()=>{const code=$('#shiftCode').value.trim().toUpperCase(),name=$('#shiftName').value.trim();if(!code||!name)return alert('Enter both the code and unit/shift name.');const type=$('#shiftType').value,existing=editingShift?shiftById(editingShift):null,obj={id:editingShift||uid('s'),code,name,type,weekday:Math.max(0,Number($('#shiftWeekday').value)||0),weekend:Math.max(0,Number($('#shiftWeekend').value)||0),continuity:type==='day'&&$('#shiftContinuity').checked,...(existing?.overflowPriority?{overflowPriority:existing.overflowPriority,overflowTarget:existing.overflowTarget||1}:{})};if(editingShift){const i=state.shifts.findIndex(x=>x.id===editingShift);state.shifts[i]=obj;logAction('Updated unit/shift',`${code} — ${name}`);}else{state.shifts.push(obj);logAction('Added unit/shift',`${code} — ${name}`);}invalidateAllPublished();$('#shiftForm').classList.add('hidden');editingShift=null;renderAll();};

  $('#addLeaveBtn').onclick=()=>{const person=$('#leavePerson').value,from=$('#leaveFrom').value,to=$('#leaveTo').value;if(!person||!from||!to||to<from)return alert('Check the staff member and leave dates.');const l={id:uid('l'),person,from,to,status:$('#leaveStatus').value};state.leaves.push(l);if(l.status==='approved')invalidatePublishedRange(from,to);else state.published=false;logAction('Added leave',`${personById(person)?.name||'Staff'}: ${from} to ${to} (${l.status})`);renderAll();};
  $('#addRequestBtn').onclick=()=>{const person=$('#requestPerson').value,date=$('#requestDate').value,type=$('#requestType').value,shift=$('#requestShift').value;if(!person||!date)return alert('Select a staff member and date.');if((type==='prefer'||type==='avoid')&&!shift)return alert('Select the preferred or avoided shift.');state.requests.push({id:uid('q'),person,date,type,shift:type==='off'?'':shift});state.published=false;logAction('Added exact request',`${personById(person)?.name||'Staff'}: ${type} on ${date}`);renderAll();};
  $('#addFreeRequestBtn').onclick=()=>{const person=$('#freePerson').value,days=Math.max(1,Math.min(10,Number($('#freeDays').value)||1)),from=$('#freeFrom').value,to=$('#freeTo').value;if(!person||!from||!to||to<from)return alert('Check the staff member and free-day date window.');if((dateObj(to)-dateObj(from))/86400000+1<days)return alert('The selected date window is shorter than the requested number of free days.');state.freeRequests.push({id:uid('f'),person,days,from,to,consecutive:$('#freeConsecutive').checked});state.published=false;logAction('Added flexible free-day request',`${personById(person)?.name||'Staff'}: ${days}${$('#freeConsecutive').checked?' consecutive':''} free day${days===1?'':'s'} between ${from} and ${to}`);renderAll();};

  $('#addSwapBtn').onclick=()=>{const personA=$('#swapPersonA').value,personB=$('#swapPersonB').value,dateA=$('#swapDateA').value,dateB=$('#swapDateB').value;if(!personA||!personB||!dateA||!dateB)return alert('Select both staff members and both dates.');const sw={id:uid('sw'),personA,personB,dateA,dateB,status:'pending'};const val=validateSwap(sw);state.swaps.unshift(sw);logAction('Created swap request',`${personById(personA)?.name||'Staff'} (${dateA}) ⇄ ${personById(personB)?.name||'Staff'} (${dateB}) — ${val.ok?'valid':'needs review'}`);renderAll();if(!val.ok)alert('Swap request saved, but it cannot be approved yet: '+val.message);};
  ['swapPersonA','swapPersonB','swapDateA','swapDateB'].forEach(id=>$('#'+id).addEventListener('change',updateSwapPreviews));

  ['ruleMinUnitBlock','ruleConsecutive','ruleMaxAssignments','ruleMaxNightCalls','ruleMinNightGapDays','ruleNightRest','ruleFairGap','ruleSaudiWeekend'].forEach(id=>$('#'+id).addEventListener('change',()=>{
    state.rules.minUnitBlock=Math.max(1,Math.min(7,Number($('#ruleMinUnitBlock').value)||3));
    state.rules.maxConsecutive=Math.max(1,Math.min(12,Number($('#ruleConsecutive').value)||6));
    state.rules.maxAssignments=Math.max(1,Math.min(31,Number($('#ruleMaxAssignments').value)||18));
    state.rules.maxNightCalls=Math.max(1,Math.min(15,Number($('#ruleMaxNightCalls').value)||6));
    state.rules.minNightGapDays=Math.max(3,Math.min(14,Number($('#ruleMinNightGapDays').value)||3));
    state.rules.nightRest=$('#ruleNightRest').checked;
    state.rules.fairGap=Math.max(0,Math.min(10,Number($('#ruleFairGap').value)||0));
    state.rules.saudiWeekend=$('#ruleSaudiWeekend').checked;
    const ruleCheck=validateRuleSet(state.rules);if(!ruleCheck.ok){alert(ruleCheck.message);state.rules.maxConsecutive=Math.max(state.rules.maxConsecutive,state.rules.minUnitBlock);renderRules();return;}
    invalidateAllPublished();
    logAction('Updated scheduling rules',`Unit block ≥${state.rules.minUnitBlock} days; max ${state.rules.maxAssignments} shift credits (day=1/on-call=2); max ${state.rules.maxNightCalls} on-calls; on-call spacing ≥${minimumNightGapDays()} calendar days; all-staff weekend cap ${weekendCap()}; max consecutive ${state.rules.maxConsecutive}; protected post-call day ${state.rules.nightRest?'on':'off'}.`);
    renderAll();
  }));
  ['calcMonthDays','calcAverageShifts','calcLeaveDays'].forEach(id=>$('#'+id)?.addEventListener('input',e=>{if(id==='calcMonthDays')e.target.dataset.userEdited='1';updateLeaveCalculator();}));
  $('#calcUseCurrentMonthBtn')?.addEventListener('click',()=>{const el=$('#calcMonthDays');el.value=monthDates().length;delete el.dataset.userEdited;updateLeaveCalculator();});
  $('#calcSetCounterBaseBtn')?.addEventListener('click',()=>{state.counterSettings.baseShifts=Math.max(0,Number($('#calcAverageShifts').value)||0);renderCounter();save();});
  $('#counterBaseShifts')?.addEventListener('change',()=>{state.counterSettings.baseShifts=Math.max(0,Math.min(40,Number($('#counterBaseShifts').value)||0));renderCounter();save();});
  $('#syncPortalBtn').onclick=()=>syncStaffPortal(true,true);
  $('#refreshRemoteRequestsBtn').onclick=refreshRemoteRequests;
  $('#regenerateStaffLinksBtn').onclick=regenerateStaffLinks;
  $('#deactivatePortalBtn').onclick=deactivateStaffPortal;
  $('#portalStaffSelect').addEventListener('change',renderPortalStatus);
  $('#copyRequestLinkBtn').onclick=async()=>{const link=portalLink();if(!link)return alert('Create/sync the staff request portal and select a staff member first.');if(state.remotePortal?.active===false)return alert('The request portal is deactivated. Reactivate it with Create / Sync Portal before sharing links.');try{await navigator.clipboard.writeText(link);$('#portalStatus').textContent='Personal request link copied for '+(personById($('#portalStaffSelect').value)?.name||'staff')+'.';$('#portalStatus').className='portal-status ok';}catch(e){const input=$('#staffRequestLink');input.focus();input.select();alert('Copy the selected personal link and send it only to that staff member.');}};
  $('#clearLogBtn').onclick=()=>{if(confirm('Clear the local activity log?')){state.activity=[];renderAll();}};
}

$('#monthPicker').value=state.month;
bind();
renderAll();
})();
