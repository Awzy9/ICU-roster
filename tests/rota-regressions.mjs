import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {solveRosterFast}=require('../roster-solver-worker.js');

function loadApp(overrides={}){
  let src=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
  const trailer="$('#monthPicker').value=state.month;\nbind();\nrenderAll();\n})();";
  assert.ok(src.includes(trailer),'test harness could not find app bootstrap');
  src=src.replace(trailer,`globalThis.__rotaTest={
    getState:()=>state,
    setState:(s)=>{state=normalizeState(s);loadMonthSnapshot(state.month);},
    defaultState,normalizeState,weekendCapApplies,weekendCap,weekendDutyDetails,
    auditAssignments,countShiftDate,candidateHard,requiredCount,activeStaff,personById,shiftById,isWeekend,
    validateRuleSet:typeof validateRuleSet==='function'?validateRuleSet:undefined,
    validateBackupState:typeof validateBackupState==='function'?validateBackupState:undefined,
    minimumNightGapDays:typeof minimumNightGapDays==='function'?minimumNightGapDays:undefined,
    callRosterSolver:typeof callRosterSolver==='function'?callRosterSolver:undefined,
    callServerRosterSolver:typeof callServerRosterSolver==='function'?callServerRosterSolver:undefined,
    defaultEligibilityFor:typeof defaultEligibilityFor==='function'?defaultEligibilityFor:undefined,
    staffNameConflict:typeof staffNameConflict==='function'?staffNameConflict:undefined,
    addStaffToCurrentMonth:typeof addStaffToCurrentMonth==='function'?addStaffToCurrentMonth:undefined,
    removeStaffIdsFromCurrentMonth:typeof removeStaffIdsFromCurrentMonth==='function'?removeStaffIdsFromCurrentMonth:undefined,
    setStaffActiveForCurrentMonth:typeof setStaffActiveForCurrentMonth==='function'?setStaffActiveForCurrentMonth:undefined,
    purgeStaffIds:typeof purgeStaffIds==='function'?purgeStaffIds:undefined,
    weekendCapacityAnalysis:typeof weekendCapacityAnalysis==='function'?weekendCapacityAnalysis:undefined,
    buildSolverPayload:typeof buildSolverPayload==='function'?buildSolverPayload:undefined,
    remoteRequestSummary,remoteRequestLabel,remoteRequestBadge,isExtraRequest,assignMaxCoverage,buildFlexPlan,hasExplicitMax,maxCount,monthStartContinuityLocks,buildWorkbookSheets,portalPublicLink,hexToBase64Url
  };
})();`);
  const sandbox={console,setTimeout,clearTimeout,TextEncoder,TextDecoder,URL,Blob,crypto:globalThis.crypto,
    localStorage:{getItem(){return null},setItem(){}},document:{querySelector(){return null},querySelectorAll(){return[]},body:{appendChild(){}}},
    window:{},location:{protocol:'https:',href:'https://example.test/index.html'},navigator:{clipboard:{writeText:async()=>{}}},alert(){},confirm(){return true},fetch:overrides.fetch||(async()=>{throw new Error('unexpected fetch')}),Worker:overrides.Worker,btoa:globalThis.btoa,atob:globalThis.atob,IcuXlsx:require('../xlsx-export.js')};
  sandbox.globalThis=sandbox;vm.createContext(sandbox);vm.runInContext(src,sandbox,{filename:'app.js'});return sandbox.__rotaTest;
}
function baseState(api){const s=api.defaultState();s.monthStore={};s.assignments={};s.locks={};s.swaps=[];s.published=false;return s;}
const tests=[];const test=(n,f)=>tests.push([n,f]);

test('weekend cap applies to fellows and rotators as well as residents',()=>{
  const api=loadApp();for(const level of ['R1','R2','Fellow','Rotator'])assert.equal(api.weekendCapApplies({level}),true);
});

test('inactive staff assignments do not satisfy mandatory coverage and are hard violations',()=>{
  const api=loadApp(),s=baseState(api);
  s.staff=[{id:'active',name:'Active',level:'R1',group:'ICU',max:31,pager:'',eligible:['sA']},{id:'inactive',name:'Inactive',level:'R1',group:'ICU',max:31,pager:'',eligible:['sA']}];
  s.activeStaffIds=['active'];s.shifts=[{id:'sA',code:'A',name:'A',type:'day',weekday:1,weekend:1,continuity:false}];s.assignments={'inactive|2026-09-01':'sA'};
  s.monthStore={'2026-09':{assignments:{...s.assignments},locks:{},swaps:[],published:false,activeStaffIds:['active'],remotePortal:null}};api.setState(s);
  assert.equal(api.countShiftDate(api.getState().assignments,'2026-09-01','sA'),0);
  const au=api.auditAssignments(api.getState().assignments);assert.ok(au.open.some(x=>x.date==='2026-09-01'&&x.shift==='sA'));assert.ok(au.violations.some(v=>/inactive staff/i.test(v)));
});

test('rule validation rejects minimum continuity longer than maximum consecutive work',()=>{
  const api=loadApp();assert.equal(typeof api.validateRuleSet,'function');const r=api.validateRuleSet({minUnitBlock:7,maxConsecutive:4,maxAssignments:18,maxNightCalls:6,minNightGapDays:3});assert.equal(r.ok,false);assert.match(r.message,/continuity/i);
});

test('on-call duties less than 3 calendar days apart are rejected by local audit',()=>{
  const api=loadApp(),s=baseState(api);s.staff=[{id:'p',name:'P',level:'R1',group:'ICU',max:31,pager:'',eligible:['n']}];s.activeStaffIds=['p'];
  s.shifts=[{id:'n',code:'N',name:'Night',type:'night',weekday:0,weekend:0,continuity:false}];s.rules={...s.rules,minNightGapDays:3};s.assignments={'p|2026-09-01':'n','p|2026-09-03':'n'};
  s.monthStore={'2026-09':{assignments:{...s.assignments},locks:{},swaps:[],published:false,activeStaffIds:['p'],remotePortal:null}};api.setState(s);
  assert.ok(api.auditAssignments(api.getState().assignments).violations.some(v=>/on-call spacing/i.test(v)));
});

test('fast worker rejects contradictory continuity settings before solving',()=>{
  assert.throws(()=>solveRosterFast({month:'2026-09',staff:[{id:'p',level:'R1',max:31,eligible:['d','n']}],shifts:[{id:'d',type:'day',weekday:1,weekend:1},{id:'n',type:'night',weekday:1,weekend:1}],leaves:[],requests:[],freeRequests:[],rules:{minUnitBlock:7,maxConsecutive:4,maxAssignments:31,maxNightCalls:15,saudiWeekend:true,nightRest:true,minNightGapDays:3},lockedAssignments:{}}),/continuity|consecutive/i);
});

test('fast worker rejects locked on-calls that are less than 3 calendar days apart',()=>{
  const payload={month:'2026-09',staff:[{id:'p',level:'R1',max:31,eligible:['d','n']}],shifts:[{id:'d',type:'day',weekday:0,weekend:0,continuity:false},{id:'n',type:'night',weekday:0,weekend:0,continuity:false}],leaves:[],requests:[],freeRequests:[],rules:{minUnitBlock:1,maxConsecutive:12,maxAssignments:31,maxNightCalls:15,saudiWeekend:true,nightRest:true,minNightGapDays:3},lockedAssignments:{'p|2026-09-01':'n','p|2026-09-03':'n'}};
  assert.throws(()=>solveRosterFast(payload),/on-call spacing|calendar days apart/i);
});


test('roster solver uses server first and normalizes intentional weekend gaps',async()=>{
  const calls=[];
  const api=loadApp({fetch:async(url,opts)=>{calls.push({url,opts});return{ok:true,status:200,text:async()=>JSON.stringify({ok:true,assignments:{'r2a|2026-09-01':'sA'},intentionalOpen:[{date:'2026-09-04',shift:'sGR'}],source:'server-v5'})};}});
  const s=baseState(api);s.staff=[{id:'r2a',name:'R2 A',level:'R2',group:'ICU',max:31,pager:'',eligible:['sA','sGR']}];s.activeStaffIds=['r2a'];
  s.shifts=[{id:'sA',code:'A',name:'A',type:'day',weekday:0,weekend:0,continuity:false},{id:'sGR',code:'GR',name:'GR',type:'night',weekday:0,weekend:0,continuity:false}];
  s.monthStore={'2026-09':{assignments:{},locks:{},swaps:[],published:false,activeStaffIds:['r2a'],remotePortal:null}};api.setState(s);
  const out=await api.callRosterSolver(false);assert.equal(calls.length,1);assert.equal(JSON.stringify(out.plannedOpen),JSON.stringify([{date:'2026-09-04',shift:'sGR'}]));assert.equal(out.source,'server-v5');
});

test('backup validation rejects unknown staff and shift references',()=>{
  const api=loadApp();assert.equal(typeof api.validateBackupState,'function');const s=baseState(api);s.staff=[{id:'p',name:'P',level:'R1',group:'ICU',max:18,pager:'',eligible:['sA']}];s.shifts=[{id:'sA',code:'A',name:'A',type:'day',weekday:1,weekend:1,continuity:false}];s.assignments={'ghost|2026-09-01':'sA','p|2026-09-02':'missing'};s.monthStore={'2026-09':{assignments:{...s.assignments},locks:{},swaps:[],published:false,activeStaffIds:['p'],remotePortal:null}};
  const r=api.validateBackupState(s);assert.equal(r.ok,false);assert.match(r.message,/unknown staff|unknown shift/i);
});


test('month membership is explicit so later staff additions cannot appear in older months',()=>{
  const api=loadApp();const legacy=api.defaultState();legacy.activeStaffIds=null;
  legacy.monthStore={'2026-08':{assignments:{},locks:{},swaps:[],published:true,activeStaffIds:null,remotePortal:null}};
  const normalized=api.normalizeState(legacy);
  assert.ok(Array.isArray(normalized.activeStaffIds));
  assert.ok(Array.isArray(normalized.monthStore['2026-08'].activeStaffIds));
  const oldIds=[...normalized.monthStore['2026-08'].activeStaffIds];
  normalized.staff.push({id:'newbie',name:'New Person',level:'R1',group:'ICU',max:18,pager:'',eligible:['sA']});
  assert.equal(oldIds.includes('newbie'),false);
  assert.equal(normalized.monthStore['2026-08'].activeStaffIds.includes('newbie'),false);
});

test('manual staff defaults are schedulable according to level',()=>{
  const api=loadApp();assert.equal(typeof api.defaultEligibilityFor,'function');
  const r1=api.defaultEligibilityFor('R1'),r2=api.defaultEligibilityFor('R2'),rot=api.defaultEligibilityFor('Rotator');
  assert.ok(r1.length>0);assert.ok(r2.length>=r1.length);assert.ok(rot.length>0);
  assert.ok(r1.includes('sMT')&&r1.includes('sGR'));assert.ok(!r1.includes('sKA'));
  assert.ok(r2.includes('sKA'));assert.ok(!rot.includes('sMT'));
});

test('duplicate manual staff names are detected case-insensitively',()=>{
  const api=loadApp();assert.equal(typeof api.staffNameConflict,'function');const s=baseState(api);
  s.staff=[{id:'a',name:'Dr Example',level:'R1',group:'ICU',max:18,pager:'',eligible:['sA']}];s.activeStaffIds=['a'];
  s.monthStore={'2026-09':{assignments:{},locks:{},swaps:[],published:false,activeStaffIds:['a'],remotePortal:null}};api.setState(s);
  assert.equal(api.staffNameConflict(' dr example '),true);assert.equal(api.staffNameConflict('Dr Example','a'),false);
});

test('adding staff activates only the current month and leaves older month membership unchanged',()=>{
  const api=loadApp();assert.equal(typeof api.addStaffToCurrentMonth,'function');const s=baseState(api);
  s.staff=[{id:'a',name:'A',level:'R1',group:'ICU',max:18,pager:'',eligible:['sA']}];s.activeStaffIds=['a'];
  s.monthStore={'2026-08':{assignments:{},locks:{},swaps:[],published:true,activeStaffIds:['a'],remotePortal:null},'2026-09':{assignments:{},locks:{},swaps:[],published:false,activeStaffIds:['a'],remotePortal:null}};api.setState(s);
  api.addStaffToCurrentMonth({id:'b',name:'B',level:'R1',group:'ICU',max:18,pager:'',eligible:['sA']});
  assert.ok(api.getState().staff.some(p=>p.id==='b'));assert.ok(api.getState().activeStaffIds.includes('b'));
  assert.deepEqual([...api.getState().monthStore['2026-08'].activeStaffIds],['a']);assert.equal(api.getState().monthStore['2026-08'].published,true);
});

test('removing staff from current month preserves master record and historical roster data',()=>{
  const api=loadApp();assert.equal(typeof api.removeStaffIdsFromCurrentMonth,'function');const s=baseState(api);
  s.staff=[{id:'a',name:'A',level:'R1',group:'ICU',max:18,pager:'',eligible:['sA']},{id:'b',name:'B',level:'R1',group:'ICU',max:18,pager:'',eligible:['sA']}];s.activeStaffIds=['a','b'];
  s.assignments={'b|2026-09-01':'sA'};s.locks={'b|2026-09-01':true};s.swaps=[{id:'sw',personA:'b',personB:'a',dateA:'2026-09-01',dateB:'2026-09-02',status:'pending'}];
  s.remotePortal={portalId:'p',adminToken:'x',month:'2026-09',staffTokens:{a:'ta',b:'tb'},active:true};
  s.monthStore={'2026-08':{assignments:{'b|2026-08-01':'sA'},locks:{'b|2026-08-01':true},swaps:[],published:true,activeStaffIds:['a','b'],remotePortal:{portalId:'old',adminToken:'y',month:'2026-08',staffTokens:{a:'oa',b:'ob'},active:true}},'2026-09':{assignments:{...s.assignments},locks:{...s.locks},swaps:[...s.swaps],published:false,activeStaffIds:['a','b'],remotePortal:s.remotePortal}};api.setState(s);
  api.removeStaffIdsFromCurrentMonth(['b']);const out=api.getState();
  assert.ok(out.staff.some(p=>p.id==='b'));assert.equal(out.activeStaffIds.includes('b'),false);assert.equal(out.assignments['b|2026-09-01'],undefined);assert.equal(out.locks['b|2026-09-01'],undefined);assert.equal(out.swaps.length,0);assert.equal(out.remotePortal.staffTokens.b,undefined);
  assert.equal(out.monthStore['2026-08'].assignments['b|2026-08-01'],'sA');assert.equal(out.monthStore['2026-08'].published,true);assert.ok(out.monthStore['2026-08'].activeStaffIds.includes('b'));assert.equal(out.monthStore['2026-08'].remotePortal.staffTokens.b,'ob');
});

test('reactivating staff affects only the selected month',()=>{
  const api=loadApp();assert.equal(typeof api.setStaffActiveForCurrentMonth,'function');const s=baseState(api);
  s.staff=[{id:'a',name:'A',level:'R1',group:'ICU',max:18,pager:'',eligible:['sA']},{id:'b',name:'B',level:'R1',group:'ICU',max:18,pager:'',eligible:['sA']}];s.activeStaffIds=['a'];
  s.monthStore={'2026-08':{assignments:{},locks:{},swaps:[],published:true,activeStaffIds:['a'],remotePortal:null},'2026-09':{assignments:{},locks:{},swaps:[],published:false,activeStaffIds:['a'],remotePortal:null}};api.setState(s);
  api.setStaffActiveForCurrentMonth('b',true);assert.ok(api.getState().activeStaffIds.includes('b'));assert.deepEqual([...api.getState().monthStore['2026-08'].activeStaffIds],['a']);
});

test('weekend capacity ignores active staff who cannot cover any mandatory weekend duty',()=>{
  const api=loadApp();assert.equal(typeof api.weekendCapacityAnalysis,'function');const s=baseState(api);
  s.staff=[{id:'none',name:'None',level:'R1',group:'ICU',max:31,pager:'',eligible:[]},{id:'usable',name:'Usable',level:'R1',group:'ICU',max:31,pager:'',eligible:['sA']}];s.activeStaffIds=['none','usable'];
  s.shifts=[{id:'sA',code:'A',name:'A',type:'day',weekday:1,weekend:1,continuity:false}];s.monthStore={'2026-09':{assignments:{},locks:{},swaps:[],published:false,activeStaffIds:['none','usable'],remotePortal:null}};api.setState(s);
  const w=api.weekendCapacityAnalysis();assert.equal(w.eligibleStaff,1);assert.equal(w.strictCapacity,api.weekendCap());
});

test('permanent purge uses unified cleanup including membership and cached portal tokens',()=>{
  const api=loadApp();assert.equal(typeof api.purgeStaffIds,'function');const s=baseState(api);
  s.staff=[{id:'a',name:'A',level:'R1',group:'ICU',max:18,pager:'',eligible:['sA']},{id:'b',name:'B',level:'R1',group:'ICU',max:18,pager:'',eligible:['sA']}];s.activeStaffIds=['a','b'];s.remotePortal={portalId:'p',adminToken:'x',month:'2026-09',staffTokens:{a:'ta',b:'tb'},active:true};
  s.monthStore={'2026-08':{assignments:{'b|2026-08-01':'sA'},locks:{},swaps:[],published:true,activeStaffIds:['a','b'],remotePortal:{portalId:'old',adminToken:'y',month:'2026-08',staffTokens:{a:'oa',b:'ob'},active:true}},'2026-09':{assignments:{},locks:{},swaps:[],published:false,activeStaffIds:['a','b'],remotePortal:s.remotePortal}};api.setState(s);
  api.purgeStaffIds(['b']);const out=api.getState();assert.equal(out.staff.some(p=>p.id==='b'),false);assert.equal(out.activeStaffIds.includes('b'),false);assert.equal(out.remotePortal.staffTokens.b,undefined);assert.equal(out.monthStore['2026-08'].remotePortal.staffTokens.b,undefined);
});


test('solver payload excludes inactive staff requests and hard free-day requests',()=>{
  const api=loadApp();assert.equal(typeof api.buildSolverPayload,'function');const s=baseState(api);
  s.staff=[{id:'a',name:'A',level:'R1',group:'ICU',max:18,pager:'',eligible:['sA']},{id:'b',name:'B',level:'R1',group:'ICU',max:18,pager:'',eligible:['sA']}];s.activeStaffIds=['a'];
  s.shifts=[{id:'sA',code:'A',name:'A',type:'day',weekday:1,weekend:1,continuity:false}];
  s.requests=[{id:'q1',person:'b',date:'2026-09-05',type:'off',shift:''},{id:'q2',person:'a',date:'2026-09-06',type:'off',shift:''}];
  s.freeRequests=[{id:'f1',person:'b',days:2,from:'2026-09-10',to:'2026-09-15',consecutive:true,hard:true},{id:'f2',person:'a',days:2,from:'2026-09-16',to:'2026-09-20',consecutive:true,hard:true}];
  s.monthStore={'2026-09':{assignments:{},locks:{},swaps:[],published:false,activeStaffIds:['a'],remotePortal:null}};api.setState(s);
  const payload=api.buildSolverPayload(false);assert.deepEqual(payload.requests.map(x=>x.person),['a']);assert.deepEqual(payload.freeRequests.map(x=>x.person),['a']);
});

function fixtureState(api,{staff,shifts,month='2026-09',rules={}}){
  const s=baseState(api);s.month=month;s.staff=staff;s.activeStaffIds=staff.map(p=>p.id);s.shifts=shifts;s.leaves=[];s.requests=[];s.freeRequests=[];s.rules={...s.rules,...rules};
  s.monthStore={[month]:{assignments:{},locks:{},swaps:[],published:false,activeStaffIds:staff.map(p=>p.id),remotePortal:null}};return s;
}
const person=(id,level='R2',eligible=['sA'])=>({id,name:id.toUpperCase(),level,group:'ICU',max:18,pager:'',eligible});

test('R3 is a senior resident with all-unit eligibility like R2',()=>{
  const api=loadApp();
  assert.deepEqual(api.defaultEligibilityFor('R3').sort(),api.defaultEligibilityFor('R2').sort());
  assert.ok(api.defaultEligibilityFor('R3').length>api.defaultEligibilityFor('R1').length);
});

test('unit maximum: extras are added up to the maximum, never beyond, and only when a maximum is set',()=>{
  const api=loadApp();const staff=['a','b','c','d'].map(id=>person(id));
  const s=fixtureState(api,{staff,shifts:[{id:'sA',code:'A',name:'A',type:'day',weekday:1,weekend:0,weekdayMax:3,continuity:false}]});api.setState(s);
  assert.equal(api.hasExplicitMax(api.shiftById('sA')),true);
  const cand={};for(let d=1;d<=30;d++){const day=String(d).padStart(2,'0');if(!api.isWeekend('2026-09-'+day))cand['a|2026-09-'+day]='sA';}
  const added=api.assignMaxCoverage(cand,api.buildFlexPlan(0,null),null);
  assert.ok(added>0,'extra assignments were added');
  for(let d=1;d<=30;d++){const date='2026-09-'+String(d).padStart(2,'0');if(api.isWeekend(date))continue;const n=api.countShiftDate(cand,date,'sA');assert.ok(n>=1&&n<=3,date+' has '+n);}
  assert.equal(api.auditAssignments(cand).violations.filter(v=>/maximum for this unit/.test(v)).length,0);
  cand['b|2026-09-02']='sA';cand['c|2026-09-02']='sA';cand['d|2026-09-02']='sA';
  assert.ok(api.auditAssignments(cand).violations.some(v=>/maximum for this unit is 3/.test(v)),'over-max coverage is flagged');
  const s2=fixtureState(api,{staff,shifts:[{id:'sA',code:'A',name:'A',type:'day',weekday:1,weekend:0,continuity:false}]});api.setState(s2);
  assert.equal(api.assignMaxCoverage({'a|2026-09-01':'sA'},api.buildFlexPlan(0,null),null),0,'no maximum set means no extras');
});

test('unit maximum cannot be below the minimum (treated as the minimum)',()=>{
  const api=loadApp();const s=fixtureState(api,{staff:[person('a')],shifts:[{id:'sA',code:'A',name:'A',type:'day',weekday:2,weekend:1,weekdayMax:1,continuity:false}]});api.setState(s);
  assert.equal(api.maxCount(api.shiftById('sA'),'2026-09-02'),2);
});

test('end-of-month units continue into the start of the new month until the minimum block',()=>{
  const api=loadApp();const staff=['a','b','c','d'].map(id=>person(id,'R2',['sA','sB']));
  const shifts=[{id:'sA',code:'A',name:'A',type:'day',weekday:1,weekend:1,continuity:true},{id:'sB',code:'B',name:'B',type:'day',weekday:1,weekend:1,continuity:true}];
  const s=fixtureState(api,{staff,shifts,rules:{minUnitBlock:3}});
  s.monthStore['2026-08']={assignments:{'a|2026-08-30':'sA','a|2026-08-31':'sA','b|2026-08-31':'sB','c|2026-08-29':'sA','c|2026-08-30':'sA','c|2026-08-31':'sA','d|2026-08-31':'sA'},locks:{},swaps:[],published:false,activeStaffIds:['a','b','c','d'],remotePortal:null};
  s.leaves=[{id:'l1',person:'d',from:'2026-09-01',to:'2026-09-01',status:'approved'}];
  api.setState(s);
  const {locks,carried}=api.monthStartContinuityLocks();
  assert.equal(locks['a|2026-09-01'],'sA');assert.equal(locks['a|2026-09-02'],undefined,'a already has 2 of 3 days');
  assert.equal(locks['b|2026-09-01'],'sB');assert.equal(locks['b|2026-09-02'],'sB');
  assert.equal(Object.keys(locks).some(k=>k.startsWith('c|')),false,'a full block already completed');
  assert.equal(Object.keys(locks).some(k=>k.startsWith('d|')),false,'approved leave blocks the continuation');
  assert.equal(carried.length,2);
  const payload=api.buildSolverPayload(false,locks);assert.equal(payload.lockedAssignments['b|2026-09-02'],'sB');
  const off=api.getState();off.rules.continuePrevMonthUnits=false;assert.equal(JSON.stringify(api.monthStartContinuityLocks().locks),'{}');
});

test('continuation never exceeds a unit\'s required staffing on a day',()=>{
  const api=loadApp();const staff=['a','b'].map(id=>person(id,'R2',['sA']));
  const s=fixtureState(api,{staff,shifts:[{id:'sA',code:'A',name:'A',type:'day',weekday:1,weekend:1,continuity:true}],rules:{minUnitBlock:3}});
  s.monthStore['2026-08']={assignments:{'a|2026-08-31':'sA','b|2026-08-31':'sA'},locks:{},swaps:[],published:false,activeStaffIds:['a','b'],remotePortal:null};
  api.setState(s);const {locks}=api.monthStartContinuityLocks();
  assert.equal(Object.keys(locks).filter(k=>k.endsWith('2026-09-01')).length,1,'only one person fits the single required slot');
});

test('Excel workbook contains roster, coverage, units and workload sheets and builds a valid zip',()=>{
  const api=loadApp();const staff=['a','b'].map(id=>person(id,'R3',['sA']));
  const s=fixtureState(api,{staff,shifts:[{id:'sA',code:'A',name:'Unit A & <b>',type:'day',weekday:1,weekend:1,weekdayMax:2,continuity:false}]});s.monthStore['2026-09'].assignments={'a|2026-09-01':'sA'};api.setState(s);
  const sheets=api.buildWorkbookSheets();
  assert.equal(JSON.stringify(sheets.map(x=>x.name)),JSON.stringify(['Roster','Coverage','Units','Workload']));
  assert.equal(sheets[0].rows[2][0].v,'A');assert.equal(sheets[0].rows[2][3].v,'A');
  const bytes=require('../xlsx-export.js').build(sheets);assert.equal(String.fromCharCode(bytes[0],bytes[1]),'PK');
});

test('public links carry compact tokens for every active staff member and the right mode',()=>{
  const api=loadApp();const staff=['a','b'].map(id=>person(id));
  const s=fixtureState(api,{staff,shifts:[{id:'sA',code:'A',name:'A',type:'day',weekday:1,weekend:1,continuity:false}]});
  const tokenA='00ff10'.repeat(10)+'abcd',tokenB='ab'.repeat(32);
  s.remotePortal={portalId:'11111111-2222-3333-4444-555555555555',adminToken:'x',staffTokens:{a:tokenA,b:tokenB},active:true};
  s.monthStore['2026-09'].remotePortal=s.remotePortal;api.setState(s);
  const link=api.portalPublicLink('swap');
  assert.ok(link.startsWith('https://example.test/request.html#portal=11111111-2222-3333-4444-555555555555&m=swap&k='),link);
  const keys=link.split('&k=')[1].split('~');assert.equal(keys.length,2);
  assert.ok(keys[0].startsWith('a.')&&keys[1].startsWith('b.'));
  const back=b64=>Buffer.from(b64.split('-').join('+').split('_').join('/'),'base64').toString('hex');
  assert.equal(back(keys[0].slice(2)),tokenA);assert.equal(back(keys[1].slice(2)),tokenB);
  assert.ok(link.length<400,'link stays short enough to share');
});

test('leave and day-off requests from the request page are summarised and routed to the extra-request RPCs',()=>{
  const api=loadApp();const s=fixtureState(api,{staff:[person('a')],shifts:[{id:'sA',code:'A',name:'Unit A',type:'day',weekday:1,weekend:1,continuity:false}]});api.setState(s);
  assert.equal(api.remoteRequestSummary({request_type:'leave',payload:{from:'2026-09-03',to:'2026-09-05',note:'course'}}),'Leave 2026-09-03 → 2026-09-05 · course');
  assert.equal(api.remoteRequestSummary({request_type:'day_request',payload:{type:'off',date:'2026-09-07'}}),'Day off on 2026-09-07');
  assert.equal(api.remoteRequestSummary({request_type:'day_request',payload:{type:'prefer',date:'2026-09-08',shift:'sA'}}),'Prefers A on 2026-09-08');
  assert.equal(api.remoteRequestSummary({request_type:'day_request',payload:{type:'avoid',date:'2026-09-09',shift:'sA'}}),'Wants to avoid A on 2026-09-09');
  assert.equal(api.isExtraRequest({request_type:'leave'}),true);assert.equal(api.isExtraRequest({request_type:'swap'}),false);assert.equal(api.isExtraRequest({request_type:'flex_days'}),false);
  assert.equal(api.remoteRequestBadge('leave'),'Leave');assert.equal(api.remoteRequestLabel('day_request'),'day-off / preference');
});

let failed=0;for(const[n,f]of tests){try{await f();console.log('PASS',n)}catch(e){failed++;console.error('FAIL',n,'\n ',e.message)}}
if(failed){console.error(`\n${failed}/${tests.length} regression tests failed`);process.exit(1)}else console.log(`\n${tests.length}/${tests.length} regression tests passed`);
