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
    staffNameConflict:typeof staffNameConflict==='function'?staffNameConflict:u¶»§q«^